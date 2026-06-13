import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { ExtractOptions, LanguageAdapter, RawDepGraph } from "../types.js";
import { countLoc, scanFiles } from "./util.js";

/** Splits a stream of concatenated top-level JSON objects into strings. */
function splitJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objects;
}

interface GoPkg {
  ImportPath: string;
  Dir: string;
  Imports?: string[];
  GoFiles?: string[];
  Module?: { Path?: string; Dir?: string };
}

export const goAdapter: LanguageAdapter = {
  id: "go",
  name: "Go",

  detect(projectPath: string): boolean {
    return existsSync(path.join(projectPath, "go.mod"));
  },

  async extract(
    projectPath: string,
    options: ExtractOptions
  ): Promise<RawDepGraph[]> {
    const viaGoList = tryGoList(projectPath, options);
    if (viaGoList) return viaGoList;
    // Fallback: file-level regex handled by generic adapter; emit only nodes
    return fallbackNodes(projectPath, options);
  },
};

function tryGoList(
  projectPath: string,
  options: ExtractOptions
): RawDepGraph[] | null {
  const res = spawnSync("go", ["list", "-json", "./..."], {
    cwd: projectPath,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
  if (res.error || res.status !== 0 || !res.stdout) return null;

  const pkgs: GoPkg[] = [];
  for (const chunk of splitJsonObjects(res.stdout)) {
    try {
      pkgs.push(JSON.parse(chunk) as GoPkg);
    } catch {
      /* ignore malformed chunk */
    }
  }
  if (!pkgs.length) return null;

  const modulePath = pkgs[0].Module?.Path;
  if (!modulePath) return null;

  const importToDir = new Map<string, string>();
  for (const pkg of pkgs) {
    const rel = relDir(projectPath, pkg.Dir);
    if (rel === null) continue;
    importToDir.set(pkg.ImportPath, rel);
  }

  const nodes: RawDepGraph["nodes"] = [];
  const edges: RawDepGraph["edges"] = [];
  const seen = new Set<string>();

  for (const pkg of pkgs) {
    const rel = relDir(projectPath, pkg.Dir);
    if (rel === null) continue;
    if (!options.includeTests && /(^|\/)(test|tests)(\/|$)/.test(rel)) continue;

    if (!seen.has(rel)) {
      seen.add(rel);
      const loc = (pkg.GoFiles ?? []).reduce(
        (sum, f) => sum + countLoc(path.join(pkg.Dir, f)),
        0
      );
      nodes.push({ id: rel, loc, language: "go" });
    }

    for (const imp of pkg.Imports ?? []) {
      if (!imp.startsWith(modulePath)) continue; // external/stdlib
      const targetDir = importToDir.get(imp);
      if (targetDir && targetDir !== rel) {
        edges.push({ source: rel, target: targetDir, circular: false });
      }
    }
  }

  return [{ language: "go", adapterId: "go", nodes, edges }];
}

function relDir(projectPath: string, dir: string): string | null {
  if (!dir) return null;
  const rel = path.relative(projectPath, dir).split(path.sep).join("/");
  if (rel.startsWith("..")) return null;
  return rel === "" ? "." : rel;
}

async function fallbackNodes(
  projectPath: string,
  options: ExtractOptions
): Promise<RawDepGraph[]> {
  const files = await scanFiles(projectPath, {
    extensions: [".go"],
    includeTests: options.includeTests,
  });
  if (!files.length) return [];
  const nodes = files.map((f) => ({
    id: f,
    loc: countLoc(path.resolve(projectPath, f)),
    language: "go" as const,
  }));
  return [{ language: "go", adapterId: "go", nodes, edges: [] }];
}

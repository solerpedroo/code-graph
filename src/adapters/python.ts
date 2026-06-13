import { existsSync } from "node:fs";
import path from "node:path";
import type { ExtractOptions, LanguageAdapter, RawDepGraph } from "../types.js";
import { countLoc, readSafe, scanFiles } from "./util.js";

const ROOT_MARKERS = [
  "requirements.txt",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "Pipfile",
];

function moduleToCandidates(modPath: string): string[] {
  // modPath uses "/" separators, no extension
  return [`${modPath}.py`, `${modPath}/__init__.py`];
}

export const pythonAdapter: LanguageAdapter = {
  id: "python",
  name: "Python",

  detect(projectPath: string): boolean {
    return ROOT_MARKERS.some((m) => existsSync(path.join(projectPath, m)));
  },

  async extract(
    projectPath: string,
    options: ExtractOptions
  ): Promise<RawDepGraph[]> {
    const files = await scanFiles(projectPath, {
      extensions: [".py"],
      includeTests: options.includeTests,
    });
    if (!files.length) return [];

    const known = new Set(files);
    // index of module path (no ext, __init__ stripped) -> file id
    const moduleIndex: Array<{ key: string; id: string }> = files.map((f) => ({
      key: f.replace(/\.py$/, "").replace(/\/__init__$/, ""),
      id: f,
    }));

    const resolveAbsolute = (mod: string): string | null => {
      const slash = mod.replace(/\./g, "/");
      // exact module file candidates
      for (const cand of moduleToCandidates(slash)) {
        if (known.has(cand)) return cand;
      }
      // suffix match against source roots (e.g. "pkg/mod" inside "src/")
      let match: string | null = null;
      let ambiguous = false;
      for (const entry of moduleIndex) {
        if (entry.key === slash || entry.key.endsWith(`/${slash}`)) {
          if (match && match !== entry.id) ambiguous = true;
          match = entry.id;
        }
      }
      return ambiguous ? null : match;
    };

    const resolveRelative = (
      fromFile: string,
      dots: string,
      mod: string
    ): string | null => {
      let dir = path.posix.dirname(fromFile);
      // one dot = current package; each extra dot goes one level up
      for (let i = 1; i < dots.length; i++) {
        dir = path.posix.dirname(dir);
      }
      const sub = mod ? mod.replace(/\./g, "/") : "";
      const base = sub ? path.posix.join(dir, sub) : dir;
      for (const cand of moduleToCandidates(base)) {
        if (known.has(cand)) return cand;
      }
      return null;
    };

    const nodes: RawDepGraph["nodes"] = [];
    const edges: RawDepGraph["edges"] = [];

    const RE_FROM_REL = /^\s*from\s+(\.+)([\w.]*)\s+import\b/gm;
    const RE_FROM_ABS = /^\s*from\s+([a-zA-Z_][\w.]*)\s+import\b/gm;
    const RE_IMPORT = /^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm;

    for (const file of files) {
      nodes.push({
        id: file,
        loc: countLoc(path.resolve(projectPath, file)),
        language: "python",
      });

      const content = readSafe(path.resolve(projectPath, file));
      if (!content) continue;

      const targets = new Set<string>();
      let m: RegExpExecArray | null;

      RE_FROM_REL.lastIndex = 0;
      while ((m = RE_FROM_REL.exec(content)) !== null) {
        const r = resolveRelative(file, m[1], m[2] ?? "");
        if (r && r !== file) targets.add(r);
      }

      RE_FROM_ABS.lastIndex = 0;
      while ((m = RE_FROM_ABS.exec(content)) !== null) {
        const r = resolveAbsolute(m[1]);
        if (r && r !== file) targets.add(r);
      }

      RE_IMPORT.lastIndex = 0;
      while ((m = RE_IMPORT.exec(content)) !== null) {
        for (const part of m[1].split(",")) {
          const mod = part.trim().split(/\s+as\s+/)[0].trim();
          if (!mod) continue;
          const r = resolveAbsolute(mod);
          if (r && r !== file) targets.add(r);
        }
      }

      for (const target of targets) {
        edges.push({ source: file, target, circular: false });
      }
    }

    return [{ language: "python", adapterId: "python", nodes, edges }];
  },
};

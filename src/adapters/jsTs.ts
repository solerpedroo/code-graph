import { existsSync } from "node:fs";
import path from "node:path";
import type { ExtractOptions, LanguageAdapter, RawDepGraph } from "../types.js";
import { countLoc, isTestFile, languageForExt } from "./util.js";

const ROOT_MARKERS = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
];

const JS_EXTS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".vue",
  ".svelte",
]);

export const jsTsAdapter: LanguageAdapter = {
  id: "js-ts",
  name: "JavaScript / TypeScript",

  detect(projectPath: string): boolean {
    return ROOT_MARKERS.some((m) => existsSync(path.join(projectPath, m)));
  },

  async extract(
    projectPath: string,
    options: ExtractOptions
  ): Promise<RawDepGraph[]> {
    // dependency-cruiser resolves relative to process.cwd(); run it from inside
    // the project so module sources come back as clean project-relative paths.
    const { cruise } = await import("dependency-cruiser");
    const originalCwd = process.cwd();

    const jsNodes: RawDepGraph["nodes"] = [];
    const jsEdges: RawDepGraph["edges"] = [];
    const tsNodes: RawDepGraph["nodes"] = [];
    const tsEdges: RawDepGraph["edges"] = [];

    const isExternal = (p: string) =>
      !p ||
      p.startsWith("..") ||
      path.isAbsolute(p) ||
      p.includes("node_modules");

    try {
      process.chdir(projectPath);
      const result = await cruise(
        ["."],
        {
          exclude: {
            path: "(^|/)(node_modules|dist|build|out|coverage|\\.next|\\.nuxt|vendor)/",
          },
          doNotFollow: { path: "node_modules" },
          tsPreCompilationDeps: true,
          combinedDependencies: false,
        } as Parameters<typeof cruise>[1]
      );

      const output = result.output;
      if (typeof output === "string") {
        return [];
      }

      const modules = (output as { modules?: unknown[] }).modules ?? [];
      const seen = new Set<string>();

      for (const mod of modules as Array<{
        source: string;
        dependencies?: Array<{
          resolved: string;
          circular?: boolean;
          coreModule?: boolean;
          couldNotResolve?: boolean;
        }>;
      }>) {
        const source = mod.source;
        if (isExternal(source)) continue;
        const ext = path.extname(source);
        if (!JS_EXTS.has(ext)) continue;
        if (!options.includeTests && isTestFile(source)) continue;

        const lang = languageForExt(ext);
        const node = {
          id: source,
          loc: countLoc(path.resolve(projectPath, source)),
          language: lang,
        };
        if (!seen.has(source)) {
          seen.add(source);
          (lang === "typescript" ? tsNodes : jsNodes).push(node);
        }

        for (const dep of mod.dependencies ?? []) {
          if (dep.coreModule || dep.couldNotResolve) continue;
          const target = dep.resolved;
          if (isExternal(target)) continue;
          const tExt = path.extname(target);
          if (!JS_EXTS.has(tExt)) continue;
          if (!options.includeTests && isTestFile(target)) continue;

          const edge = {
            source,
            target,
            circular: Boolean(dep.circular),
          };
          (lang === "typescript" ? tsEdges : jsEdges).push(edge);
        }
      }
    } finally {
      process.chdir(originalCwd);
    }

    const graphs: RawDepGraph[] = [];
    if (tsNodes.length || tsEdges.length) {
      graphs.push({
        language: "typescript",
        adapterId: this.id,
        nodes: tsNodes,
        edges: tsEdges,
      });
    }
    if (jsNodes.length || jsEdges.length) {
      graphs.push({
        language: "javascript",
        adapterId: this.id,
        nodes: jsNodes,
        edges: jsEdges,
      });
    }
    return graphs;
  },
};

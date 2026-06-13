import type { ExtractOptions, LanguageAdapter, RawDepGraph } from "../types.js";
import { createGenericAdapter, LANG_RULES } from "./generic.js";
import { goAdapter } from "./go.js";
import { jsTsAdapter } from "./jsTs.js";
import { pythonAdapter } from "./python.js";

/** Extensions owned by each dedicated adapter (skipped by the generic one). */
const OWNED_EXTENSIONS: Record<string, string[]> = {
  "js-ts": [
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
  ],
  python: [".py"],
  go: [".go"],
};

const DEDICATED: LanguageAdapter[] = [jsTsAdapter, pythonAdapter, goAdapter];

export interface ExtractAllResult {
  graphs: RawDepGraph[];
  /** Adapter names that produced data, for reporting. */
  usedAdapters: string[];
}

export async function extractAll(
  projectPath: string,
  options: ExtractOptions,
  forcedLanguages?: string[]
): Promise<ExtractAllResult> {
  const graphs: RawDepGraph[] = [];
  const usedAdapters: string[] = [];
  const coveredExts = new Set<string>();

  for (const adapter of DEDICATED) {
    let applies = false;
    try {
      applies = await adapter.detect(projectPath);
    } catch {
      applies = false;
    }
    if (!applies) continue;

    try {
      const result = await adapter.extract(projectPath, options);
      const total = result.reduce((n, g) => n + g.nodes.length, 0);
      if (total > 0) {
        graphs.push(...result);
        usedAdapters.push(adapter.name);
        for (const ext of OWNED_EXTENSIONS[adapter.id] ?? []) {
          coveredExts.add(ext);
        }
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`  ! adapter ${adapter.id} falhou: ${reason}`);
    }
  }

  // Generic adapter handles every extension not already covered.
  const remainingExts = LANG_RULES.flatMap((r) => r.extensions).filter(
    (ext) => !coveredExts.has(ext)
  );
  if (remainingExts.length) {
    const generic = createGenericAdapter(remainingExts);
    try {
      const result = await generic.extract(projectPath, options);
      const total = result.reduce((n, g) => n + g.nodes.length, 0);
      if (total > 0) {
        graphs.push(...result);
        usedAdapters.push(generic.name);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`  ! adapter generico falhou: ${reason}`);
    }
  }

  let finalGraphs = graphs;
  if (forcedLanguages && forcedLanguages.length) {
    const wanted = new Set(forcedLanguages.map((l) => normalizeLang(l)));
    finalGraphs = graphs.filter((g) => wanted.has(g.language));
  }

  return { graphs: finalGraphs, usedAdapters };
}

function normalizeLang(input: string): string {
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    "c#": "csharp",
    cs: "csharp",
    "c++": "cpp",
  };
  const key = input.trim().toLowerCase();
  return map[key] ?? key;
}

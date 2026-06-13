import path from "node:path";
import type {
  ExtractOptions,
  Language,
  LanguageAdapter,
  RawDepGraph,
} from "../types.js";
import {
  countLoc,
  languageForExt,
  readSafe,
  resolveRelativeImport,
  scanFiles,
} from "./util.js";

interface LangRule {
  extensions: string[];
  /** Each regex must capture the import specifier in group 1. */
  patterns: RegExp[];
}

/**
 * Regex-based import rules covering the "long tail" of languages that do not
 * have a dedicated adapter. JS/TS, Python and Go are handled elsewhere but are
 * also listed here so the generic adapter can act as a fallback.
 */
export const LANG_RULES: LangRule[] = [
  {
    extensions: [".java", ".kt", ".kts", ".scala", ".groovy"],
    patterns: [/^\s*import\s+(?:static\s+)?([\w.]+)/gm],
  },
  {
    extensions: [".cs"],
    patterns: [/^\s*(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/gm],
  },
  {
    extensions: [".rb"],
    patterns: [
      /require_relative\s+['"]([^'"]+)['"]/g,
      /\brequire\s+['"]([^'"]+)['"]/g,
      /\bautoload\s+:\w+\s*,\s*['"]([^'"]+)['"]/g,
    ],
  },
  {
    extensions: [".php"],
    patterns: [
      /^\s*use\s+([\w\\]+)/gm,
      /(?:require|require_once|include|include_once)\s*\(?\s*['"]([^'"]+)['"]/g,
    ],
  },
  {
    extensions: [".rs"],
    patterns: [/^\s*(?:pub\s+)?use\s+(?:crate::|self::|super::)?([\w:]+)/gm],
  },
  {
    extensions: [".swift"],
    patterns: [/^\s*import\s+(\w+)/gm],
  },
  {
    extensions: [".dart"],
    patterns: [
      /import\s+['"]([^'"]+)['"]/g,
      /part\s+['"]([^'"]+)['"]/g,
    ],
  },
  {
    extensions: [".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".hh"],
    patterns: [/^\s*#\s*include\s+"([^"]+)"/gm],
  },
  {
    extensions: [".py"],
    patterns: [
      /^\s*from\s+([.\w]+)\s+import/gm,
      /^\s*import\s+([\w.]+)/gm,
    ],
  },
];

function isRelativeSpec(spec: string): boolean {
  return (
    spec.startsWith(".") ||
    spec.startsWith("/") ||
    spec.includes("/") && !spec.includes("::") && !spec.match(/^[A-Z]/)
  );
}

/** Normalizes dotted / :: / backslash module specs into a slash path. */
function normalizeModuleSpec(spec: string): string {
  return spec
    .replace(/::/g, "/")
    .replace(/\\/g, "/")
    .replace(/\./g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

interface FileIndexEntry {
  id: string;
  noExt: string;
}

/**
 * Generic adapter: scans the given extensions, extracts import-like statements
 * via regex and resolves them to other project files (relative paths directly,
 * package/namespace paths via path-suffix matching).
 */
export function createGenericAdapter(extensions: string[]): LanguageAdapter {
  const exts = extensions.length
    ? extensions
    : LANG_RULES.flatMap((r) => r.extensions);

  return {
    id: "generic",
    name: "Generico (regex)",

    detect(): boolean {
      return true;
    },

    async extract(
      projectPath: string,
      options: ExtractOptions
    ): Promise<RawDepGraph[]> {
      const files = await scanFiles(projectPath, {
        extensions: exts,
        includeTests: options.includeTests,
      });
      if (!files.length) return [];

      const known = new Set(files);
      const index: FileIndexEntry[] = files.map((f) => ({
        id: f,
        noExt: f.replace(/\.[^/.]+$/, ""),
      }));

      const ruleByExt = new Map<string, RegExp[]>();
      for (const rule of LANG_RULES) {
        for (const ext of rule.extensions) ruleByExt.set(ext, rule.patterns);
      }

      const byLang = new Map<Language, RawDepGraph>();
      const ensure = (lang: Language): RawDepGraph => {
        let g = byLang.get(lang);
        if (!g) {
          g = { language: lang, adapterId: "generic", nodes: [], edges: [] };
          byLang.set(lang, g);
        }
        return g;
      };

      const resolveModule = (spec: string): string | null => {
        const norm = normalizeModuleSpec(spec);
        if (!norm) return null;
        let match: string | null = null;
        let ambiguous = false;
        for (const entry of index) {
          if (entry.noExt === norm || entry.noExt.endsWith(`/${norm}`)) {
            if (match && match !== entry.id) ambiguous = true;
            match = entry.id;
          }
        }
        return ambiguous ? null : match;
      };

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const lang = languageForExt(ext);
        const patterns = ruleByExt.get(ext);
        const graph = ensure(lang);

        graph.nodes.push({
          id: file,
          loc: countLoc(path.resolve(projectPath, file)),
          language: lang,
        });

        if (!patterns) continue;
        const content = readSafe(path.resolve(projectPath, file));
        if (!content) continue;

        const targets = new Set<string>();
        for (const pattern of patterns) {
          pattern.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = pattern.exec(content)) !== null) {
            const spec = m[1];
            if (!spec) continue;
            let resolved: string | null = null;
            if (isRelativeSpec(spec)) {
              const cleaned = spec.replace(/^\.\//, "./");
              resolved =
                resolveRelativeImport(file, cleaned, known, exts) ??
                resolveModule(spec);
            } else {
              resolved = resolveModule(spec);
            }
            if (resolved && resolved !== file) targets.add(resolved);
          }
        }

        for (const target of targets) {
          graph.edges.push({ source: file, target, circular: false });
        }
      }

      return [...byLang.values()].filter(
        (g) => g.nodes.length > 0 || g.edges.length > 0
      );
    },
  };
}

import type { Language } from "../types";

export const IGNORED_DIR_RE =
  /(^|\/)(node_modules|\.git|dist|build|out|\.next|\.nuxt|coverage|vendor|target|bin|obj|\.venv|venv|__pycache__|\.idea|\.vscode|\.cache|Pods)(\/|$)/;

export const TEST_RE =
  /(\.|_|-)(test|spec)\.|(^|\/)(tests?|__tests__|spec)(\/|$)/i;

export function isTestFile(path: string): boolean {
  return TEST_RE.test(path);
}

const EXT_LANG: Record<string, Language> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".vue": "javascript",
  ".svelte": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".py": "python",
  ".go": "go",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".rb": "ruby",
  ".php": "php",
  ".cs": "csharp",
  ".rs": "rust",
  ".swift": "swift",
  ".dart": "dart",
  ".scala": "scala",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".hh": "cpp",
  ".c": "c",
  ".h": "c",
};

/** Every code extension we know how to analyze. */
export const CODE_EXTENSIONS = Object.keys(EXT_LANG);

export function extname(path: string): string {
  const i = path.lastIndexOf(".");
  if (i < 0) return "";
  return path.slice(i).toLowerCase();
}

export function languageForPath(path: string): Language {
  return EXT_LANG[extname(path)] ?? "unknown";
}

export function isCodeFile(path: string): boolean {
  return extname(path) in EXT_LANG;
}

/** Extensions handled by the JS/TS resolver. */
export const JS_EXTS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".vue",
  ".svelte",
];

/** Regex import rules for the generic (non JS/TS/Python/Go) resolver. */
export interface LangRule {
  extensions: string[];
  patterns: RegExp[];
}

export const GENERIC_RULES: LangRule[] = [
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
    patterns: [/import\s+['"]([^'"]+)['"]/g, /part\s+['"]([^'"]+)['"]/g],
  },
  {
    extensions: [".c", ".h", ".cpp", ".cc", ".cxx", ".hpp", ".hh"],
    patterns: [/^\s*#\s*include\s+"([^"]+)"/gm],
  },
];

export function countLoc(content: string): number {
  let loc = 0;
  let count = 0;
  for (const line of content.split(/\r?\n/)) {
    if (line.trim().length > 0) loc++;
    count++;
    if (count > 200000) break;
  }
  return loc;
}

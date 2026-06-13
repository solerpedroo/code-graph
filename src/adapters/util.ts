import { readFileSync } from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { Language } from "../types.js";

export const IGNORED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  "vendor",
  "target",
  "bin",
  "obj",
  ".venv",
  "venv",
  "__pycache__",
  ".idea",
  ".vscode",
  ".cache",
  "Pods",
];

const TEST_RE = /(\.|_|-)(test|spec)\.|(^|\/)(tests?|__tests__|spec)\//i;

export function isTestFile(relPath: string): boolean {
  return TEST_RE.test(relPath);
}

export interface ScanOptions {
  extensions: string[];
  includeTests: boolean;
}

/** Lists project-relative files matching the given extensions. */
export async function scanFiles(
  projectPath: string,
  options: ScanOptions
): Promise<string[]> {
  const patterns = options.extensions.map((ext) => `**/*${ext}`);
  const entries = await fg(patterns, {
    cwd: projectPath,
    ignore: IGNORED_DIRS.map((d) => `**/${d}/**`),
    dot: false,
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true,
  });

  const normalized = entries.map((e) => e.split(path.sep).join("/"));
  if (options.includeTests) return normalized;
  return normalized.filter((f) => !isTestFile(f));
}

const locCache = new Map<string, number>();

/** Counts non-empty lines of code (cached per absolute path). */
export function countLoc(absPath: string): number {
  const cached = locCache.get(absPath);
  if (cached !== undefined) return cached;
  let loc = 0;
  try {
    const content = readFileSync(absPath, "utf8");
    loc = content.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  } catch {
    loc = 0;
  }
  locCache.set(absPath, loc);
  return loc;
}

export function readSafe(absPath: string): string {
  try {
    return readFileSync(absPath, "utf8");
  } catch {
    return "";
  }
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
  ".c": "c",
  ".h": "c",
};

export function languageForExt(ext: string): Language {
  return EXT_LANG[ext.toLowerCase()] ?? "unknown";
}

/**
 * Resolves a relative import specifier (e.g. "./foo", "../bar/baz") against the
 * importing file to a project-relative file id, trying a set of candidate
 * extensions and index files. Returns null when it cannot be resolved to a file
 * that exists in the provided set.
 */
export function resolveRelativeImport(
  fromFile: string,
  spec: string,
  knownFiles: Set<string>,
  extensions: string[]
): string | null {
  const baseDir = path.posix.dirname(fromFile);
  const joined = path.posix.normalize(path.posix.join(baseDir, spec));

  // direct hit
  if (knownFiles.has(joined)) return joined;

  for (const ext of extensions) {
    const candidate = `${joined}${ext}`;
    if (knownFiles.has(candidate)) return candidate;
  }
  for (const ext of extensions) {
    const candidate = path.posix.join(joined, `index${ext}`);
    if (knownFiles.has(candidate)) return candidate;
  }
  return null;
}

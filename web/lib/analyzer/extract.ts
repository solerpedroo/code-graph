import type { FileEntry, GraphEdge, GraphNode, Language } from "../types";
import {
  GENERIC_RULES,
  JS_EXTS,
  countLoc,
  extname,
  isTestFile,
  languageForPath,
} from "./languages";

/* ---------------- path helpers (posix, string-based) ---------------- */

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}
function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}
function normalize(p: string): string {
  const parts = p.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}
function joinRel(base: string, spec: string): string {
  return normalize(base ? `${base}/${spec}` : spec);
}

function resolveRelative(
  fromFile: string,
  spec: string,
  known: Set<string>,
  exts: string[]
): string | null {
  const joined = joinRel(dirname(fromFile), spec);
  if (known.has(joined)) return joined;
  for (const ext of exts) if (known.has(joined + ext)) return joined + ext;
  for (const ext of exts)
    if (known.has(`${joined}/index${ext}`)) return `${joined}/index${ext}`;
  return null;
}

/* ---------------- node factory ---------------- */

function makeNode(path: string, content: string, language: Language): GraphNode {
  const dir = dirname(path);
  return {
    id: path,
    label: basename(path) || path,
    folder: dir === "" ? "(root)" : dir,
    loc: countLoc(content),
    language,
    category: "unknown",
    fanIn: 0,
    fanOut: 0,
    risk: 0,
    inCycle: false,
  };
}

/* ---------------- main ---------------- */

export interface ExtractResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function extractGraph(
  files: FileEntry[],
  options: { includeTests: boolean }
): ExtractResult {
  const filtered = options.includeTests
    ? files
    : files.filter((f) => !isTestFile(f.path));

  const known = new Set(filtered.map((f) => f.path));
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  const addEdge = (source: string, target: string) => {
    if (source === target) return;
    const key = `${source}\u0000${target}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source, target, circular: false });
  };

  const goFiles: FileEntry[] = [];
  const genericIndex: Array<{ id: string; noExt: string }> = [];
  for (const f of filtered) {
    if (extname(f.path) === ".go") goFiles.push(f);
    genericIndex.push({ id: f.path, noExt: f.path.replace(/\.[^/.]+$/, "") });
  }

  for (const f of filtered) {
    const ext = extname(f.path);
    const lang = languageForPath(f.path);

    if (ext === ".go") continue; // handled below at package level

    if (!nodeMap.has(f.path)) nodeMap.set(f.path, makeNode(f.path, f.content, lang));

    if (JS_EXTS.includes(ext)) {
      extractJsTs(f, known, addEdge);
    } else if (ext === ".py") {
      extractPython(f, known, addEdge);
    } else {
      extractGeneric(f, known, genericIndex, addEdge);
    }
  }

  // Go: package/dir-level graph
  if (goFiles.length) extractGo(goFiles, files, nodeMap, addEdge);

  return { nodes: [...nodeMap.values()], edges };
}

/* ---------------- JS / TS ---------------- */

const JS_PATTERNS = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function extractJsTs(
  f: FileEntry,
  known: Set<string>,
  addEdge: (s: string, t: string) => void
) {
  const targets = new Set<string>();
  for (const re of JS_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(f.content)) !== null) {
      const spec = m[1];
      if (!spec || !(spec.startsWith(".") || spec.startsWith("/"))) continue;
      const r = resolveRelative(f.path, spec, known, JS_EXTS);
      if (r) targets.add(r);
    }
  }
  for (const t of targets) addEdge(f.path, t);
}

/* ---------------- Python ---------------- */

const PY_FROM_REL = /^\s*from\s+(\.+)([\w.]*)\s+import\b/gm;
const PY_FROM_ABS = /^\s*from\s+([a-zA-Z_][\w.]*)\s+import\b/gm;
const PY_IMPORT = /^\s*import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/gm;

function extractPython(
  f: FileEntry,
  known: Set<string>,
  addEdge: (s: string, t: string) => void
) {
  const candidates = (mod: string): string[] => [`${mod}.py`, `${mod}/__init__.py`];

  const resolveAbsolute = (mod: string): string | null => {
    const slash = mod.replace(/\./g, "/");
    for (const c of candidates(slash)) if (known.has(c)) return c;
    let match: string | null = null;
    let ambiguous = false;
    for (const id of known) {
      const key = id.replace(/\.py$/, "").replace(/\/__init__$/, "");
      if (key === slash || key.endsWith(`/${slash}`)) {
        if (match && match !== id) ambiguous = true;
        match = id;
      }
    }
    return ambiguous ? null : match;
  };

  const resolveRel = (dots: string, mod: string): string | null => {
    let dir = dirname(f.path);
    for (let i = 1; i < dots.length; i++) dir = dirname(dir);
    const sub = mod ? mod.replace(/\./g, "/") : "";
    const base = sub ? joinRel(dir, sub) : dir;
    for (const c of candidates(base)) if (known.has(c)) return c;
    return null;
  };

  const targets = new Set<string>();
  let m: RegExpExecArray | null;

  PY_FROM_REL.lastIndex = 0;
  while ((m = PY_FROM_REL.exec(f.content)) !== null) {
    const r = resolveRel(m[1], m[2] ?? "");
    if (r) targets.add(r);
  }
  PY_FROM_ABS.lastIndex = 0;
  while ((m = PY_FROM_ABS.exec(f.content)) !== null) {
    const r = resolveAbsolute(m[1]);
    if (r) targets.add(r);
  }
  PY_IMPORT.lastIndex = 0;
  while ((m = PY_IMPORT.exec(f.content)) !== null) {
    for (const part of m[1].split(",")) {
      const mod = part.trim().split(/\s+as\s+/)[0].trim();
      if (mod) {
        const r = resolveAbsolute(mod);
        if (r) targets.add(r);
      }
    }
  }
  for (const t of targets) if (t !== f.path) addEdge(f.path, t);
}

/* ---------------- Generic (regex) ---------------- */

function normalizeModuleSpec(spec: string): string {
  return spec
    .replace(/::/g, "/")
    .replace(/\\/g, "/")
    .replace(/\./g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function extractGeneric(
  f: FileEntry,
  known: Set<string>,
  index: Array<{ id: string; noExt: string }>,
  addEdge: (s: string, t: string) => void
) {
  const ext = extname(f.path);
  const rule = GENERIC_RULES.find((r) => r.extensions.includes(ext));
  if (!rule) return;

  const exts = rule.extensions;
  const resolveModule = (spec: string): string | null => {
    const norm = normalizeModuleSpec(spec);
    if (!norm) return null;
    let match: string | null = null;
    let ambiguous = false;
    for (const e of index) {
      if (e.noExt === norm || e.noExt.endsWith(`/${norm}`)) {
        if (match && match !== e.id) ambiguous = true;
        match = e.id;
      }
    }
    return ambiguous ? null : match;
  };

  const targets = new Set<string>();
  for (const re of rule.patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(f.content)) !== null) {
      const spec = m[1];
      if (!spec) continue;
      let resolved: string | null = null;
      if (spec.startsWith(".") || spec.startsWith("/")) {
        resolved = resolveRelative(f.path, spec, known, exts) ?? resolveModule(spec);
      } else {
        resolved = resolveModule(spec);
      }
      if (resolved) targets.add(resolved);
    }
  }
  for (const t of targets) if (t !== f.path) addEdge(f.path, t);
}

/* ---------------- Go (package/dir level) ---------------- */

function extractGo(
  goFiles: FileEntry[],
  allFiles: FileEntry[],
  nodeMap: Map<string, GraphNode>,
  addEdge: (s: string, t: string) => void
) {
  const goMod = allFiles.find((f) => f.path === "go.mod" || f.path.endsWith("/go.mod"));
  const moduleMatch = goMod?.content.match(/^\s*module\s+(\S+)/m);
  const modulePath = moduleMatch?.[1];

  const byDir = new Map<string, { loc: number }>();
  for (const f of goFiles) {
    const dir = dirname(f.path) || ".";
    const entry = byDir.get(dir) ?? { loc: 0 };
    entry.loc += countLoc(f.content);
    byDir.set(dir, entry);
  }

  for (const [dir, entry] of byDir) {
    if (!nodeMap.has(dir)) {
      nodeMap.set(dir, {
        id: dir,
        label: dir === "." ? "(root)" : basename(dir),
        folder: dir === "." ? "(root)" : dirname(dir) || "(root)",
        loc: entry.loc,
        language: "go",
        category: "unknown",
        fanIn: 0,
        fanOut: 0,
        risk: 0,
        inCycle: false,
      });
    }
  }

  if (!modulePath) return;

  const importsOf = (content: string): string[] => {
    const out: string[] = [];
    const block = /import\s*\(([\s\S]*?)\)/g;
    let m: RegExpExecArray | null;
    while ((m = block.exec(content)) !== null) {
      const inner = m[1];
      const s = /"([^"]+)"/g;
      let mm: RegExpExecArray | null;
      while ((mm = s.exec(inner)) !== null) out.push(mm[1]);
    }
    const single = /^\s*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm;
    while ((m = single.exec(content)) !== null) out.push(m[1]);
    return out;
  };

  for (const f of goFiles) {
    const fromDir = dirname(f.path) || ".";
    for (const imp of importsOf(f.content)) {
      if (!imp.startsWith(modulePath)) continue;
      let rel = imp.slice(modulePath.length).replace(/^\//, "");
      const targetDir = rel === "" ? "." : rel;
      if (byDir.has(targetDir) && targetDir !== fromDir) {
        addEdge(fromDir, targetDir);
      }
    }
  }
}

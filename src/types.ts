export type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "go"
  | "java"
  | "kotlin"
  | "ruby"
  | "php"
  | "csharp"
  | "rust"
  | "swift"
  | "dart"
  | "scala"
  | "cpp"
  | "c"
  | "unknown";

export type Category =
  | "component"
  | "hook"
  | "service"
  | "util"
  | "model"
  | "types"
  | "config"
  | "controller"
  | "test"
  | "entry"
  | "unknown";

/** Normalized node in the merged dependency graph. */
export interface GraphNode {
  /** Project-relative path. Acts as the unique id. */
  id: string;
  /** File name (basename). */
  label: string;
  /** Parent folder (project-relative) used for grouping. */
  folder: string;
  /** Lines of code. */
  loc: number;
  language: Language;
  category: Category;
  /** Number of incoming edges (who depends on this). Filled by metrics. */
  fanIn: number;
  /** Number of outgoing edges (what this depends on). Filled by metrics. */
  fanOut: number;
  /** fanIn * fanOut. */
  risk: number;
  /** True when the node participates in at least one dependency cycle. */
  inCycle: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  circular: boolean;
}

/** Raw graph produced by a single adapter before merge/metrics. */
export interface RawDepGraph {
  language: Language;
  adapterId: string;
  nodes: Array<{
    id: string;
    loc?: number;
    language?: Language;
  }>;
  edges: Array<{
    source: string;
    target: string;
    circular?: boolean;
  }>;
}

export interface LanguageAdapter {
  id: string;
  /** Human friendly name. */
  name: string;
  /** Detects whether this adapter applies to the project. */
  detect(projectPath: string): Promise<boolean> | boolean;
  /** Runs the underlying tooling and returns one or more raw graphs. */
  extract(projectPath: string, options: ExtractOptions): Promise<RawDepGraph[]>;
}

export interface ExtractOptions {
  includeTests: boolean;
}

export interface Insight {
  nodeId: string;
  type: "warning" | "core" | "isolated";
  message: string;
}

export interface Insights {
  summary: string;
  highlights: Insight[];
  circularDependencyNotes: string[];
  suggestions: string[];
  /** Where the insights came from. */
  source: "ai" | "heuristic";
}

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
  languages: Language[];
  insights: Insights;
  meta: {
    projectName: string;
    inputSource: string;
    generatedAt: string;
    fileCount: number;
    edgeCount: number;
    cycleCount: number;
  };
}

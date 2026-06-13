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

export interface GraphNode {
  id: string;
  label: string;
  folder: string;
  loc: number;
  language: Language;
  category: Category;
  fanIn: number;
  fanOut: number;
  risk: number;
  inCycle: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  circular: boolean;
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

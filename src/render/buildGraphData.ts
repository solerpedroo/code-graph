import type {
  GraphEdge,
  GraphNode,
  GraphResult,
  Insights,
  Language,
} from "../types.js";

export interface BuildGraphDataInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
  languages: Language[];
  insights: Insights;
  projectName: string;
  inputSource: string;
}

/** Assembles the final, self-contained data object embedded into the report. */
export function buildGraphData(input: BuildGraphDataInput): GraphResult {
  return {
    nodes: input.nodes,
    edges: input.edges,
    cycles: input.cycles,
    languages: input.languages,
    insights: input.insights,
    meta: {
      projectName: input.projectName,
      inputSource: input.inputSource,
      generatedAt: new Date().toISOString(),
      fileCount: input.nodes.length,
      edgeCount: input.edges.length,
      cycleCount: input.cycles.length,
    },
  };
}

import type { FileEntry, GraphResult, Language } from "../types";
import { categorizeAll } from "./categorize";
import { extractGraph } from "./extract";
import { heuristicInsights } from "./heuristic";
import { computeMetrics } from "./metrics";

export interface AnalyzeOptions {
  includeTests?: boolean;
  projectName: string;
  inputSource: string;
  truncated?: boolean;
}

/** Full pipeline (no AI): files -> graph + metrics + heuristic insights. */
export function analyzeFiles(
  files: FileEntry[],
  options: AnalyzeOptions
): GraphResult {
  const { nodes, edges } = extractGraph(files, {
    includeTests: Boolean(options.includeTests),
  });

  categorizeAll(nodes);
  const { cycles } = computeMetrics(nodes, edges);
  const languages = [...new Set(nodes.map((n) => n.language))].sort() as Language[];
  const insights = heuristicInsights(nodes, cycles, languages);

  return {
    nodes,
    edges,
    cycles,
    languages,
    insights,
    meta: {
      projectName: options.projectName,
      inputSource: options.inputSource,
      generatedAt: new Date().toISOString(),
      fileCount: nodes.length,
      edgeCount: edges.length,
      cycleCount: cycles.length,
      truncated: options.truncated,
    },
  };
}

import path from "node:path";
import type { GraphEdge, GraphNode, Language, RawDepGraph } from "../types.js";

function folderOf(id: string): string {
  const dir = path.posix.dirname(id);
  return dir === "." ? "(root)" : dir;
}

function labelOf(id: string): string {
  const base = path.posix.basename(id);
  return base === "" || base === "." ? id : base;
}

export interface MergedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Merges raw graphs from all adapters into a single normalized graph. */
export function mergeGraphs(raw: RawDepGraph[]): MergedGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  const ensureNode = (id: string, language: Language, loc = 0): GraphNode => {
    let node = nodeMap.get(id);
    if (!node) {
      node = {
        id,
        label: labelOf(id),
        folder: folderOf(id),
        loc,
        language,
        category: "unknown",
        fanIn: 0,
        fanOut: 0,
        risk: 0,
        inCycle: false,
      };
      nodeMap.set(id, node);
    } else if (loc > node.loc) {
      node.loc = loc;
    }
    return node;
  };

  for (const graph of raw) {
    for (const n of graph.nodes) {
      ensureNode(n.id, n.language ?? graph.language, n.loc ?? 0);
    }
    for (const e of graph.edges) {
      // make sure both endpoints exist as nodes
      ensureNode(e.source, graph.language);
      ensureNode(e.target, graph.language);

      const key = `${e.source}\u0000${e.target}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.circular = existing.circular || Boolean(e.circular);
      } else if (e.source !== e.target) {
        edgeMap.set(key, {
          source: e.source,
          target: e.target,
          circular: Boolean(e.circular),
        });
      }
    }
  }

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
  };
}

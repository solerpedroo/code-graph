import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { GraphEdge, GraphNode, Insight } from "./types";
import { categoryColor } from "./theme";

export type Direction = "TB" | "LR";

export interface FlowNodeData extends Record<string, unknown> {
  node: GraphNode;
  width: number;
  height: number;
  color: string;
  highlight?: Insight["type"];
  dimmed: boolean;
}

function nodeSize(node: GraphNode): { width: number; height: number } {
  const importance = Math.min(node.fanIn, 14);
  const scale = 1 + (importance / 14) * 0.9;
  const labelW = Math.min(Math.max(node.label.length * 8 + 64, 150), 280);
  return {
    width: Math.round(labelW * Math.sqrt(scale)),
    height: Math.round(48 * scale),
  };
}

export interface LayoutInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlights: Map<string, Insight["type"]>;
  direction: Direction;
  dimmedIds?: Set<string>;
}

export function computeLayout(input: LayoutInput): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: input.direction,
    nodesep: 36,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of input.nodes) {
    const size = nodeSize(n);
    sizes.set(n.id, size);
    g.setNode(n.id, size);
  }

  const visible = new Set(input.nodes.map((n) => n.id));
  for (const e of input.edges) {
    if (visible.has(e.source) && visible.has(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  const flowNodes: Node<FlowNodeData>[] = input.nodes.map((n) => {
    const pos = g.node(n.id);
    const size = sizes.get(n.id)!;
    const highlight = input.highlights.get(n.id);
    return {
      id: n.id,
      type: "code",
      position: {
        x: (pos?.x ?? 0) - size.width / 2,
        y: (pos?.y ?? 0) - size.height / 2,
      },
      data: {
        node: n,
        width: size.width,
        height: size.height,
        color: categoryColor(n.category),
        highlight,
        dimmed: input.dimmedIds?.has(n.id) ?? false,
      },
      width: size.width,
      height: size.height,
    };
  });

  const flowEdges: Edge[] = input.edges
    .filter((e) => visible.has(e.source) && visible.has(e.target))
    .map((e, i) => ({
      id: `e${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: e.circular,
      style: {
        stroke: e.circular ? "#f87171" : "rgba(148,163,184,0.35)",
        strokeWidth: e.circular ? 2 : 1.2,
      },
      type: "default",
      data: { circular: e.circular },
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

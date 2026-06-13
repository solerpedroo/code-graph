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
  const scale = 1 + (importance / 14) * 0.35;
  const labelW = Math.min(Math.max(node.label.length * 7.5 + 72, 148), 260);
  return {
    width: Math.round(labelW * Math.sqrt(scale)),
    height: Math.round(44 * scale),
  };
}

export interface LayoutInput {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlights: Map<string, Insight["type"]>;
  direction: Direction;
  dimmedIds?: Set<string>;
  selectedId?: string | null;
}

export function computeLayout(input: LayoutInput): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: input.direction,
    nodesep: 28,
    ranksep: 72,
    marginx: 48,
    marginy: 48,
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
    return {
      id: n.id,
      type: "code",
      selected: input.selectedId === n.id,
      position: {
        x: (pos?.x ?? 0) - size.width / 2,
        y: (pos?.y ?? 0) - size.height / 2,
      },
      data: {
        node: n,
        width: size.width,
        height: size.height,
        color: categoryColor(n.category),
        highlight: input.highlights.get(n.id),
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
      type: "smoothstep",
      style: {
        stroke: e.circular ? "#e57373" : "rgba(148, 163, 184, 0.32)",
        strokeWidth: e.circular ? 1.5 : 1,
        strokeDasharray: e.circular ? "6 4" : undefined,
      },
      markerEnd: {
        type: "arrowclosed" as const,
        width: 14,
        height: 14,
        color: e.circular ? "#e57373" : "rgba(148, 163, 184, 0.45)",
      },
      data: { circular: e.circular },
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

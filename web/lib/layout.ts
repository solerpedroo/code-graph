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
  const scale = 1 + (importance / 14) * 0.28;
  const labelW = Math.min(Math.max(node.label.length * 7.5 + 88, 168), 280);
  const hasFolder = node.folder !== "(root)";
  const baseH = hasFolder ? 54 : 44;
  return {
    width: Math.round(labelW * Math.sqrt(scale)),
    height: Math.round(baseH * scale),
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

function findComponents(
  nodeIds: string[],
  edges: GraphEdge[]
): string[][] {
  const parent = new Map<string, string>();
  for (const id of nodeIds) parent.set(id, id);
  const find = (x: string): string => {
    const p = parent.get(x)!;
    if (p !== x) parent.set(x, find(p));
    return parent.get(x)!;
  };
  const unite = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };
  for (const e of edges) unite(e.source, e.target);

  const groups = new Map<string, string[]>();
  for (const id of nodeIds) {
    const root = find(id);
    const g = groups.get(root) ?? [];
    g.push(id);
    groups.set(root, g);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}

function layoutDagre(
  ids: string[],
  edges: GraphEdge[],
  direction: Direction,
  sizes: Map<string, { width: number; height: number }>
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 32,
    ranksep: direction === "TB" ? 80 : 64,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const set = new Set(ids);
  for (const id of ids) g.setNode(id, sizes.get(id)!);
  for (const e of edges) {
    if (set.has(e.source) && set.has(e.target)) g.setEdge(e.source, e.target);
  }

  dagre.layout(g);
  const pos = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const p = g.node(id);
    pos.set(id, { x: p.x, y: p.y });
  }
  return pos;
}

function bounds(
  ids: string[],
  pos: Map<string, { x: number; y: number }>,
  sizes: Map<string, { width: number; height: number }>
) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const id of ids) {
    const p = pos.get(id)!;
    const s = sizes.get(id)!;
    minX = Math.min(minX, p.x - s.width / 2);
    minY = Math.min(minY, p.y - s.height / 2);
    maxX = Math.max(maxX, p.x + s.width / 2);
    maxY = Math.max(maxY, p.y + s.height / 2);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function layoutGrid(
  ids: string[],
  sizes: Map<string, { width: number; height: number }>,
  cols: number
): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const gapX = 20;
  const gapY = 24;
  let x = 0;
  let y = 0;
  let rowH = 0;
  let col = 0;
  for (const id of ids) {
    const s = sizes.get(id)!;
    pos.set(id, { x: x + s.width / 2, y: y + s.height / 2 });
    rowH = Math.max(rowH, s.height);
    col++;
    if (col >= cols) {
      col = 0;
      x = 0;
      y += rowH + gapY;
      rowH = 0;
    } else {
      x += s.width + gapX;
    }
  }
  return pos;
}

export function computeLayout(input: LayoutInput): {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
} {
  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of input.nodes) sizes.set(n.id, nodeSize(n));

  const ids = input.nodes.map((n) => n.id);
  const components = findComponents(ids, input.edges);

  const connected: string[][] = [];
  const isolated: string[] = [];

  for (const comp of components) {
    const internal = input.edges.filter(
      (e) => comp.includes(e.source) && comp.includes(e.target)
    );
    if (internal.length > 0) connected.push(comp);
    else isolated.push(...comp);
  }

  const positions = new Map<string, { x: number; y: number }>();
  const packGap = 80;
  let cursorY = 0;
  let maxW = 0;

  for (const comp of connected) {
    const internal = input.edges.filter(
      (e) => comp.includes(e.source) && comp.includes(e.target)
    );
    const local = layoutDagre(comp, internal, input.direction, sizes);
    const b = bounds(comp, local, sizes);
    for (const id of comp) {
      const p = local.get(id)!;
      positions.set(id, { x: p.x - b.minX, y: p.y - b.minY + cursorY });
    }
    maxW = Math.max(maxW, b.w);
    cursorY += b.h + packGap;
  }

  if (isolated.length) {
    const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(isolated.length))));
    const grid = layoutGrid(isolated, sizes, cols);
    const b = bounds(isolated, grid, sizes);
    const offsetY = connected.length ? cursorY : 0;
    for (const id of isolated) {
      const p = grid.get(id)!;
      positions.set(id, { x: p.x - b.minX, y: p.y - b.minY + offsetY });
    }
    maxW = Math.max(maxW, b.w);
  }

  const flowNodes: Node<FlowNodeData>[] = input.nodes.map((n) => {
    const size = sizes.get(n.id)!;
    const p = positions.get(n.id) ?? { x: 0, y: 0 };
    return {
      id: n.id,
      type: "code",
      selected: input.selectedId === n.id,
      position: { x: p.x - size.width / 2, y: p.y - size.height / 2 },
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

  const visible = new Set(ids);
  const flowEdges: Edge[] = input.edges
    .filter((e) => visible.has(e.source) && visible.has(e.target))
    .map((e, i) => ({
      id: `e${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      style: {
        stroke: e.circular ? "#c97070" : "rgba(148, 163, 184, 0.28)",
        strokeWidth: e.circular ? 1.25 : 1,
        strokeDasharray: e.circular ? "5 4" : undefined,
      },
      markerEnd: {
        type: "arrowclosed" as const,
        width: 12,
        height: 12,
        color: e.circular ? "#c97070" : "rgba(148, 163, 184, 0.4)",
      },
      data: { circular: e.circular },
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo } from "react";
import { GraphNode } from "./GraphNode";
import { computeLayout, type Direction, type FlowNodeData } from "@/lib/layout";
import type { GraphEdge, GraphNode as GNode, Insight } from "@/lib/types";

interface Props {
  nodes: GNode[];
  edges: GraphEdge[];
  highlights: Map<string, Insight["type"]>;
  direction: Direction;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBackground: () => void;
}

function FlowInner({
  nodes,
  edges,
  highlights,
  direction,
  selectedId,
  onSelect,
  onBackground,
}: Props) {
  const rf = useReactFlow();
  const nodeTypes = useMemo(() => ({ code: GraphNode }), []);

  const dimmedIds = useMemo(() => {
    if (!selectedId) return undefined;
    const keep = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.source === selectedId) keep.add(e.target);
      if (e.target === selectedId) keep.add(e.source);
    }
    const dim = new Set<string>();
    for (const n of nodes) if (!keep.has(n.id)) dim.add(n.id);
    return dim;
  }, [selectedId, edges, nodes]);

  const layout = useMemo(
    () =>
      computeLayout({
        nodes,
        edges,
        highlights,
        direction,
        dimmedIds,
        selectedId,
      }),
    [nodes, edges, highlights, direction, dimmedIds, selectedId]
  );

  const layoutKey = `${direction}-${nodes.length}-${edges.length}`;

  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 80);
    return () => clearTimeout(t);
  }, [layoutKey, rf]);

  useEffect(() => {
    if (!selectedId) return;
    const target = layout.nodes.find((n) => n.id === selectedId);
    if (!target) return;
    const w = (target.data as FlowNodeData).width;
    const h = (target.data as FlowNodeData).height;
    rf.setCenter(target.position.x + w / 2, target.position.y + h / 2, {
      zoom: 1.05,
      duration: 400,
    });
  }, [selectedId, layout.nodes, rf]);

  const onNodeClick: NodeMouseHandler = (_, node) => onSelect(node.id);

  return (
    <ReactFlow
      nodes={layout.nodes as Node[]}
      edges={layout.edges as Edge[]}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onBackground}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.04}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      zoomOnScroll
      selectionOnDrag={false}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={28}
        size={1}
        color="rgba(255,255,255,0.045)"
      />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => (n.data as FlowNodeData)?.color ?? "#64748b"}
        nodeStrokeWidth={0}
        maskColor="rgba(7, 7, 8, 0.82)"
        className="cg-minimap"
      />
      <Controls showInteractive={false} className="cg-controls" />
    </ReactFlow>
  );
}

export function ArchGraph(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}

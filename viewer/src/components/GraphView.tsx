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
import { useEffect, useMemo } from "react";
import type { FlowNodeData } from "../layout";
import { CodeNode } from "./CustomNode";

interface Props {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  onNodeClick: NodeMouseHandler;
  onPaneClick: () => void;
  layoutKey: string;
  selectedId: string | null;
}

function Flow({
  nodes,
  edges,
  onNodeClick,
  onPaneClick,
  layoutKey,
  selectedId,
}: Props) {
  const nodeTypes = useMemo(() => ({ code: CodeNode }), []);
  const rf = useReactFlow();

  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.18, duration: 450 }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  useEffect(() => {
    if (!selectedId) return;
    const target = nodes.find((n) => n.id === selectedId);
    if (!target) return;
    const w = (target.data as FlowNodeData).width;
    const h = (target.data as FlowNodeData).height;
    rf.setCenter(target.position.x + w / 2, target.position.y + h / 2, {
      zoom: 1.15,
      duration: 450,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.05}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: "default" }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="rgba(255,255,255,0.05)"
      />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => (n.data as FlowNodeData)?.color ?? "#7d93a8"}
        nodeStrokeWidth={0}
        maskColor="rgba(20,20,20,0.72)"
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
        }}
      />
      <Controls
        showInteractive={false}
        style={{
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 6,
          overflow: "hidden",
        }}
      />
    </ReactFlow>
  );
}

export function GraphView(props: Props) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}

"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { FlowNodeData } from "@/lib/layout";
import { LANGUAGE_GLYPH } from "@/lib/theme";

function GraphNodeImpl({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const { node, color, highlight, dimmed, width, height } = d;

  const classes = ["cg-node"];
  if (selected) classes.push("cg-node--selected");
  if (dimmed) classes.push("cg-node--dimmed");
  if (highlight === "warning" || node.inCycle) classes.push("cg-node--warning");
  else if (highlight === "core") classes.push("cg-node--core");
  if (highlight === "isolated") classes.push("cg-node--isolated");

  return (
    <div
      className={classes.join(" ")}
      style={
        {
          width,
          height,
          "--cg-accent": color,
        } as React.CSSProperties
      }
      title={node.id}
    >
      <span className="cg-node__accent" aria-hidden />
      <Handle type="target" position={Position.Top} className="cg-handle" />
      <div className="cg-node__row">
        <span className="cg-node__lang">{LANGUAGE_GLYPH[node.language]}</span>
        <div className="cg-node__text">
          <span className="cg-node__label">{node.label}</span>
          {node.folder !== "(root)" && (
            <span className="cg-node__path">{node.folder}</span>
          )}
        </div>
        <span className="cg-node__meta">
          <span title="fan-in">↓{node.fanIn}</span>
          <span title="fan-out">↑{node.fanOut}</span>
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="cg-handle" />
    </div>
  );
}

export const GraphNode = memo(GraphNodeImpl);

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { FlowNodeData } from "../layout";
import { LANGUAGE_GLYPH } from "../theme";

function CodeNodeImpl({ data, selected }: NodeProps) {
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
      <Handle type="target" position={Position.Top} className="cg-handle" />
      <span className="cg-node__lang">{LANGUAGE_GLYPH[node.language]}</span>
      <span className="cg-node__label">{node.label}</span>
      <span className="cg-node__meta">
        <span title="fan-in (quem depende deste)">&#8595;{node.fanIn}</span>
        <span title="fan-out (de quantos depende)">&#8593;{node.fanOut}</span>
      </span>
      <Handle type="source" position={Position.Bottom} className="cg-handle" />
    </div>
  );
}

export const CodeNode = memo(CodeNodeImpl);

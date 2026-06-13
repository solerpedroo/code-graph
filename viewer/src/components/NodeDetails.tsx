import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  LANGUAGE_LABELS,
} from "../theme";
import type { GraphEdge, GraphNode, Insight } from "../types";

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  highlight?: Insight;
  onSelectNode: (id: string) => void;
  onClose: () => void;
}

export function NodeDetails({
  node,
  edges,
  highlight,
  onSelectNode,
  onClose,
}: Props) {
  const dependsOn = edges
    .filter((e) => e.source === node.id)
    .map((e) => e.target);
  const dependedBy = edges
    .filter((e) => e.target === node.id)
    .map((e) => e.source);

  return (
    <div className="cg-details">
      <div className="cg-details__header">
        <div className="cg-details__titles">
          <span
            className="cg-details__cat"
            style={{ background: CATEGORY_COLORS[node.category] }}
          >
            {CATEGORY_LABELS[node.category]}
          </span>
          <h2>{node.label}</h2>
          <div className="cg-details__path">{node.id}</div>
        </div>
        <button className="cg-close" onClick={onClose} aria-label="Fechar">
          &times;
        </button>
      </div>

      {highlight && (
        <div className={`cg-callout cg-callout--${highlight.type}`}>
          {highlight.message}
        </div>
      )}

      <div className="cg-stats">
        <Stat label="Linguagem" value={LANGUAGE_LABELS[node.language]} />
        <Stat label="Linhas" value={String(node.loc)} />
        <Stat label="Fan-in" value={String(node.fanIn)} />
        <Stat label="Fan-out" value={String(node.fanOut)} />
        <Stat label="Risco" value={String(node.risk)} />
        <Stat label="Em ciclo" value={node.inCycle ? "Sim" : "Nao"} warn={node.inCycle} />
      </div>

      <RefList
        title={`Depende de (${dependsOn.length})`}
        ids={dependsOn}
        onSelectNode={onSelectNode}
      />
      <RefList
        title={`Usado por (${dependedBy.length})`}
        ids={dependedBy}
        onSelectNode={onSelectNode}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="cg-stat">
      <div className="cg-stat__label">{label}</div>
      <div className={`cg-stat__value ${warn ? "cg-stat__value--warn" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function RefList({
  title,
  ids,
  onSelectNode,
}: {
  title: string;
  ids: string[];
  onSelectNode: (id: string) => void;
}) {
  if (!ids.length) return null;
  return (
    <div className="cg-block">
      <div className="cg-block__title">{title}</div>
      <ul className="cg-reflist">
        {ids.map((id) => (
          <li key={id} onClick={() => onSelectNode(id)} title={id}>
            {id}
          </li>
        ))}
      </ul>
    </div>
  );
}

import { CATEGORY_COLORS, CATEGORY_LABELS, LANGUAGE_LABELS } from "@/lib/theme";
import type { GraphEdge, GraphNode, Insight } from "@/lib/types";

export function NodePanel({
  node,
  edges,
  highlight,
  onSelect,
  onClose,
}: {
  node: GraphNode;
  edges: GraphEdge[];
  highlight?: Insight;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dependsOn = edges.filter((e) => e.source === node.id).map((e) => e.target);
  const dependedBy = edges
    .filter((e) => e.target === node.id)
    .map((e) => e.source);

  return (
    <div>
      <div className="nd__head">
        <div>
          <span className="nd__cat">
            <span
              className="nd__cat-dot"
              style={{ background: CATEGORY_COLORS[node.category] }}
            />
            {CATEGORY_LABELS[node.category]}
          </span>
          <div className="nd__name">{node.label}</div>
          <div className="nd__path">{node.id}</div>
        </div>
        <button className="nd__close" onClick={onClose} aria-label="Fechar">
          &times;
        </button>
      </div>

      {highlight && (
        <div className={`callout t-${highlight.type}`}>{highlight.message}</div>
      )}

      <div className="stats-grid">
        <Sg l="Linguagem" v={LANGUAGE_LABELS[node.language]} />
        <Sg l="Linhas" v={String(node.loc)} />
        <Sg l="Risco" v={String(node.risk)} />
        <Sg l="Fan-in" v={String(node.fanIn)} />
        <Sg l="Fan-out" v={String(node.fanOut)} />
        <Sg l="Em ciclo" v={node.inCycle ? "Sim" : "Não"} warn={node.inCycle} />
      </div>

      <RefList
        title={`Depende de (${dependsOn.length})`}
        ids={dependsOn}
        onSelect={onSelect}
      />
      <RefList
        title={`Usado por (${dependedBy.length})`}
        ids={dependedBy}
        onSelect={onSelect}
      />
    </div>
  );
}

function Sg({ l, v, warn }: { l: string; v: string; warn?: boolean }) {
  return (
    <div className="sg">
      <div className="sg__l">{l}</div>
      <div className={`sg__v ${warn ? "warn" : ""}`}>{v}</div>
    </div>
  );
}

function RefList({
  title,
  ids,
  onSelect,
}: {
  title: string;
  ids: string[];
  onSelect: (id: string) => void;
}) {
  if (!ids.length) return null;
  return (
    <div className="block">
      <div className="block__title">{title}</div>
      <ul className="reflist">
        {ids.map((id) => (
          <li key={id} title={id} onClick={() => onSelect(id)}>
            {id}
          </li>
        ))}
      </ul>
    </div>
  );
}

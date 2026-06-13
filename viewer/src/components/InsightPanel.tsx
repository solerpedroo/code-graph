import type { Insights } from "../types";

interface Props {
  insights: Insights;
  onSelectNode: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  warning: "Atencao",
  core: "Central",
  isolated: "Isolado",
};

export function InsightPanel({ insights, onSelectNode }: Props) {
  return (
    <div className="cg-insights">
      <div className="cg-source-row">
        <span
          className={`cg-badge ${
            insights.source === "ai" ? "cg-badge--ai" : "cg-badge--heur"
          }`}
        >
          {insights.source === "ai" ? "Gerado por IA" : "Heuristica"}
        </span>
      </div>

      {insights.summary && <p className="cg-summary">{insights.summary}</p>}

      {insights.highlights.length > 0 && (
        <div className="cg-block">
          <div className="cg-block__title">Destaques</div>
          <ul className="cg-hl-list">
            {insights.highlights.map((h, i) => (
              <li
                key={i}
                className={`cg-hl cg-hl--${h.type}`}
                onClick={() => onSelectNode(h.nodeId)}
              >
                <div className="cg-hl__top">
                  <span className={`cg-hl__tag cg-hl__tag--${h.type}`}>
                    {TYPE_LABEL[h.type] ?? h.type}
                  </span>
                  <span className="cg-hl__id">{h.nodeId.split("/").pop()}</span>
                </div>
                <div className="cg-hl__msg">{h.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.suggestions.length > 0 && (
        <div className="cg-block">
          <div className="cg-block__title">Sugestoes</div>
          <ul className="cg-bullets">
            {insights.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.circularDependencyNotes.length > 0 && (
        <div className="cg-block">
          <div className="cg-block__title cg-block__title--warn">
            Dependencias circulares
          </div>
          <ul className="cg-bullets cg-bullets--warn">
            {insights.circularDependencyNotes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

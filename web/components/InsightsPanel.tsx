import type { Insights } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  warning: "Atenção",
  core: "Central",
  isolated: "Isolado",
};

export function InsightsPanel({
  insights,
  onSelect,
}: {
  insights: Insights;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <span className={`badge ${insights.source === "ai" ? "badge--ai" : "badge--heur"}`}>
        {insights.source === "ai" ? "Gerado por IA" : "Heuristica"}
      </span>

      {insights.summary && <p className="summary">{insights.summary}</p>}

      {insights.highlights.length > 0 && (
        <div className="block">
          <div className="block__title">Destaques</div>
          {insights.highlights.map((h, i) => (
            <div key={i} className={`hl t-${h.type}`} onClick={() => onSelect(h.nodeId)}>
              <div className="hl__top">
                <span className="hl__tag">{TYPE_LABEL[h.type] ?? h.type}</span>
                <span className="hl__id">{h.nodeId.split("/").pop()}</span>
              </div>
              <div className="hl__msg">{h.message}</div>
            </div>
          ))}
        </div>
      )}

      {insights.suggestions.length > 0 && (
        <div className="block">
          <div className="block__title">Sugestões</div>
          <ul className="bullets">
            {insights.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.circularDependencyNotes.length > 0 && (
        <div className="block">
          <div className="block__title warn">Dependências circulares</div>
          <ul className="bullets warn">
            {insights.circularDependencyNotes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  LANGUAGE_LABELS,
} from "@/lib/theme";
import type { Category, GraphResult, Insight, Language } from "@/lib/types";
import type { Direction } from "@/lib/layout";
import { ArchGraph } from "./ArchGraph";
import { InsightsPanel } from "./InsightsPanel";
import { LogoMark } from "./Logo";
import { NodePanel } from "./NodePanel";

export function GraphExplorer({
  result,
  onBack,
}: {
  result: GraphResult;
  onBack: () => void;
}) {
  const allLanguages = useMemo(
    () => [...new Set(result.nodes.map((n) => n.language))].sort() as Language[],
    [result]
  );
  const categoryCounts = useMemo(() => {
    const m = new Map<Category, number>();
    for (const n of result.nodes) m.set(n.category, (m.get(n.category) ?? 0) + 1);
    return [...m.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [result]);

  const highlightByNode = useMemo(() => {
    const m = new Map<string, Insight>();
    for (const h of result.insights.highlights) if (!m.has(h.nodeId)) m.set(h.nodeId, h);
    return m;
  }, [result]);
  const highlightTypes = useMemo(() => {
    const m = new Map<string, Insight["type"]>();
    for (const [id, h] of highlightByNode) m.set(id, h.type);
    return m;
  }, [highlightByNode]);

  const [search, setSearch] = useState("");
  const [langs, setLangs] = useState<Set<Language>>(new Set(allLanguages));
  const [cats, setCats] = useState<Set<Category>>(
    new Set(categoryCounts.map((c) => c.category))
  );
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"insights" | "details">("insights");
  const [direction, setDirection] = useState<Direction>("TB");

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return result.nodes.filter((n) => {
      if (!langs.has(n.language)) return false;
      if (!cats.has(n.category)) return false;
      if (onlyWarnings && !(n.inCycle || highlightTypes.get(n.id) === "warning"))
        return false;
      if (q && !n.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [result, search, langs, cats, onlyWarnings, highlightTypes]);

  const selectedNode = selectedId
    ? result.nodes.find((n) => n.id === selectedId) ?? null
    : null;

  const select = (id: string) => {
    setSelectedId(id);
    setTab("details");
  };
  const clear = () => {
    setSelectedId(null);
    setTab("insights");
  };
  const toggle = <T,>(set: Set<T>, v: T) => {
    const next = new Set(set);
    next.has(v) ? next.delete(v) : next.add(v);
    return next;
  };

  return (
    <div className="exp">
      <header className="exp__top">
        <button className="exp__back" onClick={onBack}>
          <span style={{ fontSize: 16 }}>&larr;</span>
          <LogoMark size={20} />
        </button>
        <div className="exp__title">
          <span className="name">{result.meta.projectName}</span>
          <span className="src">{result.meta.inputSource}</span>
        </div>
        <div className="exp__stats">
          <Stat v={result.meta.fileCount} l="módulos" />
          <Stat v={result.meta.edgeCount} l="deps" />
          <Stat v={result.meta.cycleCount} l="ciclos" warn={result.meta.cycleCount > 0} />
          <Stat v={allLanguages.length} l="langs" />
        </div>
      </header>

      <aside className="rail">
        <div className="rail__group">
          <input
            className="search"
            placeholder="Buscar arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rail__group">
          <label className="switch">
            <input
              type="checkbox"
              checked={onlyWarnings}
              onChange={(e) => setOnlyWarnings(e.target.checked)}
            />
            Apenas warnings / ciclos
          </label>
        </div>

        {allLanguages.length > 1 && (
          <div className="rail__group">
            <div className="rail__title">Linguagens</div>
            <div className="pills">
              {allLanguages.map((l) => (
                <button
                  key={l}
                  className={`pill ${langs.has(l) ? "on" : ""}`}
                  onClick={() => setLangs((s) => toggle(s, l))}
                >
                  {LANGUAGE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rail__group">
          <div className="rail__title">Categorias</div>
          <div className="legend">
            {categoryCounts.map(({ category, count }) => (
              <button
                key={category}
                className={`legend__item ${cats.has(category) ? "" : "off"}`}
                onClick={() => setCats((s) => toggle(s, category))}
              >
                <span
                  className="legend__dot"
                  style={{ color: CATEGORY_COLORS[category], background: CATEGORY_COLORS[category] }}
                />
                <span className="legend__label">{CATEGORY_LABELS[category]}</span>
                <span className="legend__count">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="canvas">
        <div className="canvas__toolbar">
          <span className="canvas__toolbar-label">Layout</span>
          <button
            type="button"
            className={`canvas__dir ${direction === "TB" ? "on" : ""}`}
            onClick={() => setDirection("TB")}
            title="Top to bottom"
          >
            ↓ Vertical
          </button>
          <button
            type="button"
            className={`canvas__dir ${direction === "LR" ? "on" : ""}`}
            onClick={() => setDirection("LR")}
            title="Left to right"
          >
            → Horizontal
          </button>
        </div>
        <div className="canvas__graph">
          <ArchGraph
            nodes={filteredNodes}
            edges={result.edges}
            highlights={highlightTypes}
            direction={direction}
            selectedId={selectedId}
            onSelect={select}
            onBackground={clear}
          />
        </div>
        <div className="canvas__legend-floating">
          <span className="k">
            <span className="legend__dot" style={{ background: "var(--fg-3)" }} />
            dependência
          </span>
          <span className="k">
            <span className="legend__line legend__line--cycle" />
            ciclo
          </span>
        </div>
      </main>

      <aside className="panel">
        <div className="panel__tabs">
          <button
            className={`panel__tab ${tab === "insights" ? "on" : ""}`}
            onClick={() => setTab("insights")}
          >
            Insights
          </button>
          <button
            className={`panel__tab ${tab === "details" ? "on" : ""}`}
            onClick={() => setTab("details")}
          >
            Detalhes
          </button>
        </div>
        <div className="panel__body">
          {tab === "insights" ? (
            <InsightsPanel insights={result.insights} onSelect={select} />
          ) : selectedNode ? (
            <NodePanel
              node={selectedNode}
              edges={result.edges}
              highlight={highlightByNode.get(selectedNode.id)}
              onSelect={select}
              onClose={clear}
            />
          ) : (
            <div className="empty">
              Selecione um nó no grafo para ver métricas e dependências do arquivo.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ v, l, warn }: { v: number; l: string; warn?: boolean }) {
  return (
    <div className="stat">
      <span className={`stat__v ${warn ? "is-warn" : ""}`}>{v}</span>
      <span className="stat__l">{l}</span>
    </div>
  );
}

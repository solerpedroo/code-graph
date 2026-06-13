import { useMemo, useState } from "react";
import { Filters } from "./components/Filters";
import { GraphView } from "./components/GraphView";
import { InsightPanel } from "./components/InsightPanel";
import { NodeDetails } from "./components/NodeDetails";
import { loadGraphData } from "./data";
import { computeLayout, type Direction } from "./layout";
import { LANGUAGE_LABELS } from "./theme";
import type { Category, Insight, Language } from "./types";

const { data, isDemo } = loadGraphData();

type Tab = "insights" | "details";

export default function App() {
  const allLanguages = useMemo(
    () => [...new Set(data.nodes.map((n) => n.language))].sort() as Language[],
    []
  );
  const categoryCounts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const n of data.nodes) map.set(n.category, (map.get(n.category) ?? 0) + 1);
    return [...map.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const highlightByNode = useMemo(() => {
    const map = new Map<string, Insight>();
    for (const h of data.insights.highlights) {
      if (!map.has(h.nodeId)) map.set(h.nodeId, h);
    }
    return map;
  }, []);
  const highlightTypes = useMemo(() => {
    const map = new Map<string, Insight["type"]>();
    for (const [id, h] of highlightByNode) map.set(id, h.type);
    return map;
  }, [highlightByNode]);

  const [search, setSearch] = useState("");
  const [activeLanguages, setActiveLanguages] = useState<Set<Language>>(
    new Set(allLanguages)
  );
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(categoryCounts.map((c) => c.category))
  );
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [direction, setDirection] = useState<Direction>("TB");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("insights");

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.nodes.filter((n) => {
      if (!activeLanguages.has(n.language)) return false;
      if (!activeCategories.has(n.category)) return false;
      if (onlyWarnings && !(n.inCycle || highlightTypes.get(n.id) === "warning"))
        return false;
      if (q && !n.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, activeLanguages, activeCategories, onlyWarnings, highlightTypes]);

  const dimmedIds = useMemo(() => {
    if (!selectedId) return undefined;
    const keep = new Set<string>([selectedId]);
    for (const e of data.edges) {
      if (e.source === selectedId) keep.add(e.target);
      if (e.target === selectedId) keep.add(e.source);
    }
    return new Set(filteredNodes.filter((n) => !keep.has(n.id)).map((n) => n.id));
  }, [selectedId, filteredNodes]);

  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    );
    return computeLayout({
      nodes: filteredNodes,
      edges,
      highlights: highlightTypes,
      direction,
      dimmedIds,
    });
  }, [filteredNodes, direction, highlightTypes, dimmedIds]);

  const layoutKey = `${direction}-${filteredNodes.length}-${search}-${onlyWarnings}`;

  const selectedNode = selectedId
    ? data.nodes.find((n) => n.id === selectedId) ?? null
    : null;

  const selectNode = (id: string) => {
    setSelectedId(id);
    setTab("details");
  };
  const clearSelection = () => {
    setSelectedId(null);
    setTab("insights");
  };

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div className="cg-app">
      {/* Title bar */}
      <header className="cg-titlebar">
        <div className="cg-titlebar__brand">
          <span className="cg-logo">CG</span>
          <span className="cg-titlebar__name">CodeGraph</span>
        </div>
        <span className="cg-titlebar__sep">/</span>
        <span className="cg-titlebar__project">{data.meta.projectName}</span>
        <span className="cg-titlebar__spacer" />
        {isDemo && <span className="cg-demo-tag">dados de exemplo</span>}
        <span className="cg-titlebar__src">{data.meta.inputSource}</span>
      </header>

      {/* Left pane: filters */}
      <section className="cg-pane cg-pane--side">
        <div className="cg-pane__header">
          <span className="cg-pane__title">Filtros</span>
        </div>
        <div className="cg-pane__body">
          <Filters
            search={search}
            setSearch={setSearch}
            languages={allLanguages}
            activeLanguages={activeLanguages}
            toggleLanguage={(l) => setActiveLanguages((s) => toggleSet(s, l))}
            categories={categoryCounts}
            activeCategories={activeCategories}
            toggleCategory={(c) => setActiveCategories((s) => toggleSet(s, c))}
            onlyWarnings={onlyWarnings}
            setOnlyWarnings={setOnlyWarnings}
          />
        </div>
      </section>

      {/* Center pane: graph */}
      <section className="cg-pane cg-pane--canvas">
        <div className="cg-pane__header">
          <span className="cg-pane__title">Grafo de dependencias</span>
          <span className="cg-pane__spacer" />
          <div className="cg-segment">
            <button
              className={`cg-segment__btn ${
                direction === "TB" ? "cg-segment__btn--on" : ""
              }`}
              onClick={() => setDirection("TB")}
            >
              Vertical
            </button>
            <button
              className={`cg-segment__btn ${
                direction === "LR" ? "cg-segment__btn--on" : ""
              }`}
              onClick={() => setDirection("LR")}
            >
              Horizontal
            </button>
          </div>
        </div>
        <div className="cg-canvas-body">
          <GraphView
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={clearSelection}
            layoutKey={layoutKey}
            selectedId={selectedId}
          />
        </div>
      </section>

      {/* Right pane: insights / details */}
      <section className="cg-pane cg-pane--panel">
        <div className="cg-pane__header">
          <div className="cg-tabs">
            <button
              className={`cg-tab ${tab === "insights" ? "cg-tab--active" : ""}`}
              onClick={() => setTab("insights")}
            >
              Insights
            </button>
            <button
              className={`cg-tab ${tab === "details" ? "cg-tab--active" : ""}`}
              onClick={() => setTab("details")}
            >
              Detalhes
            </button>
          </div>
        </div>
        <div className="cg-pane__body">
          {tab === "insights" ? (
            <InsightPanel insights={data.insights} onSelectNode={selectNode} />
          ) : selectedNode ? (
            <NodeDetails
              node={selectedNode}
              edges={data.edges}
              highlight={highlightByNode.get(selectedNode.id)}
              onSelectNode={selectNode}
              onClose={clearSelection}
            />
          ) : (
            <div className="cg-empty">
              Selecione um no no grafo para ver os detalhes do arquivo,
              metricas e dependencias.
            </div>
          )}
        </div>
      </section>

      {/* Status bar */}
      <footer className="cg-statusbar">
        <span className="cg-status-item">
          <b>{filteredNodes.length}</b>
          <span className="cg-status-faint">/ {data.meta.fileCount} arquivos</span>
        </span>
        <span className="cg-status-item">
          <b>{data.meta.edgeCount}</b> dependencias
        </span>
        <span
          className={`cg-status-item ${
            data.meta.cycleCount > 0 ? "cg-status-item--warn" : ""
          }`}
        >
          <span
            className={`cg-status-dot ${
              data.meta.cycleCount > 0 ? "cg-status-dot--warn" : "cg-status-dot--ok"
            }`}
          />
          <b>{data.meta.cycleCount}</b> ciclos
        </span>
        <span className="cg-status-item cg-status-faint">
          {allLanguages.map((l) => LANGUAGE_LABELS[l]).join(", ")}
        </span>
        <span className="cg-statusbar__spacer" />
        <span className="cg-status-item cg-status-faint">
          {data.insights.source === "ai" ? "insights: IA" : "insights: heuristica"}
        </span>
      </footer>
    </div>
  );
}

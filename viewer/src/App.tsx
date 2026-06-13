import { useMemo, useState } from "react";
import { Filters } from "./components/Filters";
import { GraphView } from "./components/GraphView";
import { InsightPanel } from "./components/InsightPanel";
import { NodeDetails } from "./components/NodeDetails";
import { loadGraphData } from "./data";
import { computeLayout, type Direction } from "./layout";
import type { Category, Insight, Language } from "./types";

const { data, isDemo } = loadGraphData();

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

  const toggleSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div className="cg-app">
      <header className="cg-topbar">
        <div className="cg-brand">
          <span className="cg-brand__logo">CG</span>
          <div>
            <div className="cg-brand__name">CodeGraph</div>
            <div className="cg-brand__sub">{data.meta.projectName}</div>
          </div>
        </div>
        <div className="cg-topbar__stats">
          <Metric value={data.meta.fileCount} label="arquivos" />
          <Metric value={data.meta.edgeCount} label="dependencias" />
          <Metric
            value={data.meta.cycleCount}
            label="ciclos"
            warn={data.meta.cycleCount > 0}
          />
          <Metric value={allLanguages.length} label="linguagens" />
        </div>
        {isDemo && <span className="cg-demo-tag">dados de exemplo</span>}
      </header>

      <aside className="cg-sidebar">
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
          direction={direction}
          setDirection={setDirection}
          visibleCount={filteredNodes.length}
          totalCount={data.nodes.length}
        />
      </aside>

      <main className="cg-canvas">
        <GraphView
          nodes={flowNodes}
          edges={flowEdges}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          layoutKey={layoutKey}
          selectedId={selectedId}
        />
      </main>

      <aside className="cg-panel">
        {selectedNode ? (
          <NodeDetails
            node={selectedNode}
            edges={data.edges}
            highlight={highlightByNode.get(selectedNode.id)}
            onSelectNode={(id) => setSelectedId(id)}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <InsightPanel
            insights={data.insights}
            onSelectNode={(id) => setSelectedId(id)}
          />
        )}
      </aside>
    </div>
  );
}

function Metric({
  value,
  label,
  warn,
}: {
  value: number;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className="cg-metric">
      <span className={`cg-metric__value ${warn ? "cg-metric__value--warn" : ""}`}>
        {value}
      </span>
      <span className="cg-metric__label">{label}</span>
    </div>
  );
}

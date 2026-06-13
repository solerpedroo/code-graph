import type { GraphResult } from "./types";

const node = (
  id: string,
  language: GraphResult["nodes"][number]["language"],
  category: GraphResult["nodes"][number]["category"],
  loc: number
): GraphResult["nodes"][number] => ({
  id,
  label: id.split("/").pop() ?? id,
  folder: id.split("/").slice(0, -1).join("/") || "(root)",
  loc,
  language,
  category,
  fanIn: 0,
  fanOut: 0,
  risk: 0,
  inCycle: false,
});

const nodes = [
  node("src/index.ts", "typescript", "entry", 40),
  node("src/app/App.tsx", "typescript", "component", 120),
  node("src/components/Button.tsx", "typescript", "component", 60),
  node("src/components/Card.tsx", "typescript", "component", 80),
  node("src/hooks/useAuth.ts", "typescript", "hook", 90),
  node("src/services/apiClient.ts", "typescript", "service", 140),
  node("src/services/userService.ts", "typescript", "service", 110),
  node("src/utils/format.ts", "typescript", "util", 45),
  node("src/utils/logger.ts", "typescript", "util", 30),
  node("src/models/User.ts", "typescript", "model", 35),
  node("src/types/api.d.ts", "typescript", "types", 25),
  node("src/config/env.ts", "typescript", "config", 20),
  node("src/legacy/orphan.ts", "typescript", "unknown", 15),
];

const edges = [
  { source: "src/index.ts", target: "src/app/App.tsx", circular: false },
  { source: "src/app/App.tsx", target: "src/components/Button.tsx", circular: false },
  { source: "src/app/App.tsx", target: "src/components/Card.tsx", circular: false },
  { source: "src/app/App.tsx", target: "src/hooks/useAuth.ts", circular: false },
  { source: "src/components/Card.tsx", target: "src/utils/format.ts", circular: false },
  { source: "src/components/Button.tsx", target: "src/utils/format.ts", circular: false },
  { source: "src/hooks/useAuth.ts", target: "src/services/userService.ts", circular: false },
  { source: "src/services/userService.ts", target: "src/services/apiClient.ts", circular: false },
  { source: "src/services/apiClient.ts", target: "src/utils/logger.ts", circular: false },
  { source: "src/services/apiClient.ts", target: "src/config/env.ts", circular: false },
  { source: "src/services/userService.ts", target: "src/models/User.ts", circular: false },
  { source: "src/models/User.ts", target: "src/types/api.d.ts", circular: false },
  { source: "src/services/apiClient.ts", target: "src/services/userService.ts", circular: true },
  { source: "src/utils/format.ts", target: "src/utils/logger.ts", circular: false },
];

// fill metrics
for (const e of edges) {
  const s = nodes.find((n) => n.id === e.source);
  const t = nodes.find((n) => n.id === e.target);
  if (s) s.fanOut++;
  if (t) t.fanIn++;
}
for (const n of nodes) n.risk = n.fanIn * n.fanOut;
for (const id of ["src/services/apiClient.ts", "src/services/userService.ts"]) {
  const n = nodes.find((x) => x.id === id);
  if (n) n.inCycle = true;
}

export const DEMO_DATA: GraphResult = {
  nodes,
  edges,
  cycles: [["src/services/apiClient.ts", "src/services/userService.ts"]],
  languages: ["typescript"],
  insights: {
    summary:
      "Arquitetura em camadas saudavel, com uma dependencia circular entre apiClient e userService que merece atencao. apiClient e o modulo central do projeto.",
    highlights: [
      {
        nodeId: "src/services/apiClient.ts",
        type: "warning",
        message: "Alto acoplamento e participa de um ciclo com userService.",
      },
      {
        nodeId: "src/utils/format.ts",
        type: "core",
        message: "Utilitario central usado por varios componentes.",
      },
      {
        nodeId: "src/legacy/orphan.ts",
        type: "isolated",
        message: "Sem conexoes. Possivel codigo morto.",
      },
    ],
    circularDependencyNotes: [
      "Ciclo 1: apiClient <-> userService. Extraia uma interface compartilhada para quebrar a dependencia.",
    ],
    suggestions: [
      "Quebre o ciclo apiClient/userService introduzindo uma abstracao de transporte.",
      "Avalie remover src/legacy/orphan.ts (isolado).",
    ],
    source: "heuristic",
  },
  meta: {
    projectName: "demo-project",
    inputSource: "demo",
    generatedAt: new Date().toISOString(),
    fileCount: nodes.length,
    edgeCount: edges.length,
    cycleCount: 1,
  },
};

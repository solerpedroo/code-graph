import { DEMO_DATA } from "./demoData";
import type { GraphResult } from "./types";

/** Reads the embedded graph data, falling back to demo data in dev mode. */
export function loadGraphData(): { data: GraphResult; isDemo: boolean } {
  const el = document.getElementById("codegraph-data");
  const raw = el?.textContent?.trim();
  if (raw && raw !== "__CODEGRAPH_DATA__") {
    try {
      return { data: JSON.parse(raw) as GraphResult, isDemo: false };
    } catch (err) {
      console.error("Falha ao ler dados do grafo:", err);
    }
  }
  return { data: DEMO_DATA, isDemo: true };
}

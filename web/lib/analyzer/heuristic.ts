import type { GraphNode, Insight, Insights, Language } from "../types";

export function heuristicInsights(
  nodes: GraphNode[],
  cycles: string[][],
  languages: Language[]
): Insights {
  const highlights: Insight[] = [];
  const byFanIn = [...nodes].sort((a, b) => b.fanIn - a.fanIn);
  const byRisk = [...nodes].sort((a, b) => b.risk - a.risk);
  const isolated = nodes.filter((n) => n.fanIn === 0 && n.fanOut === 0);

  for (const n of byFanIn.slice(0, 4)) {
    if (n.fanIn >= 3) {
      highlights.push({
        nodeId: n.id,
        type: "core",
        message: `Módulo central: ${n.fanIn} arquivos dependem dele. Mudanças aqui têm alto impacto.`,
      });
    }
  }
  for (const n of byRisk.slice(0, 4)) {
    if (n.risk >= 6 || n.inCycle) {
      highlights.push({
        nodeId: n.id,
        type: "warning",
        message: `Alto acoplamento (fan-in ${n.fanIn}, fan-out ${n.fanOut})${
          n.inCycle ? " e participa de um ciclo" : ""
        }. Candidato a refatoração.`,
      });
    }
  }
  for (const n of isolated.slice(0, 4)) {
    highlights.push({
      nodeId: n.id,
      type: "isolated",
      message:
        "Sem dependências de entrada ou saída. Possível código morto ou ponto de entrada.",
    });
  }

  const circularDependencyNotes = cycles
    .slice(0, 10)
    .map(
      (c, i) =>
        `Ciclo ${i + 1}: ${c.slice(0, 6).join(" -> ")}${
          c.length > 6 ? " -> ..." : ""
        } (${c.length} módulos)`
    );

  const suggestions: string[] = [];
  if (cycles.length)
    suggestions.push(
      `Quebre as ${cycles.length} dependência(s) circular(es) extraindo interfaces ou movendo código compartilhado para um módulo neutro.`
    );
  const topRisk = byRisk[0];
  if (topRisk && topRisk.risk >= 6)
    suggestions.push(
      `Considere dividir "${topRisk.id}" em módulos menores e mais focados.`
    );
  if (isolated.length > 3)
    suggestions.push(
      `Há ${isolated.length} módulos isolados; verifique se são código morto que pode ser removido.`
    );
  if (!suggestions.length)
    suggestions.push("Arquitetura saudável: sem ciclos e acoplamento controlado.");

  const langText =
    languages.length > 1 ? `Projeto multi-linguagem (${languages.join(", ")}). ` : "";
  const totalDeps = nodes.reduce((s, n) => s + n.fanOut, 0);
  const summary = `${langText}${nodes.length} módulos e ${totalDeps} dependências analisadas. ${
    cycles.length
      ? `${cycles.length} dependência(s) circular(es) detectada(s).`
      : "Nenhuma dependência circular detectada."
  }`;

  return {
    summary,
    highlights: highlights.slice(0, 12),
    circularDependencyNotes,
    suggestions,
    source: "heuristic",
  };
}

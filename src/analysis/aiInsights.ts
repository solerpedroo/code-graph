import type {
  GraphNode,
  Insight,
  Insights,
  Language,
} from "../types.js";

export interface AIInsightOptions {
  useAI: boolean;
  maxNodes: number;
  model: string;
  apiKey?: string;
}

interface GraphSummary {
  languages: Language[];
  totalNodes: number;
  totalEdges: number;
  nodes: Array<{
    id: string;
    language: Language;
    category: string;
    fanIn: number;
    fanOut: number;
    loc: number;
    inCycle: boolean;
  }>;
  cycles: string[][];
}

function buildSummary(
  nodes: GraphNode[],
  cycles: string[][],
  languages: Language[],
  edgeCount: number,
  maxNodes: number
): GraphSummary {
  const ranked = [...nodes]
    .sort((a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut))
    .slice(0, maxNodes);

  // make sure isolated nodes are represented too (a small sample)
  const isolated = nodes
    .filter((n) => n.fanIn === 0 && n.fanOut === 0)
    .slice(0, 5);
  const included = new Map(ranked.map((n) => [n.id, n]));
  for (const n of isolated) if (!included.has(n.id)) included.set(n.id, n);

  return {
    languages,
    totalNodes: nodes.length,
    totalEdges: edgeCount,
    cycles: cycles.slice(0, 20),
    nodes: [...included.values()].map((n) => ({
      id: n.id,
      language: n.language,
      category: n.category,
      fanIn: n.fanIn,
      fanOut: n.fanOut,
      loc: n.loc,
      inCycle: n.inCycle,
    })),
  };
}

const SYSTEM_PROMPT = `Voce e um arquiteto de software senior analisando a estrutura de dependencias de um projeto, possivelmente multi-linguagem (monorepo). Responda SEMPRE e APENAS com JSON valido, sem cercas de codigo, sem texto extra.`;

function buildUserPrompt(summary: GraphSummary): string {
  return `Aqui esta a lista de modulos mais relevantes com suas metricas (JSON):
${JSON.stringify(summary.nodes)}

Linguagens detectadas: ${summary.languages.join(", ")}
Total de modulos: ${summary.totalNodes} | Total de dependencias: ${summary.totalEdges}

Dependencias circulares detectadas (grupos de modulos):
${JSON.stringify(summary.cycles)}

Responda APENAS em JSON, no formato exato:
{
  "summary": "resumo geral de 2-3 frases sobre a saude da arquitetura",
  "highlights": [
    { "nodeId": "caminho/do/arquivo", "type": "warning" | "core" | "isolated", "message": "explicacao curta" }
  ],
  "circularDependencyNotes": ["nota sobre cada ciclo relevante"],
  "suggestions": ["sugestoes acionaveis de refatoracao"]
}

Regras:
- "core": modulos com fan_in muito alto (espinha dorsal do projeto)
- "warning": modulos com fan_in E fan_out altos (alto acoplamento) ou em ciclos
- "isolated": modulos sem nenhuma conexao (possivel codigo morto)
- Se o projeto for multi-linguagem, comente a separacao entre ecossistemas
- Use no maximo 10 highlights, os mais relevantes
- nodeId deve ser exatamente um dos ids fornecidos`;
}

function stripJsonFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return t.trim();
}

export async function getAIInsights(
  nodes: GraphNode[],
  cycles: string[][],
  languages: Language[],
  edgeCount: number,
  options: AIInsightOptions
): Promise<Insights> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;

  if (!options.useAI || !apiKey) {
    return heuristicInsights(nodes, cycles, languages);
  }

  try {
    const summary = buildSummary(
      nodes,
      cycles,
      languages,
      edgeCount,
      options.maxNodes
    );
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: options.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(summary) }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const parsed = JSON.parse(stripJsonFences(text)) as Partial<Insights>;
    const validIds = new Set(nodes.map((n) => n.id));

    return {
      summary: parsed.summary ?? "",
      highlights: (parsed.highlights ?? [])
        .filter((h) => h && validIds.has(h.nodeId))
        .slice(0, 12),
      circularDependencyNotes: parsed.circularDependencyNotes ?? [],
      suggestions: parsed.suggestions ?? [],
      source: "ai",
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`  ! IA indisponivel (${reason}); usando heuristicas.`);
    return heuristicInsights(nodes, cycles, languages);
  }
}

/** Generates insights from metrics alone, without calling any model. */
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
        message: `Modulo central: ${n.fanIn} arquivos dependem dele. Mudancas aqui tem alto impacto.`,
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
        }. Candidato a refatoracao.`,
      });
    }
  }

  for (const n of isolated.slice(0, 4)) {
    highlights.push({
      nodeId: n.id,
      type: "isolated",
      message: "Sem dependencias de entrada ou saida. Possivel codigo morto ou ponto de entrada.",
    });
  }

  const circularDependencyNotes = cycles
    .slice(0, 10)
    .map(
      (c, i) =>
        `Ciclo ${i + 1}: ${c.slice(0, 6).join(" -> ")}${
          c.length > 6 ? " -> ..." : ""
        } (${c.length} modulos)`
    );

  const suggestions: string[] = [];
  if (cycles.length) {
    suggestions.push(
      `Quebre as ${cycles.length} dependencia(s) circular(es) extraindo interfaces ou movendo codigo compartilhado para um modulo neutro.`
    );
  }
  const topRisk = byRisk[0];
  if (topRisk && topRisk.risk >= 6) {
    suggestions.push(
      `Considere dividir "${topRisk.id}" em modulos menores e mais focados (alto acoplamento bidirecional).`
    );
  }
  if (isolated.length > 3) {
    suggestions.push(
      `Ha ${isolated.length} modulos isolados; verifique se sao codigo morto que pode ser removido.`
    );
  }
  if (!suggestions.length) {
    suggestions.push("Arquitetura saudavel: sem ciclos e acoplamento controlado.");
  }

  const langText =
    languages.length > 1
      ? `Projeto multi-linguagem (${languages.join(", ")}). `
      : "";
  const summary = `${langText}${nodes.length} modulos e ${nodes.reduce(
    (s, n) => s + n.fanOut,
    0
  )} dependencias analisadas. ${
    cycles.length
      ? `${cycles.length} dependencia(s) circular(es) detectada(s).`
      : "Nenhuma dependencia circular detectada."
  }`;

  return {
    summary,
    highlights: highlights.slice(0, 12),
    circularDependencyNotes,
    suggestions,
    source: "heuristic",
  };
}

import { heuristicInsights } from "./analyzer/heuristic";
import type { GraphNode, Insights, Language } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `Voce e um arquiteto de software senior analisando a estrutura de dependencias de um projeto, possivelmente multi-linguagem (monorepo). Responda SEMPRE e APENAS com JSON valido, sem cercas de codigo, sem texto extra.`;

interface SummaryNode {
  id: string;
  language: Language;
  category: string;
  fanIn: number;
  fanOut: number;
  loc: number;
  inCycle: boolean;
}

function buildSummary(nodes: GraphNode[], maxNodes: number): SummaryNode[] {
  const ranked = [...nodes]
    .sort((a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut))
    .slice(0, maxNodes);
  const isolated = nodes.filter((n) => n.fanIn === 0 && n.fanOut === 0).slice(0, 5);
  const map = new Map(ranked.map((n) => [n.id, n]));
  for (const n of isolated) if (!map.has(n.id)) map.set(n.id, n);
  return [...map.values()].map((n) => ({
    id: n.id,
    language: n.language,
    category: n.category,
    fanIn: n.fanIn,
    fanOut: n.fanOut,
    loc: n.loc,
    inCycle: n.inCycle,
  }));
}

function buildUserPrompt(
  summary: SummaryNode[],
  cycles: string[][],
  languages: Language[],
  totalNodes: number,
  totalEdges: number
): string {
  return `Modulos mais relevantes com metricas (JSON):
${JSON.stringify(summary)}

Linguagens: ${languages.join(", ")}
Total de modulos: ${totalNodes} | Total de dependencias: ${totalEdges}

Dependencias circulares (grupos de modulos):
${JSON.stringify(cycles.slice(0, 20))}

Responda APENAS em JSON neste formato exato:
{
  "summary": "resumo de 2-3 frases sobre a saude da arquitetura",
  "highlights": [
    { "nodeId": "caminho/do/arquivo", "type": "warning" | "core" | "isolated", "message": "explicacao curta" }
  ],
  "circularDependencyNotes": ["nota por ciclo relevante"],
  "suggestions": ["sugestoes acionaveis de refatoracao"]
}

Regras:
- "core": fan_in muito alto (espinha dorsal)
- "warning": fan_in E fan_out altos (acoplamento) ou em ciclo
- "isolated": sem conexoes (possivel codigo morto)
- Comente a separacao entre ecossistemas se multi-linguagem
- Maximo 10 highlights; nodeId deve ser exatamente um id fornecido
- Escreva em portugues do Brasil`;
}

function stripJson(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  return t.trim();
}

export async function getInsights(
  nodes: GraphNode[],
  cycles: string[][],
  languages: Language[],
  edgeCount: number,
  opts: { maxNodes?: number; apiKey?: string } = {}
): Promise<Insights> {
  const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) return heuristicInsights(nodes, cycles, languages);

  try {
    const summary = buildSummary(nodes, opts.maxNodes ?? 60);
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildUserPrompt(
              summary,
              cycles,
              languages,
              nodes.length,
              edgeCount
            ),
          },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(stripJson(text)) as Partial<Insights>;
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
  } catch {
    return heuristicInsights(nodes, cycles, languages);
  }
}

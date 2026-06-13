import { NextRequest, NextResponse } from "next/server";
import { analyzeFiles } from "@/lib/analyzer/analyze";
import { fetchRepoFiles, parseRepoInput } from "@/lib/github";
import { getInsights } from "@/lib/groq";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { input?: string; token?: string; includeTests?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const input = body.input?.trim();
  if (!input) {
    return NextResponse.json({ error: "Informe a URL do repositório." }, { status: 400 });
  }

  const repo = parseRepoInput(input);
  if (!repo) {
    return NextResponse.json(
      { error: "URL inválida. Use https://github.com/owner/repo ou owner/repo." },
      { status: 400 }
    );
  }

  const token = body.token || process.env.GITHUB_TOKEN;

  try {
    const { files, truncated, ref } = await fetchRepoFiles(repo, token);
    if (!files.length) {
      return NextResponse.json(
        { error: "Nenhum arquivo de código reconhecido neste repositório." },
        { status: 422 }
      );
    }

    const result = analyzeFiles(files, {
      includeTests: Boolean(body.includeTests),
      projectName: repo.repo,
      inputSource: `${repo.owner}/${repo.repo}@${ref}`,
      truncated,
    });

    result.insights = await getInsights(
      result.nodes,
      result.cycles,
      result.languages,
      result.edges.length
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao analisar o repositório.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

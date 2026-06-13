import { NextRequest, NextResponse } from "next/server";
import { getInsights } from "@/lib/groq";
import type { GraphNode, Language } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: {
    nodes?: GraphNode[];
    cycles?: string[][];
    languages?: Language[];
    edgeCount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  if (!Array.isArray(body.nodes)) {
    return NextResponse.json({ error: "nodes ausentes." }, { status: 400 });
  }

  const insights = await getInsights(
    body.nodes,
    body.cycles ?? [],
    body.languages ?? [],
    body.edgeCount ?? 0
  );
  return NextResponse.json(insights);
}

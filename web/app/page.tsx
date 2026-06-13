"use client";

import { useEffect, useState } from "react";
import { GraphExplorer } from "@/components/GraphExplorer";
import { Landing } from "@/components/Landing";
import { Loader } from "@/components/Loader";
import { analyzeFiles } from "@/lib/analyzer/analyze";
import { pickLocalRepo, supportsLocalPicker } from "@/lib/localFs";
import type { GraphResult } from "@/lib/types";

type View =
  | { stage: "landing" }
  | { stage: "loading"; text: string; sub?: string }
  | { stage: "explorer"; result: GraphResult };

export default function Home() {
  const [view, setView] = useState<View>({ stage: "landing" });
  const [error, setError] = useState<string | null>(null);
  const [localSupported, setLocalSupported] = useState(true);

  useEffect(() => {
    setLocalSupported(supportsLocalPicker());
  }, []);

  const analyzeGithub = async (input: string) => {
    setError(null);
    setView({ stage: "loading", text: "Analisando repositório", sub: input });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na analise.");
      setView({ stage: "explorer", result: data as GraphResult });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setView({ stage: "landing" });
    }
  };

  const pickLocal = async () => {
    setError(null);
    try {
      const repo = await pickLocalRepo();
      if (!repo) return;
      if (!repo.files.length) {
        setError("Nenhum arquivo de codigo encontrado nessa pasta.");
        return;
      }
      setView({
        stage: "loading",
        text: "Analisando pasta local",
        sub: `${repo.files.length} arquivos`,
      });

      const result = analyzeFiles(repo.files, {
        projectName: repo.projectName,
        inputSource: `local: ${repo.projectName}`,
        truncated: repo.truncated,
      });

      // enrich with AI insights (if the server has a key configured)
      try {
        const res = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: result.nodes,
            cycles: result.cycles,
            languages: result.languages,
            edgeCount: result.edges.length,
          }),
        });
        if (res.ok) result.insights = await res.json();
      } catch {
        /* keep heuristic insights */
      }

      setView({ stage: "explorer", result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao ler a pasta.";
      // user cancelling the picker throws AbortError - ignore it
      if (!/abort/i.test(msg)) setError(msg);
      if (view.stage === "loading") setView({ stage: "landing" });
    }
  };

  if (view.stage === "explorer") {
    return (
      <GraphExplorer
        result={view.result}
        onBack={() => setView({ stage: "landing" })}
      />
    );
  }

  return (
    <>
      <Landing
        onAnalyzeGithub={analyzeGithub}
        onPickLocal={pickLocal}
        error={error}
        busy={view.stage === "loading"}
        localSupported={localSupported}
      />
      {view.stage === "loading" && <Loader text={view.text} sub={view.sub} />}
    </>
  );
}

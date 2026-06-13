#!/usr/bin/env node
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import open from "open";
import { extractAll } from "./adapters/registry.js";
import { categorizeAll } from "./analysis/categorize.js";
import { getAIInsights } from "./analysis/aiInsights.js";
import { computeMetrics } from "./analysis/metrics.js";
import { mergeGraphs } from "./analysis/mergeGraphs.js";
import { resolveInput } from "./input/resolveInput.js";
import { buildGraphData } from "./render/buildGraphData.js";
import { generateReport } from "./render/generateReport.js";
import type { Language } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-6";

interface CliOptions {
  output: string;
  includeTests?: boolean;
  maxNodes: string;
  ai: boolean;
  open: boolean;
  ref?: string;
  token?: string;
  keepClone?: boolean;
  languages?: string;
  model: string;
}

const program = new Command();

program
  .name("codegraph")
  .description(
    "Gera um grafo interativo das dependencias de um repositorio (multi-linguagem) com insights de arquitetura por IA."
  )
  .argument("[input]", "caminho local OU url/owner/repo do projeto", ".")
  .option("-o, --output <file>", "caminho do HTML de saida", "./codegraph-report.html")
  .option("--include-tests", "inclui arquivos de teste na analise")
  .option("--max-nodes <n>", "limita a analise da IA aos N nos mais relevantes", "50")
  .option("--no-ai", "gera so o grafo, sem chamar a IA")
  .option("--no-open", "nao abre o navegador automaticamente")
  .option("--ref <ref>", "branch/tag/commit especifico ao clonar repo online")
  .option("--token <token>", "token para clonar repos privados (ou env GITHUB_TOKEN)")
  .option("--keep-clone", "mantem o clone temporario apos a analise (debug)")
  .option("--languages <list>", "forca analise apenas das linguagens (ex: js,python)")
  .option("--model <model>", "modelo Anthropic usado para os insights", DEFAULT_MODEL)
  .action(async (input: string, options: CliOptions) => {
    await run(input, options);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`\nErro: ${err instanceof Error ? err.message : err}`));
  process.exit(1);
});

async function run(input: string, options: CliOptions): Promise<void> {
  const start = Date.now();
  const token = options.token ?? process.env.GITHUB_TOKEN;

  console.log(chalk.bold.cyan("\n  CodeGraph"));
  console.log(chalk.dim(`  Analisando: ${input}\n`));

  // 1. resolve input (local path or clone)
  step("Resolvendo input");
  const resolved = await resolveInput(input, { ref: options.ref, token });
  if (resolved.isTemp) {
    ok(`Repo clonado em diretorio temporario`);
  } else {
    ok(`Projeto local: ${resolved.projectPath}`);
  }

  try {
    // 2. extract via adapters
    step("Detectando ecossistemas e extraindo dependencias");
    const forced = options.languages
      ? options.languages.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const { graphs, usedAdapters } = await extractAll(
      resolved.projectPath,
      { includeTests: Boolean(options.includeTests) },
      forced
    );

    if (!graphs.length) {
      throw new Error(
        "Nenhum arquivo de codigo reconhecido foi encontrado neste projeto."
      );
    }
    ok(`Adapters usados: ${usedAdapters.join(", ")}`);

    // 3. merge
    step("Mesclando grafos");
    const merged = mergeGraphs(graphs);

    // 4. categorize + 5. metrics
    categorizeAll(merged.nodes);
    const { cycles } = computeMetrics(merged.nodes, merged.edges);
    const languages = uniqueLanguages(merged.nodes);
    ok(
      `${merged.nodes.length} arquivos, ${merged.edges.length} dependencias, ${cycles.length} ciclos`
    );

    // 6. AI insights
    step(options.ai ? "Gerando insights com IA" : "Gerando insights (heuristica)");
    const insights = await getAIInsights(
      merged.nodes,
      cycles,
      languages,
      merged.edges.length,
      {
        useAI: options.ai,
        maxNodes: parseInt(options.maxNodes, 10) || 50,
        model: options.model,
        apiKey: process.env.ANTHROPIC_API_KEY,
      }
    );
    ok(`Insights gerados (${insights.source === "ai" ? "IA" : "heuristica"})`);

    // 7. build data + 8. report
    step("Gerando relatorio HTML");
    const data = buildGraphData({
      nodes: merged.nodes,
      edges: merged.edges,
      cycles,
      languages,
      insights,
      projectName: resolved.projectName,
      inputSource: resolved.source,
    });
    const outPath = await generateReport(data, options.output);
    ok(`Relatorio salvo em ${outPath}`);

    // 9. open
    if (options.open) {
      await open(outPath).catch(() => {});
    }

    // 10. summary
    printSummary({
      files: merged.nodes.length,
      edges: merged.edges.length,
      cycles: cycles.length,
      languages,
      outPath,
      elapsed: Date.now() - start,
    });
  } finally {
    // 11. cleanup temp clone
    if (resolved.isTemp && !options.keepClone) {
      await resolved.cleanup();
    } else if (resolved.isTemp && options.keepClone) {
      console.log(chalk.dim(`  Clone mantido em: ${resolved.projectPath}`));
    }
  }
}

function uniqueLanguages(nodes: { language: Language }[]): Language[] {
  return [...new Set(nodes.map((n) => n.language))].sort();
}

function step(msg: string): void {
  console.log(chalk.cyan("  > ") + msg);
}
function ok(msg: string): void {
  console.log(chalk.green("    ok ") + chalk.dim(msg));
}

function printSummary(s: {
  files: number;
  edges: number;
  cycles: number;
  languages: Language[];
  outPath: string;
  elapsed: number;
}): void {
  console.log(chalk.bold("\n  Resumo"));
  console.log(
    `  ${chalk.bold(s.files)} arquivos | ${chalk.bold(s.edges)} dependencias | ${
      s.cycles ? chalk.red.bold(s.cycles) : chalk.green.bold(0)
    } ciclos`
  );
  console.log(`  Linguagens: ${s.languages.join(", ")}`);
  console.log(`  Tempo: ${(s.elapsed / 1000).toFixed(1)}s`);
  console.log(chalk.cyan(`\n  -> ${path.basename(s.outPath)}\n`));
}

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GraphResult } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/render/generateReport.js -> package root is two levels up
const PKG_ROOT = path.resolve(__dirname, "..", "..");
const VIEWER_HTML = path.join(PKG_ROOT, "viewer", "dist", "index.html");

const DATA_PLACEHOLDER = "__CODEGRAPH_DATA__";

/** Escapes a JSON string for safe embedding inside an HTML <script> tag. */
function escapeForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export async function generateReport(
  data: GraphResult,
  outputPath: string
): Promise<string> {
  if (!existsSync(VIEWER_HTML)) {
    throw new Error(
      `Viewer nao foi buildado. Rode "npm run build:viewer" antes. (esperado em ${VIEWER_HTML})`
    );
  }

  const template = readFileSync(VIEWER_HTML, "utf8");
  if (!template.includes(DATA_PLACEHOLDER)) {
    throw new Error(
      `Placeholder ${DATA_PLACEHOLDER} nao encontrado no viewer buildado.`
    );
  }

  const json = escapeForScript(JSON.stringify(data));
  const html = template.replace(DATA_PLACEHOLDER, json);

  const absOut = path.resolve(outputPath);
  await mkdir(path.dirname(absOut), { recursive: true });
  await writeFile(absOut, html, "utf8");
  return absOut;
}

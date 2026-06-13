import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GraphResult } from "../types.js";

export async function writeJsonReport(
  data: GraphResult,
  outputPath: string
): Promise<string> {
  const abs = path.resolve(outputPath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, JSON.stringify(data, null, 2), "utf8");
  return abs;
}

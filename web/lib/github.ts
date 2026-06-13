import { Readable } from "node:stream";
import zlib from "node:zlib";
import tarStream from "tar-stream";
import type { FileEntry } from "./types";
import { IGNORED_DIR_RE, isCodeFile } from "./analyzer/languages";

export interface RepoRef {
  owner: string;
  repo: string;
  ref?: string;
}

const MAX_FILES = 4000;
const MAX_FILE_BYTES = 250_000;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

export function parseRepoInput(input: string): RepoRef | null {
  const trimmed = input.trim().replace(/\.git$/, "");

  // https://github.com/owner/repo(/tree/ref)?
  const urlMatch = trimmed.match(
    /github\.com[/:]([\w.-]+)\/([\w.-]+)(?:\/tree\/([^/]+))?/i
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], ref: urlMatch[3] };
  }

  // owner/repo shorthand
  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2] };
  }

  return null;
}

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "codegraph",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function resolveRef(
  ref: RepoRef,
  token?: string
): Promise<{ ref: string; defaultBranch: string }> {
  if (ref.ref) return { ref: ref.ref, defaultBranch: ref.ref };
  const res = await fetch(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "Repositório não encontrado (ou privado sem token)."
        : `Falha ao consultar o repositório (HTTP ${res.status}).`
    );
  }
  const data = (await res.json()) as { default_branch?: string };
  const branch = data.default_branch ?? "main";
  return { ref: branch, defaultBranch: branch };
}

export interface FetchResult {
  files: FileEntry[];
  truncated: boolean;
  ref: string;
}

export async function fetchRepoFiles(
  repo: RepoRef,
  token?: string
): Promise<FetchResult> {
  const { ref } = await resolveRef(repo, token);

  const tarUrl = `https://codeload.github.com/${repo.owner}/${repo.repo}/tar.gz/${ref}`;
  const res = await fetch(tarUrl, { headers: authHeaders(token) });
  if (!res.ok || !res.body) {
    throw new Error(`Não foi possível baixar o repositório (HTTP ${res.status}).`);
  }

  const files: FileEntry[] = [];
  let truncated = false;
  let totalBytes = 0;

  const extract = tarStream.extract();
  const gunzip = zlib.createGunzip();
  const source = Readable.fromWeb(res.body as never);

  await new Promise<void>((resolve, reject) => {
    extract.on(
      "entry",
      (header: { name: string; type: string }, stream: Readable, next: () => void) => {
        const finish = () => {
          stream.resume();
        };
        stream.on("end", next);
        stream.on("error", next);

        if (header.type !== "file") return finish();

        // strip leading "<repo>-<sha>/" segment
        const slash = header.name.indexOf("/");
        const rel = slash >= 0 ? header.name.slice(slash + 1) : header.name;

        if (
          !rel ||
          IGNORED_DIR_RE.test(rel) ||
          !isCodeFile(rel) ||
          files.length >= MAX_FILES ||
          totalBytes >= MAX_TOTAL_BYTES
        ) {
          if (files.length >= MAX_FILES) truncated = true;
          return finish();
        }

        const chunks: Buffer[] = [];
        let size = 0;
        let tooBig = false;
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_FILE_BYTES) {
            tooBig = true;
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () => {
          if (!tooBig && chunks.length) {
            const content = Buffer.concat(chunks).toString("utf8");
            totalBytes += size;
            files.push({ path: rel, content });
          }
        });
      }
    );
    extract.on("finish", resolve);
    extract.on("error", reject);
    gunzip.on("error", reject);
    source.on("error", reject);
    source.pipe(gunzip).pipe(extract);
  });

  return { files, truncated, ref };
}

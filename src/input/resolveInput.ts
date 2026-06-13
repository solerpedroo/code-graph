import { existsSync, mkdtempSync, statSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { simpleGit } from "simple-git";

export interface ResolvedInput {
  projectPath: string;
  isTemp: boolean;
  /** Original user-supplied input (url or path). */
  source: string;
  /** Friendly project name derived from the input. */
  projectName: string;
  cleanup: () => Promise<void>;
}

export interface ResolveOptions {
  ref?: string;
  token?: string;
}

const URL_RE = /^(https?:\/\/|git@)/i;
const OWNER_REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export function looksLikeRemote(input: string): boolean {
  if (URL_RE.test(input)) return true;
  // owner/repo shorthand, only if it is not an existing local path
  if (OWNER_REPO_RE.test(input) && !existsSync(input)) return true;
  return false;
}

function buildCloneUrl(input: string, token?: string): { url: string; name: string } {
  let url = input;
  let name = input;

  if (OWNER_REPO_RE.test(input) && !URL_RE.test(input)) {
    url = `https://github.com/${input}.git`;
    name = input.split("/").pop() ?? input;
  } else {
    // strip trailing .git for the name
    const cleaned = input.replace(/\.git$/, "");
    name = cleaned.split("/").pop() ?? cleaned;
  }

  if (token && url.startsWith("https://")) {
    // Inject token for private repos: https://<token>@host/...
    url = url.replace("https://", `https://${token}@`);
  }

  if (!url.endsWith(".git") && url.startsWith("https://")) {
    url = `${url}.git`;
  }

  return { url, name };
}

export async function resolveInput(
  input: string,
  options: ResolveOptions = {}
): Promise<ResolvedInput> {
  if (looksLikeRemote(input)) {
    const { url, name } = buildCloneUrl(input, options.token);
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "codegraph-"));

    const git = simpleGit();
    const cloneArgs = ["--depth", "1", "--single-branch"];
    if (options.ref) {
      cloneArgs.push("--branch", options.ref);
    }

    try {
      await git.clone(url, tmpDir, cloneArgs);
    } catch (err) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Falha ao clonar "${input}". Verifique a URL, a branch (--ref) e, para repos privados, o token (--token / GITHUB_TOKEN).\nDetalhe: ${reason}`
      );
    }

    return {
      projectPath: tmpDir,
      isTemp: true,
      source: input,
      projectName: name,
      cleanup: () => rm(tmpDir, { recursive: true, force: true }).catch(() => {}),
    };
  }

  // Local path
  const abs = path.resolve(input);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    throw new Error(`Caminho local invalido ou inexistente: ${abs}`);
  }

  return {
    projectPath: abs,
    isTemp: false,
    source: input,
    projectName: path.basename(abs),
    cleanup: async () => {},
  };
}

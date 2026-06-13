import { IGNORED_DIR_RE, isCodeFile } from "./analyzer/languages";
import type { FileEntry } from "./types";

const MAX_FILES = 4000;
const MAX_FILE_BYTES = 250_000;

interface FsDirHandle {
  name: string;
  kind: "directory";
  values(): AsyncIterable<FsDirHandle | FsFileHandle>;
}
interface FsFileHandle {
  name: string;
  kind: "file";
  getFile(): Promise<File>;
}

export function supportsLocalPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export interface LocalRepo {
  files: FileEntry[];
  projectName: string;
  truncated: boolean;
}

export async function pickLocalRepo(): Promise<LocalRepo | null> {
  if (!supportsLocalPicker()) {
    throw new Error(
      "Seu navegador não suporta seleção de pasta local. Use o Chrome, Edge ou Brave (desktop)."
    );
  }

  // @ts-expect-error - File System Access API
  const dir: FsDirHandle = await window.showDirectoryPicker();

  const files: FileEntry[] = [];
  let truncated = false;

  const walk = async (handle: FsDirHandle, prefix: string): Promise<void> => {
    for await (const entry of handle.values()) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        if (IGNORED_DIR_RE.test(`${path}/`)) continue;
        await walk(entry as FsDirHandle, path);
      } else if (isCodeFile(path) && !IGNORED_DIR_RE.test(path)) {
        try {
          const file = await (entry as FsFileHandle).getFile();
          if (file.size > MAX_FILE_BYTES) continue;
          const content = await file.text();
          files.push({ path, content });
        } catch {
          /* ignore unreadable file */
        }
      }
    }
  };

  await walk(dir, "");
  return { files, projectName: dir.name, truncated };
}

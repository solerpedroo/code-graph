"use client";

import { useState } from "react";

const EXAMPLES = [
  "expressjs/express",
  "pallets/flask",
  "gin-gonic/gin",
  "vercel/swr",
];

interface Props {
  onAnalyzeGithub: (input: string) => void;
  onPickLocal: () => void;
  error: string | null;
  busy: boolean;
  localSupported: boolean;
}

export function RepoInput({
  onAnalyzeGithub,
  onPickLocal,
  error,
  busy,
  localSupported,
}: Props) {
  const [tab, setTab] = useState<"github" | "local">("github");
  const [url, setUrl] = useState("");

  const submit = () => {
    if (url.trim()) onAnalyzeGithub(url.trim());
  };

  return (
    <div className="card">
      <div className="card__inner">
        <div className="tabs">
          <button
            className={`tab ${tab === "github" ? "tab--on" : ""}`}
            onClick={() => setTab("github")}
          >
            <GithubIcon /> Repositório GitHub
          </button>
          <button
            className={`tab ${tab === "local" ? "tab--on" : ""}`}
            onClick={() => setTab("local")}
          >
            <FolderIcon /> Pasta local
          </button>
        </div>

        {tab === "github" ? (
          <>
            <div className="field">
              <span className="field__icon">
                <LinkIcon />
              </span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="github.com/owner/repo  ou  owner/repo"
                spellCheck={false}
                autoFocus
              />
              <button
                className="btn btn--accent"
                style={{ height: 40 }}
                onClick={submit}
                disabled={busy || !url.trim()}
              >
                Analisar
              </button>
            </div>

            <div className="examples">
              <div className="examples__label">Experimente</div>
              <div className="examples__row">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    className="chip"
                    onClick={() => {
                      setUrl(ex);
                      onAnalyzeGithub(ex);
                    }}
                    disabled={busy}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="local-drop">
            <div className="local-drop__icon">
              <FolderBig />
            </div>
            <p>
              Selecione uma pasta do seu computador. A análise roda 100% no seu
              navegador &mdash; nenhum arquivo é enviado para servidores.
            </p>
            <button
              className="btn btn--accent"
              onClick={onPickLocal}
              disabled={busy || !localSupported}
            >
              <FolderIcon /> Selecionar pasta
            </button>
            {!localSupported && (
              <div className="card__hint" style={{ marginTop: 14 }}>
                Disponível no Chrome, Edge ou Brave (desktop).
              </div>
            )}
          </div>
        )}

        {error && <div className="err">{error}</div>}

        <div className="card__hint">
          <b>Dica:</b> repositórios grandes são truncados automaticamente para
          manter a visualização fluida.
        </div>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}
function FolderBig() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1" />
    </svg>
  );
}

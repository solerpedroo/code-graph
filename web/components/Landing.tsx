"use client";

import { LANGUAGE_LABELS } from "@/lib/theme";
import { BrandWordmark, LogoMark } from "./Logo";
import { RepoInput } from "./RepoInput";
import { DeveloperCredit } from "./DeveloperCredit";

const LANGS = [
  "typescript",
  "javascript",
  "python",
  "go",
  "java",
  "rust",
  "php",
  "ruby",
  "csharp",
  "kotlin",
  "swift",
  "cpp",
] as const;

interface Props {
  onAnalyzeGithub: (input: string) => void;
  onPickLocal: () => void;
  error: string | null;
  busy: boolean;
  localSupported: boolean;
}

export function Landing(props: Props) {
  return (
    <div className="landing">
      <div className="landing__bg" />
      <div className="landing__grid" />

      <nav className="nav">
        <div className="brand">
          <LogoMark />
          <BrandWordmark />
        </div>
        <div className="nav__links">
          <a
            href="https://github.com/solerpedroo"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/pedro-henrique-contardi-soler/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero__left">
          <div className="hero__eyebrow eyebrow">
            <span className="dot" />
            Arquitetura de código · visual · com IA
          </div>
          <h1 className="hero__title">
            Veja a <em>arquitetura</em> do seu código.
          </h1>
          <p className="hero__sub">
            Cole um repositório do GitHub ou abra uma pasta local e gere um mapa
            interativo das dependências &mdash; com acoplamento, dependências
            circulares e insights de arquitetura gerados por IA.
          </p>

          <div className="hero__langs">
            {LANGS.map((l) => (
              <span key={l} className="lang-pill">
                {LANGUAGE_LABELS[l]}
              </span>
            ))}
          </div>
        </div>

        <div className="hero__right">
          <RepoInput {...props} />
        </div>
      </section>

      <footer className="landing__footer">
        <DeveloperCredit />
        <span className="mono landing__footer-tech">multi-linguagem · dagre · Groq</span>
      </footer>
    </div>
  );
}

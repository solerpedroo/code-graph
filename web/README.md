# CodeGraph — Web

Visualizador interativo de arquitetura de código, com insights de IA. Analise
um repositório do GitHub (cole a URL) ou uma pasta local (direto pelo navegador,
sem upload) e explore o grafo de dependências.

## Stack

- **Next.js (App Router)** — frontend + funções serverless
- **@xyflow/react + dagre** — diagrama hierárquico de dependências (estilo ferramenta de arquitetura)
- **Groq** — insights de arquitetura por IA (com fallback heurístico)
- Analisador portável multi-linguagem (TS/JS, Python, Go, Java, Kotlin, Rust,
  PHP, Ruby, C#, Swift, Dart, Scala, C/C++)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # opcional: adicione GROQ_API_KEY
npm run dev
```

Abra http://localhost:3000.

## Deploy na Vercel

1. Importe o repositório na Vercel e defina o **Root Directory** como `web`.
2. Em *Settings → Environment Variables*, adicione:
   - `GROQ_API_KEY` (recomendado, habilita os insights de IA)
   - `GITHUB_TOKEN` (opcional, para repositórios privados / mais requisições)
3. Deploy. As rotas `/api/analyze` e `/api/insights` rodam como funções
   serverless (runtime Node.js).

## Como funciona

- **GitHub**: `/api/analyze` baixa o tarball do repositório, extrai os arquivos
  de código em memória, monta o grafo (fan-in/out, risco, ciclos via Tarjan) e
  pede os insights ao Groq.
- **Pasta local**: usa a File System Access API para ler os arquivos no próprio
  navegador; a análise roda client-side e só o resumo do grafo é enviado para
  `/api/insights` (nenhum código-fonte sai da máquina).

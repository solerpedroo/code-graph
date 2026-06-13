# CodeGraph — Web

> [Português](../README.md)

Main project app. Interactive code architecture visualizer with AI insights.
Analyze a GitHub repository (paste the URL) or a local folder (directly in the
browser, no upload) and explore the dependency graph.

For the optional JSON export CLI (automation), see the [root README](../README.en.md).

## Stack

- **Next.js (App Router)** — frontend + serverless API routes
- **@xyflow/react + dagre** — hierarchical dependency diagram (architecture-tool style)
- **Groq** — AI architecture insights (with heuristic fallback)
- Portable multi-language analyzer (TS/JS, Python, Go, Java, Kotlin, Rust,
  PHP, Ruby, C#, Swift, Dart, Scala, C/C++)

## Running locally

```bash
npm install
cp .env.example .env.local   # optional: add GROQ_API_KEY
npm run dev
```

Open http://localhost:3000.

## Deploy on Vercel

1. Import the repository on Vercel and set **Root Directory** to `web`.
2. Under *Settings → Environment Variables*, add:
   - `GROQ_API_KEY` (recommended — enables AI insights)
   - `GITHUB_TOKEN` (optional — private repos / higher rate limits)
3. Deploy. Routes `/api/analyze` and `/api/insights` run as serverless
   functions (Node.js runtime).

## How it works

- **GitHub**: `/api/analyze` downloads the repository tarball, extracts source
  files in memory, builds the graph (fan-in/out, risk, cycles via Tarjan), and
  requests insights from Groq.
- **Local folder**: uses the File System Access API to read files in the
  browser; analysis runs client-side and only a graph summary is sent to
  `/api/insights` (no source code leaves your machine).

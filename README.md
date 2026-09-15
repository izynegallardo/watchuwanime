<h1 align="center">Watchuwanime</h1>
<p align="center">A RAG-powered anime recommendation chatbot. Describe what you're in the mood for, get a recommendation grounded in a real anime dataset, not a generic LLM guess.</p>

<p align="center">
  <a href="https://watchuwanime.vercel.app/"><strong>Live Demo →</strong></a>
</p>

<p align="center">
  <img alt="Vite" src="https://img.shields.io/badge/frontend-Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="Express" src="https://img.shields.io/badge/backend-Express-000000?logo=express&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/vector%20db-Supabase%20pgvector-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## What it is

Watchuwanime asks the user a few questions about the kind of anime they want to watch, embeds that input, runs a similarity search against a real anime dataset stored in Supabase (pgvector), and passes the retrieved matches as grounded context to a chat model for a natural-language recommendation. This is the RAG pattern applied to anime discovery: retrieval keeps the recommendation tied to real titles instead of the model inventing or misremembering one.

## How it works

```
Ingestion (one-time, local script)
CSV dataset -> dedupe by mal_id -> format each row into one text chunk ->
embed locally (@huggingface/transformers, all-MiniLM-L6-v2, 384 dims) ->
insert into Supabase pgvector

Usage (live, per request)
User answers -> embed -> pgvector similarity search (top-k) ->
rerank/filter candidates -> pass as context to chat model ->
return recommendations with AI-generated summaries
```

## Repo layout

This is a two-package monorepo. Each package has its own detailed README, install steps, env setup, and scripts.

```
watchuwanime/
  backend/    Express REST API: embeddings, pgvector search, ranking, summaries -> see backend/README.md
  frontend/   Vanilla JS SPA (Vite): question flow, results, saved library -> see frontend/README.md
```

- [`backend/README.md`](backend/README.md) - API routes, environment variables, migrations, ingestion scripts, testing
- [`frontend/README.md`](frontend/README.md) - SPA architecture, routing, component conventions, state management

## Tech stack

| Layer            | Technology                                                             |
| ---------------- | ---------------------------------------------------------------------- |
| Frontend         | Vite, vanilla JavaScript (no framework), CSS Modules                   |
| Backend          | Node.js (ESM), Express 5                                               |
| Vector database  | Supabase (Postgres + pgvector)                                         |
| Embeddings       | `@huggingface/transformers`, local, `all-MiniLM-L6-v2`, 384 dimensions |
| Chat generation  | OpenAI-compatible client (OpenRouter/Groq-style free-tier models)      |
| Validation       | Zod                                                                    |
| Testing          | Jest, Supertest                                                        |
| Frontend hosting | Vercel                                                                 |
| Backend hosting  | Render                                                                 |

## Getting started

Clone the repo, then set up each package separately:

```bash
git clone https://github.com/izynegallardo/watchuwanime.git
cd watchuwanime
```

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend (in a separate terminal):

```bash
cd frontend
npm install
npm run dev
```

See each package's README for required environment variables, migrations, and dataset ingestion before running against a real database.

## Deployment

| Piece     | Where                      | Notes                                                                    |
| --------- | -------------------------- | ------------------------------------------------------------------------ |
| Frontend  | Vercel                     | Static build from `frontend/`                                            |
| Backend   | Render                     | Free tier; keep-alive job pings `/health`-style route to avoid spin-down |
| Vector DB | Supabase                   | Hosted Postgres + pgvector                                               |
| Chat API  | OpenAI-compatible provider | API calls only, no hosting needed                                        |

## License

MIT © 2026 Izyne Howie Gallardo — see [LICENSE](./LICENSE) for details.

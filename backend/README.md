# Watchuwanime: Backend

Express REST API powering a RAG-based anime recommendation app. A user answers a
few mood/availability questions; the backend embeds their answers, retrieves
candidate anime from a Supabase pgvector store, filters/reranks them, and
returns personalized recommendations with an AI-generated reason for each.

## Stack

- Express 5
- Supabase (Postgres + pgvector) - vector similarity search
- `@huggingface/transformers` - local embeddings (`all-MiniLM-L6-v2`, 384 dims)
- OpenAI SDK
- Zod for request validation
- Jest + Supertest for testing

## Getting Started

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your production Supabase project's credentials and connection
string, then create the schema:

```bash
npm run migrate:prod
```

Ingest the dataset (embeds every row locally, inserts via Supabase):

```bash
npm run ingest:prod
```

Start the server:

```bash
npm run dev
```

## Project Structure

```
index.js                # Entry point - loads env, starts the server
src/
  app.js                # Builds the Express app (no .listen - used by tests too)
  core/                 # Client setup (Supabase, Postgres pool, OpenAI)
  routes/v1/            # Route definitions
  controllers/v1/       # Request handlers
  models/               # Supabase queries (anime search, ingestion insert)
  middlewares/          # authorization (apikey), rate limiting
  schemas/              # Zod request validation schemas
  services/             # embedding, chat (AI summaries), ranking (MMR rerank)
  utils/                # Helpers (error formatting, etc.)
  data/                 # Source dataset (CSV) for ingestion
migrations/             # SQL schema + match_anime() function, applied in order
scripts/
  ingest.js             # One-time/local: embeds the CSV and inserts into Supabase
  migrate.js            # Applies migrations/*.sql to whichever DB is configured
```

## Environment Files

This project runs against three separate database targets, selected by which
env file is loaded (`DOTENV_PATH`). Never point anything except `migrate:prod`
/ `ingest:prod` / `dev` at the production file.

| File                 | Target                                   | Committed? |
| -------------------- | ---------------------------------------- | ---------- |
| `.env.example`       | Template for `.env`                      | Yes        |
| `.env`               | Production Supabase                      | No         |
| `.env.dev.example`   | Template for `.env.dev`                  | Yes        |
| `.env.dev`           | Test Supabase (a separate cloud project) | No         |
| `.env.local.example` | Template for `.env.test`                 | Yes        |
| `.env.local`         | Local Postgres, used only by Jest        | No         |

**Why three targets:** ingestion and the live app talk to Supabase through
`supabase-js`, which requires Supabase's PostgREST layer in front of the
database - that doesn't exist on a bare local Postgres install. Local Postgres
is only used for tests, connected to directly via `pg`, bypassing PostgREST
entirely. `.env` and `.env.dev` don't need `DB_HOST`/`DB_USER`/etc. at all -
once `DATABASE_URL` is set, the Postgres pool config ignores them.

| Variable                                                  | Needed in          | Used by                                                                                              |
| --------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `SUPABASE_PROJECT_URL`, `SUPABASE_API_KEY`                | `.env`, `.env.dev` | `core/supabase.js` (runtime queries)                                                                 |
| `DATABASE_URL`                                            | `.env`, `.env.dev` | `scripts/migrate.js` (raw SQL against Supabase's Postgres)                                           |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | `.env.test` only   | `core/database.js` (local Postgres pool)                                                             |
| `AI_API_BASE_URL`, `AI_API_KEY`, `AI_CHAT_MODEL`          | `.env`, `.env.dev` | `core/openai.js` (personalized summaries)                                                            |
| `API_KEY`                                                 | all three          | `middlewares/authorization.js`, and read directly in `animeRouter.mock.test.js`                      |
| `FRONTEND_URLS`                                           | all three          | `app.js` CORS allowlist - read at import time, so it must always be set or importing `app.js` throws |
| `API_PORT`                                                | `.env`, `.env.dev` | server listen port (unused by tests, since Supertest never calls `.listen()`)                        |

## Scripts

| Command                 | Target                                       |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Live server → production Supabase            |
| `npm run dev:test`      | Live server → test Supabase                  |
| `npm test`              | Jest → local Postgres                        |
| `npm run test:supabase` | Jest → test Supabase                         |
| `npm run migrate:local` | Apply schema → local Postgres                |
| `npm run migrate:test`  | Apply schema → test Supabase                 |
| `npm run migrate:prod`  | Apply schema → production Supabase           |
| `npm run ingest:test`   | Embed + insert dataset → test Supabase       |
| `npm run ingest:prod`   | Embed + insert dataset → production Supabase |

`migrate.js` tracks what's already been applied in a `schema_migrations` table,
so re-running it is safe - it only runs files it hasn't seen before.

## Testing

Two kinds of tests live side by side:

- **Mocked tests** (`*.mock.test.js`) - no real database; `models/anime.js`,
  `services/embedding.js`, and `services/chat.js` are replaced with
  `jest.unstable_mockModule`. Fast, safe to run anytime, exercises validation,
  the authorization middleware, and response shaping.
- **Integration tests** (`*.integration.test.js`) - connect directly to
  Postgres via `pg` (`core/database.js`) and run the real
  `migrations/*.sql` against it, verifying the schema and `match_anime()`'s
  scoring/threshold/exclusion logic. This intentionally bypasses `supabase-js`,
  since it can't run against bare Postgres without PostgREST.

Before running tests for the first time, set up `.env.test` (copy from
`.env.test.example`) against a local Postgres instance, then run:

```bash
npm run migrate:local
```

Run everything:

```bash
npm test
```

Run a specific file:

```bash
npm test -- ranking.test
```

## API

Base path: `/api/v1`

| Method | Path               | Auth required         |
| ------ | ------------------ | --------------------- |
| GET    | `/`                | No                    |
| POST   | `/anime/recommend` | Yes (`apikey` header) |

**POST `/anime/recommend`**

```json
{
    "answers": [{ "genres": ["Action"], "answer": "Something intense and short" }],
    "timeAvailable": 60,
    "excludeIds": []
}
```

Returns up to 10 recommendations, each within `timeAvailable` minutes,
diversity-reranked via MMR so near-duplicate matches (sequels, specials, or
anything the user named directly) don't crowd out variety, with a
personalized `summary` (AI-generated) and the raw `synopsis` from the dataset.

```json
{
    "success": true,
    "recommendations": [
        {
            "id": 42,
            "title": "Re:Zero kara Hajimeru Isekai Seikatsu",
            "titleEnglish": "Re:ZERO -Starting Life in Another World-",
            "type": "TV",
            "year": 2016,
            "genres": ["Drama", "Fantasy", "Psychological", "Thriller"],
            "episodes": 25,
            "durationMinutes": 24,
            "rating": "R - 17+ (violence & profanity)",
            "status": "Finished Airing",
            "imageUrl": "https://example.com/rezero.jpg",
            "summary": "Since you're drawn to stories where mistakes have real consequences, this follows Subaru as he's forced to relive his failures until he actually learns from them.",
            "synopsis": "Natsuki Subaru, a completely ordinary high school student, is on his way home from the convenience store when he finds himself transported to another world..."
        }
    ]
}
```

On a validation failure (missing/invalid `answers` or `timeAvailable`), `responseError` returns a `400` with `{ "success": false, "message": "..." }` instead.

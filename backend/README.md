# Watchuwanime: Backend

Express REST API powering a RAG-based anime recommendation app. The backend
embeds user answers, performs a pgvector similarity search via Supabase,
reranks/filter candidates, and returns recommendations with AI-generated
summaries.

## What lives here

- Entry: [backend/index.js](backend/index.js#L1)
- App: [backend/src/app.js](backend/src/app.js#L1) (Express app, used by tests)
- DB clients: [backend/src/core/database.js](backend/src/core/database.js#L1)
  and [backend/src/core/supabase.js](backend/src/core/supabase.js#L1)
- AI client helper: [backend/src/core/openai.js](backend/src/core/openai.js#L1)
- Migrations: [backend/migrations/](backend/migrations)
- Scripts: [backend/scripts/migrate.js](backend/scripts/migrate.js#L1)
  and [backend/scripts/ingest.js](backend/scripts/ingest.js#L1)

## Stack

- Node.js (ESM) + Express 5
- Supabase / Postgres (+ pgvector)
- `@huggingface/transformers` (local embedding fallback)
- OpenAI SDK for summaries
- Zod for validation
- Jest + Supertest for tests

## Quick start

Install deps:

```bash
npm install
```

Copy or create the env file you need. The project uses `DOTENV_PATH` to
select which env file to load (see "Environment" below).

Start in development (uses `.env.dev` by default):

```bash
npm run dev
```

Start using the production env file (`.env`):

```bash
npm start
```

## Environment

This backend selects which `.env` to load with the `DOTENV_PATH` environment
variable. The project ships scripts that set `DOTENV_PATH` for common targets
(`.env.local`, `.env.dev`, `.env`).

Required runtime variables (minimum):

- `FRONTEND_URLS` - comma-separated list of allowed origins (used by CORS in
  [backend/src/app.js](backend/src/app.js#L1)). This must be set at import time.
- Either `DATABASE_URL` (preferred for Supabase deployments) or local DB
  vars: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (used by
  [backend/src/core/database.js](backend/src/core/database.js#L1)).
- `SUPABASE_URL` and `SUPABASE_API_KEY` - required when talking to Supabase
  via `@supabase/supabase-js` ([backend/src/core/supabase.js](backend/src/core/supabase.js#L1)).
- `AI_API_KEY` (and optionally `AI_API_BASE_URL`) - required for the OpenAI
  client used to generate summaries ([backend/src/core/openai.js](backend/src/core/openai.js#L1)).
- `API_PORT` - optional (defaults to `3000`); the server uses this in
  [backend/index.js](backend/index.js#L1).

Notes:

- Tests and local runs intentionally use different env files to avoid
  accidentally pointing tests or local ingestion at production.
- `migrate.js` and `ingest.js` expect to be run against the DB targeted by
  the selected env file.

## Scripts (what the repository actually exposes)

All commands set `DOTENV_PATH` internally where appropriate. Important ones:

- `npm run dev` - runs the server with `DOTENV_PATH=.env.dev` (nodemon)
- `npm start` - runs the server with `DOTENV_PATH=.env`
- `npm test` - runs Jest with `DOTENV_PATH=.env.local` (local Postgres)
- `npm run test:supabase` - runs Jest with `DOTENV_PATH=.env.dev` (cloud test project)
- `npm run migrate:local` - apply migrations with `DOTENV_PATH=.env.local`
- `npm run migrate:dev` - apply migrations with `DOTENV_PATH=.env.dev`
- `npm run migrate:prod` - apply migrations with `DOTENV_PATH=.env`
- `npm run ingest:local` - run `scripts/ingest.js` with `DOTENV_PATH=.env.local`
- `npm run ingest:dev` - run `scripts/ingest.js` with `DOTENV_PATH=.env.dev`
- `npm run ingest:prod` - run `scripts/ingest.js` with `DOTENV_PATH=.env`

Example - apply migrations for your local test DB:

```bash
npm run migrate:local
```

Example - ingest dataset into the target Supabase project:

```bash
npm run ingest:dev
```

`migrate.js` reads SQL files from [backend/migrations](backend/migrations) in
sorted order and runs them against the configured database. When running
against a bare local Postgres (used for fast Jest integration tests) the
script omits policy-related migration files that only apply to Supabase.

## Testing

There are two classes of tests:

- Mocked unit tests (`*.mock.test.js`) - no DB; modules are mocked with
  `jest.unstable_mockModule`.
- Integration tests (`*.integration.test.js`) - run against a real Postgres
  instance (the tests use the same `backend/src/core/database.js` client).

Run tests (local Postgres target):

```bash
npm test
```

Run tests against the cloud test Supabase project (if configured):

```bash
npm run test:supabase
```

If running integration tests for the first time, prepare a local Postgres
instance and apply migrations:

```bash
npm run migrate:local
```

## API

Base path: `/api/v1` (see [backend/src/routes/v1](backend/src/routes/v1))

Routes:

- `GET /api/v1/` - ping the server
- `POST /api/v1/anime/recommend` - requires API key (authorization middleware)

Example request body for `POST /api/v1/anime/recommend`:

```json
{
    "answers": [{ "genres": ["Action"], "answer": "Something intense and short" }],
    "timeAvailable": 60,
    "excludeIds": []
}
```

Response shape: `{ success: boolean, recommendations: [...] }`. Each
recommendation contains basic anime metadata plus `summary` (AI-generated)
and `synopsis` (from the dataset).

## Tips

- Keep `FRONTEND_URLS` set to the frontend origins before importing the app
  (it's parsed at module import). If you see import-time failures, check that
  variable first.
- Don't run `migrate:prod` or `ingest:prod` until you've validated env values.

## Files to inspect

- [backend/index.js](backend/index.js#L1)
- [backend/src/app.js](backend/src/app.js#L1)
- [backend/src/core/supabase.js](backend/src/core/supabase.js#L1)
- [backend/scripts/migrate.js](backend/scripts/migrate.js#L1)

If you'd like, I can run the test suite or add a short example `.env.dev`
template next.

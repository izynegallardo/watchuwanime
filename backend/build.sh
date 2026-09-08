#!/usr/bin/env bash
set -euo pipefail

# Run from wherever this script lives (backend/), so relative
# paths (docker-compose.yml, package.json) always resolve.
cd "$(dirname "$0")"

echo "Building and starting local stack (psql + backend)..."
docker compose up --build -d

echo "Waiting for psql to report healthy..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' backend-psql-1 2>/dev/null)" = "healthy" ]; do
    echo "  still waiting..."
    sleep 2
done
echo "psql is healthy."

echo "Running migrations against local Postgres..."
npm run migrate:local

echo "Ingesting dataset into local Postgres..."
npm run ingest:local

echo ""
echo "Done. Backend running at http://localhost:3000"
echo "Tail logs with: docker compose logs -f backend"

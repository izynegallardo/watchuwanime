#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Building and starting local stack (psql + backend)..."

docker compose --env-file .env.local down
docker compose --env-file .env.local up --build -d

echo "Waiting for psql to report healthy..."

POSTGRES_CONTAINER=$(docker compose --env-file .env.local ps -q psql)

until [ "$(docker inspect -f '{{.State.Health.Status}}' "$POSTGRES_CONTAINER" 2>/dev/null)" = "healthy" ]; do
    echo "  still waiting..."
    sleep 2
done

echo "psql is healthy."

while true; do
    echo ""
    echo "What would you like to run?"
    echo ""
    echo "  1) Start only"
    echo "  2) Migrate"
    echo "  3) Migrate + Ingest"
    echo "  4) Ingest only"
    echo ""

    read -rp "Choose [1-4]: " choice

    case "$choice" in
        1)
            echo ""
            echo "Skipping migration and ingest."
            break
            ;;

        2)
            echo ""
            echo "Running migrations against local Postgres..."
            docker compose --env-file .env.local exec -e DOTENV_PATH=.env.local backend node scripts/migrate.js
            break
            ;;

        3)
            echo ""
            echo "Running migrations against local Postgres..."
            docker compose --env-file .env.local exec -e DOTENV_PATH=.env.local backend node scripts/migrate.js

            echo ""
            echo "Ingesting dataset into local Postgres..."
            docker compose --env-file .env.local exec -e DOTENV_PATH=.env.local backend node scripts/ingest.js
            break
            ;;

        4)
            echo ""
            echo "Ingesting dataset into local Postgres..."
            docker compose --env-file .env.local exec -e DOTENV_PATH=.env.local backend node scripts/ingest.js
            break
            ;;

        *)
            echo ""
            echo "Invalid choice: $choice"
            echo "Please choose 1, 2, 3, or 4."
            ;;
    esac
done

echo ""
echo "Done. Backend running at http://localhost:3000/api/v1"
echo "Tail logs with: docker compose logs -f backend"
echo "Use database with: docker exec -it watchuwanime-psql-1 psql -U watchuwanime -d watchuwanimedb"
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing environment file at $ENV_FILE"
  exit 1
fi

# Load environment variables from .env.local
set -a
source "$ENV_FILE"
set +a

if [ ! -d "supabase" ]; then
  echo "Initializing Supabase"
  npx supabase init
fi

echo "Starting local Supabase"
npx supabase start

echo "Linking to main Supabase"
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "Pulling schema"
npx supabase db pull

echo "Resetting local Supabase with new schema"
npx supabase db reset

echo "Local test Supabase ready"


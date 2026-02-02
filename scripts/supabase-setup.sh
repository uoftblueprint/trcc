#!/bin/bash
set -e

if [ ! -d "supabase" ]; then
  echo "Initializing Supabase"
  npx supabase init
fi

echo "Starting local Supabase"
npx supabase start

echo "Applying migrations"
if ! npx supabase migration up; then
  npx supabase db pull
  npx supabase db reset
  npx supabase migration up
fi

echo "Dump local Supabase env variables"
npx supabase status -o env >> .env

echo "Local Supabase ready (migrations applied)"

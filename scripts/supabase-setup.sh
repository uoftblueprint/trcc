#!/bin/bash
set -e

if [ ! -d "supabase" ]; then
  echo "Initializing Supabase"
  npx supabase init
fi

echo "Starting local Supabase"
npx supabase start

echo "Dump local Supabase env variables"
npx supabase status -o env >> .env

echo "Local test Supabase ready"


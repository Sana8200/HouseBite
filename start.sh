#!/bin/bash
set -e

echo "Starting Supabase..."
supabase start

echo "Starting edge functions..."
supabase functions serve --env-file supabase/functions/.env &

echo "Starting web..."
docker-compose up --build

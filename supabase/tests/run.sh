#!/usr/bin/env bash
# Apply stub + migrations + seed to a fresh database and run the RLS scenarios.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${DB:-northem_test}
psql -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
for f in tests/supabase_stub.sql migrations/*.sql seed.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 | grep -vE 'wal_level|HINT' || true
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -o /dev/null -f tests/rls_test.sql 2>&1 | sed -E 's/^psql:[^ ]+ //; s/^NOTICE:  //'

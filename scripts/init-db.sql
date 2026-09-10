-- Runs automatically on first boot of an empty Postgres data directory
-- (via /docker-entrypoint-initdb.d). For hosted Postgres (Supabase/Neon/RDS)
-- run this once by hand, or keep it as the first line of the Drizzle migration.
CREATE EXTENSION IF NOT EXISTS vector;

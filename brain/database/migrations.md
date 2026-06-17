# Database Migrations

## Purpose
Tracks notable migrations and migration strategy.

## Current Notes
- Migration sources live under `packages/db`.
- Recent work includes foundations for document-platform and payment/resolution system migrations.
- Local development now includes a Docker MySQL flow via `apps/www/docker-compose.yml`.
- The helper script `scripts/mysql-xampp-to-docker.sh` dumps the legacy local MySQL/XAMPP database and imports it into the Docker MySQL container on port `3307`.
- `packages/db/scripts/sync-prod-to-local.ts` supports duplicate-key recovery for local sync runs with `--on-duplicate prompt|ignore|reset|cancel`; the default `sync:prod-to-local` package script runs with `--on-duplicate prompt`. Interactive runs show an arrow-key chooser to skip the failed table, reset only the failed local table and fully reimport it, or cancel; non-interactive prompt mode cancels deterministically.
- The duplicate-key reset path is local-target only after connection safety checks, deletes rows from the failed table with foreign-key checks temporarily disabled, clears that table cursor, and retries the table without the default initial cursor floor so the local table is restored from the full source table.

## TODO
- Add a migration history summary with timestamps, intent, rollout notes, and any backfill requirements.

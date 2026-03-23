# Database Migrations

## Purpose
Tracks notable migrations and migration strategy.

## Current Notes
- Migration sources live under `packages/db`.
- Recent work includes foundations for document-platform and payment/resolution system migrations.
- Local development now includes a Docker MySQL flow via `apps/www/docker-compose.yml`.
- The helper script `scripts/mysql-xampp-to-docker.sh` dumps the legacy local MySQL/XAMPP database and imports it into the Docker MySQL container on port `3307`.

## TODO
- Add a migration history summary with timestamps, intent, rollout notes, and any backfill requirements.

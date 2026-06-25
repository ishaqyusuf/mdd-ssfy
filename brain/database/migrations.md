# Database Migrations

## Purpose
Tracks notable migrations and migration strategy.

## Current Notes
- Migration sources live under `packages/db`.
- Recent work includes foundations for document-platform and payment/resolution system migrations.
- Local development now includes a Docker MySQL flow via `apps/www/docker-compose.yml`.
- The helper script `scripts/mysql-xampp-to-docker.sh` dumps the legacy local MySQL/XAMPP database and imports it into the Docker MySQL container on port `3307`; `full`/`import` reset the Docker `gnd-prisma2` database before loading the dump.
- Root dev entry points (`bun run dev`, `bun run www`, `bun run dealership`, `bun run jobs`, and related scripts) run `dev:prepare`, which starts the Docker MySQL/Redis services through `scripts/start-dev-services.sh` before Turbo starts app workspaces.
- On 2026-06-18 the local XAMPP `gnd-prisma2` database was cloned into Docker MySQL on `127.0.0.1:3307`. `prisma migrate dev` reached the Docker DB but stopped on drift because resetting would discard the cloned data; `prisma migrate status` and `prisma migrate deploy` reported 100 migrations and no pending migrations. Prisma CLI startup hung under the machine's default Node 25, so the successful checks used Node 22 directly.
- `packages/db/scripts/sync-prod-to-local.ts` supports duplicate-key recovery for local sync runs with `--on-duplicate prompt|ignore|reset|cancel`; the default root and package command is `db:sync`, running with `--on-duplicate prompt`. Interactive runs show an arrow-key chooser to skip the failed table, reset only the failed local table and fully reimport it, or cancel; non-interactive prompt mode cancels deterministically.
- The duplicate-key reset path is local-target only after connection safety checks, deletes rows from the failed table with foreign-key checks temporarily disabled, clears that table cursor, and retries the table without the default initial cursor floor so the local table is restored from the full source table.
- 2026-06-22 LinePricing decimal price fix: `LinePricing` price snapshot fields were changed from `Int?` to `Float?` in Prisma so inventory-backed sales cost/sales snapshots preserve cents. Required commands were run/attempted:
  - `bun run db:migrate` hit Turbo's non-terminal UI guard.
  - `bun run --cwd packages/db db-migrate` reached `prisma migrate dev` but stopped on existing local drift and requested a full reset of `gnd-prisma2`; reset was not run.
  - `bun run db:push` hit Turbo's non-terminal UI guard.
  - `bun run --cwd packages/db push` reached the configured production push target and stopped on an unrelated `DealerAuthAccount` unique-constraint data-loss warning; `--accept-data-loss` was not used.
  - Local `prisma db push` also stopped on pre-existing broad LongText -> Json drift warnings. To validate the opened local order without accepting unrelated data-loss warnings, only the local `LinePricing` price columns were altered to `DOUBLE`, and Prisma client generation was rerun.

## TODO
- Add a migration history summary with timestamps, intent, rollout notes, and any backfill requirements.

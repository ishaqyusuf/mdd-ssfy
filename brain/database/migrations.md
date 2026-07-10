# Database Migrations

## Purpose
Tracks notable migrations and migration strategy.

## Current Notes
- Migration sources live under `packages/db`.
- Recent work includes foundations for document-platform and payment/resolution system migrations.
- Local development now uses explicit DB/Redis profiles through `scripts/dev.ts`. `bun run dev` and `bun run dev --local` default to local Docker MySQL plus local Docker Redis; `bun run dev --remote-dev` uses the hosted dev DB plus remote dev Redis; `bun run dev --prod` runs the production-env www smoke flow on port 3005. Dev profiles accept `--filter`, `--f`, `-f`, or `-filter` selectors using Turbo selector syntax directly, including suffix `!` exclusion normalization such as `@gnd/api!` -> `!@gnd/api`. Exact package filters are validated against workspace package names and print the valid package list when a requested package is missing; bare exact package names such as `api` and `site!` resolve to matching workspace packages; graph/glob/path/range selectors pass through to Turbo. Mixed local/remote infra remains available through `dev:local-db:remote-redis`, `dev:remote-db:local-redis`, or the service-only `dev:services:local*` commands.
- `scripts/start-dev-services.sh` is mode-aware: it starts Docker MySQL only for a local DB profile and Docker Redis only for a local Redis profile. Remote DB/Redis profiles skip Docker services. `db:docker:up` is restored as a compatibility alias for local MySQL plus Redis, and `db:docker:down` stops the local compose stack.
- The local service starter recovers a MySQL container stuck on `Invalid pid in unix socket lock file` by recreating only the MySQL service container once while preserving the named Docker data volume.
- Dev infra env keys are `GND_DB_MODE=remote-dev|local`, `GND_REDIS_MODE=remote-dev|local`, `REMOTE_DEV_DATABASE_URL`, `LOCAL_DATABASE_URL`, `REMOTE_DEV_REDIS_URL` or remote-dev Upstash REST vars, `LOCAL_REDIS_URL`, and `GND_CACHE_NAMESPACE`. Remote dev Redis uses `GND_CACHE_NAMESPACE=dev`; local Redis uses `local`; production remains `prod`.
- Production sync targets are explicit: `db:sync:remote-dev(:dry-run)` and `db:sync:local(:dry-run)`. Remote-dev writes require `GND_ALLOW_REMOTE_DEV_DB_SYNC=1`, source-equals-target is always refused, local targets remain local-only, and cursor state is stored separately by target mode.
- Historical note: on 2026-06-18 the local XAMPP `gnd-prisma2` database was cloned into Docker MySQL on `127.0.0.1:3307`. `prisma migrate dev` reached the Docker DB but stopped on drift because resetting would discard the cloned data; `prisma migrate status` and `prisma migrate deploy` reported 100 migrations and no pending migrations. Prisma CLI startup hung under the machine's default Node 25, so the successful checks used Node 22 directly.
- `packages/db/scripts/sync-prod-to-local.ts` supports duplicate-key recovery for local sync runs with `--on-duplicate prompt|ignore|reset|cancel`; the default root and package command is `db:sync`, running with `--on-duplicate prompt`. Interactive runs show an arrow-key chooser to skip the failed table, reset only the failed local table and fully reimport it, or cancel; non-interactive prompt mode cancels deterministically.
- The duplicate-key reset path is local-target only after connection safety checks, deletes rows from the failed table with foreign-key checks temporarily disabled, clears that table cursor, and retries the table without the default initial cursor floor so the local table is restored from the full source table.
- 2026-06-22 LinePricing decimal price fix: `LinePricing` price snapshot fields were changed from `Int?` to `Float?` in Prisma so inventory-backed sales cost/sales snapshots preserve cents. Required commands were run/attempted:
  - `bun run db:migrate` hit Turbo's non-terminal UI guard.
  - `bun run --cwd packages/db db-migrate` reached `prisma migrate dev` but stopped on existing local drift and requested a full reset of `gnd-prisma2`; reset was not run.
  - `bun run db:push` hit Turbo's non-terminal UI guard.
  - `bun run --cwd packages/db push` reached the configured production push target and stopped on an unrelated `DealerAuthAccount` unique-constraint data-loss warning; `--accept-data-loss` was not used.
  - Local `prisma db push` also stopped on pre-existing broad LongText -> Json drift warnings. To validate the opened local order without accepting unrelated data-loss warnings, only the local `LinePricing` price columns were altered to `DOUBLE`, and Prisma client generation was rerun.
- 2026-07-08 web bug reporting schema addition:
  - Added `packages/db/src/schema/bug-reports.prisma` with `BugReportStatus`, `BugReport`, and `BugReportFollowUp`.
  - `bun run db:generate` completed and regenerated Prisma Client.
  - `TURBO_UI=true bun run db:migrate` reached Prisma but failed with `P1001` because local MySQL at `127.0.0.1:3307` was not reachable.
  - `TURBO_UI=true bun run db:push` reached Prisma but failed with `P1001` because the configured push target `aws.connect.psdb.cloud:3306` was not reachable from this environment.
  - Follow-up on 2026-07-08: `bun run --cwd packages/db db:generate` and `bun run --cwd packages/db with-env prisma validate` passed, confirming the schema is valid and Prisma Client can be generated.
  - Follow-up migration/status/apply checks still failed: `bun run --cwd packages/db db-migrate`, `bun run --cwd packages/db with-env prisma migrate dev --name web-bug-reporting`, `bun run --cwd packages/db with-env prisma migrate status`, and `bun run --cwd packages/db with-env prisma db push` all reached the local datasource and then exited with `Schema engine error`.
  - Direct MySQL checks against `127.0.0.1:3307` also failed with `ERROR 2002`, so the old local database/engine environment could not apply the schema.
  - Docker recovery attempt on 2026-07-08: `docker compose -f apps/www/docker-compose.yml restart mysql` hung and was cancelled, Docker Desktop was quit and reopened, `docker desktop start` reported Docker Desktop already running, but `docker info` still could not connect to `unix:///Users/M1PRO/.docker/run/docker.sock`.
  - Follow-up on 2026-07-08: local development was pointed at the hosted dev database branch in `.env.local`, and the dev service script was changed so the hosted branch no longer requires Docker MySQL startup.
  - The schema still needs to be migrated/applied in the intended database environment before the web bug reporting runtime can persist reports.
- 2026-07-09 sales email delivery ledger schema addition:
  - Added `packages/db/src/schema/sales-email-attempts.prisma` with `SalesEmailAttemptStatus` and `SalesEmailAttempt`.
  - Added `Users.sentSalesEmailAttempts` and `Users.salesRepEmailAttempts` relation arrays.
  - `bun --cwd packages/db db:generate` passed after adding the self-relation `NoAction` referential action required by Prisma/MySQL.
  - `bun prisma.ts` passed from `packages/jobs`, regenerating `packages/jobs/src/schema.prisma`.
  - No database migration or `db push` was applied in this implementation pass; the schema still needs to be migrated/applied in the intended database environment before the sales email ledger can persist attempts at runtime.
- 2026-07-09 sales email ledger local jobs follow-up:
  - The local jobs error was caused by `packages/jobs` loading `DATABASE_URL` directly through `dotenv-cli`, which resolved to the stale local MySQL target even though root development mode was `GND_DB_MODE=remote-dev`.
  - `packages/db` and `packages/jobs` dev `with-env` scripts now run through `scripts/with-dev-infra.ts`, so package-level Prisma/jobs commands load root env plus package env and resolve `DATABASE_URL` from `GND_DB_MODE`.
  - `bun run --cwd packages/db with-env prisma migrate status` against hosted dev still reports the configured historical migration files as unapplied, so `migrate dev/deploy` is not safe for that target without a separate migration-history reconciliation.
  - `bun run --cwd packages/db with-env prisma migrate diff --from-schema-datasource src/schema --to-schema-datamodel src/schema --script` returned an empty migration for hosted dev, and `bun run --cwd packages/jobs with-env bun -e 'db.salesEmailAttempt.count()'` confirmed the `SalesEmailAttempt` table is reachable there.
  - `bun run --cwd packages/db db:generate` passed, and `bun --cwd packages/jobs prisma.ts` regenerated the jobs schema.

## TODO
- Add a migration history summary with timestamps, intent, rollout notes, and any backfill requirements.

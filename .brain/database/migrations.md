# Database Migrations

## Purpose
Tracks notable migrations and migration strategy.

## Prisma Migration Workflow
- For Prisma schema or database updates, use the repository scripts and Prisma workflow instead of manually creating migration files.
- If root scripts for `db:migrate` and `db:push` exist, run `bun db:migrate` and `bun db:push` after Prisma schema/database changes; in this repository, prefer the documented root forms `bun run db:migrate` and `bun run db:push` when invoking package scripts through Bun.
- Keep migration, push, and generate commands aligned with the root `package.json` and `packages/db` scripts.
- If the configured database is unavailable or drift blocks migration, record the exact limitation here rather than forcing a reset or data-destructive action.

## Current Notes
- 2026-07-22 Sales Customer direct dealership invitations:
  - Prisma-generated additive SQL lives at
    `packages/db/src/migrations/20260722150000_dealer_customer_direct_partnership_invitations/migration.sql`.
  - It adds invitation source/delivery/provider/sender/revocation/supersession
    fields, the `DealerRecruitmentCustomerState` lease table, and supporting
    indexes. Existing invitations default to sales-banner source; historical
    delivered rows are backfilled to `SENT` with `deliveryAttemptedAt` copied
    from `deliveredAt`.
  - `bun run db:generate` passed. `prisma migrate dev` reached local MySQL but
    refused broad pre-existing drift and requested a destructive reset; the
    reset was not accepted.
  - Prisma generated the SQL by diffing the live local datasource to the target
    datamodel. The additive file was applied directly to local `gnd-prisma2`,
    direct package `prisma db push` reported the database already in sync, a
    follow-up live-schema diff reported no difference, and a Prisma read smoke
    accessed both the invitation source and lease models.
  - `_prisma_migrations` was not rewritten. Reconcile the repository's older
    dealership-table migration gap before using migration-based deployment in
    another environment.
  - The datasource uses `relationMode = "prisma"`; therefore the generated SQL
    intentionally creates relation indexes without database foreign-key
    constraints, matching the rest of this Prisma-managed relationship mode.
- 2026-07-19 dealership program expansion:
  - Added `packages/db/src/schema/dealer-program.prisma` and
    `Customers.officeVisibility`.
  - `bun run db:generate` completed successfully.
  - `bun run db:migrate` first hit Turbo's non-terminal UI guard;
    `TURBO_UI=true bun run db:migrate` reached Prisma but failed with `P1001`
    against local MySQL at `127.0.0.1:3307`.
  - Docker reported `gnd-mysql` healthy and the host port listening; a direct
    `mysqladmin` probe reached MySQL but required credentials. No destructive
    reset or manually-authored migration was used.
  - Apply the schema in the intended environment and restart long-running app
    processes before final database-backed browser QA.
- Migration sources live under `packages/db`.
- Recent work includes foundations for document-platform and payment/resolution system migrations.
- Local development now uses explicit DB/Redis profiles through the shared `../../local-infra-kit` GND profile. `bun run dev` and `bun run dev --local` default to local Docker MySQL only; `bun run dev --remote-dev` uses the hosted dev DB only; `bun run dev --prod` runs the production-env www smoke flow on port 3015. Redis is opt-in for local and remote-dev profiles with `--redis-local`, `--redis-remote`, or `--redis-remote-dev`, so `bun run dev --local --redis-local` uses local MySQL with local Docker Redis, `bun run dev --local --redis-remote` uses local MySQL with remote-dev Redis, and `bun run dev --remote-dev --redis-local` uses the hosted dev DB with local Docker Redis. Dev profiles accept `--filter`, `--f`, `-f`, or `-filter` selectors using Turbo selector syntax directly, including suffix `!` exclusion normalization such as `@gnd/api!` -> `!@gnd/api`. Exact package filters are validated against workspace package names and print the valid package list when a requested package is missing; bare exact package names such as `api` and `site!` resolve to matching workspace packages; graph/glob/path/range selectors pass through to Turbo. Mixed local/remote infra also remains available through `dev:local-db:remote-redis`, `dev:remote-db:local-redis`, or the service-only `dev:services:local*` commands.
- `../../local-infra-kit/bin/dev-services.ts --profile gnd` is mode-aware: it starts Docker MySQL only for a local DB profile and Docker Redis only when `GND_REDIS_MODE=local` is explicitly set by `--redis-local` or the service-only `dev:services:local-redis` script. Remote DB/Redis profiles skip Docker services. `db:docker:up` is a compatibility alias for local MySQL only, and `db:docker:down` stops the local compose stack.
- The local service starter recovers a MySQL container stuck on `Invalid pid in unix socket lock file` by recreating only the MySQL service container once while preserving the named Docker data volume.
- Dev infra uses the shared `../../local-infra-kit` GND profile and only publishes `DATABASE_URL` as the application database URL by default. Local values live in `.env.local`, hosted dev values live in ignored `.env.remote.local`, and production values live in `.env.production`. Redis remains independently selectable with `--redis-local`, `--redis-remote`, or `--redis-remote-dev` and uses `REDIS_URL` plus optional `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` only when a Redis flag is passed.
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
- 2026-07-20 sales shelf decimal migration:
  - Prisma generated
    `packages/db/src/migrations/20260720081100_sales_shelf_decimal_prices`
    from a clean repository clone against an isolated scratch database.
  - The migration converts `DykeSalesShelfItem.unitPrice` and `totalPrice`
    directly from `Int` to nullable `Decimal(12,2)`; no table reset, delete,
    copy, or value rewrite is used.
  - The real development database was read-only during validation. Its
    pre-migration baseline was 366 rows, 4 unit-price nulls, 0 total-price
    nulls, unit min/max/sum `0 / 636 / 34010`, and total min/max/sum
    `0 / 1379 / 58749`.
  - Isolated pre/post validation retained row count `2`, unit null count `1`,
    total null count `0`, and identical min/max/sums while converting
    `12 → 12.00` and `24 → 24.00`.
  - A post-migration Prisma update/reload preserved `12.34` and `24.68`.
  - `bun run db:migrate` against the ordinary development database was not
    forced because Prisma detected unrelated existing drift and proposed a
    destructive reset. The generated migration was not applied to the real
    database in this task.
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
  - 2026-07-17 expanded bug reporting schema follow-up:
    - Added `BugReportCaptureType` for video vs screenshot evidence.
    - Added `BugReportTranscriptionStatus` and follow-up voice-note fields: `audioDocumentId`, `audioDurationMs`, `transcriptionStatus`, `transcriptionText`, and `transcriptionProvider`.
    - Added optional external issue tracking fields to `BugReport`: `externalIssueProvider`, `externalIssueKey`, `externalIssueUrl`, `externalIssueStatus`, `externalIssueError`, and `externalIssueCreatedAt`.
    - Added indexes on `BugReportFollowUp.audioDocumentId` and `[transcriptionStatus, createdAt]`.
    - Added indexes on `[externalIssueProvider, externalIssueKey]` and `[externalIssueStatus, createdAt]`.
    - `bun --cwd packages/db db:generate` passed.
    - `bun --cwd packages/db with-env prisma validate` passed with the repository's existing `relationMode = "prisma"` warnings.
    - 2026-07-17 local runtime apply follow-up: direct information-schema checks showed `BugReport` and `BugReportFollowUp` were missing from local `gnd-prisma2` even though `prisma migrate status` reported the migration history as up to date.
    - A broad `bun --cwd packages/db with-env prisma db push` was attempted without `--accept-data-loss` and correctly stopped on unrelated legacy LongText -> Json drift plus an unrelated `DealerAuthAccount` uniqueness warning; `--accept-data-loss` was not used.
    - To unblock local bug-report runtime smoke without touching unrelated legacy tables, only `BugReport` and `BugReportFollowUp` were created manually in local `gnd-prisma2` from the current Prisma model shape, including capture/transcription enums and indexes. Follow-up information-schema checks confirmed all expected bug-report columns exist.
    - A local API-query smoke using Super Admin user `1` created and hydrated a screenshot bug report with one follow-up, then removed the smoke `BugReport`, `BugReportFollowUp`, and `StoredDocument` rows; cleanup verification found no `bug-reports/1/codex-smoke.png` stored document left behind.
    - No migration file or broad DB push was applied in this pass; apply these schema changes through the intended database migration/deploy workflow before relying on screenshot/audio persistence outside the local dev DB.
- 2026-07-09 sales email delivery ledger schema addition:
  - Added `packages/db/src/schema/sales-email-attempts.prisma` with `SalesEmailAttemptStatus` and `SalesEmailAttempt`.
  - Added `Users.sentSalesEmailAttempts` and `Users.salesRepEmailAttempts` relation arrays.
  - `bun --cwd packages/db db:generate` passed after adding the self-relation `NoAction` referential action required by Prisma/MySQL.
  - `bun prisma.ts` passed from `packages/jobs`, regenerating `packages/jobs/src/schema.prisma`.
  - No database migration or `db push` was applied in this implementation pass; the schema still needs to be migrated/applied in the intended database environment before the sales email ledger can persist attempts at runtime.
  - 2026-07-17 local runtime follow-up: `SalesEmailAttempt` was still absent from local `gnd-prisma2`. Applied only the current model's table and indexes through targeted idempotent SQL because broad `db push` included unrelated legacy drift. Prisma create/delete smoke passed and left no test row behind. No `_prisma_migrations` metadata was changed.
- 2026-07-09 sales email ledger local jobs follow-up:
  - The local jobs error was caused by `packages/jobs` loading `DATABASE_URL` directly through `dotenv-cli`, which resolved to the stale local MySQL target instead of the intended hosted dev target.
  - `packages/db` and `packages/jobs` dev `with-env` scripts now run through the shared `../../local-infra-kit` GND profile, so package-level Prisma/jobs commands load root env plus package env and resolve the active `DATABASE_URL` from the selected profile.
  - `bun run --cwd packages/db with-env prisma migrate status` against hosted dev still reports the configured historical migration files as unapplied, so `migrate dev/deploy` is not safe for that target without a separate migration-history reconciliation.
  - `bun run --cwd packages/db with-env prisma migrate diff --from-schema-datasource src/schema --to-schema-datamodel src/schema --script` returned an empty migration for hosted dev, and `bun run --cwd packages/jobs with-env bun -e 'db.salesEmailAttempt.count()'` confirmed the `SalesEmailAttempt` table is reachable there.
  - `bun run --cwd packages/db db:generate` passed, and `bun --cwd packages/jobs prisma.ts` regenerated the jobs schema.
- 2026-07-13 generic task-run diagnostics ledger schema addition:
  - Added `packages/db/src/schema/task-run-diagnostics.prisma` with `TaskRunDiagnosticStatus` and `TaskRunDiagnostic`.
  - Added `Users.taskRunDiagnosticsStarted` and `Users.taskRunDiagnosticsReviewed` relation arrays.
  - `bun run db:generate` completed and regenerated Prisma Client.
  - `bun run db:migrate` first hit Turbo's non-terminal UI guard; `bun run db:migrate --ui=tui` reached Prisma but failed with `P3014` because the hosted PlanetScale/Vitess target cannot create a shadow database (`VT12001: unsupported: create database by failDBDDL`).
  - Root `bun run db:push` does not exist in this repository.
  - `bun --filter @gnd/db push:dev` completed successfully against the configured hosted dev database and regenerated Prisma Client.
  - No manual migration file was created in this pass, matching the current repository workflow guidance.
  - 2026-07-17 local runtime follow-up: `TaskRunDiagnostic` was still absent from local `gnd-prisma2`. Applied only the current model's table, unique run-id index, and declared query indexes through targeted idempotent SQL because broad `db push` included unrelated legacy drift. Prisma create/delete smoke passed and left no test row behind. No `_prisma_migrations` metadata was changed.
- 2026-07-15 sales payment review queue schema addition:
  - Added nullable/default review fields to `SalesPayments`: `origin`, `reviewStatus`, `reviewedAt`, `reviewedById`, `reviewMethod`, `reviewedByAction`, and `reviewNote`.
  - Added queue indexes `SalesPayments_orderId_reviewStatus_createdAt_idx` and `SalesPayments_reviewStatus_createdAt_idx`.
  - Backfilled missing `NoteChannels.inAppSupport` values for `sales_checkout_success`, `sales_payment_recorded`, and `sales_customer_payment_received` so payment notifications can appear in the notification center when older channel seed rows had null support flags.
  - Added migration `packages/db/src/schema/migrations/20260715120000_add_sales_payment_review/migration.sql`.
  - `bun run db:generate` completed.
  - `bun run with-env prisma migrate dev --name add_sales_payment_review --create-only` from `packages/db` reached local MySQL but stopped on existing local drift and requested resetting `gnd-prisma2`; reset was not run.
  - For local browser QA only, the migration SQL was applied directly to local `gnd-prisma2` with MySQL CLI. The committed migration remains the source artifact for normal environments.
- 2026-07-16 sales payment review queue reset:
  - Removed Prisma defaults from `SalesPayments.origin` and `SalesPayments.reviewStatus` so future schema pushes do not default unknown/legacy writes into the review queue.
  - Added migration `packages/db/src/schema/migrations/20260716130000_clear_sales_payment_review_default/migration.sql`, which clears current `reviewStatus = 'needs_review'` rows to null and drops the database defaults for `origin` and `reviewStatus`.
  - Applied the same repair manually to the current/local profile: `744` active `needs_review` rows were set to `NULL`, and both `origin` and `reviewStatus` defaults now report `NULL`.
  - Applied the same repair manually to production by user request: `8,372` total `needs_review` payment rows were set to `NULL` (`8,344` active rows in the before/after status count), and both `origin` and `reviewStatus` defaults now report `NULL`.
  - `bun --cwd packages/db with-env prisma validate` and `bun --cwd packages/db db:generate` passed after the schema update.
- 2026-07-15 master password login audit schema addition:
  - Added `packages/db/src/schema/master-password-login-audits.prisma` with `MasterPasswordLoginPlatform` and `MasterPasswordLoginAudit`.
  - Added `Users.masterPasswordLoginAudits` and `Users.clearedMasterPasswordAudits` relation arrays.
  - Added migration `packages/db/src/schema/migrations/20260715133000_add_master_password_login_audits/migration.sql`.
  - Follow-up required: run `bun run db:generate` and apply/push the migration in the intended database environment.
  - 2026-07-17 local runtime repair: direct auth login produced Prisma `P2021` because local `gnd-prisma2` did not have `MasterPasswordLoginAudit` even though the generated client included the model.
  - Applied only `packages/db/src/schema/migrations/20260715133000_add_master_password_login_audits/migration.sql` directly to local MySQL `127.0.0.1:3307/gnd-prisma2` with the MySQL client to unblock local master-password login audit writes.
  - Verified `MasterPasswordLoginAudit` and indexes exist, then ran a Prisma smoke that created, read, and deleted a `db.masterPasswordLoginAudit` row successfully.
  - `prisma migrate resolve --applied 20260715133000_add_master_password_login_audits` failed with `P3017` because the current Prisma config resolves migration metadata from `src/migrations` while this repository stores this SQL under `src/schema/migrations`; `prisma migrate status` still reports the configured migration set as up to date. No manual `_prisma_migrations` metadata row was inserted.
  - 2026-07-17 country follow-up added nullable `countryCode VARCHAR(2)` through `packages/db/src/schema/migrations/20260717120000_add_master_password_login_country_code/migration.sql`.
  - `bun --cwd packages/db db-migrate` refused the existing local drift/reset and `bun --cwd packages/db push:dev` refused unrelated legacy JSON conversions and a `DealerAuthAccount` uniqueness change without `--accept-data-loss`; neither broad operation was forced.
  - Applied only the additive `countryCode` column to local `gnd-prisma2`, verified its information-schema shape, and ran a Super Admin API smoke that created/listed/archived/hid/deleted a disposable `NG` audit row. A live non-Super Admin query was also rejected with `FORBIDDEN`.
- 2026-07-22 master password usage audit extension:
  - Added `MasterPasswordUsageType` (`LOGIN | SALES_REP_TRANSFER`) and nullable `requestId`, `resourceType`, and `resourceId` fields to `MasterPasswordLoginAudit`; existing rows read as `LOGIN` through the additive default.
  - Added usage/date and resource-reference indexes in `packages/db/src/migrations/20260722180000_master_password_usage_audit/migration.sql`; no credential value or hash is persisted and no data backfill is required.
  - `bun run db:generate` passed. Normal `migrate dev` stopped on pre-existing local drift that requested a reset, and `push:dev` stopped on unrelated storefront data-loss warnings; neither unsafe operation was forced.
  - Generated the isolated additive SQL with Prisma schema diff, applied only that migration to local `gnd-prisma2` for browser QA, and verified the four columns and indexes. Production remains untouched pending normal deployment.

## TODO
- Add a migration history summary with timestamps, intent, rollout notes, and any backfill requirements.
## 20260720130000_storefront_ecommerce_replacement

- Adds nullable `SalesOrders.salesChannel`.
- Adds Storefront Category, Offer, Component, Step Policy, Offer Component
  Policy, Commerce Collection/Line, Checkout, Page/Section, Audit Event,
  Password Reset Token, and Inquiry tables with supporting indexes and foreign
  keys.
- Existing business data is not dropped or rewritten by this migration.
- `bun run db:generate` passed.
- Full `prisma migrate deploy` of all 102 migrations passed against isolated
  MySQL database `gnd_storefront_verify`.
- Normal local `migrate dev` stopped on pre-existing drift that requested a
  reset. Normal `db push` stopped on unrelated LongText-to-JSON conversions and
  a dealer uniqueness warning. Neither reset nor `--accept-data-loss` was used.
- The user confirmed on 2026-07-20 that the resulting schema was safely pushed
  to both development and production. This confirmation clears schema
  deployment as a storefront release gate; traffic cutover and transactional
  checkout rehearsal remain separate gates.

## 2026-07-22 storefront custom millwork inquiry workflow

- Prisma schema adds inquiry draft/office statuses, unique references and quote
  links, structured briefs, conversion lease fields, submission/activity dates,
  an atomic private-upload authorization count, and
  `StorefrontInquiryActivity`.
- `bun run db:generate` passed.
- `prisma migrate dev --name storefront_custom_millwork_workflow` could not
  generate a migration because unrelated existing migration
  `20260722180000_master_password_usage_audit` fails against the shadow database
  by updating `MasterPasswordLoginAudit` before that table exists.
- Local `gnd-prisma2` was synchronized with `prisma db push
  --accept-data-loss`; the warning was limited to adding unique constraints for
  nullable `reference` and `salesQuoteId`. The push succeeded and generated the
  client. A second local push after the upload authorization counter was added
  also completed successfully. No production database was changed.

## 20260723143000_storefront_product_aware_shipping

- Adds shipping approval/quote status enums, versioned
  `StorefrontShippingPolicy`, revisioned `StorefrontShippingQuote`, and the
  optional unique `StorefrontCheckout.shippingQuoteId` relation.
- Policy mappings and quote calculations are JSON evidence; monetary, route,
  and weight totals use explicit Decimal columns for indexed/auditable values.
- Existing checkouts and orders require no backfill. Calculated shipping is not
  activated until an admin publishes an enabled active policy.
- `bun run db:generate` and local `db push --accept-data-loss` passed.
- Normal `prisma migrate dev` replay remains blocked by the pre-existing
  `20260722180000_master_password_usage_audit` shadow-database ordering failure
  because that migration references `MasterPasswordLoginAudit` before the
  table exists in the shadow history. No reset was performed and no production
  database was changed.

## 2026-07-24 storefront profile pricing and promotions

- Prisma schema adds `StorefrontPromotionAudienceMode`,
  `StorefrontPromotionScopeMode`, `StorefrontPromotion`, and normalized
  category, offer, customer, and customer-profile target tables.
- Existing product, customer, and Sales data requires no backfill. Campaigns
  are inert until an authorized employee publishes an active schedule.
- `bun run db:generate` passed.
- Escalated `prisma migrate dev --name
  storefront_profile_pricing_promotions --create-only` connected to local
  MySQL but failed with `P3006/P3018` while replaying pre-existing migration
  `20260722180000_master_password_usage_audit`; that migration attempts to
  update `MasterPasswordLoginAudit` before the table exists in the configured
  shadow history.
- Local `bun run push:dev` then synchronized disposable `gnd-prisma2` and
  regenerated Prisma Client, enabling browser QA. No `--accept-data-loss` flag
  was required.
- On 2026-07-24, a read-only production diff showed only five additive table
  creates (`StorefrontPromotion` plus the four normalized target tables) and
  their indexes. It contained no drops, column rewrites, uniqueness changes,
  or data-loss operations.
- `bun run --cwd packages/db push:prod` then synchronized production database
  `gndprodesk`; Prisma Client generation completed. A second read-only
  production diff returned an empty migration.
- No migration file was fabricated. Normal migration generation remains
  blocked by the pre-existing shadow-history defect, but the production
  datamodel is synchronized.

## 2026-07-23 sales document WhatsApp/SMS delivery

- No schema or migration was required.
- Reusable links/clicks use existing `ShortLink` rows, email provider attempts
  remain in `SalesEmailAttempt`, and WhatsApp/SMS channel outcomes use existing
  notification activity/tag storage.
- No migration, `db push`, sync, or database write command was run for this
  feature.

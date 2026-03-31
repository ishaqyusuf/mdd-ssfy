# PlanetScale to Supabase Migration Checklist

Date: 2026-03-31
Owner: Platform / Data Migration
Scope: Migrate the primary application database from PlanetScale MySQL to Supabase Postgres while preserving current app behavior.

## Objective
Cut the app over from PlanetScale to Supabase with Prisma retained as the primary ORM in phase 1, then evaluate optional Supabase-native adoption only after the database migration is stable.

## Assumptions
- Phase 1 scope is database migration only: PlanetScale MySQL to Supabase Postgres.
- Prisma remains the canonical application data-access layer during the initial cutover.
- `packages/db/src/schema/schema.prisma` is the current schema source and still targets MySQL.
- Existing staging/local migration experiments such as `apps/www/db.load` are valid starting points, but must be formalized before production use.
- Supabase Auth, Storage, Realtime, and RLS are not part of the first cut unless separately approved.
- A short production write freeze or controlled cutover window is acceptable.

## 1) Migration Boundary and Inventory

- [ ] Confirm phase-1 target: `PlanetScale MySQL -> Supabase Postgres`, with no auth/storage migration bundled in.
- [ ] Inventory all Prisma entry points across `apps/*`, `packages/*`, and jobs/background flows.
- [ ] Inventory all raw SQL, CLI scripts, imports, exports, and DB-specific utilities.
- [ ] Identify MySQL-specific schema assumptions: `autoincrement()`, timestamp defaults, JSON, bigint, collation, and null/default behavior.
- [ ] Identify PlanetScale-specific runtime assumptions such as `pscale` environment checks and operational scripts.
- [ ] Record the migration owner, freeze policy, rollback owner, and cutover approval gate.

Validation gate:
- One written inventory exists covering schema owners, critical tables, raw SQL risks, and production cutover stakeholders.

## 2) Target Architecture Freeze

- [ ] Approve Prisma as the phase-1 ORM/runtime contract after the Supabase cutover.
- [ ] Approve Supabase Postgres as the new system of record.
- [ ] Decide whether Prisma migrations remain canonical or whether Supabase SQL becomes the migration source of truth.
- [ ] Standardize the environment contract for `DATABASE_URL`, `DIRECT_URL`, and any shadow DB requirements.
- [ ] Define environment topology for local, staging, and production Supabase projects.
- [ ] Document whether `relationMode = "prisma"` remains temporary or should be removed as real foreign keys are restored.

Validation gate:
- A written architecture decision exists for ORM ownership, migration source of truth, and connection strategy.

## 3) Prisma Schema Conversion

- [ ] Update `packages/db/src/schema/schema.prisma` datasource from `mysql` to `postgresql`.
- [ ] Review model field annotations and translate MySQL-specific native types to Postgres-safe Prisma types.
- [ ] Audit all defaults and timestamp columns for Postgres compatibility.
- [ ] Audit JSON and bigint usage for serialization/runtime parity.
- [ ] Review unique/index behavior for case sensitivity and text length differences between MySQL and Postgres.
- [ ] Reconcile migration-path ownership between `packages/db/src/migrations` and `packages/db/src/schema/migrations`.
- [ ] Run `prisma validate` and `prisma generate` successfully against the converted schema.

Validation gate:
- Prisma schema validates cleanly and generates a client against a fresh Postgres database without manual patching.

## 4) Repeatable Data Migration Rehearsal

- [ ] Formalize the MySQL-to-Postgres load workflow currently hinted by `apps/www/db.load`.
- [ ] Create a repeatable export/import process from a recent PlanetScale snapshot to local Postgres.
- [ ] Rehearse the same import flow into Supabase staging.
- [ ] Add normalization steps for timestamps, booleans, JSON, bigint ranges, null/default mismatches, and orphaned rows.
- [ ] Create parity checks for critical tables using row counts and targeted aggregate comparisons.
- [ ] Capture import runtime, failure modes, and remediation steps.

Validation gate:
- A full rehearsal completes in non-prod with row-count parity and no unresolved critical data mismatches.

## 5) Application Compatibility Hardening

- [ ] Remove or update PlanetScale-specific runtime/UI assumptions such as `apps/www/src/app/layout.tsx` production DB detection.
- [ ] Update env validation in app packages to accept the Supabase/Postgres connection contract.
- [ ] Audit server actions, tRPC routes, and jobs for MySQL-specific behavior or raw SQL assumptions.
- [ ] Audit schema-heavy domains for compatibility: employee management, payment system, document platform, production, and auth/session flows.
- [ ] Ensure local scripts, DB push/pull flows, and developer setup instructions work with Postgres.
- [ ] Define any temporary compatibility shims needed to keep current behavior stable during rollout.

Validation gate:
- The app boots, reads, and writes successfully against Supabase staging without PlanetScale-specific breakage.

## 6) Staging Cutover and Verification

- [ ] Provision a staging Supabase project using the approved environment contract.
- [ ] Apply schema and import realistic staging data.
- [ ] Point the full staging runtime at Supabase.
- [ ] Run core smoke flows: login/session, employee management, sales, payments, documents, notifications, and jobs.
- [ ] Review query performance and add missing indexes revealed by Postgres execution plans.
- [ ] Record all staging mismatches and close them before production approval.

Validation gate:
- Staging signoff is complete and all high-severity defects are resolved or explicitly waived.

## 7) Production Cutover Preparation

- [ ] Define the exact production cutover sequence and rollback sequence.
- [ ] Confirm write-freeze duration, final backup/export procedure, and communication plan.
- [ ] Prepare production environment variable changes and secret rotation steps.
- [ ] Prepare post-cutover smoke checklist and named on-call owners for the first hour.
- [ ] Define rollback triggers based on error rate, data integrity, and unavailable core workflows.

Validation gate:
- A production runbook exists with exact commands, owners, timings, and rollback thresholds.

## 8) Production Cutover

- [ ] Enter the approved write freeze or controlled cutover window.
- [ ] Take the final PlanetScale snapshot/export.
- [ ] Import the final dataset into Supabase production.
- [ ] Apply any post-import fixes, indexes, or validation scripts.
- [ ] Switch production env vars and deploy the Supabase-backed runtime.
- [ ] Run immediate production smoke tests before reopening writes.

Validation gate:
- Core production read/write flows pass and no rollback threshold has been triggered.

## 9) Stabilization

- [ ] Monitor application errors, slow queries, connection usage, and data-integrity alerts after cutover.
- [ ] Compare key business totals and row counts between pre-cutover and post-cutover checkpoints.
- [ ] Resolve any post-cutover schema/index/performance issues.
- [ ] Keep PlanetScale fallback available through the agreed observation window.
- [ ] Close the migration only after the observation window passes cleanly.

Validation gate:
- The observation window completes without critical regressions or unresolved data divergence.

## 10) Optional Phase 2: Supabase-Native Adoption

- [ ] Decide whether Supabase Auth should replace current auth/session flows.
- [ ] Decide whether document/file flows should move to Supabase Storage.
- [ ] Evaluate whether any table groups should adopt RLS.
- [ ] Evaluate Realtime or SQL function usage only where there is clear product value.
- [ ] Track each Supabase-native adoption as a separate feature/ADR instead of bundling it into the DB cutover.

Validation gate:
- No Supabase-native feature is adopted without its own scoped plan, rollout, and rollback path.

## References

- `packages/db/src/schema/schema.prisma`
- `packages/db/prisma.config.ts`
- `apps/www/db.load`
- `apps/www/src/app/layout.tsx`
- `brain/database/schema.md`
- `brain/tasks/backlog.md`

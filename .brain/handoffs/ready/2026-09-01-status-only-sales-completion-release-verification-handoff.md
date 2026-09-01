# Brain Handoff: Status-only Sales Completion Release Verification

## Status

Ready

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Source Ticket

`.scratch/status-only-sales-completion/issues/07-complete-exhaustive-acceptance-and-release-verification.md`

## Goal

Prove the complete five-ticket Status-only Sales Completion release against all
23 specification scenarios, repository-wide validation, local migration safety,
authenticated runtime behavior, and final Brain/release reconciliation.

## Review Unit

- Type: stack-item
- Depends On: `2026-09-01-gnd-completion-projections-queues-reporting`
- Approval Boundary: Approve only when every scenario has direct evidence,
  feature-related failures are fixed, all queue items are approved, and any
  unrelated baseline failure is isolated without masking affected-scope health.

## Required Work

1. Create `.brain/reports/2026-09-01-status-only-sales-completion-release-verification.md`
   with a requirement/scenario 1-23 evidence matrix.
2. Audit existing automated coverage and add direct tests for any scenario that
   is represented only indirectly.
3. Discover and run root/workspace tests, root typecheck, relevant builds,
   lint/format validation, and clean-tree/diff checks. Record unrelated baseline
   failures precisely and rerun every affected scope after fixes.
4. Run local-only Prisma generate/migrate/push verification under repository
   database safeguards. Never target preview or production and never accept
   destructive reset/data-loss operations.
5. Exercise authorized and unauthorized Production/Fulfillment mark/cancel,
   Full workflow default, duplicate/stale/recent-order/history/queue/report, and
   operational-non-effect flows in the authenticated browser/runtime.
6. Reconcile feature, API, permission, database, migration, ADR, task, progress,
   handoff, review, and release documentation. Move the parent feature to done
   only after review and landing.

## Required Checks

- All commands exposed by the root and affected workspace test scripts.
- `bun run typecheck`, affected builds, lint/format, and `git diff --check`.
- Local `bun run db:generate`, `db:migrate`, and `db:push` validation, respecting
  printed target fingerprints and refusing non-local or destructive operations.
- Authenticated browser QA for permission variants and both milestones/methods.

## Boundaries

- Do not weaken assertions or skip a feature failure.
- Do not write preview or production databases.
- Do not infer release completion from narrow tests alone.
- Preserve all unrelated concurrent workspace changes.

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-status-only-sales-completion-release-verification.json`

## Completion Notes

- Evidence report: `.brain/reports/2026-09-01-status-only-sales-completion-release-verification.md`; all 23 scenarios have direct evidence.
- Commands/checks: 134 focused tests / 702 assertions; Sales/DB/Utils typechecks; scoped permission Biome + 3 tests / 9 assertions + typecheck; root/workspace test commands; root/affected typechecks; broad build/lint; local Prisma generate/migrate/push; diff integrity.
- Runtime/browser proof: authenticated Pablo Cruz session; Production order `09535DB` and Fulfillment order `09541AD`; Full default, warnings, provenance, cancellation presentation, operational non-effects, and exact audited cleanup verified.
- Baselines: repository-wide test, API test, typecheck, lint, and build baselines are isolated in the report; no Status-only completion failure remains.
- Brain docs: feature, plan, API endpoints/contracts/permissions, database migrations, task/progress, handoff, report, and final review records reconciled. ADR-081, schema, and relationships remain accurate without semantic edits.

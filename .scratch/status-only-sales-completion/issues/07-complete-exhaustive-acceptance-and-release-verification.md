# Complete exhaustive acceptance and release verification

Type: validation
Status: ready-for-agent
Label: ready-for-agent
Blocked by: [`06-unify-completion-projections-queues-and-reporting.md`](06-unify-completion-projections-queues-and-reporting.md)
Parent: [`../map.md`](../map.md)
Source specification: [`../spec.md`](../spec.md)

## Outcome

The complete Status-only sales completion feature is proven against every
acceptance scenario, all relevant existing behavior, the full available test
suite, browser/runtime workflows, migration safety, permissions, concurrency,
auditability, reporting, and Brain/release documentation.

## Deliverables

1. Build a requirement-to-evidence matrix for all specification sections and
   scenarios 1-23; add or strengthen tests wherever evidence is indirect.
2. Run every repository test exposed by the root/workspace test commands, all
   relevant package-specific suites, full typecheck, narrow and broad builds,
   lint/format checks, migration generation/apply/push validation against local
   development only, and diff/working-tree checks.
3. Exercise authorized and unauthorized Production/Fulfillment mark, cancel,
   duplicate, stale, concurrent, recent-order warning, history, queue, report,
   and operational-evidence browser flows on representative orders.
4. Fix every feature-related failure and rerun the complete applicable matrix.
   Record unrelated baseline failures with evidence but do not use them to hide
   a feature failure.
5. Reconcile all required Brain feature, API, permission, database, migration,
   ADR, task, progress, handoff, review, and release records.

## Acceptance criteria

- Every specification requirement and scenario has direct passing evidence.
- Full repository tests and typecheck/build commands pass, or any genuinely
  unrelated pre-existing baseline failure is isolated and documented with the
  feature-specific affected scope fully green.
- Browser/runtime proof covers both completion methods, both milestones,
  permissions, cancellation, provenance, and operational non-effects.
- No selected ticket remains queued, started, submitted, fix-requested, landing,
  or blocked after review; every queue item reaches approved.

## Required checks

- All root and workspace test commands discovered from package scripts.
- `bun run typecheck`, relevant full builds, lint/format, and `git diff --check`.
- Local-only Prisma generate/migrate/push and migration verification under the
  repository's database command rules; no preview/production write.
- Authenticated browser QA across the affected Sales surfaces and role variants.

## Boundaries

- Do not skip a failing feature test or weaken an assertion to make it green.
- Do not write Preview or Production databases.
- Do not mark completion from narrow tests when broader evidence is required.


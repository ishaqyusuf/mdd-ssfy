# Brain Handoff: Status-only Production Completion

## Status

Ready

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Source Ticket

`.scratch/status-only-sales-completion/issues/03-ship-status-only-production-completion-end-to-end.md`

## Task

- Task Title: Ship Status-only Production Completion end to end
- Task File: `.brain/tasks/in-progress.md`

## Recommended Agent

- Agent: open-code
- Reason: This slice is schema, migration, permission, domain, API, concurrency,
  and test heavy; its UI is bounded to an existing Sales completion surface.

## Goal

Deliver the complete Status-only Production Completion vertical slice while
preserving Full workflow behavior and every operational evidence authority.

## Review Unit

- Type: stack-item
- Linked Tasks: Ship Status-only Production Completion end to end
- Grouping Reason: None
- Depends On Queue Items: None
- Approval Boundary: Approve only after the complete Production slice is
  implemented, reviewed, landed, and validated; partial schema, API, or UI work
  is not independently approvable.

## Context To Read First

- `AGENTS.md`
- `CONTEXT.md`
- `.brain/plans/2026-09-01-feature-status-only-sales-completion.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`
- `.brain/features/status-only-sales-completion.md`
- `.brain/api/contracts.md`
- `.brain/api/permissions.md`
- `.brain/database/schema.md`
- `.brain/database/relationships.md`
- `.brain/database/migrations.md`
- `.scratch/status-only-sales-completion/spec.md`
- `.scratch/status-only-sales-completion/issues/03-ship-status-only-production-completion-end-to-end.md`
- `packages/db/src/schema/sales.prisma`
- `packages/db/src/schema/schema.prisma`
- `packages/utils/src/constants.ts`
- `apps/dashboard/src/actions/get-role-form.ts`
- Existing Sales Mark As domain, router, menu, history, and tests located from
  the source ticket and repository search.

## Implementation Instructions

1. Add the additive `SalesCompletionRecord` schema, bounded enums/contracts,
   order/actor relations, indexes, and database-backed active-record uniqueness.
2. Generate/apply the migration only through the repository commands and only
   against local development. Do not write Preview or Production.
3. Add the `StatusOnlySalesCompletion` permission resource and exact persisted
   view/edit rows without a single-row normalization exception.
4. Build the shared completion-domain foundation and normalized Production
   completion projection. Keep operational Production truth separate from
   administrative completion satisfaction.
5. Implement authenticated transactional mark/cancel commands, audit evidence,
   effective/recorded dates, idempotency, concurrency safety, and distinct
   permission/transition/stale/persistence errors.
6. Integrate the existing confirmation surface with Full workflow selected by
   default, deliberate Status-only selection, warning/skipped-effects copy,
   provenance/history, and permission-aware cancellation.
7. Add direct tests for every Ticket 03 acceptance criterion and confirm no
   operational side-effect model is written.
8. Keep Ticket 04 Fulfillment behavior out of this review unit except for
   schema/domain shapes required to avoid a destructive follow-up migration.

## Acceptance Criteria

- Every acceptance criterion and required check in Ticket 03 passes.
- Specification scenarios 1, 4-7, 10-13, 15, 17, 22, and 23 have direct focused
  evidence for the Production milestone where applicable.
- Full workflow remains selected by default and behaviorally unchanged.
- Status-only Production mark/cancel writes only the completion record, audit,
  and internal projection invalidation allowed by the spec.
- `SalesStat`, `QtyControl`, production assignments/submissions, inventory,
  dispatch, finance, tax, notifications, commissions, payouts, and external
  integrations remain unchanged by the Status-only command.
- Unauthorized direct requests fail before domain writes.
- Repeated/concurrent commands are idempotent and cannot create duplicate active
  records.

## Files Or Areas Likely Involved

- `packages/db/src/schema/`
- `packages/db/src/migrations/`
- `packages/sales/src/`
- `packages/utils/src/constants.ts`
- `packages/auth/src/`
- `apps/api/src/trpc/routers/`
- `apps/api/src/db/queries/`
- `apps/dashboard/src/actions/`
- `apps/dashboard/src/components/sales-menu.tsx`
- Existing Sales confirmation/history/status components and focused tests

## Do Not Change

- Do not implement Status-only Fulfillment in this handoff.
- Do not weaken canonical Fulfilled, Full workflow, inventory, dispatch, proof,
  tax, accounting, or operational permission contracts.
- Do not make `SalesStat`, percentages, or legacy order status strings an
  administrative completion authority.
- Do not move linked tasks to done.
- Do not broaden scope beyond this handoff.

## Required Checks

- Focused database schema/migration tests and Prisma generation.
- Permission generator, role form, and backend negative authorization tests.
- Sales completion domain/command idempotency and concurrency tests.
- Focused Dashboard modal, history, action, and cancellation tests.
- Relevant package typechecks and narrow builds.
- `git diff --check`.

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-status-only-production-completion.json`

## Brain Update Contract

After implementation, update only the relevant files:

- `.brain/progress.md`: summarize implementation and checks.
- `.brain/features/status-only-sales-completion.md`: record delivered Production behavior.
- `.brain/api/endpoints.md`: record created/changed endpoints.
- `.brain/api/contracts.md`: record final command/projection shapes.
- `.brain/api/permissions.md`: record implemented permission enforcement.
- `.brain/database/schema.md`: record the implemented model/indexes.
- `.brain/database/relationships.md`: record final relations.
- `.brain/database/migrations.md`: record generated/applied local migration and checks.
- `.brain/decisions/`: update ADR-081 only if the approved decision remains accurate; add a new ADR only for a genuinely new durable decision.
- `.brain/tasks/in-progress.md`: keep the linked task in progress.

Do not move linked tasks to `done`. `brain-review-handoff` owns final approval.

## Completion Notes

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:

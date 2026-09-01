# Brain Handoff: Status-only Fulfillment Completion

## Status

Ready

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Source Ticket

`.scratch/status-only-sales-completion/issues/04-ship-status-only-fulfillment-completion.md`

## Task

- Task Title: Ship Status-only Fulfillment Completion and implied Production Completion
- Task File: `.brain/tasks/in-progress.md`

## Recommended Agent

- Agent: open-code
- Reason: This stack item extends an established transactional domain/API/UI
  slice and is dominated by state precedence, locking, and cancellation tests.

## Goal

Deliver Status-only Fulfillment Completion end to end while keeping canonical
Fulfilled proof/commit-bound and preserving every operational workflow.

## Review Unit

- Type: stack-item
- Linked Tasks: Ship Status-only Fulfillment Completion and implied Production Completion
- Grouping Reason: None
- Depends On Queue Items: `2026-09-01-gnd-status-only-production-completion`
- Approval Boundary: Approve only after the complete Fulfillment slice is
  implemented, reviewed, landed, and validated.

## Context To Read First

- `AGENTS.md`
- `CONTEXT.md`
- `.brain/plans/2026-09-01-feature-status-only-sales-completion.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`
- `.brain/features/status-only-sales-completion.md`
- `.scratch/status-only-sales-completion/spec.md`
- `.scratch/status-only-sales-completion/issues/04-ship-status-only-fulfillment-completion.md`
- `packages/sales/src/sales-completion.ts`
- `packages/sales/src/sales-completion.test.ts`
- `apps/api/src/trpc/routers/sales.route.ts`
- `apps/dashboard/src/components/sales-menu.tsx`
- `apps/dashboard/src/components/sales-production-completion-dialogs.tsx`

## Implementation Instructions

1. Extend the shared projection/action matrix for active Status-only
   Fulfillment, implied Production, canonical precedence, and cancellation
   restoration without changing proof-bound `canonicalFulfilled`.
2. Add serializable, authenticated, idempotent Fulfillment mark/cancel commands
   using the existing completion ledger and same-transaction Sales History.
3. Enforce that Fulfillment must be cancelled before an active Production
   completion and never use the Status-only path for a Full-workflow record.
4. Add protected API mutations with the existing exact edit permission and
   server-derived actor.
5. Add a Fulfillment confirmation choice with Full workflow default,
   milestone-specific skipped-effect warning, explicit administrative labels,
   provenance/history, action locks, and method-aware cancellation.
6. Add direct resolver, command, authorization, UI, audit, concurrency,
   idempotency, precedence, restoration, and no-side-effect tests.

## Acceptance Criteria

- Every acceptance criterion and required check in Ticket 04 passes.
- Status-only Fulfillment produces `ADMINISTRATIVELY_COMPLETED`, implies
  Production satisfaction without a synthetic Production record, and never
  makes `canonicalFulfilled` true without completed proof/dispatch evidence.
- Later canonical evidence wins disposition/provenance presentation while the
  Status-only record remains in history.
- Fulfillment cancellation restores an explicit Production declaration or
  independent operational Production evidence, otherwise unresolved state.
- Mark/cancel writes only completion/audit data and cannot fabricate delivery,
  proof, inventory, tax, accounting, notification, shipment, commission, or
  payout effects.

## Do Not Change

- Do not implement Ticket 05 Full-workflow record writers.
- Do not weaken canonical Fulfilled or tax-recognition evidence.
- Do not bulk-complete orders or mutate operational dispatch/inventory/proof.
- Do not move the linked task to done before review.

## Required Checks

- Resolver implication/precedence/restoration tests.
- Fulfillment command concurrency, idempotency, audit, transition, and
  no-operational-write tests.
- Negative API permission tests and focused Dashboard confirmation/history/
  locking/cancellation tests.
- Relevant DB, Sales, API, Dashboard, and permission checks.
- `git diff --check`.

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-status-only-fulfillment-completion.json`

## Brain Update Contract

- Update `.brain/progress.md`, feature behavior, API endpoints/contracts/
  permissions, and task/plan state.
- Update database docs only if Ticket 04 changes the already-landed schema or
  migration contract; otherwise explicitly record that no DB change was needed.
- Keep the parent feature stack in progress; final approval moves only Ticket 04
  to done and advances the stack to Ticket 05.

## Completion Notes

- Changed files: shared Sales completion domain/tests; Sales tRPC router and
  permission tests; Dashboard projection, dialogs, menu integration, and focused
  UI tests.
- Checks run: 38 focused tests / 112 assertions; `@gnd/sales` typecheck; scoped
  Biome; filtered API/Dashboard typechecks; `git diff --check`.
- Brain docs updated: feature, plan, progress, API endpoints/contracts/
  permissions, task state, and this handoff.
- Database impact: no schema or migration change; Ticket 04 reuses the Ticket 03
  completion ledger.
- Unresolved issues: unrelated repository-wide API/Dashboard typecheck baseline
  diagnostics remain outside this review unit.
- Review fix 1: relabelled lifecycle-provided Fulfillment cancellation actions
  from active administrative provenance, enforced the server action lock, and
  corrected remaining milestone/operational-record copy; focused regressions
  pass.

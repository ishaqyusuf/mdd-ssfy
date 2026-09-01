# Brain Handoff: Full-workflow Completion Provenance

## Status

Ready For Review

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Source Ticket

`.scratch/status-only-sales-completion/issues/05-preserve-full-workflow-provenance-and-cancellation.md`

## Task

- Task Title: Preserve Full workflow provenance and method-aware cancellation
- Task File: `.brain/tasks/in-progress.md`

## Recommended Agent

- Agent: open-code
- Reason: This stack item integrates one additive provenance service with
  established Production, Fulfillment, review, and cancellation transactions.

## Goal

Record `FULL_WORKFLOW` provenance only from proven operational completion paths,
keep the record non-authoritative, and cancel it only inside the existing
workflow-aware reversal transaction.

## Review Unit

- Type: stack-item
- Linked Tasks: Preserve Full workflow provenance and method-aware cancellation
- Depends On Queue Items: `2026-09-01-gnd-status-only-fulfillment-completion`
- Approval Boundary: Approve only after Production, Fulfillment, historical
  normalization, cancellation, and migration compatibility all pass.

## Context To Read First

- `AGENTS.md`
- `.brain/plans/2026-09-01-feature-status-only-sales-completion.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`
- `.brain/features/status-only-sales-completion.md`
- `.scratch/status-only-sales-completion/spec.md`
- `.scratch/status-only-sales-completion/issues/05-preserve-full-workflow-provenance-and-cancellation.md`
- `packages/sales/src/sales-completion.ts`
- `packages/sales/src/sales-control/tasks.ts`
- `packages/sales/src/production-submission-review/decision.ts`
- `packages/sales/src/sales-workflow-cancellation.ts`
- `packages/jobs/src/tasks/sales/bulk-mark-sales-fulfilled.ts`

## Implementation Instructions

1. Add one idempotent Full-workflow provenance writer that verifies the latest
   operational evidence and writes the completion record plus Sales History in
   one transaction. A record must never create completion truth.
2. Invoke it only after successful Production and Fulfillment operational
   completion boundaries, including material-review approval completion.
3. Preserve and pass the Fulfillment completion request identity so the
   committed dispatch includes the proof metadata required by canonical truth.
4. Cancel an active `FULL_WORKFLOW` record in the same existing workflow-aware
   cancellation transaction; never route it through Status-only cancellation.
5. Verify historical operational evidence normalizes to Full workflow without
   a broad record backfill or inference from legacy strings, `SalesStat`,
   `prodStatus`, `deliveredAt`, or a lone completed dispatch.

## Acceptance Criteria

- Ticket 05 and specification scenarios 4, 12, 16, and 17 pass.
- Provenance is written only after evidence exists and is idempotent under
  retries/races.
- Existing operational side effects, permissions, errors, and reversal guards
  remain authoritative.
- No broad historical completion-record backfill exists.

## Do Not Change

- Do not redesign Production, Fulfillment, or workflow cancellation.
- Do not make a Full-workflow record authoritative evidence.
- Do not relax permissions, proof, dispatch, inventory, or reversal guards.

## Required Checks

- Full-workflow provenance evidence/failure/idempotency/race tests.
- Production submission/review and dispatch completion transaction regressions.
- Workflow cancellation method tests.
- Migration/legacy normalization contract tests.
- Relevant Sales, Jobs, API, Dashboard, DB checks and `git diff --check`.

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-full-workflow-completion-provenance.json`

## Brain Update Contract

- Update progress, feature behavior, API contracts if changed, database
  compatibility/migration docs, and task/plan state.
- Keep the parent feature in progress; approval advances the stack to Ticket 06.

## Completion Notes

- Changed files: Sales completion provenance service/tests, Production
  submission and material-review orchestration/tests, dispatch completion and
  bulk-job proof propagation/tests, workflow-aware cancellation, and Brain
  records.
- Checks run: 100 focused tests / 302 assertions; Sales and Jobs typechecks;
  API, DB, and Dashboard diagnostics; scoped Biome; `git diff --check`.
- Brain docs updated: feature, plan, task, progress, schema, migrations, API
  contracts, and this handoff.
- Unresolved issues: no Ticket 05 functional issue. Broad API/DB/Dashboard
  checks retain unrelated repository baseline diagnostics; Dashboard requires a
  larger heap to emit them.

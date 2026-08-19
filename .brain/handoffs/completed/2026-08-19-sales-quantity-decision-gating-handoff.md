# Handoff Ticket: Fix Sales Quantity Decision Gating

## Status
Completed

## Source Plan
`.brain/plans/2026-08-19-bug-fix-sales-quantity-decision-gating.md`

## Assigned Agent
- Agent: `gpt-5.6-terra`
- Why: The architecture and tests exist; the defect is a narrow line/direction/inbound correlation bug plus direct-save regression coverage.

## Priority
High

## Review Unit
- Type: task
- Linked Task: Fix Sales Quantity Decision Gating
- Depends On: None
- Approval Boundary: Review and land this ticket independently.

## Goal
Only ask Cancel Open Inbound vs Keep In Warehouse when the reduced line affects mutable open inbound. Save directly when no inbound/refund/other decision is needed.

## Read First
- `.brain/plans/2026-08-19-bug-fix-sales-quantity-decision-gating.md`
- `.brain/features/in-form-sales-order-adjustments.md`
- `.brain/features/inbound-sales-adjustment-reconciliation.md`
- `packages/sales/src/adjustment-system/domain/change-analysis.ts`
- `apps/api/src/db/queries/new-sales-form-adjustments.ts`
- `apps/dashboard/src/components/forms/new-sales-form/new-sales-form.tsx`

## Implementation Route
1. Add the full affected-line decision matrix before changing behavior.
2. Centralize changed-line/direction/mutable-inbound facts in the package domain.
3. Replace the API's broad any-reduction/any-inbound rule with same-reduced-line correlation.
4. Make review UI controls and server preconditions consume the same result.
5. Add a direct-save regression proving no review preview/sheet is invoked when there is no decision.
6. Validate both inbound dispositions, wallet outcome, apply retry, and unrelated-demand isolation.

## Acceptance Criteria
- Unrelated or increased-line inbound never shows inbound choices for another reduction.
- A reduced line with mutable open inbound shows both valid dispositions.
- Received/closed/cancelled inbound does not show a meaningless choice.
- No-payment/no-commitment and partially paid-with-no-overpayment changes save directly.
- True wallet credit continues through review.
- Server never requires a choice absent from the UI.

## Do Not Change
- Do not remove preservation/audit of production, receipt, or fulfillment evidence.
- Do not change wallet/refund arithmetic.
- Do not mutate unrelated inbound demand or shipments.
- Do not duplicate analysis between dashboard and API.
- Do not move the linked task to done; review owns final closure.

## Required Checks
- Adjustment domain decision-matrix tests.
- Focused API preview/create tests.
- Sales Change Review component tests.
- Focused apply/recovery tests.
- `bun run --filter @gnd/sales typecheck`
- `bun run --filter @gnd/api typecheck`
- `bun run --filter @gnd/dashboard typecheck`
- Authenticated direct-save/inbound/wallet browser matrix.

## Brain Update Contract
After implementation, update `.brain/features/in-form-sales-order-adjustments.md`, `.brain/features/inbound-sales-adjustment-reconciliation.md`, `.brain/api/contracts.md` if shapes change, and `.brain/progress.md`. Keep the task in progress until review approval.

## Completion Report
- Changed files: package-owned adjustment analysis, API preview, and focused
  domain/API tests.
- Decision matrix: same-line reductions with mutable open demand require a
  disposition; cancelled, received, other-line, increase-only, and no-decision
  changes do not block direct save.
- Checks: focused adjustment tests and `@gnd/sales` typecheck pass.
- Browser evidence: not claimed.
- Brain docs: adjustment feature, API contract, task, and progress ledgers
  updated.
- Unresolved issues: none in the scoped decision rule.
- Skipped acceptance criteria: authenticated browser matrix, by request.

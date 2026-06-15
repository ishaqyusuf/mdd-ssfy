# Plan: Inventory Pending 03 - Production Assignment Completion Inventory Lifecycle Bridge

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Bridge `update-sales-control` production assignment and completion events into inventory line/component lifecycle projections.

## Current Context
`update-sales-control` handles assignment and production completion in legacy/control flows. Inventory projections already track fulfillment and production readiness, but production assignment/completion does not yet update inventory-equivalent lifecycle state.

## Proposed Approach
Add a package-level bridge that runs after successful sales-control commands and updates or derives inventory production lifecycle state without overloading physical stock fulfillment.

## Implementation Steps
- Identify `update-sales-control` commands for assignment and completion.
- Ensure sales inventory line items exist before applying production lifecycle state.
- Map sales item/control UID to `LineItem` and required `LineItemComponents`.
- Track production assigned quantity, production fulfilled quantity, and production status.
- Keep legacy production fields/views compatible.

## Affected Files Or Areas
- `packages/jobs/src/tasks/sales/update-sales-control.ts`
- `packages/sales/src/sales-control/actions.ts`
- `packages/sales/src/sync-sales-inventory-line-items.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- Inventory `LineItem` / `LineItemComponents`

## Acceptance Criteria
- Production assignment updates inventory line/component production projection.
- Partial completion keeps remaining production quantity open.
- Full completion marks inventory production equivalent fulfilled.
- Stock fulfillment state remains distinct from production completion state.

## Test Plan
- Unit tests for production lifecycle bridge mapping.
- Integration tests for assignment and completion command paths.
- Regression test that legacy production status remains intact.

## Risks / Edge Cases
- Production and fulfillment terms can be confused.
- Partial submissions may arrive out of order.
- Existing legacy sales production data may be incomplete.

## Open Questions
- Resolved for this slice: persist the production lifecycle projection in `LineItem.meta.production` so stock/component fulfillment fields remain dedicated to physical inventory allocation, inbound, pick, consume, and release state.

## Linked Task
- Task Title: Inventory Pending 03 - Production Assignment Completion Inventory Lifecycle Bridge
- Task File: brain/tasks/roadmap.md

## Completion Report
- Completed Date: 2026-06-15
- Added a package-level production lifecycle bridge, `syncInventoryProductionLifecycleForSale`, that repairs/creates inventory sale lines through `syncSalesInventoryLineItems` and then recomputes production projection from persisted production assignments/submissions.
- Wired the bridge into `update-sales-control` after successful production-related actions: assignment create, submit-all completion, submission update/delete, assignment delete, and mark-as-completed.
- Inventory lines now store `meta.production` with `orderedQty`, `assignedQty`, `fulfilledQty`, `remainingQty`, `status`, and `updatedAt`.
- Production fulfillment status remains separate from `LineItemComponents.status`, which continues to describe stock allocation/inbound/fulfillment.
- Validation: `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 4 tests and 9 assertions; `bun -e` import check for `packages/jobs/src/tasks/sales/update-sales-control.ts` passed; scoped `git diff --check` passed.
- Not run by default per Fast Bun discipline: broad package typecheck, build, browser validation, or dev server.

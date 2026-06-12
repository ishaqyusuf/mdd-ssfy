# Plan: Inventory Pending 03 - Production Assignment Completion Inventory Lifecycle Bridge

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

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
- TODO: Should production lifecycle fields be persisted or derived?

## Linked Task
- Task Title: Inventory Pending 03 - Production Assignment Completion Inventory Lifecycle Bridge
- Task File: brain/tasks/roadmap.md

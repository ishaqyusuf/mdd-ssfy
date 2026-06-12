# Plan: Inventory Pending 14 - Stock Audit Verification

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Verify audit coverage for stock in/out, return, correction, consume, and release.

## Current Context
Receiving and manual stock adjustments write stock movement/audit rows, but every stock mutation category needs explicit verification and tests.

## Proposed Approach
Create an audit matrix of all stock mutations, expected movement/audit action, reason code, quantity sign, and reconciliation impact.

## Implementation Steps
- Inventory stock mutation paths.
- Map each path to required audit/movement row.
- Add missing audit writes.
- Normalize reason codes where needed.
- Add tests for all required audit categories.

## Affected Files Or Areas
- `packages/inventory/src/application/stock`
- `packages/inventory/src/application/inbound/inbound-demand.ts`
- `packages/inventory/src/inventory.ts`
- `InventoryStock`
- `InventoryLog`
- `StockMovement`

## Acceptance Criteria
- Stock in/out, return, correction, consume, and release each have verified audit coverage.
- Direct stock quantity changes without audit are eliminated or documented.
- Audit rows reconcile with stock movement quantities.

## Test Plan
- Unit/integration tests for each audit category.
- Static scan for direct `InventoryStock.qty` writes.
- Manual verification in stock operations UI.

## Risks / Edge Cases
- Existing direct writes may be hard to migrate.
- Returns/corrections may require accounting-specific semantics.
- Reason-code changes can affect reports.

## Open Questions
- TODO: Should historical stock audit rows be backfilled?

## Linked Task
- Task Title: Inventory Pending 14 - Stock Audit Verification
- Task File: brain/tasks/roadmap.md

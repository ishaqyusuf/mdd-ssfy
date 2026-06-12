# Plan: Inventory Pending 04 - Inventory Mode Dispatch Assign Pack Fulfill

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Add inventory-mode dispatch that assigns, packs, fulfills, consumes, and releases inventory allocations while preserving legacy dispatch compatibility.

## Current Context
Dispatch currently relies on legacy/control flows, while inventory fulfillment tracks `StockAllocation` states. Ship-available partial shipment exists, but full dispatch assign/pack/fulfill inventory mode is pending.

## Proposed Approach
Add a gated inventory dispatch mode backed by `SalesFulfillmentPlan` and `StockAllocation` transitions, while continuing compatibility writes to legacy delivery/dispatch records.

## Implementation Steps
- Define inventory dispatch state transitions: reserved, picked, consumed, released.
- Add assign command that approves/reserves allocations for a dispatch batch.
- Add pack command that moves selected allocations to picked.
- Add fulfill command that consumes picked allocations and updates shipped/remaining projections.
- Add release/cancel command that releases held allocations.
- Keep `OrderDelivery` / `OrderItemDelivery` compatibility until shipment decision is final.

## Affected Files Or Areas
- `packages/inventory/src/inventory.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- dispatch API/router areas
- dispatch UI
- `StockAllocation`
- `OrderDelivery` / `OrderItemDelivery`

## Acceptance Criteria
- Inventory-mode dispatch can assign, pack, fulfill, consume, and release allocations.
- Fulfillment does not consume pending/unapproved allocations.
- Legacy dispatch records stay in sync.
- Inventory mode is gated to inventory-backed sale lines only.

## Test Plan
- Unit tests for allocation state transitions.
- Integration tests for assign/pack/fulfill/release commands.
- Browser/manual dispatch-mode validation.

## Risks / Edge Cases
- Duplicate consumption can corrupt stock.
- Dispatch mode must not break legacy dispatch workflow.
- Mixed legacy/inventory-backed orders need clear fallback behavior.

## Open Questions
- TODO: Should inventory dispatch mode be per sale, per dispatch batch, or per line?

## Linked Task
- Task Title: Inventory Pending 04 - Inventory Mode Dispatch Assign Pack Fulfill
- Task File: brain/tasks/roadmap.md

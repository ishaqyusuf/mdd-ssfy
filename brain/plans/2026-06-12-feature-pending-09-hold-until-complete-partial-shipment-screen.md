# Plan: Inventory Pending 09 - Hold Until Complete Partial Shipment Screen

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Add a hold-until-complete option and a dedicated partial shipment screen so operators can choose whether to ship available inventory now or wait for the full remaining fulfillment unit.

## Current Context
`shipAvailableSalesInventory` and the backorder queue support partial shipment, but hold-until-complete and a dedicated partial shipment workspace remain pending.

## Proposed Approach
Model hold behavior explicitly and create a focused partial shipment workflow backed by `SalesFulfillmentPlan`, `StockAllocation`, and legacy delivery compatibility records.

## Implementation Steps
- Define sale-level and/or line-level hold-until-complete preference.
- Add projection state for held, available-now, remaining, and blocked quantities.
- Prevent ship-available commands from shipping held lines before full readiness.
- Build a dedicated partial shipment screen with available, picked, shipped, remaining, and blocker summaries.
- Preserve legacy delivery compatibility writes.

## Affected Files Or Areas
- `packages/sales/src/sales-fulfillment-plan.ts`
- `packages/inventory/src/inventory.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `/inventory/backorders`
- TODO: dedicated partial shipment route/UI files

## Acceptance Criteria
- Held lines cannot be partially shipped accidentally.
- Non-held lines keep current ship-available behavior.
- Operators can execute partial shipment from a dedicated screen.
- Remaining and backordered quantities are visible before and after shipment.

## Test Plan
- Unit tests for held vs non-held projection.
- Integration tests for blocked partial shipment and successful full shipment.
- Browser/manual validation of partial shipment screen.

## Risks / Edge Cases
- Hold scope may need both sale and line granularity.
- Auto-allocation after inbound must respect hold behavior.
- Legacy shipment records must remain reconciled.

## Open Questions
- TODO: Should hold default from customer/profile/sale settings?

## Linked Task
- Task Title: Inventory Pending 09 - Hold Until Complete Partial Shipment Screen
- Task File: brain/tasks/roadmap.md

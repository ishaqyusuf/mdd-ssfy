# Plan: Sales Overview Inventory Demand Projection

## Type
Feature

## Status
In Progress

## Created Date
2026-06-22

## Last Updated
2026-06-22

## Intake
- Intake File: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Intake Item: Build the sale-level inventory status model for selected step components in sales overview.

## Goal Or Problem
Operators need a reliable inventory point-of-view for a specific sale before UI actions can safely allocate, order, or mark product as available. The model must list every selected step component grouped by invoice item, calculate required quantities, account for door multipliers, and resolve stock, allocations, pending quantity, cost, and status from the existing inventory-backed fulfillment system.

## Current Context
`brain/features/inventory-backed-sales-fulfillment.md` defines `LineItem`, `LineItemComponents`, `InventoryStock`, `StockAllocation`, `InboundDemand`, `InboundShipment`, and `SalesFulfillmentPlan` as the inventory-backed fulfillment model. `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md` says inventory owns inbound demand status semantics. `brain/decisions/ADR-003-sales-overview-system-architecture.md` says new sales overview work should land in `sales-overview-system` first.

## Proposed Approach
Add a sale-scoped inventory overview projection in the inventory/sales domain layer and expose it through a protected tRPC query for the sales overview. The projection should derive rows from inventory-backed sale lines first, fall back to mapped legacy selected step data only where needed, and return a stable UI contract grouped by invoice item. Include a category/step policy field so operators can see whether a row is tracked inventory, stock-only, or not inventory.

## Implementation Steps
- Inspect current sale inventory sync and projection services around `LineItem`, `LineItemComponents`, `SalesFulfillmentPlan`, `StockAllocation`, and `InboundDemand`.
- Define a pure row contract for `SalesOverviewInventoryGroup` and `SalesOverviewInventoryLine` with sale id, sales item id, invoice item label/description, step/category label, inventory id/variant id, component name, required qty, stock qty, allocated qty, pending qty, cost, status, track policy, and available actions.
- Implement door multiplier handling so components attached to door workflows multiply by the total resolved door quantity, while width/height or other non-inventory measurements can be classified as not inventory.
- Add or reuse a category policy resolver for step/payment category behavior: `tracked`, `stock_only`, `not_inventory`, or TODO: exact enum. Keep the policy inventory-owned rather than app-local.
- Add tests for grouped invoice items, description fallback, door quantity multiplication, non-tracked/not-inventory rows, stock/allocated/pending calculations, and cost/status derivation.
- Expose a protected API query, likely under `inventories` or `sales`, for the sales overview inventory projection.
- Update Brain docs after implementation, especially inventory-backed fulfillment and API contracts if a new tRPC contract is added.

## Affected Files Or Areas
- `packages/inventory/src/application/*`
- `packages/inventory/src/inventory.ts`
- `packages/sales/src/*`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/api/src/trpc/routers/sales.route.ts`
- `apps/www/src/components/sales-overview-system/*`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/api/contracts.md`

## Acceptance Criteria
- A sale-level inventory overview query returns rows grouped by invoice item with component name, required qty, stock qty, allocated qty, pending qty, cost, status, and action eligibility.
- Door component quantities multiply by the resolved total door count.
- Non-inventory measurements or categories can be represented as not-inventory without creating pending demand.
- Tracked vs untracked inventory behavior comes from a domain policy resolver, not inline UI rules.
- Focused tests cover quantity multiplication, stock/allocated/pending math, and status derivation.

## Test Plan
- Run focused package tests for the new projection helper.
- Run focused API import/contract tests for the route exposing the projection.
- Manually verify one order with multiple invoice items and door quantities after UI work lands.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/api/contracts.md` if a new or changed tRPC contract is added.
- Update `brain/progress.md`.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Door quantity may be represented differently across legacy selected steps, HPT rows, and inventory-backed lines.
- Cost may differ by variant/supplier; rows should expose clear source metadata or reliability flags when cost is approximate.
- A broad "available" order prompt must not destructively cancel open demand unless selected-demand policy allows it.

## Open Questions
- TODO: Confirm the durable storage location and enum values for step/payment category inventory policy.
- TODO: Confirm whether untracked but still orderable components should show status as available, untracked, or attention needed.

## Linked Task
- Task Title: Sales Overview Inventory Demand Projection
- Task File: brain/tasks/roadmap.md

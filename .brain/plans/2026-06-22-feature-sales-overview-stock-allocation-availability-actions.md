# Plan: Sales Overview Stock Allocation And Availability Actions

## Type
Feature

## Status
Approved

## Created Date
2026-06-22

## Last Updated
2026-06-22

## Intake
- Intake File: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Intake Item: Add allocation, category-policy, and "all product in stock" actions to the sales overview Inventory tab.

## Goal Or Problem
Operators need to resolve inventory availability from the sales overview: allocate available stock for pending lines, mark categories as inventory or not inventory, mark all resolvable items as available, and keep the invoice-level "Is all product in stock" prompt consistent with actual line-level inventory status.

## Current Context
Inventory-backed fulfillment already has `StockAllocation`, `InventoryStock`, `InboundDemand`, and `SalesFulfillmentPlan`. `brain/features/order-inbound-status.md` defines `SalesOrders.inventoryStatus` as the order-level prompt and explains that selected-demand mutation can refine line-level prompt behavior. This plan should connect those existing models to sales overview actions without inventing a second fulfillment state system.

## Proposed Approach
Add action availability and mutations to the Inventory tab. A `StockAllocator` alert/card should appear above the list when pending quantities have available stock. It should summarize each allocatable component as `component x (available/needed)` and provide `Allocate all`. Row action menus should support allocate-from-stock and category policy updates. A top-level `Allocate available stocks` action should allocate all available stock while leaving unresolved pending quantities for inbound creation. A `Mark all as available` action should only be enabled when every inventory-required line is satisfied or intentionally classified as not inventory/untracked according to policy.

## Implementation Steps
- Reuse or extend inventory allocation services so sales overview can allocate available stock for selected sale lines without duplicating allocation rules.
- Add a pure `StockAllocator` summary builder that identifies pending lines with available stock and returns human-readable component availability.
- Add protected mutation(s) for allocate selected row, allocate all available rows, and optionally mark selected mutable demand rows available/cancelled according to `canOrderInboundPromptMutateDemand`.
- Add row action menu items:
  - set step/payment category policy to tracked/in-stock behavior
  - set step/payment category policy to not inventory
  - allocate from stock when available
- Connect "All product is in stock" behavior to inventory status:
  - auto-fill order-level available status only when all required inventory lines are available/allocated/fulfilled or intentionally not inventory
  - preserve reconciliation warnings if order-level prompt says available while open demand remains
- Add audit notes or event logs for allocation and category-policy changes.
- Add UI feedback so allocation actions refresh the Inventory tab and existing stock/inbound/fulfillment views.

## Affected Files Or Areas
- `packages/inventory/src/application/allocations/*`
- `packages/inventory/src/application/inbound/*`
- `packages/inventory/src/inventory.ts`
- `packages/sales/src/*`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/api/src/trpc/routers/notes.route.ts`
- `apps/www/src/components/sales-overview-system/*`
- `apps/www/src/components/inventory/*`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/features/order-inbound-status.md`
- `brain/api/contracts.md`

## Acceptance Criteria
- Inventory tab shows a StockAllocator alert/card when pending rows have stock available.
- Operators can allocate one row or all available stock from the sales overview.
- Allocation updates stock/allocation/pending status after refresh and does not over-allocate.
- Operators can classify a step/payment category as tracked inventory or not inventory from a row action, with global effect documented and permissioned.
- "All product is in stock" can be auto-filled only when line-level inventory status supports it.
- Focused tests cover all-available calculation, partial allocation, over-allocation prevention, and selected-demand availability behavior.

## Test Plan
- Run focused tests for allocation summary and mutation behavior.
- Run focused tests for inventory-status/all-products-available resolver.
- Manual browser verification using a sale with one fully available line, one partially available line, and one not-inventory category.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/features/order-inbound-status.md`.
- Update `brain/api/contracts.md` if mutations or route inputs change.
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
- Allocation must be transactional to avoid two operators reserving the same stock.
- Global category-policy changes can affect future sales beyond the current order; the UI should make this scope clear and require appropriate permissions.
- Mark-all-available must not hide real pending demand created by inventory sync.

## Open Questions
- TODO: Confirm whether category-policy actions should require Super Admin or a narrower inventory-management permission.
- TODO: Confirm whether "mark all as available" should create allocation records for stock-tracked items or only update prompt state once allocations already exist.

## Linked Task
- Task Title: Sales Overview Stock Allocation And Availability Actions
- Task File: brain/tasks/roadmap.md

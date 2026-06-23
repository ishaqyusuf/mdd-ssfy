# Brain Intake: Sales Overview Inventory Workflows

## Status
Approved

## Created Date
2026-06-22

## Last Updated
2026-06-22

## Raw Input
Add inventory features to the opened sales overview. Include a new Inventory tab with a new-feature icon/badge. The tab should show sale-specific inventory item status grouped by invoice item, listing selected step components from the inventory point of view with total quantity, stock, allocated, pending quantity, cost, status, and actions. Door-related components should multiply by total door quantity. Operators should be able to globally mark a step/payment category as stock-tracked or not inventory, allocate from stock, create inbound orders for pending quantities through a smart supplier form, allocate all available stock, mark all items available, and connect the invoice "Is all product in stock" prompt to actual inventory item status.

## Generated Plans
- [x] Sales Overview Inventory Demand Projection - `brain/plans/2026-06-22-feature-sales-overview-inventory-demand-projection.md` - Status: Approved
- [x] Sales Overview Inventory Tab UI - `brain/plans/2026-06-22-ux-ui-sales-overview-inventory-tab.md` - Status: Approved
- [x] Sales Overview Inventory Inbound Creator - `brain/plans/2026-06-22-feature-sales-overview-inventory-inbound-creator.md` - Status: Approved
- [x] Sales Overview Stock Allocation And Availability Actions - `brain/plans/2026-06-22-feature-sales-overview-stock-allocation-availability-actions.md` - Status: Approved

## Recommended Execution Order
1. Sales Overview Inventory Demand Projection - establishes the sale-level inventory row contract and category tracking policy used by every later UI/action.
2. Sales Overview Inventory Tab UI - exposes the read-only operator view, stock drilldowns, new-feature badge, and suggested status affordances.
3. Sales Overview Stock Allocation And Availability Actions - adds mutation paths for allocate available stock, line/category policy changes, and inventory-driven "all product in stock" behavior.
4. Sales Overview Inventory Inbound Creator - layers the purchasing workflow onto the pending-quantity model once demand and allocation behavior are stable.

## Agent Recommendations
- Sales Overview Inventory Demand Projection: open-code - domain/API modeling work should stay close to `@gnd/inventory`, `@gnd/sales`, and tRPC contracts.
- Sales Overview Inventory Tab UI: antigravity - useful for a richer operator UI pass after the data contract is known, especially grouped rows, badge treatment, and stock drilldown behavior.
- Sales Overview Stock Allocation And Availability Actions: open-code - mutation correctness and audit behavior matter more than visual iteration.
- Sales Overview Inventory Inbound Creator: antigravity - the smart multi-form inbound workflow has meaningful UX complexity and should be prototyped carefully against the data contract.

## Merged Items
- The Inventory tab table, new-feature badge, grouped invoice-item display, stock drilldown, and suggested extra features were merged into the Sales Overview Inventory Tab UI plan.
- The "always mark step/payment category as in stock or not inventory" action was merged into the projection plan as a category policy plus surfaced in the allocation/action plan for UI mutation handling.
- "Allocate all from stock", "allocate available stocks", and "mark all as available" were merged into the stock allocation and availability action plan.
- Smart inbound form behavior, supplier creation, split forms, pending-quantity defaults, and PO/date/status fields were merged into the inbound creator plan.

## Duplicate Or Existing Items
- Existing `brain/features/inventory-backed-sales-fulfillment.md` already documents inventory-backed fulfillment, allocations, inbound demand, stock, and item dashboards. These new plans extend that model into the sales overview rather than replacing it.
- Existing `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md` completed the inventory item dashboard and stock/related-sales view. The new Inventory tab should link to that existing item dashboard or stock view instead of rebuilding it.
- Existing `brain/features/order-inbound-status.md` and `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md` already define order-level inbound status semantics. The new plans must reuse inventory-owned `InboundDemand` policy instead of creating a second sales-local status system.

## Needs Clarification
- TODO: Confirm whether the global "Step Name/payment category" policy should live on `InventoryCategory`, an existing sales/payment category table, or a new mapping table between sales steps and inventory categories.
- TODO: Confirm whether "mark all as available" should cancel selected pending inbound demand, create stock-allocation fulfillment records, or only update `SalesOrders.inventoryStatus` when all line-level requirements are satisfied.
- TODO: Confirm whether inbound creation should create purchase-order records immediately or start as `InboundShipment` / `InboundShipmentItem` drafts using the existing inventory inbound model.

## Skipped Items
- None.

## Approval Notes
- Approved all generated plans on 2026-06-22 at user request.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

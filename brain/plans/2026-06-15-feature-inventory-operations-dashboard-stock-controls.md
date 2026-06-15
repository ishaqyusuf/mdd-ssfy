# Plan: Inventory Pending 16 - Inventory Operations Dashboard Stock Controls

## Type
Feature

## Status
Done

## Created Date
2026-06-15

## Last Updated
2026-06-15

## Intake
- Intake File: brain/intake/2026-06-15-inventory-cutover-pending-scope.md
- Intake Item: inventory management pages update: dashboard, track stock level option, low stock alert, and operational inventory page controls.

## Goal Or Problem
Inventory management needs an operations dashboard and stock-control workflow that lets operators see low-stock risk, choose whether stock is tracked, and understand current stock health without opening legacy Dyke or edit-only surfaces.

## Current Context
Inventory pages already cover imports, suppliers, inbound receiving, pending allocations, backorders, production plan, stock operations, review, and low-stock summary entry points. Existing related Brain plans cover item dashboard, variants workspace, and top-sales analytics:
- `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md`
- `brain/plans/2026-06-12-feature-pending-12-inventory-variants-workspace.md`
- `brain/plans/2026-06-12-feature-pending-13-top-sales-analytics-inventory-item-variant.md`

This plan should not duplicate those. It should create the first dashboard/control layer that those pages can plug into.

## Proposed Approach
Build a focused inventory operations dashboard slice:
- dashboard cards for low stock, out of stock, tracked/untracked stock, open inbound, pending allocations, backorders, and production blockers
- stock tracking controls for item/variant level where supported
- low-stock alert rules that start with threshold-based logic and leave lead-time/inbound-aware rules as a clear extension if not included
- links into existing or planned item dashboard, variants workspace, inbound, allocations, production plan, and backorders

Keep reusable calculations in `@gnd/inventory` or `@gnd/sales` packages and keep app routes/components compositional.

## Implementation Steps
- Inspect current inventory dashboard route and `lowStockSummary` implementation.
- Define an operations summary query with counts for:
  - tracked variants
  - untracked variants/items
  - low-stock variants
  - out-of-stock variants
  - open inbound demand
  - pending allocations
  - backordered sales lines
  - production blockers
- Add stock tracking control fields if missing:
  - item-level stock mode
  - variant-level stock tracking override, if needed
  - reorder point
  - reorder quantity
  - preferred supplier and lead time, where available
- Expose a protected inventory API query/mutation set for dashboard summary and tracking settings.
- Add dashboard UI cards and alert rows to the inventory management page.
- Add low-stock alert drilldown links to variants/item dashboard when those routes exist; otherwise link to the closest current inventory list/filter.
- Add empty/loading/error states that do not block the rest of the inventory workspace.
- Update Brain progress and the inventory-backed fulfillment feature doc after implementation.

## Affected Files Or Areas
- `packages/inventory/src/inventory.ts`
- `packages/inventory/src/application/*`
- `packages/inventory/src/schema.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/www/src/app/(sidebar)/inventory`
- `apps/www/src/components/inventory`
- `apps/www/src/components/widgets/inventory-stock-alert-widget.tsx`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/progress.md`

## Acceptance Criteria
- Inventory dashboard shows operational stock health cards for tracked, low-stock, out-of-stock, inbound, allocations, backorders, and production blockers.
- Operators can tell whether an inventory item/variant is stock-tracked and where to update that setting.
- Low-stock alerts are visible from the inventory operations surface.
- Dashboard links lead to existing inventory detail, inbound, allocation, production, or backorder surfaces without dead links.
- The dashboard does not duplicate the full item dashboard, variants workspace, or top-sales analytics plans.

## Test Plan
- Focused unit/query tests for stock operations summary calculations.
- Import smoke for the inventories router and operations dashboard component.
- Scoped `git diff --check` on touched files.
- Browser/manual UI validation remains deferred to Pending 15.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/progress.md`.
- Mark the companion task status appropriately.

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
- Dashboard queries can become heavy if they hydrate rows instead of aggregate counts.
- Stock tracking may need both item-level and variant-level semantics; first implementation must avoid ambiguous overrides.
- Low-stock alerts can be misleading if inbound demand and reserved allocations are not considered or clearly labeled.

## Open Questions
- Resolved for this slice: first release uses effective item/category stock mode (`InventoryCategory.stockMode || Inventory.stockMode`) and exposes `InventoryVariant.lowStockAlert`; no variant-level stock-mode override was added.
- Resolved for this slice: supplier lead time is displayed in alert rows when a preferred supplier variant exposes it, but lead-time/inbound-aware reorder rules remain future purchasing logic.

## Linked Task
- Task Title: Inventory Pending 16 - Inventory Operations Dashboard Stock Controls
- Task File: brain/tasks/roadmap.md

## Completion Report
- Added `buildInventoryOperationsSummary(...)` and `inventoryOperationsSummary(...)` in `@gnd/inventory`.
- Added protected tRPC route `inventories.inventoryOperationsSummary`.
- Added `InventoryOperationsDashboard` on `/inventory` with tracked/untracked, low-stock, out-of-stock, inbound, allocation, backorder, and production blocker cards plus stock alert drilldowns.
- Replaced the old low-stock-only dashboard widget mount on `/inventory` with the operations dashboard; the old widget remains available but unused by this page.
- Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 4 tests and 13 assertions.
- Validation: import smoke for `apps/api/src/trpc/routers/inventories.route.ts` and `apps/www/src/components/inventory/inventory-operations-dashboard.tsx` passed.
- Validation: scoped `git diff --check` passed.
- Deferred: browser/manual validation remains part of Pending 15.

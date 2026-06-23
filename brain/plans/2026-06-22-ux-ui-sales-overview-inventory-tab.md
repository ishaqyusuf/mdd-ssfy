# Plan: Sales Overview Inventory Tab UI

## Type
UX/UI

## Status
In Progress

## Created Date
2026-06-22

## Last Updated
2026-06-22

## Intake
- Intake File: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Intake Item: Add an Inventory tab with a new-feature badge and sale-specific inventory status table.

## Goal Or Problem
The sales overview should give operators a clear sale-specific inventory workspace where they can see which selected components are in stock, allocated, pending, not inventory, or action-required without leaving the order.

## Current Context
The sales overview architecture is migrating into `apps/www/src/components/sales-overview-system/*` per `brain/decisions/ADR-003-sales-overview-system-architecture.md`. Inventory item dashboards and stock/movement views already exist from `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md`, so the overview tab should link into existing inventory drilldowns instead of duplicating item dashboard features.

## Proposed Approach
Add a registry-backed `Inventory` tab to the sales overview system with a new-feature icon/badge. The tab should render grouped invoice-item sections. Each section should use the invoice item description when present, otherwise `Invoice Item N`. Rows should show component name, quantity, in-stock quantity, allocated quantity, pending quantity, cost, status, and an action menu. Stock values should be clickable and open the existing inventory item dashboard/stock context as a secondary tab, sheet, or deep link.

## Implementation Steps
- Locate the sales overview tab registry/controller in `apps/www/src/components/sales-overview-system/*`.
- Add an Inventory tab definition gated to order/sales contexts where inventory-backed projection data can be loaded.
- Add a new-feature badge/icon treatment that is visually distinct but quiet enough for an operations screen.
- Build grouped invoice item sections using the projection query from the demand-projection plan.
- Add row status badges for available, allocated, partial, pending, ordered, untracked, not inventory, and blocked/TODO states.
- Make the stock column clickable when an inventory id or variant id exists; open the existing `/inventory/[id]` dashboard or a stock-focused secondary panel.
- Add empty, loading, stale-sync, and no-inventory-mapping states.
- Suggested extra features to consider in this UI slice: only-show-attention filter, "has pending qty" summary card, missing policy warning, stock reliability tooltip, row audit popover, and CSV/print-friendly view if cheap.

## Affected Files Or Areas
- `apps/www/src/components/sales-overview-system/*`
- `apps/www/src/components/sheets/sales-overview-sheet/*`
- `apps/www/src/components/inventory/*`
- `apps/www/src/hooks/*sales-overview*`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `brain/features/inventory-backed-sales-fulfillment.md`

## Acceptance Criteria
- Sales overview includes an Inventory tab with a new-feature badge/icon.
- The tab groups rows by invoice item and uses item description when available.
- Rows show component name, qty, in stock, allocated, pending qty, cost, status, and action menu.
- Stock values link to an existing inventory stock/item dashboard path or secondary panel.
- Loading, empty, error, and unmapped states are handled without breaking other sales overview tabs.

## Test Plan
- Run focused component/import checks for the new sales overview tab files.
- Run any existing sales overview tab registry tests if present.
- Manual browser verification on `/sales-book/create-order` or a saved sales overview with at least two invoice items and one door-based component.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
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
- Sales overview role/tab visibility may hide tabs for production-only or dispatch-only users; preserve existing visibility behavior unless inventory access policy says otherwise.
- If the projection query is slow, the Inventory tab should load on demand and not block overview shell render.
- The action menu should not expose mutations until the corresponding mutation plans are implemented.

## Open Questions
- TODO: Confirm whether the stock drilldown should be a new secondary sales-overview tab, an existing inventory item route link, or a sheet inside the Inventory tab.

## Linked Task
- Task Title: Sales Overview Inventory Tab UI
- Task File: brain/tasks/roadmap.md

# Inventory Allocations Table

## Purpose
`/inventory/allocations` is the operator queue for reviewing suggested stock reservations before they become committed inventory allocations.

## Current Behavior
- The route uses the restarted Sales Orders table standard through `apps/www/src/components/tables-2/inventory-allocations/*`.
- The route shell is `PageShell` + `HydrateClient` + `ScrollableContent` + `batchPrefetch` + `getInitialTableSettings("inventory-allocations")`.
- The table consumes `components/tables-2/core` without changing core: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, DnD headers, resize handles, sticky columns, persisted sizing/order/visibility/dividers, infinite scroll, selection, and a selected-row bottom bar.
- Compact/content-tailored layout uses 64px rows, sticky Select + Inventory columns, and explicit widths for Inventory, Order / Component, Qty, Stock, Status, Created, References, and Actions.
- The existing allocation review actions are preserved: row-level Approve/Reject, page-level Approve Visible, and selected-row Approve selected.
- The References column is hidden by default so the main operator table stays compact while keeping diagnostic ids available through column visibility.
- Row order links open the Sales Orders Inventory tab using the legacy `sales-overview-id` URL contract.

## Data Contract
- Reuses `inventories.pendingAllocations` with the existing cursor pagination and `sort[]` contract.
- Reuses `inventories.approveStockAllocation`, `inventories.rejectStockAllocation`, and `inventories.approveBulkStockAllocation`.
- No new API endpoint, schema, database field, or permission was added for this table migration.

## Validation
- `bun test apps/www/src/components/tables-2/*/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 75 tests / 682 assertions.
- Runtime static scan found no live `components/tables/skeleton`, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, or `IntersectionObserver` use in the allocation route/table surface.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for the touched allocation table, route, and registry files while broad typecheck remains subject to existing unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/allocations` and `/inventory/allocations?sort=createdAt.desc` on `127.0.0.1:3010`; unauthenticated output includes the expected protected `/login/v2` redirect marker.

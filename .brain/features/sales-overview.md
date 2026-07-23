# Sales Overview

## Purpose

Sales Overview is the canonical order/quote detail surface opened from the
Sales Orders workspace and related operational tables.

## Canonical Surface

- Workspace route: `/sales-book/orders`
- Detail surface: `components/sheets/sales-overview-sheet`
- URL identity: `sales-overview-id`
- URL type: `sales-type=order|quote`
- URL mode: `sales|quote|sales-production|production-tasks|dispatch-modal`
- URL tab: `salesTab`

There is no separate Sales Overview page or V2 sheet. The retired V2 surface
was never used in production and has no redirect.

## Open Contract

All new callers should use:

- `useSalesOverviewOpen()` for client actions
- `buildSalesOverviewUrl()` for links
- `useSalesOverviewQuery()` inside the canonical sheet

Callers must pass stable sale identity and explicit mode/tab intent when
opening production, dispatch, packing, or inventory workflows.

## Runtime Behavior

- The canonical orders list stays mounted behind the sheet.
- Only the active tab content renders; inactive production, dispatch,
  transaction, inventory, and activity providers do not mount.
- Explicit dispatch mode is honored for users with broader order access.
- Assigned production users remain constrained to the production view.
- Production reads are pure by default.
- Production mutations may opt into derived-state persistence explicitly.

## API And Permissions

- `sales.getSaleOverview` requires authentication plus a relevant order,
  estimate, production, delivery, pickup, or packing capability.
- `sales.productionOverview` requires authentication plus an order,
  production, delivery, pickup, or packing capability.
- Neither query performs hidden gate or assignment repair writes.

## Performance Priorities

1. Keep the orders workspace server-prefetched and virtualized.
2. Keep detail identity and tab state in the URL.
3. Load tab/domain data only when the tab is active.
4. Split the large General and Inventory implementations into bounded domain
   sections without creating another parallel surface.
5. Measure open latency and query count before adding new summary queries.

## Architecture Decision

See
[ADR-028](../decisions/ADR-028-canonical-sales-overview-workspace-and-sheet.md).

# Inventory Dispatch Mode Table

## Purpose
`/inventory/dispatch-mode` is the inventory-backed dispatch workspace for reserving, picking, fulfilling, or releasing sale-line stock allocations.

## Current Behavior
- The route now follows the restarted Sales Orders table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("inventory-dispatch-mode")`.
- The repeatable dispatch queue renders through `components/tables-2/inventory-dispatch-mode/*` instead of card-mapped rows.
- Summary cards, status filters, Partial Shipments link, Backorders link, and existing queue invalidation behavior remain outside the table.
- Row clicks still open the sales overview packing tab for the order.
- Whole-line dispatch actions are preserved: assign, pack, fulfill, and release.
- Allocation-specific actions are preserved in the compact row menu: assign approved allocations, pack reserved allocations, fulfill picked allocations, and release reserved allocations.

## Table Contract
- Data source: `trpc.inventories.salesPartialShipmentQueue`.
- Default route prefetch: `{ limit: 100, statuses: ["available_now"] }`.
- Mutations preserved:
  - `trpc.inventories.assignInventoryDispatchAllocations`
  - `trpc.inventories.packInventoryDispatchAllocations`
  - `trpc.inventories.fulfillInventoryDispatch`
  - `trpc.inventories.releaseInventoryDispatchAllocations`
- Table id: `inventory-dispatch-mode`.
- Compact settings:
  - row height: `56`
  - header height: `45`
  - sticky columns: `Order`, `Actions`
  - default hidden column: `Blockers`
  - tailored widths: Order `160/280/190`, Line `200/360/240`, Status `124/190/140`, Qty `170/260/190`, Available `104/150/118`, Allocations `190/320/220`, Blockers `200/340/240`, Actions `136/180/150`
  - row badges use compact `h-5`/`h-6` sizing, blocker previews show one primary blocker plus a compact overflow-count badge, and the visible Fulfill action uses `h-8 px-2 text-xs`.

## Validation
- Focused Biome passed for the dispatch route, workspace, table files, registry files, audit file, and parity test.
- Focused dispatch/page audit tests passed with `6` tests and `24` assertions.
- Full restarted table parity suite passed with `90` tests and `773` assertions.
- Runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, manual fetch, shared sticky header, `IntersectionObserver`, old `items.map((item)` card list, or allocation-button map usage in the dispatch route surface.
- Filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; broad typecheck remains subject to unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/dispatch-mode` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
- 2026-07-17 density pass validation: focused Dispatch Mode parity tests passed with `3` tests and `26` assertions; full `apps/www/src/components/tables-2` tests passed with `306` tests and `2558` assertions; focused Biome passed for the Dispatch Mode columns/test and table config; filtered `@gnd/www` typecheck grep produced no Dispatch Mode/table-config diagnostics; `apps/www/src/components/tables-2/core` diff stayed clean; HTTPS route smoke returned `200` in `33.6s`. Browser proof on `https://gndprodesk.localhost/inventory/dispatch-mode` confirmed a `45px` header, `56px` data row, table-owned horizontal scroll (`scrollLeft 0 -> 102`), and no document-level horizontal overflow. The current authenticated dataset had only one dispatch row (`scrollHeight == clientHeight`), so vertical row scrolling could not be exercised on this slice.

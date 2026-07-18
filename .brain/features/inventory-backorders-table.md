# Inventory Backorders Table

## Purpose
`/inventory/backorders` is the operator queue for sales lines that still have inventory blockers or received stock ready to ship.

## Current Behavior
- The route uses the restarted Sales Orders table standard through `apps/www/src/components/tables-2/inventory-backorders/*`.
- The route shell is `PageShell` + `HydrateClient` + `ScrollableContent` + `batchPrefetch` + `getInitialTableSettings("inventory-backorders")`.
- The workspace keeps the existing status filters, summary cards, print action, partial shipment link, and allocate-received action above the table.
- The table consumes `components/tables-2/core` without changing core: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, DnD headers, resize handles, sticky columns, persisted sizing/order/visibility/dividers, and horizontal pagination controls.
- Compact/content-tailored layout uses compact table style, 56px rows, a sticky Order column, a sticky Actions column, explicit widths for Order, Line, Status, Fulfillment, Available, Backorder, Received, Blockers, and Actions, and a single primary blocker preview with a compact overflow-count badge.
- Existing row behavior is preserved: row click opens the sales overview Packing tab, the open-sale icon opens the same sale, and the Ship action calls the existing ship-available mutation.

## Data Contract
- Reuses `inventories.salesBackorderQueue` with the existing `limit` and `statuses` contract.
- Reuses `inventories.shipAvailableSalesInventory` for row-level ship-available actions.
- The table consumes the workspace query result instead of mounting a second query, so summary cards and rows stay aligned.
- No new API endpoint, schema, database field, permission, or inventory `*V2` query was added for this table migration.

## Validation
- 2026-07-17 density update:
  - Focused Backorders parity tests passed with 3 tests / 20 assertions.
  - Full `apps/www/src/components/tables-2` suite passed with 305 tests / 2547 assertions.
  - Focused Biome passed for the Backorders columns, parity test, and `table-configs`.
  - Filtered `@gnd/www` typecheck grep reported no touched-file diagnostics for Backorders/table-configs.
  - Direct local HTTP route smoke returned `200` for `/inventory/backorders`; the initial HTTPS proxy route smoke timed out with zero bytes after 25s, but a follow-up authenticated browser proof on `https://gndprodesk.localhost/inventory/backorders` confirmed table-owned vertical/horizontal scrolling.
  - `git diff --check` and clean `components/tables-2/core` diff passed.
- `bun test apps/www/src/components/tables-2/inventory-backorders/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 6 tests / 19 assertions.
- `bun test apps/www/src/components/tables-2/*/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 81 tests / 714 assertions.
- Runtime static scan found no live `components/tables/skeleton`, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, `IntersectionObserver`, or old blocker card-list usage in the backorders route/table surface.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for the touched backorders table, route, workspace, registry, and audit files while broad typecheck remains subject to existing unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/backorders` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011`.
- 2026-07-17 browser proof follow-up:
  - Authenticated runtime validation on `https://gndprodesk.localhost/inventory/backorders` loaded the Backorder Queue with 100 queue lines.
  - Confirmed compact `56px` rows, a `45px` sticky header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 5645`, `clientHeight 359`), table-owned horizontal scroll (`scrollLeft 0 -> 260`, `scrollWidth 1490`, `clientWidth 1131`), and no document-level horizontal overflow.
  - Focused Backorders parity tests, focused Biome, direct local HTTP route smoke, filtered touched-file typecheck grep, and clean `components/tables-2/core` diff still pass.

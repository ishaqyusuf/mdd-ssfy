# Inventory Partial Shipments Table

## Purpose
`/inventory/partial-shipments` is the operator workspace for deciding when inventory-backed sales lines can ship available quantity, stay held until complete, or wait for remaining inbound/backorder coverage.

## Current Behavior
- The route uses the restarted Sales Orders table standard through `apps/www/src/components/tables-2/inventory-partial-shipments/*`.
- The route shell is `PageShell` + `HydrateClient` + `ScrollableContent` + `batchPrefetch` + `getInitialTableSettings("inventory-partial-shipments")`.
- The workspace keeps existing summary cards, status filters, Backorders link, hold/unhold mutation, and Ship Available mutation.
- The table consumes `components/tables-2/core` without changing core: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, DnD headers, resize handles, sticky columns, persisted sizing/order/visibility/dividers, and horizontal pagination controls.
- Compact/content-tailored layout uses compact table style, 56px rows, a sticky Order column, a sticky Actions column, and explicit widths for Order, Line, Status, Fulfillment, Available, Holdback, Blockers, Hold, and Actions.
- Current content-fit widths are Order `160/280/190`, Line `200/360/240`, Status `124/190/140`, Fulfillment `170/260/190`, Available `104/150/118`, Holdback `112/170/128`, Blockers `200/340/240`, Hold `82/120/94`, and Actions `124/160/136`.
- Blocker previews show one primary blocker plus a compact overflow-count badge so dense rows stay readable at 56px.
- Row click opens the existing sales overview Packing tab; the Hold switch updates the existing fulfillment hold state; the Ship action calls the existing ship-available mutation.

## Data Contract
- Reuses `inventories.salesPartialShipmentQueue` with the existing `limit`, `statuses`, `salesOrderId`, and `cursorId` contract.
- Reuses `inventories.setSalesInventoryLineFulfillmentHold` and `inventories.shipAvailableSalesInventory`.
- No new API endpoint, schema, database field, permission, or inventory `*V2` query was added for this table migration.

## Validation
- 2026-07-17 density/scroll validation:
  - `bun test apps/www/src/components/tables-2/inventory-partial-shipments/migration-parity.test.ts` passed with 4 tests / 25 assertions.
  - `bun test apps/www/src/components/tables-2` passed with 306 tests / 2553 assertions.
  - Focused Biome passed for Partial Shipments columns, parity test, and `table-configs`.
  - Filtered `@gnd/www` typecheck grep produced no touched-file diagnostics for Partial Shipments or `table-configs`.
  - Direct local GET route smoke returned `200` for `/inventory/partial-shipments` in 20.6s; the first HEAD smoke timed out and the `3011` HTTPS proxy was not listening.
  - Browser proof on the authenticated local route confirmed a `45px` header, `56px` data rows, table-owned vertical/horizontal scroll (`scrollTop 0 -> 650`, `scrollLeft 0 -> 220`), and no document-level horizontal overflow.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.
- `bun test apps/www/src/components/tables-2/inventory-partial-shipments/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 6 tests / 22 assertions.
- `bun test apps/www/src/components/tables-2/*/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 87 tests / 752 assertions.
- Runtime static scan found no live `components/tables/skeleton`, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, old item card-map, or blocker card-map usage in the partial-shipment route/table surface.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for the touched partial-shipment table, route, workspace, registry, and audit files while broad typecheck remains subject to existing unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/partial-shipments` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.

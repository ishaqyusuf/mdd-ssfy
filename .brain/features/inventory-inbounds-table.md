# Inventory Inbounds Table

## Purpose
`/inventory/inbounds` is the receiving workspace for inbound shipments, linked order demand, document extraction, and stock receipt posting.

## Current Behavior
- The route uses the restarted Sales Orders table standard through `apps/www/src/components/tables-2/inventory-inbounds/*` for the primary inbound shipment queue.
- The route shell is `PageShell` + `HydrateClient` + `ScrollableContent` + `batchPrefetch` + `getInitialTableSettings("inventory-inbounds")`.
- The workspace keeps existing summary cards, selected inbound detail, receiving line actions, supplier receiving tray, reorder suggestions, reconciliation panel, and activity panel.
- The table consumes `components/tables-2/core` without changing core: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, DnD headers, resize handles, sticky columns, persisted sizing/order/visibility/dividers, and horizontal pagination controls.
- Compact/content-tailored layout uses compact table style, 64px rows, a sticky Inbound column, a sticky Actions column, and explicit widths for Inbound, Status, Orders, Counts, Dates, Progress, and Actions.
- Row click and the Review action select the inbound shipment and drive the existing detail/receiving panel; linked order cells still open the sales overview Inventory tab.

## Data Contract
- Reuses `inventories.inboundShipments` with the existing status/supplier filter contract.
- Reuses existing page queries for suppliers, inbound demand queue, reorder suggestions, reconciliation, selected shipment detail, documents, extractions, and activity.
- No new API endpoint, schema, database field, permission, or inventory `*V2` query was added for this table migration.

## Validation
- `bun test apps/www/src/components/tables-2/inventory-inbounds/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 6 tests / 22 assertions.
- `bun test apps/www/src/components/tables-2/*/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 84 tests / 733 assertions.
- Runtime static scan found no live `components/tables/skeleton`, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, legacy shipment card-map, or `ScrollArea` queue use in the inbounds route/table surface.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for the touched inbounds table, route, workspace, registry, and audit files while broad typecheck remains subject to existing unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/inbounds` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.

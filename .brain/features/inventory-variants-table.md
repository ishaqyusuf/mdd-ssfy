# Inventory Variants Table

## Purpose
`/inventory/variants` is the operator workspace for reviewing inventory-backed variants across stock, pricing, supplier, status, and low-stock signals.

## Current Behavior
- The route uses the restarted Sales Orders table standard through `apps/www/src/components/tables-2/inventory-variants/*`.
- The route shell is `PageShell` + `HydrateClient` + `ScrollableContent` + `batchPrefetch` + `getInitialTableSettings("inventory-variants")`.
- The workspace keeps its existing search/filter controls and summary cards above the table.
- The table consumes `components/tables-2/core` without changing core: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, DnD headers, resize handles, sticky columns, persisted sizing/order/visibility/dividers, and horizontal pagination controls.
- Compact/content-tailored layout uses 64px rows, a sticky Variant column, a sticky Actions column, and explicit widths for Variant, Stock, Pricing, Supplier, Attributes, Status, and Actions.
- The Attributes column is hidden by default so the main variant table stays compact while keeping variant detail available through column visibility.
- Existing row actions are preserved as compact icon actions for dashboard, edit item, and stock operations.

## Data Contract
- Reuses `inventories.inventoryVariantsWorkspace` with the existing finite `limit`, filter, and `cursorId` contract.
- The table consumes the workspace query result instead of mounting a second query, so summary cards and rows stay aligned.
- No new API endpoint, schema, database field, permission, or inventory `*V2` query was added for this table migration.

## Validation
- `bun test apps/www/src/components/tables-2/*/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 78 tests / 698 assertions.
- Runtime static scan found no live `components/tables/skeleton`, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, `IntersectionObserver`, or legacy `VariantCard` use in the variants route/table surface.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for the touched variants table, route, workspace, registry, and audit files while broad typecheck remains subject to existing unrelated baseline errors.
- `git diff --check` passed.
- Local HTTP GET smoke returned `200` for `/inventory/variants` and `/inventory/variants?inventoryId=1` on `127.0.0.1:3010`.

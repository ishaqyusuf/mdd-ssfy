# Sales Accounting Table

## Current Route
- `/sales-book/accounting`
  - renders `apps/dashboard/src/components/tables-2/sales-accounting/*`
  - reuses the existing `sales.getSalesAccountings` list query
  - reuses the existing `loadSalesAccountingFilterParams` / `useSalesAccountingFilterParams` URL filter contract
  - reuses the existing `SalesAccountingHeader`, `SearchFilterAdapter`, export action, report menu, and resolution-center link
- `/sales-book/accounting/resolution-center`
  - now renders `apps/dashboard/src/components/tables-2/sales-resolution/*`
  - see `.brain/features/sales-resolution-center-table.md` for the dedicated resolution-center table behavior and validation notes

## Migration Notes
- This is a table UI migration only.
- No new sales accounting `*V2` query was added.
- No new sales accounting filter params or filter metadata route were added.
- `apps/dashboard/src/components/tables-2/core/*` was not changed.
- The route now uses `batchPrefetch` plus `HydrateClient`, `Suspense`, and `ErrorBoundary`, and no longer blocks first paint on `filters.salesAccounting` metadata.
- The new table keeps row selection backed by the existing `useSalesAccountingStore` so `SalesAccountingExport` continues to read selected customer transaction ids.
- The 2026-07-17 density pass aligned the table mechanics with Sales Orders by adding `useScrollHeader(parentRef)`, `useTableDnd(table)`, `DndContext`, `SortableContext`, `DraggableHeader`, a select-all header checkbox, compact `56px` rows, and tighter content-fit widths while preserving the accounting query/filter/selection/export and row-open contracts.
- The 2026-07-29 customer/layout pass added the existing transaction customer to the list contract, placed Customer after Description, aligned the large-screen actions inside the Midday search toolbar, removed duplicate route padding, and increased the table-owned scroll viewport to the shared `calc(100vh - 240px + var(--header-offset, 0px))` height.
- The old route table `apps/dashboard/src/components/tables/sales-accounting/data-table.tsx` was removed after import scans.
- The customer transaction subtable and Transaction Overview modal no longer import the legacy `components/tables/sales-accounting/*` paths; current import scans only find the old customer-transaction path inside negative migration-parity assertions.
- The global Transaction Overview modal now renders dedicated `tables-2/transaction-overview-applications` and `tables-2/transaction-overview-payments` modules with compact modal-fit widths and settings hydrated from the clean-code layout.

## Table Behavior
- Columns include:
  - select
  - date
  - amount
  - description
  - customer
  - order number
  - sales rep
  - processed by
  - payment status
  - sub total
  - labor
  - delivery
  - actions
- Row clicks preserve the existing `openSalesAccountingId` URL state.
- Search uses the existing `q` URL param through the current accounting search filter.

## Density And Widths
- Table config: `TABLE_CONFIGS["sales-accounting"]` uses `style: "compact"` and `rowHeight: 56`.
- Sticky columns: Select `50px`, Date `118/180/136`.
- Amount width: `104/150/118`.
- Description width: `180/360/220`.
- Customer width: `180/340/220`.
- Order # width: `140/260/170`.
- Sales Rep width: `112/190/136`.
- Processed By width: `112/180/130`.
- Payment Status width: `130/220/150`.
- Sub Total width: `104/150/118`.
- Labor and Delivery widths: `92/132/104`.
- Actions width: `64/64`.

## Validation
- 2026-07-29 customer/layout proof:
  - Focused API and Sales Accounting parity coverage passed with 6 tests / 65 assertions.
  - Targeted Biome passed for all seven touched test and dashboard files; `git diff --check` passed.
  - The API typecheck remains blocked only by the existing `apps/api/src/instrument.ts` Sentry event typing errors. The dashboard-wide typecheck remains blocked by its existing broad baseline; neither run reported a diagnostic in the touched accounting files.
  - Authenticated browser proof at `1440x900` confirmed the Customer column and live names, one-row aligned toolbar, `24px` content inset below the app header, a `660px` table viewport, vertical scroll `0 -> 620` with the table header pinned, horizontal scroll `0 -> 414`, and preserved row opening/column visibility.
  - Authenticated browser proof at `390x844` confirmed no document-level horizontal overflow, table-owned `1720px` horizontal content, Customer data, and pinned-header vertical scrolling.
- 2026-07-17 accounting density proof:
  - Focused Sales Accounting parity test passed with 4 tests / 50 assertions.
  - Full `apps/dashboard/src/components/tables-2` suite passed with 301 tests / 2475 assertions.
  - Focused Biome passed for the accounting table files and `table-configs`.
  - Touched-path `@gnd/dashboard` typecheck scan produced no diagnostics.
  - Browser proof on `/sales-book/accounting?size=20` confirmed `56px` rows, `45px` header, vertical table-owned overflow/scroll (`scrollTop 0 -> 600`), horizontal table-owned overflow/scroll (`scrollWidth 1500`, `clientWidth 1146`, `scrollLeft 0 -> 354`), and `--header-offset` changing from `0px` to `70px`.
  - Screenshot evidence saved at `/private/tmp/gnd-sales-accounting-table.jpg`.
- 2026-07-17:
  - Transaction Overview modal restart validation passed: focused parity tests passed with 3 tests / 48 assertions; full restarted table parity suite passed with 169 tests / 1666 assertions; targeted Biome passed; touched-file filtered `@gnd/dashboard` typecheck grep reported no diagnostics; JSX-aware static scan found no raw table import/markup in the modal; `components/tables-2/core/*` had no diff.
- 2026-06-16:
  - focused Biome check passed for the accounting route/header/filter hook/table module/settings/config files.
  - filtered `@gnd/dashboard` typecheck grep reported no touched-file diagnostics for the accounting migration files.
  - stale route table import scan found no remaining imports of `components/tables/sales-accounting/data-table`.
  - `apps/dashboard/src/components/tables-2/core/*` had no diff.
  - browser smoke as Pablo Cruz / Super Admin confirmed desktop `/sales-book/accounting`, visible `Search Sales Accountings...`, table rows, existing `q=08492PC` search narrowing, row-click `openSalesAccountingId=11139`, mobile `390x844` no document-level overflow, and table-owned horizontal scrolling.

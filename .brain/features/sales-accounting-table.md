# Sales Accounting Table

## Current Route
- `/sales-book/accounting`
  - renders `apps/www/src/components/tables-2/sales-accounting/*`
  - reuses the existing `sales.getSalesAccountings` list query
  - reuses the existing `loadSalesAccountingFilterParams` / `useSalesAccountingFilterParams` URL filter contract
  - reuses the existing `SalesAccountingHeader`, `SearchFilterAdapter`, export action, report menu, and resolution-center link

## Migration Notes
- This is a table UI migration only.
- No new sales accounting `*V2` query was added.
- No new sales accounting filter params or filter metadata route were added.
- `apps/www/src/components/tables-2/core/*` was not changed.
- The route now uses `batchPrefetch` plus `HydrateClient`, `Suspense`, and `ErrorBoundary`, and no longer blocks first paint on `filters.salesAccounting` metadata.
- The new table keeps row selection backed by the existing `useSalesAccountingStore` so `SalesAccountingExport` continues to read selected customer transaction ids.
- The old route table `apps/www/src/components/tables/sales-accounting/data-table.tsx` was removed after import scans.
- The old `apps/www/src/components/tables/sales-accounting/columns.tsx` remains because the customer transaction subtable still imports it.

## Table Behavior
- Columns include:
  - select
  - date
  - amount
  - description
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

## Validation
- 2026-06-16:
  - focused Biome check passed for the accounting route/header/filter hook/table module/settings/config files.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics for the accounting migration files.
  - stale route table import scan found no remaining imports of `components/tables/sales-accounting/data-table`.
  - `apps/www/src/components/tables-2/core/*` had no diff.
  - browser smoke as Pablo Cruz / Super Admin confirmed desktop `/sales-book/accounting`, visible `Search Sales Accountings...`, table rows, existing `q=08492PC` search narrowing, row-click `openSalesAccountingId=11139`, mobile `390x844` no document-level overflow, and table-owned horizontal scrolling.

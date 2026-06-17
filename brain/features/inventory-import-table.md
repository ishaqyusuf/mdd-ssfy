# Inventory Import Diagnostic Table

## Status
Validated migration slice, 2026-06-16.

The `/inventory/imports` control-center page now renders its diagnostic scope table through `apps/www/src/components/tables-2/inventory-import/*` while preserving the existing import control-center workflow.

## Behavior
- The route stays at `/inventory/imports`; no `/v2` route was added.
- The page keeps `InventoryImportControlCenter` as the owning workspace component.
- The diagnostic table uses the already-loaded `trpc.inventories.inventoryImports` result from the control center instead of issuing a duplicate table fetch.
- Existing filter params are preserved through `loadInventoryImportFilterParams` and `useInventoryImportFilterParams`.
- Existing import actions, health checks, scope mode, run tracking, reset/check/update actions, and summary cards remain outside the table render path.
- The table supports persisted table-2 column visibility, sizing, ordering, dividers, sticky category column behavior, and virtualized rows.
- The empty diagnostic-table state offers the existing "all scopes" view instead of inventing a new filter contract.

## Constraints Preserved
- No new inventory import `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- Cleanup removed the old `apps/www/src/components/tables/inventory-import/*` files only after import scans found no remaining consumers.

## Validation
- Focused Biome passed for the imports route, control center, new `tables-2/inventory-import` files, and table settings/config files.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched imports route/table/control-center/settings/config files while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans found no remaining references to `components/tables/inventory-import` or `tables/inventory-import`.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the import slice.
- HTTP smoke returned `200` for `http://localhost:3000/inventory/imports`.
- Browser smoke passed with the Pablo Cruz / Super Admin `PC` account signal:
  - desktop `/inventory/imports` rendered the control center, scope breakdown, active-scope diagnostic table headers, no app error, and no document-level horizontal overflow.
  - desktop `/inventory/imports?scope=all` rendered the all-scope diagnostic table headers and virtualized rows below the control-center summary.
  - desktop `/inventory/imports?scope=all&q=door` preserved the existing URL search contract without adding a visible header filter.
  - mobile `390x844` `/inventory/imports?scope=all` rendered virtualized rows, no app error, no document-level horizontal overflow, and table-owned horizontal scrolling.
- The imports route now awaits the existing `inventories.inventoryImports` prefetch and the control center reads it with `useSuspenseQuery`, fixing the observed server/client hydration mismatch without adding a new query or filter contract.

# Inventory Categories Table

## Status
Migrated on 2026-06-16 as part of the route-level tables-2 standard migration.

## Route
- `/inventory/categories`

## Current Implementation
- Table module: `apps/www/src/components/tables-2/inventory-categories/*`
- Existing query: `inventories.inventoryCategories`
- Existing filters: `inventoryFilterParamsSchema`, `loadInventoryFilterParams`, and `useInventoryFilterParams`
- Existing header/search: `CategoryHeader` with the existing inventory Midday search filter surface
- Table settings id: `inventory-categories`

## Migration Notes
- This is a table UI migration only.
- No new inventory category `*V2` query was added.
- No new inventory category filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- The route defaults the existing `productKind` filter to `inventory` when the URL has no product-kind filter.
- The existing `CategoryHeader` remains the page header and now exposes the existing `q` filter through a category-specific `Search Categories` placeholder.
- The stock-mode toggle preserves the existing `updateCategoryStockMode` mutation and invalidation targets.
- Edit/delete actions preserve the existing inventory category sheet and delete mutation flow.
- Legacy files under `apps/www/src/components/tables/inventory-categories/*` were removed after import scans found no remaining consumers.

## Validation
- Focused Biome passed for the inventory categories route, header, search filter, table settings/config, and new inventory-categories `tables-2` files.
- Full `@gnd/www` typecheck remains blocked by existing workspace baseline errors; filtered output had no diagnostics for the touched category route/table/header/settings/config files.
- Import scans found no remaining references to the deleted legacy inventory-categories table folder.
- `apps/www/src/components/tables-2/core/*` had no diff.
- In-app Browser smoke passed in the Pablo Cruz / Super Admin session:
  - desktop `/inventory/categories` rendered the existing `Search Categories` field, table headers, category rows, and no document-level overflow.
  - `/inventory/categories?q=door` kept the search value and narrowed rows.
  - mobile `/inventory/categories` at `390x844` had no document-level overflow and kept horizontal scrolling inside the table container.
  - `/inventory/categories?productKind=component` preserved the existing filter state and rendered the no-results state without an app error.

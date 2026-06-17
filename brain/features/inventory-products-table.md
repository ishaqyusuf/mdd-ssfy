# Inventory Products Table

## Status
Migrated on 2026-06-16 as part of the route-level tables-2 standard migration.

## Routes
- `/inventory`
- `/inventory/components`

## Current Implementation
- Table module: `apps/www/src/components/tables-2/inventory-products/*`
- Existing query: `inventories.inventoryProducts`
- Existing filters: `loadInventoryFilterParams` and `useInventoryFilterParams`
- Existing header/search: `InventoryHeader` and `InventorySearchFilter`
- Table settings id: `inventory-products`

## Migration Notes
- This is a table UI migration only.
- No new inventory `*V2` query was added.
- No new inventory filter params or filter metadata endpoint were added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- `/inventory` defaults the shared table to `productKind: "inventory"` when the URL has no product-kind filter.
- `/inventory/components` defaults the shared table to `productKind: "component"` when the URL has no product-kind filter.
- The existing `InventoryHeader` is reused for both routes and now receives the route default product kind so add actions and the segmented product-kind control stay aligned with the active page.
- Row clicks preserve the existing `/inventory/[id]` detail navigation.
- The table uses typed TanStack columns, stable inventory row ids, persisted column settings, virtualized rows, sticky product column behavior, empty/no-results states, and the existing infinite inventory list query.
- Legacy files under `apps/www/src/components/tables/inventory-products/*` were removed after import scans found no remaining consumers.

## Validation
- Focused Biome passed for the inventory routes, header, validation fixture panel, table settings/config, and new inventory-products `tables-2` files.
- Full `@gnd/www` typecheck remains blocked by existing workspace baseline errors; filtered output had no diagnostics for the touched inventory route/table/header/settings/config files.
- Import scans found no remaining references to the deleted legacy inventory-products table folder.
- `apps/www/src/components/tables-2/core/*` had no diff.
- In-app Browser smoke passed in the Pablo Cruz / Super Admin session:
  - desktop `/inventory` rendered `Inventories | GND`, the existing `Search Inventories` field, table headers, inventory rows, and no document-level overflow.
  - `/inventory?q=Validation` kept the search value and narrowed to validation inventory rows.
  - mobile `/inventory` at `390x844` had no document-level overflow and kept horizontal scrolling inside the table container.
  - desktop `/inventory/components` rendered `Components | GND`, component rows, the existing search field, and no document-level overflow.
  - `/inventory/components?q=Validation` rendered the existing no-results state with the search value preserved.
  - mobile `/inventory/components` at `390x844` had no document-level overflow and kept horizontal scrolling inside the table container.

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

## Embedded Product Form Variant Grid
- 2026-07-17 update: `apps/www/src/components/forms/inventory-products/product-variants.tsx` now uses `components/tables-2/inventory-product-form-variants/*` for the variant grid inside the inventory product form.
- The embedded grid preserves the existing filtered variant data, selected variant URL params, variant pricing panel, status mutation, and stock-monitor conditional columns.
- The old inline `@gnd/ui/table` markup, page/window sticky header state, `IntersectionObserver` load-more behavior, and Show More pagination were removed from the form.
- The selected variant detail/pricing panel renders below the table instead of as an expanded virtual row, keeping the table at fixed row heights while preserving the existing pricing workflow.
- Table settings id: `inventory-product-form-variants`.
- The embedded table uses compact 52px rows, a sticky Variant column, a sticky right Actions column, content-fit widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, horizontal pagination, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.

## Embedded Product Form Sub-Components Grid
- 2026-07-17 update: `apps/www/src/components/forms/inventory-products/category-sub-components-section.tsx` now uses `components/tables-2/inventory-product-form-sub-components/*` for the Door Builder Components grid inside the inventory product form.
- The embedded grid preserves add-row behavior, component-category selection, default product selection, sub-component status toggling, delete confirmation, and the existing inventory sub-component mutations.
- The old inline `@gnd/ui/table` / `table-sm` markup and incomplete row-sortable wrapper were removed from the parent form.
- Table settings id: `inventory-product-form-sub-components`.
- The embedded table uses compact 52px rows, sticky Handle and Category columns, a sticky right Actions column, content-fit widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, horizontal pagination, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.

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
- 2026-07-17 embedded form validation:
  - focused Biome passed for the touched product form, embedded table module, parity test, and table settings/config files.
  - focused Inventory Product form variants plus inventory products/variants parity tests passed with 7 tests / 16 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 237 tests / 2337 assertions.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next and HTTPS proxy smokes returned `200` for `/inventory`.
  - static scan found no `@gnd/ui/table`, inline `<Table*>`, `IntersectionObserver`, `Show More Variants`, or `scrolledPast` usage in `product-variants.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
- 2026-07-17 embedded sub-components form validation:
  - focused Biome passed for the touched parent form, embedded table module, parity test, and table settings/config files.
  - focused Inventory Product sub-components plus variant-grid parity tests passed with 8 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 241 tests / 2337 assertions.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next and HTTPS proxy smokes returned `200` for `/inventory`.
  - static scan found no `@gnd/ui/table`, `table-sm`, inline `<Table*>`, `SortableContext`, `useSortable`, or `SubCategoryValues` usage in `category-sub-components-section.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

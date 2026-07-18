# Inventory Suppliers Table

## Purpose
The Inventory Suppliers workspace lets operators search, create, edit, delete, sync, and review suppliers used by inventory pricing, receiving, and Dyke door supplier matching.

## Current Behavior
- Route: `/inventory/suppliers`
- Route shell: `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("inventory-suppliers")`.
- Data contracts stay on the existing inventory supplier APIs:
  - `inventories.inventorySuppliers`
  - `inventories.inventorySupplierDykeReview`
  - `inventories.syncInventorySuppliersFromDyke`
  - `inventories.saveInventorySupplier`
  - `inventories.deleteInventorySupplier`
- The supplier manager still supports embedded inventory product-form usage, including per-product default supplier selection.
- Save, delete, and Dyke sync actions invalidate the supplier directory and Dyke review queries so the table/search surface stays fresh.

## Tables-2 Migration
- Table module: `apps/www/src/components/tables-2/inventory-suppliers/*`
- The old item-list supplier rows were replaced with a `tables-2` table using:
  - `VirtualRow`
  - table-owned scroll
  - sticky Supplier column
  - action column with Default/Edit/Delete actions
  - DnD column ordering
  - resize handles
  - persisted column visibility, sizing, order, and column dividers
- `components/tables-2/core/*` remains unchanged.

## Compact Column Model
- Row height: `56px`
- Style: `compact`
- Supplier: `220/420/280`
- Contact: `170/280/210`
- Address: `220/420/280`
- Actions: `92/120/104`

## Validation
- Focused Biome passed for the route, manager, table module, and table registry files.
- Focused Inventory Suppliers parity tests passed with 5 tests / 43 assertions.
- Full restarted table parity suite passed with 180 tests / 1757 assertions.
- Broad `@gnd/www` typecheck still exits nonzero from existing baseline errors, but the touched-file filtered scan reported no diagnostics for inventory suppliers or table registry files.
- Static scans found no live old supplier item-list/manual fetch patterns in the route or manager.
- `git diff --check` passed.
- `apps/www/src/components/tables-2/core` diff stayed clean.

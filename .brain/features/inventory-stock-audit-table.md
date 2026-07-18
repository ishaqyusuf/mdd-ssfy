# Inventory Stock Audit Table

## Purpose
`/inventory/stocks` is the manual stock operations workspace. The stock adjustment form stays operational, while the repeatable audit verification matrix now uses the restarted `tables-2` table standard.

## Current Behavior
- The route follows the restarted Sales Orders table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("inventory-stock-audit")`.
- The manual stock adjustment form remains unchanged except for accessible label/input associations.
- The audit verification section renders `components/tables-2/inventory-stock-audit/*` instead of mapped bordered rows.
- Posting a stock adjustment invalidates `inventories.stockAuditVerificationReport` so the audit counts refresh after the mutation.

## Table Contract
- Data source: `trpc.inventories.stockAuditVerificationReport`.
- Mutation preserved: `trpc.inventories.adjustInventoryStock`.
- Table id: `inventory-stock-audit`.
- Compact settings:
  - row height: `56`
  - header height: `45`
  - sticky columns: `Category`
  - tailored widths: Category `160/260/190`, Expected `190/300/220`, Movements `104/150/118`, Logs `92/132/104`, Change `104/150/118`, Status `104/150/118`
  - Change and Status badges use compact `h-6` / `text-[11px]` sizing.
- No new stock-audit query, filter endpoint, permission, database field, route fork, or `components/tables-2/core` change was added.

## Validation
- 2026-07-17 density/width validation:
  - `bun test apps/www/src/components/tables-2/inventory-stock-audit/migration-parity.test.ts` passed with `3` tests and `32` assertions.
  - `bun test apps/www/src/components/tables-2` passed with `306` tests and `2570` assertions.
  - Focused Biome passed for the stocks route, operations page, stock-audit table files, parity test, and table config.
  - Filtered `@gnd/www` typecheck grep reported no stock-audit/table-config diagnostics.
  - `git diff --check` passed for the touched stock-audit files, and `components/tables-2/core` stayed unchanged.
  - Direct local HTTP GET smoke returned `200` for `http://127.0.0.1:3010/inventory/stocks`; the portless HTTPS route timed out after 60s with zero bytes and `https://gndprodesk.localhost:3011` was not listening.
  - Authenticated browser proof confirmed a `45px` header, `56px` rows, table-owned vertical scroll (`scrollTop 0 -> 63`), no document-level horizontal overflow, and no table horizontal overflow at the current desktop width because the compact columns fit the container.
- Initial migration validation:
  - Focused Biome passed for the stocks route, operations page, table files, registry files, audit file, and parity test.
  - Focused stock-audit/page audit tests passed with `6` tests and `31` assertions.
  - Full restarted table parity suite passed with `99` tests and `841` assertions.
- Runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, manual fetch, shared sticky header, `IntersectionObserver`, or old `rows.map((row)` audit-row usage in the stocks route surface.
- Local HTTP GET smoke returned `200` for `/inventory/stocks` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.

# Inventory Kind Review Table

## Purpose
`/inventory/review` is the admin review workspace for comparing each inventory item's current `productKind` with the pricing-based suggested kind before or after running the product-kind backfill.

## Current Behavior
- The route now follows the restarted Sales Orders table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("inventory-kind-review")`.
- The repeatable review list renders through `components/tables-2/inventory-kind-review/*` instead of card-mapped rows.
- The page keeps the existing summary cards, heuristic copy, and `backfillInventoryProductKinds` action above the table.
- The old lazy wrapper that imported `components/tables/skeleton` was removed.
- The old page-level `IntersectionObserver` load-more behavior was replaced by table-owned infinite scroll.

## Table Contract
- Data source: `trpc.inventories.inventoryProductKindReview`.
- Default route prefetch: `{ size: 24, sort }`.
- Mutation preserved: `trpc.inventories.backfillInventoryProductKinds`.
- Table id: `inventory-kind-review`.
- Compact settings:
  - row height: `56`
  - header height: `45`
  - sticky columns: `Item`, `Actions`
  - tailored widths: Item `200/380/250`, Category `150/260/180`, Current `104/150/118`, Suggested `112/170/128`, Evidence `140/220/160`, Counts `120/170/136`, Status `112/170/128`, Actions `84/112/96`
  - kind/status badges use compact `h-6 px-2 text-[11px]` sizing, and row actions use compact icon-only `size-7` buttons.
- No new inventory review `*V2` query, filter endpoint, permission, database field, or route fork was added.

## Validation
- Focused Biome passed for the review route, workspace, table files, registry files, audit file, and parity test.
- Focused review/page audit tests passed with `6` tests and `24` assertions.
- Full restarted table parity suite passed with `96` tests and `813` assertions.
- Runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, manual fetch, shared sticky header, `IntersectionObserver`, lazy wrapper, or old `rows.map((row)` card-list usage in the review route surface.
- Filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; broad typecheck remains subject to unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/review` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
- 2026-07-17 density pass validation: focused Kind Review parity tests passed with `3` tests and `25` assertions; full `apps/www/src/components/tables-2` tests passed with `306` tests and `2566` assertions; focused Biome passed for the Kind Review columns/test and table config; filtered `@gnd/www` typecheck grep produced no Kind Review/table-config diagnostics; `apps/www/src/components/tables-2/core` diff stayed clean. HTTPS route smoke timed out after `60s` with zero bytes, but authenticated browser proof on `https://gndprodesk.localhost/inventory/review` confirmed a `45px` header, `56px` data rows, table-owned vertical/horizontal scroll (`scrollTop 0 -> 650`, `scrollLeft 0 -> 50`), and no document-level horizontal overflow.

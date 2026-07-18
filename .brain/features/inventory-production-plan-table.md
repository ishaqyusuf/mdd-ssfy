# Inventory Production Plan Table

## Purpose
`/inventory/production-plan` is the inventory-backed production planning workspace for reviewing which sale components need production attention, stock/inbound coverage, and supplier follow-up.

## Current Behavior
- The route now follows the restarted Sales Orders table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("inventory-production-plan")`.
- The repeatable production component list renders through `components/tables-2/inventory-production-plan/*` instead of card-mapped component rows.
- Summary cards, readiness filters, supplier/status group cards, and the print-production action remain outside the table.
- Row clicks still open the sales overview production tab for the order.
- The table consumes `components/tables-2/core` without changing core: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, DnD headers, resize handles, sticky columns, persisted sizing/order/visibility/dividers, and horizontal pagination controls.

## Table Contract
- Data source: `trpc.inventories.salesProductionPlan`.
- Default route prefetch: `{ limit: 150, readinesses: null }`.
- Table id: `inventory-production-plan`.
- Compact settings:
  - row height: `56`
  - header height: `45`
  - sticky columns: `Component`, `Actions`
  - default hidden column: `Received`
  - tailored widths: Component `200/380/250`, Order `160/280/190`, Line `190/340/230`, Readiness `124/190/140`, Stock `136/220/160`, Supplier `150/260/180`, Coverage `190/300/220`, Received `104/150/118`, Actions `104/140/116`
  - component, readiness, and stock badges use compact row sizing, and the Open action uses `h-8 px-2 text-xs`.
- No new inventory production `*V2` query, filter endpoint, permission, database field, or route fork was added.

## Validation
- Focused Biome passed for the production-plan route, workspace, table files, registry files, audit file, and parity test.
- Focused production-plan/page audit tests passed with `6` tests and `22` assertions.
- Full restarted table parity suite passed with `93` tests and `792` assertions.
- Runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, manual fetch, shared sticky header, `IntersectionObserver`, or old `components.map((component)` card list usage in the production-plan route surface.
- Filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; broad typecheck remains subject to unrelated baseline errors.
- Local HTTP GET smoke returned `200` for `/inventory/production-plan` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
- 2026-07-17 density pass validation: focused Production Plan parity tests passed with `3` tests and `23` assertions; full `apps/www/src/components/tables-2` tests passed with `306` tests and `2562` assertions; focused Biome passed for the Production Plan columns/test and table config; filtered `@gnd/www` typecheck grep produced no Production Plan/table-config diagnostics; `apps/www/src/components/tables-2/core` diff stayed clean. Follow-up proof returned `200` for direct local HTTP, and authenticated browser validation on `https://gndprodesk.localhost/inventory/production-plan` confirmed a `45px` header, `56px` rows, table-owned horizontal scroll (`scrollLeft 0 -> 260`, `scrollWidth 1486`, `clientWidth 1131`), and no document-level horizontal overflow. Current authenticated data had only two production component rows, so vertical row-scroll movement could not be exercised in this follow-up.

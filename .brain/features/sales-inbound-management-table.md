# Sales Inbound Management Table

## Status
- 2026-06-16: `/sales-book/inbound-management` is migrated to the `tables-2` table standard.
- 2026-07-17: `/sales-book/inbound-management` was retuned for the Sales Orders/Midday compact density target with narrower content-fit widths, `56px` rows, table-owned scroll-header offset behavior, and draggable headers.
- 2026-07-17: `/sales-book/inbounds` is migrated to the restarted `tables-2` table standard for the primary inbound shipment queue.
- 2026-07-22: `/sales-book/inbounds` is now the canonical operational route for inbound shipment workspaces. Search (`q`), status (`status`), and selected shipment (`inboundId`) state are URL-backed, and inbound-management navigation/action links target this route while the legacy route remains available.

## Route
- Canonical operational route: `/sales-book/inbounds`
- Compatibility route: `/sales-book/inbound-management` remains available for legacy management views.

## Frontend Implementation
- Route: `apps/www/src/app/(sidebar)/(sales)/sales-book/inbound-management/page.tsx`
- Table module: `apps/www/src/components/tables-2/inbound-management/*`
- Header: `apps/www/src/components/inbound-header.tsx`
- Search filter: `apps/www/src/components/inbound-search-filter.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky order column, column visibility/settings, table-owned vertical and horizontal scrolling, `useScrollHeader(parentRef)` header-offset behavior, DnD column order, draggable headers, empty state, no-results state, and the existing inbound row-open and packing-list preview action flows.

## Inbound Management Density
- Table config: `TABLE_CONFIGS["inbound-management"]` uses `style: "compact"` and `rowHeight: 56`.
- Sticky Order column width: `132/220/154`.
- Customer width: `180/340/220`.
- Sales Rep width: `86/140/104`.
- Status width: `116/180/132`.
- Actions width: `64/64`.
- The table intentionally fits the five-column desktop layout without horizontal overflow when the container is wide enough; narrower containers still use table-owned horizontal scrolling.

## Sales Book Inbounds Workspace
- Route: `apps/www/src/app/(sidebar)/(sales)/sales-book/inbounds/page.tsx`
- Workspace: `apps/www/src/components/sales-inbounds-workspace.tsx`
- Table module: `apps/www/src/components/tables-2/sales-inbounds/*`
- The route now uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("sales-inbounds")`.
- The primary inbound shipment selector no longer uses hand-mapped collapsible cards. It renders through `tables-2/sales-inbounds` with compact `64px` rows, sticky Inbound/Actions columns, tailored Inbound/Status/Order/Counts/Dates/Progress/Actions widths, `VirtualRow`, table-owned scroll, DnD headers, resize handles, horizontal pagination, and persisted visibility/sizing/order/dividers.
- Existing `inventories.inboundShipments`, local search/status filtering, analytics cards, selected-inbound detail, status update, receive-stock, linked order cards, stock-line cards, and activity history behavior are preserved.
- The workspace uses the standard `SearchFilterTRPC` input and stores `q`, `status`, and `inboundId` in the URL so deep links and browser back/forward preserve the active queue state.
- Sidebar links and inventory-owned inbound-management row actions now open `/sales-book/inbounds`, optionally carrying `inboundId` for direct shipment selection.

## Contracts Reused
- Existing list query: `trpc.sales.inboundIndex`
- Existing summary query: `trpc.sales.inboundSummary`
- Existing server filter loader: `loadInboundFilterParams`
- Existing client filter hook: `useInboundFilterParams`
- Existing filter metadata: `trpc.filters.inbound` through `InboundSearchFilter`
- Existing URL-driven inbound view state: `viewInboundId` and `payload`
- Existing general inbound shipment contracts reused by `/sales-book/inbounds`:
  - `trpc.inventories.inboundShipments`
  - `trpc.inventories.inboundShipmentDetail`
  - `trpc.inventories.inboundActivity`
  - `trpc.inventories.updateInboundShipmentStatus`
  - `trpc.inventories.receiveInboundShipment`

No new inbound `*V2` query, filter param, filter metadata endpoint, or table route was added for this migration.

## Cleanup
Removed after import scans:
- `apps/www/src/components/tables/inbound-managment/data-table.tsx`
- `apps/www/src/components/tables/inbound-managment/columns.tsx`

`apps/www/src/components/tables-2/core/*` was not modified.

## Validation
- Focused Biome check passed for the inbound route, header, filter hooks, table settings/config, and new inbound-management table files.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for touched inbound route/table/header/hook/config files.
- Import scans found no remaining references to `components/tables/inbound-managment`, `tables/inbound-managment`, or `inbound-managment`.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- Browser smoke used Quick Login as Pablo Cruz / Super Admin:
  - desktop `1440x900` rendered the page, `PC` account signal, search field, table headers, and table rows with no document-level horizontal overflow.
  - search for `08492PC` updated the URL to `q=08492PC` and narrowed to one row.
  - mobile `390x844` rendered without document-level horizontal overflow, and the table owned horizontal scrolling.
  - row click set `viewInboundId=22996` plus payload query state without app errors.
- 2026-07-17 inbound-management density proof:
  - Focused migration parity test passed with 4 tests / 43 assertions.
  - Full `apps/www/src/components/tables-2` suite passed with 297 tests / 2425 assertions.
  - Focused Biome passed for the inbound-management table files and `table-configs`.
  - Touched-path `@gnd/www` typecheck scan produced no diagnostics.
  - Browser proof on `/sales-book/inbound-management?size=20` confirmed `56px` rows, `45px` header, vertical table-owned overflow/scroll (`scrollHeight 2285 -> 2355`, `scrollTop 0 -> 600`), and `--header-offset` changing to `70px` during scroll.
  - Desktop table width fit the visible container (`scrollWidth 1146`, `clientWidth 1146`), so no horizontal overflow was needed for the current five-column layout.
  - Screenshot evidence saved at `/private/tmp/gnd-inbound-management-table.png`.
- `/sales-book/inbounds` follow-up validation:
  - Focused parity test passed with 3 tests / 40 assertions.
  - Full restarted `tables-2` suite passed with 216 tests / 2249 assertions.
  - Targeted Biome passed for the route, workspace, table module, and table registry files.
  - Static runtime scans found no `filteredShipments.map`, `<Collapsible`, old table import, shared sticky header, or manual fetch patterns in the route/workspace/table surface.
  - Filtered `@gnd/www` typecheck grep reported no diagnostics for `sales-inbounds`, the route, workspace, or table registry files while broad typecheck remains blocked by unrelated baseline errors.
  - HTTPS route smoke returned `200` for `/sales-book/inbounds`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
- 2026-07-22 URL/canonical-route slice:
  - Focused Sales Book Inbounds parity and sidebar tests passed with 13 tests / 83 assertions.
  - Targeted Biome passed for the workspace, inbound-management actions, sidebar links, and parity test.
  - `bun run --cwd apps/www typecheck` and `git diff --check` passed.
  - Authenticated browser interaction proof remains pending for deep-link selection, search/status back-forward behavior, and the retargeted row action.

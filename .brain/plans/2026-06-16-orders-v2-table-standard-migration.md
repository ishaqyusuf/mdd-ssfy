# Tables-2 Sales Orders Standard Migration Plan

## Objective
Migrate route-level table pages in `apps/www` to the current `components/tables-2/sales-orders` standard while preserving existing page routes, page queries, filter params, filter metadata, and header components. This is a UI/table-module migration, not a query-contract or `/v2` route migration.

## Assumptions
- The latest table standard is `apps/www/src/components/tables-2/sales-orders/*`.
- "Orders V2 standard" means the `tables-2/sales-orders` component architecture and interaction pattern, not a mandate to add new `/v2` pages.
- `/sales-book/orders` is the canonical sales orders page. `/sales-book/orders/v2` exists only as a compatibility redirect while links/bookmarks settle.
- The richer `tables-2/sales-orders` table is the migration target, not the older unused `components/tables/sales-orders-v2` implementation.
- Existing list queries already return data compatible with the new table system. Do not add a new `*V2` query just to migrate a table.
- Existing filter params and filter metadata already work. Do not add new filter params or new `filters.*V2` endpoints just to migrate a table.
- Existing `sales.getOrdersV2`, `sales.getOrdersV2Summary`, and `filters.salesOrdersV2` are part of the current sales orders implementation, but they must not become the naming pattern for every migrated page.
- Existing page header components should be reused. If a header needs alignment, make it use the same search-filter presentation pattern as Orders V2 while preserving its existing filter schema and data source.
- `apps/www/src/components/tables-2/core/*` is frozen for this migration. Do not modify the core folder in any way.
- Scope starts with route-level list/table pages in `apps/www`. Print/PDF document tables, small static tables inside forms/modals, and one-off report layouts are not forced into the table standard unless they use the legacy shared table systems or become route-level operational lists.
- Cleanup happens only after import scans, route parity, and validation prove the old code is unused.

## Current Audit Highlights
- Current standard:
  - Canonical route: `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/page.tsx`
  - Compatibility redirect: `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/v2/page.tsx`
  - Table: `apps/www/src/components/tables-2/sales-orders/*`
  - Core primitives, used as-is: `apps/www/src/components/tables-2/core/*`
  - Settings/config, extend only if needed by a migrated table: `apps/www/src/utils/table-settings.ts`, `apps/www/src/utils/table-configs.ts`, `apps/www/src/hooks/use-table-settings.ts`
- Standards already present in Orders V2:
  - existing URL filter loader plus `loadSortParams`
  - existing tRPC infinite query consumed through TanStack Query
  - route-level `batchPrefetch`, `HydrateClient`, `Suspense`, and `ErrorBoundary`
  - `SearchFilterTRPC` header pattern
  - `useSuspenseInfiniteQuery`, `useReactTable`, `useVirtualizer`, `useInfiniteScroll`
  - stable `getRowId`, sticky columns, draggable/resizable columns, persisted visibility/sizing/order, bottom bar, empty states, skeleton
- Current migration boundaries:
  - Add only new domain table folders under `apps/www/src/components/tables-2/<domain>/*`.
  - Reuse existing route queries and filter hooks.
  - Reuse existing page headers.
  - Do not change `components/tables-2/core`.
  - 2026-06-30 core exception: `components/tables-2/core` now owns configurable table style padding and config-driven row/header height consumption so migrated domains do not duplicate spacing and height constants.
  - The older `apps/www/src/components/tables/sales-orders-v2/*` directory was unused by imports and has been removed.
  - `apps/www/src/components/tables/.DS_Store` was a tracked filesystem artifact and has been removed.
- Legacy table generations still active:
  - `@gnd/ui/data-table` wrappers used by most `apps/www/src/components/tables/*` tables.
  - `apps/www/src/components/(clean-code)/data-table/*`, mostly as legacy cell/search-param support.
  - `apps/www/src/components/_v1/data-table/*`, `apps/www/src/components/common/data-table/*`, and `apps/www/src/app/_components/data-table/*` still have live or `app-deps` consumers.

## Detailed Execution Plan

### Phase 0: Lock The Table Standard Without Core Changes
1. Treat `tables-2/sales-orders` as the source implementation.
   - Standard domain table folder:
     - `columns.tsx`
     - `data-table.tsx`
     - `table-header.tsx`
     - `skeleton.tsx`
     - `empty-states.tsx`
     - optional `bottom-bar.tsx` or `batch-actions.tsx`
   - Standard route integration:
     - keep the current route query
     - keep the current filter loader/hook
     - keep the current header component
     - switch only the table import/rendering to `components/tables-2/<domain>`
2. Freeze `components/tables-2/core`.
   - Do not extract a generic header into core.
   - Do not alter `VirtualRow`, `TableSkeleton`, `types`, `empty-states`, `bottom-bar`, or any other core file.
   - If a domain needs a modified header, keep that change inside `components/tables-2/<domain>/table-header.tsx`.
3. Add or reuse table settings only where required by the Orders V2 table behavior.
   - Prefer minimal table config additions outside core.
  - Do not block a migration on broad table-registry redesign.
  - 2026-06-30 update: current `tables-2` domains should consume `TABLE_CONFIGS[tableId]` for sticky columns, sort maps, non-reorderable columns, row height, header height, and table style. Existing migrated domains are set to compact style.
  - 2026-06-30 update: `components/tables-2/core/table-sizes.ts` owns reusable local column size tokens (`xs`, `sm`, `md`, `lg`, and `custom`) plus `sizeClass(...)` for `meta.className`. Current migrated `tables-2` column definitions use those tokens for TanStack sizing and table cell width classes, while `TABLE_CONFIGS` sticky widths reference the same size source where applicable.
  - 2026-06-30 update: `TableColumnMeta.contentClassName` is available for inner cell content alignment. Select/checkbox columns use it to center row checkboxes while header select-all cells add `justify-center` in their local header classes.
4. Create a migration checklist per domain.
   - Track route, old table component, existing query, existing filter hook, existing header, new `tables-2` folder, cleanup candidate, validation status.
5. Validation.
   - `rg` import scan for table systems before and after each migration.
   - Focused typecheck or touched-file diagnostic scan where broad typecheck is blocked.
   - Route import smoke for migrated route and table modules.
   - Browser smoke after each high-risk route family.

Decision point: if a table needs behavior that Orders V2 does not already support outside core, defer that behavior or implement it in the domain table folder. Do not change `components/tables-2/core`.

### Phase 1: Sales Orders Canonical Route And Immediate Cleanup
1. Treat `/sales-book/orders` as the canonical proof page.
2. Keep `apps/www/src/components/tables-2/sales-orders/*` as the canonical implementation.
3. Confirm `components/tables/sales-orders-v2/*` has no runtime imports.
4. Delete only after confirmation:
   - `apps/www/src/components/tables/sales-orders-v2/columns.tsx`
   - `apps/www/src/components/tables/sales-orders-v2/data-table.tsx`
5. Remove accidental filesystem artifacts such as `apps/www/src/components/tables/.DS_Store`.
6. Keep `/sales-book/orders/v2` as a redirect to `/sales-book/orders` that preserves query params.
7. Validation.
   - `rg "tables/sales-orders-v2|components/tables/sales-orders-v2" apps/www/src packages apps/api/src`
   - route smoke for `/sales-book/orders`
   - redirect smoke for `/sales-book/orders/v2`
   - focused table/settings typecheck or touched-file diagnostic scan

Decision point: completed. `/sales-book/orders` imports the `tables-2/sales-orders` table directly, and `/sales-book/orders/v2` redirects for compatibility.

Phase 1 evidence captured on 2026-06-16:
- Static import scan found no remaining imports of `components/tables/sales-orders-v2` or `tables/sales-orders-v2`.
- Focused Biome check passed for:
  - `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/page.tsx`
  - `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/v2/page.tsx`
  - `apps/www/src/components/sales-orders-v2-header.tsx`
  - `apps/www/src/components/sales-tabs.tsx`
- `bun test apps/www/src/components/sidebar-links.test.ts` passed.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/sales-book/orders`
  - compatibility redirect `/sales-book/orders/v2?search=08499`
  - mobile viewport `390x844`
- Known baseline validation blockers outside this route normalization:
  - full `@gnd/www` typecheck still reports broad pre-existing workspace errors; filtered output for touched route/table/header files did not mention the migrated orders route or table header.
  - `apps/www/src/lib/routing/redirect-engine.test.ts` currently expects `/production/dashboard`, while the app redirects to `/production/dashboard/v2`; this production-route expectation predates the orders route cleanup.

### Phase 2: Sales List Family
Migrate sales tables first because they share the Orders table model and affect revenue/operations.

Routes and tables:
- `/sales-book/orders`, `/sales-book/orders/bin`
  - old table: `components/tables/sales-orders/*`
  - target: `/sales-book/orders` already renders `components/tables-2/sales-orders`; evaluate `/sales-book/orders/bin` separately with its current query/filter/header before adding a bin-specific `tables-2` wrapper.
  - status 2026-06-16 update: `/sales-book/orders/bin` now renders the actual route with `components/tables-2/sales-orders/*`, the existing `SalesOrdersV2Header`, and the existing `sales.getOrdersV2` query path with `bin` enabled. `sales.getOrdersV2` already accepted `bin` through pagination; its adapter now passes that existing flag into the legacy sales query. No new route, query, filter param, filter metadata endpoint, or core table change was added.
- `/sales-book/quotes`, `/sales-book/quotes/bin`
  - old table: `components/tables/sales-quotes/*`
  - target: add `components/tables-2/sales-quotes/*` and reuse the existing quotes query, filters, and `sales-quote-header`.
  - status 2026-06-16: `/sales-book/quotes` now renders `components/tables-2/sales-quotes/*` on the canonical route, using the existing `sales.quotes` query, existing `loadOrderFilterParams` / `useOrderFilterParams`, existing `SalesQuoteSearchFilter`, and existing quote row action contracts. The route hydrates only the visible quotes table page; filter metadata stays in the existing lazy header adapter.
  - status 2026-07-16 update: `/sales-book/quotes/bin` and the `/sales-rep` quote embed also render `components/tables-2/sales-quotes/*`; there are no remaining live route/embed imports of the legacy quote table.
  - status 2026-06-16 update: `/sales-book/quotes/bin` now renders the same `components/tables-2/sales-quotes/*` table with `bin` enabled on the actual route. It keeps the existing header/search/filter contracts and does not add a `/v2` route. The bin route intentionally avoids a server-side deleted-quote prefetch after validation showed that waiting for the bin dataset delayed first bytes; the client table still uses the existing `sales.quotes` query through the shared table module.
- `/sales-book/customers`
  - old table: `components/tables/customers/*`
  - target: add `components/tables-2/customers/*` and reuse the existing customers query, filters, and `customer-header`.
  - status 2026-06-16 update: `/sales-book/customers` now renders `components/tables-2/customers/*` on the canonical route, using the existing `sales.customersIndex` query, existing `loadCustomerFilterParams` / `useCustomerFilterParams`, existing `CustomerSearchFilter`, and existing `CustomerHeader` surface. `/sales-book/customers/v2` is a compatibility redirect to `/sales-book/customers` that preserves query params. No new route-level table query, filter param, filter metadata endpoint, or core table change was added.
  - status 2026-07-17 embedded customer overview update: the legacy/customer-overview sheet Pay Portal pending-payments table and Sales List quote table now render `components/tables-2/customer-pay-portal/*` and `components/tables-2/customer-sales-list/*` instead of inline `table-sm`/manual skeleton table surfaces. Both embedded tables keep existing queries/context, use compact 48px rows, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, horizontal pagination, local column visibility controls, and content-tailored widths. No new customer query, quote query, route fork, or core table change was added.
  - status 2026-07-17 embedded customer overview Sales Workspace update: `customer-sales-workspace.tsx` now renders `components/tables-2/customer-sales-workspace/*` instead of its inline `@gnd/ui/table`. The table keeps the existing `customers.getCustomerOverviewV2` workspace data, filters, row-open behavior, selected bulk email/delete behavior, and SalesMenu actions while adding table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, horizontal pagination, local column visibility controls, compact 40px rows, and tighter content-fit widths. No new customer overview query, route fork, or core table change was added.
- `/sales-book/dispatch`, `/sales-book/dispatch/v2`, `/sales-book/dispatch-admin`, `/sales-book/dispatch-task`
  - old table: `components/tables/sales-dispatch/*`
  - target: add `components/tables-2/sales-dispatch/*` and reuse the existing dispatch queries, filters, and dispatch headers.
  - status 2026-06-16 update: `/sales-book/dispatch`, `/sales-book/dispatch-admin`, and `/sales-book/dispatch-task` now render `components/tables-2/sales-dispatch/*` with the existing `dispatch.index` / `dispatch.assignedDispatch` queries, existing `loadDispatchFilterParams` / `useDispatchFilterParams`, existing `DispatchHeader` / `AdminDispatchHeader`, and existing dispatch search filters. `/sales-book/dispatch/v2` is a compatibility redirect to `/sales-book/dispatch` that preserves query params. No new dispatch query, filter param, filter metadata endpoint, or core table change was added.
  - status 2026-07-17 density update: the dispatch table now uses tighter content-fit widths, `56px` compact rows, and `useScrollHeader(parentRef)` while preserving the existing dispatch route/query/filter/header contracts. The row height remains taller than Sales Orders/Quotes because dispatch rows include the schedule picker, two-line ship-to/progress content, and status/driver menus.
- `/sales-book/inbound-management`
  - old table: `components/tables/inbound-managment/*`
  - target: add `components/tables-2/inbound-management/*` and reuse the existing inbound query/filter/header.
  - status 2026-06-16 update: `/sales-book/inbound-management` now renders `components/tables-2/inbound-management/*` on the actual route, using the existing `sales.inboundIndex` query, existing `sales.inboundSummary` summary queries, existing `loadInboundFilterParams` / `useInboundFilterParams`, and existing `InboundHeader` / `InboundSearchFilter`. No `/v2` route, new inbound query, filter param, filter metadata endpoint, or core table change was added.
  - status 2026-07-17 density update: the inbound-management table now uses tighter content-fit widths, `56px` compact rows, `useScrollHeader(parentRef)`, and draggable headers while preserving the existing inbound route/query/filter/header contracts, packing-list preview action, and URL-driven row-open behavior.
- `/sales-book/accounting`
  - old table: `components/tables/sales-accounting/*`
  - target: add `components/tables-2/sales-accounting/*` and reuse existing accounting queries/filter/header.
  - status 2026-06-16 update: `/sales-book/accounting` now renders `components/tables-2/sales-accounting/*` on the actual route, using the existing `sales.getSalesAccountings` query, existing `loadSalesAccountingFilterParams` / `useSalesAccountingFilterParams`, existing `SalesAccountingHeader`, existing `SearchFilterAdapter`, and existing export/report/resolution actions. No accounting `*V2` query, filter param, filter metadata endpoint, `/v2` route, or core table change was added.
  - status 2026-07-17 density update: the accounting table now uses tighter content-fit widths, `56px` compact rows, `useScrollHeader(parentRef)`, DnD/`DraggableHeader`, and a select-all header checkbox while preserving the existing accounting route/query/filter/header contracts, row selection/export behavior, and `openSalesAccountingId` row-open behavior.
- `/sales-book/accounting/resolution-center`
  - old table: one-column `components/resolution-center/*` wrapper using `@gnd/ui/data-table`
  - target: add `components/tables-2/sales-resolution/*` and reuse the existing `sales.getSalesResolutions` / `sales.getSalesResolutionsSummary` query contracts, `filters.salesResolutions`, and `SalesResolutionHeader`.
  - status 2026-07-16 update: `/sales-book/accounting/resolution-center` now renders `components/tables-2/sales-resolution/*` with compact 64px rows, sticky select/order columns, content-tailored widths, table-owned scroll, DnD, resize, persisted settings, column visibility, and a selected-row bottom bar. The payment detail/review content renders below the table instead of inside virtual rows so the table keeps fixed-height scroll behavior. No resolution `*V2` query, new route, or core table change was added.
  - status 2026-07-17 density update: the resolution-center table now uses tighter content-fit widths and `56px` compact rows while preserving the existing resolution route/query/filter/header contracts, row selection, sync-due action, and detail panels outside virtual rows.
- `/sales-book/top-selling-products`, `/product-report`
  - old table: `components/tables/sales-statistics/*`
  - target: add `components/tables-2/sales-statistics/*` only if these remain route-level table pages after review.
  - status 2026-06-16 update: both routes now render `components/tables-2/sales-statistics/*` on the actual pages, using the existing `sales.getProductReport` query, existing `loadProductReportFilterParams` / `useProductReportFilters`, and existing `ProductReportHeader` / `ProductReportSearchFilter`. No product-report `*V2` query, filter param, filter metadata endpoint, `/v2` route, or core table change was added. The old `components/tables/sales-statistics/*` files were removed after import scans found no remaining consumers.
  - status 2026-07-17 density update: both routes now use the restarted route shell with `ScrollableContent`, and the `sales-statistics` table now has Sales Orders-style `useScrollHeader(parentRef)`, DnD/`DraggableHeader`, resize, header-offset spacer, tighter product/report metric widths, and compact `56px` rows while preserving the existing product-report query, filter params, header, grid/table toggle, and product-detail row-open behavior.
- `/sales-book/shelf-items`
  - old table: manual `@gnd/ui/table` product rows inside `components/sales-book/shelf-items-manager.tsx`
  - target: add `components/tables-2/shelf-items/*` and reuse the existing `salesShelfItems.listProducts` / `salesShelfItems.listCategories` contracts plus existing product/category mutations.
  - status 2026-07-17 update: `/sales-book/shelf-items` now renders `components/tables-2/shelf-items/*` through the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("shelf-items")`. Product rows use compact 64px table-core rows, sticky Product/Actions columns, and content-tailored Product/Category/Price/Status/Actions widths while preserving create, edit, active/hidden toggles, category toggles, local filters, and page controls. No shelf-items `*V2` query, filter endpoint, route fork, database change, or core table change was added.
  - status 2026-07-17 density update: `/sales-book/shelf-items` now uses tighter Product/Category/Price/Status/Actions widths, smaller product thumbnails, sticky Product/Actions columns, and compact `56px` rows while preserving the existing shelf product/category management route, local filters, mutations, refresh behavior, and table-core contract.
- `/sales-book/emails`
  - old table: Card-wrapped manual `@gnd/ui/table` delivery-attempt list inside `components/sales-email-ledger-page.tsx`
  - target: add `components/tables-2/sales-email-ledger/*` and reuse the existing `emails.salesEmailAttempts` / `emails.resendSalesEmailAttempt` contracts plus the existing sales-email permissions.
  - status 2026-07-17 update: `/sales-book/emails` now renders `components/tables-2/sales-email-ledger/*` through the restarted route shell with `HydrateClient`, `batchPrefetch`, and `getInitialTableSettings("sales-email-ledger")`. Rows use compact 64px table-core layout, sticky Status/Actions columns, and content-tailored Status/Recipient/Sales/Subject/Rep/Provider/Actions widths while preserving search, status filtering, refresh, pagination, and Super Admin resend behavior. No email `*V2` query, filter endpoint, route fork, database change, permission change, or core table change was added.
  - status 2026-07-17 density update: `/sales-book/emails` now uses compact `56px` rows, flattened one-line status timestamp metadata, and tighter Status/Recipient/Sales/Subject/Rep/Provider/Actions widths while preserving the existing email attempt query, local filters, refresh, pagination, Super Admin resend behavior, and table-core contract.
- Sales rep widgets and recent-sales embeds
  - status 2026-07-16 update: `/sales-rep` Recent Sales and Recent Quotes now render `components/tables-2/sales-orders/*` and `components/tables-2/sales-quotes/*` in embedded single-page mode, with active-tab `batchPrefetch`, `getInitialTableSettings("sales-orders" | "sales-quotes")`, and no legacy `components/tables/sales-orders` or `components/tables/sales-quotes` route/embed imports.
  - status 2026-07-17 update: `/sales-rep?tab=commission` now renders `components/tables-2/sales-rep-commission-payments/*` and `components/tables-2/sales-rep-commissions/*` for the Commission Payments and Pending Commissions cards. The route initializes both commission table settings in parallel with the existing order/quote settings, and the old `components/tables` helper-table imports, hidden raw table demo rows, no-op `ActionCell` columns, and placeholder card lists were removed from the live commission tab. Both commission tables use compact 56px rows, sticky Payment/Commission columns, tailored payment/commission widths, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, and persisted visibility/sizing/order/divider settings. No commission `*V2` query, route fork, database change, or core table change was added.

Steps per route family:
1. Identify the existing route query, filter hook/loader, and header component.
2. Add `apps/www/src/components/tables-2/<domain>/*`.
3. Port columns from the old folder into typed `tables-2` columns.
4. Wire `data-table.tsx` to the existing query and existing filter hook.
5. Reuse the existing header component. If needed, adjust only its presentation so it follows the sales orders `SearchFilterTRPC` experience while keeping its filter schema/data source.
6. Update the route to render the new `tables-2` table.
7. Keep existing query invalidation keys; do not add new query names.
8. Use stable `getRowId`; never key operational rows by index.
9. Move row actions into small components and stop event propagation inside action cells.
10. Validation:
    - route import smoke
    - browser smoke on desktop and mobile widths
    - search/filter smoke with existing filters
    - focused tests for sales payment, dispatch, production, or status derivation only if row actions or domain behavior are touched

Decision point: for each sales route, choose direct table replacement vs redirect only after the table UI and row actions match current behavior. Do not create new query/filter contracts as part of that choice.

Phase 2 quotes evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/sales-quotes/*`.
- Updated `/sales-book/quotes` to render the new table directly without adding a `/v2` route.
- Reused existing quote query/filter contracts:
  - `trpc.sales.quotes.infiniteQueryOptions`
  - `loadOrderFilterParams`
  - `useOrderFilterParams`
  - `SalesQuoteSearchFilter` / `filters.salesQuotes` lazy header metadata
- Reused the existing page header surface and added only the table-settings column visibility control required by the `tables-2` pattern.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Legacy quote table imports remain only for known unmigrated surfaces:
  - `/sales-book/quotes/bin`
  - `/sales-rep` quote tab/embed
- Validation:
  - focused Biome check passed for the quotes route, quote header, new `tables-2/sales-quotes` files, and table settings/config files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched quotes route/table/header/config files; the full `@gnd/www` gate remains subject to existing workspace baseline errors.
  - import scan confirmed the canonical quotes route no longer imports `components/tables/sales-quotes`.
  - `git status --short apps/www/src/components/tables-2/core` and `git diff -- apps/www/src/components/tables-2/core` were clean.
  - Browser smoke passed on `http://127.0.0.1:3000/sales-book/quotes` as Pablo Cruz / Super Admin: desktop render, mobile `390x844`, no document-level horizontal overflow, table-owned horizontal scrolling, existing `Search quote information...` field, and `q=03214LM` search narrowing to the matching quote row.

Phase 2 orders-bin evidence captured on 2026-06-16:
- Updated `/sales-book/orders/bin` to render `components/tables-2/sales-orders/*` directly.
- Reused existing orders contracts:
  - `SalesOrdersV2Header`
  - `salesOrdersV2FilterParams`
  - `useSalesOrdersV2FilterParams`
  - `trpc.sales.getOrdersV2` from the shared orders table module with `bin: true`
- Did not add a `/v2` route, new query, new filter param, or new filter metadata endpoint.
- Updated the existing `sales.getOrdersV2` adapter to pass its existing `bin` input through to the legacy sales query.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- The route no longer imports `components/tables/sales-orders`; the 2026-07-16 sales-rep embed migration removed the remaining live legacy sales-order route/embed import.
- Validation:
  - focused Biome check passed for `apps/api/src/db/queries/sales-orders-v2.ts`, `apps/www/src/components/tables-2/sales-orders/data-table.tsx`, and `/sales-book/orders/bin`.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched orders route/table/header files.
  - `curl` returned `200` for `/sales-book/orders/bin` and a regression probe returned `200` for `/sales-book/orders`.
  - Browser smoke passed on `/sales-book/orders/bin` in the Pablo Cruz / Super Admin session: desktop render, visible `Search order number, customer, phone, address, or P.O...` field, table rows, mobile `390x844` with no document-level overflow and table-owned horizontal scrolling, and search debounce updated the URL to `q=08489PC` while narrowing to the matching row.

Phase 2 shelf-items evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/shelf-items/*`.
- Updated `/sales-book/shelf-items` to render the restarted table directly and removed the unused lazy manager wrapper.
- Reused existing shelf-items contracts:
  - `trpc.salesShelfItems.listProducts.queryOptions`
  - `trpc.salesShelfItems.listCategories.queryOptions`
  - existing product/category create, update, toggle, and refresh invalidation behavior
- Kept filtering local to the existing manager state and did not add a new route-level filter endpoint or sort contract.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the shelf-items route, manager, new `tables-2/shelf-items` files, page audit test, and table registry files.
  - focused shelf-items/page audit tests passed with 7 tests / 50 assertions.
  - 2026-07-17 density validation: focused shelf-items migration-parity tests passed with 4 tests / 48 assertions; full `apps/www/src/components/tables-2` suite passed with 305 tests / 2524 assertions; focused Biome passed for shelf-items columns, migration-parity test, and `table-configs`; touched-file typecheck scan produced no diagnostics; touched-file `git diff --check` passed; `components/tables-2/core` stayed untouched; browser proof on `/sales-book/shelf-items` confirmed `56px` rows, `45px` header, table-owned vertical/horizontal overflow and scroll (`scrollTop 0 -> 600`, `scrollLeft 0 -> 100` at 760px), header offset `0px -> 70px`, no document-level horizontal overflow, and screenshot evidence at `/private/tmp/gnd-shelf-items-table.jpg`.
  - full restarted table parity suite passed with 111 tests / 1014 assertions.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched shelf-items/table registry/audit files while the broad typecheck remains subject to existing workspace baseline errors.
  - static scans found no live legacy skeleton/manual fetch/lazy-manager/manual row-map usage in the shelf-items route surface.
  - HTTP/HTTPS smokes returned `200` for `/sales-book/shelf-items`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Phase 2 sales-email-ledger evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/sales-email-ledger/*`.
- Updated `/sales-book/emails` to render the restarted table directly instead of the manual Card-wrapped `@gnd/ui/table`.
- Reused existing email ledger contracts:
  - `trpc.emails.salesEmailAttempts.queryOptions`
  - `trpc.emails.resendSalesEmailAttempt.mutationOptions`
  - existing sales-email visibility and Super Admin resend rules
- Kept filtering on the existing `q`, `status`, `page`, and `size` query contract; no route-level filter endpoint or sort contract was added.
- Registered `sales-email-ledger` in table settings/config with compact 64px rows, sticky Status and Actions columns, and content-tailored delivery-audit widths.
- 2026-07-17 density update: `sales-email-ledger` now uses compact `56px` rows, a `160px` sticky Status column, flattened status timestamp text, and tighter Recipient/Sales/Subject/Rep/Provider/Actions widths (`180/320/220`, `128/220/150`, `200/420/260`, `128/220/150`, `136/240/160`, `104/132/116`).
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the emails route, ledger wrapper, new `tables-2/sales-email-ledger` files, page audit test, and table registry files.
  - focused sales-email-ledger/page audit tests passed with 6 tests / 39 assertions.
  - full restarted table parity suite passed with 114 tests / 1050 assertions.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched sales-email-ledger/table registry/audit files while the broad typecheck remains subject to existing workspace baseline errors.
  - static scans found no live manual table or route-level fetch usage in the emails route wrapper.
  - HTTP/HTTPS smokes returned `200` for `/sales-book/emails`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - 2026-07-17 density validation: focused sales-email-ledger migration-parity tests passed with 3 tests / 39 assertions; full `apps/www/src/components/tables-2` suite passed with 305 tests / 2527 assertions; focused Biome passed for sales-email-ledger columns, migration-parity test, and `table-configs`; touched-file typecheck scan produced no diagnostics; touched-file `git diff --check` passed; `components/tables-2/core` stayed untouched; HTTP route smoke returned `200` for `/sales-book/emails`.
  - 2026-07-17 browser-proof follow-up: after the local `SalesEmailAttempt` table was added, authenticated browser validation loaded `/sales-book/emails` with temporary local proof rows and confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 1515`, `clientHeight 439`), table-owned horizontal scroll (`scrollLeft 0 -> 70`, `scrollWidth 1216`, `clientWidth 1146`), no document-level horizontal overflow, and no login/runtime error. The `32` proof rows were deleted afterward and the local ledger returned to `0` rows.

Phase 2 quote-bin evidence captured on 2026-06-16:
- Updated `/sales-book/quotes/bin` to render `components/tables-2/sales-quotes/*` directly.
- Reused existing quote contracts:
  - `SalesQuoteHeader`
  - `SalesQuoteSearchFilter`
  - `useOrderFilterParams`
  - `useSortParams`
  - `trpc.sales.quotes` from the shared quotes table module with `bin: true`
- Did not add a `/v2` route, new query, new filter param, or new filter metadata endpoint.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- The route no longer imports `components/tables/sales-quotes`; the 2026-07-16 sales-rep embed migration removed the remaining live legacy quote route/embed import.
- Validation:
  - focused Biome check passed for the quote-bin route and shared quotes table files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched quote-bin/quotes table files.
  - `curl` returned `200` for `/sales-book/quotes/bin`.
  - Browser smoke passed on desktop and mobile `390x844` in the Pablo Cruz / Super Admin session: title `Quotes Bin | GND`, visible `Search quote information...` field, table shell/rows after data settled, no document-level mobile overflow, and search debounce updated the URL to `q=03214LM`.

Phase 2 quote table follow-up evidence captured on 2026-06-16:
- Removed the P.O column from `apps/www/src/components/tables-2/sales-quotes/columns.tsx` for the actual quotes table pages.
- Removed the leftover P.O column and mobile PO badge from the then-live legacy `apps/www/src/components/tables/sales-quotes/columns.tsx` module used by the sales-rep quote embed, without changing quote query/filter contracts. The 2026-07-16 sales-rep embed migration later moved that embed to `tables-2/sales-quotes`.
- Preserved existing quote search/filter params, including the existing P.O filter/search contract; this is a table-column cleanup only.
- Added `apps/www/src/components/tables-2/sales-quotes/sort.ts` to normalize quote sort params to existing query-safe fields and removed the derived `displayName` customer sort from the quote table config.
- Did not add a new query, filter param, filter metadata endpoint, or core table change.
- Validation:
  - focused Biome check passed for the touched quote route/table/config files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched quote files.
  - static scan found no remaining P.O column/mobile PO renderers in either `components/tables-2/sales-quotes` or `components/tables/sales-quotes`, and no remaining `displayName` quote sort mapping.
  - Browser smoke as Pablo Cruz / Super Admin confirmed `/sales-book/quotes` desktop and mobile `390x844` headers no longer include P.O, no document-level mobile overflow, and stale `sort=displayName.asc` no longer triggers the existing `sales.quotes` query error.

Quotes density/width tuning evidence captured on 2026-07-17:
- Tightened `/sales-book/quotes` after the restarted Sales Orders parity pass while preserving the existing quote route/query/filter/header contracts and keeping `components/tables-2/core` unchanged.
- `TABLE_CONFIGS["sales-quotes"].rowHeight` remains the canonical compact `40`.
- Current content-fit widths are Quote # `sizes.custom(150, 280, 180)`, Customer `sizes.custom(180, 340, 220)`, Phone `sizes.custom(112, 170, 128)`, Address `sizes.custom(180, 360, 240)`, Invoice `sizes.custom(104, 160, 118)`, Status `sizes.custom(104, 150, 116)`, Sales rep `sizes.custom(86, 130, 96)`, and Actions `sizes.custom(144, 144)`.
- Actions intentionally stays `144px` because the quote row renders edit, open, preview, and more icon controls.
- Validation:
  - focused Sales Quotes plus Sales Rep embed parity tests passed with 8 tests / 97 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 289 tests / 2343 assertions.
  - focused Biome passed for touched Quotes/embed files.
  - touched-file typecheck scan produced no diagnostics.
  - authenticated browser smoke on `/sales-book/quotes` confirmed `40px` rows, table-owned vertical overflow/scroll, and table-owned horizontal overflow/scroll.
  - screenshot evidence was saved at `/private/tmp/gnd-sales-quotes-table.png`.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.

Phase 2 customers evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/customers/*`.
- Updated `/sales-book/customers` to render the new table directly.
- Reused existing customer contracts:
  - `CustomerHeader`
  - `CustomerSearchFilter`
  - `loadCustomerFilterParams`
  - `useCustomerFilterParams`
  - `useSortParams`
  - `trpc.sales.customersIndex`
- Converted `/sales-book/customers/v2` into a compatibility redirect to `/sales-book/customers` while preserving query params.
- Did not add a new `/v2` table route, new query, new filter param, or new filter metadata endpoint.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/customers/data-table.tsx`
  - removed `apps/www/src/components/tables/customers/columns.tsx`
  - removed the now-unreferenced `apps/www/src/components/customer-v2/customer-directory-v2-page.tsx`
- Validation:
  - focused Biome check passed for the customers route, redirect route, header, table settings/config, and new customers `tables-2` files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched customers route/table/header/config files; the full gate remains subject to existing workspace baseline errors.
  - import scans found no remaining references to `components/tables/customers` or `CustomerDirectoryV2Page`.
  - `git diff --check` passed and `git diff -- apps/www/src/components/tables-2/core` was clean.
  - `curl` GET probes returned `200` for `/sales-book/customers`, `/sales-book/orders`, and `/sales-book/quotes` after the dev server warmed.
  - Browser smoke passed in the Pablo Cruz session: desktop `1440x900` and mobile `390x844` had no document-level horizontal overflow, the table owned horizontal scrolling on mobile, the existing `Search customers` field updated the URL to `q=Amaury` and narrowed rows, `/sales-book/customers/v2?q=Amaury` redirected to `/sales-book/customers?q=Amaury`, and no customer-related console errors were reported.

Customers density/width tuning evidence captured on 2026-07-17:
- Tightened `/sales-book/customers` after the restarted Sales Orders parity pass so it no longer uses the bulkier `64px` two-line customer/avatar row.
- `TABLE_CONFIGS["customers"].rowHeight` is now `48` with compact padding; the customer cell is single-line with a `size-6` identity marker.
- Current content-fit widths are Customer `sizes.custom(180, 320, 220)`, Phone `sizes.custom(112, 170, 128)`, Secondary `sizes.custom(130, 220, 160)`, Email `sizes.custom(150, 280, 200)`, Address `sizes.custom(180, 360, 240)`, and Actions `sizes.custom(56, 64, 56)`.
- Validation:
  - focused Customers parity tests passed with 4 tests / 36 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 289 tests / 2338 assertions.
  - focused Biome passed for touched Customers/config/test files.
  - touched-file typecheck scan produced no diagnostics.
  - authenticated browser smoke on `/sales-book/customers` confirmed `48px` rows, table-owned vertical overflow/scroll, and narrow-viewport horizontal overflow/scroll.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.

Dealers density/width tuning evidence captured on 2026-07-17:
- Tightened `/sales-book/dealers` after the restarted Sales Orders parity pass so it no longer uses the bulkier `64px` two-line dealer/avatar row.
- `TABLE_CONFIGS["dealers"].rowHeight` is now `48` with compact padding; the dealer cell is single-line with a `size-6` identity marker and inline dealer id.
- The sales profile selector is now an `h-8` compact trigger with the coefficient rendered inline instead of stacked below.
- Current content-fit widths are Dealer `sizes.custom(180, 320, 220)`, Email `sizes.custom(150, 280, 200)`, Status `sizes.custom(104, 150, 116)`, Sales Profile `sizes.custom(180, 280, 210)`, Customer Link `sizes.custom(150, 280, 200)`, Created `sizes.custom(112, 170, 128)`, and Actions `sizes.custom(82, 104, 92)`.
- Validation:
  - focused Dealers parity tests passed with 5 tests / 43 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 289 tests / 2340 assertions.
  - focused Biome passed for touched Dealers/config/test files.
  - touched-file typecheck scan produced no diagnostics.
  - authenticated browser smoke on `/sales-book/dealers` confirmed `48px` rows and table-owned horizontal overflow/scroll; the local dataset has only 5 dealer rows, so natural vertical overflow was not present in this fixture.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.

Phase 2 dispatch evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/sales-dispatch/*`.
- Updated `/sales-book/dispatch`, `/sales-book/dispatch-admin`, and `/sales-book/dispatch-task` to render the new table module.
- Reused existing dispatch contracts:
  - `DispatchHeader`
  - `AdminDispatchHeader`
  - `loadDispatchFilterParams`
  - `useDispatchFilterParams`
  - `useSortParams`
  - `trpc.dispatch.index`
  - `trpc.dispatch.assignedDispatch`
  - existing driver list, bulk assign/cancel, due-date update, driver assignment, status update, submit dispatch, and sales overview open flows
- Converted `/sales-book/dispatch/v2` into a compatibility redirect to `/sales-book/dispatch` while preserving query params.
- Did not add a new dispatch `*V2` query, filter param, filter metadata endpoint, or table route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/sales-dispatch/data-table.tsx`
  - removed `apps/www/src/components/tables/sales-dispatch/columns.tsx`
  - removed `apps/www/src/components/tables/sales-dispatch/batch-actions.tsx`
- Validation:
  - focused Biome check passed for the dispatch routes, dispatch headers, table settings/config, sidebar links, and new sales-dispatch `tables-2` files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched dispatch route/table/header/config files; the full gate remains subject to existing workspace baseline errors.
  - import scans found no remaining references to `components/tables/sales-dispatch` or `tables/sales-dispatch`.
  - `git diff --check` passed and `git diff -- apps/www/src/components/tables-2/core` was clean.
  - Browser smoke passed for `/sales-book/dispatch` in the Pablo Cruz session: desktop `1440x900`, mobile `390x844`, visible search, table rows, `q=07340` search narrowing, `/sales-book/dispatch/v2?q=07340` redirect, no document-level horizontal overflow, and table-owned horizontal scrolling.
  - Browser smoke passed for `/sales-book/dispatch-admin?view=table&q=07340&size=1` on desktop and mobile after the route warmed: visible admin table/search, no document-level horizontal overflow, and table-owned horizontal scrolling.
  - `/sales-book/dispatch-task` could not be browser-smoked end-to-end in this slice because the route timed out before first byte even when temporarily reduced to a static page; this points to a pre-existing route/access/dev-server layer issue outside the table module. The migrated page now avoids server-side data prefetch and lets the existing `assignedDispatch` query resolve on the client.

Phase 2 dispatch density evidence captured on 2026-07-17:
- Tightened dispatch columns to content-fit widths:
  - Schedule `118/180/136`
  - Order `140/230/160`
  - Order Date `104/150/118`
  - Ship To `180/360/220`
  - Assigned To `132/220/160`
  - Progress `118/180/132`
  - Status `116/170/132`
  - Actions `72/72`
- Changed `TABLE_CONFIGS["sales-dispatch"].rowHeight` from `64` to `56`; kept the row taller than 40px order/quote rows because dispatch cells include interactive and two-line content.
- Added `useScrollHeader(parentRef)` to the dispatch table so table-owned scroll drives the same header-offset behavior as Sales Orders.
- Validation:
  - focused Dispatch parity test passed with 4 tests / 39 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 293 tests / 2382 assertions.
  - focused Biome passed for the touched Dispatch table and table config files.
  - touched-path `@gnd/www` typecheck scan produced no diagnostics.
  - authenticated browser proof on `/sales-book/dispatch?size=20` confirmed `56px` rows, `45px` header, vertical overflow/scroll (`scrollHeight 2005` vs `clientHeight 459`, `scrollTop 0 -> 600`), horizontal overflow/scroll (`scrollWidth 1180` vs `clientWidth 1146`, `scrollLeft 0 -> 34`), and `--header-offset` changing from `0px` to `70px`.
  - screenshot evidence saved at `/private/tmp/gnd-sales-dispatch-table.png`.

Phase 2 inbound-management evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/inbound-management/*`.
- Updated `/sales-book/inbound-management` to render the new table directly.
- Reused existing inbound contracts:
  - `InboundHeader`
  - `InboundSearchFilter`
  - `loadInboundFilterParams`
  - `useInboundFilterParams`
  - `trpc.sales.inboundIndex`
  - `trpc.sales.inboundSummary`
  - existing inbound view URL params and sales packing-list preview action
- Did not add a `/v2` route, new inbound query, new filter param, or new filter metadata endpoint.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/inbound-managment/data-table.tsx`
  - removed `apps/www/src/components/tables/inbound-managment/columns.tsx`
- Validation:
  - focused Biome check passed for the inbound route, header, filter hooks, table settings/config, and new inbound-management `tables-2` files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched inbound route/table/header/hook/config files; the full gate remains subject to existing workspace baseline errors.
  - import scans found no remaining references to `components/tables/inbound-managment`, `tables/inbound-managment`, or `inbound-managment` in `apps/www/src`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `1440x900`, visible `PC` account signal, visible `Search inbound information`, table rows and headers, no document-level horizontal overflow, and no app error.
  - Search smoke for `08492PC` updated the URL to `q=08492PC` and narrowed the table to one matching row.
  - Mobile viewport `390x844` had no document-level horizontal overflow and the table owned horizontal scrolling (`scrollWidth` 932 over `clientWidth` 340).
  - Row-click smoke preserved the existing URL-driven inbound view behavior by setting `viewInboundId=22996` and payload query state without app errors.

Phase 2 inbound-management density evidence captured on 2026-07-17:
- Tightened inbound-management columns to content-fit widths:
  - Order `132/220/154`
  - Customer `180/340/220`
  - Sales Rep `86/140/104`
  - Status `116/180/132`
  - Actions `64/64`
- Changed `TABLE_CONFIGS["inbound-management"].rowHeight` from `64` to `56` with compact table padding.
- Added `useScrollHeader(parentRef)` and DnD/`DraggableHeader` behavior so table-owned scroll and column order match Sales Orders.
- Validation:
  - focused Inbound Management parity test passed with 4 tests / 43 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 297 tests / 2425 assertions.
  - focused Biome passed for the touched inbound-management table and table config files.
  - touched-path `@gnd/www` typecheck scan produced no diagnostics.
  - authenticated browser proof on `/sales-book/inbound-management?size=20` confirmed `56px` rows, `45px` header, vertical overflow/scroll (`scrollTop 0 -> 600`), and `--header-offset` changing to `70px`.
  - desktop content-fit width produced no unnecessary horizontal overflow (`scrollWidth 1146`, `clientWidth 1146`).
  - screenshot evidence saved at `/private/tmp/gnd-inbound-management-table.png`.

Phase 2 accounting evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/sales-accounting/*`.
- Updated `/sales-book/accounting` to render the new table directly.
- Reused existing accounting contracts:
  - `SalesAccountingHeader`
  - `SearchFilterAdapter` with `salesAccountingFilterParams`
  - `loadSalesAccountingFilterParams`
  - `useSalesAccountingFilterParams`
  - `trpc.sales.getSalesAccountings`
  - existing `openSalesAccountingId` URL state
  - existing `useSalesAccountingStore` row selection used by `SalesAccountingExport`
- Did not add an accounting `*V2` query, filter param, filter metadata endpoint, or `/v2` route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/sales-accounting/data-table.tsx`
  - kept `apps/www/src/components/tables/sales-accounting/columns.tsx` because the customer transaction subtable still imports it.
- Validation:
  - focused Biome check passed for the accounting route, header, filter hook, table settings/config, and new sales-accounting `tables-2` files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched accounting route/table/header/hook/config files; the full gate remains subject to existing workspace baseline errors.
  - import scan found no remaining references to `components/tables/sales-accounting/data-table` or `tables/sales-accounting/data-table`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `1440x900`, visible `PC` account signal, visible `Search Sales Accountings...`, table rows and headers, no document-level horizontal overflow, and no app error.
  - Search smoke for `08492PC` updated the URL to `q=08492PC` and narrowed the table to one matching row.
  - Row-click smoke preserved the existing URL-driven accounting detail behavior by setting `openSalesAccountingId=11139` without app errors.
  - Mobile viewport `390x844` had no document-level horizontal overflow and the table owned horizontal scrolling (`scrollWidth` 1942 over `clientWidth` 340).

Phase 2 accounting density evidence captured on 2026-07-17:
- Tightened sales-accounting columns to content-fit widths:
  - Date `118/180/136`
  - Amount `104/150/118`
  - Description `180/360/220`
  - Order # `140/260/170`
  - Sales Rep `112/190/136`
  - Processed By `112/180/130`
  - Payment Status `130/220/150`
  - Sub Total `104/150/118`
  - Labor `92/132/104`
  - Delivery `92/132/104`
  - Actions `64/64`
- Changed `TABLE_CONFIGS["sales-accounting"].rowHeight` from `64` to `56` with compact table padding.
- Added `useScrollHeader(parentRef)`, DnD/`DraggableHeader`, `SortableContext`, and the select-all header checkbox so table-owned scroll and column order match Sales Orders.
- Validation:
  - focused Sales Accounting parity test passed with 4 tests / 50 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 301 tests / 2475 assertions.
  - focused Biome passed for the touched sales-accounting table and table config files.
  - touched-path `@gnd/www` typecheck scan produced no diagnostics.
  - authenticated browser proof on `/sales-book/accounting?size=20` confirmed `56px` rows, `45px` header, vertical overflow/scroll (`scrollTop 0 -> 600`), horizontal overflow/scroll (`scrollWidth 1500`, `clientWidth 1146`, `scrollLeft 0 -> 354`), and `--header-offset` changing from `0px` to `70px`.
  - screenshot evidence saved at `/private/tmp/gnd-sales-accounting-table.jpg`.

Phase 2 sales resolution density evidence captured on 2026-07-17:
- Tightened sales-resolution columns to content-fit widths:
  - Order `132/220/154`
  - Customer `180/340/220`
  - Issue `140/240/170`
  - Amounts `124/180/144`
  - Due `124/180/144`
  - Payments `104/150/118`
  - Sales Rep `96/150/112`
  - Actions `124/170/136`
- Changed `TABLE_CONFIGS["sales-resolution"].rowHeight` from `64` to `56` with compact table padding.
- Kept the existing Sales Orders-style mechanics in place: `useScrollHeader(parentRef)`, DnD/`DraggableHeader`, `SortableContext`, select-all header, table-owned scroll, bottom bar, and detail panels outside virtual rows.
- Validation:
  - focused Sales Resolution parity test passed with 3 tests / 43 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 301 tests / 2478 assertions.
  - focused Biome passed for the touched sales-resolution table and table config files.
  - touched-path `@gnd/www` typecheck scan produced no diagnostics.
  - authenticated browser proof on `/sales-book/accounting/resolution-center` confirmed `56px` rows, `45px` header, vertical overflow/scroll (`scrollTop 0 -> 600`), horizontal overflow/scroll (`scrollWidth 1248`, `clientWidth 1146`, `scrollLeft 0 -> 102`), and `--header-offset` changing from `0px` to `70px`.
  - screenshot evidence saved at `/private/tmp/gnd-sales-resolution-table.jpg`.

Phase 2 sales statistics/product report evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/sales-statistics/*`.
- Updated `/sales-book/top-selling-products` and `/product-report` to render the new table directly.
- Reused existing product report contracts:
  - `ProductReportHeader`
  - `ProductReportSearchFilter`
  - `productReportFilterParams`
  - `loadProductReportFilterParams`
  - `useProductReportFilters`
  - `trpc.sales.getProductReport`
- Did not add a product-report `*V2` query, filter param, filter metadata endpoint, or `/v2` route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- The table uses stable product ids, persisted column visibility/sizing/divider settings, virtualized rows, and the existing URL-backed search params. Product images are resolved locally from existing Cloudinary-style product image values to avoid re-importing the heavier sales-form image component into the report table bundle.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/sales-statistics/data-table.tsx`
  - removed `apps/www/src/components/tables/sales-statistics/columns.tsx`
  - removed `apps/www/src/components/tables/sales-statistics/column.invoice.tsx`
- Validation:
  - focused Biome check passed for the product-report routes, header, table settings/config, and new sales-statistics `tables-2` files.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for `sales-statistics`, `product-report`, `ProductReport`, `table-settings`, or `table-configs`.
  - import scan found no remaining references to `components/tables/sales-statistics` or `tables/sales-statistics`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed.
  - In-app Browser smoke passed for `/sales-book/top-selling-products`: warmed desktop route rendered title `Top Selling Products | GND`, existing `Search Product...` filter, table headers, rows, no app error, no document-level overflow, and no relative `/sales-book/<image>` product image requests after the image-source resolver fix.
  - Search URL smoke passed for `/sales-book/top-selling-products?q=door`: input value `door`, existing query param preserved, rows rendered, no app error, and no document-level overflow.
  - In-app Browser smoke passed for `/product-report` after first compile: title `Product Report | GND`, existing search filter, table headers, rows, no app error, and no document-level overflow.
  - HTTP probes returned `200 OK` for `/sales-book/top-selling-products`, `/sales-book/top-selling-products?q=door`, and `/product-report`.

Phase 2 density refresh evidence captured on 2026-07-17:
- Updated `/sales-book/top-selling-products` and `/product-report` to wrap the existing product report header/table in `ScrollableContent`.
- Updated `components/tables-2/sales-statistics/data-table.tsx` to call `useScrollHeader(parentRef)`, use `useTableDnd(table)`, wrap the table in `DndContext`, and include the Sales Orders header-offset spacer.
- Updated `components/tables-2/sales-statistics/table-header.tsx` to use `SortableContext`, `DraggableHeader`, `tableConfig.nonReorderableColumns`, horizontal pagination, and resize handles.
- Tightened product-report column widths and reduced the product image cell to `size-8`: Product `200/380/240`, Category `116/220/140`, Units `88/132/100`, Revenue/Cost/Sales `104/150/118`, and Margin `92/132/104`.
- Set `TABLE_CONFIGS["sales-statistics"].rowHeight` to `56`.
- Validation:
  - focused Sales Statistics parity test passed with 4 tests / 45 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 305 tests / 2523 assertions.
  - focused Biome passed and touched-file typecheck scan produced no diagnostics.
  - `git diff --check` passed for touched files.
  - `git diff -- apps/www/src/components/tables-2/core` stayed clean.
  - Browser proof on `http://gndprodesk.localhost:3010/sales-book/top-selling-products` at a 760px viewport showed `56px` rows, `45px` header, table-owned vertical scroll `0 -> 600`, table-owned horizontal scroll `0 -> 230`, header offset `0px -> 70px`, and no document-level horizontal overflow.
  - Browser proof on `http://gndprodesk.localhost:3010/product-report` showed the same compact table rendering with `56px` rows, `45px` header, no document-level horizontal overflow, and the shared `sales-statistics` table module.
  - Screenshot evidence saved to `/private/tmp/gnd-sales-statistics-table.jpg`.

### Phase 3: Production And Fulfillment Views
Production already has a v2 board direction and should not be forced into a table if the board/card workflow is the better product shape.

Routes:
- `/production/dashboard`
- `/production/dashboard/v2`
- `/sales-book/productions`
- `/sales-book/productions/v2`
- `/sales/packing-list`

Steps:
1. 2026-07-17 supersession: the production v2 board/list architecture is no longer treated as table-compliant for the route-level list surface. Live v2 production pages now use `ProductionWorkspace` and `components/tables-2/sales-production/*`.
2. For legacy production tables using `components/tables/sales-production/*`, add `components/tables-2/sales-production/*` and reuse the existing production queries, filters, and headers.
3. Preserve `packages/sales/src/production-v2/*` as the production read-model authority where already used.
4. Keep lazy detail queries and expanded sections as they are.
5. Do not compute production completion or assignment truth in table columns.
6. Validation:
   - route import smoke
   - existing production filter/search smoke
   - assignment/submission mutation regression tests only if row actions move
   - browser smoke for worker and admin views

Decision point: if a production page is already a better Midday-style board, mark it compliant without converting it to a grid.

Phase 3 legacy production workspace evidence captured on 2026-07-16:
- Added the domain table module under `apps/www/src/components/tables-2/sales-production/*`.
- Updated `apps/www/src/components/production-workspace.tsx` to import the new table directly, expose `SalesProductionColumnVisibility`, pass `initialTableSettings`, and render the queue table flush in the card content for compact table density.
- Updated the legacy source entry routes:
  - `/production/dashboard`
  - `/sales-book/production-tasks`
- Reused existing production contracts:
  - `ProductionWorkspace`
  - `SalesProductionSearchFilter`
  - `loadSalesProductionFilterParams`
  - `useSalesProductionFilterParams`
  - `trpc.sales.productionDashboard`
  - `trpc.sales.productionTasks`
  - `trpc.sales.productions`
- Did not add a new production query, filter param, filter metadata endpoint, or table core change.
- The new table supports worker/admin column sets, table-owned `useScrollHeader(parentRef)`, `VirtualRow`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, persisted settings, compact style, and sticky Due Date.
- `TABLE_CONFIGS["sales-production"]` owns the compact row/header height and sticky-column/non-reorderable-column config.
- Validation:
  - focused production/audit tests passed with 8 tests / 61 assertions.
  - full restarted parity suite passed with 57 tests / 471 assertions.
  - targeted Biome passed for the production routes, workspace, new table files, table settings/config, and audit tests.
  - broad `@gnd/www` typecheck remains blocked by existing unrelated API/UI baseline errors, but the touched-file typecheck filter reported no diagnostics for the production workspace/routes/table/config/test files.
  - `git diff --check` passed.
  - static scans found no legacy `components/tables/sales-production/data-table`, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, or `PageStickyHeader` usage in the restarted production route/workspace surfaces.
  - HTTP smoke for `/production/dashboard` and `/sales-book/production-tasks` returned `307` redirects to `/production/dashboard/v2`, so live runtime currently lands on the v2 board and this source-level restart is guarded by parity tests.

Phase 3 production v2 route teardown evidence captured on 2026-07-17:
- Replaced the live production v2 route-level board/list surfaces with the restarted `ProductionWorkspace` table surface:
  - `/production/dashboard/v2` now uses worker mode with `sales.productionTasks`.
  - `/sales-book/productions/v2` now uses admin mode with `sales.productions`.
  - both routes use `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `loadSalesProductionFilterParams`, and `getInitialTableSettings("sales-production")`.
  - both routes default an unfiltered queue to `production: "pending"` while preserving explicit URL filters.
- Removed live v2 route imports of:
  - `LazyProductionWorkerDashboardV2`
  - `LazyProductionAdminBoardV2`
  - `getQueryClient().fetchInfiniteQuery`
  - `sales.productionsV2`
- Flattened the production queue table surface in `ProductionWorkspace` so the queue controls sit directly above the table instead of inside a table card.
- Tightened compact production column widths:
  - Due Date `140/200/160`
  - Order # `110/170/130`
  - worker Sales `190/340/240`
  - Customer `170/320/220`
  - Assigned To `130/220/160`
  - Sales Rep `100/180/120`
  - Status `120/190/140`
  - Progress `100/150/120`
  - Actions `72/96/80`
- Added sticky right Actions styling and changed the table height from a 560px cap to the Sales Orders-style `calc(100vh - 350px + var(--header-offset, 0px))`.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the two v2 routes, production workspace, sales-production table folder, and table config.
  - focused production/page audit tests passed with 8 tests / 99 assertions.
  - static scan found no live v2 production route/table references to `LazyProduction*`, `sales.productionsV2`, `sales.productionDashboardV2`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, `@gnd/ui/data-table`, `useInfiniteQuery`, `useInView`, or `IntersectionObserver`.
  - filtered `@gnd/www` typecheck grep reported no diagnostics in the touched production v2 route/table/workspace files; broad typecheck remains blocked by unrelated baseline errors.
  - HTTP/HTTPS smokes returned `200` for `/production/dashboard/v2` and `/sales-book/productions/v2` after route warmup.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` diff stayed clean.

Phase 3 packing-list evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/packing-list/*` for `/sales/packing-list`.
- Updated the route to use `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("packing-list")`, `PackingListSkeleton`, and direct `PackingListClient` rendering behind `Suspense`.
- Removed the active route surface's dependency on the old lazy client wrapper, legacy `components/tables/skeleton`, manual route query fetching, and card-mapped `PackingListCard` list.
- Reused existing dispatch contracts:
  - `trpc.dispatch.packingList`
  - `trpc.dispatch.updateDispatchStatus`
  - existing packing-slip token/open-link flow
- Registered `packing-list` in table settings/config with compact 64px rows, sticky Order and Actions columns, and content-tailored widths for Order, Customer, Address, Phone, Sales Rep, Status, and Actions.
- The table supports table-owned `useScrollHeader(parentRef)`, `VirtualRow`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, persisted column visibility/sizing/order/dividers, client search, row-open packing-slip behavior, and the existing admin status actions.
- No dispatch `*V2` query, filter endpoint, permission, database change, route fork, or table-core change was added.
- Validation:
  - focused Biome passed for the route, client, table files, table settings/config, and audit tests.
  - focused packing-list/page audit tests passed with 7 tests / 54 assertions.
  - full restarted table parity suite passed with 107 tests / 967 assertions.
  - static scan found no legacy skeleton/manual fetch/card-grid/shared sticky header/intersection-observer patterns in the packing-list route surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics in packing-list, table registry, or audit files; broad typecheck remains blocked by unrelated baseline errors.
  - HTTP/HTTPS smokes returned `200` for `/sales/packing-list`, and `/sales/packing-list?tab=completed` after route warmup.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` diff stayed clean.

### Phase 4: Inventory Table Family
Inventory pages are operational and large, so they should migrate after the sales table platform is proven.

Routes and tables:
- `/inventory`, `/inventory/components`
  - old table: `components/tables/inventory-products/*`
  - target: add `components/tables-2/inventory-products/*` and, if needed, a components-specific wrapper using the same existing query/filter path.
  - status 2026-06-16 update: `/inventory` and `/inventory/components` now render `components/tables-2/inventory-products/*` on the actual routes, using the existing `inventories.inventoryProducts` query, existing `loadInventoryFilterParams` / `useInventoryFilterParams`, and existing `InventoryHeader` / `InventorySearchFilter`. `/inventory` defaults the existing product-kind filter to inventory rows, while `/inventory/components` defaults it to component rows. No inventory `*V2` query, filter param, filter metadata endpoint, route fork, or core table change was added. The old `components/tables/inventory-products/*` files were removed after import scans found no remaining consumers.
- `/inventory/categories`
  - old table: `components/tables/inventory-categories/*`
  - target: add `components/tables-2/inventory-categories/*`.
  - status 2026-06-16 update: `/inventory/categories` now renders `components/tables-2/inventory-categories/*` on the actual route, using the existing `inventories.inventoryCategories` query, existing `loadInventoryFilterParams` / `useInventoryFilterParams`, and existing `CategoryHeader`. The header now exposes the existing `q` filter through the same Midday search-filter surface with a category-specific placeholder. No inventory category `*V2` query, filter param, filter metadata endpoint, route fork, or core table change was added. The old `components/tables/inventory-categories/*` files were removed after import scans found no remaining consumers.
- `/inventory/imports`
  - old table: `components/tables/inventory-import/*`
  - target: add `components/tables-2/inventory-import/*` only for the diagnostic table section.
  - status 2026-06-16 update: `/inventory/imports` now renders `components/tables-2/inventory-import/*` inside the existing `InventoryImportControlCenter`, using the existing `inventories.inventoryImports` query result already owned by the control center and the existing `loadInventoryImportFilterParams` / `useInventoryImportFilterParams` contracts. No inventory import `*V2` query, filter param, filter metadata endpoint, route fork, or core table change was added. The old `components/tables/inventory-import/*` files were removed after import scans found no remaining consumers. Browser viewport smoke passed after fixing an imports-route hydration mismatch by awaiting the existing prefetch and reading it with `useSuspenseQuery`.
- `/inventory/variants`
  - currently a dedicated workspace; align table-like list sections with the standard only where useful.
  - status 2026-07-16 update: `/inventory/variants` now renders `components/tables-2/inventory-variants/*` for the repeatable variant list while preserving the existing workspace filters and summary cards. It uses compact 64px rows, sticky Variant/Actions columns, content-tailored Variant/Stock/Pricing/Supplier/Attributes/Status/Actions widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. No inventory variant `*V2` query, route fork, filter endpoint, permission, database change, or core table change was added.
- `/inventory/allocations`
  - old table/list: custom card grid in `components/inventory/inventory-allocation-review-page.tsx` with manual `IntersectionObserver` pagination and legacy `components/tables/skeleton` fallback.
  - target: add `components/tables-2/inventory-allocations/*` and preserve the existing allocation review query/mutations.
  - status 2026-07-16 update: `/inventory/allocations` now renders `components/tables-2/inventory-allocations/*` with compact 64px rows, sticky select/inventory columns, content-tailored Inventory/Order Component/Qty/Stock/Status/Created/References/Actions widths, table-owned scroll, DnD, resize, persisted settings, column visibility/dividers, row selection, row-level Approve/Reject, page-level Approve Visible, and selected-row Approve selected. No inventory allocation `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
- `/inventory/inbounds`
  - old table/list: narrow shipment card queue inside `components/inventory/inbound-receiving-page.tsx` plus legacy route skeleton/manual query fetching.
  - target: add `components/tables-2/inventory-inbounds/*` for the primary shipment queue while preserving receiving controls and selected-inbound detail.
  - status 2026-07-17 update: `/inventory/inbounds` now renders `components/tables-2/inventory-inbounds/*` with compact 64px rows, sticky Inbound/Actions columns, content-tailored Inbound/Status/Orders/Counts/Dates/Progress/Actions widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps existing summary cards, selected inbound detail, receive action, supplier receiving tray, reorder suggestions, reconciliation panel, and activity panel. No inventory inbound `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
- `/inventory/backorders`
  - old table/list: custom card/list layout in `components/inventory/inventory-backorder-queue-page.tsx` with legacy `components/tables/skeleton` fallback.
  - target: add `components/tables-2/inventory-backorders/*` and preserve the existing backorder queue query/mutations.
  - status 2026-07-17 update: `/inventory/backorders` now renders `components/tables-2/inventory-backorders/*` with compact 72px rows, sticky Order/Actions columns, content-tailored Order/Line/Status/Fulfillment/Available/Backorder/Received/Blockers/Actions widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps existing status filters, summary cards, Print backorders, Allocate received, partial-shipment link, row overview navigation, and Ship action. No inventory backorder `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
  - status 2026-07-17 density update: `/inventory/backorders` now uses compact `56px` rows, tighter content-fit Order/Line/Status/Fulfillment/Available/Backorder/Received/Blockers/Actions widths, compact row badges/actions, and a single primary blocker preview with an overflow-count badge while preserving the existing backorder query, page controls, row overview navigation, Ship Available mutation, and table-core contract.
- `/inventory/partial-shipments`
  - old table/list: card-map layout in `components/inventory/inventory-partial-shipment-page.tsx` plus legacy route skeleton/manual query fetching.
  - target: add `components/tables-2/inventory-partial-shipments/*` and preserve existing partial shipment filters, hold/unhold, and ship-available actions.
  - status 2026-07-17 update: `/inventory/partial-shipments` now renders `components/tables-2/inventory-partial-shipments/*` with compact 72px rows, sticky Order/Actions columns, content-tailored Order/Line/Status/Fulfillment/Available/Holdback/Blockers/Hold/Actions widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps existing summary cards, status filters, Backorders link, hold/unhold switch behavior, row overview navigation, and Ship action. No inventory partial shipment `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
  - status 2026-07-17 density update: `/inventory/partial-shipments` now uses compact `56px` rows, tighter content-fit Order/Line/Status/Fulfillment/Available/Holdback/Blockers/Hold/Actions widths, compact row badges/actions, and a single primary blocker preview with an overflow-count badge while preserving the existing partial shipment query, page controls, hold/unhold switch behavior, row overview navigation, Ship Available mutation, and table-core contract.
- `/inventory/dispatch-mode`
  - old table/list: card-map layout in `components/inventory/inventory-dispatch-mode-page.tsx` plus legacy route skeleton/manual query fetching.
  - target: add `components/tables-2/inventory-dispatch-mode/*` and preserve existing dispatch filters plus assign, pack, fulfill, and release workflows.
  - status 2026-07-17 update: `/inventory/dispatch-mode` now renders `components/tables-2/inventory-dispatch-mode/*` with compact 72px rows, sticky Order/Actions columns, content-tailored Order/Line/Status/Qty/Available/Allocations/Blockers/Actions widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps existing summary cards, status filters, Partial Shipments/Backorders links, row overview navigation, whole-line dispatch actions, allocation-specific dispatch actions, and dispatch/backorder/operations-summary invalidation. No inventory dispatch `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
  - status 2026-07-17 density update: `/inventory/dispatch-mode` now uses compact `56px` rows, tighter content-fit Order/Line/Status/Qty/Available/Allocations/Blockers/Actions widths, compact row badges/allocation badges, a single primary blocker preview with compact overflow count, and a compact visible Fulfill action while preserving the existing dispatch query, page controls, row overview navigation, whole-line dispatch actions, allocation-specific row-menu actions, invalidation behavior, and table-core contract.
- `/inventory/production-plan`
  - old table/list: card-map layout in `components/inventory/inventory-production-plan-page.tsx` plus legacy route skeleton/manual query fetching.
  - target: add `components/tables-2/inventory-production-plan/*` and preserve existing production readiness filters, summary cards, supplier/status group cards, row overview navigation, and print action.
  - status 2026-07-17 update: `/inventory/production-plan` now renders `components/tables-2/inventory-production-plan/*` with compact 72px rows, sticky Component/Actions columns, content-tailored Component/Order/Line/Readiness/Stock/Supplier/Coverage/Received/Actions widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps existing readiness filters, summary cards, supplier/status group cards, print-production URL/action, and row overview navigation to the production tab. No inventory production `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
  - status 2026-07-17 density update: `/inventory/production-plan` now uses compact `56px` rows, tighter content-fit Component/Order/Line/Readiness/Stock/Supplier/Coverage/Received/Actions widths, compact component/readiness/stock badges, and a compact Open action while preserving the existing production-plan query result, readiness filters, summary cards, supplier/status group cards, print-production action, row overview navigation, and table-core contract.
- `/inventory/review`
  - old table/list: card-map layout in `components/inventory/inventory-kind-review-page.tsx` with page-level `IntersectionObserver` load more, a lazy wrapper using legacy `components/tables/skeleton`, and manual route `fetchInfiniteQuery`.
  - target: add `components/tables-2/inventory-kind-review/*` and preserve the existing summary cards plus product-kind backfill action.
  - status 2026-07-17 update: `/inventory/review` now renders `components/tables-2/inventory-kind-review/*` with compact 64px rows, sticky Item/Actions columns, content-tailored Item/Category/Current/Suggested/Evidence/Counts/Status/Actions widths, table-owned scroll, infinite scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps existing summary cards, heuristic copy, and the `backfillInventoryProductKinds` action. No inventory review `*V2` query, new route, filter endpoint, permission, database change, or core table change was added.
  - status 2026-07-17 density update: `/inventory/review` now uses compact `56px` rows, tighter content-fit Item/Category/Current/Suggested/Evidence/Counts/Status/Actions widths, compact kind/status badges, and smaller icon-only row actions while preserving the existing review query, summary cards, heuristic copy, product-kind backfill action, table-owned infinite scroll, and table-core contract.
- `/inventory/stocks`
  - old table/list: audit verification card-map inside `components/inventory/inventory-stock-operations-page.tsx`.
  - target: add `components/tables-2/inventory-stock-audit/*` for the audit verification matrix while preserving the manual stock adjustment form.
  - status 2026-07-17 update: `/inventory/stocks` now renders `components/tables-2/inventory-stock-audit/*` for the stock audit verification matrix with compact 56px rows, sticky Category column, content-tailored Category/Expected/Movements/Logs/Change/Status widths, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The page keeps the existing manual stock adjustment form and invalidates `inventories.stockAuditVerificationReport` after `adjustInventoryStock` so audit counts refresh. No new stock-audit query, filter endpoint, permission, database change, route fork, or core table change was added.
  - status 2026-07-17 density update: `/inventory/stocks` now uses tighter content-fit Category/Expected/Movements/Logs/Change/Status widths (`160/260/190`, `190/300/220`, `104/150/118`, `92/132/104`, `104/150/118`, `104/150/118`) plus compact Change/Status badges while preserving the manual stock adjustment form, existing stock-audit report query, audit-count invalidation, and table-core contract.
- `/inventory/[id]`
  - old table/list: hand-rendered item dashboard sections inside `components/inventory/inventory-item-dashboard-page.tsx`.
  - target: add `components/tables-2/inventory-item-dashboard/*` for the variants, stock, movements, inbound demand, allocations, and related sales/quotes sections while preserving the existing dashboard query and analytics.
  - status 2026-07-17 update: `/inventory/[id]` now renders domain-local `components/tables-2/inventory-item-dashboard/*` table sections with compact rows, sticky section-appropriate columns, table-owned scroll, DnD, resize, persisted settings, and column visibility/dividers. The route uses the restarted shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and initial table settings for every dashboard section. No inventory item dashboard `*V2` query, route fork, permission, database field, or core table change was added.

Steps:
1. Preserve existing inventory queries, filters, and headers.
2. Add only the needed `components/tables-2/<domain>/*` folder.
3. Reuse existing route data contracts exactly.
4. Do not move inventory fulfillment calculations into UI columns.
5. Reuse row-open navigation to `/inventory/[id]` where that is current behavior.
6. Keep custom operational controls outside the table render path where possible.
7. Validation:
   - inventory list route smoke
   - existing search/filter smoke
   - inventory fulfillment/backorder tests only if row actions touch stock/allocation behavior

Decision point: keep command-heavy pages as workspaces with standard list sections instead of forcing every control surface into the full table chrome.

Phase 4 inventory products/components evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-products/*`.
- Updated `/inventory` and `/inventory/components` to render the new table directly.
- Reused existing inventory contracts:
  - `InventoryHeader`
  - `InventorySearchFilter`
  - `loadInventoryFilterParams`
  - `useInventoryFilterParams`
  - `trpc.inventories.inventoryProducts`
  - existing `/inventory/[id]` row-open navigation
- Did not add an inventory `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/inventory-products/data-table.tsx`
  - removed `apps/www/src/components/tables/inventory-products/columns.tsx`
- Validation:
  - focused Biome check passed for the inventory routes, header, validation fixture panel, table settings/config, and new inventory-products `tables-2` files.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched inventory route/table/header/settings/config files.
  - import scans found no remaining references to `components/tables/inventory-products` or `tables/inventory-products`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the inventory slice.
  - In-app Browser smoke passed in the Pablo Cruz / Super Admin session for desktop `/inventory`, desktop `/inventory?q=Validation`, mobile `390x844` `/inventory`, desktop `/inventory/components`, desktop `/inventory/components?q=Validation`, mobile `/inventory/components`, and mobile `/inventory/components?q=Validation`.
  - Mobile inventory and components routes had no document-level horizontal overflow; the table retained its own horizontal scroll container.

Phase 4 inventory categories evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-categories/*`.
- Updated `/inventory/categories` to render the new table directly.
- Reused existing inventory category contracts:
  - `CategoryHeader`
  - `InventorySearchFilter` with a category-specific placeholder
  - `loadInventoryFilterParams`
  - `useInventoryFilterParams`
  - `trpc.inventories.inventoryCategories`
  - existing `editCategoryId` sheet state
  - existing `updateCategoryStockMode` and delete-category mutation flows
- Did not add an inventory category `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/inventory-categories/data-table.tsx`
  - removed `apps/www/src/components/tables/inventory-categories/columns.tsx`
- Validation:
  - focused Biome check passed for the category route, header, search filter, table settings/config, and new inventory-categories `tables-2` files.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched category route/table/header/settings/config files.
  - import scans found no remaining references to `components/tables/inventory-categories` or `tables/inventory-categories`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the category slice.
  - In-app Browser smoke passed in the Pablo Cruz / Super Admin session for desktop `/inventory/categories`, desktop `/inventory/categories?q=door`, mobile `390x844` `/inventory/categories`, and desktop `/inventory/categories?productKind=component`.
  - Mobile categories had no document-level horizontal overflow; the table retained its own horizontal scroll container.

Phase 4 inventory imports evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-import/*`.
- Updated `/inventory/imports` to render the new diagnostic table inside the existing control center.
- Reused existing inventory import contracts:
  - `InventoryImportControlCenter`
  - `loadInventoryImportFilterParams`
  - `useInventoryImportFilterParams`
  - `trpc.inventories.inventoryImports`
  - existing import check/update/reset actions and run tracking
- Did not add an inventory import `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- The table consumes the control center's existing imports query result rather than mounting a second table-owned query, which keeps the diagnostic table aligned with the page's already-loaded summary data.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/inventory-import/data-table.tsx`
  - removed `apps/www/src/components/tables/inventory-import/columns.tsx`
- Validation:
  - focused Biome check passed for the imports route, control center, table settings/config, and new inventory-import `tables-2` files.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched imports route/table/control-center/settings/config files.
  - import scans found no remaining references to `components/tables/inventory-import` or `tables/inventory-import`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the imports slice.
  - HTTP smoke returned `200` for `/inventory/imports`.
  - Browser smoke passed with Quick Login/account signal as Pablo Cruz / Super Admin (`PC`): desktop `/inventory/imports`, desktop `/inventory/imports?scope=all`, desktop `/inventory/imports?scope=all&q=door`, and mobile `390x844` `/inventory/imports?scope=all`.
  - Desktop and mobile imports routes had no document-level horizontal overflow; the mobile diagnostic table retained its own horizontal scroll container.
  - Browser proof initially exposed a server/client hydration mismatch on the imports control-center stats. The route now awaits the existing `inventories.inventoryImports` prefetch before hydration and the control center reads the same query with `useSuspenseQuery`, eliminating fresh-tab hydration errors without adding a query or filter contract.

Phase 4 inventory variants evidence captured on 2026-07-16:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-variants/*`.
- Updated `/inventory/variants` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-variants")`, and `InventoryVariantsSkeleton`.
- Reused existing variants workspace contracts:
  - `InventoryVariantsWorkspacePage`
  - `trpc.inventories.inventoryVariantsWorkspace`
  - existing search, item id, category id, supplier id, status, stock mode, and low-stock filters
  - existing dashboard, edit, and stock-operation row actions
- Did not add an inventory variant `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table consumes the workspace's existing variants query result, so metrics and rows remain aligned while the repeatable list gains table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the variants route, workspace, table files, registry files, audit file, and parity test.
  - full restarted parity suite passed with 78 tests / 698 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, `IntersectionObserver`, or legacy `VariantCard` usage in the variants route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched variants files while the broad typecheck remains subject to existing unrelated baseline errors.
  - `git diff --check` passed.
  - local HTTP GET smoke returned `200` for `/inventory/variants` and `/inventory/variants?inventoryId=1` on `127.0.0.1:3010`.

Phase 4 inventory allocations evidence captured on 2026-07-16:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-allocations/*`.
- Updated `/inventory/allocations` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-allocations")`, and `InventoryAllocationsSkeleton`.
- Reused existing allocation review contracts:
  - `trpc.inventories.pendingAllocations`
  - `trpc.inventories.approveStockAllocation`
  - `trpc.inventories.rejectStockAllocation`
  - `trpc.inventories.approveBulkStockAllocation`
- Did not add an inventory allocation `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table keeps the existing allocation summary cards and Approve Visible action above the table, while row Approve/Reject actions and selected-row Approve selected live in the table surface.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the allocation route, page surface, table files, registry files, and parity test.
  - full restarted parity suite passed with 75 tests / 682 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, or `IntersectionObserver` usage in the allocation route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched allocation files while the broad typecheck remains subject to existing unrelated baseline errors.
  - `git diff --check` passed.
  - local HTTP GET smoke returned `200` for `/inventory/allocations` and `/inventory/allocations?sort=createdAt.desc` on `127.0.0.1:3010`; unauthenticated output carries the expected protected `/login/v2` redirect marker.

Phase 4 inventory inbounds evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-inbounds/*`.
- Updated `/inventory/inbounds` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-inbounds")`, and `InventoryInboundsSkeleton`.
- Reused existing inbound receiving contracts:
  - `trpc.inventories.inboundShipments`
  - `trpc.inventories.inboundSuppliers`
  - `trpc.inventories.inboundDemandQueue`
  - `trpc.inventories.supplierReorderSuggestions`
  - `trpc.inventories.inboundStatusDemandReconciliation`
  - existing selected-inbound detail/documents/extractions/activity queries and receive/assign/create mutations
- Did not add an inventory inbound `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table consumes the workspace's existing finite inbound shipment query result, so summary cards and selected-detail behavior remain aligned while the primary shipment queue gains table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the inbounds route, workspace, table files, registry files, audit file, and parity test.
  - focused inbounds/page audit tests passed with 6 tests / 22 assertions.
  - full restarted parity suite passed with 84 tests / 733 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, old shipment card-map, or queue `ScrollArea` usage in the inbounds route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched inbounds files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/inbounds` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.

Phase 4 inventory backorders evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-backorders/*`.
- Updated `/inventory/backorders` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-backorders")`, and `InventoryBackordersSkeleton`.
- Reused existing backorder queue contracts:
  - `trpc.inventories.salesBackorderQueue`
  - `trpc.inventories.shipAvailableSalesInventory`
  - existing status filters, summary counts, print backorders, allocate received, partial-shipment link, and row overview navigation
- Did not add an inventory backorder `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table consumes the workspace's existing finite query result, so summary cards and rows remain aligned while the repeatable list gains table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- 2026-07-17 density update: Backorders now uses compact `56px` rows, a `160/280/190` sticky Order column, tighter Line/Status/Fulfillment/Available/Backorder/Received/Blockers/Actions widths, compact badges/actions, and one primary blocker preview plus an overflow-count badge so dense rows stay closer to the Sales Orders/Midday target.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the backorders route, page surface, table files, registry files, audit file, and parity test.
  - focused backorders/page audit tests passed with 6 tests / 19 assertions.
  - full restarted parity suite passed with 81 tests / 714 assertions.
  - 2026-07-17 density validation: focused Backorders parity tests passed with 3 tests / 20 assertions; full `apps/www/src/components/tables-2` suite passed with 305 tests / 2547 assertions; focused Biome passed for Backorders columns, parity test, and `table-configs`; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; direct local HTTP route smoke returned `200`; the initial HTTPS proxy route smoke timed out with zero bytes after 25s; `git diff --check` and clean `components/tables-2/core` diff passed.
  - 2026-07-17 browser proof follow-up: authenticated runtime validation on `https://gndprodesk.localhost/inventory/backorders` loaded 100 queue lines and confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 5645`, `clientHeight 359`), table-owned horizontal scroll (`scrollLeft 0 -> 260`, `scrollWidth 1490`, `clientWidth 1131`), and no document-level horizontal overflow.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, `IntersectionObserver`, or old blocker card-list usage in the backorders route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched backorders files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/backorders` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011`.

Phase 4 inventory partial shipments evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-partial-shipments/*`.
- Updated `/inventory/partial-shipments` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-partial-shipments")`, and `InventoryPartialShipmentsSkeleton`.
- Reused existing partial shipment contracts:
  - `trpc.inventories.salesPartialShipmentQueue`
  - `trpc.inventories.setSalesInventoryLineFulfillmentHold`
  - `trpc.inventories.shipAvailableSalesInventory`
  - existing status filters, summary cards, Backorders link, row overview navigation, hold/unhold behavior, and Ship Available action
- Did not add an inventory partial shipment `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table consumes the workspace's existing finite partial shipment query result, so summary cards and filter state remain aligned while the repeatable list gains table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- 2026-07-17 density update: Partial Shipments now uses compact `56px` rows, a `160/280/190` sticky Order column, tighter Line/Status/Fulfillment/Available/Holdback/Blockers/Hold/Actions widths, compact row badges/actions, and one primary blocker preview plus an overflow-count badge so dense rows stay closer to the Sales Orders/Midday target.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the partial shipments route, workspace, table files, registry files, audit file, and parity test.
  - focused partial-shipment/page audit tests passed with 6 tests / 22 assertions.
  - full restarted parity suite passed with 87 tests / 752 assertions.
  - 2026-07-17 density validation: focused Partial Shipments parity tests passed with 4 tests / 25 assertions; full `apps/www/src/components/tables-2` suite passed with 306 tests / 2553 assertions; focused Biome passed for Partial Shipments columns, parity test, and `table-configs`; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; direct local GET route smoke returned `200` in 20.6s; browser proof confirmed `56px` rows, a `45px` header, table-owned vertical/horizontal scroll (`scrollTop 0 -> 650`, `scrollLeft 0 -> 220`), and no document-level horizontal overflow; `git diff --check` and clean `components/tables-2/core` diff passed.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, old item card-map, or blocker card-map usage in the partial-shipment route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched partial-shipment files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/partial-shipments` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.

Phase 4 inventory dispatch mode evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-dispatch-mode/*`.
- Updated `/inventory/dispatch-mode` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-dispatch-mode")`, and `InventoryDispatchModeSkeleton`.
- Reused existing dispatch-mode contracts:
  - `trpc.inventories.salesPartialShipmentQueue`
  - `trpc.inventories.assignInventoryDispatchAllocations`
  - `trpc.inventories.packInventoryDispatchAllocations`
  - `trpc.inventories.fulfillInventoryDispatch`
  - `trpc.inventories.releaseInventoryDispatchAllocations`
  - existing status filters, summary cards, Partial Shipments/Backorders links, row overview navigation, and queue invalidation
- Did not add an inventory dispatch `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table consumes the workspace's existing finite partial-shipment queue result, so metrics and filter state remain aligned while the repeatable dispatch list gains table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- Whole-line assign, pack, fulfill, and release actions stay available; allocation-specific assign/pack/fulfill/release actions moved into a compact row menu to avoid wasting column width.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the dispatch route, workspace, table files, registry files, audit file, and parity test.
  - focused dispatch/page audit tests passed with 6 tests / 24 assertions.
  - full restarted parity suite passed with 90 tests / 773 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, old item card-map, or allocation button-map usage in the dispatch route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched dispatch files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/dispatch-mode` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
  - density follow-up validation passed with focused Dispatch Mode parity tests (3 / 26), the full `apps/www/src/components/tables-2` suite (306 / 2558), focused Biome, filtered typecheck grep with no Dispatch Mode/table-config diagnostics, clean `components/tables-2/core` diff, tracked `git diff --check`, HTTPS route smoke returning `200` in 33.6s, and authenticated browser proof confirming `56px` row height, a `45px` header, table-owned horizontal scroll (`scrollLeft 0 -> 102`), and no document-level horizontal overflow. The current authenticated dataset had only one dispatch row, so vertical row-scroll movement was not exercisable.

Phase 4 inventory production plan evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-production-plan/*`.
- Updated `/inventory/production-plan` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-production-plan")`, and `InventoryProductionPlanSkeleton`.
- Reused existing production-plan contracts:
  - `trpc.inventories.salesProductionPlan`
  - existing readiness filters, summary cards, supplier/status group cards, print-production URL/action, and row overview navigation
- Did not add an inventory production `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The table consumes the workspace's existing finite production-plan query result, so summary cards and filter state remain aligned while the repeatable component list gains table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the production-plan route, workspace, table files, registry files, audit file, and parity test.
  - focused production-plan/page audit tests passed with 6 tests / 22 assertions.
  - full restarted parity suite passed with 93 tests / 792 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, or old component card-map usage in the production-plan route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched production-plan files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/production-plan` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
  - density follow-up validation passed with focused Production Plan parity tests (3 / 23), the full `apps/www/src/components/tables-2` suite (306 / 2562), focused Biome, filtered typecheck grep with no Production Plan/table-config diagnostics, clean `components/tables-2/core` diff, and tracked `git diff --check`.
  - runtime follow-up proof returned `200` for direct local HTTP and authenticated browser validation on `https://gndprodesk.localhost/inventory/production-plan` confirmed a `45px` header, `56px` rows, table-owned horizontal scroll (`scrollLeft 0 -> 260`, `scrollWidth 1486`, `clientWidth 1131`), and no document-level horizontal overflow. Current authenticated data had only two production component rows, so vertical row-scroll movement could not be exercised in this follow-up.

Phase 4 inventory kind review evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-kind-review/*`.
- Updated `/inventory/review` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-kind-review")`, and `InventoryKindReviewSkeleton`.
- Reused existing kind-review contracts:
  - `trpc.inventories.inventoryProductKindReview`
  - `trpc.inventories.backfillInventoryProductKinds`
  - existing summary cards, heuristic copy, and product-kind backfill action
- Did not add an inventory review `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- Removed the old lazy wrapper that imported `components/tables/skeleton`; the repeatable review list now uses table-owned infinite scroll instead of a page-level `IntersectionObserver`.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the review route, workspace, table files, registry files, audit file, and parity test.
  - focused review/page audit tests passed with 6 tests / 24 assertions.
  - full restarted parity suite passed with 96 tests / 813 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, lazy wrapper, or old row card-map usage in the review route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched review files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/review` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
  - density follow-up validation passed with focused Kind Review parity tests (3 / 25), the full `apps/www/src/components/tables-2` suite (306 / 2566), focused Biome, filtered typecheck grep with no Kind Review/table-config diagnostics, clean `components/tables-2/core` diff, and tracked `git diff --check`. HTTPS route smoke timed out after 60s with zero bytes, but authenticated browser proof confirmed `56px` rows, a `45px` header, table-owned vertical/horizontal scroll (`scrollTop 0 -> 650`, `scrollLeft 0 -> 50`), and no document-level horizontal overflow.

Phase 4 inventory stock audit evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-stock-audit/*`.
- Updated `/inventory/stocks` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-stock-audit")`, and `InventoryStockAuditSkeleton`.
- Reused existing stock operations contracts:
  - `trpc.inventories.stockAuditVerificationReport`
  - `trpc.inventories.adjustInventoryStock`
  - existing manual stock adjustment form and audit summary counts
- Did not add a stock-audit `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The repeatable audit verification matrix now uses table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers instead of mapped bordered rows.
- Posting a manual stock adjustment invalidates `inventories.stockAuditVerificationReport` so audit counts refresh after successful adjustment.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the stocks route, operations page, table files, registry files, audit file, and parity test.
  - focused stock-audit/page audit tests passed with 6 tests / 31 assertions.
  - full restarted parity suite passed with 99 tests / 841 assertions.
  - runtime static scan found no live legacy skeleton, `@gnd/ui/data-table`, `fetchInfiniteQuery`, `getQueryClient`, `PageStickyHeader`, `IntersectionObserver`, or old audit `rows.map((row)` usage in the stocks route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched stocks files while the broad typecheck remains subject to existing unrelated baseline errors.
  - local HTTP GET smoke returned `200` for `/inventory/stocks` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after the initial dev-server compile completed.
  - density follow-up validation passed with focused Stock Audit parity tests (3 / 32), the full `apps/www/src/components/tables-2` suite (306 / 2570), focused Biome, filtered typecheck grep with no Stock Audit/table-config diagnostics, clean `components/tables-2/core` diff, and touched-file `git diff --check`. Direct local HTTP smoke returned `200` for `127.0.0.1:3010`; portless HTTPS timed out after 60s with zero bytes and `https://gndprodesk.localhost:3011` was not listening. Authenticated browser proof confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 63`), no document-level horizontal overflow, and no table horizontal overflow at the current desktop width because the tightened columns fit the viewport.

Phase 4 inventory suppliers evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-suppliers/*`.
- Updated `/inventory/suppliers` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("inventory-suppliers")`, and `InventorySuppliersSkeleton`.
- Reused existing supplier contracts:
  - `trpc.inventories.inventorySuppliers`
  - `trpc.inventories.inventorySupplierDykeReview`
  - `trpc.inventories.syncInventorySuppliersFromDyke`
  - `trpc.inventories.saveInventorySupplier`
  - `trpc.inventories.deleteInventorySupplier`
  - existing supplier search/create/edit/delete/default behavior from the shared manager
- Did not add an inventory suppliers `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The route and embedded product-form supplier manager now render a table-core supplier list instead of compact item rows, while preserving search results, create dialog, default-supplier assignment, Dyke sync, and Dyke supplier matching review.
- Save, delete, and Dyke sync actions invalidate supplier directory and Dyke review queries so the table/search surface refreshes after mutations.
- Registered compact content-fit columns with 56px rows: Supplier `220/420/280`, Contact `170/280/210`, Address `220/420/280`, and Actions `92/120/104`.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the suppliers route, manager, table files, registry files, and parity test.
  - focused suppliers parity tests passed with 5 tests / 43 assertions.
  - full restarted parity suite passed with 180 tests / 1757 assertions.
  - runtime static scan found no live old supplier item-list, manual fetch, `@gnd/ui/data-table`, namespace table, or dashed empty-card usage in the suppliers route/manager surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched supplier files while the broad typecheck remains subject to existing unrelated baseline errors.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` diff stayed clean.

Phase 4 inventory item dashboard evidence captured on 2026-07-17:
- Added the domain table module under `apps/www/src/components/tables-2/inventory-item-dashboard/*`.
- Updated `/inventory/[id]` to use the restarted Sales Orders route/table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and initial table settings for variants, stock, movements, inbound demand, allocations, and related sales/quotes.
- Reused existing item dashboard contracts:
  - `trpc.inventories.inventoryItemDashboard`
  - existing not-found fallback, item summary metrics, top-sales analytics, and links to variants, stock operations, inbounds, allocations, sales, and quotes
- Did not add an inventory item dashboard `*V2` query, filter param, filter metadata endpoint, route fork, permission, database field, or core table change.
- The section tables consume the dashboard's existing finite query result, so summary cards, top-sales analytics, and section rows remain aligned while the repeatable sections gain table-owned scroll, virtualization, DnD, resize, sticky columns, persisted settings, and column visibility/dividers.
- Registered compact content-fit table ids:
  - `inventory-item-variants` with 72px rows and sticky Variant column.
  - `inventory-item-stocks`, `inventory-item-movements`, `inventory-item-inbound-demands`, `inventory-item-allocations`, and `inventory-item-related-lines` with 56px rows and section-specific sticky columns.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the inventory item route, dashboard page, table files, and table registry files.
  - focused inventory item dashboard migration parity tests passed with 4 tests / 65 assertions.
  - full restarted table suite passed with 220 tests / 2314 assertions.
  - runtime static scan found no live `VariantGrid`, `StockTable`, `MovementTable`, `InboundTable`, `AllocationTable`, `RelatedLines`, manual section row maps, dashed empty cards, old table imports, manual route fetch, or `PageStickyHeader` usage in the inventory item dashboard route/table surface.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched inventory item dashboard files while the broad typecheck remains subject to existing unrelated baseline errors.
  - HTTPS route smoke returned `200` for `/inventory/1`.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` diff stayed clean.

### Phase 5: Community, HRM, Jobs, Settings, And Operations
Migrate lower-risk operational tables after sales and inventory patterns settle.

Community routes:
- `/community/builders` -> migrated to `components/tables-2/community-builders/*`; old `components/tables/builder/*` files removed after import scans.
- `/community/templates` -> migrated to `components/tables-2/community-templates/*`; old `components/tables/community-template/*` files and old `CommunityTemplateSearchFilter` wrapper removed after import scans.
- `/community/projects` -> migrated to `components/tables-2/community-projects/*`; old `components/tables/community-project/*` files removed after import scans.
- `/community/project-units` -> migrated to `components/tables-2/project-units/*`; old `components/tables/project-units/*` files removed after import scans.
- `/community/unit-invoices` -> migrated to `components/tables-2/unit-invoices/*`; old `components/tables/unit-invoices/*` files removed after the Project Overview embed moved to `tables-2`.
- `/community/unit-productions` -> migrated to `components/tables-2/unit-productions/*`; old `components/tables/unit-productions/*` files removed after import scans.
- `/community/customer-services` -> migrated to `components/tables-2/customer-service/*`; old `components/tables/customer-service/*` files removed after import scans.

Unit Productions browser-proof follow-up captured on 2026-07-17:
- Focused Unit Productions parity tests passed with 4 tests / 33 assertions, and focused Biome passed for the Unit Productions route/header/table/settings files.
- Direct local HTTP route smoke returned `200` in `0.719s`.
- The first portless HTTPS curl/browser attempt timed out before route warmup; after direct route warmup, authenticated browser validation on `https://gndprodesk.localhost/community/unit-productions` loaded the live `65,096`-task dataset.
- Browser validation confirmed `64px` rows, a `45px` header, sticky Select/Due Date columns, table-owned vertical scroll (`scrollTop 0 -> 650`), table-owned horizontal scroll (`scrollLeft 0 -> 138`), `--header-offset: 70px`, and no document-level horizontal overflow.

Phase 5 community builders evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/community-builders/*`.
- Updated `/community/builders` to render the new table directly on the actual route.
- Reused existing community builder contracts:
  - `BuilderHeader`
  - `SearchFilterAdapter`
  - `loadBuilderFilterParams`
  - `useBuilderFilterParams`
  - `useBuilderParams`
  - `trpc.community.getBuilders`
- Did not add a community builder `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/builder/data-table.tsx`
  - removed `apps/www/src/components/tables/builder/columns.tsx`
- Validation:
  - focused Biome check passed for the builders route, header, table settings/config, and new community-builders `tables-2` files.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched builders route/table/header/settings/config files.
  - import scans found no remaining runtime references to `components/tables/builder` or `tables/builder`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the builder slice.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `/community/builders`, desktop `/community/builders?q=Mattamy`, and mobile `390x844` `/community/builders`.
  - Desktop and mobile builders routes had no document-level horizontal overflow; the mobile table retained its own horizontal scroll container.

Phase 5 community builders restarted parity evidence captured on 2026-07-17:
- Restarted `/community/builders` against the current Sales Orders route/table shell:
  - route now uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("community-builders")`.
  - route no longer manually calls `getQueryClient().fetchInfiniteQuery`.
  - table now uses `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, table-owned infinite scroll, draggable/sortable headers, and resize handles.
- Kept existing builders contracts unchanged:
  - `BuilderHeader`
  - `SearchFilterAdapter`
  - `loadBuilderFilterParams`
  - `useBuilderFilterParams`
  - `useBuilderParams`
  - `trpc.community.getBuilders`
- Tightened compact, content-tailored column widths:
  - Builder `220/420/280`
  - Projects `96/140/110`
  - Tasks `84/130/100`
  - Homes `84/130/100`
  - Actions `72/96/80`
  - row height remains compact at 64px.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Biome passed for the builders route/header/table files, table config, and page audit test.
  - focused builders/page audit tests passed and the full restarted table parity suite passed with 103 tests / 878 assertions.
  - static scans found no live builder route references to `components/tables/builder`, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, manual `IntersectionObserver`, or row `map` rendering patterns.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched builders files while broad typecheck remains blocked by unrelated baseline errors.
  - HTTP smoke returned `200` for `/community/builders` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after route compile warmup.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` diff stayed clean.

Phase 5 community templates evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/community-templates/*`.
- Updated `/community/templates` to render the new table directly on the actual route.
- Reused existing community template contracts:
  - `CommunityTemplateHeader`
  - `communityTemplateFilterParams`
  - `loadCommunityTemplateFilterParams`
  - `useCommunityTemplateFilterParams`
  - `trpc.filters.communityTemplateFilters`
  - `trpc.community.getCommunityTemplates`
  - existing template modal/query-param actions, model-cost edit params, install-cost edit params, preview link, and delete mutation
- Did not add a community template `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- The route no longer blocks first render on `filters.communityTemplateFilters`; the header now uses the existing lazy Midday search-filter adapter and keeps the same filter schema/endpoint.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/community-template/data-table.tsx`
  - removed `apps/www/src/components/tables/community-template/columns.tsx`
  - removed `apps/www/src/components/community-template-search-filter.tsx`
- Validation:
  - focused Biome check passed for the templates route, header, table settings/config, and new community-templates `tables-2` files.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched templates route/table/header/settings/config files or the retargeted legacy install-cost modal row type.
  - import scans found no remaining runtime references to `CommunityTemplateSearchFilter`, `community-template-search-filter`, `components/tables/community-template`, or `tables/community-template`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the templates slice.
  - HTTP smoke returned `200` for `/community/templates`.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `/community/templates`, desktop `/community/templates?q=2795`, and mobile `390x844` `/community/templates`.
  - Desktop and mobile template routes had no document-level horizontal overflow; the mobile table retained its own horizontal scroll container.

Phase 5 community install-costs restarted parity evidence captured on 2026-07-17:
- Restarted `/community/install-costs` against the current Sales Orders route/table shell:
  - route now uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `ErrorBoundary`, `Suspense`, and `getInitialTableSettings("community-install-costs")`.
  - route no longer manually calls `getQueryClient().fetchQuery`.
  - runtime page component no longer renders the old `@gnd/ui/namespace` table or `InstallCostLine`.
  - table now uses `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, table-owned scroll, draggable headers, resize handles, persisted settings, and column visibility/divider controls.
- Kept existing install-cost contracts unchanged:
  - `trpc.community.getCommunityInstallCostRates`
  - `trpc.community.getInstallCostRateUnits`
  - `trpc.community.updateInstallCostRate`
  - `trpc.community.importLegacyInstallCosts`
  - existing legacy import fallback when no modern rates exist.
- Tightened compact, content-tailored column widths:
  - Task `220/420/280`
  - Cost `108/150/120`
  - Unit `100/140/112`
  - Actions `92/120/104`
  - row height is compact at 48px.
- Corrected the old misleading `Max Qty` header to `Unit` because the column renders `InstallCostModel.unit`, not quantity.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Community Install Costs parity tests passed with 5 tests / 44 assertions.
  - full restarted table parity suite passed with 175 tests / 1714 assertions.
  - targeted Biome passed for the route/client/page component/table module plus settings/config.
  - broad `@gnd/www` typecheck remains blocked by unrelated baseline errors, but a filtered log scan found no diagnostics for install-cost route/component/table/settings/config touched paths.
  - runtime static scans found no old `@gnd/ui/namespace`, `InstallCostLine`, `getQueryClient`, or `fetchQuery` usage in the install-cost route/runtime component paths.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` diff stayed clean.

Community Model Cost form task-grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/community-model-cost-form-tasks/*` for the desktop task pricing grid inside the existing Community Template model-cost modal.
- Updated `apps/www/src/components/forms/community-model-cost-form.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` / `table-sm` markup.
- Preserved the existing start/end date controls, Clear Costs, Create Copy, Delete, total calculation, save/delete mutations, and Unit Invoice page-tab invalidation after model-cost changes.
- Registered `community-model-cost-form-tasks` in table settings/config with compact `48px` rows, a sticky Task column, content-fit Task/Cost/Tax widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Community Model Cost form task-grid parity test passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 225 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next smoke returned `200` for `/community/templates`; the HTTPS proxy was unavailable on port `3011` during this slice.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Community Install Cost form task-grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/community-install-cost-form-tasks/*` for the desktop task quantity grid inside the existing Community Template install-cost modal.
- Updated `apps/www/src/components/forms/community-install-cost-form.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` / `table-sm` markup.
- Preserved the existing form reset, save mutation, modal/sidebar footer placement, and install-cost meta payload behavior. The old blank `Def. Qty` cells now render task `defaultQty` when present, while the editable quantity column still writes `installCost.<uid>` for the save payload.
- Registered `community-install-cost-form-tasks` in table settings/config with compact `48px` rows, a sticky Task column, content-fit Task/Def. Qty/Qty widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, persisted settings, and active quantity row highlighting.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Community Install Cost form task-grid parity test passed with 4 tests.
  - combined community install-cost/model-cost parity tests passed with 13 tests / 44 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 229 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/schema/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next and HTTPS proxy smokes returned `200` for `/community/templates`.
  - static scan found no `@gnd/ui/table`, `table-sm`, `TCell`, or inline `<Table*>` markup in `community-install-cost-form.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Builder form task-grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/builder-form-tasks/*` for the editable builder task grid inside the existing Community Builders modal.
- Updated `apps/www/src/components/builder-form.tsx` to render the domain-local table-core module instead of the embedded `@gnd/ui/namespace` table markup.
- Preserved the existing builder name/address fields, legacy upgrade notice, form reset, save integration through the surrounding modal action, and task add/remove behavior. The address field now uses the existing textarea-capable `FormInput`, and the legacy upgrade invalidation/action no longer relies on a non-null builder id assertion.
- Registered `builder-form-tasks` in table settings/config with compact `48px` rows, a sticky Task column, content-fit Task/Addon/Billable/Job/Productionable/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Builder form task-grid parity test passed with 4 tests.
  - combined Builder form and Community Builders parity tests passed with 8 tests / 37 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 233 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next and HTTPS proxy smokes returned `200` for `/community/builders`.
  - static scan found no `@gnd/ui/namespace`, `@gnd/ui/table`, `table-sm`, or inline `<Table*>` markup in `builder-form.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Playwright CLI screenshot in an unauthenticated browser context produced a blank white capture, so it was not counted as browser proof for this slice.

Inventory Product form variant-grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/inventory-product-form-variants/*` for the product-form variant grid inside the existing inventory product form.
- Updated `apps/www/src/components/forms/inventory-products/product-variants.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` markup, manual page/window sticky header state, `IntersectionObserver`, and Show More pagination.
- Preserved the existing variant filters, filtered variant data source, selected variant URL params, status mutation contract, stock-monitor conditional stock columns, and variant pricing panel behavior.
- The selected variant detail/pricing panel now renders below the fixed-height virtual table instead of inside a variable-height expanded row.
- Registered `inventory-product-form-variants` in table settings/config with compact `52px` rows, a sticky Variant column, a sticky right Actions column, content-fit Variant/Cost/Stock/Low/Status/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, horizontal pagination, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Inventory Product form variants plus inventory products/variants parity tests passed with 7 tests / 16 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 237 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next and HTTPS proxy smokes returned `200` for `/inventory`.
  - static scan found no `@gnd/ui/table`, inline `<Table*>`, `IntersectionObserver`, `Show More Variants`, or `scrolledPast` usage in `product-variants.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this slice.

Inventory Product form sub-components grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/inventory-product-form-sub-components/*` for the Door Builder Components grid inside the existing inventory product form.
- Updated `apps/www/src/components/forms/inventory-products/category-sub-components-section.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` / `table-sm` markup and the incomplete row-sortable wrapper.
- Preserved the existing add-row behavior, component-category combobox, default product combobox, sub-component status mutation, delete confirmation, `updateSubComponent`, `updateSubComponentStatus`, and `deleteSubComponent` contracts. The default-product update payload now includes the current category id when that mutation path runs, matching the schema contract.
- Registered `inventory-product-form-sub-components` in table settings/config with compact `52px` rows, sticky Handle and Category columns, a sticky right Actions column, content-fit Handle/Category/Default Product/Status/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, horizontal pagination, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused Inventory Product sub-components plus variant-grid parity tests passed with 8 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 241 tests / 2337 assertions.
  - focused Biome passed for the touched parent form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - direct Next and HTTPS proxy smokes returned `200` for `/inventory`.
  - static scan found no `@gnd/ui/table`, `table-sm`, inline `<Table*>`, `SortableContext`, `useSortable`, or `SubCategoryValues` usage in `category-sub-components-section.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded form slice.

Role form permissions grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/role-form-permissions/*` for the role create/edit permission grid inside the existing roles/profile sheet form.
- Updated `apps/www/src/components/forms/role-form.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` markup and old `Table*` cells while preserving role name, submit/cancel behavior, role form reset, loading skeletons, and existing `createRoleAction` payload shape.
- Preserved the existing permission field mapping: the visible `Create` column still writes `permissions.view <permission>.checked`, and the visible `Edit` column still writes `permissions.edit <permission>.checked`.
- Registered `role-form-permissions` in table settings/config with compact `48px` rows, sticky Permission column, content-fit Permission/Create/Edit widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Role Form permissions plus roles/profile sheet parity tests passed with 13 tests / 80 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 245 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/context/action/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics after narrowing existing role-form-family type issues.
  - HTTPS proxy smoke returned `200` for `/hrm/employees/v2`.
  - static scan found no `@gnd/ui/table`, inline `<Table*>`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, or `table-sm` usage in `role-form.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded sheet form slice.

Employee form permissions grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/employee-form-permissions/*` for the employee-specific permission override grid inside the existing employee create/edit modal.
- Updated `apps/www/src/components/modals/employee-form-modal.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` markup and old `Table*` cells while preserving employee defaults, role/profile/office fields, save mutation, employee-list invalidation, and the selected `permissionIds` array contract.
- Preserved the existing permission id mapping: the visible `Create` column toggles each permission `viewPermissionId`, and the visible `Edit` column toggles each permission `editPermissionId`.
- Registered `employee-form-permissions` in table settings/config with compact `48px` rows, sticky Permission column, content-fit Permission/Create/Edit widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Employee form permissions plus Role Form/Employees parity tests passed with 14 tests / 44 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 249 tests / 2337 assertions.
  - focused Biome passed for the touched modal/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics; broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors.
  - HTTPS proxy smoke returned `200` for `/hrm/employees/v2`.
  - static scan found no `@gnd/ui/table`, inline `<Table*>`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `ScrollArea`, or `TCell` usage in `employee-form-modal.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded modal form slice.

Job Overview scope table evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/job-scope/*` for the non-custom task scope table inside the existing Job Overview modal.
- Updated `apps/www/src/components/modals/job-overview/job-scope.tsx` to render the domain-local table-core module instead of the `@gnd/ui/namespace` table while preserving job overview context usage, the scope description, custom-job explanatory state, and visible task title/rate/qty/maxQty/total values.
- Flattened the custom-job explanatory state so it no longer nests a `Card` inside the parent scope card.
- Registered `job-scope` in table settings/config with compact `48px` rows, sticky Task column, content-fit Task/Rate/Qty/Total widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Job Scope plus Contractor Jobs/Payment Portal jobs parity tests passed with 13 tests / 85 assertions.
  - full `bun test apps/www/src/components/tables-2` passed with 253 tests / 2337 assertions.
  - focused Biome passed for the touched modal/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - HTTPS proxy smokes returned `200` for `/hrm/contractors/jobs` and `/contractors/jobs/payment-portal`.
  - static scan found no runtime `import { Card, Table } from "@gnd/ui/namespace"`, inline `<Table*>`, `Table.Header`, `Table.Body`, `Table.Row`, or `Table.Cell` usage in `job-scope.tsx`; the only remaining strings are negative parity-test assertions.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded modal slice.

New Job install task quantity grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/new-job-install-tasks/*` for the install-cost task quantity grid inside the existing New Job modal.
- Updated `apps/www/src/components/modals/new-job/install-tasks-list.tsx` to render the domain-local table-core module instead of embedded raw `<table>` markup while preserving builder-task gating, missing-task config fallback, task title/rate/max quantity data, `job.tasks.${index}.qty` form binding, admin-only max constraint, disabled zero-max inputs, quantity suffix, validation error display, and live total calculation.
- Registered `new-job-install-tasks` in table settings/config with compact `56px` rows, sticky Item column, content-fit Item/Rate/Qty/Total widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- The Rate and Total columns are forcibly hidden unless quantity details are allowed (`state.showTaskQty` or admin), so saved visibility settings cannot leak admin-only pricing information into the modal.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused New Job install task parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 257 tests / 2337 assertions.
  - focused Biome passed for the touched modal/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics; broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors.
  - static scan found no inline `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>`, `InputGroup`, or `Controller` usage in `install-tasks-list.tsx`; the editable form cells now live in the table module.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded modal form slice.

Legacy Sales Form take-off HPT evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/sales-form-takeoff-hpt-lines/*` for the one-row take-off HPT size/swing/quantity/labor/estimate grid inside the existing legacy sales form take-off section.
- Updated `apps/www/src/components/forms/sales-form/take-off/hpt-form.tsx` to render the domain-local table-core module instead of embedded raw `<table>` markup.
- Preserved the existing `HptContextProvider` / `HptLineContextProvider` bindings, dev item UID display, size selector, swing selector, handle/no-handle quantity modes, price estimate menu, labor-per-quantity popover, and animated line total.
- Registered `sales-form-takeoff-hpt-lines` in table settings/config with compact `52px` rows, sticky Size column, content-fit Size/Swing/Qty/LH/RH/Estimate/Labor/Total widths, forced Swing and Qty-vs-LH/RH visibility, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings. The old header-only `PROD` column was not carried forward because it had no matching body cell or control.
- Validation:
  - focused take-off HPT parity tests passed with 4 tests.
  - full `apps/www/src/components/tables-2` suite passed with 289 tests / 2337 assertions.
  - focused Biome passed for touched files.
  - touched-file typecheck scan produced no diagnostics.
  - raw-table scan on the take-off form was clean; broader focused scan only reported the existing `production-v2/shared.tsx` DayPicker calendar `table-fixed` class.
  - `git diff --check` passed for touched files.
  - `components/tables-2/core` diff stayed clean.
  - Browser DOM proof was not run for this embedded legacy form slice.

Clean-code Sales Form door-size select modal evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/clean-code-door-size-select-lines/*` for the door-size option grid inside the clean-code sales form door-size select modal.
- Updated `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx` to render the domain-local table-core module instead of embedded raw `@gnd/ui/table` / `ScrollArea` markup.
- Preserved the existing clean-code `DoorSizeSelectProvider` context, supplier badge, modal footer actions, swap-door path, Super Admin price edit popover, non-admin price display, swing select, and handle/no-handle quantity field names.
- Registered `clean-code-door-size-select-lines` in table settings/config with compact `52px` rows, sticky Size column, content-fit Size/Price/Swing/Qty/LH/RH widths, forced Swing and Qty-vs-LH/RH visibility, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused clean-code door-size select parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 285 tests / 2337 assertions.
  - focused Biome passed for the touched modal/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - static scan found no raw table import, inline table components, `table-fixed`, or `table-sm` usage anywhere under the clean-code sales-form `_components` audit path.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded legacy modal slice.

Clean-code Sales Form moulding-step evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/clean-code-sales-form-moulding-lines/*` for the moulding-line grid inside the clean-code sales form moulding step.
- Updated `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/moulding-step/index.tsx` to render the domain-local table-core module on desktop instead of embedded raw `@gnd/ui/table` / `table-fixed` markup.
- Preserved the existing clean-code `MouldingClass` context, dynamic item-type header label, selected-line filtering, moulding title, quantity calculator, quantity input, price summary menu, custom price input, addon input, animated line total, delete confirmation, and recalculation wiring for quantity/addon/custom-price changes.
- Registered `clean-code-sales-form-moulding-lines` in table settings/config with compact `48px` rows, sticky Moulding column, content-fit S/N/Moulding/Qty/Estimate/Addon/Total/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused clean-code Sales Form moulding-line parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 281 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - static scan found no raw table import, inline table components, or `table-fixed` usage in the clean-code moulding step.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - At this point, the clean-code form audit still showed the door-size select modal as a remaining live raw-table candidate; the later door-size select modal evidence above cleared that candidate.
  - Browser DOM proof was not run for this embedded legacy form slice.

Clean-code Sales Form service-step evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/clean-code-sales-form-service-lines/*` for the service-line grid inside the clean-code sales form service step.
- Updated `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/service-step/index.tsx` to render the domain-local table-core module on desktop instead of embedded raw `@gnd/ui/table` / `table-fixed` markup, while preserving the existing mobile card path and Add Line action.
- Preserved the existing clean-code `ServiceClass` context, service description input, tax switch, production switch, quantity input, price input, animated line total, delete confirmation, and recalculation wiring for quantity/tax/price changes.
- Registered `clean-code-sales-form-service-lines` in table settings/config with compact `48px` rows, sticky Description column, content-fit S/N/Description/Tax/Prod/Qty/Price/Total/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused clean-code Sales Form service-line parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 277 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - static scan found no raw table import, inline table components, `TableFooter`, or `table-fixed` usage in the clean-code service step.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Current audit still shows the clean-code moulding step and door-size select modal as remaining live raw-table candidates.
  - Browser DOM proof was not run for this embedded legacy form slice.

Legacy Sales Form shelf items evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/sales-form-shelf-items/*` for the shelf item section/product grid inside the existing legacy Shelf Items sales form section.
- Updated `apps/www/src/components/forms/sales-form/shelf-items.tsx` to render the domain-local table-core module on desktop instead of nested raw `@gnd/ui/table` / `table-sm` markup, while preserving the existing mobile card path and Item Section action.
- Flattened section/product rows for table-core rendering: category editing appears on the first row for each section, and each section gets an `Add Product` row while product rows keep product selection, price, quantity, total, and delete controls.
- Preserved the existing shelf category combobox, category create/clear behavior, product combobox, product add/delete behavior, price popover, quantity input, animated totals, and `kvFormItem.<item>.shelfItems` form-store contract.
- Registered `sales-form-shelf-items` in table settings/config with compact `56px` rows, sticky Category column, content-fit S/N/Category/Product/Price/Qty/Total/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Sales Form shelf-items parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 273 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics; broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors.
  - static scan found no raw table import, inline table components, or `table-sm` usage anywhere under `components/forms/sales-form`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded legacy form slice.

Legacy Sales Form HPT lines evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/sales-form-hpt-lines/*` for the HPT door-size line grid inside the existing HPT sales form section.
- Updated `apps/www/src/components/forms/sales-form/hpt/hpt-section.tsx` to render the domain-local table-core module on desktop instead of embedded raw `@gnd/ui/table` / `table-sm` markup, while preserving the existing mobile card path, Add Door Size control, and door preview column.
- Updated `apps/www/src/components/forms/sales-form/hpt/hpt-note.tsx` so desktop notes render as row-adjacent panels outside the old table row/colspan structure.
- Preserved the existing HPT line context bindings, size display, production override switch, swing input, handle/no-handle quantity modes, price estimate, animated line total, note toggle/panel behavior, and delete confirmation behavior.
- Registered `sales-form-hpt-lines` in table settings/config with compact `48px` rows, sticky Size column, content-fit S/N/Size/Prod/Swing/Qty/Lh/Rh/Estimate/Total/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, persisted settings, and forced visibility for slab/swing/no-handle modes.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Sales Form HPT-line parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 269 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics; broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors.
  - static scan found no raw table import, inline table components, or `table-sm` usage in `hpt-section.tsx` or `hpt-note.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded legacy form slice.

Legacy Sales Form moulding lines evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/sales-form-moulding-lines/*` for the moulding line grid inside the existing Moulding/Service sales form section.
- Updated `apps/www/src/components/forms/sales-form/moulding-and-service/moulding-content.tsx` to render the domain-local table-core module on desktop instead of embedded raw `@gnd/ui/table` / `table-sm` markup, while preserving the existing mobile card path and Add Moulding popover.
- Preserved the existing `LineItemProvider` bindings, moulding description display, quantity input, price summary menu, addon input, custom price input, animated total, and delete confirmation behavior.
- Registered `sales-form-moulding-lines` in table settings/config with compact `48px` rows, sticky Moulding column, content-fit S/N/Moulding/Qty/Estimate/Addon/Total/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Sales Form moulding-line parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 265 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics; broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors.
  - static scan found no raw table import, inline table components, or `table-sm` usage in `moulding-content.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded legacy form slice.

Legacy Sales Form service lines evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/sales-form-service-lines/*` for the service line grid inside the existing Moulding/Service sales form section.
- Updated `apps/www/src/components/forms/sales-form/moulding-and-service/service-content.tsx` to render the domain-local table-core module on desktop instead of embedded raw `@gnd/ui/table` / `table-sm` markup, while preserving the existing mobile card path.
- Preserved the existing `LineItemProvider` bindings, service input, tax switch, production switch behavior, quantity input, price input, animated total, delete confirmation, and `valueChanged` wiring where the old desktop table used it.
- Registered `sales-form-service-lines` in table settings/config with compact `48px` rows, sticky Service column, content-fit S/N/Service/Tax/Production/Qty/Price/Total/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- Kept `components/tables-2/core/*` unchanged.
- Validation:
  - focused Sales Form service-line parity tests passed with 4 tests.
  - full `bun test apps/www/src/components/tables-2` passed with 261 tests / 2337 assertions.
  - focused Biome passed for the touched form/table/test/settings/config files.
  - touched-file filtered `@gnd/www` typecheck output showed no diagnostics; broad `@gnd/www` typecheck remains blocked by unrelated baseline API/UI errors.
  - static scan found no raw table import, inline table components, or `table-sm` usage in `service-content.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser DOM proof was not run for this embedded legacy form slice.

Phase 5 customer-services evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/customer-service/*`.
- Updated `/community/customer-services` to render the new table directly on the actual route.
- Reused existing customer-service contracts:
  - `CustomerServiceHeader`
  - `customerServiceFilterParams`
  - `loadCustomerServiceFilterParams`
  - `useCustomerServiceFilterParams`
  - `trpc.filters.customerService`
  - `trpc.customerService.getCustomerServices`
  - `trpc.hrm.getEmployees` with `roles: ["Punchout"]`
  - existing work-order sheet params, assignment mutation, status mutation, and delete mutation
- Did not add a customer-service `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup completed after import scans:
  - removed `apps/www/src/components/tables/customer-service/data-table.tsx`
  - removed `apps/www/src/components/tables/customer-service/columns.tsx`
- Browser validation exposed an invalid shared summary-card skeleton nested inside paragraph/heading text on the customer-services summary widgets; `packages/ui/src/components/custom/summary-card-skeleton.tsx` now uses valid inline/block skeleton placeholders, eliminating the fresh hydration warnings on the route.
- Validation:
  - focused Biome check passed for the customer-services route, header, table settings/config, new customer-service `tables-2` files, and the shared summary-card skeleton fix.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched customer-services route/table/header/settings/config files.
  - import scans found no remaining runtime references to `components/tables/customer-service` or `tables/customer-service`.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the customer-service slice.
  - HTTP smoke returned `200` for `/community/customer-services`.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `/community/customer-services`, desktop `/community/customer-services?q=Yanaixy`, and mobile `390x844` `/community/customer-services`.
  - Desktop and mobile customer-services routes had no document-level horizontal overflow; the mobile table retained its own horizontal scroll container.

Phase 5 customer-services density follow-up captured on 2026-07-17:
- Tightened the already-migrated `components/tables-2/customer-service/*` table toward the Sales Orders/Midday invoices compact target without changing the customer-service route, query, filter, summary widgets, chart, mutations, or `components/tables-2/core`.
- Appointment/Customer/Description/Assigned To/Status/Actions widths now use content-fit ranges (`132/210/154`, `160/280/190`, `220/420/260`, `140/220/160`, `112/170/128`, `88/112/96`).
- `TABLE_CONFIGS["customer-service"].rowHeight` is now `56`, and the assignment combobox uses a compact `h-8` trigger so two-line work-order rows no longer need the prior `72px` height.
- Validation:
  - focused Customer Services parity tests passed with 4 tests / 38 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 305 tests / 2538 assertions.
  - focused Biome passed for the touched Customer Service table/config/test files.
  - touched-file typecheck grep produced no Customer Service/table-config diagnostics after making the touched parity test typecheck-friendly.
  - direct HTTP route smoke returned `200` for `/community/customer-services`.
  - follow-up authenticated browser proof on `https://gndprodesk.localhost/community/customer-services` confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 2285`, `clientHeight 299`), and no document-level horizontal overflow. The compact widths fit the current desktop table container exactly (`scrollWidth 1131`, `clientWidth 1131`), so horizontal overflow was not present to scroll.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.

Phase 5 unit-invoices evidence captured on 2026-06-16:
- Added the domain table module under `apps/www/src/components/tables-2/unit-invoices/*`.
- Updated `/community/unit-invoices` to render the new table directly on the actual route.
- Reused existing unit-invoice contracts:
  - `UnitInvoicesHeader`
  - `unitInvoiceFilterParams`
  - `loadUnitInvoiceFilterParams`
  - `useUnitInvoiceFilterParams`
  - `useUnitInvoiceParams`
  - `trpc.filters.projectUnit`
  - `trpc.community.getUnitInvoices`
  - existing unit-invoice report menu and edit modal
- Did not add a unit-invoice `*V2` query, filter param, filter metadata endpoint, or new route.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Cleanup was initially deferred because `apps/www/src/components/widgets/project-overview/index.tsx` imported `components/tables/unit-invoices/*` for its embeddable project overview tab. The 2026-07-16 Project Overview embed restart moved that tab to `tables-2/unit-invoices`, and the 2026-07-17 legacy cleanup removed the old unit-invoice table files after import scans found no live consumers.
- Browser validation exposed a shared `CustomModal` accessibility issue where the generated Radix `aria-labelledby` / `aria-describedby` ids could not resolve because custom ids overrode the generated title/description ids. `apps/www/src/components/modals/custom-modal.tsx` now lets Radix own normal title/description ids and keeps the hidden accessible title/description plus portal placeholders for the `titleAsChild` / `descriptionAsChild` path.
- Validation:
  - focused Biome check passed for the unit-invoices route, header, table settings/config, new unit-invoices `tables-2` files, and the `CustomModal` accessibility fix.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched unit-invoices route/table/header/settings/config files or `CustomModal`.
  - import scans confirmed the unit-invoices route no longer imports `components/tables/unit-invoices`; the 2026-07-17 cleanup confirmed no live source imports remained before deleting the old folder.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the unit-invoices slice.
  - HTTP smoke returned `200` for `/community/unit-invoices`.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `/community/unit-invoices`, existing `q` search binding, mobile `390x844` `/community/unit-invoices`, and row-open invoice modal behavior.
  - Desktop and mobile unit-invoices routes had no document-level horizontal overflow; the mobile table retained its own horizontal scroll container.

Unit Invoices restarted-loading cleanup evidence captured on 2026-07-17:
- Updated `apps/www/src/app/(sidebar)/community/(main)/unit-invoices/loading.tsx` to render `UnitInvoicesSkeleton` from `components/tables-2/unit-invoices` instead of the old `_v1` `DataTableLoading` wrapper.
- Deleted the now-unused `apps/www/src/components/_v1/data-table/data-table-loading.tsx` wrapper after import scans showed it had no remaining live consumers.
- The cleanup removes the last live `components/tables/skeleton` import path from restarted route loading states without changing the Unit Invoices query, route, filter params, table-core files, or compact column widths.
- Validation:
  - focused Unit Invoices parity tests passed with 5 tests / 27 assertions.
  - full restarted table parity suite passed with 170 tests / 1670 assertions.
  - targeted Biome passed for the loading route and Unit Invoices parity test.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - static scan found no live `DataTableLoading`, `data-table-loading`, or `components/tables/skeleton` references.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Unit Invoice edit-form task grid evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/unit-invoice-form-tasks/*` for the desktop task grid inside the existing Unit Invoice edit modal.
- Updated `apps/www/src/components/forms/unit-invoice-form.tsx` to render the domain-local table-core module instead of embedded `@gnd/ui/table` / `table-sm` markup on desktop, while leaving the existing mobile card task editor intact.
- Preserved the existing task add/delete/save flow, locked generated-task fields, editable paid/check/check-date/created-at fields, first-check and first-check-date sync checkboxes, and typed Unit Invoice page-tab invalidation after save/delete.
- Registered `unit-invoice-form-tasks` in table settings/config with compact `52px` rows, sticky Task column, content-fit Task/Due/Paid/Check/Check Date/Created/Actions widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, column dividers, and persisted settings.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - `bun test apps/www/src/components/tables-2` passed with 221 tests / 2327 assertions.
  - `bun test apps/www/src/components/tables-2/unit-invoices/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 9 tests / 43 assertions.
  - Focused Biome passed for the touched form/table/test/settings/config files.
  - Touched-file filtered `@gnd/www` typecheck output showed no diagnostics.
  - HTTP smoke returned `200` for `/community/unit-invoices`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Phase 5 Project Overview embeds evidence captured on 2026-07-16:
- Updated `apps/www/src/components/widgets/project-overview/index.tsx` so all operational tabs use restarted `tables-2` modules:
  - Units -> `tables-2/project-units`
  - Production -> `tables-2/unit-productions`
  - Invoices -> `tables-2/unit-invoices`
  - Jobs -> `tables-2/contractor-jobs`
- Removed Project Overview imports of legacy `components/tables/contractor-jobs`, `components/tables/unit-invoices`, and `components/tables/unit-productions`.
- Added embedded/custom-column support to `tables-2/contractor-jobs` so project overview jobs can use project-scoped filters and compact project-tab columns while retaining table-owned scroll, virtualization, DnD, resize, sticky columns, and persisted table settings.
- Exported project-tab columns from `tables-2/unit-invoices` and `tables-2/unit-productions`; unit productions keeps the select column in project-tab embeds to preserve the Sales Orders-style sticky offset.
- Validation:
  - focused Project Overview-related table tests passed with 19 tests / 135 assertions.
  - full restarted parity suite passed with 57 tests / 480 assertions.
  - targeted Biome passed for the overview widget, contractor jobs embedded support, project-tab columns, and parity tests.
  - broad `@gnd/www` typecheck remains blocked by existing unrelated baseline errors, but the touched-file typecheck filter reported no diagnostics for the overview widget or changed table files.
  - static scan found no legacy project-overview table imports.
  - `git diff --check` passed.
  - HEAD smoke for `/community/projects/breezewood-villas` returned `200`; full body smoke was stopped after a long local server response, so scroll behavior is covered by source-level table-owned scroll parity tests rather than browser interaction proof for this embed slice.

Phase 5 worker jobs dashboard evidence captured on 2026-07-16:
- Updated `/jobs-dashboard/jobs-list` from manual `getQueryClient().fetchInfiniteQuery` hydration to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `ErrorBoundary`, `Suspense`, `batchPrefetch`, and `getInitialTableSettings("contractor-jobs")`.
- Replaced `components/jobs-dashboard/worker-jobs-list.tsx` legacy imports of `components/tables/contractor-jobs/data-table` and `components/tables/skeleton` with `tables-2/contractor-jobs`.
- Added `workerDashboardColumns` to `tables-2/contractor-jobs` with content-tailored worker widths: `Job`, narrowed `Description`, `Project / Unit`, `Status`, `Amount`, and narrowed `Actions`, while preserving the select column for sticky offset consistency.
- Extended the restarted contractor-jobs skeleton/custom-column path so the worker dashboard loading state matches the worker column set.
- Kept the worker dashboard's guarded `Submit Job` empty-state action by allowing the domain empty state to receive a custom action without changing `tables-2/core`.
- Validation:
  - focused Contractor Jobs/page audit tests passed with 8 tests / 48 assertions.
  - full restarted parity suite passed with 58 tests / 491 assertions.
  - targeted Biome passed for the route, worker list, contractor table files, and audits.
  - broad `@gnd/www` typecheck remains blocked by existing unrelated baseline errors, but the touched-file typecheck filter reported no diagnostics.
  - static scan found no live legacy contractor-jobs table, `@gnd/ui/data-table`, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the worker jobs route/list.
  - `git diff --check` passed.
  - HEAD smoke for `/jobs-dashboard/jobs-list` returned `200`.

Phase 5 contractor payouts evidence captured on 2026-07-16:
- Added `apps/www/src/components/tables-2/contractor-payouts/*` for `/contractors/jobs/payments`.
- Updated the payment route from manual `getQueryClient().fetchInfiniteQuery` hydration to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("contractor-payouts")`.
- Replaced `components/payment-dashboard/payments-history-view.tsx` imports of `components/tables/contractor-payouts/data-table` with the restarted `tables-2/contractor-payouts` table.
- Registered `contractor-payouts` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 64px rows, sticky select/payout columns, sort field mappings for `date`, `paidTo`, `authorizedBy`, and `amount`, and content-tailored payout widths.
- Added table-owned scroll, virtual rows, DnD, resize, persisted visibility/sizing/order/dividers, selected-row state, and the Sales Orders-style print-report bottom bar.
- Added `ContractorPayoutsColumnVisibility` to the payout search header and switched the payment dashboard lazy fallback off the legacy `components/tables/skeleton`.
- Validation:
  - focused Contractor Payouts/page audit tests passed with 7 tests / 38 assertions.
  - full restarted parity suite passed with 62 tests / 526 assertions.
  - targeted Biome passed for the route, payment history view, header, table files, table settings/config, and audit tests.
  - broad `@gnd/www` typecheck remains blocked by existing unrelated baseline errors, but the touched-file typecheck filter reported no diagnostics.
  - static scan found no live legacy contractor-payout table, `@gnd/ui/data-table`, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the route/view/table.
  - `git diff --check` passed.
  - HEAD smoke for `/contractors/jobs/payments` returned `200`.

Phase 5 legacy table cleanup evidence captured on 2026-07-17:
- Removed the unused legacy table folders after the corresponding routes and embeds had already moved to `tables-2`:
  - `apps/www/src/components/tables/community-project/*`
  - `apps/www/src/components/tables/project-units/*`
  - `apps/www/src/components/tables/unit-invoices/*`
  - `apps/www/src/components/tables/unit-productions/*`
  - `apps/www/src/components/tables/contractor-jobs/*`
  - `apps/www/src/components/tables/contractor-payouts/*`
- Import scans found no live source consumers outside Brain notes and negative audit assertion strings before deletion.
- The cleanup did not change `apps/www/src/components/tables-2/core/*`, route query contracts, filter contracts, row actions, or table settings.

Final `apps/www/src/components/tables` runtime cleanup evidence captured on 2026-07-17:
- Removed the remaining unused legacy files under `apps/www/src/components/tables`, including old employees, roles/profile tabs, sales accounting transaction helper, sales orders, sales quotes, sales production, shared action-cell/header/row/index, and shared skeleton modules.
- `rg --files apps/www/src/components/tables` now returns no files.
- Exact live-source import scans for `components/tables` across `apps/www/src`, `packages`, and `apps/api/src` return no non-test consumers; only negative audit strings and historical Brain notes remain.
- Validation: `bun test apps/www/src/components/page-sticky-header.test.ts` passed with 3 tests / 3 assertions, and `bun test apps/www/src/components/tables-2` passed with 220 tests / 2314 assertions.
- Follow-up guard hardening on 2026-07-17 added an explicit empty-tree assertion for `apps/www/src/components/tables` to `page-sticky-header.test.ts`, so reintroduced legacy table helper files fail the audit even if they do not import old table primitives. Validation passed with `bun test apps/www/src/components/page-sticky-header.test.ts` at 5 tests / 7 assertions, focused Biome for the audit test, and `find apps/www/src/components/tables -type f` returning no files.
- `apps/www/src/components/tables-2/core/*` remained unchanged.

Live app table-system guard evidence captured on 2026-07-17:
- `apps/www/src/components/page-sticky-header.test.ts` now includes a source-level audit that walks `apps/www/src/app`, `apps/www/src/components`, and `apps/www/src/features` and fails if live surfaces outside `components/tables-2` / retired legacy internals reintroduce old table systems.
- The guard blocks `@gnd/ui/data-table`, raw `@gnd/ui/table`, old `components/tables/*`, `_v1/data-table`, old clean-code `table-cells`, and raw JSX table tags, while allowing real `tables-2` domain modules to use the same table primitives as Sales Orders.
- The remaining live sales overview `TCell.Date` helper dependency was removed from the overview tab and legacy sales-overview sheet by formatting dates directly.
- Validation: `bun test apps/www/src/components/page-sticky-header.test.ts` passed with 4 tests / 4 assertions; live-source table scans and live `TCell` scans returned no output; focused Biome passed for the audit test and `overview-tab.tsx`; `git diff --check` passed for touched files. Broad `@gnd/www` typecheck remains blocked by pre-existing Sales Overview type debt.

Legacy clean-code table engine cleanup evidence captured on 2026-07-17:
- Removed isolated unused helper files from the retired table systems:
  - `apps/www/src/components/(clean-code)/data-table/table-cells.tsx`
  - `apps/www/src/components/(clean-code)/data-table/use-data-table.ts`
  - `apps/www/src/components/(clean-code)/data-table/use-infinity-data-table.tsx`
  - `apps/www/src/components/(clean-code)/data-table/use-table-compose.tsx`
  - `apps/www/src/components/(clean-code)/data-table/data-table-column-header.tsx`
  - `apps/www/src/components/(clean-code)/data-table/query-options.ts`
  - `apps/www/src/components/(clean-code)/data-table/filter-command/filters.ts`
  - `apps/www/src/components/_v1/data-table/data-table-row-actions.tsx`
  - `apps/www/src/components/_v1/data-table/data-table-column-header.tsx`
- Preserved `apps/www/src/components/(clean-code)/data-table/search-params.ts` and `apps/www/src/components/(clean-code)/data-table/Dl.tsx` because they still have live non-table callers.
- Precise import scans found no live source consumers of the deleted files before deletion; post-deletion scans found only negative migration-parity/audit assertion strings.
- `apps/www/src/components/page-sticky-header.test.ts` now also allowlists only `Dl.tsx` and `search-params.ts` under the retired clean-code data-table directory, asserts `_v1/data-table` has no source files, and asserts the old `components/tables` runtime tree stays empty, so the deleted helper set cannot be reintroduced without failing the restarted table audit.
- Validation: `bun test apps/www/src/components/page-sticky-header.test.ts` passed with 5 tests / 7 assertions after the `components/tables` guard; filtered `@gnd/www` typecheck scan for the deleted module names returned no diagnostics; focused Biome passed for the audit test; `git diff --check` passed for the deleted files and docs; `apps/www/src/components/tables-2/core/*` stayed unchanged.

Phase 5 site actions evidence captured on 2026-07-16:
- Added `apps/www/src/components/tables-2/site-actions/*` for `/site-actions`.
- Updated the route from manual `getQueryClient().fetchInfiniteQuery` hydration and legacy `components/tables/site-actions` imports to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("site-actions")`.
- Registered `site-actions` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 56px rows, sticky select/date columns, sort mappings for `createdAt`, `event`, `activity`, and `reference`, and content-tailored audit-log widths for Date, Event, Activity, Author, and Ref.
- Added table-owned scroll, virtual rows, DnD, resize, persisted visibility/sizing/order/dividers, selected-row state, a column visibility/divider control, and a Sales Orders-style Deselect all bottom bar.
- Hardened `siteActionsFilterSchema` and `getSiteActions` so `q`, `status`, `cursor`, `size`, and `sort[]` reach the API and sortable fields map to safe Prisma order fields.
- Removed old `components/tables/site-actions/*` files after import scans confirmed no live consumers.
- Validation:
  - focused Site Actions/page audit tests passed with 6 tests / 39 assertions.
  - full restarted parity suite passed with 65 tests / 562 assertions.
  - targeted Biome passed for the route, table files, table settings/config, audit tests, API schema/query, and notification helper.
  - filtered `@gnd/www`, `@gnd/api`, and `@gnd/notifications` typecheck greps reported no touched-file diagnostics.
  - static scan found no live legacy Site Actions table, `@gnd/ui/data-table`, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the route/table.
  - `git diff --check` passed.
  - HEAD smoke for `/site-actions` returned `200`.

Phase 5 short links evidence captured on 2026-07-16:
- Added `apps/www/src/components/tables-2/short-links/*` for `/settings/short-links`.
- Updated the settings route from a simple inline table page to the restarted shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("short-links")`.
- Kept the existing Short Links settings workflows for create, edit, deactivate, URL search, and "Show inactive", while replacing the list with the restarted table wrapped in `ErrorBoundary`/`Suspense`.
- Registered `short-links` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 64px rows, sticky select/short-link columns, sort mappings for slug, target URL, active status, click count, last click, and expiry, plus content-tailored Short Link, Target, Status, Clicks, Last Click, Expiry, and Actions widths.
- Added table-owned scroll, virtual rows, DnD, resize, persisted visibility/sizing/order/dividers, selected-row state, a column visibility/divider control, and a Sales Orders-style Deselect all bottom bar.
- Hardened `listShortLinksSchema` and `listShortLinks` so `cursor`, `size`, and `sort[]` reach the existing query and sortable fields map to safe Prisma order fields.
- Validation:
  - focused Short Links/page audit tests passed with 6 tests / 38 assertions.
  - full restarted parity suite passed with 68 tests / 597 assertions.
  - targeted Biome passed for the route, settings page, table files, table settings/config, audit tests, API schema, and DB query.
  - filtered `@gnd/www`, `@gnd/api`, and `@gnd/db` typecheck greps reported no touched-file diagnostics.
  - static scan found no live Short Links inline table, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the route/settings surface.
  - `git diff --check` passed.
  - GET smoke compiled `/settings/short-links`, and a warmed HEAD smoke returned `200`.

Phase 5 task-run diagnostics evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/task-run-diagnostics/*` for `/task-events/diagnostics`.
- Updated the diagnostics route from manual `getQueryClient().fetchQuery` hydration and a raw `@gnd/ui/table` list to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("task-run-diagnostics")`.
- Kept the existing task-run diagnostics contracts:
  - `trpc.taskRunDiagnostics.list.queryOptions`
  - `trpc.taskRunDiagnostics.markReviewed.mutationOptions`
  - existing Super Admin-only diagnostics access and mark-reviewed behavior
- Registered `task-run-diagnostics` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 56px rows, sticky Status and Actions columns, and content-tailored Status/Task/Entity/User/Started/Error/Actions widths.
- 2026-07-17 density update: flattened the status metadata into a single row, tightened Status/Task/Entity/User/Started/Error/Actions widths to `128/196/148`, `190/360/230`, `150/280/180`, `160/300/200`, `118/180/136`, `220/460/280`, and `108/140/120`, and aligned `TABLE_CONFIGS["task-run-diagnostics"].rowHeight` to `56`.
- Added table-owned scroll, virtual rows, DnD, resize, persisted visibility/sizing/order/dividers, column visibility, search/status/page filters, refresh, and a primary Review action for unreviewed diagnostics.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused diagnostics/page audit tests passed with 6 tests / 39 assertions.
  - full restarted parity suite passed with 117 tests / 1086 assertions.
  - targeted Biome passed for the diagnostics route, dashboard wrapper, table files, table settings/config, and audit tests.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while the broad typecheck remains subject to existing workspace baseline errors.
  - static scan found no live raw table/manual fetch usage in the diagnostics route wrapper.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - 2026-07-17 density validation: focused task-run-diagnostics migration-parity tests passed with 3 tests / 37 assertions; full `apps/www/src/components/tables-2` suite passed with 305 tests / 2528 assertions; focused Biome passed; touched-file typecheck scan produced no diagnostics; touched-file `git diff --check` passed; `components/tables-2/core` stayed untouched; the initial browser proof confirmed `56px` loading rows, a `45px` header, table-owned horizontal overflow/scroll (`scrollWidth 1294`, `clientWidth 1146`, `scrollLeft 0 -> 148`), and no document-level horizontal overflow while real-row proof waited on the then-missing local table.
  - 2026-07-17 browser-proof follow-up: after the local `TaskRunDiagnostic` table was added, authenticated browser validation loaded `/task-events/diagnostics` with temporary local proof rows and confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 2915`, `clientHeight 439`), table-owned horizontal scroll (`scrollLeft 0 -> 148`, `scrollWidth 1294`, `clientWidth 1146`), no document-level horizontal overflow, and no login/runtime error. The `65` proof rows were deleted afterward and the local diagnostics table returned to `0` rows.

Phase 5 task event history evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/task-event-history/*` for the `/task-events/[eventName]` detail route history table.
- Updated the detail route from manual `getQueryClient().fetchQuery` hydration to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("task-event-history")`.
- Replaced the raw run-history `<table>` inside `TaskEventDetail` with the domain `tables-2/task-event-history` table and a local column visibility/divider control.
- Kept the existing task-event contracts and behavior:
  - `trpc.taskEvents.get.queryOptions`
  - `trpc.taskEvents.history.queryOptions`
  - `trpc.taskEvents.update.mutationOptions`
  - `trpc.taskEvents.runNow.mutationOptions`
  - `trpc.taskEvents.runTest.mutationOptions`
  - existing sales-order filter editor and manual payment-report run flow
- Registered `task-event-history` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact styling, sticky Time, `112px` rows for bounded multi-line metadata previews, and content-tailored Time/Value/Trigger/Meta widths (`136/210/156`, `72/112/84`, `96/150/112`, `300/700/460`).
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused task-event-history parity tests passed with 3 tests / 37 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 305 tests / 2529 assertions.
  - targeted Biome passed for the detail route, detail component, table files, table settings/config, and audit test.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while broad typecheck remains subject to existing workspace baseline errors.
  - static scan found no live raw table/manual fetch usage in the task-event detail route/component.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - browser proof on `/task-events/sales-daily-payment-report-schedule` confirmed `112px` rows, `45px` header, table-owned vertical scroll (`scrollTop 0 -> 600`, `scrollHeight 2355`, `clientHeight 259`), no document-level horizontal overflow, and screenshot evidence at `/private/tmp/gnd-task-event-history-table.jpg`.
  - narrow viewport proof at `760px` confirmed table-owned horizontal and vertical scroll (`scrollWidth 814`, `clientWidth 661`, `scrollLeft 0 -> 153`, `scrollTop 0 -> 600`) with no document-level horizontal overflow; screenshot evidence is at `/private/tmp/gnd-task-event-history-table-narrow.jpg`.

Phase 5 task events dashboard evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/task-events/*` for the `/task-events` dashboard list.
- Updated the dashboard route from manual `getQueryClient().fetchQuery` hydration to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("task-events")`.
- Replaced the card-mapped task event list in `TaskEventsDashboard` with the domain `tables-2/task-events` table while keeping the existing `taskEvents.list` contract, client search, refresh action, Task Diagnostics link, and event-open action.
- Registered `task-events` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact `64px` rows, sticky Event and Actions columns, and content-tailored Event/Status/Last Run/Records/Latest Result/Actions widths.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused task-events parity tests passed with 3 tests / 37 assertions.
  - full restarted parity suite passed with 186 tests / 1830 assertions.
  - targeted Biome passed for the route, dashboard component, table files, table settings/config, and audit test.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while broad typecheck remains subject to existing workspace baseline errors.
  - static scan found no live card-mapped list, raw table, or manual fetch usage in the task events route/dashboard/table surface.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Runtime route smoke did not complete because both `https://gndprodesk.localhost:3011/task-events` and `http://127.0.0.1:3010/task-events` timed out after 20s with no bytes from the local dev server.

Phase 5 document approvals evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/document-approvals/*` for the `/hrm/document-approvals` approval queue.
- Updated the route to hydrate `getInitialTableSettings("document-approvals")`, wrap content in `ScrollableContent`, and pass persisted table settings into `DocumentApprovalList`.
- Replaced the card-mapped approval rows in `DocumentApprovalList` with the domain `tables-2/document-approvals` table while keeping the existing `getEmployeeDocumentApprovals` server action, `reviewEmployeeDocument` approve/reject action, Open Review URL-param behavior, success toasts, route refresh, and document URL opening.
- Registered `document-approvals` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact `56px` rows, sticky Employee and Actions columns, and tightened Employee/Document/Status/Dates/Reviewed/Actions widths (`180/320/220`, `180/340/220`, `104/150/118`, `132/210/154`, `112/170/128`, `156/210/172`).
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused document-approvals parity tests passed with 3 tests / 41 assertions after the 56px density follow-up.
  - full restarted parity suite passed with 189 tests / 1868 assertions.
  - targeted Biome passed for the route, list wrapper, table files, table settings/config, and audit test.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while broad typecheck remains subject to existing workspace baseline errors.
  - static scan found no live card-mapped approval row, old table, shared sticky header, or manual fetch usage in the document approvals route/list surface; the only table primitives are inside the new `tables-2` module.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Follow-up direct local HTTP route smoke returned `200` for `/hrm/document-approvals`.
  - Follow-up authenticated browser proof on `https://gndprodesk.localhost/hrm/document-approvals` confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 1837`, `clientHeight 419`), and no document-level horizontal overflow. The compact column widths fit the current desktop table container exactly (`scrollWidth 1144`, `clientWidth 1144`), so horizontal overflow was not present to scroll.

Phase 5 bug reports evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/bug-reports/*` for the `/support/bug-reports` support issue board.
- Updated the route to hydrate `getInitialTableSettings("bug-reports")`, wrap content in `ScrollableContent`, and pass persisted table settings into `BugReportWorkspace`.
- Replaced the card-mapped report buttons in `BugReportWorkspace` with the domain `tables-2/bug-reports` table while keeping the existing `bugReports.mine`, `bugReports.adminList`, `bugReports.byId`, status update, evidence preview, and follow-up contracts.
- Registered `bug-reports` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact `64px` rows, sticky Report and Actions columns, and content-tailored Report/Status/Capture/Replies/Submitted/Actions widths.
- Added row-click selection into the existing detail panel, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, horizontal pagination, persisted visibility/sizing/order/dividers, and local column visibility/divider controls.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused bug-reports parity tests passed with 3 tests / 40 assertions.
  - full restarted parity suite passed with 192 tests / 1908 assertions.
  - targeted Biome passed for the route, workspace, table files, table settings/config, and audit test.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while broad typecheck remains subject to existing workspace baseline errors.
  - static scan found no live card-mapped report row, old table, shared sticky header, or manual fetch usage in the bug reports route/workspace surface; the only matched legacy strings were negative assertions in the parity test.
  - route smoke returned `200` for both `https://gndprodesk.localhost:3011/support/bug-reports` and `http://localhost:3010/support/bug-reports` after the dev server booted.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Phase 5 master password login audit evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/master-password-logins/*` for `/settings/master-password-logins`.
- Updated the settings audit route from a Card-wrapped raw `@gnd/ui/table` list to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("master-password-logins")`.
- Kept the existing master-password login audit contracts:
  - `trpc.masterPasswordLoginAudits.list.queryOptions`
  - `trpc.masterPasswordLoginAudits.clear.mutationOptions`
  - existing Super Admin-only audit access and clear behavior
- Registered `master-password-logins` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 64px rows, sticky User and Actions columns, and content-tailored User/Login Time/Platform/IP/Browser/Session/Status/Actions widths.
- Added table-owned scroll, virtual rows, DnD, resize, persisted visibility/sizing/order/dividers, column visibility, search/platform/show-cleared/page filters, refresh, clear-filtered, and row-level clear through the existing `ids` mutation input.
- `apps/www/src/components/tables-2/core/*` remained unchanged.
- Validation:
  - focused master-password-logins/page audit tests passed with 6 tests / 40 assertions.
  - full restarted parity suite passed with 120 tests / 1123 assertions.
  - targeted Biome passed for the route, audit page wrapper, table files, table settings/config, and audit tests.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while the broad typecheck remains subject to existing workspace baseline errors.
  - static scan found no live raw table/manual fetch usage in the route wrapper and confirmed the new table-core mechanics.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Runtime smoke is blocked by the current local Next dev server state: `/login/v2` eventually responds, but `/settings/master-password-logins` timed out after 30s and the log remains at `Compiling /settings/master-password-logins`.
  - Runtime smoke is blocked by current local Next dev-server state: `/task-events/diagnostics`, `/login/v2`, and `/sales-book/orders` timed out while the dev log stayed at `Compiling /task-events/diagnostics` and the `next-server` process was in uninterruptible sleep.

Phase 5 settings profile evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/user-logged-in-devices/*` for `/settings/profile` Active Sessions.
- Updated the settings profile route to hydrate `getInitialTableSettings("user-logged-in-devices")` and pass those settings into `UserLoggedInDevices`.
- Updated `components/user-logged-in-devices.tsx` from an inline `@gnd/ui/table` with `DataSkeletonProvider`/`skeletonListData` rows to the restarted table module with a local column visibility/divider control.
- Kept the existing mock active-session rows and placeholder logout timeout behavior.
- Registered `user-logged-in-devices` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 40px rows, sticky Device plus right-sticky Actions, and content-tailored Device/Location/IP Address/Last Login/Actions widths.
- No profile API query, auth/session contract, route fork, database change, permission change, or core table change was added.
- Validation:
  - focused profile devices parity tests passed with 4 tests / 43 assertions.
  - full restarted table parity suite passed with 159 tests / 1519 assertions.
  - targeted Biome passed for the route, component, table files, table settings/config, and audit test.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - static scans found no inline table/skeleton-provider leftovers in the profile component and no stale copied-module names in the new module.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

Phase 5 legacy Square payment fallback evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/legacy-square-payment-orders/*` for the fallback `/square-payment/[emailToken]/[orderIds]` multi-order payment details list.
- Updated `legacy-square-payment-page.tsx` from inline `@gnd/ui/table` markup to the restarted table module while preserving the single-order summary, `getSalesPaymentCheckoutInfoAction`, `createSalesCheckoutLinkAction`, and legacy payment-link open behavior.
- Registered `legacy-square-payment-orders` in `TableId`, default table settings, and `TABLE_CONFIGS` with compact 40px rows, sticky Invoice, and content-tailored Invoice/Billing/Due widths (`112/160/128`, `170/260/210`, `92/128/104`).
- No checkout API query, Square payment mutation, route redirect, database, permission, or `components/tables-2/core` change was added.
- Validation:
  - focused legacy Square payment parity tests passed with 3 tests / 27 assertions.
  - full restarted table parity suite passed with 159 tests / 1543 assertions.
  - targeted Biome passed for the fallback page, new table module, and table registry files.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - static scan found no raw `@gnd/ui/table` imports or `Table*` markup in the fallback checkout page.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser smoke was not run because this public fallback requires a valid legacy email token/order-id combination.

Phase 5 Sales Report customer-statement dialog evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/customer-statement-report/*` for the Sales Report customer statement report list.
- Added `apps/www/src/components/tables-2/customer-statement-lines/*` for the statement overview line selector.
- Updated `apps/www/src/components/sales-report-menu.tsx` from inline `@gnd/ui/table` markup to the restarted table modules while preserving the existing `customers.getCustomerStatementReport` query, client search, report metrics, customer-open action, send statement flow, PDF download action, include-invoices toggle, and customer email update form.
- Registered `customer-statement-report` and `customer-statement-lines` in `TableId`, default table settings, and `TABLE_CONFIGS`.
- `customer-statement-report` uses compact 56px rows, sticky Customer, a compact totals footer band, and content-tailored Customer/Orders/Due/Last Sent/Actions widths (`220/420/280`, `84/120/96`, `108/150/124`, `112/160/128`, `56/72/64`).
- `customer-statement-lines` uses compact 48px rows, sticky Select/Order/Actions, and content-tailored Select/Order/Date/Status/Address/Invoice/Paid/Pending/Actions widths (`50/50/50`, `112/170/132`, `96/130/108`, `118/180/136`, `180/320/230`, `104/140/116`, `96/130/108`, `104/148/120`, `56/72/64`).
- No customer statement API query, print/PDF contract, database, permission, or `components/tables-2/core` change was added.
- Validation:
  - focused customer-statement report parity tests passed with 4 tests / 46 assertions.
  - full restarted table parity suite passed with 163 tests / 1589 assertions.
  - targeted Biome passed for `sales-report-menu.tsx`, both new table modules, and table settings/config.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - static scan found no raw `@gnd/ui/table` imports or `Table*` markup in `sales-report-menu.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Browser smoke was not run because the report dialog depends on authenticated Sales Report permissions and data selection.

Phase 5 Sales Rep design activity evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/sales-rep-design-activity/*` for the `/sales-rep/design` Recent Activity panel.
- Updated `apps/www/src/app/(sidebar)/(sales)/sales-rep/design/page.tsx` from inline `@gnd/ui/table` markup to the restarted table module while preserving the surrounding design dashboard cards, static sample activity rows, status badge meaning, and the existing filter/export controls.
- Registered `sales-rep-design-activity` in `TableId`, default table settings, and `TABLE_CONFIGS`.
- `sales-rep-design-activity` uses compact 48px rows, sticky Order, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, persisted visibility/sizing/order/dividers, and content-tailored Order/Customer/Product/Status/Amount/Commission/Date widths (`112/170/132`, `170/300/220`, `180/340/240`, `104/140/116`, `108/140/120`, `112/150/126`, `92/126/104`).
- No sales rep dashboard API, route contract, database, permission, or `components/tables-2/core` change was added.
- Validation:
  - focused Sales Rep design activity parity tests passed with 3 tests / 29 assertions.
  - full restarted table parity suite passed with 166 tests / 1618 assertions.
  - targeted Biome passed for the design page, new table module, and table settings/config.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - static scan found no raw `@gnd/ui/table` imports or `Table*` markup in the design page.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Runtime smoke was attempted through both `https://gndprodesk.localhost:3011/sales-rep/design` and `http://127.0.0.1:3010/sales-rep/design`, but both timed out with no bytes from the local dev server.

Phase 5 Transaction Overview modal evidence captured on 2026-07-17:
- Added `apps/www/src/components/tables-2/transaction-overview-applications/*` for transaction invoice applications.
- Added `apps/www/src/components/tables-2/transaction-overview-payments/*` for transaction payment history rows.
- Updated `apps/www/src/components/modals/transaction-overview-modal.tsx` from inline `@gnd/ui/table`, manual skeleton rows, `TCell`, and old payment-helper imports to the restarted table modules while preserving `getCustomerTransactionOverviewAction`, the payment summary, and sales overview row-open behavior.
- Updated `apps/www/src/app/(clean-code)/layout.tsx` to hydrate `getInitialTableSettings("transaction-overview-applications" | "transaction-overview-payments")` and pass both settings into the global modal.
- Registered `transaction-overview-applications` and `transaction-overview-payments` in `TableId`, default table settings, and `TABLE_CONFIGS`.
- `transaction-overview-applications` uses compact 40px rows, sticky Invoice, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, persisted visibility/sizing/order/dividers, and content-tailored Invoice/Applied/Status widths (`104/150/118`, `108/145/120`, `108/150/124`).
- `transaction-overview-payments` uses compact 48px rows, sticky Date, a right action column, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, persisted visibility/sizing/order/dividers, and content-tailored Date/Description/Status/Actions widths (`108/150/124`, `220/380/270`, `108/150/124`, `48/56/52`).
- No transaction overview API query, route contract, database, permission, or `components/tables-2/core` change was added.
- Validation:
  - focused Transaction Overview parity tests passed with 3 tests / 48 assertions.
  - full restarted table parity suite passed with 169 tests / 1666 assertions.
  - targeted Biome passed for the clean-code layout, modal, both new table modules, and table settings/config.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - JSX-aware static scan found no raw `@gnd/ui/table` imports or `Table*` markup in `transaction-overview-modal.tsx`.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Runtime smoke was not run because opening the modal requires an authenticated transaction row selection.

Phase 5 employees v2 list evidence captured on 2026-07-16:
- Updated `/hrm/employees/v2` from manual `getQueryClient().fetchInfiniteQuery` hydration to the restarted route shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("employees")`.
- Updated `features/employee-management/components/employee-list-page.tsx` to keep its stats cards and active/revoked tabs while rendering `components/tables-2/employees/data-table` and `EmployeesSkeleton` instead of the legacy `components/tables/employees` table and old table skeleton.
- Preserved row-click behavior into `/hrm/employees/v2/:id` through the restarted employees table while keeping role/profile/office/actions as non-clickable table cells.
- No table-core change was added; the existing `tables-2/employees` module continues to own compact 64px rows, table-owned scroll, virtual rows, DnD, resize, sticky Employee/action columns, persisted settings, and content-tailored employee columns.
- Validation:
  - focused Employees/page audit tests passed with 8 tests / 39 assertions.
  - full restarted parity suite passed with 69 tests / 606 assertions.
  - targeted Biome passed for the v2 route, feature list page, audit test, and employees parity test.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; a broader `employees/v2` grep still finds an unrelated existing `[id]` detail-page `EmployeeOverview` type mismatch.
  - static scan found no live legacy Employees table, old table skeleton, `@gnd/ui/data-table`, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the v2 route/list surface.
  - `git diff --check` passed.
  - HEAD smoke for `/hrm/employees/v2` returned `200`.

Phase 5 roles/profile sheet evidence captured on 2026-07-17:
- Updated the `RolesProfilesSheet` Roles and Profiles tabs from legacy `components/tables/roles/*` and `components/tables/employee-profiles/*` to `components/tables-2/roles/*` and `components/tables-2/employee-profiles/*`.
- Reused the existing `getRolesList` and `getEmployeeProfilesList` server actions and the sheet's `#tabActions` portal instead of adding new route/query contracts.
- Both sheet tables now use compact 56px table-core rows, sticky Role/Profile and Actions columns, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, persisted visibility/sizing/order/divider settings, and content-tailored widths.
- Role widths are Role `180/320/220`, Employees `108/160/120`, Permissions `120/180/136`, and Actions `72/104/84`; profile widths are Profile `190/340/230`, Employees `108/160/120`, Commission `126/190/144`, Paycut `112/170/128`, and Actions `92/122/104`.
- Corrected the old profile action wiring during the migration: profile edit/create now writes `profileForm` / `profileEditId`, and profile delete calls `deleteProfileAction` instead of the crossed role path.
- No `components/tables-2/core` change was added.
- Validation:
  - focused roles/profile sheet parity tests passed with 9 tests / 80 assertions.
  - full restarted parity suite passed with 136 tests / 1285 assertions.
  - targeted Biome passed for the sheet tabs, new table modules, and table registry files.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics while broad typecheck remains subject to existing workspace baseline errors.
  - static scans found no live sheet imports of the old roles/profile table paths outside old unused definitions and negative test assertions.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - HTTP smoke returned `307` from `/hrm/employees` to `/hrm/employees/v2` and `200` for `/hrm/employees/v2`.

Customer Overview transactions evidence captured on 2026-07-17:
- Updated `components/sheets/customer-overview-sheet/transactions-tab.tsx`, used by the legacy customer overview sheet and the `/sales-book/customers/v2/[accountNo]` route, from legacy `components/tables/sales-accounting/table.customer-transaction` to `components/tables-2/customer-transactions/*`.
- Reused the existing `sales.getSaleTransactions` query result and the existing transaction overview modal; no new customer transaction API contract, route, or table-core change was added.
- The embedded transactions table now uses compact 64px table-core rows, sticky Date/Actions columns, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, persisted visibility/sizing/order/divider settings, and content-tailored Date/Description/Orders/Status/Actions widths.
- Transaction widths are Date `150/230/170`, Description `220/420/280`, Orders `150/300/190`, Status `140/220/160`, and Actions `82/110/90`.
- Validation:
  - focused customer-transactions parity tests passed with 4 tests / 35 assertions.
  - full restarted parity suite passed with 140 tests / 1320 assertions.
  - targeted Biome passed for the transaction tab, new table module, and table registry files.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics while a broader customer-v2 grep still reports unrelated pre-existing `customer-overview-v2-content.tsx` diagnostics.
  - static scans found no live customer transaction imports of the old accounting transaction table outside negative test assertions; the Pay Portal tab still has a separate inline `@gnd/ui/table`/`TCell` surface for a later decision.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - HTTP smoke returned `200` for `/sales-book/customers`; direct `/sales-book/customers/v2/cust-1` smoke timed out after 30s with no bytes from local dev.

Legacy sales-form Door Suppliers evidence captured on 2026-07-17:
- Updated `components/forms/sales-form/door-suppliers.tsx`, used by the legacy sales form component section, from the live `@gnd/ui/data-table` table to `components/tables-2/door-suppliers/*`.
- Reused the existing `sales.getSuppliers`, `sales.deleteSupplier`, `DoorSupplierForm`, and `StepHelperClass.setDoorSupplier` behavior; no new supplier API contract, route, permission, database, or table-core change was added.
- The embedded supplier chooser now uses compact 48px table-core rows, sticky Selected/Supplier/Actions columns, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, persisted visibility/sizing/order/divider settings, a column visibility control, and content-tailored Selected/Supplier/Actions widths.
- Supplier chooser widths are Selected `50/50/50`, Supplier `180/320/220`, and Actions `92/120/104`.
- Validation:
  - focused door-suppliers parity tests passed with 4 tests / 34 assertions.
  - full restarted parity suite passed with 144 tests / 1354 assertions.
  - targeted Biome passed for the supplier chooser, new table module, and table registry files.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - non-test static scans found no `@gnd/ui/data-table` or old `table-sm` usage in the supplier chooser.
  - `git diff --check` passed and `components/tables-2/core` has no diff.
  - Runtime browser proof was not run because this is a nested old sales-form supplier tab, not a directly loadable route.

Live old table-skeleton cleanup evidence captured on 2026-07-17:
- Updated the community project detail route, community project-unit detail route, and inventory item detail route away from `components/tables/skeleton` to their domain `tables-2` skeletons.
- Updated `components/jobs-dashboard/lazy-worker-dashboard.tsx` away from the old table skeleton to a local card/chart dashboard skeleton because `WorkerOverview` and `WorkerPaymentsOverview` are dashboard card/chart views, not table views.
- No table-core change was added.
- Validation:
  - focused page-sticky/project-units/community-projects/contractor-jobs parity tests passed with 16 tests / 123 assertions.
  - full restarted parity suite passed with 144 tests / 1354 assertions.
  - targeted Biome passed for the touched routes and lazy loader.
  - touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
  - static scan found no live route/lazy `components/tables/skeleton` import remaining outside the legacy `_v1` data-table loading helper.
  - `git diff --check` passed and `components/tables-2/core` has no diff.

HRM/jobs routes:
- `/hrm/employees` and `/hrm/employees/v2` list -> `components/tables-2/employees/*`; `/hrm/employees/v2/[id]` remains a detail workspace outside the route-level table migration.
- `/hrm/document-approvals` -> `components/tables-2/document-approvals/*`
- contractor jobs pages and widgets -> `components/tables-2/contractor-jobs/*` for `/hrm/contractors/jobs`, Project Overview Jobs, and `/jobs-dashboard/jobs-list`; any future contractor widgets must pass the same import audit before old table cleanup.
- contractor payments/history -> `components/tables-2/contractor-payouts/*` for `/contractors/jobs/payments`; any remaining payout widgets must pass the same import audit before old table cleanup.
- contractor payment dashboard -> `components/tables-2/payment-dashboard-contractors/*` and `components/tables-2/payment-dashboard-recent-payments/*` for `/contractors/jobs/payment-dashboard`; the dashboard keeps `jobs.paymentDashboard`, but the Ready for payout contractor queue and recent payments panel no longer map cards by hand. The contractor queue uses compact 56px table-core rows with tailored Contractor/Insurance/Jobs/Recent Project/Total Pay/Actions widths, and recent payments keeps compact 56px table-core rows with tailored Payout/Paid To/Jobs/Method/Paid By/Amount/Actions widths.
- contractor payment portal -> `components/tables-2/payment-portal-jobs/*` for `/contractors/jobs/payment-portal`; the portal keeps `jobs.paymentDashboard`, `jobs.paymentPortal`, review mutations, print selected, job overview, and payout submission behavior, but the selected-contractor jobs list no longer maps cards by hand and now uses compact 64px table-core rows with tailored Select/Job/Details/Project/Status/Payment/Amount/Actions widths.
- roles/profile tabs -> `components/tables-2/roles/*`, `components/tables-2/employee-profiles/*`

Settings/operations routes:
- `/site-actions` -> `components/tables-2/site-actions/*`
- `/task-events` -> `components/tables-2/task-events/*`
- `/task-events/diagnostics` -> `components/tables-2/task-run-diagnostics/*`
- `/task-events/[eventName]` run history -> `components/tables-2/task-event-history/*`
- `/settings/notification-channels` redirects to `/settings/notification-channels/v2`; the v2 workspace keeps its right-side settings editor, but the left channel selector now uses `components/tables-2/notification-channels/*`.
- `/settings/short-links` -> `components/tables-2/short-links/*`
- `/settings/master-password-logins` -> `components/tables-2/master-password-logins/*`
- `/sales-rep?tab=commission` commission widgets -> `components/tables-2/sales-rep-commission-payments/*` and `components/tables-2/sales-rep-commissions/*`

Steps per domain:
1. Decide whether the route needs the full table standard or a light inline table.
2. For full table pages:
   - keep the existing route query
   - keep the existing filter hook/loader
   - keep the existing header component
   - add `components/tables-2/<domain>/*`
   - update the route to render the new table
3. For inline/detail tables, use `@gnd/ui/table` directly and keep them out of the shared migration unless they become large.
4. Replace old `TCell` and `_v1` dependencies opportunistically inside the migrated domain table files, not as a broad side quest.
5. Validation:
   - route import smoke
   - existing search/filter smoke
   - browser smoke for each route family

Decision point: if a legacy table is only used inside a detail sheet with a tiny static dataset, mark it as "inline table - no migration" and include it in cleanup separately.

### Phase 6: Shared Cleanup
Cleanup should be incremental and import-proven.

Immediate cleanup candidates:
- `apps/www/src/components/tables/sales-orders-v2/*` after confirming no runtime imports.
- `apps/www/src/components/tables/.DS_Store`.
- `apps/www/src/components/tables/sales-dispatch/*` was removed on 2026-06-16 after import scans confirmed no active consumers.
- `apps/www/src/components/tables/inventory-products/*` was removed on 2026-06-16 after import scans confirmed no active consumers.
- `apps/www/src/components/tables/inventory-categories/*` was removed on 2026-06-16 after import scans confirmed no active consumers.
- `apps/www/src/components/tables/inventory-import/*` was removed on 2026-06-16 after import scans confirmed no active consumers.
- `apps/www/src/app-deps/(sidebar)/(sales)/sales-book/(bebug)/debug-*/data-table-copy.tsx` if no route references exist and app-deps are confirmed archival.
- stale `page.md` table notes once their contents are either migrated into Brain or obsolete.

Deferred cleanup candidates after all active consumers migrate:
- old table folders under `apps/www/src/components/tables/<domain>` after their replacement route imports are live
- `apps/www/src/components/tables/index.tsx`
- `apps/www/src/components/tables/table-header.tsx`
- `apps/www/src/components/tables/table-row.tsx`
- `apps/www/src/components/tables/load-more.tsx`
- `packages/ui/src/components/custom/data-table/*`
- `apps/www/src/components/(clean-code)/data-table/*`
- `apps/www/src/components/_v1/data-table/*`
- `apps/www/src/components/common/data-table/*`
- `apps/www/src/app/_components/data-table/*`

Cleanup gate:
1. `rg` shows zero imports from the candidate path in `apps/www/src`, `apps/api/src`, and `packages`.
2. Any type-only dependency is moved to an existing domain-neutral type file before deletion.
3. Focused typecheck or import smoke passes.
4. Route smoke passes for the migrated pages.
5. Brain references are updated so future agents do not follow deleted paths.

### Phase 7: Validation And Rollout Gates
For every migrated route:
1. Contract validation:
   - existing list query is still used
   - existing filters and search params are still used
   - query still returns bounded paginated data with cursor metadata
   - no new query or filter endpoint was added solely for the table migration
2. UI validation:
   - desktop table renders with sticky columns and horizontal scroll controls where configured
   - mobile presentation is intentional, not an accidental squeezed grid
   - empty state and filtered no-results state both render
   - row click and action cells do not conflict
   - column visibility, sizing, order, and divider settings persist where enabled
3. Performance validation:
   - no first-paint full working-set load introduced
   - no full detail payload added to the existing row list query
   - expensive transforms do not move into render loops
   - virtualized rows remain smooth with large local result sets
4. Mutation validation:
   - existing invalidation behavior is preserved
   - no broad re-fetch is added unless it already existed or is required by the workflow
   - sensitive workflows keep existing regression tests
5. Browser smoke:
   - route load
   - search/filter
   - sort
   - infinite scroll
   - column settings where enabled
   - row open
   - primary row action
   - mobile viewport

## Migration Order
1. Sales orders canonical route normalization and old `components/tables/sales-orders-v2` cleanup.
2. Sales orders bin parity review.
3. Sales quotes and customers.
4. Sales accounting and sales statistics.
5. Production table/list sections that are not already compliant v2 boards.
6. Inventory products/components/categories/imports.
7. Inventory operational list sections.
8. Community route-level tables.
9. HRM, contractor jobs/payments, roles/profile tables.
10. Settings and operational utility tables.
11. Final old table-system cleanup. Status 2026-07-17: complete for the `apps/www/src/components/tables` runtime folder; no files remain there after import scans and restarted table tests.

## Midday Best Practices To Preserve
- Keep route pages thin and compositional.
- Prefer summary-first first paint where the route already has summary data.
- Keep existing filters and sort in URL state with matching server loaders and client hooks.
- Keep server data in TanStack Query; do not store table data in Zustand.
- Use `useDeferredValue` for search before feeding the infinite query.
- Use cursor pagination and `getNextPageParam`.
- Use virtualization for large lists.
- Use stable row ids and stable column ids.
- Keep column sizing, visibility, order, sticky behavior, and non-reorderable columns explicit in domain table config.
- Keep row actions small and event-safe.
- Preserve exact query invalidation after mutations.
- Move reusable domain truth to packages or API projections, not table columns.
- Do not add new v2 queries, filter params, or filter endpoints just to fit the table UI.
- Do not modify `components/tables-2/core`.

## 2026-07-17 Notification Channels Slice
- `/settings/notification-channels/v2` now renders the channel selector through `components/tables-2/notification-channels/*` while preserving the existing right-side channel detail editor and existing notification-channel tRPC contracts.
- The route uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("notification-channels")`; the old route-level `getQueryClient().fetchQuery` path was removed.
- Registered `notification-channels` in table settings/config with compact 56px rows, sticky Channel/Actions columns, and content-fit Channel/Priority/Delivery/Audience/Category/Status/Actions widths.
- Validation passed with focused Notification Channels parity tests (3 / 33), full restarted table parity suite (195 / 1941), targeted Biome, filtered typecheck log scan, static scans, HTTP/HTTPS route smoke returning `200`, `git diff --check`, and clean `components/tables-2/core` diff.
- Follow-up authenticated browser proof on `https://gndprodesk.localhost/settings/notification-channels/v2` loaded `57` channels and confirmed exact `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 3237`, `clientHeight 496`), table-owned horizontal scroll (`scrollLeft 0 -> 260`, `scrollWidth 1014`, `clientWidth 556`), `--header-offset: 70px` after scroll, and no document-level horizontal overflow.

## 2026-07-17 Customer Overview Sales Preview Slice
- `/sales-book/customers/v2/[accountNo]` now renders recent sales, recent quotes, the full Sales tab, and the full Quotes tab through `components/tables-2/customer-overview-sales-preview/*` while preserving the existing customer overview query and quote/order sheet/page actions.
- The route uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("customer-overview-sales-preview")`; the old route-level `getQueryClient().fetchQuery` path was removed.
- Registered `customer-overview-sales-preview` in table settings/config with compact 56px rows, sticky Reference/Actions columns, and content-fit Reference/Date/Amount/Status/Actions widths.
- Validation passed with focused Customer Overview Sales Preview parity tests (5 / 52), full restarted table parity suite (209 / 2115), targeted Biome, filtered typecheck log scan, static scans, HTTPS route smoke returning `200`, `git diff --check`, and clean `components/tables-2/core` diff.

## 2026-07-17 Contractor Payout Overview Jobs Slice
- `/contractors/jobs/payments/[paymentId]` now renders the Included jobs section through `components/tables-2/contractor-payout-overview-jobs/*` while preserving the existing payout overview query, cancel/reverse actions, print report action, summary cards, adjustments, and activity history.
- The route uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("contractor-payout-overview-jobs")`; the old route-level manual query fetch path was removed and `PaymentOverviewPage` no longer owns a nested `PageShell`.
- Registered `contractor-payout-overview-jobs` in table settings/config with compact 64px rows, sticky Job column, and content-fit Job/Location/Status/Amount/Created widths.
- Validation passed with focused Contractor Payouts parity tests (6 / 70), full restarted table parity suite (212 / 2169), targeted Biome, filtered typecheck log scan, static scans, HTTPS route smoke returning `200`, `git diff --check`, and clean `components/tables-2/core` diff.

## 2026-07-17 Bug Report Access Employees Slice
- `/settings/bug-reports` now renders the Super Admin employee access list through `components/tables-2/bug-report-access-employees/*` while preserving the guarded client employee query, bug-report access mutation, enabled counts, search, and role-enabled Super Admin disabled state.
- The route hydrates `getInitialTableSettings("bug-report-access-employees")`; the employee data remains client-gated so the server route does not prefetch active employees before the authenticated Super Admin check.
- Registered `bug-report-access-employees` in table settings/config with compact 56px rows, sticky Employee/Access columns, and content-fit Employee/Role/Account/Status/Access widths.
- Validation passed with focused Bug Reports migration parity tests (9 / 147), full restarted table suite (213 / 2209), targeted Biome, filtered typecheck log scan, static scans, HTTPS route smoke returning `200`, `git diff --check`, and clean `components/tables-2/core` diff.

## 2026-07-17 Sales Book Inbounds Slice
- `/sales-book/inbounds` now renders the primary inbound shipment queue through `components/tables-2/sales-inbounds/*` while preserving existing local search/status filtering, compact analytics, selected-inbound detail, linked order cards, stock-line cards, status update, receive-stock, and activity history behavior.
- The route now uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("sales-inbounds")`; the old route directly mounted the client workspace without hydrated table settings.
- Registered `sales-inbounds` in table settings/config with compact 64px rows, sticky Inbound/Actions columns, and content-fit Inbound/Status/Order/Counts/Dates/Progress/Actions widths.
- Validation passed with focused Sales Book Inbounds parity tests (3 / 40), full restarted table suite (216 / 2249), targeted Biome, filtered typecheck log scan, static scans, HTTPS route smoke returning `200`, `git diff --check`, and clean `components/tables-2/core` diff.

## Risks And Mitigations
- Risk: unnecessary API/filter churn slows the migration and creates duplicate contracts.
  - Mitigation: reuse current queries, current filter params, and current filter metadata unless a real product bug unrelated to the table migration requires a separate fix.
- Risk: sales, dispatch, accounting, and inventory table migrations can change revenue or fulfillment behavior.
  - Mitigation: migrate only table presentation first, preserve existing queries/actions, and add focused regression tests only when row actions or behavior move.
- Risk: core table changes create broad regressions.
  - Mitigation: freeze `components/tables-2/core`; keep all migration-specific changes inside `components/tables-2/<domain>/*` or existing route/header files.
- Risk: old table systems have hidden consumers in `app-deps` or archival route trees.
  - Mitigation: use import scans and route existence checks before deletion; delete in small batches.
- Risk: table settings cookie schema breaks existing Orders V2 preferences.
  - Mitigation: preserve `gnd-table-settings`, add table ids only when needed, and merge saved settings with defaults.
- Risk: mobile UX regresses when desktop grids are migrated.
  - Mitigation: require either a first-class mobile row/card renderer or an explicit "desktop-only operational table" decision.

## Skills List Used
- `plan`: used because the task asked for the migration plan to be corrected and kept execution-ready.
- `midday`: used because the requested standard explicitly references Midday-style table architecture, state ownership, and validation discipline.
- Project Brain protocol: used because this repo requires planning work to be grounded in `brain/` and documented there.

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
  - status 2026-06-16: `/sales-book/quotes` now renders `components/tables-2/sales-quotes/*` on the canonical route, using the existing `sales.quotes` query, existing `loadOrderFilterParams` / `useOrderFilterParams`, existing `SalesQuoteSearchFilter`, and existing quote row action contracts. The route hydrates only the visible quotes table page; filter metadata stays in the existing lazy header adapter. `/sales-book/quotes/bin` and sales-rep quote embeds still use the legacy table and remain separate migration slices.
  - status 2026-06-16 update: `/sales-book/quotes/bin` now renders the same `components/tables-2/sales-quotes/*` table with `bin` enabled on the actual route. It keeps the existing header/search/filter contracts and does not add a `/v2` route. The bin route intentionally avoids a server-side deleted-quote prefetch after validation showed that waiting for the bin dataset delayed first bytes; the client table still uses the existing `sales.quotes` query through the shared table module.
- `/sales-book/customers`
  - old table: `components/tables/customers/*`
  - target: add `components/tables-2/customers/*` and reuse the existing customers query, filters, and `customer-header`.
  - status 2026-06-16 update: `/sales-book/customers` now renders `components/tables-2/customers/*` on the canonical route, using the existing `sales.customersIndex` query, existing `loadCustomerFilterParams` / `useCustomerFilterParams`, existing `CustomerSearchFilter`, and existing `CustomerHeader` surface. `/sales-book/customers/v2` is a compatibility redirect to `/sales-book/customers` that preserves query params. No new route-level table query, filter param, filter metadata endpoint, or core table change was added.
- `/sales-book/dispatch`, `/sales-book/dispatch/v2`, `/sales-book/dispatch-admin`, `/sales-book/dispatch-task`
  - old table: `components/tables/sales-dispatch/*`
  - target: add `components/tables-2/sales-dispatch/*` and reuse the existing dispatch queries, filters, and dispatch headers.
  - status 2026-06-16 update: `/sales-book/dispatch`, `/sales-book/dispatch-admin`, and `/sales-book/dispatch-task` now render `components/tables-2/sales-dispatch/*` with the existing `dispatch.index` / `dispatch.assignedDispatch` queries, existing `loadDispatchFilterParams` / `useDispatchFilterParams`, existing `DispatchHeader` / `AdminDispatchHeader`, and existing dispatch search filters. `/sales-book/dispatch/v2` is a compatibility redirect to `/sales-book/dispatch` that preserves query params. No new dispatch query, filter param, filter metadata endpoint, or core table change was added.
- `/sales-book/inbound-management`
  - old table: `components/tables/inbound-managment/*`
  - target: add `components/tables-2/inbound-management/*` and reuse the existing inbound query/filter/header.
  - status 2026-06-16 update: `/sales-book/inbound-management` now renders `components/tables-2/inbound-management/*` on the actual route, using the existing `sales.inboundIndex` query, existing `sales.inboundSummary` summary queries, existing `loadInboundFilterParams` / `useInboundFilterParams`, and existing `InboundHeader` / `InboundSearchFilter`. No `/v2` route, new inbound query, filter param, filter metadata endpoint, or core table change was added.
- `/sales-book/accounting`
  - old table: `components/tables/sales-accounting/*`
  - target: add `components/tables-2/sales-accounting/*` and reuse existing accounting queries/filter/header.
  - status 2026-06-16 update: `/sales-book/accounting` now renders `components/tables-2/sales-accounting/*` on the actual route, using the existing `sales.getSalesAccountings` query, existing `loadSalesAccountingFilterParams` / `useSalesAccountingFilterParams`, existing `SalesAccountingHeader`, existing `SearchFilterAdapter`, and existing export/report/resolution actions. No accounting `*V2` query, filter param, filter metadata endpoint, `/v2` route, or core table change was added.
- `/sales-book/top-selling-products`, `/product-report`
  - old table: `components/tables/sales-statistics/*`
  - target: add `components/tables-2/sales-statistics/*` only if these remain route-level table pages after review.
  - status 2026-06-16 update: both routes now render `components/tables-2/sales-statistics/*` on the actual pages, using the existing `sales.getProductReport` query, existing `loadProductReportFilterParams` / `useProductReportFilters`, and existing `ProductReportHeader` / `ProductReportSearchFilter`. No product-report `*V2` query, filter param, filter metadata endpoint, `/v2` route, or core table change was added. The old `components/tables/sales-statistics/*` files were removed after import scans found no remaining consumers.
- Sales rep widgets and recent-sales embeds
  - migrate only if they depend on old table folders after the main sales route migrations.

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
- The route no longer imports `components/tables/sales-orders`; remaining legacy sales-order table imports are the sales-rep recent-sales widgets/embeds.
- Validation:
  - focused Biome check passed for `apps/api/src/db/queries/sales-orders-v2.ts`, `apps/www/src/components/tables-2/sales-orders/data-table.tsx`, and `/sales-book/orders/bin`.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched orders route/table/header files.
  - `curl` returned `200` for `/sales-book/orders/bin` and a regression probe returned `200` for `/sales-book/orders`.
  - Browser smoke passed on `/sales-book/orders/bin` in the Pablo Cruz / Super Admin session: desktop render, visible `Search order number, customer, phone, address, or P.O...` field, table rows, mobile `390x844` with no document-level overflow and table-owned horizontal scrolling, and search debounce updated the URL to `q=08489PC` while narrowing to the matching row.

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
- The route no longer imports `components/tables/sales-quotes`; the only remaining legacy quote table import is the sales-rep quote embed.
- Validation:
  - focused Biome check passed for the quote-bin route and shared quotes table files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched quote-bin/quotes table files.
  - `curl` returned `200` for `/sales-book/quotes/bin`.
  - Browser smoke passed on desktop and mobile `390x844` in the Pablo Cruz / Super Admin session: title `Quotes Bin | GND`, visible `Search quote information...` field, table shell/rows after data settled, no document-level mobile overflow, and search debounce updated the URL to `q=03214LM`.

Phase 2 quote table follow-up evidence captured on 2026-06-16:
- Removed the P.O column from `apps/www/src/components/tables-2/sales-quotes/columns.tsx` for the actual quotes table pages.
- Removed the leftover P.O column and mobile PO badge from the still-live legacy `apps/www/src/components/tables/sales-quotes/columns.tsx` module used by the sales-rep quote embed, without changing quote query/filter contracts.
- Preserved existing quote search/filter params, including the existing P.O filter/search contract; this is a table-column cleanup only.
- Added `apps/www/src/components/tables-2/sales-quotes/sort.ts` to normalize quote sort params to existing query-safe fields and removed the derived `displayName` customer sort from the quote table config.
- Did not add a new query, filter param, filter metadata endpoint, or core table change.
- Validation:
  - focused Biome check passed for the touched quote route/table/config files.
  - filtered `@gnd/www` typecheck grep finished with no diagnostics for touched quote files.
  - static scan found no remaining P.O column/mobile PO renderers in either `components/tables-2/sales-quotes` or `components/tables/sales-quotes`, and no remaining `displayName` quote sort mapping.
  - Browser smoke as Pablo Cruz / Super Admin confirmed `/sales-book/quotes` desktop and mobile `390x844` headers no longer include P.O, no document-level mobile overflow, and stale `sort=displayName.asc` no longer triggers the existing `sales.quotes` query error.

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

### Phase 3: Production And Fulfillment Views
Production already has a v2 board direction and should not be forced into a table if the board/card workflow is the better product shape.

Routes:
- `/production/dashboard`
- `/production/dashboard/v2`
- `/sales-book/productions`
- `/sales-book/productions/v2`
- `/sales/packing-list`

Steps:
1. Keep current production v2 board/list architecture where it is intentionally not a table.
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
- `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/stocks`, `/inventory/review`, `/inventory/dispatch-mode`
  - many are custom operational pages; migrate table/list sections only when they need large-list behavior.

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

### Phase 5: Community, HRM, Jobs, Settings, And Operations
Migrate lower-risk operational tables after sales and inventory patterns settle.

Community routes:
- `/community/builders` -> migrated to `components/tables-2/community-builders/*`; old `components/tables/builder/*` files removed after import scans.
- `/community/templates` -> migrated to `components/tables-2/community-templates/*`; old `components/tables/community-template/*` files and old `CommunityTemplateSearchFilter` wrapper removed after import scans.
- `/community/projects` -> `components/tables/community-project/*`
- `/community/project-units` -> `components/tables/project-units/*`
- `/community/unit-invoices` -> migrated to `components/tables-2/unit-invoices/*`; old `components/tables/unit-invoices/*` files remain because the project overview widget still imports the legacy embeddable table.
- `/community/unit-productions` -> `components/tables/unit-productions/*`
- `/community/customer-services` -> migrated to `components/tables-2/customer-service/*`; old `components/tables/customer-service/*` files removed after import scans.

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
- Cleanup was deferred after import scans showed `apps/www/src/components/widgets/project-overview/index.tsx` still imports `components/tables/unit-invoices/*` for its embeddable project overview tab.
- Browser validation exposed a shared `CustomModal` accessibility issue where the generated Radix `aria-labelledby` / `aria-describedby` ids could not resolve because custom ids overrode the generated title/description ids. `apps/www/src/components/modals/custom-modal.tsx` now lets Radix own normal title/description ids and keeps the hidden accessible title/description plus portal placeholders for the `titleAsChild` / `descriptionAsChild` path.
- Validation:
  - focused Biome check passed for the unit-invoices route, header, table settings/config, new unit-invoices `tables-2` files, and the `CustomModal` accessibility fix.
  - full `@gnd/www` typecheck still fails on existing workspace baseline errors, but filtered typecheck output had no diagnostics for the touched unit-invoices route/table/header/settings/config files or `CustomModal`.
  - import scans confirmed the unit-invoices route no longer imports `components/tables/unit-invoices`; remaining legacy unit-invoice imports are limited to the project overview widget.
  - `git diff -- apps/www/src/components/tables-2/core` was clean and `git diff --check` passed for the unit-invoices slice.
  - HTTP smoke returned `200` for `/community/unit-invoices`.
  - Browser smoke passed with Quick Login as Pablo Cruz / Super Admin: desktop `/community/unit-invoices`, existing `q` search binding, mobile `390x844` `/community/unit-invoices`, and row-open invoice modal behavior.
  - Desktop and mobile unit-invoices routes had no document-level horizontal overflow; the mobile table retained its own horizontal scroll container.

HRM/jobs routes:
- `/hrm/employees` and employee v2 list -> `components/tables/employees/*`
- contractor jobs pages and widgets -> `components/tables/contractor-jobs/*`
- contractor payments/history -> `components/tables/contractor-payouts/*`
- roles/profile tabs -> `components/tables/roles/*`, `components/tables/employee-profiles/*`

Settings/operations routes:
- `/site-actions` -> `components/tables/site-actions/*`
- `/settings/notification-channels` -> `components/tables/notification-channels/*`
- `/settings/short-links` inline table
- payment dashboard tables and commission widgets

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
11. Final old table-system cleanup.

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

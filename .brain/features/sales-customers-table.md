# Sales Customers Table

## Status
- 2026-06-16: `/sales-book/customers` is migrated to the `tables-2` table standard.

## Routes
- Canonical route: `/sales-book/customers`
- Compatibility redirect: `/sales-book/customers/v2` redirects to `/sales-book/customers` and preserves query params.
- Detail route: `/sales-book/customers/v2/[accountNo]` remains the customer overview v2 detail route and now participates in the table migration for its embedded sales/quotes previews.

## Frontend Implementation
- Route: `apps/www/src/app/(sidebar)/(sales)/sales-book/customers/page.tsx`
- Redirect: `apps/www/src/app/(sidebar)/(sales)/sales-book/customers/v2/page.tsx`
- Table module: `apps/www/src/components/tables-2/customers/*`
- Customer transactions table module: `apps/www/src/components/tables-2/customer-transactions/*`
- Customer Pay Portal table module: `apps/www/src/components/tables-2/customer-pay-portal/*`
- Customer Sales List table module: `apps/www/src/components/tables-2/customer-sales-list/*`
- Customer Sales Workspace table module: `apps/www/src/components/tables-2/customer-sales-workspace/*`
- Customer Overview Sales Preview table module: `apps/www/src/components/tables-2/customer-overview-sales-preview/*`
- Header: `apps/www/src/components/customer-header.tsx`
- Search filter: `apps/www/src/components/customer-search-filter.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky customer column, column visibility/settings, horizontal table scrolling, empty state, no-results state, and route-level hydration.

The restarted 2026-07-16 pass removed the failed shared `PageStickyHeader` route wrapper and aligned `/sales-book/customers` to the direct Sales Orders/Midday invoices shell: `ScrollableContent`, `PageTitle`, `CustomerHeader`, and the table/error boundary in one stack. The customer table now owns the Sales Orders table-core behavior through `useScrollHeader(parentRef)`, `VirtualRow`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky customer/action columns, persisted sizing/order/visibility/dividers, infinite scroll, and the header-offset spacer.

Compact spacing and content-tailored widths are required for this page: `TABLE_CONFIGS["customers"].style = "compact"`, row height is `48`, and the customer cell stays single-line with a small `size-6` identity marker rather than the older two-line avatar layout. Current content-fit widths are Customer `sizes.custom(180, 320, 220)`, Phone `sizes.custom(112, 170, 128)`, Secondary `sizes.custom(130, 220, 160)`, Email `sizes.custom(150, 280, 200)`, Address `sizes.custom(180, 360, 240)`, and Actions `sizes.custom(56, 64, 56)`.

The 2026-07-17 Customer Overview transactions restart moved the shared `TransactionsTab` off `components/tables/sales-accounting/table.customer-transaction` and onto `components/tables-2/customer-transactions/*`. This tab is used by the legacy customer overview sheet and by the `/sales-book/customers/v2/[accountNo]` overview route. It reuses the existing `sales.getSaleTransactions` query result and opens the existing transaction overview modal from row clicks and the action icon.

`TABLE_CONFIGS["customer-transactions"]` owns compact table settings for the embedded transaction surface: row height `64`, sticky Date and Actions columns, Date `sizes.custom(150, 230, 170)`, Description `sizes.custom(220, 420, 280)`, Orders `sizes.custom(150, 300, 190)`, Status `sizes.custom(140, 220, 160)`, and Actions `sizes.custom(82, 110, 90)`.

The 2026-07-17 Customer Overview Pay Portal/Sales List restart moved two more inline customer overview sheet tables onto per-surface `tables-2` modules. `PayPortalTab` now renders `components/tables-2/customer-pay-portal/*` for pending customer payments while preserving the existing selection URL param, wallet payment, terminal payment, mock dev terminal controls, and sheet footer. `SalesList` now renders `components/tables-2/customer-sales-list/*` for the customer quotes tab while keeping the existing `sales.quotes` data contract.

`TABLE_CONFIGS["customer-pay-portal"]` owns compact table settings for the embedded payment-selection surface: row height `48`, sticky Selected and Order columns, Selected `sizes.custom(50, 50, 50)`, Order `sizes.custom(132, 220, 154)`, Date `sizes.custom(116, 180, 132)`, Total/Pending `sizes.custom(112, 170, 128)`, and Actions `sizes.custom(56, 72, 64)`. Horizontal pagination starts after both sticky columns.

`TABLE_CONFIGS["customer-sales-list"]` owns compact table settings for the embedded sales/quote list: row height `48`, sticky Date and Actions columns, Date `sizes.custom(112, 170, 128)`, P.O `sizes.custom(110, 180, 128)`, Order `sizes.custom(132, 220, 154)`, Amount `sizes.custom(112, 170, 128)`, Status `sizes.custom(120, 190, 140)`, and Actions `sizes.custom(56, 72, 64)`.

The 2026-07-17 Customer Overview Sales Workspace restart moved the customer overview sheet workspace off its inline `@gnd/ui/table` and onto `components/tables-2/customer-sales-workspace/*`. The parent sheet still owns the existing `customers.getCustomerOverviewV2` query, search/type/payment/delivery filters, row-open routing into quote/order overview sheets, selected-item bulk email, and selected delete flow, while the table module now owns row rendering, selection cells, SalesMenu row actions, empty/skeleton states, DnD, resizing, and horizontal scroll.

`TABLE_CONFIGS["customer-sales-workspace"]` owns compact table settings for the embedded workspace surface: Sales Orders-style row height `40`, sticky Select/Order/Actions columns, Select `sizes.custom(50, 50, 50)`, Order `sizes.custom(132, 220, 154)`, Customer `sizes.custom(170, 320, 220)`, Type `sizes.custom(78, 108, 86)`, Payment `sizes.custom(128, 190, 148)`, Delivery `sizes.custom(118, 180, 136)`, Value `sizes.custom(104, 150, 118)`, and Actions `sizes.custom(56, 80, 64)`. Row content is intentionally one-line so the compact row height fits without clipping.

The 2026-07-17 Customer Overview Sales Preview restart moved the sales/quotes preview cards inside `/sales-book/customers/v2/[accountNo]` off raw `<table>` markup and onto `components/tables-2/customer-overview-sales-preview/*`. The detail route now follows the restarted shell with `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("customer-overview-sales-preview")` instead of manual `getQueryClient().fetchQuery`, while the sheet version can keep using the same content component without route-level settings.

`TABLE_CONFIGS["customer-overview-sales-preview"]` owns compact table settings for the embedded recent-sales/recent-quotes preview surface: row height `56`, sticky Reference and Actions columns, Reference `sizes.custom(150, 260, 180)`, Date `sizes.custom(104, 150, 118)`, Amount `sizes.custom(104, 150, 120)`, Status `sizes.custom(118, 180, 132)`, and Actions `sizes.custom(168, 230, 190)`. The row click opens the sheet and the action buttons keep direct sheet/page opening behavior.

## Contracts Reused
- Existing query: `trpc.sales.customersIndex`
- Existing transactions query: `trpc.sales.getSaleTransactions`
- Existing pay portal query/context: `trpc.customers.getCustomerPayPortal` through `usePayPortal`
- Existing customer quote list query: `trpc.sales.quotes`
- Existing customer overview workspace query: `trpc.customers.getCustomerOverviewV2`
- Existing server filter loader: `loadCustomerFilterParams`
- Existing client filter hook: `useCustomerFilterParams`
- Existing sort state: `loadSortParams` / `useSortParams`
- Existing filter metadata: `trpc.filters.customer` through `CustomerSearchFilter`

No new customer `*V2` query, filter param, filter metadata endpoint, or table route was added for this migration.

## Cleanup
Removed after import scans:
- `apps/www/src/components/tables/customers/data-table.tsx`
- `apps/www/src/components/tables/customers/columns.tsx`
- `apps/www/src/components/customer-v2/customer-directory-v2-page.tsx`

`apps/www/src/components/tables-2/core/*` was not modified.

## Validation
- Focused Biome check passed for the customers route, redirect route, header, table settings/config, and new customers table files.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for touched customers route/table/header/config files.
- Import scans found no remaining references to `components/tables/customers`, `tables/customers`, `customer-directory-v2-page`, or `CustomerDirectoryV2Page`.
- `git diff --check` passed.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- Browser smoke passed in the Pablo Cruz session:
  - desktop `1440x900`
  - mobile `390x844`
  - no document-level horizontal overflow
  - table-owned horizontal scrolling on mobile
  - `Search customers` updated the URL to `q=Amaury` and narrowed rows
  - `/sales-book/customers/v2?q=Amaury` redirected to `/sales-book/customers?q=Amaury`
  - no customer-related console errors
- 2026-07-16 restarted Sales Orders parity pass:
  - removed `PageStickyHeader` from `/sales-book/customers` and kept the route on the direct `ScrollableContent` + title + header + table shell.
  - added `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, and the header-offset spacer to the customer table/header without changing the query or filter contract.
  - added `apps/www/src/components/tables-2/customers/migration-parity.test.ts` and enrolled Sales Customers in `apps/www/src/components/page-sticky-header.test.ts` so the route cannot regress to the failed shared wrapper, legacy customer table, `@gnd/ui/data-table`, or route-level `fetchInfiniteQuery`.
  - validation: focused Customers/audit tests passed with 10 tests / 44 assertions; the restarted parity suite passed with 46 tests / 321 assertions; targeted Biome passed for the route/table/header/test/audit files; static scans found no live failed-header/legacy-table patterns in the Customers route/new table; filtered `@gnd/www` typecheck scan reported no touched-file diagnostics; `git diff --check` passed.
  - HTTP SSR smoke for `/sales-book/customers` returned `200` with Sales Customers markers, but the unauthenticated response also included the expected `/login/v2` protected-route redirect marker. Headless Playwright scroll smoke remains blocked by the local browser limitation documented in the Sales Quotes slice, so scroll remains verified through the source-level table-owned scroll contract tests for this slice.
- 2026-07-17 Customers density/width tuning:
  - reduced `TABLE_CONFIGS["customers"].rowHeight` from `64` to `48`, converted the customer cell to one line with a `size-6` identity marker, and tightened Customer/Phone/Secondary/Email/Address/Actions widths to the current content-fit ranges.
  - validation: focused Customers parity tests passed with 4 tests / 36 assertions; full `apps/www/src/components/tables-2` suite passed with 289 tests / 2338 assertions; focused Biome passed; touched-file typecheck grep returned no diagnostics; `git diff --check` passed.
  - authenticated browser smoke on `/sales-book/customers` confirmed row height `48px`, table-owned vertical overflow (`scrollHeight 2925` vs `clientHeight 753`), horizontal overflow at a temporary 760px viewport (`scrollWidth 804` vs `clientWidth 710`), successful horizontal scroll to `scrollLeft 94`, and successful vertical table scroll to `scrollTop 600`; the tab was restored to top/left afterward.
- 2026-07-17 Customer Overview transactions restart:
  - added `apps/www/src/components/tables-2/customer-transactions/*` and registered `customer-transactions` in table settings/config.
  - updated `components/sheets/customer-overview-sheet/transactions-tab.tsx` to render the restarted table and column visibility/divider control.
  - removed live customer transaction usage of `components/tables/sales-accounting/table.customer-transaction` / `@gnd/ui/data-table`; the old file remains only as an unused legacy definition until cleanup.
  - validation: focused customer-transactions parity tests passed with 4 tests / 35 assertions; full restarted table parity suite passed with 140 tests / 1320 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck grep reported no diagnostics; static scans found no live customer transaction import of the old accounting transaction table outside negative test assertions; `git diff --check` passed; `components/tables-2/core` stayed unchanged; HTTP smoke returned `200` for `/sales-book/customers`, while direct `/sales-book/customers/v2/cust-1` smoke timed out after 30s with no bytes from local dev.
- 2026-07-17 Customer Overview Pay Portal/Sales List restart:
  - added `apps/www/src/components/tables-2/customer-pay-portal/*` and `apps/www/src/components/tables-2/customer-sales-list/*`; registered both table ids in table settings/config.
  - updated `pay-portal-tab.tsx` and `sales-list.tsx` to render the restarted tables with local column visibility controls instead of inline `table-sm` surfaces.
  - preserved pay-portal selection/payment behavior and quote-list data loading while adding table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, horizontal pagination, compact 48px rows, and content-tailored widths.
  - validation: focused customer overview inline-table parity tests passed with 6 tests / 63 assertions; full restarted table parity suite passed with 150 tests / 1417 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck grep reported no diagnostics; sheet-only static scans found no legacy table patterns; `git diff --check` passed; `components/tables-2/core` stayed unchanged.
- 2026-07-17 Customer Overview Sales Workspace restart:
  - added `apps/www/src/components/tables-2/customer-sales-workspace/*` and registered `customer-sales-workspace` in table settings/config.
  - updated `customer-sales-workspace.tsx` to render the restarted table with local column visibility controls instead of an inline `@gnd/ui/table`.
  - preserved the existing customer overview workspace query, search/type/payment/delivery filters, row-open behavior, selection, bulk email, delete, and row SalesMenu actions while adding table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, horizontal pagination, compact 40px rows, and content-tailored widths.
  - validation: focused customer sales workspace parity tests passed with 5 tests / 59 assertions; full restarted table parity suite passed with 155 tests / 1476 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck grep reported no diagnostics; sheet-only static scans found no parent inline table patterns; stale copied-module scan found no Pay Portal/Sales List names in the workspace module; `git diff --check` passed; `components/tables-2/core` stayed unchanged.
- 2026-07-17 Customer Overview Sales Preview restart:
  - added `apps/www/src/components/tables-2/customer-overview-sales-preview/*` and registered `customer-overview-sales-preview` in table settings/config.
  - updated `/sales-book/customers/v2/[accountNo]` to use `ScrollableContent`, `batchPrefetch`, and hydrated table settings instead of route-level `getQueryClient().fetchQuery`.
  - updated `customer-overview-v2-content.tsx` so recent sales, recent quotes, the Sales tab, and the Quotes tab render the restarted preview table instead of raw table markup.
  - validation: focused customer overview sales-preview parity tests passed with 5 tests / 52 assertions; full restarted table parity suite passed with 209 tests / 2115 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck grep reported no diagnostics; static scans found no raw preview table/manual fetch patterns in the route/component; HTTPS route smoke returned `200` for `/sales-book/customers/v2/555-111-2222`; `git diff --check` passed; `components/tables-2/core` stayed unchanged.

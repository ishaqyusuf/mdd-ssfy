# Sales Dispatch Table

## Status
- 2026-06-16: Dispatch list routes are migrated to the `tables-2` table standard.
- 2026-07-17: Dispatch density and content-fit widths were tightened against the Sales Orders/Midday invoices standard while keeping the interactive dispatch controls readable.

## Routes
- Canonical dispatch route: `/sales-book/dispatch`
- Compatibility redirect: `/sales-book/dispatch/v2` redirects to `/sales-book/dispatch` and preserves query params.
- Admin table route: `/sales-book/dispatch-admin?view=table`
- Driver task route: `/sales-book/dispatch-task`

## Frontend Implementation
- Dispatch route: `apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch/page.tsx`
- Dispatch redirect: `apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch/v2/page.tsx`
- Admin route: `apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx`
- Driver route: `apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx`
- Table module: `apps/www/src/components/tables-2/sales-dispatch/*`
- Headers:
  - `apps/www/src/components/dispatch-header.tsx`
  - `apps/www/src/components/dispatch-admin/admin-dispatch-header.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky order columns, column visibility/settings, table-owned horizontal and vertical scrolling, `useScrollHeader(parentRef)` header-offset behavior, empty state, no-results state, row selection, and the existing dispatch row-action flows.

## Density And Widths
- `TABLE_CONFIGS["sales-dispatch"].rowHeight` is `56` with compact table padding. This is intentionally taller than the 40px Sales Orders/Quotes rows because dispatch rows include a schedule picker, two-line Ship To/progress text, and status/driver menus.
- Current content-fit defaults:
  - Schedule: `sizes.custom(118, 180, 136)`
  - Order: `sizes.custom(140, 230, 160)`
  - Order Date: `sizes.custom(104, 150, 118)`
  - Ship To: `sizes.custom(180, 360, 220)`
  - Assigned To: `sizes.custom(132, 220, 160)`
  - Progress: `sizes.custom(118, 180, 132)`
  - Status: `sizes.custom(116, 170, 132)`
  - Actions: `sizes.custom(72, 72)`

## Contracts Reused
- Existing admin/list query: `trpc.dispatch.index`
- Existing driver query: `trpc.dispatch.assignedDispatch`
- Existing server filter loader: `loadDispatchFilterParams`
- Existing client filter hook: `useDispatchFilterParams`
- Existing sort state: `loadSortParams` / `useSortParams`
- Existing mutations and actions for driver assignment, bulk assignment, cancellation, due-date updates, status updates, submit dispatch, and sales overview dispatch opening

No new dispatch `*V2` query, filter param, filter metadata endpoint, or table route was added for this migration.

## Cleanup
Removed after import scans:
- `apps/www/src/components/tables/sales-dispatch/data-table.tsx`
- `apps/www/src/components/tables/sales-dispatch/columns.tsx`
- `apps/www/src/components/tables/sales-dispatch/batch-actions.tsx`

`apps/www/src/components/tables-2/core/*` was not modified.

## Validation
- Focused Biome check passed for the dispatch routes, headers, sidebar links, table settings/config, and new sales-dispatch table files.
- Filtered `@gnd/www` typecheck grep reported no diagnostics for touched dispatch route/table/header/config files.
- Import scans found no remaining references to `components/tables/sales-dispatch` or `tables/sales-dispatch`.
- `git diff --check` passed.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- Browser smoke passed in authenticated sessions:
  - `/sales-book/dispatch?size=5` rendered search, table headers, rows, and table-owned horizontal scroll on desktop and mobile.
  - Search for `07340` updated the URL to `q=07340` and narrowed the dispatch rows.
  - `/sales-book/dispatch/v2?q=07340` redirected to `/sales-book/dispatch?q=07340`.
  - `/sales-book/dispatch-admin?view=table&q=07340&size=1` rendered the admin table on desktop and mobile after the route warmed.
- Caveat: `/sales-book/dispatch-task` still timed out before first byte even when temporarily reduced to static markup, so end-to-end browser smoke for that route remains blocked by a route/access/dev-server issue outside the table module.
- 2026-07-17 density proof:
  - Focused Dispatch parity test passed with 4 tests / 39 assertions.
  - Full `apps/www/src/components/tables-2` suite passed with 293 tests / 2382 assertions.
  - Focused Biome passed for the Dispatch table files and table config.
  - Touched-path `@gnd/www` typecheck scan produced no diagnostics for `sales-dispatch` / `table-configs`.
  - Authenticated browser proof on `/sales-book/dispatch?size=20` confirmed `56px` row height, `45px` header height, vertical table-owned overflow (`scrollHeight 2005` vs `clientHeight 459`), horizontal table-owned overflow (`scrollWidth 1180` vs `clientWidth 1146`), clean scroll movement from `scrollTop 0` / `scrollLeft 0` to `scrollTop 600` / `scrollLeft 34`, and `--header-offset` changing from `0px` to `70px`.
  - Screenshot evidence saved at `/private/tmp/gnd-sales-dispatch-table.png`.

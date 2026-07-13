# Sales Dispatch Table

## Status
- 2026-06-16: Dispatch list routes are migrated to the `tables-2` table standard.

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

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky order columns, column visibility/settings, horizontal table scrolling, empty state, no-results state, row selection, and the existing dispatch row-action flows.

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

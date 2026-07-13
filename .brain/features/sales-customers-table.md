# Sales Customers Table

## Status
- 2026-06-16: `/sales-book/customers` is migrated to the `tables-2` table standard.

## Routes
- Canonical route: `/sales-book/customers`
- Compatibility redirect: `/sales-book/customers/v2` redirects to `/sales-book/customers` and preserves query params.
- Detail route: `/sales-book/customers/v2/[accountNo]` remains the customer overview v2 detail route and was not changed by the table migration.

## Frontend Implementation
- Route: `apps/www/src/app/(sidebar)/(sales)/sales-book/customers/page.tsx`
- Redirect: `apps/www/src/app/(sidebar)/(sales)/sales-book/customers/v2/page.tsx`
- Table module: `apps/www/src/components/tables-2/customers/*`
- Header: `apps/www/src/components/customer-header.tsx`
- Search filter: `apps/www/src/components/customer-search-filter.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky customer column, column visibility/settings, horizontal table scrolling, empty state, no-results state, and route-level hydration.

## Contracts Reused
- Existing query: `trpc.sales.customersIndex`
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

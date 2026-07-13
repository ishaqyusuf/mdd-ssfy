# Sales Inbound Management Table

## Status
- 2026-06-16: `/sales-book/inbound-management` is migrated to the `tables-2` table standard.

## Route
- Canonical route: `/sales-book/inbound-management`
- No `/v2` route was added for this migration.

## Frontend Implementation
- Route: `apps/www/src/app/(sidebar)/(sales)/sales-book/inbound-management/page.tsx`
- Table module: `apps/www/src/components/tables-2/inbound-management/*`
- Header: `apps/www/src/components/inbound-header.tsx`
- Search filter: `apps/www/src/components/inbound-search-filter.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky order column, column visibility/settings, horizontal table scrolling, empty state, no-results state, and the existing inbound row-open and packing-list preview action flows.

## Contracts Reused
- Existing list query: `trpc.sales.inboundIndex`
- Existing summary query: `trpc.sales.inboundSummary`
- Existing server filter loader: `loadInboundFilterParams`
- Existing client filter hook: `useInboundFilterParams`
- Existing filter metadata: `trpc.filters.inbound` through `InboundSearchFilter`
- Existing URL-driven inbound view state: `viewInboundId` and `payload`

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

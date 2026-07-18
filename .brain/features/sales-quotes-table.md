# Sales Quotes Table

## Current Route
- `/sales-book/quotes`
  - canonical quotes workspace route
  - renders `apps/www/src/components/tables-2/sales-quotes/*`
  - reuses the existing `sales.quotes` list query
  - reuses the existing sales URL filter params through `loadOrderFilterParams` and `useOrderFilterParams`
  - reuses the existing `SalesQuoteHeader` and `SalesQuoteSearchFilter`
- `/sales-book/quotes/bin`
  - deleted quotes route
  - renders the same `apps/www/src/components/tables-2/sales-quotes/*` table with `bin` enabled
  - reuses the existing `sales.quotes` list query through the shared table module
  - reuses the existing `SalesQuoteHeader` and `SalesQuoteSearchFilter`
  - avoids server-side bin prefetch so the route shell is not blocked by deleted-quote dataset latency

## Migration Notes
- This is a table UI migration only.
- No new quote `*V2` query was added.
- No new quote filter params or filter metadata route were added.
- `apps/www/src/components/tables-2/core/*` was not changed.
- The page route hydrates the visible quotes table page and leaves filter metadata loading in the existing lazy header adapter.
- The quote bin route renders the same table module without adding a new route or query.
- The `/sales-rep` quote embed now reuses `components/tables-2/sales-quotes/*` in embedded single-page mode; the legacy quote table folder is no longer a live route/embed dependency.

## Table Behavior
- Columns include:
  - select
  - quote number
  - date
  - customer
  - phone
  - address
  - invoice
  - status
  - sales rep
  - actions
- Row clicks open the existing sales overview flow with quote context.
- Quote overview sheets render the same invoice-based quote status as the table (`Paid`, `Open`, or `Part paid`) near the quote number, using the shared overview badge presenter.
- The actions cell keeps existing quote edit/open/preview/menu behavior, with heavier menu/preview work kept out of first render.
- Search uses the existing `q` URL param from the current quote search filter.
- Free-text quote search matches customer address text plus billing and shipping name, address lines, city, state, email, and phone fields through the shared sales query builder.
- The route-level quotes table intentionally does not render a P.O column. P.O remains searchable/filterable through the existing quote filter params, but it is not part of the default table surface.
- The sales-rep quote embed now shares this `tables-2` quote table, so P.O remains absent from both the canonical quote routes and the dashboard quote panel while staying searchable through the existing filter contract.
- Quote table sorting is limited to existing query-safe fields (`orderId`, `createdAt`, and `grandTotal`) so stale URLs such as `sort=displayName.asc` cannot send derived UI fields to the existing `sales.quotes` query.
- Row density now matches the canonical orders table with 40px virtual rows.
- The sticky `Quote #` column defaults to the same compact 180px width and 150px minimum as orders, so the table exposes more downstream columns without changing row actions or sort behavior.
- The `Address` column defaults to a compact 220px width with a 150px minimum while preserving truncation and tooltip access to full addresses.
- The restarted 2026-07-16 pass removed the failed shared `PageStickyHeader` route wrapper so `/sales-book/quotes` now follows the Sales Orders/Midday invoices shell directly: `ScrollableContent`, `PageTitle`, `SalesQuoteHeader`, and the table/error boundary in one stack.
- The Sales Quotes table owns scroll and table behavior through `useScrollHeader(parentRef)`, `VirtualRow`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky select/quote/action columns, persisted sizing/order/visibility/dividers, selection, the bottom bar, and the header-offset spacer.
- Compact spacing and content-tailored widths are required for this page: `TABLE_CONFIGS["sales-quotes"].style = "compact"`, row height stays `40`, `Quote #` uses `sizes.custom(150, 280, 180)`, customer uses `sizes.custom(180, 340, 220)`, phone uses `sizes.custom(112, 170, 128)`, address uses `sizes.custom(180, 360, 240)`, invoice uses `sizes.custom(104, 160, 118)`, status uses `sizes.custom(104, 150, 116)`, sales rep uses `sizes.custom(86, 130, 96)`, and the actions column stays `sizes.custom(144, 144)` because it contains four compact icon controls.

## Validation
- 2026-07-17 density/width tuning:
  - tightened the canonical Sales Quotes table after the restarted Sales Orders parity pass without changing the route/query/filter/header/table-core contracts.
  - focused Sales Quotes and Sales Rep embed parity tests passed with 8 tests / 97 assertions.
  - full `apps/www/src/components/tables-2` suite passed with 289 tests / 2343 assertions.
  - focused Biome passed for the touched Quotes and Sales Rep embed files.
  - filtered `@gnd/www` typecheck scan produced no diagnostics for touched Quotes/embed/table-config files.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.
  - authenticated browser smoke on `/sales-book/quotes` confirmed `40px` rows, table-owned vertical overflow/scroll (`scrollHeight 2445` vs `clientHeight 479`, `scrollTop 0 -> 600`), table-owned horizontal overflow/scroll (`scrollWidth 1316` vs `clientWidth 1146`, `scrollLeft 0 -> 170`), and captured screenshot evidence at `/private/tmp/gnd-sales-quotes-table.png`.
- 2026-06-16:
  - focused Biome check passed for the quotes route, header, new table module, and table settings/config changes.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics for the migrated quotes files.
  - browser smoke passed on desktop and mobile `390x844`.
  - search smoke confirmed entering `03214LM` sets `q=03214LM` and narrows the table to the matching row.
  - document-level mobile horizontal overflow was false; the table retained its own horizontal scroll container.
- 2026-06-16 quote bin:
  - focused Biome check passed for `/sales-book/quotes/bin`.
  - filtered `@gnd/www` typecheck grep reported no touched-file diagnostics for quote-bin and shared quote table files.
  - browser smoke confirmed the route title, search field, table shell/rows, mobile `390x844` no-overflow state, and existing debounced `q` search behavior.
- 2026-06-16 quote table follow-up:
  - removed the P.O column from `apps/www/src/components/tables-2/sales-quotes/columns.tsx` without adding or removing quote filter params.
  - removed the leftover P.O column and mobile PO badge from `apps/www/src/components/tables/sales-quotes/columns.tsx` so the still-live legacy quote embed does not reintroduce the field before its migration.
  - added a domain-level quote sort guard in `apps/www/src/components/tables-2/sales-quotes/sort.ts` and removed the derived `displayName` customer sort from the quote table surface.
  - focused Biome and filtered `@gnd/www` typecheck grep reported no diagnostics for the touched quote table/route/config files.
  - browser smoke as Pablo Cruz / Super Admin confirmed desktop and mobile `390x844` `/sales-book/quotes` headers no longer include P.O, no document-level mobile overflow, and stale `sort=displayName.asc` no longer produces the previous Prisma `Unknown argument displayName` error.
- 2026-07-16 restarted Sales Orders parity pass:
  - removed `PageStickyHeader` from `/sales-book/quotes` and kept the route on the direct `ScrollableContent` + title + header + table shell.
  - added `apps/www/src/components/tables-2/sales-quotes/migration-parity.test.ts` and enrolled Sales Quotes in `apps/www/src/components/page-sticky-header.test.ts` so the route cannot regress to the failed shared wrapper, legacy quote table, `@gnd/ui/data-table`, or route-level `fetchInfiniteQuery`.
  - validation: focused Sales Quotes/audit tests passed with 10 tests / 46 assertions; the restarted parity suite passed with 42 tests / 286 assertions; targeted Biome passed for the route/test/audit files; static scans found no live `PageStickyHeader`, legacy quote table, `@gnd/ui/data-table`, or route-level `fetchInfiniteQuery` usage in the route/new table; filtered `@gnd/www` typecheck scan reported no touched-file diagnostics; `git diff --check` passed.
  - HTTP SSR smoke for `/sales-book/quotes` returned `200` with Quotes route/data markers, but the unauthenticated response also included the expected `/login/v2` protected-route redirect marker. Headless Playwright scroll smoke could not complete because the bundled browser was not installed and system Chrome aborted under the sandbox, so scroll remains verified through the source-level table-owned scroll contract tests for this slice.
- 2026-07-16 sales-rep embed follow-up:
  - `/sales-rep?tab=recent-quotes` now renders the same `tables-2/sales-quotes` implementation with `defaultFilters={{ size: 5 }}`, `singlePage`, and `embedded`.
  - Added `apps/www/src/components/tables-2/sales-rep-embeds/migration-parity.test.ts` and enrolled the sales-rep quote embed in `apps/www/src/components/page-sticky-header.test.ts`.
  - Validation: the focused sales-rep/audit/quotes suite passed with 11 tests / 97 assertions; the restarted parity suite passed with 52 tests / 413 assertions; targeted Biome and `git diff --check` passed; filtered WWW typecheck scan reported no touched-file diagnostics; route-only static scan found no legacy quote table import.

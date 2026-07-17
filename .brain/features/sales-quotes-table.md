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
- The legacy `components/tables/sales-quotes/*` table remains in use by the sales-rep quote embed until that surface is migrated separately.

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
- The remaining legacy quote table used by the unmigrated sales-rep quote embed also no longer renders a P.O table column or mobile PO badge while that surface awaits its `tables-2` migration.
- Quote table sorting is limited to existing query-safe fields (`orderId`, `createdAt`, and `grandTotal`) so stale URLs such as `sort=displayName.asc` cannot send derived UI fields to the existing `sales.quotes` query.
- Row density now matches the canonical orders table with 40px virtual rows.
- The sticky `Quote #` column defaults to the same compact 180px width and 150px minimum as orders, so the table exposes more downstream columns without changing row actions or sort behavior.
- The `Address` column defaults to a compact 220px width with a 150px minimum while preserving truncation and tooltip access to full addresses.

## Validation
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

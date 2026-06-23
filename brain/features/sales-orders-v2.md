# Sales Orders V2

## Goal
- Rebuild the canonical sales orders page under `sales-book` using the `tables-2/sales-orders` standard and Midday-style architecture:
  - thin route component
  - summary-first page shell
  - existing URL filter contract
  - isolated table module
  - reusable tRPC-backed backend contracts

## Route
- `/sales-book/orders`
  - canonical orders workspace with:
    - summary widgets
    - `SearchFilter`-driven URL filters
    - paginated/infinite invoice-style table
    - mobile-safe scroll-contained table presentation
    - row open action into the existing sales overview flow
- `/sales-book/orders/v2`
  - compatibility redirect to `/sales-book/orders`
  - preserves query params for existing bookmarks
- `/sales-book/orders/bin`
  - deleted orders route
  - renders the same `apps/www/src/components/tables-2/sales-orders/*` table with `bin` enabled
  - uses the existing `SalesOrdersV2Header` and sales-orders v2 URL filter contract

## Backend Contracts
- `sales.getOrdersV2`
  - existing current orders list query used by the canonical orders page
  - reuses established sales filtering semantics through an internal legacy-query adapter
  - returns a slimmer row payload focused on list presentation instead of the legacy table shape
  - honors the existing pagination `bin` input for deleted-order table views
- `sales.getOrdersV2Summary`
  - returns page-level summary metrics for:
    - total orders
    - invoice value
    - outstanding balance
    - paid orders
    - evaluating orders
- `filters.salesOrdersV2`
  - existing current filter metadata source for the canonical orders page
  - uses cleaner query keys than the older sales-order filter path
- Migration note:
  - These existing orders contracts are reused as-is.
  - Future table migrations should not create new `*V2` queries or `filters.*V2` metadata solely to adopt the `tables-2` UI.

## Frontend Structure
- Hook
  - `apps/www/src/hooks/use-sales-orders-v2-filter-params.ts`
- Header
  - `apps/www/src/components/sales-orders-v2-header.tsx`
  - `apps/www/src/components/sales-tabs.tsx` renders the shared sales-book Orders/Quotes/Production/Shelf Items navigation as a real `ButtonGroup` in both the page-tab portal and the compact inline header placement.
- Summary widgets
  - `apps/www/src/components/sales-orders-v2-summary-widgets.tsx`
- Table
  - `apps/www/src/components/tables-2/sales-orders/columns.tsx`
  - `apps/www/src/components/tables-2/sales-orders/data-table.tsx`
  - `apps/www/src/components/tables-2/sales-orders/table-header.tsx`
  - `apps/www/src/components/tables-2/sales-orders/skeleton.tsx`
  - `apps/www/src/components/tables-2/sales-orders/empty-states.tsx`
- Route
  - `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/page.tsx`
  - `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/v2/page.tsx` redirects to the canonical route
  - `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/bin/page.tsx`

## Architectural Notes
- The canonical page intentionally avoids the older route-local coupling from the legacy `sales-book/orders` table implementation.
- The route prefetches only the list and summary queries.
- Summary metrics render as separate page-level cards instead of piggybacking on table-only state.
- The table payload omits legacy note-count and extra enrichment work that is not required for first paint.
- The page keeps existing sales overview integration by opening rows through `useSalesOverviewQuery`.
- The table now uses a unified sales funnel status contract so UI surfaces do not have to reason separately about invoice, production, and fulfillment state for list presentation.
- The current page uses the richer `tables-2/sales-orders` implementation as the table standard.
- The older `components/tables/sales-orders-v2` files were removed after an import scan confirmed they were unused.
- `components/tables-2/core/*` remains unchanged for this migration.
- Legacy `/sales-book/create-order` fresh-create forms require customer selection on open. When the hydrated legacy form has no saved sales id and no `metaData.customer.id`, it opens a required `Create Order: Select Customer` dialog that reuses the existing legacy customer lookup; selecting a customer updates the same legacy form store and closes the dialog.

## Current Table Shape
- Columns
  - order number
  - date
  - P.O.
  - inbound status
  - customer name
  - phone
  - address
  - invoice total
  - delivery method
  - status
  - actions
- Row interaction
  - clicking a row opens the existing sales sheet
  - the actions column exposes a compact overview icon with a hover preview
  - the hover preview is intentionally compact and composed as a single overview panel instead of multiple cards
- Smart funnel status
  - `pending`
    - no active production or fulfillment progress
  - `queued`
    - assigned or started in production
  - `ready`
    - production completed and ready for fulfillment
  - `transit`
    - dispatch or fulfillment is in progress
  - `completed`
    - order has been delivered or fully completed

## Follow-up Ideas
- Add dedicated batch actions for the v2 table once the row model is stable.
- Add cleaner sales manager scoping controls to the v2 filter contract if needed.
- Keep `/sales-book/orders/bin` on the shared `tables-2/sales-orders` table and `sales.getOrdersV2` query path; do not reintroduce the legacy sales-orders table for this route.
- Move more of the sales list/query normalization into shared package-layer application code if the current orders query becomes a shared model for other clients.

## Validation
- 2026-06-16 browser smoke:
  - Quick Login as Pablo Cruz / Super Admin.
  - Desktop `/sales-book/orders` rendered summary cards, Orders search placeholder, table headers, and 20 virtual rows with no `/sales-book/orders/v2` links or Legacy button.
  - `/sales-book/orders/v2?search=08499` redirected to `/sales-book/orders?search=08499` and rendered the canonical page.
  - Mobile viewport `390x844` rendered the page without document-level horizontal overflow; the table stayed inside its own horizontal scroller.
  - No console errors were reported during the orders page checks.
- 2026-06-16 orders bin browser smoke:
  - Authenticated session showed the Pablo Cruz / Super Admin `PC` account badge.
  - Desktop `/sales-book/orders/bin` rendered `Sales Bin`, the orders v2 search placeholder, table headers, and deleted-order rows.
  - Mobile viewport `390x844` rendered without document-level horizontal overflow; the table kept horizontal and vertical scrolling inside its own container.
  - Search smoke for `08489PC` updated the URL to `q=08489PC` and narrowed the table to the matching row.

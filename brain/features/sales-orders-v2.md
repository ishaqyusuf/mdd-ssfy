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
  - uses the existing `SalesOrdersV2Header` and canonical sales-orders URL filter contract

## Backend Contracts
- `sales.getOrders`
  - canonical orders list query used by the canonical orders page, supporting web helpers and Expo order lists
  - reuses established sales filtering semantics through an internal legacy-query adapter
  - returns a slimmer row payload focused on list presentation instead of the legacy table shape
  - honors the existing pagination `bin` input for deleted-order table views
- `sales.getOrdersSummary`
  - returns page-level summary metrics for:
    - total orders
    - invoice value
    - outstanding balance
    - paid orders
    - evaluating orders
- `filters.salesOrders`
  - filter metadata source for the canonical orders page
- `sales.salesRepOptions`
  - protected option list used by the sales overview transfer control
  - returns active sales/order-capable internal users with id, display name, email, initials, and role labels
  - accepts `salesId` so regular sales reps can load targets only for orders currently assigned to them
- `sales.transferSalesRep`
  - protected mutation for correcting the sales rep attached to an existing order
  - validates the actor either has `editOrders` or currently owns the order, the order is a non-deleted order, the target is an active eligible internal sales user, and the actor's password confirmation succeeds
  - updates only `SalesOrders.salesRepId` and writes `SalesHistory` audit metadata for previous rep, next rep, actor, order id, and optional note
- Migration note:
  - The former `sales.getOrdersV2`, `sales.getOrdersV2Summary`, and `filters.salesOrdersV2` public names were promoted into the default order routes.
  - Expo order lists adapt the flat default row into their stable mobile card model instead of depending on the old nested legacy DTO.
  - Future table migrations should not create new `*V2` queries or `filters.*V2` metadata solely to adopt the `tables-2` UI.

## Frontend Structure
- Hook
  - `apps/www/src/hooks/use-sales-orders-v2-filter-params.ts`
- Header
  - `apps/www/src/components/sales-orders-v2-header.tsx`
  - `apps/www/src/components/sales-orders-v2-export.tsx`
  - `apps/www/src/components/sales-orders-export.ts`
  - `apps/www/src/components/sales-tabs.tsx` renders the shared sales-book Orders/Quotes/Production/Shelf Items navigation as a real `ButtonGroup` in both the page-tab portal and the compact inline header placement.
- Summary widgets
  - `apps/www/src/components/sales-orders-v2-summary-widgets.tsx`
- Table
  - `apps/www/src/components/tables-2/sales-orders/columns.tsx`
  - `apps/www/src/components/tables-2/sales-orders/data-table.tsx`
  - `apps/www/src/components/tables-2/sales-orders/bottom-bar.tsx`
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
- Summary metrics are desktop-only at the `xl` breakpoint and above; smaller viewports go straight from the Sales page title to the orders header/table to preserve working space.
- The table payload omits legacy note-count and extra enrichment work that is not required for first paint.
- The page keeps existing sales overview integration by opening rows through `useSalesOverviewQuery`.
- The sales overview `SALES REPRESENTATIVE` section now exposes a `Change Rep` action for users with `editOrders` and for the current owner sales rep. The inline picker calls `sales.transferSalesRep`, requires a password confirmation modal before the mutation completes, refreshes order lists/summaries/overview/dashboard query families through `useSalesQueryClient`, and leaves quotes read-only for this v1 correction workflow.
- The table now uses a unified sales funnel status contract so UI surfaces do not have to reason separately about invoice, production, and fulfillment state for list presentation.
- The current page uses the richer `tables-2/sales-orders` implementation as the table standard.
- The older `components/tables/sales-orders-v2` files were removed after an import scan confirmed they were unused.
- `components/tables-2/core/*` remains unchanged for this migration.
- Legacy `/sales-book/create-order` fresh-create forms prompt for customer selection on open. When the hydrated legacy form has no saved sales id and no `metaData.customer.id`, it opens a dismissible `Create Order: Select Customer` dialog that reuses the existing legacy customer lookup; selecting a customer updates the same legacy form store and closes the dialog, while closing the prompt lets the user continue without selecting a customer.
- Sales control tasks launched from `SalesMenu.MarkAs` register serializable task-monitor intents for production completion and fulfillment. The global bottom-right task monitor now handles those intents on Trigger completion and invalidates the sales list, sales summary, production overview, and sale overview queries so status changes refresh even after the dropdown unmounts.
- Since the task monitor owns Mark As progress/completion feedback, `SalesMenu.MarkAs` suppresses duplicate start/completion toasts. Startup failures that happen before a task can be monitored still surface as destructive toast errors.
- Filtered/selected Excel report export is restored on the current Sales Orders header. The report button stays hidden for the default unfiltered/unselected page, appears when Sales Orders filters are active or table rows are selected, refetches through the current `sales.getOrders` contract with `size: 999`, uses selected numeric `salesIds` resolved from UUID-keyed table rows, and generates a client-side `.xlsx` workbook with linked order numbers, money formatting, frozen header, column widths, and Excel autofilter.

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
- Invoice total display repairs C.C.C before rendering: `grandTotal` stays base/principal-only, `displayCcc` is recalculated from the selected card/link/terminal method and `ccc_percentage` when cached `meta.ccc` is missing or stale, and non-card rows stay base-only even if old metadata contains C.C.C.
- Row interaction
  - clicking a row opens the existing sales sheet
  - the actions column exposes a compact overview icon with a hover preview
  - the hover preview is intentionally compact and composed as a single overview panel instead of multiple cards
  - order overview sheets render the same lifecycle status label/tone near the order number, using the shared order lifecycle helper plus a `cva`-backed overview badge presenter
- Batch interaction
  - selecting one or more orders opens the floating bottom batch bar
  - selected rows also enable the header Excel report export; the table resolves selected UUID row keys to numeric sales order ids before export
  - the batch bar exposes a dedicated `Mark as` dropdown backed by `SalesMenu.MarkAs` for multi-order `Production completed` and `Fulfilled` updates
  - print remains a print-only batch menu so status changes are no longer hidden inside the print action
- Row density
  - the canonical orders table uses compact 48px virtual rows so more orders fit in the working viewport while preserving the existing action buttons, sticky columns, and row-open behavior
  - the sticky `Order #` column defaults to a narrower 180px width with a 150px minimum so the table exposes more downstream columns without changing row actions or sort behavior
  - the `Address` column defaults to a compact 220px width with a 150px minimum while preserving truncation and tooltip access to full addresses
  - the `Invoice` column defaults to 120px with a 100px minimum so money totals stay readable while freeing horizontal space for adjacent order columns
  - the legacy `/sales-rep` recent-sales mobile/list fallback now uses `ItemCard2`, a flat divider-based row instead of the older rounded card layout; it keeps customer, order id, invoice amount/status, lifecycle status, priority/dealer/inbound badges, phone/address, and row actions while targeting 3-5 visible rows in the sales-rep viewport.
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
- Continue filling out dedicated batch actions for the v2 table where shared sales workflows already exist.
- Add cleaner sales manager scoping controls to the v2 filter contract if needed.
- Keep `/sales-book/orders/bin` on the shared `tables-2/sales-orders` table and `sales.getOrders` query path; do not reintroduce the legacy sales-orders table for this route.
- Move more of the sales list/query normalization into shared package-layer application code if the current orders query becomes a shared model for other clients.

## Validation
- 2026-07-10 filtered Excel export implementation:
  - `bun test apps/www/src/components/sales-orders-export.test.ts` passed.
  - `bunx biome check --formatter-enabled=false apps/www/src/components/sales-orders-export.ts apps/www/src/components/sales-orders-export.test.ts apps/www/src/components/sales-orders-v2-export.tsx apps/www/src/components/sales-orders-v2-header.tsx apps/www/src/components/tables-2/sales-orders/data-table.tsx apps/www/src/store/sales-orders.ts` passed.
  - `git diff --check` passed.
  - Broad typecheck/build/browser validation was intentionally not run under the fast Bun monorepo command discipline for this narrow UI/reporting change.
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

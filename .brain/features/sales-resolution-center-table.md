# Sales Resolution Center Table

## Current Route
- `/sales-book/accounting/resolution-center`
  - renders `apps/dashboard/src/components/tables-2/sales-resolution/*`
  - reuses the existing `sales.getSalesResolutions` infinite query
  - reuses the existing `sales.getSalesResolutionsSummary` count query
  - reuses the existing `filters.salesResolutions` metadata route and `SalesResolutionHeader`
- `/sales-book/finance?tab=resolution`
  - renders the same table in `financeMode`
  - uses protected `salesFinance.resolutions` and
    `salesFinance.resolutionsSummary` queries
  - uses the standard Finance Midday filter/header composition and a stable
    Resolution Center product tab

## Migration Notes
- This is a table UI migration only; no new `*V2` route or query was added.
- `apps/dashboard/src/components/tables-2/core/*` was not changed.
- The route now uses `batchPrefetch`, `HydrateClient`, `ScrollableContent`, `Suspense`, `ErrorBoundary`, and `getInitialTableSettings("sales-resolution")`.
- The old one-column expandable `@gnd/ui/data-table` resolution table was removed from the live route surface.
- The old variable-height expanded card content was moved out of virtual rows: row clicks and the Review action toggle selected resolution ids in URL state, while payment detail/review panels render below the fixed-height table.
- The 2026-07-17 density pass tightened the existing `tables-2` implementation to the current Sales Orders/Midday compact target without changing the query, filter, detail-panel, selection, or sync-due contracts.

## Table Behavior
- Columns include select, order, customer, issue, amounts, due, payments, sales rep, and actions.
- Compact table settings use 56px rows, 45px headers, sticky select/order columns, draggable headers, resize handles, column visibility, column dividers, persisted sizing/order/visibility, and table-owned horizontal/vertical scroll.
- Content-tailored widths are registered for order/customer/amount/due/payment/action columns so the table follows the Sales Orders compact standard without wide unused columns.
- The header action group shows column visibility plus the unresolved conflict count.
- Legacy `Sync due amount` retains its existing behavior. Finance mode calls
  `salesFinance.resolutionSyncBalance`, requires `editOrderPayment`, captures
  authenticated before/after evidence, and refreshes both Finance and legacy
  resolution projections.
- Payment review dialogs opened from Finance use the protected
  `salesFinance.resolutionPayment` mutation and require a minimum 10-character
  audit-evidence note.

## Density And Widths
- Table config: `TABLE_CONFIGS["sales-resolution"]` uses `style: "compact"` and `rowHeight: 56`.
- Sticky columns: Select `50px`, Order `132/220/154`.
- Customer width: `180/340/220`.
- Issue width: `140/240/170`.
- Amounts and Due widths: `124/180/144`.
- Payments width: `104/150/118`.
- Sales Rep width: `96/150/112`.
- Actions width: `124/170/136`.

## API Contract Notes
- `getSalesResolutions` still scans order/payment candidates and computes conflict status with the existing legacy projection/classification logic.
- Sorting is intentionally limited to direct `SalesOrders` fields that can be ordered safely by Prisma: `orderId`, `createdAt`, `grandTotal`, and `amountDue`.
- Computed values such as conflict type, projected due, and payment count remain readable but are not server-sortable in this slice.
- The resolution filter URL schema now includes `customer.name` and `status`, matching the existing filter metadata.

## Validation
- 2026-07-30 Finance integration proof:
  - focused API/dashboard coverage passed with 34 tests / 441 assertions
  - permission boundaries cover Finance list/summary and all resolution
    correction mutations
  - authenticated desktop and `390x844` browser proof confirmed stable tabs,
    live cases, persistent column controls, and contained table scrolling
    (`scrollWidth 1248`, `clientWidth 325`) without document overflow
  - payment `11665` exposed the permission-aware Payment resolution section and
    a non-submitted dialog with Apply disabled until audit evidence is entered
- 2026-07-17 density proof:
  - Focused Sales Resolution parity test passed with 3 tests / 43 assertions.
  - Full `apps/dashboard/src/components/tables-2` suite passed with 301 tests / 2478 assertions.
  - Focused Biome passed for the resolution table files and `table-configs`.
  - Touched-path `@gnd/dashboard` typecheck scan produced no diagnostics.
  - Browser proof on `/sales-book/accounting/resolution-center` confirmed `56px` rows, `45px` header, vertical table-owned overflow/scroll (`scrollTop 0 -> 600`), horizontal table-owned overflow/scroll (`scrollWidth 1248`, `clientWidth 1146`, `scrollLeft 0 -> 102`), and `--header-offset` changing from `0px` to `70px`.
  - Screenshot evidence saved at `/private/tmp/gnd-sales-resolution-table.jpg`.
- 2026-07-16:
  - focused Biome passed for the resolution route/table/API/filter/settings files.
  - full restarted table parity suite passed with 72 tests / 646 assertions.
  - static scan found no live `@gnd/ui/data-table`, legacy table skeleton, `getQueryClient`, `fetchInfiniteQuery`, or `PageStickyHeader` usage in the resolution route surface.
  - filtered `@gnd/dashboard` and `@gnd/api` typecheck greps reported no touched-file diagnostics; broad package typechecks remain blocked by existing unrelated baseline errors.
  - HEAD smoke returned `200` for `/sales-book/accounting/resolution-center` and `/sales-book/accounting/resolution-center?sort=orderId.asc` through the local `3011` proxy after the route warmed.

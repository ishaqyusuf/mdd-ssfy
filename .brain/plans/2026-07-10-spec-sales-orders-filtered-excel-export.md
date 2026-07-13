# Sales Orders Filtered Excel Export

## Status
- Implemented
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/41
- Created Date: 2026-07-10
- Completed Date: 2026-07-10

## Problem Statement

Sales operators used to have a button on the Sales Orders page that appeared when a filter was applied and let them download the filtered order set as an Excel report. In the new Sales Orders page, that export affordance is missing, so filtered operational views cannot be quickly handed off, reconciled, or reviewed outside the app.

The old feature was not VAT-specific. The trigger condition was filter-driven, with selected-row export support as a secondary path.

## Solution

Reintroduce a Sales Orders Excel export on the current Sales Orders page. When an operator applies any Sales Orders filter, the page should show an export/report button. Clicking it should download an `.xlsx` workbook containing the current filtered order set. If rows are selected, the export should support exporting the selected orders instead of the full filtered result set.

The export should use the current Sales Orders V2 query/filter contract and table row model, not the removed legacy table implementation.

## User Stories

1. As a sales operator, I want to see an export button after applying a Sales Orders filter, so that I can download the filtered order list.
2. As a sales operator, I want the export button hidden when no filter is active and no rows are selected, so that the page does not encourage broad accidental exports.
3. As a sales operator, I want the exported file to use Excel format, so that I can open it in Excel or spreadsheet tools.
4. As a sales operator, I want the exported file name to include the report type and date, so that downloaded reports are easy to identify.
5. As a sales operator, I want the exported rows to match the current filters, so that the spreadsheet reflects the view I built in the app.
6. As a sales operator, I want selected rows to export as the selected set, so that I can create a smaller report from a filtered table.
7. As a sales operator, I want selected-row export to use the real numeric sales order ids, so that the new UUID-keyed table selection does not export the wrong data.
8. As a sales operator, I want order numbers in the spreadsheet to link back to the app order overview, so that reviewers can jump from Excel to the source order.
9. As a sales operator, I want the spreadsheet to include order date, order number, sales rep, P.O., invoice total, paid amount, pending amount, customer, phone, address, delivery method, and status, so that the report is useful without opening each order.
10. As a sales manager, I want the export to respect the same Sales Orders filter permissions and visibility as the page, so that reports do not leak inaccessible orders.
11. As a sales manager, I want filtered exports to include all matching rows up to the agreed export limit, so that the report is not limited to the currently virtualized rows on screen.
12. As a sales manager, I want a clear error message if export preparation fails, so that I know the report did not download.
13. As a sales manager, I want the button to show a loading/preparing state, so that repeated clicks do not start duplicate exports.
14. As a sales manager, I want the spreadsheet to include a frozen header row, column widths, and autofilter, so that the report is practical to scan in Excel.
15. As a sales manager, I want money values to use the same display semantics as the current orders table, including C.C.C-adjusted invoice display where applicable, so that exported totals match the page.
16. As a sales rep, I want my filtered sales-order view export to use the same current filter defaults as the page, so that the downloaded report matches my operational view.
17. As a Super Admin, I want all-sales filtered exports to use the existing all-sales scope, so that management reports can cover the full order set.
18. As an implementer, I want to reuse the existing current orders query contract, so that we do not revive legacy `sales.index` list behavior.
19. As an implementer, I want to reuse the existing Excel dependency already active in the app, so that no new spreadsheet library is introduced.
20. As an implementer, I want export formatting separated from the button component, so that row mapping and workbook creation can be tested without a browser.
21. As an implementer, I want the export behavior covered at the query/mapping seam, so that future table migrations do not silently break the report.

## Implementation Decisions

- Add a Sales Orders export/report control to the current Sales Orders header action area.
- Show the control when any current Sales Orders filter is active, or when table row selection is non-empty.
- Keep the control hidden for an unfiltered, unselected default page state.
- Base the export query on the current Sales Orders V2 filter params and `sales.getOrders` contract.
- Preserve the current `showing: "all sales"` behavior used by the canonical Sales Orders page.
- Use selected-row export by resolving UUID-keyed table row selection to numeric sales order ids from the current table data, not by coercing row-selection keys to numbers.
- Prefer exporting selected rows from the current table data when the selected rows are already loaded; if the implementation performs a refetch, pass numeric `salesIds` to the same current orders query.
- Request a bounded export page size consistent with the old behavior unless product/engineering chooses a safer larger-export path. The historical export used a `size: 999` style limit.
- Use the already-installed Excel writer dependency used by the Sales Accounting export.
- Keep workbook generation client-side for this reimplementation unless export size, permissions, or performance require a future server-generated artifact.
- Include a primary worksheet with order rows and a frozen header row.
- Include Excel autofilter and reasonable column widths.
- Include order overview hyperlinks using the current app URL and current sales overview query contract.
- Format currency values with the app's existing money formatter.
- Keep the report action independent of print/PDF menus; this is a spreadsheet export, not a sales document print flow.
- Do not change database schema, sales order persistence, payment calculation, tax behavior, or table core primitives.

## Testing Decisions

- Primary testing seam: a focused Sales Orders export row-mapping/workbook helper that accepts current `sales.getOrders` rows plus app URL and returns deterministic spreadsheet row values.
- Secondary testing seam: the Sales Orders export control state, verifying it is visible when filters are active, hidden when no filters or selections exist, and visible when rows are selected.
- API/query coverage should verify that export input uses the same current `sales.getOrders` filter contract as the page and that selected-row export passes numeric `salesIds`.
- Tests should assert external behavior: exported columns, order-link target, formatted money values, selected-id handling, empty/no-filter visibility, and failure feedback.
- Tests should avoid coupling to internal TanStack Table implementation details beyond the existing public row-selection state shape.
- Prior art includes the current Sales Accounting Excel export and the current Sales Orders V2 table/header tests or focused component patterns.
- Browser smoke after implementation should cover applying a filter on `/sales-book/orders`, seeing the report/export button, downloading an `.xlsx`, and confirming at least the header row plus a known filtered order row.

## Implementation Summary

- Added `SalesOrdersV2Export` to the current Sales Orders header action area.
- Added `sales-orders-export.ts` to keep export row mapping, historical overview links, report filename generation, trigger logic, and export query construction outside the button component.
- The export button is hidden until a Sales Orders filter is active or one or more table rows are selected.
- Filtered export refetches `sales.getOrders` with the current Sales Orders filter params, current sort, and `size: 999`.
- Selected export resolves the UUID-keyed TanStack row selection to numeric sales order ids from current table rows and passes those ids to `sales.getOrders` as `salesIds`.
- The generated workbook includes serial number, date, linked order number, sales rep, P.O., invoice, paid, pending, customer, phone, address, delivery method, and status.
- Workbook generation remains client-side through the already-installed `xlsx-js-style` package and adds column widths, frozen header row, header styling, and Excel autofilter.

## Validation

- `bun test apps/www/src/components/sales-orders-export.test.ts` passed.
- `bunx biome check --formatter-enabled=false apps/www/src/components/sales-orders-export.ts apps/www/src/components/sales-orders-export.test.ts apps/www/src/components/sales-orders-v2-export.tsx apps/www/src/components/sales-orders-v2-header.tsx apps/www/src/components/tables-2/sales-orders/data-table.tsx apps/www/src/store/sales-orders.ts` passed.
- `git diff --check` passed.
- Broad typecheck/build/browser validation was intentionally not run under the fast Bun monorepo command discipline for this narrow UI/reporting change.

## Out of Scope

- VAT-specific report behavior.
- New sales tax calculations or tax filter changes.
- Server-side scheduled reports.
- Emailing the generated spreadsheet.
- Reworking the Sales Orders table layout.
- Changing the Sales Orders filter vocabulary.
- Exporting every historical order from an unfiltered page state.
- Replacing the existing Sales Accounting export.
- Adding a new database table, migration, or permission model.

## Further Notes

- Historical feature location: commit `93870eb3d` had `SalesOrderExport` mounted in the old sales order header. Later snapshots including `96c54292f` and `5d9d88456` kept the same sales-order export component.
- Historical trigger condition: the component returned `null` when there were no active filters and no selected rows.
- Historical query path: the earliest snapshot called the legacy sales orders list query, then later snapshots moved to the newer orders query name before the current Sales Orders V2 page fully took over.
- Historical export columns: serial number, date, linked order number, sales rep, P.O., invoice, paid, pending, customer, phone, and address.
- Current missing piece: the current Sales Orders V2 header has column visibility and create-order actions, but no Sales Orders export action.
- Current implementation caution: the new table selection keys are UUIDs. The old numeric coercion of selection keys must not be reused.

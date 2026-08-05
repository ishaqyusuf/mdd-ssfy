# Sales Dashboard And Reporting

## Purpose

Sales reporting is split into three deliberately distinct surfaces:

- `/sales-dashboard` is the fixed operational overview.
- `/sales-book/reports` is the customizable sales-performance workspace and
  report catalog.
- `/sales-book/finance` remains the canonical payments, refunds,
  reconciliation, collections, and receivables workspace.

The dashboard and reports workspace share one metric contract. They do not
recalculate or duplicate Sales Finance projections.

One unified Reports menu is mounted from the shared Sales route-group layout,
so it remains available in the top-right application header across the Sales
dashboard, sales-rep dashboard, Sales Book, and sales create/edit routes. The
previous page-local report dropdowns are not rendered.

The shared Sales sidebar labels both Sales Finance and Sales Reports with a
`New` badge during rollout so operators can discover the parallel surfaces
without removing legacy Accounting.

## Metric Contract

All sales-performance metrics:

- include only non-deleted `SalesOrders`;
- use order `createdAt` as the booked-period date;
- treat date-only `from` and `to` filters as inclusive local calendar days;
- support optional sales-rep and sales-channel filters at the API boundary;
- respect the existing office/dealer-customer visibility rule;
- compare summary metrics with the immediately preceding period of equal
  length.

Defined summary metrics:

- Booked sales: sum of `grandTotal` for orders created in the period.
- Orders: count of orders created in the period.
- Quotes: count of quotes created in the period.
- Average order value: booked sales divided by order count.
- Active production: current non-deleted orders with production status
  `pending`, `in_progress`, or `started`.

Net collections and payment review counts come from `salesFinance.summary`
only when the viewer has Sales Finance access.

## Dashboard

The fixed dashboard provides:

- summary metrics and previous-period comparisons;
- adaptive booked-sales trend (day up to 45 days, week up to 180 days, month
  beyond 180 days);
- recent-order drill-down into the canonical Sales Overview sheet;
- sales-rep, product, and sales-channel performance cards;
- direct navigation to Sales Finance and Sales Reports.

The selected period is URL-backed and shared across every dashboard query.

## Reports Workspace

The reports workspace reuses the same API queries and date state. Users can:

- drag report cards into a preferred order;
- hide or restore cards;
- reset to the default layout;
- retain the preference in the `gnd-sales-report-layout` cookie.
- generate filter-aware Excel workbooks from the unified header Reports menu.

The governed workbook catalog is sales-performance specific:

- Performance summary;
- Orders ledger;
- Sales by representative;
- Product performance;
- Quote activity;
- Sales by customer.

Every workbook includes Report Context and Summary sheets. Detail and grouped
reports retain auditable source sheets where aggregation would otherwise hide
the originating order or line-item records. Excel dates are real date cells and
money/count values remain numeric. The report endpoint rejects requests above
10,000 relevant source records instead of returning a partial workbook.

Quote Activity reports only factual quote counts, values, status, validity, rep,
customer, and channel evidence. They do not infer conversion without a
canonical quote-to-order relationship.

The report catalog deep-links to governed source workspaces for Sales Finance,
receivables aging, customer statements, detailed product reports, and the
existing scheduled payment report. Existing permissions determine which
catalog entries appear, and the target API repeats authorization.

Payments, refunds, applications, collections, and receivables remain owned by
Sales Finance. The Reports menu links operators to that workspace rather than
duplicating those contracts.

## Unified Reports Menu

The shared menu replaces the previous link-only dropdown. It is divided into:

- Performance Excel: six direct, filter-aware workbook actions;
- Report workspaces: Sales Reports, Sales Finance exports, receivables,
  detailed product reporting, scheduled payment reporting, and customer
  statements.

Every option has an icon, title, and plain-language description. Desktop shows
the Reports button with the secondary variant directly in the top-right Sales
header; smaller breakpoints place the same content inside Quick access. The
catalog uses a two-column shadcn menu grid from the `sm` breakpoint upward,
collapses to one column on narrow screens, and keeps the fixed heading outside
a bounded `ScrollArea` so
large permission sets remain navigable without extending beyond the viewport.
Create/edit forms suppress the New Sales and New Quote shortcuts but retain
report access.

The menu is a discovery and action surface, not a new source of financial
truth. Existing report implementations remain in their governed workspaces and
retain their API permission boundaries.

## API And Permissions

The `salesDashboard` tRPC router exposes:

- `getKpis`
- `getRevenueOverTime`
- `getRecentSales`
- `getTopProducts`
- `getSalesRepLeaderboard`
- `getSalesChannelBreakdown`
- `report`

Every endpoint is a protected procedure and requires at least one of
`viewOrders`, `editOrders`, `viewSales`, `viewEstimates`, or `editEstimates`.
The `report` endpoint additionally requires
`generateSalesPerformanceReport`.
Sidebar visibility is not an authorization boundary.

## Architecture

Pure date, comparison, granularity, percentage-change, and metric-definition
logic lives in `@gnd/sales/reporting`. API queries own database projection and
office visibility. Pure workbook definitions live in
`@gnd/sales/performance-reports`; the dashboard export adapter owns Excel
styling and file download. Dashboard components own presentation and URL state.

See
[ADR-038](../decisions/ADR-038-sales-reporting-surface-boundaries.md).

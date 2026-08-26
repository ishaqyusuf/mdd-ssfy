# Manual Sales Tax Report

## Goal

Let authorized Sales users download a simple monthly accounting export of
persisted order totals and tax without scheduling delivery or navigating away
from the current Sales page.

## Scope

- Manual Excel generation from the shared Sales Reports menu.
- The modal opens with an inclusive range preselected from the first day of the
  current `America/New_York` business month through the current business day.
- The user can replace that default with any non-future inclusive date range,
  including a range that crosses month boundaries.
- Business-date boundaries use `America/New_York` and become a UTC
  `[from, toExclusive)` query range.
- Included records are fully paid, non-deleted `SalesOrders` with `type = order`
  and persisted `amountDue <= 0`, including overpayments. Partially paid and
  unpaid orders, quotes, and deleted orders are excluded; order status and tax
  amount do not filter rows.
- The export uses persisted `SalesOrders.grandTotal` and `SalesOrders.tax`.
  Refunds are not netted and tax is not recalculated from current tax settings.
- Scheduled delivery, direct government filing, and immutable filing archives
  are out of scope.

## Flow

1. A user with `generateSalesPerformanceReport` opens Reports and selects
   **Sales Tax Report** under Performance Excel.
2. The modal opens with the current New York month-to-date range selected and
   **Generate Excel** enabled. Wide screens show two adjacent months; screens
   below 768px show one month so the calendar remains within the viewport.
3. The user can select any complete non-future range. The **From** and **To**
   summaries follow the range, and generation is disabled while it is partial.
4. The protected API derives the authoritative period, loads at most 10,000
   orders in deterministic creation/id order, and returns workbook sheets.
5. The browser downloads `sales-tax-<from>-to-<to>.xlsx`. Empty periods and
   invalid/oversized requests show an error without downloading a partial file.

## Data And Workbook Contract

- `Report Context`: period start/end, business timezone, and generation time.
- `Summary`: order count, cent-safe sales total, and cent-safe tax total.
- `Sales Tax`: exactly `Order #`, `Customer Name`, `Total`, and `Tax`.
- Customer display fallback is business name, personal name, billing name,
  then `Walk-in customer`.
- Historical reruns reflect the order values currently persisted at generation
  time; this workbook is an accounting export, not an immutable filing record.

## API And Permissions

- `salesDashboard.salesTaxReport({ from: YYYY-MM-DD, to: YYYY-MM-DD })` is a
  protected query; both dates are inclusive business dates.
- It requires the normal sales-report viewer boundary plus
  `generateSalesPerformanceReport`, matching existing performance exports.
- The server rejects malformed dates, invalid calendar dates, reversed ranges,
  future business dates, and reports exceeding 10,000 source orders.

## Validation

- Domain coverage includes DST-aware boundaries, leap-day/month-end dates,
  reversed/future rejection, cent-safe totals, and exact workbook columns.
- API coverage includes the paid-only order scope, deterministic ordering,
  persisted money, customer-name fallbacks, null amounts, and the row-limit
  guard.
- Dashboard coverage includes the New York month-to-date default, non-future
  selectable dates, responsive month count, menu/modal wiring, and
  deterministic tax-report filenames.

## Follow Up

- A future CPA-approved requirement may add refund/void adjustments,
  jurisdiction-specific columns, scheduled delivery, or immutable snapshots;
  none should be inferred from this manual export.

# Manual Sales Tax Report

## Goal

Let authorized Sales users download a simple monthly accounting export of
persisted order totals and tax without scheduling delivery or navigating away
from the current Sales page.

## Scope

- Manual Excel generation from the shared Sales Reports menu.
- The user selects one inclusive end date from the 25th through the actual end
  of a historical/current month; the start is always that month's first day.
- Business-date boundaries use `America/New_York` and become a UTC
  `[from, toExclusive)` query range.
- Included records are non-deleted `SalesOrders` with `type = order`, regardless
  of payment state, order status, or tax amount. Quotes and deleted orders are
  excluded.
- The export uses persisted `SalesOrders.grandTotal` and `SalesOrders.tax`.
  Refunds are not netted and tax is not recalculated from current tax settings.
- Scheduled delivery, direct government filing, and immutable filing archives
  are out of scope.

## Flow

1. A user with `generateSalesPerformanceReport` opens Reports and selects
   **Sales Tax Report** under Performance Excel.
2. The modal opens on the current month once its 25th has arrived; before then,
   it opens on the previous month. No end date is preselected.
3. The user selects the 25th through the month's final non-future day. The UI
   displays the derived first day and enables **Generate Excel**.
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

- `salesDashboard.salesTaxReport({ to: YYYY-MM-DD })` is a protected query.
- It requires the normal sales-report viewer boundary plus
  `generateSalesPerformanceReport`, matching existing performance exports.
- The server rejects malformed dates, invalid calendar dates, dates before the
  25th, future business dates, and reports exceeding 10,000 source orders.

## Validation

- Domain coverage includes DST-aware March boundaries, leap-day/month-end
  dates, future and pre-25th rejection, cent-safe totals, and exact workbook
  columns.
- API coverage includes query scope, deterministic ordering, persisted money,
  customer-name fallbacks, null amounts, and the row-limit guard.
- Dashboard coverage includes initial-month policy, selectable dates, menu and
  modal wiring, and deterministic tax-report filenames.

## Follow Up

- A future CPA-approved requirement may add refund/void adjustments,
  jurisdiction-specific columns, scheduled delivery, or immutable snapshots;
  none should be inferred from this manual export.

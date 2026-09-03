# Manual Sales Tax Report

## Goal

Let authorized Sales users download a Florida-oriented accrual accounting
workbook based on when a taxable sale is completed, independent of when the
customer pays.

## Recognition Policy

- Order creation and payment dates are not tax points.
- An active `type=order` sale is recognized once the order is fully fulfilled:
  canonical `dispatchCompleted >= 100%` or a terminal completed/delivered/
  fulfilled status, plus an actual delivery, pickup, or order-delivered time.
- The taxable-sale date is the latest available fulfillment evidence. A live
  completion command supplies its exact event time; historical reconciliation
  never falls back to `createdAt`, `updatedAt`, or a payment date.
- A 50%-paid, unpaid, credit, or installment sale is included in full once
  fulfilled. A draft/open order is excluded even if it has a deposit. Later
  payment is accounts-receivable activity and never creates another tax row.
- Cancelled orders are not newly recognized. An already recognized immutable
  entry is not silently deleted by later operational edits.
- This is an accounting export, not direct Florida filing, CPA advice, or a
  submitted government return.

## Durable Data

- `SalesTaxLedgerEntry` is an append-only tax-recognition snapshot related to
  `SalesOrders`. The initial sale key is `sale:<salesOrderId>:initial`, making
  retries idempotent.
- The current writer creates `SALE` entries. The schema reserves `ADJUSTMENT`
  and `REVERSAL` for a separately approved correction workflow; it does not
  infer corrections from payments or mutable order headers.
- Snapshots store order/customer display values plus invoice total, gross,
  exempt, taxable, state-tax, surtax, and total-tax cents. County code `A` is
  treated as surtax and the remaining stored tax as state tax.
- Customer fallback is business name, personal name, billing-address name,
  then `Walk-in customer`.

## User Flow

1. A user with normal Sales reporting access and
   `generateSalesPerformanceReport` chooses **Sales Tax Report** under
   Performance Excel.
2. The modal defaults to the first day of the current New York business month
   through today. The user may replace it with any complete non-future range.
3. Screens at least 768px wide show two adjacent calendars; narrower screens
   show one month. From/To summaries and Cancel/Generate Excel remain visible.
4. The server converts inclusive `America/New_York` dates to a UTC
   `[from, toExclusive)` recognition-time query, deterministically ordered by
   `recognizedAt`, then ledger id, with a 10,000-entry completeness guard.
5. The browser downloads `sales-tax-<from>-to-<to>.xlsx` without navigation.

## Workbook Contract

- `Report Context`: period, recognition-date basis, payment-independent policy,
  timezone, policy version, generated time, and the separate Dashboard booked
  sales comparison basis.
- `Florida Summary`: Dashboard Booked Sales for non-deleted orders created in
  the selected dates under the existing office visibility rule, plus
  Tax-recognized Orders, Tax-recognized Invoice Total, gross sales, exempt
  sales, taxable amount, state tax, surtax, and total tax.
- `Sales Tax`: exactly `Order #`, `Customer Name`, `Total`, and `Tax`.
- `Recognition Audit`: taxable-sale time, source, entry type, tax bases,
  state/surtax split, tax code, and tax due.

Dashboard Booked Sales and tax-recognized totals are intentionally separate:
the former uses mutable order totals and order creation date, while the latter
uses immutable ledger snapshots and taxable-sale recognition date. The tax
report remains company-wide apart from its selected dates; Sales Dashboard rep
and channel filters are not applied. A workbook remains downloadable when no
tax rows were recognized so the booked-sales comparison and zero recognition
evidence remain auditable.

## Historical Reconciliation

- `bun run sales-tax:reconcile` is a bounded dry run by default.
- Optional `--from`/`--to`, `--after-id`, and `--limit` filters support review.
- Apply mode requires `--confirm-review` and explicit
  `--sales-order-ids`; missing tax-point evidence remains excluded.
- The 2026-08-26 local cutover reviewed and created 51 entries for August 1–26.
  A repeat dry run classified all 51 as already recognized and found no
  remaining eligible rows in that period.

## Validation

- Tests cover DST/leap/month boundaries, future/reversed ranges, recognition
  evidence, credit-sale inclusion without payment access, partial-fulfillment
  exclusion, customer/null-money fallback, cent snapshots, deterministic
  ledger ordering, row limits, permission wiring, responsive calendars, exact
  detail columns, and dry-run/apply argument safety.

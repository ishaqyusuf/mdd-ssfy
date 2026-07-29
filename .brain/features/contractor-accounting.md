# Contractor Accounting

## Status

Implemented in the application; local decimal-column migration is pending
explicit approval because the development database has four older unapplied
repository migrations.

## User workflow

- Authorized staff open `/contractors/accounting` from the Contractors sidebar.
- The default period is January 1 through today. Staff can select any inclusive
  start and end date, including January 1 through August 31.
- The workspace shows opening liability, earned work, payouts, adjustments,
  reversals, closing liability, per-contractor balances, and reconciliation.
- `Export Excel` downloads Summary, Contractors, and Transactions worksheets.
- `Print / PDF` opens a signed, expiring report URL and renders the same summary,
  contractor balances, and transaction detail as a printable PDF.

## Accounting rules

- User-entered dates are inclusive business dates in `America/New_York` by
  default. Internally, reports use timezone-aware `[from, toExclusive)` UTC
  boundaries so the full final business day is included across DST changes.
- Amounts are normalized to integer cents with decimal half-up rounding before
  totals are calculated.
- Opening balance is all signed contractor activity before `from`.
- Period net activity is:
  - jobs earned
  - plus bonuses and expenses
  - minus deductions and payouts
  - plus payout reversals
- Closing balance is opening balance plus net activity.
- Payout cancellation restores the gross `subTotal`, because the original net
  payout and its deduction together reduced liability by that gross amount.
- Rejected jobs are excluded even if they retain an old approval timestamp.

## Current source and audit posture

- The report is derived from the existing `Jobs`, `JobPayments`, and
  `JobPaymentAdjustments` transaction records. No parallel reporting totals are
  stored, so screen, Excel, and PDF cannot drift through separate formulas.
- Job effective date precedence is `approvedAt`, then `statusDate`, then
  `createdAt`. The UI reports how many in-period jobs used a legacy fallback.
- Payout cancellation time is read from `JobPayments.meta.cancelledAt`.
- The API returns a reconciliation difference and missing-contractor/fallback
  counts as bounded data-quality evidence. The reconciliation difference
  cross-foots summary closing liability against the sum of contractor closing
  balances.
- Payouts without a usable transaction date are quarantined from accounting
  totals and reported in `missingPayoutDateCount`; they are never silently
  assigned to a period.
- Source reads are fail-closed at 50,000 jobs, 25,000 payouts, and 100
  adjustments per payout. Oversized reports must be narrowed rather than
  returning truncated financial totals.
- This slice does not introduce an immutable contractor ledger, closed
  accounting periods, or persisted report-run snapshots. Those remain a future
  accounting-controls phase; the existing job and payout records remain the
  transactional authority.

## Permissions and security

- Interactive report, payout list/detail, payment dashboard/portal, payout
  print-data, and contractor filter reads require an authenticated user with
  `viewJobPayment` or `editJobPayment`.
- Payout create/cancel/reverse operations continue to require
  `editJobPayment`.
- PDF data is exposed only through a signed expiring token containing the exact
  period, timezone, and optional contractor IDs. Only the protected
  payment-viewer mutation can mint its finance-specific token audience; the
  generic document token action explicitly refuses that audience.

## Validation

- Domain tests cover cents, signed accounting effects, invalid periods, DST,
  and inclusive January–August boundaries.
- API tests cover opening balance, earned work, discounts, payouts,
  cancellation reversals, status exclusion, data-quality evidence, and query
  boundaries.
- Export and PDF tests prove both outputs consume canonical report totals and
  transaction detail.
- Static permission tests cover every contractor-finance read boundary.
- Dashboard and PDF package typechecks pass. API typecheck reaches only the
  pre-existing Sentry event-type errors in `apps/api/src/instrument.ts`.

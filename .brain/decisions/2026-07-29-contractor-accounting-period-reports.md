# ADR: Contractor accounting period reports

## Status

Accepted for the first accounting-reporting slice. The mutable-source reporting
authority and read-only UI limitations are superseded by
`2026-07-30-contractor-accounting-immutable-ledger-cutover.md`; the cent-safe
date and permission decisions remain in force.

## Context

Contractor earnings and payouts already existed, but reporting was split between
unpaid payroll output and selected payout receipts. Staff needed an accounting
view for an arbitrary inclusive period such as January through August, with
opening/closing liability and matching downloadable documents.

Creating independently calculated screen, spreadsheet, and PDF implementations
would make financial totals prone to drift. The legacy data also contains
optional approval timestamps and integer payout columns.

## Decision

- Introduce `@gnd/contractor-accounting` as a framework-independent calculation
  module.
- Normalize amounts to cents before arithmetic.
- Resolve inclusive date-only inputs to timezone-aware UTC start and
  end-exclusive boundaries.
- Build one API report dataset from existing jobs, payouts, adjustments, and
  cancellation metadata.
- Use that exact dataset for the interactive workspace, Excel workbook, and PDF
  document.
- Make legacy date fallbacks and reconciliation difference visible rather than
  silently treating source quality as perfect.
- Quarantine undated payouts and fail closed when bounded source-row limits are
  exceeded; financial reports must never be silently truncated.
- Protect interactive financial reads with `viewJobPayment` or
  `editJobPayment`; keep payout mutations restricted to `editJobPayment`.
- Preserve cent values in payout storage by changing payout and adjustment
  money columns to `Decimal(12,2)`, subject to the normal migration gate.
- Follow the Midday Transactions composition pattern for server prefetch,
  hydration, URL state, boundary schemas, loading, and errors while retaining a
  read-only statement surface. Do not add edit sheets, row actions, selection,
  or bulk mutations until an immutable contractor-ledger workflow exists.

## Consequences

- Jan–Aug and other custom periods have one reviewed accounting formula.
- Summary-first API responses remain bounded; transactions are fetched only for
  exports and printing.
- Invalid calendar dates, reversed periods, and invalid IANA timezones fail at
  the API schema boundary rather than surfacing as report-query failures.
- Signed report tokens use a finance-specific audience minted only after the
  payment-viewer permission check, so the public rendering transport does not
  expose an anonymous, user-selectable finance query.
- Historical report output originally changed with mutable legacy sources.
  The follow-up immutable-ledger ADR implements reversal, close/reopen,
  reconciliation, and persisted report-run controls.
- The Decimal schema change is deployed: the generated migration is applied to
  local development, the reviewed widening conversion is synchronized to
  production, and both post-change schema diffs are empty.

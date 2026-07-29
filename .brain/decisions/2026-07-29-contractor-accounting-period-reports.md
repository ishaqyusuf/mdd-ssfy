# ADR: Contractor accounting period reports

## Status

Accepted for the first accounting-reporting slice.

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

## Consequences

- Jan–Aug and other custom periods have one reviewed accounting formula.
- Summary-first API responses remain bounded; transactions are fetched only for
  exports and printing.
- Signed report tokens use a finance-specific audience minted only after the
  payment-viewer permission check, so the public rendering transport does not
  expose an anonymous, user-selectable finance query.
- Historical report output can still change if an underlying legacy job or
  payout is edited. Immutable ledger entries, period close/reopen controls, and
  persisted report snapshots require a later controls phase.
- The Decimal schema change must not be considered deployed until its migration
  is generated, applied, and verified in the intended database.

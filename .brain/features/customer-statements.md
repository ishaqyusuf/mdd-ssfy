# Customer Statements

## Current behavior

- Customer statements list selected open sales orders and their invoice, paid,
  and pending balances.
- Each statement line includes the sales order P.O. number in the on-screen
  Statement Overview table and both customer-facing outputs: the downloadable
  PDF and the statement email table.
- Missing P.O. values render as `-` so orders without a purchase order remain
  readable and valid statement lines.
- P.O. values use the shared sales-form compatibility reader. Legacy root
  metadata remains authoritative, with nested new-sales-form metadata used as a
  fallback.

## Implementation boundaries

- `apps/api/src/db/queries/customer.ts` supplies P.O. values to emailed statement
  lines.
- `apps/api/src/db/queries/customer-statement-print.ts` supplies P.O. values to
  printable statement lines.
- `apps/dashboard/src/components/tables-2/customer-statement-lines` displays the
  P.O. value in the existing virtualized, horizontally scrollable overview table.
- `packages/notifications` keeps the P.O. field optional for compatibility with
  previously produced notification payloads.
- `packages/email` and `packages/pdf` own their respective P.O. columns.
- No database schema, migration, permission, payment, or balance calculation is
  changed by this feature.

## Validation

- Focused PDF and email renderer regressions assert the `P.O.` heading and a
  representative P.O. value.
- The customer-statement table parity suite asserts the on-screen P.O. column
  while preserving the existing virtualized selection table behavior.
- PDF, email, and notification package typechecks pass.
- API typecheck reaches only the existing inbound-receiving excessive-depth and
  Sentry instrumentation baselines, with no customer-statement diagnostics.
- Dashboard typecheck reaches the repository's existing 4 GB heap-exhaustion
  baseline; focused table coverage and targeted Biome checks pass.

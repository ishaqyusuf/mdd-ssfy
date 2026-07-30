# ADR: Contractor accounting immutable ledger cutover

## Status

Accepted and implemented.

## Context

The first contractor accounting report derived balances directly from mutable
legacy jobs, payouts, adjustments, and cancellation metadata. That was enough
to prove inclusive period reporting, but it could not support durable
corrections, closed periods, reproducible generated artifacts, reconciliation
workflows, schedules, or tax-readiness evidence.

The product also needed the local Sales Orders/Midday interaction standard:
URL-backed search and filters, a virtualized persistent table, sheets for
details and mutations, and report actions that inherit the exact active view.

## Decision

- Make `ContractorLedgerEntry` the reporting authority. Entries are immutable,
  use `Decimal(18,2)`, persist both magnitude and signed liability delta, and
  are idempotent through a unique source key.
- Correct history only by posting one uniquely linked reversal.
- Dual-write eligible job review and payout lifecycle changes into the ledger
  transactionally. Keep legacy calculations only as a reconciliation
  comparator during adoption.
- Backfill legacy sources in deterministic 500-row batches so retries are
  idempotent and PlanetScale/Vitess transaction limits are respected.
- Store period close snapshots and SHA-256 hashes, append-only close/reopen
  events, reconciliation runs/issues, report schedules/runs, and bounded tax
  profiles in dedicated tables.
- Generate all report formats asynchronously from one ledger/filter snapshot.
  Persist run status, totals, artifact URL, and content hash.
- Use the standard Midday/Sales Orders URL search-filter and Tables-2 patterns.
  Hide Report on a clean view; reveal its six-kind dropdown only after a
  meaningful filter is applied. Remove the separate Report period card.
- Keep list identity dense: date and contractor name are one line each, and the
  ledger uses the same 40px compact row height as Sales Orders.
- Enforce viewer, manager, and Super Admin boundaries on the server. Derive
  contractor self-service statement scope from the authenticated user.

## Consequences

- Screen, exports, PDFs, reconciliation, and closed-period snapshots now share
  one immutable accounting authority.
- Job/payout retries and backfill reruns cannot duplicate liability.
- Historical corrections remain auditable and closed periods are reproducible.
- Reconciliation can prove compatibility before legacy reporting code is
  retired.
- Report artifacts can be large and therefore require Trigger jobs and Blob
  storage; clients poll durable report-run state instead of blocking requests.
- Public artifact URLs must be treated as generated accounting outputs and
  governed by report permissions, retention, and recipient discipline.
- Production schema and Jan-Aug ledger parity were verified before declaring
  the cutover complete.

## Verification

- Production contains 16,940 idempotently backfilled ledger rows.
- January 1-August 31 has zero legacy-versus-ledger summary and contractor
  differences.
- Local and production schema diffs are empty after deployment.
- Focused domain/API/job/PDF/dashboard tests, package typechecks, report
  artifact exercises, and authenticated in-app browser QA cover the cutover.


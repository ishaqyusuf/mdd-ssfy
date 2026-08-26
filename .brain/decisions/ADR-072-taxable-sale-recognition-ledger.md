# ADR-072: Sales Tax Uses a Taxable-Sale Recognition Ledger

## Status

Accepted — 2026-08-26.

## Context

The first Sales Tax Report selected fully paid orders by order creation date.
That can omit completed credit sales, defer a sale until cash collection, split
one installment sale across payment months, and include an open order merely
because its header exists. Florida-oriented accrual reporting needs the
completed taxable transaction date instead of cash timing.

Operational order headers are also mutable. Rebuilding prior periods from
current headers would move or rewrite previously recognized taxable sales.

## Decision

- Recognize the full stored sale and tax once an active order is fully
  fulfilled and has actual delivery, pickup, or order-completion evidence.
- Store an immutable, cent-based `SalesTaxLedgerEntry` snapshot with an
  idempotent initial-sale key.
- Use `recognizedAt` in `America/New_York` business-date reports. Never use
  order creation, update, deposit, balance, or payment dates as the tax period.
- Run recognition in the same transaction as fulfillment completion and the
  canonical sales-control rebuild.
- Reconcile history only through a bounded dry run and explicit reviewed ids;
  never guess a missing tax point.
- Keep payments in Accounts Receivable. They do not recognize or duplicate tax.
- Reserve adjustment/reversal entry types, but require a separately approved
  correction workflow before writing them.

## Consequences

- Fully fulfilled credit, installment, partial-payment, unpaid, and zero-tax
  sales are represented once and in full.
- Draft/open orders and records without completion evidence remain outside the
  tax export.
- Historical workbooks are reproducible from recognition snapshots rather than
  mutable order headers, but the workbook is still not a government filing.
- Fulfillment completion now has an additional transactional accounting side
  effect; failures roll back the completion path instead of silently omitting
  tax recognition.

## Validation

Focused domain, query, workbook, transaction, permission, reconciliation, and
responsive browser checks cover recognition evidence, payment independence,
idempotency, UTC boundaries, exact detail columns, and local data availability.

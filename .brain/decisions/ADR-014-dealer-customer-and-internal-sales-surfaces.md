# ADR-014 Dealer Customer and Internal Sales Surfaces

## Status

Accepted — 2026-07-19

## Context

A dealership order represents two related but different financial views:

- the dealer's receivable from its own customer; and
- the dealer's payable to GND based on the internal/dealer price.

Using one balance or one cached PDF for both views caused customer payment state,
dashboard revenue, approval emails, and document totals to overwrite or display
the wrong obligation.

## Decision

- Customer payment status is recorded in the dealer-owned customer ledger and
  its audit history. It does not clear the GND/internal dealer payable.
- Customer-facing print mode uses the dealer's customer price, customer payment
  state, and customer total due.
- Internal print mode uses the GND/dealer price and internal amount due.
- Structured shelf, door, moulding, and service rows are normalized to the
  canonical line total of the selected surface so row sums and document totals
  reconcile.
- Explicit `customer` and `internal` pricing modes are included in versioned
  sales-print document/cache identities. The canonical key builder is shared by
  cache generation and document access.
- Approval checkout/email payment context uses the internal GND obligation;
  dealer dashboard paid revenue and earnings use the customer receivable.

## Consequences

- A customer-paid dealer order can correctly show `$0` customer due while still
  showing a nonzero GND/internal amount due.
- Customer and internal PDFs cannot reuse a stale snapshot from the other
  pricing surface.
- New dealer financial features must state which surface they consume instead
  of inferring it from a generic grand total or amount-due field.
- No Prisma schema change is required because the existing dealer sale/payment
  records already provide the two ledgers; this decision fixes their boundaries
  and presentation.

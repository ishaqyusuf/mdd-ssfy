# ADR-058: Provider-First Square Sales Refund Lifecycle

## Status

Accepted

## Context

The legacy resolution path could commit a successful local negative payment,
balance change, and notification even when Square rejected the refund. It also
stored link or Terminal checkout identifiers where a refundable Square tender
identity was required, split multi-order refunds incorrectly, generated new
idempotency identities on retry, and exposed no durable pending, webhook,
external-refund, or reconciliation lifecycle.

## Decision

Create a canonical `SquareTenderPayment` and immutable `SalesSquareRefund`
aggregate. Resolve and verify the actual Square `Payment.id` server-side;
reserve the cents-based refund intent before network submission; persist and
reuse one idempotency key; store provider state separately from local accounting
state; and permit accounting application only after Square reports
`COMPLETED`.

Apply a completed refund exactly once into the canonical transaction/refund
ledger and per-order compatibility projections using frozen principal, C.C.C.,
and tip allocations. Use signature-verified, deduplicated refund webhooks plus
scheduled provider reads to converge state. External Square refunds remain
`awaiting_allocation` until Finance supplies an exact split. Route all new
Square refund commands through `salesRefunds` and reject Square methods in the
legacy payment-resolution refund path.

The action permission is the dedicated `editRefundSquare` capability. Read-only
Sales/Finance projections retain their existing payment-view boundaries.

## Consequences

- Provider failures can no longer be represented as successful local refunds.
- Pending and ambiguous submissions safely retain capacity and reuse the same
  intent across retries.
- Sales Overview, Sales Activity, Sales Finance, customer communication, and
  documents project one lifecycle and exact multi-order accounting.
- The schema and scheduled reconciliation add operational complexity, including
  `completed + apply_failed` and external/unallocated review states.
- Production enablement remains reversible through `SQUARE_REFUNDS_ENABLED`;
  local development is forced to Square sandbox even if a stale production
  override is present.
- Historical tenders are recovered only when uniquely verifiable; ambiguous
  records remain non-refundable in GND and visible for review.

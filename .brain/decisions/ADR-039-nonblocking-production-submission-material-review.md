# ADR-039: Nonblocking Production Submission With Material Review

## Status

Accepted — 2026-07-30.

## Context

Production workers can complete work while inventory records still show pending
inbound, missing setup, allocation review, or an unavailable projection. Those
records may be stale because receiving was not updated promptly. Blocking the
submission hides real completed work, but treating it as fully complete would
expose unverified quantity to payroll, packing, dispatch, and payment review.

## Decision

Inventory readiness never authorizes production assignment or submission.
Every new production submission is grouped by a server-validated idempotency
key and material evidence snapshot. Review/assignment membership is also
database-unique so concurrent retries cannot create duplicate submissions:

- ready evidence creates an automatically approved review batch;
- unresolved or unavailable evidence saves the submission immediately with a
  pending material review;
- pending quantity counts as reported for assignment progress and duplicate
  prevention, but only approved or legacy no-review quantity is finalized;
- pending quantity is excluded from payroll, packing, dispatch, production
  completion, and completion-dependent payment review.

The admin decision command re-reads the exact submission scope and supports a
non-mutating recheck, confirmed receipt of one or more linked inbound items,
scoped manual fulfillment without physical stock movement, or a mixed
combination. Approval occurs only after fresh evidence is ready. Rejection
soft-deletes the linked submission rows without changing inventory.

Worker identity is derived from the authenticated server session. Approval and
rejection require `editProduction`; inbound receipt additionally requires
`editInboundOrder`, and manual need fulfillment additionally requires
`editOrders`.

## Consequences

- Production planning and reporting continue even when inventory administration
  lags.
- Inventory truth remains owned by canonical receiving and manual-fulfillment
  services.
- Admin review is auditable, retry-safe, and optimistic-concurrency protected.
- Existing active submissions without a review remain finalized for backward
  compatibility.
- ADR-035 remains authoritative for assignment and is superseded here only for
  its former strict submission-gate statement.

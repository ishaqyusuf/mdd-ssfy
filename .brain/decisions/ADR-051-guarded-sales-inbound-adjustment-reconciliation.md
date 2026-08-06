# ADR: Guarded Sales and Inbound Adjustment Reconciliation

## Status

Accepted — 2026-08-06.

## Context

Sales representatives need to correct quantities after inventory allocation,
supplier ordering, receipt, production, or fulfillment has started. Rejecting
all such edits leaves the commercial record wrong, while silently rewriting
operational rows destroys evidence and can return stock that never physically
returned. Inbound cancellation also left sales inventory projections waiting
for a later repair, producing a misleading yellow cancelled state.

## Decision

1. Quantity corrections use preview, explicit acknowledgement, an actor, and a
   durable adjustment snapshot instead of an unconditional form save.
2. Completed production, receipt, stock movement, and fulfillment rows are
   immutable evidence. A corrected sales quantity may be lower than that
   evidence only when the representative explicitly acknowledges the mismatch.
3. Open inbound reductions require either `CANCEL_OPEN_INBOUND` or
   `KEEP_IN_WAREHOUSE`. The former reduces reversible supplier quantity; the
   latter removes the sale commitment while retaining shipment quantity as
   general stock.
4. Reconciliation is demand-scoped and uses the approved commitment snapshot.
   Shared inbound items are changed only by the selected demand's delta.
5. Inventory projection repair is synchronous at cancellation and adjustment
   completion boundaries. An adjustment is not marked applied until projection
   and inbound reconciliation complete. Cancelled and directly removed demands
   retain a release marker so a retry can rediscover the affected sale after the
   shipment link is detached.
6. Direct inbound edits require a reason, preserve received floors, and write
   actor-attributed inbound and Sales activities. The mutation requires the
   existing `editInboundOrder` operational permission. Demand/item and both
   activity streams commit together; repeated targets do not duplicate audit
   records and may retry projection.
7. An approved inbound snapshot is an optimistic-concurrency boundary. Demand,
   shipment link/status, planned quantity, and received quantity drift makes the
   adjustment stale instead of overwriting newer operational work.
8. The sale, wallet/refund records, inbound reconciliation, adjustment marker,
   and resulting IDs commit in one transaction. A later projection or activity
   failure returns the adjustment to `APPROVED`, and retry resumes from that
   marker without repeating commercial writes. Reconciliation and per-inbound
   activities are replay-safe by adjustment ID. The adjustment's durable
   commitment snapshot persists the reconciliation result, so operational retry
   does not depend on mutable sales-form metadata or demand notes. A live
   `APPLYING` retry schedules a delayed recovery at the bounded lease expiry;
   exact `updatedAt` compare-and-swap allows only one worker to take over after
   worker death while a live claim remains protected.

## Consequences

- Commercial corrections no longer need to be blocked because downstream work
  exists.
- Operations retain truthful historical evidence, including over-production or
  fulfillment relative to a later corrected sale.
- Supplier orders can deliberately shrink or become unassigned warehouse stock.
- Projection or reconciliation failure leaves the adjustment retryable instead
  of reporting a successful change with stale Sales-list status. Snapshot drift
  is distinguished as stale and requires a fresh review.
- No database migration is required; disposition and acknowledgement are stored
  in the existing adjustment JSON snapshots.

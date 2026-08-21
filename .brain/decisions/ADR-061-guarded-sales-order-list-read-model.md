# ADR-061: Guarded Sales Order List Read Model

- Status: Accepted for implementation; production activation gated
- Date: 2026-08-21

## Context

The canonical `sales.getOrders` request loads a broad relational graph and then
runs note, inventory, inbound, Special Order, and control enrichment. Production
samples reached 4.92 seconds and 15.09 seconds, and Function Duration is the
largest variable Vercel cost.

## Decision

Keep `SalesOrders` and its related domain tables authoritative. Add one
`SalesOrderListProjection` per order containing indexed scope/sort columns and a
compact JSON copy of the final list-row contract. Trigger.dev builds the row
from canonical database state using only a sales order id and source revision.

The interactive request keeps the existing canonical filter and authorization
query, then reads projected rows in the same order. It falls back to the legacy
query when a projection is absent, stale, on the wrong version, unavailable, or
unsupported. The `paymentReview=needs_review` queue remains on the legacy path
until its latest-payment ordering has dedicated parity evidence.

The rollout modes are `off`, `shadow`, and `read`; `off` is the default. Shadow
mode samples comparisons and logs only row ids and mismatch ids. Read mode uses
keyset pagination for the default created-date sort and retains the numeric
offset inside the opaque cursor so a legacy fallback can continue the same page.
Custom sorts retain current offset behavior.

Projection refresh is idempotent and revision checked before and after the
worker reloads canonical data. Related-table freshness is bounded by a default
five-minute maximum age; expiration falls back to legacy and queues another
refresh. Projection failure never changes authoritative sales behavior.

## Consequences

- The hot path can replace the broad include/enrichment fan-out with canonical
  count/id selection plus one projection read.
- Trigger carries the expensive list-row composition and bounded backfill work;
  no customer/order payload is dispatched through the queue.
- Production activation requires a generated additive migration, Trigger
  SDK alignment plus global enqueue deduplication, Trigger deployment, backfill,
  shadow parity evidence, and a measured cohort rollout.
- The projection duplicates presentation data intentionally and must be
  versioned whenever the list-row contract changes.
- The legacy query remains the rollback path until parity and cost goals hold.

## Rejected alternatives

- Moving the interactive read itself to Trigger: queue latency is unsuitable
  for table navigation.
- Caching the broad query response without revision checks: related writes can
  make it silently stale.
- Sending normalized rows to Trigger: that violates the canonical-reload and
  small-message migration contract.
- Replacing canonical sales tables with the projection: the projection is not
  commercial or workflow authority.

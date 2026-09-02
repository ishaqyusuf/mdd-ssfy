# ADR: Administrative Sales Completion Authority

## Status

Accepted

## Context

The approved Status-only sales completion feature must let an authorized user
declare Production Completion or Fulfillment Completion when the milestone
happened outside GND but its intermediate workflow records are missing.

GND already reserves canonical Fulfilled for accepted delivery proof plus
committed inventory/dispatch completion. `SalesStat` is also a recomputed
`QtyControl` aggregate, not a durable override. Treating either a bare order
status or `SalesStat.percentage = 100` as the declaration would let downstream
domains consume operational facts the system does not possess.

## Decision

Use two explicit axes:

- Canonical operational lifecycle remains owned by existing production,
  delivery-proof, inventory, and dispatch evidence.
- Order-level completion satisfaction may additionally consume an active,
  audited `SalesCompletionRecord`.

Status-only Fulfillment produces `ADMINISTRATIVELY_COMPLETED`, not canonical
Fulfilled. It may satisfy order-level completion queues and completion-action
locks, but it does not mutate or satisfy operational workflow authorities.

`SalesCompletionRecord` is a planned dedicated non-aggregate model with
milestone `PRODUCTION_COMPLETED | FULFILLMENT_COMPLETED`, completion method
`STATUS_ONLY | FULL_WORKFLOW`, active/cancelled history, effective/recorded
dates, and actor attribution. `SalesStat` remains recomputed progress.

The canonical permission resource identifier is
`status_only_sales_completion`. The `StatusOnlySalesCompletion` resource
persists `view status only sales completion` and `edit status only sales
completion`, which normalize to `viewStatusOnlySalesCompletion` and
`editStatusOnlySalesCompletion`.

## Alternatives

- Accept the administrative declaration as alternate proof of canonical
  Fulfilled.
- Store a percentage or status override in `SalesStat`.
- Persist one snake-case permission row and add a special normalization branch.
- Support Status-only Production Completion but prohibit Status-only
  Fulfillment.

## Consequences

- APIs and UI must expose operational truth and completion satisfaction
  separately.
- Status-only Fulfillment must always show explicit administrative provenance.
- Order-level completion queues may close while operational exception queues
  continue to show missing evidence.
- Status-only cancellation never invokes operational reversal logic.
- A new schema and shared resolver are required during implementation.
- No historical completion rows may be inferred broadly from `SalesStat` or
  legacy status strings.

## Implementation Notes

This ADR records planning only. No Prisma schema, permission row, resolver, API,
or UI implementation was changed when it was accepted.

### 2026-09-02 bounded-bulk amendment

Administrative Completion may be declared for a bounded selection of up to 100
Sales Orders in one request. This changes only command orchestration: each order
still uses the existing isolated serializable, idempotent, audited authority and
returns its own outcome. Commands run sequentially because concurrent MySQL
serializable projections acquire overlapping range locks. The batch path must
not invoke dependency preparation,
background Full workflow jobs, or any operational side effect. Full workflow
remains the default UI choice, and cancellation remains single-record and
revision-aware.

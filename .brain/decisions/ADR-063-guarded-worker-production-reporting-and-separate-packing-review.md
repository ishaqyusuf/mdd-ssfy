# ADR-063: Guarded Worker Production Reporting And Separate Packing Review

## Status

Accepted — 2026-08-23. Supersedes ADR-062.

## Context

Production-only workers can physically complete assigned work while inventory
administration still reports awaiting inbound, allocation review, configured
unavailability, missing configuration, or a temporarily unavailable projection.
ADR-062 rejected those submissions for production-only actors when configured
evidence was unresolved or unreadable. That preserved inventory caution but
discarded timely reporting of real work and created a role-specific exception to
ADR-039's durable material-review authority.

Packing has a related operational lag but owns different facts. A packing actor
physically verifies dispatch quantity; production material review must never be
reused to fabricate packed quantity or authorize loading and dispatch.

## Decision

Production-only workers follow ADR-039's nonblocking submission lifecycle. The
server derives worker identity from the authenticated session and accepts only a
positive remaining quantity on that worker's active assignment. Material
evidence is evaluated for the exact submitted item scope:

- ready or fulfilled evidence creates an automatically approved review and
  finalizes the production submission;
- awaiting inbound, allocation review, configured blockers, missing
  configuration, or projection-unavailable evidence creates a durable pending
  material review;
- pending quantity counts as reported for assignment progress and duplicate
  prevention, but remains excluded from finalized production, payroll, packing,
  dispatch, fulfillment, completion, and completion-dependent payment review;
- idempotency is bound to order, worker, and assignment scope. A retry returns
  the existing active review/submission, while a rejected or cancelled review
  requires a new idempotency identity;
- rejection voids the pending submission without changing inventory. Approval
  requires fresh exact-scope evidence and only the canonical inbound receipt,
  manual fulfillment, configuration exception, or production-review authority
  already permitted to the approving actor.

Packing uses a separate pending-report and review boundary. The packing slice
preserves physically verified quantity that stale upstream evidence
prevents from entering the canonical packing command, but it must not write
production submissions or canonical packed quantity while pending. The packing
review must bind the authenticated packing actor, dispatch allocation and item,
exact quantity, evidence revision, and idempotency identity. Pending packing
reports block loading, trip start, dispatch readiness, fulfillment, and
completion. Approval re-reads fresh packing scope and invokes canonical packing
authority; rejection voids only the pending report. Genuine physical shortages
remain Dispatch Exceptions and cannot be represented as packed quantity.

The durable packing allocation identity is the exact `OrderItemDelivery` row,
not a synthetic sale-item match. The report stores its scalar id and stable
derived allocation key, and all report identity relations restrict physical
deletion so audit history survives normal soft cancellation. Assignment-scoped
submit authority is rechecked while the dispatch is locked.

Production and packing may share review-envelope invariants such as actor,
scope, evidence revision, idempotency, decision audit, and lifecycle timestamps,
but retain separate commands, persistence, permissions, and downstream effects.
The packing review remains a separate domain lifecycle but is not presented as
a separate packing section. The ordinary packing-list submit checks canonical
availability, confirms an eligible guarded remainder, and shows pending evidence
and reviewer actions inline on the affected item.

## Consequences

- Production workers can preserve completed-work evidence without inventing
  inventory truth.
- Worker, administrator, and supervisor submissions share one material-review
  authority while assignment ownership and elevated submit-for-others
  permission remain server-enforced.
- Pending work is retry-safe and visible without becoming payroll or
  fulfillment truth.
- Packers use one packing list and one submit affordance. A guarded remainder
  requires an explicit confirmation, while a genuine shortage remains a
  Dispatch Exception rather than becoming another visible packing workflow.
- Ticket 06 introduces packing-specific persistence and protected authority; it
  does not generalize production reviews into a cross-domain override. Pending
  reports are readiness/loading/trip/completion holds. Approval requires the
  full evidence revision and upstream pending state to remain unchanged inside
  the decision transaction.
- ADR-035 remains authoritative for assignment timing, ADR-039 remains
  authoritative for production material review, and ADR-048 remains the
  explicit permission-checked fulfillment-resolution path.

## Supersession

This ADR fully supersedes ADR-062's production-only material submission gate.
ADR-062 remains as historical evidence of the former role-specific rejection
policy.

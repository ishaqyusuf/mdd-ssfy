# ADR-084: Canonical Sales Pipeline Lifecycle Authority

- Status: Accepted
- Date: 2026-09-02

## Context

Sales lifecycle meaning had been reconstructed independently from order status
strings, `SalesStat`, quantity controls, assignment rows, completion records,
packing, and Dispatch state. Lists, counts, Calendar, Sales Overview, workers,
drivers, customer channels, and background consumers could therefore disagree
for the same order. The synchronized local dataset exposed this directly: the
Production Calendar showed scheduled work while Due Today and Past Due reported
none, and the Completed workspace admitted orders rendered as In Production.

## Decision

`@gnd/sales` owns one versioned, evidence-derived Sales Pipeline Snapshot plus
shared exact membership/filter predicates, audience projections, capability
decisions, command evaluation, rollout controls, and reconciliation
classification.

Payment, inventory, Production, packing, and Dispatch systems retain ownership
of their operational facts. The Sales Pipeline composes those facts and
orchestrates cross-domain status decisions; it does not duplicate or rewrite
them. Operational evidence outranks compatibility strings/aggregates.
Administrative Completion remains separately labelled provenance.

Production and Fulfillment use explicit applicability. `not_required` excludes
the stage, while unknown or contradictory evidence fails closed into review.
Canonical membership is evaluated at the final list/count/Calendar/filter seam
so pagination, saved tabs, analytics, and visible rows cannot use different
definitions.

Production defaults to shadow reads and commands. Canonical production serving
requires zero unexplained membership differences, zero unsafe transition
differences, acceptable measured latency, completed conflict sampling, operator
approval, and a bounded cohort. Rollback switches modes without reversing valid
domain facts. Compatibility adapters remain until those retirement gates pass.

Exact Production item material status is part of the same sales-package
authority but remains a separate dimension from order lifecycle. Its logical
identity includes the exact selected inventory variant (including normalized
door dimension), not only the parent Sales item. This prevents sibling sizes
from sharing inbound, allocation, or readiness evidence. Review actionability
and reconciliation are package-owned and revision-safe; historical reviews are
retained even when removed from active membership.

## Consequences

- Every consumer receives consistent lifecycle meaning and a common evidence
  revision.
- Non-production and zero-item Dispatch records no longer pollute operational
  workspaces.
- Partial, stale, and conflicting data is visible and reviewable rather than
  silently coerced.
- Historical repair is limited to derived projection cache state; operational
  facts require separate reviewed domain workflows.
- Canonical completed-membership resolution is more expensive than a legacy
  aggregate predicate and must satisfy the latency gate before broad production
  rollout.
- Legacy projections and adapters cannot be removed merely because local
  validation passes; production shadow/cohort evidence is the retirement gate.
- Derived list projections carry indexed lifecycle dimensions solely to make
  canonical list/filter queries efficient. They do not become operational
  truth and may be rebuilt or restored without rewriting domain facts.

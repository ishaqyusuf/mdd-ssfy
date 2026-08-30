# ADR-077: Quarantine Ambiguous Historical Sales Handoff Lifecycles

## Status

Accepted — 2026-08-30

## Context

Sales Handoff intentionally fails closed when canonical payment or inventory
evidence is unavailable. Legacy orders created before 2026 can also have a blank
or null lifecycle status. Treating those records as active during backlog repair
would create or escalate operational actions without reviewed lifecycle evidence;
treating them as terminal would invent the opposite fact.

## Decision

Before exact reconciliation of a non-terminal pre-2026 order with blank/null
status, create an open `sales_handoff_lifecycle_review` `ResolutionCase` containing
the canonical source snapshot. While it is open:

- protected reads omit the order;
- recurring reconciliation records a lifecycle-review skip instead of success or
  failure;
- exact reconciliation preserves every existing epoch and performs no new action
  transition; and
- escalation leaves existing epochs and clocks unchanged.

Release is explicit and audited in `ResolutionAction`. It requires either an
active-order approval with a reason or a corrected canonical lifecycle status.
An atomic compare-and-set moves the review to `releasing`, which remains a
quarantine state for every ordinary reader and worker. Only the release path may
bypass it for exact reconciliation; success resolves the review and completes
the audit, while failure reopens the review and fails the audit. Current-year
blank/null orders retain existing active semantics.

## Consequences

- Historical ambiguity is visible and reviewable without fabricating lifecycle
  facts.
- Existing action evidence is preserved but cannot change or escalate while the
  review remains open.
- Operations must review the lifecycle queue separately from deterministic
  inventory-mapping failures.
- No schema or public API change is required because the existing resolution
  tables provide durable cases and audit actions.

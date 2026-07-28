# ADR-030: Revision-Bound Production Readiness Override

## Status

Superseded — 2026-07-28 by ADR-035.

## Context

Inventory readiness correctly blocks production assignment, but an authorized
admin may physically verify that required materials are available before
canonical inbound, stock, or allocation records are reconciled. Treating that
affirmation as an inventory mutation would falsify inventory-owned records.
A reusable boolean would also be unsafe after the underlying evidence changes.

## Decision

Persist one audited production-readiness override per Sales order. The active
override stores a deterministic SHA-256 revision and snapshot of the complete
order-wide production inventory evidence.

Assignment evaluates its selected line blockers but matches authorization
against the complete order-wide revision. This preserves selection-scoped gate
feedback while ensuring that a change anywhere in the confirmed order
invalidates the override.

The override:

- is available only for configured, active orders;
- requires authenticated `editProduction` authority and an explicit physical
  availability affirmation;
- does not alter inbound demand, allocation, receipt, or stock records;
- applies only to `createAssignments`, not production completion;
- is revalidated at task execution;
- records confirm, successful use, and revoke evidence in Sales History.

## Consequences

- Operators can proceed without corrupting inventory truth.
- Stale confirmations fail closed and require a new review.
- One additional order-level table and a second full-order readiness read are
  required when a selected-line assignment uses an active override.
- Inventory remains visibly unresolved until its canonical workflows reconcile
  the physical state.

## Supersession

ADR-035 removes inventory readiness as an authorization condition for
`createAssignments`. The persisted override and its audit history remain
available for compatibility, but assignment no longer reads or requires them.

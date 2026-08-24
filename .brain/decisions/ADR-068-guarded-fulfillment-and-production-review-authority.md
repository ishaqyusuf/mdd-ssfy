# ADR: Guarded Fulfillment and Production Review Authority

## Status

Accepted.

## Context

Physical packing and production completion can be confirmed before legacy
production or material evidence is finalized. Blocking those actions prevents
operations from recording real work, but treating pending evidence as final
would incorrectly unlock dispatch or payroll.

## Decision

- Drivers and warehouse users may submit exact guarded packing quantities while
  production or material evidence is pending. Reports remain outside canonical
  packed readiness until an authorized reviewer approves them.
- Production workers may submit completed assignments while material evidence
  is pending. Missing material configuration is approved only through
  `APPROVE_CONFIGURATION_EXCEPTION` after physical availability is confirmed.
  The decision is auditable and does not fabricate or move inventory.
- Review requests go directly to the order sales rep's in-app inbox. Approval
  or rejection goes directly to the submitting worker. These are mandatory
  operational notification-center channels.
- Pending-review assignment ownership and revision are snapshotted after the
  submission's own derived-sales reset. Later assignment changes still cancel
  the review as stale; internal recalculation does not.
- Fully packed legacy lines with no component ledger may satisfy departure
  readiness. Component-ledger lines retain the canonical inventory gate.

## Consequences

- Physical work is recorded immediately without prematurely becoming final
  operational truth.
- Approval is explicit, recipient-scoped, auditable, and safe for missing
  configuration.
- Stale reassignment protection remains strict without canceling fresh
  submissions.
- Legacy dispatches can progress after complete packing without weakening
  inventory-backed dispatches.

## Related Records

- `.brain/features/driver-platform-revival.md`
- `.brain/features/sales-production-workspace.md`
- `.brain/plans/2026-08-23-feature-driver-dashboard-command-center.md`

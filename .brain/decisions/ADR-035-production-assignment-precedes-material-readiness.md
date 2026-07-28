# ADR-035: Production Assignment Precedes Material Readiness

## Status

Accepted — 2026-07-28.

## Context

Sales can commit an order before required materials arrive. Waiting for stock,
allocation, or inbound receipt before assigning the work prevents production
from planning its queue and seeing when materials are expected.

Inventory records must remain truthful, but unresolved inventory is operational
information rather than authorization for production assignment.

## Decision

`createAssignments` never enforces the production inventory readiness gate.
Orders may be assigned while materials are unavailable, awaiting allocation, or
linked to an inbound shipment.

Inventory readiness remains visible:

- the Sales Overview Production tab shows pending component and open inbound
  evidence as an informational notice;
- the worker/admin production order detail shows required material state and
  the linked inbound shipment expected date when available;
- assignment does not receive, allocate, cancel, or otherwise rewrite inventory
  records.

`submitAll` continues to enforce readiness so production completion cannot claim
work against unresolved required materials.

The revision-bound override from ADR-030 is no longer consulted by assignment.
Its persisted data and API remain for compatibility and historical audit
evidence.

## Consequences

- Sales can assign work immediately and production can plan ahead.
- Inbound and shortage information remains visible to the assigned team.
- Inventory truth stays owned by inventory workflows.
- Existing override records are harmless historical evidence and do not grant
  or deny assignment.

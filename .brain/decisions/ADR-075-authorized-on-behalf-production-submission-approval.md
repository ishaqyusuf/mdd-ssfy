# ADR-075: Authorized On-Behalf Production Submission Approval

## Status

Accepted — 2026-08-29.

## Context

ADR-039 saves worker-reported production against unresolved material evidence
as pending review. That is correct when the worker reports their own output,
but it creates a redundant approval step when an accountable operator is
already submitting the work on the assignee's behalf. The order's assigned
sales representative is responsible for overseeing that order, while admins
and employees with `editProduction` already hold production-wide authority.

The submission UI also displayed material-verification warnings even though
the workflow was deliberately nonblocking. Those warnings consumed space and
repeated information available in the material and review states.

## Decision

- Submission surfaces do not render material-verification warning alerts or a
  special pending-review success message. A successful save reports simply
  `Submitted`.
- A worker submitting their own assignment keeps ADR-039 behavior: unresolved
  material evidence creates a pending review and remains excluded from
  finalized production effects until approved.
- A submission for another assignment owner is immediately approved only when
  the authenticated actor is an admin, has `editProduction`, or is the sales
  representative assigned to that exact order.
- The order-sales-representative exception is resolved from the database using
  the authenticated user id and sales order id. It is not inferred from a
  caller-supplied role, order, or approval flag and grants no authority over
  another representative's order.
- Immediate approval still creates the canonical material-review record and
  snapshot. It preserves the material classification, records the submitting
  actor as `reviewedById`, and writes the
  `AUTHORIZED_OPERATOR_APPROVED_ON_SUBMISSION` resolution before finalized
  payroll and production effects run.
- A production editor submitting their own assignment does not receive the
  exception; “on behalf” requires the authenticated submitter and assignment
  owner to differ.
- This is an authority rule, not an organization setting. Guarded-packing
  settings remain downstream controls for packing eligibility, delivery
  blocking, notification, and evidence creation.

## Consequences

- Workers can report completed work without an intrusive warning and without
  losing the material-review safety boundary.
- The accountable order sales representative can record supervised work in one
  action without approving their own submission in a second screen.
- Approved exceptions remain discoverable and auditable even when material
  evidence was unresolved at submission time.
- No database schema or API response contract changes are required.

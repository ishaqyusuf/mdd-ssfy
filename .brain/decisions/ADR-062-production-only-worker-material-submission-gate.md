# ADR-062: Production-Only Worker Material Submission Gate

- Status: Superseded by ADR-063 on 2026-08-23
- Date: 2026-08-21

## Context

ADR-039 intentionally keeps production submissions nonblocking when inventory
administration is incomplete, preserving completed work in an auditable material
review queue. The production-worker experience has a narrower operational need:
a worker must not report work complete when configured material evidence says
the required material is unavailable. Missing configuration alone is not proof
that material is unavailable and must not become a new worker-facing setup task.

## Decision

Production assignment remains independent of inventory readiness under ADR-035.
Admin and supervisor submissions retain ADR-039's nonblocking material-review
flow. For an authenticated production-only actor (`viewProduction` without
`viewOrders`), the shared submission authority re-evaluates material evidence
for the exact submitted item scope and rejects the write when evidence is:

- awaiting inbound;
- awaiting allocation review;
- otherwise blocked by configured material requirements; or
- temporarily unavailable to the server.

`NOT_CONFIGURED` remains nonblocking because absence of inventory setup does not
establish physical unavailability. The worker UI therefore hides the admin
`Inventory setup incomplete` notice. It shows a blocking material alert only
for affected assigned items or when availability cannot be verified, but this
presentation is not the authorization boundary.

## Consequences

- Workers cannot bypass the material gate with a stale or modified client.
- Admins can still record completed work into the existing material-review
  process while resolving inventory administration.
- Worker assignment progress, scope, and material eligibility remain derived
  from the authenticated server session and exact assignment/item records.
- This ADR supersedes ADR-039 only for submission authorization by
  production-only actors; ADR-039 remains authoritative for admin/supervisor
  submission review and downstream finalization.

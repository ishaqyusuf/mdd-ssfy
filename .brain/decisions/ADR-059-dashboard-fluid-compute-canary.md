# ADR-059: Dashboard Fluid Compute Canary

## Status

Accepted for preview canary; production promotion pending

## Date

2026-08-21

## Context

Dashboard Function Duration is the dominant variable Vercel cost. The cycle
opened at a burn rate materially above the $15 infrastructure operating budget.
Changing Fluid Compute, memory, region, and query behavior together would make
cost and reliability effects impossible to attribute.

## Decision

- Version `fluid: true` in `apps/dashboard/vercel.json` so the runtime setting
  is reviewable and reproducible.
- Evaluate it first in an isolated preview without changing memory, region, or
  application query behavior.
- Preserve the existing 1 GB function override and `iad1` region during this
  experiment.
- Require 12-24 hours of Function Duration, memory, cold-start, timeout,
  Prisma-connection, and cost comparison before explicit production promotion.
- Treat removal of `fluid` followed by redeployment as the rollback.

## Evidence

Preview deployment `dpl_4Zfyx9YpMSUhLEudTMZV9sqqErje` reached `READY`, and
Vercel inspection reported `fluid: true` while functions remained 1024 MB in
`iad1`. The new database-free liveness endpoint returned `204` with no-store.

## Consequences

- Fluid Compute is reproducible but does not reach production implicitly.
- The next production deployment containing this configuration will enable
  Fluid Compute. Do not promote or push that deployment until the evidence gate
  is reviewed; the source change itself is the explicit promotion boundary.
- Canary evidence remains attributable to the runtime model because memory and
  region stay fixed.
- Production deployments from this configuration will enable Fluid Compute;
  promotion therefore requires an explicit decision after the measurement
  gate.

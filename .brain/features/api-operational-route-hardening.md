# API Operational Route Hardening

## Current State

Dispatch, inventory configuration, contractor job, community, and shared
settings mutations are authenticated and permission-shaped at the tRPC route
boundary. The detailed matrix and implementation evidence live in
`.brain/plans/2026-07-23-api-public-route-hardening.md`; the durable rule is
recorded in ADR-025.

Key behavior:

- assigned drivers can start, complete, and sign only their own dispatch unless
  they also hold dispatch-manager authority;
- inventory configuration writes are Super Admin-only;
- contractors retain own-job submission, including globally enabled custom
  jobs, while assignment/review/payment operations use separate permissions;
- community writes are split across template, builder, unit, cost, invoice,
  job, and production scopes;
- shared job settings require authentication to read and Super Admin to change.

UI capability checks do not replace these server boundaries.

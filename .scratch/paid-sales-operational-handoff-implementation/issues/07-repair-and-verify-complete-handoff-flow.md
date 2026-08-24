# 07 — Repair and Verify the Complete Handoff Flow

**What to build:** Make the completed Paid Sales Operational Handoff resilient to missed mutation events and prove the whole workflow—from payment qualification through Material and Production resolution, escalation, guarded production reporting, and guarded packing review—works under real authorization and performance boundaries.

**Blocked by:** 04 — Escalate Overdue Actions to Super Admins; 06 — Add Guarded Packing Reports.

**Status:** completed

- [x] A bounded recurring reconciliation repairs missed Sales Handoff Action opens, resolutions, representative transfers, policy revisions, and genuine reopenings idempotently.
- [x] Reconciliation operates in bounded batches using the action-state, representative, opening-time, escalation, and evidence-revision indexes and does not load the full Sales Orders working set.
- [x] Relevant payment, refund, settings, demand, inbound, assignment, order revision, cancellation, production review, and packing review mutations reconcile affected action truth promptly, with the recurring process serving as repair rather than primary correctness.
- [x] A Sales Settings policy change re-evaluates active orders without retroactive escalation floods, and unavailable source projections fail visibly rather than silently reporting an empty queue.
  - Evidence: a failed policy-pass order durably retains its policy milestone,
    revision, and change time for retry; the global fan-out cannot close if that
    durable handoff fails. Every successfully committed revision also creates
    the timestamped full-fan-out marker before its bounded immediate pass, so
    orders beyond that cohort receive the original policy milestone.
- [x] Authenticated representative acceptance covers both action types, canonical deep links, successful resolution, live pill removal, retry behavior, narrow layout, keyboard navigation, focus restoration, and no unexpected console errors.
- [x] Authenticated representative acceptance covers six-at-a-time `+N more` disclosure and the permanent `Needs Action` tab's unique-order count, scoped table rows, pagination, keyboard navigation, and live invalidation.
- [x] Authenticated Super-Admin acceptance covers multiple representatives, oldest-first ordering, overflow grouping, one-business-day escalation, acknowledgement, resolution cancellation, and protected navigation.
- [x] Authenticated operational acceptance proves production-only pending review, downstream exclusion, canonical administrative approval, packing pending reporting, and the dispatch hold until canonical packing approval.
- [x] Sales Orders list performance remains isolated from action evaluation through a dedicated bounded read and independently loadable alert state.
- [x] Focused package, API, Dashboard, notification, permission, migration, and browser checks pass before broad typecheck and the narrowest relevant production builds and regression suites.
- [x] Database schema, relationships, and migration documentation describe durable action epochs and packing pending reports without replacing payment, inventory, production, packing, or Sales Order truth.
- [x] API contracts and permission documentation describe settings, action reads, reconciliation, escalation, production review, and packing review boundaries.
- [x] Feature, ADR, task, roadmap, and progress records are reconciled with the shipped behavior; the implementation effort is marked complete only after all preceding acceptance evidence is recorded.

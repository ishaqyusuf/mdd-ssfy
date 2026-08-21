# 06 — Handle Physical Shortages And Partial-Dispatch Back Orders

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Extend the durable Dispatch Exception workflow so a driver
can record an item/allocation-specific physical shortage while packing. The
administrator sees the correct exception, the current dispatch may be reduced
or rescheduled, and remaining commercial demand becomes a Back order only
after a partial dispatch is committed.

**Blocked by:** 03 — Open Orders In The Sales Overview Dispatch Workspace; 05 — Let Assigned Drivers Verify And Pack Their Loads.

**Status:** ready-for-agent

- [ ] A shortage request records dispatch, item/allocation, quantities, reason, evidence, revision, reporter, and idempotent request identity.
- [ ] Duplicate weak-network submissions return the same durable request and do not duplicate packing effects.
- [ ] Before dispatch commitment the order shows Packing blocked or Missing items, never Back order.
- [ ] An administrator can preserve remaining demand through a guarded partial-dispatch, back-order, or reschedule outcome.
- [ ] Committing a partial dispatch does not rewrite the commercial Sales Order or manufacture production/inventory evidence.
- [ ] The order projection and Dispatch tab show the correct Back order, remaining quantity, activity, and next action afterward.
- [ ] Physical shortage cannot be overridden into readiness, and stale or changed revisions require a new validation.
- [ ] Schema compatibility, domain, API, admin/driver UI, retry, and multiple-dispatch tests pass.


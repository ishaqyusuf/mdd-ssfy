# 05 — Let Assigned Drivers Verify And Pack Their Loads

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Let the assigned driver open one dispatch, review customer-
meaningful load items, enter physically packed quantities, and finalize packing
through the accepted Packing List and dispatch-bound inventory commands. The
driver sees simple rows while the server preserves exact allocation ownership.

**Blocked by:** 04 — Build The Responsive Assigned-Driver Work Queue.

**Status:** ready-for-agent

- [ ] Each row shows ordered, previously delivered, allocated now, packed now, short, and remaining quantities.
- [ ] Every presented row maps exactly to current-dispatch allocation or explicit legacy execution evidence.
- [ ] Only the assigned driver or an authorized warehouse/manager actor may verify and finalize the load.
- [ ] Zero packed requires a blocker reason; ordinary positive and partial quantities respect available and allocated limits.
- [ ] Inventory-only, legacy-only, and mixed dispatch packing reuse the existing guarded orchestration and remain retry-safe.
- [ ] Stale revisions and cross-dispatch allocation references fail without partial durable changes.
- [ ] Reassignment after packing begins requires audited handoff and quantity revalidation before continuation.
- [ ] Packing, permission, quantity, idempotency, responsive UI, and browser acceptance coverage pass.


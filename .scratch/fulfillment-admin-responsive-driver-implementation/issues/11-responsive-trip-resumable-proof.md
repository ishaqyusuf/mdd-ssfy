# 11 — Complete Responsive Trips With Resumable Proof

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Let an assigned driver move a ready dispatch through Start
trip, arrival, proof capture, and server-confirmed completion from the responsive
website. The browser reuses the existing resumable proof authority and preserves
the distinction between one dispatch being Delivered and the order being
Fulfilled.

**Blocked by:** 05 — Let Assigned Drivers Verify And Pack Their Loads.

**Status:** ready-for-agent

- [ ] Start trip is server-gated by current assignment, manifest revision, packing readiness, and current-dispatch inventory readiness.
- [ ] Active delivery supports destination details, external navigation, arrival, delivered and failed-delivery outcomes.
- [ ] Proof captures recipient, completion type, signature, bounded photos, notes, failure reason, and optional purpose-limited arrival evidence.
- [ ] The browser retains one request identity and a user/dispatch-scoped recoverable draft until server success, logout, reassignment, or expiry.
- [ ] Same-content retries resume or replay safely; changed proof under the same request conflicts; the form remains mounted after failure.
- [ ] Finalization consumes only picked allocations bound to the dispatch and does not duplicate documents, activity, payment review, or inventory effects.
- [ ] The UI reports dispatch Delivered separately from aggregate order Fulfilled or Back order.
- [ ] Permission, proof limits, weak-network, refresh/relaunch, retry, inventory, responsive-browser, and real-device coverage pass.


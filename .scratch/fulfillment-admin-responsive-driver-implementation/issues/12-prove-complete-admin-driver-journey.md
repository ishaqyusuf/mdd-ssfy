# 12 — Prove The Complete Admin-To-Driver Fulfillment Journey

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Exercise one reversible local order through the real admin
and responsive-driver interfaces and prove that lifecycle, assignment,
quantities, assistance, notifications, proof, inventory, and aggregate
fulfillment agree from beginning to end.

**Blocked by:** 03 — Open Orders In The Sales Overview Dispatch Workspace; 10 — Notify Admins And Drivers Without Duplicate Alerts; 11 — Complete Responsive Trips With Resumable Proof.

**Status:** ready-for-agent

- [ ] The fixture records server snapshots before assignment, after allocation, after packing, after blocker resolution, after trip start, after proof, and after retry.
- [ ] A successful path reaches Fulfilled once with matching dispatch, proof, shipment, allocation, inventory, activity, and order projections.
- [ ] A partial path reaches Delivered plus Back order/remaining demand without changing commercial order quantity.
- [ ] Production, inventory/inbound, Special Order, stale-revision, denied, expired, and physical-shortage assistance paths behave as specified.
- [ ] Same-request and duplicate-action retries create no duplicate email, exception, document, note, payment review, dispatch, or inventory effect.
- [ ] Cancellation releases approved/reserved stock and requires explicit physical return before releasing picked stock.
- [ ] Authenticated desktop, phone, tablet, weak-network, accessibility, and reconciliation evidence is captured and failures are classified.
- [ ] Focused suites, relevant typechecks, schema validation, formatting/lint, diff hygiene, and documented baseline exceptions complete.


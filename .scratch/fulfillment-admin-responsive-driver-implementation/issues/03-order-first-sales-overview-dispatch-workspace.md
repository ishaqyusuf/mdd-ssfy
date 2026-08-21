# 03 — Open Orders In The Sales Overview Dispatch Workspace

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Make a Fulfillment order open Sales Overview on an order-
first Dispatch tab. The administrator can understand aggregate quantities,
review every dispatch, create only eligible remaining work, inspect one
dispatch, and deliberately enter Packing without making Packing the row-click
destination.

**Blocked by:** 02 — Move Fulfillment To An Order-Grain Lifecycle List.

**Status:** ready-for-agent

- [ ] Clicking a Fulfillment row opens the order's Dispatch tab without preselecting Packing or an arbitrary dispatch.
- [ ] The tab shows ordered, allocated, packed, delivered, and remaining quantities that reconcile across dispatches.
- [ ] Created dispatches appear chronologically with driver, schedule, dispatch stage, quantities, and exceptions.
- [ ] Create dispatch appears only when eligible unallocated demand remains and conflicting active allocation is rejected server-side.
- [ ] Dispatch selection opens Overview, Items & Packing, Route, Proof, and Activity detail with permissioned contextual actions.
- [ ] Open packing workspace is explicit, and unrestricted trip/order status rewriting is absent.
- [ ] URL restoration, nested back/close behavior, permissions, invalidation, and authenticated browser interaction are covered.


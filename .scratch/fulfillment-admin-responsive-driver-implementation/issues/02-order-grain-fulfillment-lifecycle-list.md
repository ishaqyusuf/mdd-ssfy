# 02 — Move Fulfillment To An Order-Grain Lifecycle List

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Replace dispatch-grain Fulfillment rows with one complete
Sales Order fulfillment projection and render it through the existing compact
Fulfillment shell. Administrators receive the canonical Sales Orders lifecycle,
aggregate assignment, exception overlays, and truthful operational summaries
without a competing Progress column.

**Blocked by:** 01 — Prototype The Connected Admin And Driver Workflow.

**Status:** ready-for-agent

- [ ] Fulfillment returns and renders one row per eligible Sales Order even when the order has several dispatches.
- [ ] Status uses the canonical order lifecycle and a completed partial dispatch cannot mark an order Fulfilled while demand remains.
- [ ] Assigned To shows one driver when unambiguous and a truthful aggregate when several active dispatches or drivers exist.
- [ ] The default table is Date, Order, Ship To, Assigned To, Status, Exceptions, and Actions; Progress is removed.
- [ ] Needs assignment and Assigned summaries count their stated cohorts, and exception badges do not replace lifecycle status.
- [ ] Pending, All, Completed, filtering, compact density, and Calendar isolation retain their accepted behavior.
- [ ] Focused projection, table, multiple-dispatch, compatibility-status, and authenticated browser tests pass.


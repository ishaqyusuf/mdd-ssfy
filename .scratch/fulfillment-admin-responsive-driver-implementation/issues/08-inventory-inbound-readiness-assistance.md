# 08 — Resolve Inventory And Inbound Assistance Requests

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Let a driver request help for open inbound work or missing
inventory configuration. Authorized administrators resolve the underlying
receiving, reconciliation, or configuration problem through existing commands,
and the driver resumes only when dispatch-bound availability is real.

**Blocked by:** 06 — Handle Physical Shortages And Partial-Dispatch Back Orders.

**Status:** ready-for-agent

- [ ] Open-inbound and missing-configuration blockers create durable, revision-bound, idempotent assistance requests with allocation context.
- [ ] Recipient and action eligibility use the responsible inbound or inventory capability rather than a blanket dispatch permission.
- [ ] Admin review delegates to canonical receive, reconcile, manual-fulfillment, or inventory-configuration commands.
- [ ] Neither exception resolution nor an admin UI action can fabricate SKU identity, stock, allocation, reservation, or picked state.
- [ ] Denial, expiry, stale revision, changed assignment, and insufficient authority remain blocked and audited.
- [ ] Ready to resume appears only after current-dispatch inventory readiness passes on the server.
- [ ] Inventory, inbound, allocation, permission, retry, admin/driver UI, and reconciliation tests pass.


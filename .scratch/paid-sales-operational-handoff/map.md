# Wayfinder: Paid Sales Operational Handoff

## Local Scratch Tracker

This map and its child decision tickets use the repository's local Markdown
tracker. It charts product and domain decisions only; it does not authorize
implementation.

## Destination

Publish a decision-complete specification for a configurable Sales handoff
policy that surfaces payment-qualified orders missing material purchasing or
production assignment, routes each action to its existing operational surface,
and records genuine production or packing work without falsifying inventory or
prematurely advancing downstream workflows.

## Notes

- The source discussion is the 2026-08-21 WhatsApp exchange with Pablo Cruz,
  beginning with `For productio`, plus the two following voice notes.
- The client problem is paid orders being operationally stranded because a
  sales representative forgets either to record the supplier order/inbound or
  to assign production.
- Sales Settings owns one global, Super-Admin-managed Sales Handoff Trigger with
  `Fully paid`, `Any payment received`, and `Payment percentage reached`
  options. `Fully paid` is the default.
- `/sales-book/orders` renders a shadcn alert immediately before the table with
  title `Paid sales need action` and clickable pills such as
  `#ORDERID — Material` and `#ORDERID — Production`.
- A sales representative sees only Sales Handoff Actions for their own orders.
  A Super Admin sees all unresolved actions and can identify the responsible
  sales representative.
- A Material Handoff Action means supplier-order/inbound coverage is missing;
  it does not remain open merely because a valid inbound has not arrived.
- A Production Handoff Action means production-capable quantity lacks an active
  owned assignment. Material readiness is independent from assignment.
- Material pills open Sales Overview Inventory Needs with Create inbound
  expanded. Production pills open the affected Production assignment surface.
  The alert remains until server truth resolves every action and refreshes
  immediately after relevant writes.
- The system must not fabricate an inbound. Pablo confirmed that the supplier
  must be contacted and the external order placed before an inbound represents
  that commitment.
- Customer-facing order entry remains available. The feature surfaces required
  work instead of blocking a representative from creating another order.
- Production and packing may record physically observed work through a pending
  review, but pending quantity must not trigger payroll, packing, dispatch,
  fulfillment, or other finalization until canonical evidence is resolved.
- Approval rechecks current evidence and invokes canonical inventory,
  production-review, or packing authority. It is never a naked availability
  status flip.
- The order's sales representative is the primary owner. Super Admin receives
  an in-app escalation after one business day; email is excluded initially.
- Existing boundaries to reconcile include ADR-035, ADR-039, ADR-048, and
  ADR-062. In particular, ADR-062 currently blocks production-only worker
  submission when configured material is unavailable, and packing currently
  rejects quantity awaiting material review.
- Consult `CONTEXT.md`, `.brain/features/order-inbound-status.md`,
  `.brain/features/sales-production-workspace.md`,
  `.brain/features/sales-overview.md`, and the listed ADRs while resolving the
  map.

## Decisions so far

<!-- Empty until a child decision ticket is resolved. -->

## Not yet specified

- Automatic production assignment rules. These require observed assignment
  patterns across product, department, location, capacity, and due date before
  the question is sharp enough to ticket.
- Whether email or push escalation is needed after in-app adoption and response
  evidence exists.
- Whether future product, location, customer, or Sales Profile policies need
  different handoff triggers from the global default.
- Operational analytics and SLA reporting beyond the accepted one-business-day
  in-app escalation.

## Out of scope

- Implementing the feature while charting this map.
- Automatically creating inbounds before a real supplier order exists.
- Calling suppliers, placing purchase orders, or replacing the external
  procurement decision.
- Preventing sales representatives from creating new customer orders.
- Treating an alert, approval, or client action as permission to fabricate
  stock, production, packing, payroll, dispatch, or fulfillment evidence.
- Unrelated payment-date visibility, Sales table redesign, general notification
  redesign, and broad production-assignment optimization.

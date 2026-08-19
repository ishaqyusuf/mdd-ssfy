# Wayfinder: Dispatch Admin And Responsive Driver Workflow

## Local Scratch Tracker

This map and its child decision tickets use the repository's local Markdown
tracker. It charts product and domain decisions only; it does not authorize the
redesign implementation.

## Destination

Publish a decision-complete specification for one office-admin and responsive
driver-web workflow from order assignment through warehouse quantity
verification, exception approval, trip execution, delivery proof, and final
fulfillment. The specification must preserve inventory, production, permission,
and retry safety while defining how the responsive website relates to the
existing Expo driver app and Packing List.

## Notes

- Office admins oversee order demand, drivers, assignment, outgoing work,
  lifecycle status, operational activity, and approval requests.
- A driver sees only assigned work. At the warehouse, the driver opens an
  assigned order, reviews its doors/items and requested quantities, verifies
  the physically available quantity, records shortages, and completes packing.
- A physically unavailable quantity may reduce what ships on the current
  dispatch. It must not silently rewrite the commercial Sales Order or
  manufacture inventory/production evidence.
- If completed physical work is blocked by missing or stale production/inbound
  administration, the driver can request permission. Admins receive an in-app
  notification and email, then approve or deny from a protected review flow.
- Approval must resolve or explicitly override only approved blocker classes.
  It must remain attributable, revision-aware, permission-checked, and must not
  become a generic "skip every safeguard" command.
- After successful packing, the assigned driver can begin the trip, open an
  ongoing delivery, capture the recipient signature and required proof, and
  complete delivery. Fulfillment remains the server-confirmed result of valid
  proof and canonical inventory/dispatch completion.
- The requested driver experience is a phone-first responsive website with
  functional parity for the critical mobile journey.
- `OrderDelivery` remains the canonical trip header during this effort.
- Existing dispatch-bound inventory allocation, durable exceptions, resumable
  proof completion, and guarded cancellation/physical-return rules remain the
  safety baseline.
- The current accepted architecture makes Expo the canonical driver surface,
  `/sales-book/dispatch-task` a limited web fallback, and Packing List the
  packing execution authority. The new request may supersede presentation and
  cutover decisions, but not silently duplicate or bypass domain authorities.
- Use Sales Finance for the admin visual shell and Midday-style thin routes,
  targeted queries, URL state, tables, sheets, loading, and responsive
  composition.
- Existing related work:
  [`Driver Platform Revival Closeout`](../driver-platform-revival-closeout/map.md),
  ADR-026, ADR-048, ADR-050, and ADR-054.

## Decisions so far

<!-- Empty until a child decision ticket is resolved. -->

## Not yet specified

- Exact wireframes and interaction density beyond the critical admin and driver
  journeys; these become precise after lifecycle and authority decisions.
- Whether route optimization, live location, customer tracking, and multi-stop
  route planning belong in the first responsive-web release.
- Final rollout cohorts, observability thresholds, and retirement dates; these
  depend on the canonical-surface and compatibility decisions.

## Out of scope

- Implementing or visually polishing the redesign during map charting.
- Replacing the canonical trip, inventory allocation, production submission,
  or proof-document models without a separately approved architecture decision.
- Allowing the client to mark an order fulfilled, fabricate stock, or bypass
  server permissions and transition checks.
- Continuous driver surveillance, payroll, driver marketplace/offer bidding,
  billing redesign, or customer e-commerce changes.
- Removing Expo, Packing List, or compatibility routes before a reviewed
  cutover decision and proven parity.

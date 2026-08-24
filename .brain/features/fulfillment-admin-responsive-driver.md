# Fulfillment Admin And Responsive Driver Workflow

## Status

In progress. Ticket 01 is implemented as a non-production prototype and is
paused at the representative admin/driver feedback gate. Tickets 02–14 remain
dependency ordered under
`.scratch/fulfillment-admin-responsive-driver-implementation/issues/`.

## Prototype boundary

- Development-only route: `/sales-book/fulfillment/prototype`; production
  resolves the route as not found.
- The route is intentionally absent from navigation and requires `editOrders`.
- Admin and 390px driver presentations consume the same local reducer state.
- URL state owns only the selected review surface and named scenario, making
  review states shareable without creating operational records.
- No tRPC client, mutation, email, inventory, dispatch, proof, or hosted-data
  write is imported by the prototype.

## Approved domain presentation under review

- Order status and Dispatch status are distinct lifecycle values.
- Assigned To is ownership, not a lifecycle status.
- Packing blocked is an exception overlay while assistance is waiting or
  denied.
- Back order appears only after a partial dispatch is approved and committed.
- Delivered closes one dispatch; Fulfilled closes the aggregate order only
  when the delivered quantity equals the ordered quantity.
- The driver surface presents one primary next action and explicit quantity
  truth at each scenario.
- Weak-network proof is represented as saved locally for retry, with duplicate
  request IDs treated idempotently by the simulated reducer.

## Validation and evidence

- Focused reducer and boundary validation: 8 tests / 30 assertions.
- Authenticated in-app-browser validation covered URL scenario switching,
  assistance notification, the single driver action, and proof retry.
- Review screenshots live under
  `.scratch/fulfillment-admin-responsive-driver-implementation/screenshots/`.

## Open gate

Record representative admin and driver feedback on terminology, density,
exception handling, and the primary-action progression. Only after that review
may Ticket 01 be marked complete and Ticket 02 become the active frontier.

## 2026-08-23 Mobile Authority Reconciliation

- Expo now consumes the same server-owned dispatch revision, readiness,
  lifecycle risks, capabilities, and blockers used by current fulfillment
  logic while retaining its existing queue, stop, packing, issue, proof,
  notification, and settings flow.
- Normal legacy packing, inventory-backed packing, and guarded-review requests
  share one atomic command boundary. Pending guarded quantity remains visibly
  pending and never counts as packed readiness until canonical approval.
- Drivers can Start Trip, report a durable issue, and complete with proof when
  the server grants those actions. Cancellation, generic status editing,
  packing reset, and picked-stock release remain manager operations.
- UI redesign remains outside this reconciliation. Sequential screen review
  and design alternatives require the explicit post-implementation approval
  gate.

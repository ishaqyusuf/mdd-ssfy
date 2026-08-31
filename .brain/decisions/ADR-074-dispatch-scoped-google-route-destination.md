# ADR: Dispatch-Scoped Google Route Destination

## Status

Accepted — 2026-08-29

## Context

Dispatch navigation needs a Google place identity and coordinates, but many
legacy customer shipping addresses contain only free-form text. Drivers must be
able to repair routing data before departure without gaining permission to
rewrite the customer's primary address or hiding a mismatch from operations.

## Decision

- Keep the customer shipping address as the primary commercial address.
- Store a versioned, driver-confirmed route destination in the existing
  `OrderDelivery.meta.driverRouteDestination` boundary. It records normalized
  address fields, place id, coordinates, confirming actor, time, and whether it
  matches the primary address.
- Resolve the selected Google place server-side. The protected write locks the
  dispatch and rechecks assigned-driver or dispatch-manager authority.
- Expose only a sanitized primary/route projection to driver clients. Matching
  addresses render once; differing route data renders as a labeled secondary
  destination.
- Treat destination-only readiness failure as a repairable Start Trip preflight.
  Every other packing, review, assignment, inventory, and lifecycle blocker
  remains a hard gate.
- Pickup stops route to the applicable warehouse and do not require customer
  destination normalization.
- Keep Google map loading user-initiated. Route addresses are sent to Google
  only when the driver loads the map or opens directions.

## Alternatives

- Overwrite the customer's shipping address after driver confirmation. Rejected
  because dispatch workers do not own customer-master data and the original
  address is necessary for audit and mismatch review.
- Add the normalized result directly to `AddressBooks.meta`. Rejected because
  the confirmation can be dispatch-specific and would widen driver mutation
  authority to a shared customer record.
- Add a durable Route/Stop schema immediately. Deferred until route optimization,
  cross-driver runs, or route-level audit history requires a separate aggregate.

## Consequences

- Legacy orders can become navigable without destructive address edits.
- The Ready Rail can guide a driver through several missing destinations before
  the existing per-dispatch Start Trip transitions run.
- The delivery metadata contract gains a versioned routing field but no schema
  migration is required.
- Google Places API (New) and a restricted `PLACE_API` server key are required
  for autocomplete and place resolution. A future ETA/optimization feature may
  additionally require Routes API.

## Implementation Notes

- Domain projection:
  `packages/sales/src/dispatch-manifest/driver-destination.ts`.
- Persistence boundary:
  `apps/api/src/db/queries/driver-route-destination.ts`.
- Protected mutation: `dispatch.normalizeDestination`.
- Driver surfaces: route map, stop map, address-review dialog, and active-trip
  workspace under `apps/dashboard/src/components/driver-dashboard/`.

## Amendment — Admin assignment validation (2026-08-30)

Operations now validates route identity earlier for new assignments:

- A non-null driver assignment requires a Google-verified order shipping
  address. Pickup remains exempt because it routes to the warehouse.
- An admin correction is saved as a sale-scoped shipping address before the
  assignment proceeds. This preserves the customer master record while making
  the commercial order address itself map-ready.
- The dispatch-scoped `driverRouteDestination` remains the driver's later
  fallback for a route-specific correction or a destination that differs from
  the commercial order address.
- UI preflight improves the workflow, while every create, update, and bulk
  assignment mutation remains the authoritative enforcement boundary.

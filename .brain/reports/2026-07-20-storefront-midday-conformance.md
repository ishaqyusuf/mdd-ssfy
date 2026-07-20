# Storefront Midday Architecture and Performance Conformance

## Result

The storefront implementation conforms to the applicable Midday architecture
principles while preserving GND's established package and query locations.

## Architecture

- Thin Next.js pages prefetch server data and hydrate client workspaces.
- Admin tabs and filters use URL state so operational views are linkable.
- The public endpoint exposes an allowlisted storefront router, not the full
  employee application router.
- `@gnd/sales` owns reusable storefront configuration, availability, money,
  and payment-channel rules. API routes orchestrate authentication,
  transactions, canonical sales persistence, and jobs.
- Storefront categories/offers/components are publication overlays over Dyke
  definitions. `SalesOrders` remains the only completed-order source of truth.
- Checkout and cart mutations are server-authoritative, idempotent where money
  or order creation is involved, and audit important transitions.
- Lifecycle cleanup and order confirmation run outside request latency.

## Performance

- Catalog, sitemap, component, CMS, cart, order, inquiry, and admin reads have
  explicit upper bounds.
- Public reads select customer-safe fields and consistently exclude
  soft-deleted/unpublished records.
- Schema indexes cover publication, owner/guest collection lookup,
  configuration hash, checkout status/idempotency, order channel, content
  ordering, inquiry status, and token expiry.
- Server prefetch and hydration avoid browser waterfalls for initial pages.
- Search input is bounded and URL-driven; no unbounded product hydration is
  permitted.
- Guest collections and expired checkout/reset artifacts have scheduled
  retention cleanup.

## Reliability and Security

- Signed HttpOnly guest identity, customer ownership checks, employee
  permissions, rate limiting, honeypot intake, request IDs, and audit events
  protect the public boundary.
- Canonical configuration and prices are revalidated when lines are added,
  changed, restored, and checked out.
- Square idempotency and checkout state prevent duplicate charges/orders.
- The migration is additive for existing business data and passed a clean,
  full-history isolated deployment.

## Deliberate Project-Specific Adaptation

Midday commonly places queries in a database package. GND's established
application-query convention is `apps/api/src/db/queries`, where context,
permissions, and canonical sales orchestration already live. Moving only
storefront queries would create a half-migration. Shared pure business rules
were extracted to `@gnd/sales`; API-specific orchestration stays with the rest
of GND until a repository-wide data-access migration is approved.

## Remaining Release Gates

- Development and production schema application was confirmed complete by the
  user on 2026-07-20. Preserve a deployment snapshot and verify the applied
  schema before any traffic cutover.
- Publish representative Door, Moulding, and Shelf Item fixtures and complete
  authenticated admin/configure/cart/real-Square/order/fulfillment browser
  rehearsal.
- Approve production policy, service, contact, and legacy redirect content.
- Repair the unrelated monorepo typecheck baseline so the broad release gate
  can become fully green. The storefront production bundle compiles; the
  current build stops afterward on the existing Inventory inbound guard's
  readonly dispatch-status tuple type.

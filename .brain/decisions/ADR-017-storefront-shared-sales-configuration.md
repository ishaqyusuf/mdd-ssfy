# ADR-017: Storefront Uses the Shared Sales Configuration and Order Domain

## Status

Accepted

## Context

GND already configures office quotes and orders through the Dyke sales-step
graph, shared sales-form rules, inventory mappings, pricing dependencies, shelf
items, and downstream sales/inventory fulfillment synchronization.

The current storefront prototype partially reconstructs door components from
inventory subcomponents. Building a second storefront-specific configuration
and order domain would duplicate compatibility, pricing, product, and
fulfillment rules and would drift from office sales behavior.

Customers need a simpler guided experience than office staff, while staff must
continue to manage the underlying definitions in the existing sales settings,
Dyke, inventory, shelf-item, customer, and sales workspaces.

## Decision

The storefront will be another surface over the canonical sales configuration
and order domain.

- Dyke sales settings, step products, route graphs, pricing dependencies,
  inventory mappings, moulding groups, door/HPT behavior, and shelf-item
  definitions remain shared.
- `@gnd/sales` sales-form domain and workflow contracts become the reusable
  configuration engine for office, dealer/mobile, and storefront surfaces.
- A Storefront Configuration Policy may expose, rename, order, default,
  require, or skip existing steps and components. It cannot redefine
  compatibility, inventory identity, or pricing.
- A Storefront Offer is a published customer-facing entry into an existing
  configured root component and route, with merchandising content and SEO.
- Storefront administration is embedded in the existing sales settings, Dyke,
  inventory, shelf-item, customer, and sales workspaces. A separate product
  configuration back office will not be created.
- Customer carts persist a lossless customer-safe sales-form configuration.
  Checkout promotes that configuration through the standard sales save/order
  path and marks the resulting `SalesOrders` record with a storefront channel.
- Storefront orders appear in the canonical office Sales Orders workflow and
  continue through existing inventory, production, fulfillment, document,
  notification, and payment domains.
- Public APIs expose allowlisted customer-safe projections and server-side
  actions. They do not expose internal cost, supplier, administration, or
  unrestricted sales operations.

## Consequences

- Fixes to compatibility and pricing can benefit every sales surface.
- Storefront work must extract or adapt shared sales-form behavior instead of
  copying internal UI components wholesale.
- Public presentation needs a restrictive storefront capability profile and a
  safe data-source adapter.
- Existing Dyke/inventory synchronization and drift must be treated as a
  storefront launch dependency.
- Merchandising content can have its own publishing model, but it cannot become
  a second product relationship or pricing source.
- Cart-to-order conversion requires parity tests proving that the same
  configuration produces the same standard sales records and totals in office
  and storefront flows.

## Implementation

Implemented through `@gnd/sales/storefront-configuration`, the canonical
new-sales-form route/pricing helpers, storefront overlay models, and a
dedicated public router. API orchestration remains in the repository's
existing `apps/api/src/db/queries` convention; business projection and payment
rules live in shared sales modules. Public/admin reads are bounded, writes are
transactional and audited, and long-running cleanup/email work is delegated to
jobs. This follows Midday's thin-page, URL-state, server-prefetch,
server-authoritative mutation, and package-boundary principles without
introducing a parallel product or order source of truth.

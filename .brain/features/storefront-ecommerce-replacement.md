# Feature: Storefront E-commerce Replacement

## Purpose

Replace `gndmillwork.com` with a customer-facing e-commerce surface over GND's
existing office sales configuration, inventory, and order domains. Customers
receive a simplified guided configuration journey, while authorized staff keep
managing the shared definitions from the existing sales, Dyke, inventory, shelf
item, customer, and permission workspaces.

## Canonical Terms

- **Storefront**: the customer-facing e-commerce application in `apps/site`.
- **Storefront Admin**: permission-gated merchant operations in `apps/www`.
- **Dyke Sales Configuration**: the shared office-authored step graph,
  components, dependencies, routes, and pricing behavior used by the sales
  form.
- **Storefront Offer**: a published customer-facing entry into an existing Dyke
  root configuration, with public content and a permitted subset of steps and
  components.
- **Storefront Configuration Policy**: public visibility, label, order,
  default, required, and skip rules applied to existing Dyke definitions.
- **Customer Configuration**: the lossless, valid sales-line selection snapshot
  produced by the shared sales-form engine through the storefront.
- **Merchandising section**: an admin-configured, ordered, publishable storefront
  block such as a hero, category grid, product collection, promotion, FAQ, or
  rich-text section.
- **Storefront order**: a standard Sales Order created through the storefront,
  marked with a storefront sales channel, and processed by the canonical
  payment, inventory, production, dispatch, document, and notification systems.
- **Customer order status**: a stable customer-facing projection of canonical
  payment and operational events.

## Current State

- `apps/site` now provides database-backed home, category, search, product
  configuration, cart, wishlist, authentication, checkout, account, order,
  invoice, contact, custom-quote, CMS page, sitemap, and robots surfaces.
- The public site uses a dedicated allowlisted storefront tRPC endpoint.
  Customer identity is session-derived, guest ownership uses a signed
  HttpOnly cookie, and the server owns configuration validation and pricing.
- Doors, mouldings, and shelf items are projected from the canonical Dyke
  sales-form route. Storefront policy controls publication, presentation,
  visible steps, hidden defaults, ordering, and automatic selection without
  redefining canonical compatibility or price.
- Checkout reprices every line, calculates configured delivery/tax/card
  charges, uses an idempotent Square flow, and promotes the cart into one
  canonical `SalesOrders` record with `salesChannel = "storefront"`.
- The internal Storefront workspace provides permission-gated Catalog,
  Carts, Orders, Content, Settings, and Inquiries operations.
- Lifecycle cleanup and order-confirmation email run as background jobs.

## Product Direction

- The storefront reuses the same sales-form route engine, configuration
  relationships, pricing helpers, and save semantics as office sales.
- Admins expose existing root configurations, steps, components, inventory, and
  shelf items to the storefront from their current management surfaces; they do
  not maintain a parallel storefront product system.
- Customer pages simplify the office form through storefront visibility,
  labels, defaults, ordering, and skip rules while retaining valid Dyke
  relationships.
- Admins separately control merchandising content such as page copy, media,
  navigation, sections, promotions, and policies without redefining product
  configuration.
- The server owns customer identity, cart ownership, product validity, prices,
  tax, shipping, discounts, payment, and order transitions.
- Carts preserve the same normalized sales-line configuration, and checkout
  promotes it into the standard office Sales Orders workflow with a storefront
  channel.
- Super Admin-granted permissions control who can publish storefront offers,
  manage merchandising, inspect customer carts/wishlists, and operate
  storefront-origin orders.
- Legacy content is curated, migrated, and redirected rather than copied
  blindly.

## Plan and Evidence

- Detailed audit:
  `.brain/reports/2026-07-20-storefront-ecommerce-replacement-audit.md`
- Wayfinder map:
  `.scratch/storefront-ecommerce-replacement/map.md`

## Implementation Notes

- Availability policy supports `IN_STOCK`, `MADE_TO_ORDER`, and `BACKORDER`,
  lead-time ranges, a customer message, and browse-only offers. This policy is
  not a hard inventory reservation.
- Cart lines preserve the normalized canonical configuration, configuration
  version, server pricing snapshot, Dyke root identity, and specialized
  door/HPT, moulding, or shelf rows required for standard sales persistence.
- Staff cart/order/inquiry access is separately permissioned and audited.
- Public catalog and admin queries are bounded and soft-delete aware.
- Production must configure a durable storefront guest signing secret and
  Square/auth/email environment settings.

## Verification

- Storefront migration `20260720130000_storefront_ecommerce_replacement`
  applied with all 102 repository migrations to isolated MySQL database
  `gnd_storefront_verify`.
- The shared local database was not reset or pushed with
  `--accept-data-loss`; its pre-existing migration drift must be reconciled
  before normal deployment.
- Focused storefront tests: 7 passed, 0 failed.
- Browser QA against the isolated database: responsive homepage 200, guest
  cart 200, contact page 200, inquiry submission 200, and no browser console
  errors after fixes.
- Broad workspace typechecks remain blocked by unrelated existing Prisma,
  inventory, document, and duplicate React-type baseline failures. Focused
  storefront diagnostic filtering is clean except the jobs test compiler's
  existing lack of `bun:test` declarations.

## Status

Implemented and migration-verified. Production cutover remains release-gated
on shared migration-history reconciliation, approved production content and
policy copy, real Square/email credentials, representative canonical catalog
publication, and full payment/fulfillment rehearsal.

# Feature: Storefront E-commerce Replacement

## Purpose

Replace `gndmillwork.com` with a customer-facing e-commerce surface over GND's
existing office sales configuration, inventory, and order domains. Customers
receive a simplified guided configuration journey, while authorized staff keep
managing the shared definitions from the existing sales, Dyke, inventory, shelf
item, customer, and permission workspaces.

## Canonical Terms

- **Storefront**: the customer-facing e-commerce application in
  `apps/storefront`.
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

- `apps/storefront` now provides database-backed home, category, search, product
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
- The internal Storefront workspace provides separate permission-gated
  Categories, Catalog, Carts & Wishlists, Orders, Inquiries, Pages & Sections,
  and Settings routes. Catalog availability is paged and card-based rather
  than hydrating the complete component catalog. Its dashboard navigation link
  is marked `WIP` while the release gates below remain open.
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
- The Vercel `gnd-storefront` project root is `apps/storefront`, matching the
  rename from the former `apps/site` workspace.
- The storefront app's server-side tRPC client must use the storefront origin
  for `/api/storefront/trpc`, not the shared `NEXT_PUBLIC_APP_URL` when that
  value points at the internal `apps/www` host. Server prefetches preserve the
  current request host and forwarded headers so local portless/proxy rendering
  returns JSON instead of the main app's HTML 404.
- Storefront homepage prefetches are awaited before hydration so the server and
  first client render share the same content, category, and featured-offer
  query state. This prevents empty catalog responses from hydrating as
  skeleton markup on the server and empty-state markup on the client.
- Product-detail compatibility is intentional: the canonical historical
  `/product/[categorySlug]/[productSlug]` route restores the October 2025
  two-column presentation, option-button variant picker, `Door Slab Only` /
  `Add Components` tabs, one-open-at-a-time component accordions, component
  image/list modes, quantity, live price, cart, and wishlist actions.
  `/products/[productSlug]` redirects to this route.
- A canonical offer's source product is always applied as a hidden default. It
  must not appear as another customer-selectable option on its own product
  page; only compatible variants and add-on components are exposed.
- Configuration preview accepts incomplete selections and returns
  `complete: false` until every currently visible required step is selected.
  Hidden and selection-waived steps are not required. Canonical components for
  all route steps are loaded in one bounded query, and the browser keys preview
  effects by semantic request content so an unchanged page does not poll.
- Guest cart traffic uses the dedicated `/api/storefront/trpc` endpoint.
  Customer checkout also recognizes the existing chunked secure NextAuth
  session cookie without exposing the internal application router.
- Storefront order review is intentionally mandatory in-app for the explicitly
  assigned sales rep, even when the local notification-channel seed or the
  rep's general channel preference is absent. Email remains independently
  governed by the configured email transport.

## Verification

- Storefront migration `20260720130000_storefront_ecommerce_replacement`
  applied with all 102 repository migrations to isolated MySQL database
  `gnd_storefront_verify`.
- The user confirmed the storefront schema was safely pushed to both
  development and production on 2026-07-20. No reset was performed by this
  implementation session.
- Focused storefront/catalog/notification tests: 18 passed, 0 failed.
- Browser QA against the isolated database: responsive homepage 200, guest
  cart 200, contact page 200, inquiry submission 200, and no browser console
  errors after fixes.
- Broad workspace typechecks remain blocked by unrelated existing Prisma,
  inventory, document, and duplicate React-type baseline failures. Focused
  storefront diagnostic filtering is clean except the jobs test compiler's
  existing lack of `bun:test` declarations.
- The production storefront bundle compiled successfully. Next.js then stopped
  during its workspace TypeScript gate on the pre-existing
  `apps/api/src/db/queries/inbound-receiving.ts` readonly dispatch-status tuple
  incompatibility; no storefront diagnostic was reported.
- Local browser regression on 2026-07-21: `https://gnd-storefront.localhost/`
  reloads with the homepage hero visible and no `Unexpected token '<'`,
  redacted tRPC, `Data failed`, or hydration mismatch errors after the
  storefront SSR tRPC origin and awaited-homepage-prefetch fixes. Direct
  storefront tRPC route smoke returns JSON for public content and catalog
  requests.
- Product-page browser regression on 2026-07-21: the Carrara test offer renders
  the restored October 2025 interaction model, exposes the add-components tab,
  hides the fixed Carrara source component from the picker, and settles after
  one approximately 0.45-second configuration preview instead of continuously
  polling. Homepage/category/search expose the enabled Interior Pre-Hung
  category and both representative door offers without the zero-height image
  warning.
- Full local sandbox rehearsal on 2026-07-21 created customer order
  `08897CST`, assigned Laura Ruth Godoy, produced the reviewed Square payment
  link, completed a Square sandbox payment, persisted the online payment,
  reduced amount due to `$0.00`, generated the invoice, displayed Payment
  received in the customer account, and displayed PAID in Storefront Orders.
  The Storefront Orders handoff opens the same configured order in the office
  sales editor with its door schedule and totals intact.
  The rep review activity is persisted unread for the assigned employee.
  Local `SKIP_EMAIL=1` recorded email attempts as skipped, so provider
  delivery was not claimed.

## Status

Implemented, migration-verified, schema-deployed, and locally rehearsed through
Square sandbox settlement. Traffic cutover remains release-gated on approved
production content and policy copy, real Square/email credentials, and a
physical fulfillment rehearsal.

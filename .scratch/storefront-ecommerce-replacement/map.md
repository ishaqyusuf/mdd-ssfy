# Wayfinder: Storefront E-commerce Replacement

## Local Scratch Tracker

This map uses the repository's established local Markdown fallback because
repo-specific tracker configuration is absent and GitHub was unreachable during
the audit.

## Destination

Chart an implementation-ready path for replacing `gndmillwork.com` with a
secure customer e-commerce surface over GND's existing Dyke sales
configuration, inventory, and standard Sales Orders workflow. Customers browse
final-product offers, complete a simplified valid configuration, cart,
checkout, pay, and obtain complete order information without creating a second
sales or product-configuration system.

## Notes

- Domain: `apps/site`, shared `@gnd/sales` workflow contracts, Dyke sales
  settings/routes/components, inventory, shelf items, merchandising/content,
  customer identity, cart/wishlist, checkout/payment, standard Sales Orders,
  fulfillment, documents, notifications, permissions, SEO, and cutover.
- The storefront is a restrictive third sales-form surface, not a separate
  configuration or order domain.
- A published Storefront Offer starts from an existing Dyke root configuration.
  Customer policy may expose, rename, order, default, require, or skip existing
  steps/components, but it cannot redefine compatibility or pricing.
- Admins configure storefront exposure inside existing sales settings, Dyke,
  inventory, and shelf-item workflows. Merchandising content may have a
  separate structured publishing surface because it does not own product
  relationships.
- Carts and wishlists preserve lossless sales-form configuration. Checkout
  promotes the validated configuration through the standard sales save path and
  marks the result as storefront-channel.
- Super Admin-granted permissions control publishing, merchandising, customer
  cart/wishlist visibility, and operation of storefront-origin orders.
- Reuse canonical inventory, sales, payment, production, dispatch, document,
  notification, and email systems through safe storefront boundaries.
- Follow Brain protocol and `Schema -> API -> UI -> Validation -> Polish`.
- React/Next.js decisions must follow the repository frontend architecture,
  performance, accessibility, and Midday-style rules.
- The detailed current-state audit is
  `.brain/reports/2026-07-20-storefront-ecommerce-replacement-audit.md`.
- Local child tickets are Markdown issues under
  `.scratch/storefront-ecommerce-replacement/issues/`; their `Blocked by`
  metadata defines the frontier.

## Decisions so far

<!-- Empty until a child decision ticket is resolved. -->

## Not yet specified

- Exact public price profile, tax provider/policy, and delivery-rate ownership.
- Whether guest checkout is allowed and how a guest configuration becomes a
  customer-linked standard sale.
- Promotion/coupon launch scope and stacking policy.
- Review/recommendation launch scope.
- Cancellation and return windows that legal/operations will approve.
- Whether nationwide shipping is launch scope or a later expansion.
- Rep/team assignment, review, and notifications for storefront-channel orders.
- Whether abandoned carts are shown only on Customer Overview or also in the
  canonical Sales workspace.

## Out of scope

- Replacing the internal sales, inventory, production, dispatch, document, or
  accounting systems with an unrelated third-party commerce back office.
- Creating a parallel storefront product configurator, compatibility graph,
  pricing system, or order table.
- Copying stale promotions, placeholder contact data, or unsupported business
  claims from the old site.
- Native mobile storefront work unless separately added after web launch.
- Marketplace/multi-vendor commerce.

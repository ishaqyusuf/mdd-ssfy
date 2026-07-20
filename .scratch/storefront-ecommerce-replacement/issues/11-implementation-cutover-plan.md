# Plan phased implementation and replacement cutover

**Type:** task

**Status:** in progress; implementation and dev/prod schema deployment
complete, production traffic cutover pending

**Blocked by:** Define the storefront security and API boundary; Define the
shared sales-form storefront surface and exposure contract; Define embedded
admin controls for storefront offers and merchandising; Define customer offer
pages and simplified configuration journeys; Define lossless cart, wishlist,
and customer identity continuity; Define checkout promotion into standard Sales
Orders; Define customer self-service and permission-scoped staff visibility;
Define storefront-channel sales and fulfillment parity; Define content,
service, policy, SEO, and legacy migration; Define release quality, security,
performance, and observability gates

## Question

How should the approved decisions be delivered as safe, demoable vertical
slices, migrated from the legacy site, staged, monitored, cut over, and rolled
back without risking customer payments or internal operations?

## Comments

Deliver the storefront in these vertical slices:

1. Secure storefront API and customer/guest ownership boundary.
2. Add storefront availability policy to Dyke Item Type, steps, and components.
3. Implement Item Type → `/categories/[categorySlug]` projection.
4. Add the permission-gated Storefront dashboard.
5. Implement category descriptions, image overrides, ordering, preview, and
   publishing.
6. Implement component visibility and step show/hide/default policies.
7. Deliver one complete Door configuration with automatic compatible
   selections.
8. Add Moulding configuration parity.
9. Add Shelf Item configuration parity.
10. Persist lossless configurations in cart and wishlist.
11. Promote checkout through the standard sales save path.
12. Add customer order information and staff cart/order visibility.
13. Complete payment, inventory, production, fulfillment, document,
    notification, SEO, migration, and release gates.

The first tracer slice should demonstrate:

`Item Type category → category page → door selection → automatic defaults →
customer configuration → cart → standard office Sales Order`

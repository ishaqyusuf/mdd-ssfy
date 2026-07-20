# Define the shared sales-form storefront surface and exposure contract

**Type:** prototype

**Status:** implemented

**Blocked by:** Define the storefront security and API boundary

## Question

How should the shared `@gnd/sales` workflow and Dyke route graph become a
restrictive storefront surface, and what policy exposes, labels, orders,
defaults, requires, or skips existing root configurations, steps, and
components without duplicating compatibility, pricing, or inventory identity?

## Comments

The storefront should reuse the Dyke sales-form graph with storefront
availability flags on existing components.

Initial storefront product families are:

- Doors
- Mouldings
- Shelf Items

Every eligible Dyke component should have an `availableOnStorefront` flag or
equivalent publication policy. Compatibility, pricing, redirects, inventory
identity, and downstream sales relationships remain canonical.

The first Dyke step, `Item Type`, has special storefront behavior: each
storefront-enabled Item Type component becomes a storefront category. It
receives a public slug and renders at:

`/categories/[categorySlug]`

The category page lists the storefront-enabled components belonging to that
root category.

A Storefront Configuration Policy may add customer-facing metadata and behavior
without duplicating the Dyke definition:

- public label and description;
- storefront image override;
- visibility and ordering;
- customer-visible steps;
- hidden steps with valid defaults;
- required or optional choices;
- automatic configuration selections;
- availability and publication state.

Selecting a product such as a door may automatically preselect compatible
downstream components. Those defaults must still be validated and priced by the
shared route engine.

# Define customer offer pages and simplified configuration journeys

**Type:** prototype

**Status:** implemented

**Blocked by:** Define the shared sales-form storefront surface and exposure
contract; Define embedded admin controls for storefront offers and
merchandising

## Question

How should customers browse final-product offers and complete simplified but
lossless door, door/HPT, moulding, and shelf-item configurations using the
shared route engine, including hidden defaults, compatible combinations,
pricing, availability, validation, SEO, accessibility, and recovery states?

## Comments

The launch catalog consists of Doors, Mouldings, and Shelf Items.

The storefront navigation should follow this hierarchy:

1. A storefront-enabled `Item Type` component becomes a category.
2. The category renders at `/categories/[categorySlug]`.
3. The category page displays its storefront-enabled root components.
4. Selecting a component opens its dedicated product/configuration page.
5. The page loads the component's shared Dyke route and applies its storefront
   policy.
6. Automatic selections provide a valid starting configuration.
7. Customers adjust only the steps made visible to them.
8. The completed normalized configuration is added to cart.

For example, selecting a door may automatically choose its configured default
height, width, jamb, hinges, casing, or other components. Customers see only
the choices intended for online ordering, but the resulting line preserves the
complete office sales-form relationship.

Category and product pages should support public descriptions, image overrides,
availability, starting price or calculated price, SEO, breadcrumbs, accessible
configuration controls, mobile layouts, and clear invalid/unavailable states.

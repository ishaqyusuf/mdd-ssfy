# Define embedded admin controls for storefront offers and merchandising

**Type:** prototype

**Status:** implemented

**Blocked by:** Define the shared sales-form storefront surface and exposure
contract

## Question

Which controls belong in existing sales settings, Dyke step/component,
inventory, shelf-item, customer, and sales workspaces; which page/navigation/
promotion/policy controls remain separate merchandising concerns; and how do
Super Admin-granted permissions govern publishing, preview, customer cart/
wishlist visibility, and storefront-order operations?

## Comments

Add a `Storefront` link to the existing internal dashboard. This is a
configuration and presentation overlay for existing Dyke and inventory data,
not a separate product-management system.

The Storefront dashboard should let authorized staff manage:

- storefront-enabled Item Type categories;
- category slug, public title, description, image, SEO, status, and order;
- storefront-enabled components within Doors, Mouldings, and Shelf Items;
- storefront title, description, image override, status, and ordering;
- customer-visible versus hidden configuration steps;
- default selections for hidden or simplified steps;
- automatic configuration presets triggered by a selected product;
- preview, publish, unpublish, and readiness validation;
- homepage/category placement and merchandising content.

Component eligibility and core relationships continue to be managed in the
existing Dyke, sales-form, inventory, and shelf-item systems. The Storefront
dashboard only controls their public availability and presentation.

Super Admin should grant separate permissions for configuring storefront
content, publishing changes, viewing customer carts/wishlists, and managing
storefront-origin orders.

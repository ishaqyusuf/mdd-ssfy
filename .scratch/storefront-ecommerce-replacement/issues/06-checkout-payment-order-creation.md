# Define checkout promotion into standard Sales Orders

**Type:** research

**Status:** implemented

**Blocked by:** Define the shared sales-form storefront surface and exposure
contract; Define lossless cart, wishlist, and customer identity continuity

## Question

What server-authoritative checkout state machine validates and reprices a
customer configuration, calculates tax/shipping/discounts, processes Square
payment, and promotes the cart through the standard sales save path into exactly
one storefront-channel `SalesOrders` record with the same Dyke/HPT/moulding/
shelf/inventory relationships as an office sale?

## Comments

Checkout should validate the Commerce Cart and promote it through the standard
sales save/orchestration path—not create a separate e-commerce order model.

The server-authoritative checkout flow should:

1. lock or version the checkout session;
2. revalidate configuration, publication, inventory, and fulfillment
   eligibility;
3. reprice all lines using canonical customer sales pricing;
4. calculate discounts, tax, delivery/shipping, and final total;
5. snapshot the accepted configuration and totals;
6. process Square using idempotency and verified webhooks;
7. create exactly one standard `SalesOrders` record;
8. preserve the same SalesOrderItems, Dyke steps, HPT, moulding, shelf, and
   inventory relationships as an office sale;
9. mark the order with a storefront channel and apply assignment/review rules;
10. queue existing sales-to-inventory synchronization;
11. clear the cart only after the authoritative transition;
12. provide durable confirmation and receipt information.

Pending, failed, cancelled, duplicated, and retried payments must not create
duplicate orders or charges.

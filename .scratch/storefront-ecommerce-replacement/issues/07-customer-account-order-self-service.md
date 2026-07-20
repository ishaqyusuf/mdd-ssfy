# Define customer self-service and permission-scoped staff visibility

**Type:** grilling

**Status:** implemented

**Blocked by:** Define checkout promotion into standard Sales Orders; Define
storefront-channel sales and fulfillment parity

## Question

Which carts, wishlists, profile, addresses, orders, payments, documents,
production/fulfillment status, tracking, cancellation, return, reorder,
support, and notification data may customers see, and which existing office
customer/sales surfaces may authorized staff see or operate under Super
Admin-granted permissions?

## Comments

Replace mock storefront account and order data with customer-scoped projections
of canonical records.

Customers should receive:

- profile, communication preferences, and address management;
- active cart and wishlist access;
- order list and order detail;
- immutable configured-product summaries;
- totals and payment status;
- invoice and receipt downloads;
- customer-safe production and fulfillment timeline;
- delivery, pickup, and tracking information;
- support contact and approved cancellation, return, damage, reorder, and
  review actions.

Internal statuses should be translated into stable customer language rather
than exposed directly.

Authorized staff should see customer carts, wishlists, storefront activity, and
storefront-origin orders within existing Customer Overview and Sales surfaces.
Separate permissions should distinguish read-only visibility from editing
carts, converting carts to quotes/orders, managing orders, issuing refunds, or
handling returns.

Every customer read must be scoped by authenticated customer ownership. Every
employee operation must use the employee permission model and write an audit
event.

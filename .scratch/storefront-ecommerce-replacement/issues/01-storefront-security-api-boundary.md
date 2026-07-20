# Define the storefront security and API boundary

**Type:** research

**Status:** implemented

**Blocked by:** None

## Question

What dedicated API, authentication, authorization, ownership, abuse, and audit
boundary must separate the public storefront from internal inventory, sales,
task, and admin operations?

## Comments

The storefront should use a dedicated allowlisted API router rather than
importing the complete internal application router.

The boundary should:

- expose only public catalog, configuration, cart, wishlist, checkout,
  customer-account, and customer-order operations;
- derive authenticated customer identity from the server session;
- identify guests through an opaque signed server-managed session;
- verify ownership on every cart, wishlist, address, checkout, and order
  operation;
- protect Dyke, inventory, sales, task, pricing, and administration mutations
  through employee authentication and permissions;
- prevent public access to supplier costs, internal pricing, customers,
  employees, operational notes, and unrestricted sales records;
- apply rate limiting, input limits, upload restrictions, audit events, and
  safe public errors;
- verify Square webhooks and require idempotency for payment and order
  mutations.

Employee and customer authentication should remain separate. An employee
session must not automatically become a customer session, and any support
impersonation should be explicit, permission-gated, time-limited, and audited.

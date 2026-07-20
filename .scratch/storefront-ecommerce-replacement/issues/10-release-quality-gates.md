# Define release quality, security, performance, and observability gates

**Type:** research

**Status:** in progress; schema deployed, shared baseline and production
rehearsal pending

**Blocked by:** Define the storefront security and API boundary; Define the
shared sales-form storefront surface and exposure contract; Define checkout
promotion into standard Sales Orders; Define storefront-channel sales and
fulfillment parity

## Question

Which typecheck, lint, unit, contract, integration, browser, accessibility,
security, payment, performance, SEO, analytics, observability, migration,
backup, rollback, and operational acceptance gates are mandatory before launch?
Which parity fixtures prove that door/HPT, moulding, and shelf-item selections
produce equivalent standard sales records and totals from office and
storefront surfaces?

## Comments

Launch should require evidence across correctness, parity, security,
accessibility, performance, and operations.

Required gates should include:

- green storefront typecheck, lint, build, and focused automated tests;
- contract/parity fixtures for door/HPT, moulding, and shelf configurations
  across office and storefront surfaces;
- tests for ownership, authorization, price tampering, invalid combinations,
  cart merging, webhook replay, payment idempotency, duplicate orders, and
  overselling;
- browser coverage from browse through configuration, cart, checkout,
  confirmation, and customer order detail;
- admin publishing and draft-preview tests;
- WCAG 2.1 AA keyboard, focus, screen-reader, contrast, error, and
  reduced-motion checks;
- Core Web Vitals, image, bundle, and query budgets;
- analytics for discovery, configuration abandonment, cart, checkout,
  purchase, and zero-result search;
- error, payment, webhook, order-sync, and fulfillment monitoring;
- content, redirect, email, document, backup/restore, security, and rollback
  rehearsals.

Launch should be blocked if equivalent storefront and office configurations
produce different sales relationships or totals.

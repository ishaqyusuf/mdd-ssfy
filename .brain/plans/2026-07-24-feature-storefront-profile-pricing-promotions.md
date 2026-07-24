# Plan: Storefront Customer Profile Pricing and Scheduled Promotions

## Goal

Use canonical customer profile pricing on the storefront and add scheduled,
targeted promotions with standard e-commerce sale presentation from catalog
through checkout and Sales Order persistence.

## Invariants

- Dyke Sales remains the base product, compatibility, and pricing source.
- Customer profile coefficients are never returned publicly.
- Promotion targets are server-derived and cannot be selected by a shopper.
- One promotion applies per line; campaigns never stack.
- Checkout always reprices and cannot trust cart/browser totals.
- Storefront orders continue through the canonical Sales Order workflow.
- Existing shipping, tax, card-charge, payment, inventory, and fulfillment
  rules remain authoritative.

## Work Breakdown

### 1. Discovery and Contract

- Trace canonical Sales profile pricing, storefront projection, cart,
  checkout, shipping, and Sales persistence.
- Define profile precedence, promotion schedule semantics, targeting,
  conflict resolution, rounding, public DTOs, and audit boundaries.
- Record the durable architecture decision.

Status: complete.

### 2. Shared Pricing Domain

- Add typed promotion candidate, eligibility, selection, pricing snapshot, and
  public pricing projection helpers in `@gnd/sales`.
- Reuse the existing Sales profile coefficient helper and decimal money
  primitives.
- Cover time boundaries, audience/product OR targeting, no stacking,
  deterministic winner selection, and line-total rounding.

Status: complete.

### 3. Persistence

- Add promotion lifecycle/audience/scope schema.
- Add campaign and normalized category, offer, customer, and customer-profile
  target models.
- Add reverse relations to storefront offers/categories and customer/profile
  records.
- Generate Prisma Client and create/apply an additive migration.

Status: schema/client complete; local schema push complete; source migration
generation blocked by the pre-existing master-password shadow-history defect.

### 4. Server Pricing Integration

- Resolve signed-in customer profile, storefront default profile, or canonical
  fallback.
- Resolve active eligible campaigns in bounded queries.
- Apply profile pricing to projected components, door tiers, and configured
  line totals, then apply one campaign percentage.
- Store private snapshots and return safe public pricing.
- Reprice guest-to-customer cart merges and quantity changes.

Status: complete.

### 5. Checkout and Sales

- Include list subtotal, promotion discount, and discounted subtotal.
- Bind shipping quote validity to the discounted merchandise subtotal.
- Fingerprint profile/campaign/list/final price at checkout.
- Persist the resolved profile, campaign fixed discounts, and pricing evidence
  into canonical Sales Order input/metadata.

Status: complete.

### 6. Administration

- Add validated campaign list/detail/save/publish/archive queries.
- Add bounded profile, category, offer, and customer target options.
- Add default profile selection to Storefront Settings.
- Add the Promotions route, list, query-param sheet, schedule, targeting, and
  lifecycle actions.
- Repeat `viewStorefront`, `editStorefront`, and `publishStorefront` checks on
  the server.

Status: complete.

### 7. Shopper UI

- Add campaign announcement, catalog-card badges, and savings copy.
- Add list/sale presentation to configuration options and totals.
- Add cart, order-summary, and checkout discount rows.
- Preserve accessible `<del>` semantics and screen-reader price context.

Status: complete.

### 8. Verification and Rollout

- Run domain/schema tests, package typechecks, focused lint, diff checks, and
  the storefront production build.
- Browser-check the admin Promotions workspace and a temporary active campaign
  across storefront announcement and catalog cards.
- Remove browser QA data.
- Document schema/API/permission/feature/task impact.
- Verify the production diff is additive, apply the production schema, and
  confirm an empty post-push diff.

Status: complete. Production schema rollout passed on 2026-07-24; the separate
pre-existing migration shadow-history defect remains documented for repair.

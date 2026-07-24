# ADR-029: Storefront Profile Pricing and Scheduled Promotions

## Status

Accepted

## Date

2026-07-24

## Context

The storefront needs guest and customer-specific pricing plus seasonal,
category, product, profile, and customer deals. Canonical product pricing and
customer coefficients already belong to the office Sales workflow. Embedding
campaign discounts into Dyke components or creating sale-specific customer
profiles would mix reusable base pricing with temporary merchandising and
would make campaign targeting, scheduling, and audit difficult.

## Decision

Keep `CustomerTypes` as the owner of base profile pricing and add a separate
`StorefrontPromotion` aggregate for temporary storefront merchandising.

The storefront resolves an assigned customer profile before the configured
storefront default. It applies that profile through the existing Sales helper,
then selects at most one eligible promotion and applies its percentage to the
full profile-adjusted line total.

Promotion targeting uses normalized category, offer, customer, and
customer-profile joins. Schedule and publication are server-enforced. Conflict
resolution is deterministic: percentage, priority, newest start, then ID.

Private pricing snapshots persist profile and campaign evidence. Public DTOs
contain only customer-facing list/sale totals and campaign copy. Checkout
reprices and persists fixed campaign discounts plus metadata into the canonical
Sales Order.

## Consequences

- Office and storefront base pricing cannot drift into parallel systems.
- Seasonal campaigns can be scheduled and targeted without editing products
  or customer coefficients.
- Profile and campaign changes invalidate stale carts at checkout.
- One-winner semantics are easy to explain and audit but do not support coupon
  stacking or compound promotions.
- Catalog cards can safely show campaign eligibility before configuration;
  exact crossed-out prices appear only after the server has a reliable
  configuration price.
- Database rollout depends on reconciling the repository's existing broken
  shadow migration chain.

## Alternatives Considered

- Store discounts inside customer profiles: rejected because profile
  coefficients are reusable base-pricing policy, not scheduled product
  merchandising.
- Mutate Dyke product prices during a sale: rejected because office pricing,
  historical interpretation, and concurrent targeted campaigns would be
  affected.
- Allow every eligible promotion to stack: rejected because rounding,
  precedence, checkout explanation, and Sales persistence become ambiguous.
- Calculate discounts only in the browser: rejected because cart, payment, and
  Sales Order totals must remain server-owned.

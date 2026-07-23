# ADR-023: Versioned Product-Aware Storefront Shipping

## Status

Accepted

## Date

2026-07-23

## Context

The storefront previously priced delivery with one address-independent flat
rate. Door sizes, Moulding length, and Shelf categories have different transport
weights, while distance, long trips, and vehicle capacity materially affect
cost. The business also needs office control before a customer pays and a safe
path to later automation.

The repository contains older disconnected shipping scaffolding, but it does
not project canonical storefront configurations or preserve reproducible quote
evidence.

## Decision

Use a deterministic shared shipping domain in `packages/sales` and persist:

- immutable, versioned `StorefrontShippingPolicy` records;
- revisioned `StorefrontShippingQuote` evidence tied to cart and policy version;
- product-aware Door size/profile, Moulding pounds-per-LF, and Shelf
  category/product weight precedence;
- a base-trip plus weight-distance formula with explicit service, route,
  mapping, capacity, clamp, free-delivery, and auto-approval gates.

V1 always requires office review. V2 may auto-approve shipping only when all
configured confidence gates pass. Unmapped or unsafe quotes always return to
manual review. Google Places and Routes calls remain server-side.

The office decision updates quote, checkout totals, canonical Sales Delivery
extra cost, `grandTotal`, and `amountDue` transactionally. Payment-link creation
requires a finalized shipping state.

## Consequences

- Historical quotes remain reproducible after settings change.
- Both checkout and office review use the same formula and line evidence.
- Moulding price and weight share the whole-piece length calculation.
- Initial production values require business calibration; the code does not
  invent operational rates or weights.
- JSON configuration keeps the first administration model flexible, but future
  per-profile editing, analytics, or constraints may justify normalized tables.
- V2 automates only shipping approval; the existing broader order verification
  workflow remains a separate control.

## Alternatives Considered

- Flat delivery by order or size: simple but ignores route distance and mixed
  carts.
- Per-size delivery prices: becomes a distance-by-size matrix and does not
  compose cleanly for multiple items.
- Weight-only pricing: misses the fixed cost of dispatch and mileage.
- Activate legacy shipping scaffolding: rejected because it is disconnected
  from current storefront configuration and lacks auditable quote revisions.

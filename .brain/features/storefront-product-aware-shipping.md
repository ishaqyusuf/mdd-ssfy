# Storefront Product-Aware Shipping

## Status

Implemented locally on 2026-07-23. Production activation remains an explicit
business/configuration step because initial weights, rates, origin, and safety
limits must be calibrated before the policy is published.

## Purpose

Storefront delivery quotes use the customer's Google Place destination, Google
driving distance, and product-derived shipment weight. The same domain supports:

- V1 `OFFICE_REVIEW`: every calculated delivery amount is provisional until an
  employee accepts or overrides it.
- V2 `AUTO_WHEN_CONFIDENT`: complete quotes may be finalized automatically only
  inside configured distance, weight, and amount gates. Any blocker returns the
  quote to office review.

The legacy flat delivery rate remains available when calculated shipping is
disabled.

## Product Weight Projection

The shared implementation is
`packages/sales/src/storefront-shipping.ts`.

### Doors

Weight resolution order is the selected catalog door's per-unit override,
assigned canonical size profile, then unmapped. Door weight is resolved pounds
multiplied by configured door quantity.

The admin size table is projected from the same Dyke sales-form data as the
sales form: configured `doorSizeVariation` widths crossed with canonical Height
components, plus dimensions present only in Door pricing dependencies. Shipping
settings do not maintain a duplicate size list.

### Mouldings

Storefront Moulding configuration collects requested linear feet and waste
percentage, then reuses `calculateMouldingQuantity` to round to whole pieces:

```text
pieces = ceil((requested LF / piece length) × (1 + waste %))
shipped LF = pieces × piece length
price = pieces × piece unit price
weight = shipped LF × resolved pounds per LF
```

Pounds per LF resolves from the selected catalog moulding's override, the
general moulding pounds-per-linear-foot setting, then unmapped. Persisted line
metadata contains requested LF, waste, piece length, whole pieces, and shipped
LF so pricing and shipping use the same canonical evidence.

### Shelf Items

Pounds per unit resolves from a catalog item override, child category, parent
category, then unmapped. Weight is resolved pounds per unit multiplied by
quantity. The settings editor projects active `DykeShelfCategories` parent rows
and stores weights against their canonical numeric IDs.

## Delivery Formula

```text
route miles = one-way driving miles × round-trip multiplier
chargeable weight =
  round up(estimated weight × packaging multiplier, weight increment)
excess weight units =
  max(0, chargeable weight - included weight) / weight unit
delivery =
  base dispatch
  + route miles × base vehicle rate per mile
  + route miles × excess weight units × weight-distance rate
```

The result is clamped to the configured minimum and optional maximum. Free
delivery is evaluated only after route, mapping, and service eligibility checks.
No unresolved route or weight silently becomes a zero-priced delivery.

## Quote Lifecycle

1. Checkout selects a Google autocomplete suggestion and submits its Place ID.
2. The server resolves the destination, computes a Google driving route from the
   configured origin, reprices the cart, and projects all product weights.
3. A new `StorefrontShippingQuote` revision stores the policy version, route,
   line evidence, calculation, blockers, and provisional amount. Unlinked
   revisions expire; the checkout's unique quote link identifies the
   authoritative order revision. Preview never supersedes a linked quote.
4. V1 produces `PENDING_OFFICE_REVIEW`; blockers produce
   `MANUAL_REVIEW_REQUIRED`.
5. V2 produces `AUTO_APPROVED` only when there are no calculation blockers or
   auto-approval blockers.
6. Checkout links the accepted quote. Payment-link creation rejects delivery
   orders whose quote is not `AUTO_APPROVED`, `APPROVED`, or `OVERRIDDEN`.
7. Office acceptance/override updates the quote, checkout totals, canonical
   Sales Delivery extra cost, `grandTotal`, and `amountDue` in one transaction.
   It then records an audit event and notifies the customer of the final amount.

## Administration

Storefront Settings exposes:

- calculated shipping enabled/disabled;
- V1 or V2 approval mode;
- Google Place origin;
- formula, packaging, clamp, capacity, service-area, and free-delivery values;
- V2 confidence gates;
- a Door sizes tab populated from the canonical sales-form dimensions;
- a Mouldings tab with the general pounds-per-linear-foot value;
- a Shelf categories tab populated from live top-level shelf categories.

Catalog item editing owns product-specific shipping overrides. Doors and shelf
items accept pounds per unit; mouldings accept pounds per linear foot. These
values are stored under `StorefrontComponent.metadata.shipping` and take
precedence over shipping-policy defaults. The settings screen no longer accepts
manual JSON profiles or product-override keys. Shelf catalog components also
store their canonical main Shelf category ID so their category default never
depends on a merchandising category ID. Quote projection identifies Moulding
behavior from the canonical Dyke source step, not the public category title.

An existing active policy remains read-compatible with legacy Moulding
profiles, product overrides, global Door/Shelf fallbacks, component-specific
Door profiles, and handling values. The settings response summarizes legacy
values that the typed editors cannot represent. Publishing is server-blocked
until the employee explicitly acknowledges that the new immutable policy
replaces them; the prior policy version remains in history. New configuration
belongs in the typed tables and catalog metadata.

Publishing creates a new immutable policy version and deactivates the previous
version. Existing quotes retain their original version.

Storefront Orders exposes route, weight, formula, confidence, and blockers.
Authorized employees may accept the calculated amount or provide a final amount
and review note. The existing Sales verification/payment-link action stays
disabled until shipping is final.

## Operational Readiness

Before enabling calculated shipping:

1. Configure and verify the Google Places and Routes credential.
2. Select the origin Place.
3. Calibrate rates and limits from representative deliveries.
4. Populate Door-size and Shelf-category mappings plus the general Moulding
   value; add catalog overrides for exceptional products.
5. Begin with V1 and review accepted-versus-overridden evidence.
6. Enable V2 only after setting conservative distance, weight, and amount gates.

## Validation

- Shipping formula, projection, and persistence/payment guards include focused
  shared-domain coverage for canonical sizes, shelf categories, and catalog
  metadata weight semantics.
- API, Sales, and DB package typechecks pass.
- Prisma client generation and local schema push pass.
- Admin settings rendered 45 canonical Door rows and 18 live top-level Shelf
  categories in local data; the Door, Moulding, and Shelf tabs and family-aware
  catalog weight inputs received local browser smoke coverage.
- Normal migration replay is currently blocked by the pre-existing
  `20260722180000_master_password_usage_audit` shadow-database ordering failure;
  no reset was performed.

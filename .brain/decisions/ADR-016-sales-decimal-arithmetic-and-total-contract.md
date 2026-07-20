# ADR-016: Sales Decimal Arithmetic and Total Contract

## Status

Accepted

## Date

2026-07-20

## Context

Legacy and new sales paths used a mixture of `toFixed`, `Math.round`, raw JavaScript floating-point arithmetic, and incompatible rounding stages. Shelf prices were stored as integer dollars, percentage discounts and HPT custom prices differed by path, grouped display averages could not always reproduce their row sums, and C.C.C-inclusive `grandTotal` values were transformed differently between domain, API, and UI layers.

## Decision

Sales money calculations use the shared `decimal.js-light` utility with `ROUND_HALF_UP` at two decimal places.

- Complete a monetary formula before rounding its published result.
- Multiply the composed unit by quantity before rounding the authoritative line total.
- Sum authoritative line totals rather than reconstructing totals from display rates.
- Treat HPT custom price as the final unit price.
- Calculate percentage discounts from subtotal and subtract them.
- For grouped service, shelf, and moulding lines, publish a two-decimal average `unitPrice`, keep `lineTotal` authoritative, and record `rateRoundingAdjustment` plus `totalAuthoritative = true`.
- Store shelf row unit and total prices as `Decimal(12,2)` and convert Prisma Decimal objects to numeric domain values at query/API boundaries.
- Define `grandTotal` as the C.C.C-exclusive order principal, `ccc` as a separate derived payment-channel fee, and `totalWithCcc = grandTotal + ccc`.
- Include delivery, labor, flat labor, and other applicable costs in the C.C.C principal.
- Use `totalWithCcc` for card/link/terminal display and `grandTotal` for order balance and cash accounting.

## Consequences

- Legacy and new calculations share midpoint and floating-point behavior.
- Existing client contracts stay numeric.
- Grouped display rates may intentionally differ by a cent when recomposed; the metadata adjustment explains the difference.
- Persisted shelf cents survive create, update, hydration, print, and inventory synchronization.
- Consumers must explicitly choose principal or payment-channel total instead of relying on an overloaded `grandTotal`.

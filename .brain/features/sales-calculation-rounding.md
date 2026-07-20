# Sales Calculation and Rounding

## Purpose

Defines the shared money, grouped-pricing, shelf persistence, discount, and C.C.C behavior used by legacy and new sales features.

## Current Behavior

- `packages/sales/src/payment-system/domain/money.ts` is the canonical sales money boundary.
- Arithmetic uses `decimal.js-light`, `ROUND_HALF_UP`, and two-decimal published monetary values.
- Line pricing composes the unit, multiplies by quantity, then rounds the authoritative line total.
- Summaries add authoritative line totals.
- Fixed and percentage discounts subtract; percentage discounts are `round(subtotal × percentage ÷ 100)`.
- HPT custom price is final and does not receive addon a second time.
- Grouped service, shelf, and moulding lines store:
  - authoritative `lineTotal`
  - two-decimal display-average `unitPrice`
  - `meta.rateRoundingAdjustment`
  - `meta.totalAuthoritative = true`
- `DykeSalesShelfItem.unitPrice` and `totalPrice` use `Decimal(12,2)`; clients still receive numbers.
- `grandTotal` is the order principal excluding C.C.C.
- `ccc` is derived separately for card, link, and terminal payment methods.
- `totalWithCcc` is the payment-channel display total.
- Delivery, labor, flat labor, and other applicable costs are included in the C.C.C principal.
- Cash/order balance accounting uses `grandTotal`; card/link/terminal display uses `totalWithCcc`.

## Compatibility

- Older saved summaries without `totalWithCcc` hydrate through a fallback of `grandTotal + ccc`.
- Legacy DTO and new API hydration convert Prisma Decimal shelf values to numbers.
- Print and synchronization consumers use authoritative row/line totals and only reconstruct a row total when no authoritative value exists.

## Verification

See `.brain/reports/2026-07-20-legacy-vs-new-sales-calculation-rounding-audit.md`.

# Dealer Percentage Pricing Repro

Status: Unit/Query Evidence Captured; Browser Runtime Pending
Fixture: `DSF-FLAT-001`

## Rule

Dealer customer profiles use `salesPercentage`, not `coefficient`.

Dealer-facing price calculation:

`baseUnitPrice * internalCoefficient * (1 + salesPercentage / 100)`

## Steps

1. Create or select an internal default profile with coefficient `1.25`.
2. Create or select a dealer profile with `salesPercentage = 25`.
3. Create a dealer quote with tax rate `10`.
4. Add line A: qty `2`, unit price `80`.
5. Save the quote.
6. Reopen the quote.
7. Convert the quote to order.

## Expected

- Internal line A unit price: `100`.
- Internal line A total: `200`.
- Dealer line A unit price: `125`.
- Dealer line A total: `250`.
- Dealer totals match before save, save response, database snapshot, reopened quote, and converted order list.

## Evidence To Capture

- Screenshot or trace of dealer quote totals before save.
- Save mutation response or test assertion.
- Persisted pricing snapshot assertion.
- Reopened quote totals.
- Converted order list totals.

## Automated Evidence

2026-05-20:

- `bun test packages/sales/src/sales-form/domain/dual-pricing.test.ts`
  - Result: pass, 3 tests, 13 assertions.
  - Covers shared dual-pricing snapshot with internal `coefficient` and dealer `salesPercentage`.
- `bun test packages/db/src/queries/dealers.test.ts`
  - Result: pass, 6 tests, 19 assertions.
  - Covers dealer portal pricing snapshot separation and dealer isolation rules.

Remaining evidence:

- Browser/runtime proof for dealership quote composer display, save, reopen, and conversion.

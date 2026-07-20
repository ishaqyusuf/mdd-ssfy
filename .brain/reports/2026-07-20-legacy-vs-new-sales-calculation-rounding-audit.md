# Legacy vs New Sales Calculation and 2dp Rounding Audit

Date: 2026-07-20

Status: Implemented and verified

Scope: Legacy internal sales form, shared/new sales form, grouped workflow pricing, shelf persistence, print/mobile consumers, and payment-channel charge display.

## Final Verdict

Legacy and new sales calculations now share `decimal.js-light` money operations with `ROUND_HALF_UP` at two decimal places. Authoritative monetary results are rounded after their complete formula, line totals are summed directly, percentage discounts subtract, active HPT custom prices are final, and C.C.C remains separate from the order principal.

The intended contract is:

```text
grandTotal   = order principal excluding C.C.C
ccc          = derived card/link/terminal fee
totalWithCcc = grandTotal + ccc
```

Cash and other non-card methods return `ccc = 0` and `totalWithCcc = grandTotal`.

## Arithmetic Inventory

“2dp” means the published numeric value is rounded half up to two decimal places. Quantity-only operations are included for completeness but are not currency values.

| Calculation site | Operation and formula | Legacy result | New/shared result | Rounding location | Parity | 2dp guarantee |
|---|---|---:|---:|---|---|---|
| Money primitive | add: `Σ values` | Shared decimal addition | Shared decimal addition | Published sum | Yes | Yes |
| Money primitive | subtract: `value - Σ subtrahends` | Shared decimal subtraction | Shared decimal subtraction | Published difference | Yes | Yes |
| Money primitive | multiply: `a × b × …` | Shared decimal multiplication | Shared decimal multiplication | Completed product | Yes | Yes |
| Money primitive | divide: `value ÷ divisor` | Shared decimal division | Shared decimal division | Completed quotient; zero divisor returns zero | Yes | Yes |
| Percentage | `principal × percentage ÷ 100` | Shared decimal formula | Shared decimal formula | Completed percentage amount | Yes | Yes |
| Profile unit | `base ÷ coefficient` or `base × explicit multiplier` | Decimal direct division/product | Decimal direct division/product | Final unit | Yes | Yes |
| Ordinary line | `unrounded unit × qty` | Multiply before rounding | Multiply before rounding | Authoritative line total | Yes | Yes |
| Shelf row | `effective unit × qty` | Multiply before rounding | Multiply before rounding | `totalPrice` | Yes | Yes |
| Shelf group | `Σ row totalPrice` | Authoritative row sum | Authoritative row sum | Parent `lineTotal` | Yes | Yes |
| Door qty | `LH + RH`, with `totalQty` fallback | Same precedence | Same precedence | Quantity only | Yes | N/A |
| HPT shared surcharge | `Σ eligible step prices` | Decimal sum | Decimal sum | Published surcharge | Yes | Yes |
| HPT flat rate | `Σ flat-rate steps` | Decimal sum | Decimal sum | Published rate | Yes | Yes |
| HPT calculated unit | `door unit + shared + flat + addon` | Decimal sum | Decimal sum | Calculated unit | Yes | Yes |
| HPT custom unit | `custom` | Custom is final; addon not added again | Custom is final; addon not added again | Final unit | Yes | Yes |
| HPT row | `final unit × qty` | Multiply before rounding | Multiply before rounding | Row `lineTotal` | Yes | Yes |
| HPT parent | `Σ door lineTotal` | Authoritative row sum | Authoritative row sum | Parent total | Yes | Yes |
| HPT compatibility | `persisted total - hydrated sum` | Decimal reconciliation | Decimal reconciliation | Cent adjustment | Yes | Yes |
| Service row | `unitPrice × qty` | Multiply before rounding | Multiply before rounding | Row total | Yes | Yes |
| Service group | `Σ row totals` | Authoritative row sum | Authoritative row sum | Parent `lineTotal` | Yes | Yes |
| Moulding unit | `shared + component + addon`, or configured custom formula | Decimal composition | Decimal composition | Line product is authoritative | Yes | Yes for published total |
| Moulding row | `unit × qty` | Multiply before rounding | Multiply before rounding | Row total | Yes | Yes |
| Moulding group | `Σ row totals` | Authoritative row sum | Authoritative row sum | Parent `lineTotal` | Yes | Yes |
| Group display rate | `lineTotal ÷ qty` | 2dp display average | 2dp display average | Display-only `unitPrice` | Yes | Yes |
| Group reconciliation | `lineTotal - round(unitPrice × qty)` | Stored in metadata | Stored in metadata | `rateRoundingAdjustment` | Yes | Yes |
| Derived labor row | `labor rate × labor qty` | Decimal product | Decimal product | Row labor | Yes | Yes |
| Derived labor total | `Σ row labor` | Decimal sum | Decimal sum | Published labor | Yes | Yes |
| Subtotal | `Σ authoritative line totals` | Decimal sum | Decimal sum | Published subtotal | Yes | Yes |
| Fixed discount | `subtotal - fixed discount` | Subtracted | Subtracted | Adjusted subtotal/tax base | Yes | Yes |
| Percentage discount | `round(subtotal × pct ÷ 100)` then subtract | Recognized and subtracted | Recognized and subtracted | Discount amount, adjusted subtotal | Yes | Yes |
| Taxable base | `taxable lines + taxable delivery + taxable other - discounts` | Decimal add/subtract, clamped at zero | Decimal add/subtract, clamped at zero | Published taxable subtotal | Yes | Yes |
| Tax | `taxable subtotal × tax rate ÷ 100` | Decimal percentage | Decimal percentage | Published tax | Yes | Yes |
| Additional costs | `delivery + labor + flat labor + other` | Decimal sums | Decimal sums | Each published category and principal | Yes | Yes |
| Grand total | `subtotal - discounts + tax + delivery + labor + flat labor + other` | C.C.C-exclusive principal | C.C.C-exclusive principal | Published `grandTotal` | Yes | Yes |
| C.C.C | `grandTotal × ccc percentage ÷ 100` | Full principal base | Full principal base | Published `ccc` | Yes | Yes |
| Card display total | `grandTotal + ccc` | `totalWithCcc` | `totalWithCcc` | Published display total | Yes | Yes |
| Non-card display | `grandTotal + 0` | Zero C.C.C | Zero C.C.C | Published totals | Yes | Yes |
| Payment sum | `Σ successful/posted payment amounts` | Decimal sum | Decimal sum | Payment projection | Yes | Yes |
| Amount due | `max(grandTotal - net settled, 0)` | Decimal subtraction | Decimal subtraction | Accounting due | Yes | Yes |
| Overpayment | `max(net settled - grandTotal, 0)` | Decimal subtraction | Decimal subtraction | Projection overpayment | Yes | Yes |
| Dealer markup | `internal + internal × percentage ÷ 100` | New/dealer surface only | Decimal percentage and sum | Final dealer price | N/A | Yes |
| Print fallback row | `qty × unit` only when authoritative row total is absent | Decimal product | Decimal product | Printed fallback total | Yes | Yes |
| Moulding calculator cost | `pieces × unit price` | Decimal product | Decimal product | Currency total | Yes | Yes |

## Calculation Site Map

This is the source-level inventory for the arithmetic above. Calls that only format an already-rounded value for display (for example `value.toFixed(2)` in a price label) are not calculation sites and do not feed persistence, totals, payment, or synchronization.

| Source site | Monetary operations owned by the site | Authoritative output |
|---|---|---|
| `packages/sales/src/payment-system/domain/money.ts` | Shared add, subtract, multiply, divide, percentage, sum, and half-up rounding | Two-decimal number at every published money boundary |
| `packages/sales/src/payment-system/domain/payment-channel-charge.ts` | `ccc = principal × pct ÷ 100`; `totalWithCcc = principal + ccc` | `baseAmount`, `amount`, `chargeAmount` |
| `packages/sales/src/payment-system/domain/order-payment-projection.ts` | payment/refund sums, due subtraction, overpayment subtraction | Accounting projection against C.C.C-exclusive principal |
| `packages/sales/src/payment-system/domain/display-ccc.ts` | stored-versus-derived C.C.C comparison and display total | Display-only C.C.C and total |
| `packages/sales/src/payment-system/infrastructure/canonical-mirror.ts` | canonical payment amount normalization | Two-decimal payment mirror values |
| `packages/sales/src/sales-form/domain/costing.ts` | legacy/current subtotal, discounts, percentage discount, tax base, tax, delivery/labor/flat-labor/other-cost sums, grand total, C.C.C | Shared summary contract |
| `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts` | legacy grouped subtotal, fixed/percentage discount subtraction, labor, tax, principal and C.C.C | Legacy form pricing metadata |
| `packages/sales/src/sales-form/domain/workflow-calculators.ts` | HPT/service/shelf/moulding unit composition, row products, grouped sums, display averages and reconciliation adjustment | Authoritative grouped `lineTotal` and display `unitPrice` |
| `packages/sales/src/sales-form/domain/grouping.ts` | legacy sibling grouping/expansion, row products, grouped sums and display-average reconciliation | Legacy-compatible grouped metadata |
| `packages/sales/src/sales-form/domain/hpt-compatibility.ts` | HPT custom/calculated unit selection, row products, parent sums and persisted-cent reconciliation | HPT row and parent totals |
| `packages/sales/src/sales-form/domain/profile-repricing.ts` and `dual-pricing.ts` | base/coefficient division, multiplier products, dealer percentage markup | Repriced units and lines |
| `packages/sales/src/sales-form/application/record-normalization.ts` | save/hydrate money normalization, payment total projection | Numeric sales record boundary |
| `packages/sales/src/sales-form/state/actions/line-items.ts` | ordinary line `qty × unit` | Authoritative ordinary line total |
| `packages/sales/src/sales-form/ui/workflow/workflow-line-totals.ts` | grouped row fallback products and sums | UI summary line total |
| `packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts` and `workflow-sync-patches.ts` | grouped average division and reconciliation metadata | Persisted/synchronized authoritative total |
| `packages/sales/src/sales-form/ui/workflow/door-price-update.ts`, `door-pricing.ts`, `door-utils.ts`, and `workflow-door-actions.ts` | door unit composition, quantity products and profile division | Door row price fields |
| `packages/sales/src/sales-form/ui/workflow/shelf-helpers.ts`, `shelf-row-products.ts`, and `shelf-inline-items-editor.tsx` | shelf unit selection and `qty × unit` | Shelf row total |
| `packages/sales/src/sales-form/ui/workflow/moulding-calculator.ts` and `moulding-line-items-editor.tsx` | moulding price composition and products | Moulding row total |
| `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` and shared workflow panels | web edit-time products/sums using shared helpers | Draft row/line totals |
| `apps/api/src/db/queries/new-sales-form.ts` | save-time money normalization, summary persistence, payment sums, shelf Decimal conversion | Relational sales record and numeric API response |
| `apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/save-sales/item-helper-class.ts` and mirrored app path | legacy shelf write rounding and numeric conversion | Decimal-compatible shelf persistence |
| `packages/sales/src/print/compose/service-sections.ts` and `moulding-sections.ts` | authoritative total read; decimal product only as absent-total fallback; display average division | Printed grouped rows |
| `packages/sales/src/sync-sales-inventory-line-items.ts` and `sales-inventory-overview.ts` | Decimal-to-number boundary and two-decimal price snapshots/aggregates | Inventory synchronization/read models |
| `apps/expo-app/src/features/sales/invoice-form/lib/calculate-summary.ts` and invoice store/components | shared summary consumption and card display total selection | Mobile summary/display |

## Intentional Display-versus-Authoritative Difference

Grouped service, shelf, and moulding lines retain `lineTotal` as authoritative. `unitPrice` is only a two-decimal average for display.

Example:

```text
lineTotal                  30.05
quantity                    3
display unitPrice          10.02
unitPrice × quantity       30.06
rateRoundingAdjustment     -0.01
totalAuthoritative          true
```

Save, print, payment, summary, and synchronization paths consume `lineTotal`; they must not reconstruct `$30.05` from the displayed `$10.02` rate.

## Shelf Decimal Migration

`DykeSalesShelfItem.unitPrice` and `totalPrice` changed from `Int` to `Decimal(12,2)`. Prisma generated `20260720081100_sales_shelf_decimal_prices` in an isolated scratch database because the normal local database has unrelated migration drift. No reset or destructive operation was run against the development database.

Read-only development baseline before migration:

| Metric | unitPrice | totalPrice |
|---|---:|---:|
| Row count | 366 | 366 |
| Null count | 4 | 0 |
| Minimum | 0 | 0 |
| Maximum | 636 | 1379 |
| Aggregate sum | 34010 | 58749 |

Isolated legacy-row conversion proof:

| Metric | Before `Int` | After `Decimal(12,2)` |
|---|---:|---:|
| Row count | 2 | 2 |
| Unit null count | 1 | 1 |
| Total null count | 0 | 0 |
| Unit min/max/sum | 12 / 12 / 12 | 12.00 / 12.00 / 12.00 |
| Total min/max/sum | 0 / 24 / 24 | 0.00 / 24.00 / 24.00 |

A Prisma update/reload after migration returned numeric domain values `{ unitPrice: 12.34, totalPrice: 24.68 }`.

## Boundary Rules

- Prisma Decimal shelf values are converted with `Number(...)` in legacy DTO, new-form hydration, and inventory synchronization query boundaries.
- Shelf writes use `roundMoney`; whole-dollar `Math.round` was removed.
- API inputs and web/mobile contracts remain numeric for compatibility.
- `SalesOrders.grandTotal` and `amountDue` remain C.C.C-exclusive accounting values.
- Card/link/terminal review surfaces use `totalWithCcc`.
- API hydration no longer subtracts and later re-adds C.C.C by mutating `grandTotal`.

## Focused Verification

Covered behaviors:

- `1.005 → 1.01`
- `2.675 → 2.68`
- `-1.005 → -1.01`
- `0.1 + 0.2 → 0.30`
- `77.896 × 3 → 233.69`
- `$100 × 10% = $10.00`, resulting in `$90.00`
- HPT custom `$10` plus addon `$5` remains `$10.00`
- grouped `$30.05 ÷ 3` displays `$10.02` and retains `$30.05`
- shelf `$12.34` / `$24.68` round-trip through Decimal storage
- C.C.C includes delivery, labor, flat labor, and other applicable costs
- non-card methods produce zero C.C.C

Focused suites passed. Broad package typechecks remain blocked by unrelated repository baseline diagnostics; filtered output showed no remaining task-specific diagnostics after Decimal boundary normalization.

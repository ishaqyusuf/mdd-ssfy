# New Sales Form Phase 0 Fixture Catalog

Date: 2026-05-20
Status: Active
Owner: Sales Form Rebuild Team

## Purpose

Define deterministic fixtures required to prove `new-sales-form` parity before
Phase 1 pricing fixes are considered complete.

This catalog does not create seed data by itself. It defines the fixture shape,
expected behavior, and validation targets. Test data builders and browser repros
should reference these fixture IDs.

## Shared Rules

- Currency values are rounded to two decimals.
- Internal `www` customer profiles use `coefficient`.
- Dealer profiles use `salesPercentage`, not `coefficient`.
- For dealer quotes, dealer-facing unit price is:
  `baseUnitPrice * internalCoefficient * (1 + salesPercentage / 100)`.
- Unless a fixture explicitly tests an override, flat `lineTotal` is derived from `qty * unitPrice`.
- Every fixture must validate before save, save response, persisted values, and reopen values.

## Fixture Index

| Fixture ID | Surface | Purpose | Primary Validation |
| --- | --- | --- | --- |
| `NSF-FLAT-001` | `www` order/quote | Basic flat line pricing and tax baseline. | Costing summary |
| `NSF-DOOR-001` | `www` order | Door component selection and component-derived price. | Step/component pricing |
| `NSF-HPT-001` | `www` order | HPT multiple door sizes with supplier-specific pricing. | HPT total and save/reopen |
| `NSF-SHELF-001` | `www` order/quote | Shelf section/category/product rollups. | Shelf subtotal and persistence |
| `NSF-MOULDING-001` | `www` order/quote | Grouped moulding rows, default qty, calculator total. | Grouped row rollup |
| `NSF-SERVICE-001` | `www` order/quote | Service qty/rate, tax flag, production flag. | Taxable subtotal and metadata |
| `NSF-MIXED-001` | `www` order | Mixed line order with all major line families. | End-to-end total consistency |
| `NSF-RECOVERY-001` | `www` order | Dirty local recovery after refresh. | Recovery UX |
| `DSF-FLAT-001` | dealership quote | Dealer percentage pricing on flat quote lines. | Dual pricing snapshot |
| `DSF-CONVERT-001` | dealership quote/order | Quote conversion preserves dealer/internal pricing. | Conversion persistence |

## `NSF-FLAT-001`: Basic Flat Line

Surface:

- `www` order
- `www` quote

Inputs:

- Customer profile coefficient: `1.25`
- Tax rate: `10`
- Line A: qty `2`, base unit price `80`
- Line B: qty `1`, base unit price `40`, non-taxable if supported by line flag

Expected:

- Profile-adjusted taxable unit price for Line A: `100`
- Line A total: `200`
- Line B behavior depends on whether non-taxable flat rows are supported in current UI; document actual flag source in repro.
- Tax calculation must match taxable subtotal only.

Validation:

- Unit: shared costing/profile repricing.
- Integration: save/reopen summary.

## `NSF-DOOR-001`: Door Component Pricing

Surface:

- `www` order

Inputs:

- Customer profile coefficient: `1.25`
- Door step with one selected root component.
- At least one dependent component with price bucket.
- One component variation rule that hides another component.

Expected:

- Visible component list matches route/dependency rules.
- Selected component contributes calculated sales price, not raw base price, where legacy does.
- Line total changes immediately after component selection.

Validation:

- Unit: step engine, visibility, dependency pricing.
- Browser/manual: component card and total update.

## `NSF-HPT-001`: HPT Supplier And Size Pricing

Surface:

- `www` order

Inputs:

- Customer profile coefficient: `1.25`
- Door/HPT line with supplier A and supplier B.
- Size rows:
  - `2-6 x 6-8`, qty `2`
  - `3-0 x 8-0`, qty `1`
- Supplier-specific bucket prices for each size.
- Shared component surcharge.

Expected:

- Supplier switch updates modal and row pricing immediately.
- HPT estimate equals sum of size row totals plus configured component/surcharge contributors.
- Estimate breakdown lists the contributors.
- Save/reopen keeps supplier, size, qty, swing/no-handle metadata, and total.

Validation:

- Unit: workflow calculators and door pricing.
- Integration: save/reopen.
- Browser/manual: modal supplier switch and breakdown.

## `NSF-SHELF-001`: Shelf Section Rollup

Surface:

- `www` order
- `www` quote

Inputs:

- Customer profile coefficient: `1.25`
- Two shelf sections.
- Each section has one category and at least one product.
- One row uses default product price.
- One row uses custom/edited price if supported.

Expected:

- Row totals derive from qty and effective unit price.
- Section subtotal equals sum of section rows.
- Parent line total equals sum of all section rows.
- Save/reopen preserves section/category/product identity.

Validation:

- Unit: shelf summarizer.
- Integration: save/reopen.

## `NSF-MOULDING-001`: Grouped Moulding Rows

Surface:

- `www` order
- `www` quote

Inputs:

- Customer profile coefficient: `1.25`
- Select two moulding components.
- Fresh selected rows with no stored qty.
- Calculator/edit flow changes one row qty and one row addon/custom amount.

Expected:

- Fresh selected moulding rows default qty to `1`.
- Parent line total equals grouped row total.
- Existing grouped row IDs are preserved on save.
- Removed rows do not reappear after reopen.

Validation:

- Unit: moulding row builder/summarizer.
- Integration: grouped persistence.
- Browser/manual: calculator behavior.

## `NSF-SERVICE-001`: Service Rows With Tax And Production Flags

Surface:

- `www` order
- `www` quote

Inputs:

- Customer profile coefficient: `1.25`
- Two service rows:
  - Row A taxable and produceable.
  - Row B non-taxable and not produceable.
- Tax rate: `10`

Expected:

- Only taxable service rows contribute to taxable subtotal.
- Production flag persists through save/reopen.
- Parent line total equals service row total.

Validation:

- Unit: costing tax scope.
- Integration: save/reopen metadata.

## `NSF-MIXED-001`: Full Mixed Order

Surface:

- `www` order

Inputs:

- Contains one line each from:
  - flat
  - door
  - HPT
  - shelf
  - moulding
  - service
- Tax rate: `10`
- Customer profile coefficient changes from `1.0` to `1.25` during edit.
- Payment method changes to credit card if surcharge remains supported.

Expected:

- Profile change recomputes all eligible line families exactly once.
- Tax and surcharge recalculate from current values.
- Save/reopen summary matches pre-save display.

Validation:

- Unit: pricing/repricing.
- Integration: save/reopen.
- Browser/manual: profile change and summary panel.

## `NSF-RECOVERY-001`: Dirty Local Recovery

Surface:

- `www` order

Inputs:

- Existing order with at least two line families.
- Disable network or refresh before autosave completes.

Expected:

- Dirty edits write local recovery snapshot.
- Reload offers restore/dismiss.
- Restore applies local line items, extra costs, summary, and meta without changing server version.

Validation:

- Browser/manual.

## `DSF-FLAT-001`: Dealer Percentage Flat Quote

Surface:

- dealership quote

Inputs:

- Internal profile coefficient: `1.25`
- Dealer profile `salesPercentage`: `25`
- Tax rate: `10`
- Line A: qty `2`, base unit price `80`
- Line B: qty `1`, base unit price `40`

Expected:

- Internal Line A unit price: `100`
- Internal Line A total: `200`
- Dealer Line A unit price: `125`
- Dealer Line A total: `250`
- Internal subtotal: `(80 * 1.25 * 2) + (40 * 1.25 * 1) = 250`
- Dealer subtotal: `312.50`
- Internal tax: `25`
- Dealer tax: `31.25`
- Internal grand total: `275`
- Dealer grand total: `343.75`

Validation:

- Unit: shared dual-pricing and `packages/db/src/queries/dealers.ts`.
- Integration: dealer quote save/reopen.
- Browser/manual: quote composer display.

## `DSF-CONVERT-001`: Dealer Quote Conversion

Surface:

- dealership quote/order

Inputs:

- Saved `DSF-FLAT-001` quote.

Expected:

- Conversion changes quote to order with new order identity.
- Dealer/internal pricing snapshot remains available.
- Dealer order list shows dealer-facing total.
- Internal systems can still access internal total for fulfillment/accounting.

Validation:

- Integration: `convertDealerPortalQuoteToOrder`.
- Browser/manual: quote list to order list.

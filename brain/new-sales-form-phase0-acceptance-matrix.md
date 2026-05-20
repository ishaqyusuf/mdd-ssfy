# New Sales Form Phase 0 Acceptance Matrix

Date: 2026-05-20
Status: Active
Owner: Sales Form Rebuild Team

## Purpose

Define the concrete acceptance contract for completing the `new-sales-form`
migration across `www` and `dealership`.

This document is the Phase 0 gate for implementation work. It complements:

- `brain/new-sales-form-phase0-repro-matrix.md`
- `brain/new-sales-form-parity-test-matrix.md`
- `brain/new-sales-form-missing-features-execution-plan.md`
- `brain/new-sales-form-parity-audit.md`
- `brain/new-sales-form-phase0-validation-log.md`
- `brain/new-sales-form-phase0-task-map.md`

## Pricing Profile Rule

Internal `www` customer profiles use `coefficient`.

Dealer customer profiles use `salesPercentage`, not `coefficient`.

Dealer quote pricing must be interpreted as:

1. Apply the internal profile `coefficient` to the base unit price to produce the internal unit price.
2. Apply dealer `salesPercentage` on top of the internal unit price to produce the dealer-facing unit price.

Example:

- Base unit price: `$80`
- Internal coefficient: `1.25`
- Dealer sales percentage: `25`
- Internal unit price: `$100`
- Dealer unit price: `$125`

Dealer acceptance scenarios must never treat dealer profiles as a raw multiplier coefficient.

## Phase 0 Exit Gate

Phase 0 is complete only when all of these are true:

- Every required workflow below has acceptance criteria.
- Every P1/P2 pricing, save, or data-loss risk has a test target or repro artifact.
- Fixture coverage exists for flat, door, HPT, shelf, moulding, service, mixed, and dealer quote flows.
- Dealer profile percentage behavior is covered in both client-facing and server-facing acceptance criteria.
- Each row is assigned a validation mode: unit, integration/API, browser/manual, or intentionally different.
- Validation runs and blockers are recorded in `brain/new-sales-form-phase0-validation-log.md`.
- Failing or partial rows are mapped to implementation task IDs in `brain/new-sales-form-phase0-task-map.md`.

## Workflow Matrix

| Area | Workflow | Acceptance Criteria | Validation Mode | Artifact Target | Status |
| --- | --- | --- | --- | --- | --- |
| `www` order | Create order with customer from query param | Bootstrap preselects customer, resolves profile/tax data, first save creates order and redirects to edit route. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/create-order-query-customer/` | Pending |
| `www` order | Create order with customer modal | Required customer selector blocks editing until customer is selected; selected customer applies default profile and tax state. | Browser/manual | `brain/new-sales-form-parity-evidence/create-order-customer-modal/` | Pending |
| `www` order | Edit existing order | Existing order hydrates line items, grouped child rows, summary, payment status, inventory status, and version. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/edit-order-hydration/` | Pending |
| `www` order | Save draft | Dirty form flushes through save draft/autosave path, updates `salesId`, `slug`, `orderId`, `version`, and recovery state. | Integration | `apps/api/src/db/queries/new-sales-form.test.ts` | Pending |
| `www` order | Save final | Save final validates customer and at least one line, persists final payload, updates history/event/stat side effects. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/save-final-order/` | Pending |
| `www` order | Save and close | Dirty form flushes before navigation to `/sales-book/orders`; clean form logs required inbound status without forcing save. | Browser/manual | `brain/new-sales-form-parity-evidence/save-close-order/` | Pending |
| `www` order | Save and new | Dirty form flushes, clears selected customer query, navigates to create route with fresh state. | Browser/manual | `brain/new-sales-form-parity-evidence/save-new-order/` | Pending |
| `www` order | Print invoice | Dirty form saves first, stale form blocks print, saved form prints/regenerates current invoice snapshot. | Browser/manual | `brain/new-sales-form-parity-evidence/print-invoice/` | Pending |
| `www` order | Packing actions | Send/cancel/complete packing are disabled until saved and invalidate dispatch/sales queries after success. | Browser/manual | `brain/new-sales-form-parity-evidence/packing-actions/` | Pending |
| `www` order | Payment method review | Existing unpaid order prompts when payment method is missing or non-credit-card, and dismissal persists. | Browser/manual | `brain/new-sales-form-parity-evidence/payment-method-review/` | Pending |
| `www` quote | Create quote | Quote creation mirrors order create minus order-only inventory/packing/payment prompts. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/create-quote/` | Pending |
| `www` quote | Edit quote | Existing quote hydrates and saves without order-only side effects. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/edit-quote/` | Pending |
| `www` quote | Print quote | Dirty quote saves before print; output uses quote mode and current totals. | Browser/manual | `brain/new-sales-form-parity-evidence/print-quote/` | Pending |
| `dealership` quote | Create dealer quote | Dealer selects customer/profile, enters flat lines, sees dealer-facing total from internal coefficient plus dealer `salesPercentage`. | Unit + integration + browser/manual | `brain/new-sales-form-parity-evidence/dealer-create-quote/` | Pending |
| `dealership` quote | Edit dealer quote | Dealer quote rehydrates customer, profile, tax, lines, dealer-facing totals, and internal snapshot. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/dealer-edit-quote/` | Pending |
| `dealership` quote | Save dealer quote | Saved quote stores internal and dealer pricing snapshots; displayed total equals saved/reopened total. | Unit + integration | `packages/db/src/queries/dealers.test.ts` | Pending |
| `dealership` quote | Convert quote to order | Conversion preserves pricing snapshot, changes identity/type/status, and order appears in dealer order list. | Integration + browser/manual | `brain/new-sales-form-parity-evidence/dealer-convert-quote/` | Pending |

## Feature Matrix

| Feature | Acceptance Criteria | Validation Mode | Existing Reference | Status |
| --- | --- | --- | --- | --- |
| Customer profile repricing | Changing `www` customer/profile recomputes line/group totals from old to new coefficient without double multiplication. | Unit + integration | `brain/new-sales-form-parity-test-matrix.md` A8 | Pending runtime proof |
| Dealer profile percentage pricing | Dealer `salesPercentage` adjusts internal price by percentage; dealer profiles do not use `coefficient`. | Unit + integration | `packages/sales/src/sales-form/domain/dual-pricing.ts` | Pending explicit gate |
| Tax recalculation | Tax rate/profile changes immediately update taxable subtotal, tax, and grand total before save and after reopen. | Unit + integration | `brain/new-sales-form-phase0-repro-matrix.md` row 11 | Pending runtime proof |
| Flat line totals | Flat line total is derived from qty/unit price unless an explicit override contract exists. Dealer UI must not expose misleading editable totals. | Unit + UI inspection | review finding | Pending |
| Door/HPT pricing | Component price, supplier price, size qty, shared surcharge, no-handle, and swing settings roll into HPT totals. | Unit + browser/manual | `brain/new-sales-form-phase0-repro-matrix.md` rows 3, 5, 6 | Pending runtime proof |
| Shelf pricing | Product price, quantity, profile adjustment, section subtotal, and line total match before save, after save, and after reopen. | Unit + integration | `brain/new-sales-form-phase0-repro-matrix.md` row 9 | Pending runtime proof |
| Moulding pricing | New moulding rows default qty to 1 and grouped rows roll up to the parent line total. | Unit + integration | `brain/new-sales-form-phase0-repro-matrix.md` rows 1, 7 | Pending runtime proof |
| Service pricing | Service qty/rate/tax/production flags affect totals and persist through save/reopen. | Unit + integration | `brain/new-sales-form-phase0-repro-matrix.md` row 10 | Pending runtime proof |
| Local recovery | Unsaved dirty edits are recovered after refresh/network interruption or safely dismissed. | Browser/manual | `brain/new-sales-form-phase0-repro-matrix.md` row 8 | Pending runtime proof |
| Load error state | Failed bootstrap/get displays retry UI instead of indefinite skeleton. | UI test/manual | review finding | Pending |
| Header actions | `www` and dealership only show actions that are wired and meaningful for that surface. | UI test/manual | review finding | Pending |

## Validation Rule

For every pricing scenario in Phase 1, compare the same totals across four checkpoints:

1. Client visible summary before save.
2. Save mutation response.
3. Database persisted order fields and pricing snapshot.
4. Reopened form summary.

The scenario passes only when all four checkpoints agree after expected rounding.

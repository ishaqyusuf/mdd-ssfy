# Sales Form System Hardening Plan

Date: 2026-03-12
Owner: Sales Form Team
Status: In progress (Phase 0 implementation complete; runtime rollout gates remain)

## Objective

Stabilize legacy sales-form runtime correctness (pricing, save consistency, and UX behavior) while preserving current workflow velocity.

## Scope

- `apps/www/src/components/forms/sales-form/*`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/*`
- `apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/save-sales/*`

## Coordination Note

This hardening stream remains the authority for save/pricing correctness and transaction safety.

Related but separate work now lives in:

- `brain/legacy-sales-form-mobile-architecture-plan.md`

That plan owns:

- mobile UX cleanup
- domain/folder re-architecture
- legacy class/helper centralization
- save-flow separation at the frontend application/server boundary

Hard rule:

- UX/architecture refactors must not weaken Phase 0/1 hardening requirements.
- Save-path extraction should preserve server-authoritative pricing and transaction safety as non-negotiable constraints.

## Priority Findings (From System Audit)

1. `P0` Save path transaction integrity is unsafe.
2. `P0` Server accepts client-calculated money fields as authoritative.
3. `P1` Pricing update can be skipped when labor row is absent.
4. `P1` Taxable amount storage is inconsistent with computed tax base.
5. `P1` Subtotal UI derives from grand total instead of source subtotal.
6. `P1` Store update model mutates nested state in-place.
7. `P2` Step/component selection counter logic bug.
8. `P2` Auto-scroll side effects cause interaction jank.
9. `P2` Type duplication/dead code and debug logs increase maintenance risk.
10. `P2` Save orchestration fires side effects before hard error short-circuit.

## Execution Phases

### Phase 0: Safety Baseline (Schema + API)

- Rebuild save writes to use real transaction-scoped DB client (`tx`) only.
- Enforce server-side recomputation/validation of pricing totals before persist.
- Add explicit save-failure short-circuit before post-save side effects.
- Add regression fixtures for mixed lines (HPT, moulding, service, shelf).

Exit gate:
- Save operation is atomic in integration tests.
- Tampered money payloads are rejected or corrected server-side.

Implementation status (2026-07-22): complete in the current API path. `saveNewSalesFormInternal`
normalizes line items, recomputes the summary from server-side line/extra-cost
inputs, persists all order and relation writes through the transaction client,
and only queues bounded post-save work after the transaction resolves. The
relational parity fixtures cover mixed door/shelf/service/moulding saves and
re-save replacement; the main and multi-line suites pass with 29 tests / 237
assertions, plus the post-save timeout/rejection suite (3 tests / 8 assertions).
Remaining rollout evidence is authenticated browser/runtime proof against the
real database, not another save-path implementation change.

### Phase 1: Pricing Integrity (API + UI)

- Fix `CostingClass` writeback to always update `metaData.pricing`.
- Align taxable bookkeeping (`taxxable`) with actual discounted taxable base.
- Normalize subtotal presentation to use `pricing.subTotal`.
- Add unit tests for discount/tax/labor/flat-labor/card-charge interactions.

Completed slice (2026-07-17):
- `CostingClass.softCalculateTotalPrice()` now preserves the taxable line subtotal accumulated by `calculateTotalPrice()`, adds the existing delivery/eligible extra-cost basis, applies the discount, clamps at zero, and stores that discounted taxable base.
- Regression coverage proves unchecked service/labor lines are excluded, checked services and products remain taxable, mixed orders tax only eligible lines, oversized discounts clamp taxable subtotal to zero, negative discounts stay consistent across subtotal and tax, and delivery/eligible extra-cost behavior is preserved.

Follow-up slice (2026-07-22):
- Removed the legacy pricing-writeback dependency on a present `Labor`
  extra-cost row. Totals now always persist to `metaData.pricing`; the derived
  labor amount is written back only when that optional row exists.
- Added a no-Labor-row regression fixture to the legacy `CostingClass` suite
  (10 tests / 38 assertions passing). Taxable consistency and subtotal output
  remain covered by the existing focused matrix; authenticated UI parity is
  still a separate rollout gate.
- Updated the legacy sales summary to render `pricing.subTotal` directly in
  both summary surfaces instead of deriving it from grand total minus tax.
  Added a source regression for the authoritative field (11 tests / 40
  assertions across the focused costing/subtotal gate).
- Hardened sparse service rows so missing `formData.meta` is treated as
  non-taxable instead of throwing during `calculateTotalPrice()`. Added focused
  coverage for sparse service metadata and the Labor + FlatLabor + card-charge
  composition (13 tests / 50 assertions across the costing/subtotal gate).

Phase 2 cleanup slice (2026-07-22):
- Removed raw `console.log` diagnostics from the legacy supplier badge, HPT
  line context, quantity input, and moulding calculator production paths.
- Added a static regression scan covering all four files (1 test / 4
  assertions). A second scan covers the door-size modal opener, step helper,
  dispatch control utility, sales-progress loader, and shipping DTO after the
  remaining legacy traces were removed (1 test / 5 assertions). No interaction
  or data contract changed.

Exit gate:
- Deterministic parity tests pass for subtotal/tax/grandTotal permutations.

### Phase 2: State and Interaction Reliability (UI)

- Move store updates to immutable-safe semantics (introduce `immer` middleware or equivalent patterns).
- Remove forced step-content auto-scroll behavior.
- Fix selection count precedence bug and validate component selection flows.
- Clean debug `console.log` traces in production-path components/classes.

Exit gate:
- No stale state/race behavior in item-step switching and grouped edits.

### Phase 3: Typing and Maintainability (Schema + UI + Validation)

- Remove duplicate type declarations and consolidate `sales` form types.
- Remove dead placeholder hooks/files or implement them.
- Add type-level guards for `metaData` and pricing structures.

Exit gate:
- No duplicate interfaces in core sales types.
- Touched modules pass focused type checks.

### Phase 4: Hardening Validation and Rollout (Validation + Polish)

- Run end-to-end scenario matrix:
  - customer/profile change repricing
  - service taxable toggles
  - labour + flat labor interaction
  - save/reload parity
  - sidebar/tab interaction on large and small screens
- Add rollback notes and production verification checklist.

Exit gate:
- All matrix scenarios pass in staging with no pricing drift.

## Suggested Implementation Order

1. Phase 0 (`P0` blockers)
2. Phase 1 (`P1` math correctness)
3. Phase 2 (`P1/P2` UX-state reliability)
4. Phase 3 (`P2` maintainability)
5. Phase 4 (rollout confidence)

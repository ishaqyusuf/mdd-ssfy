# Sales Form System Hardening Plan

Date: 2026-03-12
Owner: Sales Form Team
Status: Proposed

## Objective

Stabilize legacy sales-form runtime correctness (pricing, save consistency, and UX behavior) while preserving current workflow velocity.

## Scope

- `apps/www/src/components/forms/sales-form/*`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/*`
- `apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/save-sales/*`

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

### Phase 1: Pricing Integrity (API + UI)

- Fix `CostingClass` writeback to always update `metaData.pricing`.
- Align taxable bookkeeping (`taxxable`) with actual discounted taxable base.
- Normalize subtotal presentation to use `pricing.subTotal`.
- Add unit tests for discount/tax/labor/flat-labor/card-charge interactions.

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

# Plan: Legacy and New Sales Calculation Two-Decimal Gap Closure

## Type

Correctness fix and compatibility hardening

## Status

Proposed. Analysis is complete; implementation is not yet authorized.

## Created Date

2026-07-30

## Objective

Close the remaining arithmetic, persistence, and display gaps between the
legacy and new sales forms so every published monetary value follows ADR-016:
complete the formula first, round half up to two decimal places once at the
money boundary, and preserve authoritative grouped totals.

## Governing Invariants

1. Profile pricing is `base price ÷ coefficient`, rounded once after division.
2. A coefficient reciprocal is not a two-decimal money value and must not be
   rounded before it is applied.
3. Component money is aggregated with the canonical Decimal-backed helpers, not
   JavaScript `+`.
4. Authoritative line and row totals are persisted and consumed directly.
5. Grouped display rates may differ from authoritative totals by the documented
   reconciliation adjustment.
6. `grandTotal` excludes C.C.C.; `totalWithCcc` includes C.C.C.
7. Quantity arithmetic remains numeric and must not be forced into currency
   formatting.
8. Existing custom-price and HPT-final-price behavior must not change.

## Acceptance Examples

| Case | Required result |
| --- | ---: |
| `$100 ÷ 0.67` | `$149.25` |
| `$100 ÷ 0.60` | `$166.67` |
| `$0.10 + $0.20` | published and persisted as `$0.30` |
| `$1.005` at a money boundary | `$1.01` |
| Grouped `$30.05 ÷ 3` | display rate `$10.02`, authoritative total `$30.05` |
| Whole-dollar money label/input | `$10.00` |
| Quantity `10` | `10`, not `10.00` unless the quantity control explicitly requires decimals |

## Detailed Execution Plan

### Phase 0: Freeze the Contract with Failing Regression Tests

1. Add table-driven coefficient cases for `0.67`, `0.60`, `1`, missing, and
   invalid coefficients.
2. Cover all profile entry paths:
   - fresh new-form component/door selection;
   - new-form profile repricing;
   - legacy `CostingClass.salesProfileChanged()`;
   - legacy hydration/base-price recovery;
   - dual internal/dealer pricing.
3. Change the dual-pricing expectation for coefficient `0.67` from `$149.00`
   to `$149.25`; keep dealer percentage markup as a separate completed formula.
4. Add `0.10 + 0.20` aggregation tests to the mutation engine and each workflow
   selection/edit/removal action that publishes step `price` or `basePrice`.
5. Add an API save/reload regression proving item rates/totals and step
   price/basePrice values return at two decimals without binary tails.
6. Add focused render tests for the four legacy labels and a currency-input
   test proving `$10.00` display without changing quantity controls.

Validation gate: confirm the new tests fail for the identified gaps and pass for
the already-correct fresh-selection path before production code changes.

### Phase 1: Make Profile Pricing a Single Canonical Formula

1. Add profile-specific helpers in the shared sales-form domain:
   - calculate sales price directly from base price and coefficient;
   - recover base price directly from sales price and coefficient;
   - reprice a current sales value across coefficients with one completed
     multiply/divide formula when no base price is available.
2. Keep Decimal operations inside the canonical money boundary. If the fallback
   ratio needs a new primitive, add a multiply-then-divide helper that rounds
   only its final result.
3. Remove staged `divideMoney(1, coefficient)` followed by
   `multiplyMoney(base, multiplier)` from:
   - `profile-repricing.ts`;
   - `dual-pricing.ts`;
   - legacy `costing-class.ts`;
   - legacy `zus-form-helper.ts`;
   - `workflow-door-actions.ts`;
   - `door-utils.ts`;
   - `cost-price-breakdown-hover.tsx`;
   - any other calculation call site found by the final reciprocal search.
4. Allow an unrounded reciprocal only for non-authoritative display or
   diagnostic use. Name it as a ratio, never as money.
5. Preserve explicit dealer `salesPercentage` as a separate markup applied
   after canonical internal pricing.

Validation gate: every covered path must produce `$149.25` for `$100 / 0.67`
and `$166.67` for `$100 / 0.60`, including after a profile change and reload.

### Phase 2: Replace Raw Monetary Aggregation

1. Replace raw selected-component money reducers with `sumMoney` in:
   - `mutation-engine.ts`;
   - `workflow-selection-actions.ts`;
   - `workflow-component-edit-actions.ts`;
   - `workflow-door-actions.ts`;
   - `workflow-moulding-actions.ts`.
2. Normalize both `totalSales` and `totalBase`; leave quantity/count reducers
   unchanged.
3. Replace the workflow component admin snapshot multiplication with
   `multiplyMoney`.
4. Search the full legacy/new sales trees for remaining raw `+`, `-`, `*`, `/`,
   `reduce`, `toFixed`, `Math.round`, and native `formatMoney` usage. Classify
   each result as money, quantity, display-only, or compatibility fallback.
5. Add a brief source comment only where a raw operation is intentionally
   quantity-only or an authoritative-total fallback is subtle.

Validation gate: no selected-component price or base-price publisher returns
`0.30000000000000004`; grouped total reconciliation tests remain unchanged.

### Phase 3: Normalize Every Persistence Boundary

1. In `apps/api/src/db/queries/new-sales-form.ts`, normalize monetary fields
   immediately before Prisma writes, including:
   - `SalesOrderItems.rate` and `total`;
   - `DykeStepForm.price` and `basePrice`;
   - door unit/line prices;
   - applicable custom, addon, labor, delivery, discount, tax, and order
     summary fields.
2. Preserve incoming authoritative grouped `lineTotal`; do not reconstruct it
   from the two-decimal display average.
3. Apply the same normalization to legacy save/update paths and any mobile or
   sync writer that can bypass the new-form query.
4. Normalize hydration only as a compatibility guard. Do not use read-time
   rounding to hide an unsafe write path.
5. Add save/reload fixtures for ordinary, service, shelf, moulding, HPT, and
   multi-selection lines.

Validation gate: persisted and reloaded monetary fields have at most two
fractional digits and retain authoritative grouped totals exactly.

### Phase 4: Close Visible Two-Digit Formatting Gaps

1. Replace the legacy `step-section.tsx` numeric string interpolation with the
   shared currency formatter.
2. Give the three legacy `NumberFlow` price labels an explicit currency format
   with two minimum and maximum fraction digits:
   - `door-size-select.tsx`;
   - both price locations in `takeoff-component.tsx`.
3. Add a currency-specific fixed-two-decimal mode to the shared number input,
   or pass `fixedDecimalScale` only from monetary callers.
4. Audit callers before changing defaults because the same input component is
   also used for quantities.
5. Check empty, zero, negative-credit, and large-value rendering in light and
   dark modes.

Validation gate: whole-dollar monetary values render as `$10.00`; quantity
fields preserve their current display and edit behavior.

### Phase 5: Gate and Execute Database Decimal Hardening

1. Run a read-only production-shaped audit for fractional precision, nulls,
   ranges, and outliers in the remaining Float monetary columns:
   - order subtotal, tax, grand total, and amount due;
   - item rate and total;
   - door prices;
   - step prices;
   - other sales monetary Float fields found in the schema inventory.
2. Decision point:
   - if all writers are provably centralized and bounded, ship application
     normalization first and schedule schema hardening independently;
   - otherwise migrate the monetary Float columns to `Decimal(12,2)` in a
     dedicated schema/API patch.
3. For a Decimal migration, use the repository Prisma workflow, document
   conversion behavior, and update every API/hydration boundary so clients
   continue receiving numbers.
4. Validate the migration on an isolated production-shaped database before
   touching a shared environment. Compare row counts, null counts, min/max,
   sums, and sampled before/after values.
5. Do not combine the Decimal migration with unrelated sales-form routing or UI
   adoption changes.

Validation gate: database values enforce the same two-decimal contract without
changing numeric API contracts or historical totals beyond intentional
half-up normalization.

### Phase 6: End-to-End Parity and Release Verification

1. Run the focused legacy/new money, costing, workflow, API persistence, print,
   mobile, and inventory-sync suites.
2. Repeat the deterministic randomized legacy/shared summary comparison.
3. Add a cross-surface parity fixture that creates the same sale in legacy and
   new forms and compares:
   - component/step values;
   - line totals;
   - discounts and tax;
   - delivery/labor/other costs;
   - `grandTotal`, `ccc`, and `totalWithCcc`;
   - persisted and reloaded values;
   - print/mobile projections.
4. Browser-test both forms with coefficients `0.67` and `0.60`, component
   values `0.10` and `0.20`, grouped `$30.05 / 3`, and whole-dollar labels.
5. Review the final diff against the existing dirty worktree and keep this
   change isolated from current sales-form adoption/routing work.
6. Update Brain documentation and the July 20 audit from “implemented and
   verified” to the final verified state, correcting the stale API contract
   statement about C.C.C.

Release gate: zero legacy/new mismatches for the parity fixture and randomized
summary loop; all focused suites pass; no visible money label lacks two fixed
fraction digits.

## Recommended Patch Sequence

1. Patch A: regression tests plus canonical profile formula.
2. Patch B: monetary aggregation and admin snapshot normalization.
3. Patch C: API/legacy persistence boundary normalization.
4. Patch D: legacy display formatting.
5. Patch E: isolated Decimal schema hardening, only after the data audit and
   explicit migration decision.
6. Patch F: final parity evidence and Brain/API documentation corrections.

Each patch should be independently reviewable and keep the sales form usable.
Do not wait for the optional schema migration to ship the arithmetic fixes.

## Risks and Mitigations

- Historical totals may reflect staged reciprocal rounding. Do not silently
  rewrite saved orders; apply canonical pricing on new calculation/repricing
  events and preserve audit evidence.
- Profile changes without stored base prices cannot recover lost historical
  precision. Use one-step coefficient scaling and record this as a compatibility
  fallback.
- Rounding every intermediate value can introduce new cent drift. Round only
  published money boundaries and authoritative row/line totals.
- Reconstructing grouped totals from display averages can change totals by a
  cent. Preserve `lineTotal` and reconciliation metadata.
- A global fixed-decimal input change can damage quantity UX. Scope it to money
  callers.
- Decimal schema conversion has a wide serialization blast radius. Isolate it,
  audit data first, and retain numeric API outputs.
- The worktree contains unrelated active sales changes. Use narrow patches and
  verify every touched file before editing.

## Brain Documentation Expected During Implementation

- `.brain/features/sales-calculation-rounding.md`
- `.brain/reports/2026-07-20-legacy-vs-new-sales-calculation-rounding-audit.md`
- `.brain/api/contracts.md`
- `.brain/database/schema.md`, `.brain/database/migrations.md`, and
  `.brain/database/relationships.md` if Decimal hardening is executed
- `.brain/decisions/ADR-016-sales-decimal-arithmetic-and-total-contract.md` only
  if the durable contract changes; otherwise leave the accepted decision intact
- `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, and `.brain/progress.md`
  when implementation starts and completes

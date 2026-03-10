# New Sales Form Runtime Parity Gate

Date: 2026-03-10
Status: Ready for Execution

## Goal
Close all remaining `Partial (Implemented, Runtime Repro Pending)` rows in `brain/new-sales-form-phase0-repro-matrix.md` with deterministic runtime evidence.

## Gate Rule
Every row is `PASS` only when all are true:
1. Runtime repro executed on old and new form with same fixture.
2. Expected vs actual result recorded under `ai/new-sales-form-parity-evidence/<feature>/`.
3. At least one test or assertion path is linked (unit/integration/e2e/manual log).
4. No regressions in scoped automated gates.

## Execution Order
1. Tax/profile/costing correctness: profile repricing, tax calculation, component cost to door estimate.
2. Door/HPT/moulding runtime interactions: supplier switch modal pricing, quick base update, HPT breakdown, moulding defaults/calculator.
3. Workflow UX parity: floating bar, component menu, indicators, save history.
4. Reliability/runtime resilience: state recovery and long-idle save behavior.
5. Shelf runtime parity sweep.

## Runtime Scripts Per Batch
1. Capture old/new fixture IDs and customer profile/tax code used.
2. Execute matrix repro steps exactly.
3. Record:
- `old-form-expected.md` confirmation,
- `new-form-actual.md` with measured values,
- screenshots/short clips when UI behavior is involved.
4. Update matrix row triage (`PASS`/`PARTIAL`/`FAIL`).
5. Run scoped gates:
- `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/new-sales-form-costing.test.ts`
- `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts`
- focused `tsc` grep on touched files only.

## Current Blocking List (Runtime Only)
- All 15 matrix rows require runtime evidence to promote from `Partial` to `PASS`.
- No current code-confirmed `Fail` row remains in matrix.

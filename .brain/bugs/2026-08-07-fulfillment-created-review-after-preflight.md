# Fulfillment Created Material Review After Preflight

## Status

Fixed locally on 2026-08-07.

## Symptom

Two `update-sales-control` runs for order `09231LM` failed with `Unable to
fulfill while production submissions are awaiting material review.` The two
runs targeted newly created empty dispatches `4439` and `4440` three seconds
apart.

## Root Cause

- The status preflight inspected existing inventory blockers and existing
  production reviews, but did not preview produceable assignments that
  fulfillment's pack-all step would implicitly submit.
- The first fulfillment run therefore passed preflight, created two production
  submissions covering 13 units and review `#32`, then correctly stopped at the
  direct-task review guard.
- Dashboard `fetchQuery` calls inherited the global 60-second stale time. The
  retry reused the earlier clear preflight and no-dispatch response, creating a
  second empty dispatch and failed task.
- The menu had no synchronous in-flight guard spanning preflight, dispatch
  resolution, and task acceptance, so repeated selection could start twice.

## Fix And Prevention

- Fulfillment preflight now previews pending produceable assignment/submission
  scopes before they exist as production records. That projected work makes the
  preflight require the existing explicit production/inventory confirmation.
- The confirmed resolver prepares only the projected produceable scopes with
  `sales_mark_as_completed` provenance, then re-reads and approves any material
  review before allowing dispatch packing and completion.
- A current `NOT_CONFIGURED` review without component IDs is approved only
  through a dedicated configuration-exception decision. It preserves the
  missing-configuration evidence, records that no physical stock changed, and
  still runs the canonical approval/payroll/payment/history effects.
- Pack-all now preserves the same automatic-completion provenance on
  submissions it creates.
- Safety-sensitive preflight and dispatch lookup calls bypass the normal query
  stale window, and the menu rejects repeated status selections until the first
  task start is accepted or fails.
- The direct job guard remains unchanged; background fulfillment still cannot
  bypass a genuine pending review without the permission-checked confirmation.

## Validation

- Focused regression coverage passes 38 tests / 117 assertions, including a
  negative guard proving the configuration exception cannot approve configured
  material blockers.
- `@gnd/sales` and `@gnd/api` typechecks pass.
- The dashboard page compiles and returns HTTP 200. Its broad typecheck remains
  red on the existing repository-wide baseline after completing with additional
  heap; no changed runtime file appeared in the captured diagnostics.
- Read-only live preflight confirms `09231LM` now exposes review `#32`, two
  submissions, and 13 units. A second untouched order, `09228DB`, now stops
  before task/dispatch creation and previews four production submissions
  covering five units even though it has no review yet.
- No sales, review, dispatch, or order record was mutated during validation.

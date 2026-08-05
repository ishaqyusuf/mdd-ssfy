# Rootless HPT Inventory Sync Failure

## Symptom

Opening Sales Overview Inventory for order `09161PC` showed "Automatic
inventory synchronization failed". The recorded projection warning was:

`salesItem:168908: missing deterministic inventory mapping for parent line item`

The Trigger.dev worker's Node `--localstorage-file` startup warning appeared at
the same time but was unrelated and non-blocking.

## Root Cause

The Bifold sales line had an active house-package-tool relation with detailed
door rows but no HPT root `stepProduct`. The line still had a unique Item Type
form-step product that could identify its parent inventory line, but the parent
selector only supported single-step and moulding lines. Once that parent was
recognized, the component projection also exposed an overlapping generic Door
form-step candidate alongside the exact HPT door-size candidates, which would
have doubled required demand.

## Fix

- Use the unique Item Type form step as the deterministic parent for active HPT
  lines without a root product.
- Keep detailed HPT door-size candidates required.
- Preserve an overlapping generic Door candidate as an optional snapshot only.
- Send zero required quantity to fulfillment for optional snapshots so stale
  mutable demand is cancelled and future optional demand is not created.
- Exclude optional snapshots from inventory readiness, requirement quantities,
  and the Sales Overview Needs segment.

## Verification

- The exact failing projection replay for `09161PC` now completes with status
  `ready`, 4 needs, 6 required units, no warnings, 6 active-demand units, and no
  optional active demand.
- The live Sales Overview Inventory tab shows `Needs 4` and `6 pending`.
- Order `09158PC` verifies the simplified Needs-row presentation and visible
  row divider.
- 70 focused tests pass across sync, projection, overview, and dashboard helper
  coverage. `@gnd/sales` typecheck and Biome pass.

## Prevention

Grouped-line mapping tests must cover missing HPT root products and overlapping
generic/detail candidates. Optional component snapshots must be tested at both
the demand-write boundary and the overview aggregation boundary.

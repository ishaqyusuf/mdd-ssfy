# Sales Control V2 Rollout Runbook

## Goal

Roll out V2 control write/read/filter paths safely with mismatch visibility and rollback switches.

## Flags

- `CONTROL_WRITE_V2`:
  - `1` => strict V2 action resolver (single-action enforcement)
  - `0` => compatibility action resolver
- `CONTROL_READ_V2`:
  - `1` => projected V2 read wrappers in sales/dispatch list queries
  - `0` => legacy statistic wrappers
- `CONTROL_OVERVIEW_READ_V2`:
  - `1` => projected V2 read wrappers in dispatch overview query
  - `0` => legacy statistic projection path for dispatch overview
  - unset => inherits `CONTROL_READ_V2`
- `CONTROL_FILTER_V2`:
  - `1` => qtyControl-based filter predicates
  - `0` => legacy salesStat-based predicates for supported status filters
- `CONTROL_READ_PARITY`:
  - `1` => compare V2 vs legacy list control values and log mismatches
  - `0` => no parity logging

## Phase 1: Compatibility Baseline

Set:

- `CONTROL_WRITE_V2=0`
- `CONTROL_READ_V2=0`
- `CONTROL_FILTER_V2=0`
- `CONTROL_OVERVIEW_READ_V2=0`
- `CONTROL_READ_PARITY=0`

Purpose:
- Confirm legacy behavior unchanged after code deployment.

## Phase 2: Read Parity Window

Set:

- `CONTROL_WRITE_V2=0`
- `CONTROL_READ_V2=1`
- `CONTROL_FILTER_V2=0`
- `CONTROL_OVERVIEW_READ_V2=1`
- `CONTROL_READ_PARITY=1`

Monitor logs:

- `[control-read-parity][sales] mismatches`
- `[control-read-parity][dispatch] mismatches`
- `[control-read-parity][dispatch-overview] mismatches`

Summarize captured logs:

- `bun run control:parity-report -- --file <api-log-file>`
- optional: `--since YYYY-MM-DD --json`

Exit criteria:

- Mismatch count is zero (or explained and accepted) for representative traffic windows.

## Phase 3: Filter Cutover

Set:

- `CONTROL_WRITE_V2=0`
- `CONTROL_READ_V2=1`
- `CONTROL_FILTER_V2=1`
- `CONTROL_OVERVIEW_READ_V2=1`
- `CONTROL_READ_PARITY=1`

Validate:

- Query plans via `brain/sales-control-v2-query-plan-validation.md`
- Filter result parity on critical views:
  - production status tabs
  - dispatch status tabs
  - default sales search

## Phase 4: Write Cutover

Set:

- `CONTROL_WRITE_V2=1`
- `CONTROL_READ_V2=1`
- `CONTROL_FILTER_V2=1`
- `CONTROL_OVERVIEW_READ_V2=1`
- `CONTROL_READ_PARITY=1` (keep briefly)

Validate:

- `update-sales-control` task outcomes for:
  - submit all
  - pack selection/all
  - clear packings
  - dispatch transitions
  - mark as completed orchestration

Rollback:

- If needed, set `CONTROL_WRITE_V2=0` immediately.

## Phase 5: Stabilization

Set:

- `CONTROL_READ_PARITY=0` after sustained clean parity window.

Then close:

- Step 11 mismatch tracking item
- Step 11 default-switch item (already default-true in code after closure)

## Notes

- Local runtime currently cannot reach DB (`localhost:3306`) for live plan checks, so run phase validation on connected environments.

# Sales Control V2 Operations Runbook

## Scope

Operational guidance for day-to-day sales/dispatch control actions and controlled repair flows.

## Normal Operations

### 1) Update Sales Control Task

Task: `update-sales-control`

Supported action payloads (one action per request in V2 write mode):

- `submitAll`
- `packItems`
- `clearPackings`
- `cancelDispatch`
- `startDispatch`
- `submitDispatch`
- `createAssignments`
- `deleteSubmissions`
- `deleteAssignments`
- `markAsCompleted` (orchestration chain)

### 2) Packing Payload Contract

Canonical payload:

- `packItems.packingLines[]`:
  - `salesItemId`
  - `submissionId`
  - `qty`
  - optional `note`

Compatibility:

- Legacy `packItems.packingList[]` is still accepted and internally normalized.

### 3) Read Paths

Sales/dispatch list queries should prefer projected control payloads:

- sales: `withSalesListControl`
- dispatch: `withDispatchListControl`

Legacy fallback remains available via flags for rollback.

## Repair Operations

### 1) Reset/Repair Task

Task: `reset-sales-control`

Behavior:

- routed through `ControlRepairService.rebuildFromSource`
- performs reconciliation after rebuild

Authorization:

- Super Admin only

### 2) Reconciliation

Use `ControlRepairService.reconcileOrder(salesId)` to compare:

- expected controls composed from source rows
- persisted `qtyControl` rows

Output includes:

- missing keys
- extra keys
- mismatched qty snapshots

### 3) Historical Backfill

Use `ControlRepairService.backfillHistoricalSalesControls(...)` in controlled batches.

Recommended:

- batch size <= 100 for initial run
- monitor drift summary and DB load

## Feature Flags

- `CONTROL_WRITE_V2`
- `CONTROL_READ_V2`
- `CONTROL_OVERVIEW_READ_V2`
- `CONTROL_FILTER_V2`
- `CONTROL_READ_PARITY`

Reference rollout sequence:

- `brain/sales-control-v2-rollout-runbook.md`

## Observability

Parity logging keys:

- `[control-read-parity][sales]`
- `[control-read-parity][dispatch]`
- `[control-read-parity][dispatch-overview]`

Track mismatch count and record sampled IDs before any final cutover closure.

## Incident Response

If control inconsistency is reported:

1. Set `CONTROL_OVERVIEW_READ_V2=0` (overview-only rollback) and/or `CONTROL_READ_V2=0`/`CONTROL_FILTER_V2=0` for broader stabilization.
2. Capture affected IDs and recent task payloads.
3. Run targeted `reconcileOrder(salesId)`.
4. If authorized, run `rebuildFromSource(salesId, authorId)`.
5. Re-enable parity checks and confirm mismatch closure.

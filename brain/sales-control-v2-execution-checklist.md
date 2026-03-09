# Sales Control V2 - Execution Checklist

## 1) Architecture Freeze

- [x] Approve `qtyControl` as sole source of truth for sales/dispatch metrics and filters.
- [x] Approve dedicated control module boundary: `packages/sales/src/control/*`.
- [x] Approve orchestration-only rule for existing `update-sales-control` actions.

## 2) Module Skeleton

- [x] Create `domain` layer (types, statuses, qty math, invariants).
- [x] Create `application` layer (`ControlMutationService`, `ControlReadService`, `ControlRepairService`).
- [x] Create `infrastructure` layer (repositories + transaction adapters).
- [x] Create `projections` layer (`salesListProjection`, `dispatchListProjection`).
- [x] Create `contracts` layer (DTOs + field-selector schemas).

## 3) Command Mapping (Existing Actions -> Services)

- [x] `submitAll` / markAsSubmitted -> `applySubmissionBatch`.
- [x] `packItems` -> `applyPack`.
- [x] `clearPackings` -> `applyUnpackBulk`.
- [x] `startDispatch|cancelDispatch|submitDispatch` -> `applyDispatchStatusTransition`.
- [x] `createAssignments|deleteAssignments` -> `applyAssignmentDelta`.
- [x] `deleteSubmissions` -> `applySubmissionDelta`.
- [x] `markAsCompleted` -> orchestration chain (`submitAll -> packAll -> submitDispatch`).
- [x] `reset-sales-control` -> `rebuildFromSource` (repair-only).

## 4) Transactional Write Hardening

- [x] Enforce same-transaction business row updates + `qtyControl` updates for all mutations.
- [x] Add idempotency protection for repeated task triggers.
- [x] Enforce invariants (no overpack, no negative counters, valid status transitions).

## 5) Read Path Refactor

- [x] Refactor `withSalesControl` into `ControlReadService.getSalesListControl(orderIds, fields)`.
- [x] Refactor `withDispatchControl` into `ControlReadService.getDispatchListControl(dispatchIds, fields)`.
- [x] Remove order-level metric leakage from dispatch rows.
- [x] Return projected/minimal fields only.

## 6) API Query Integration

- [x] Integrate sales list path with `salesListProjection`.
- [x] Integrate dispatch list path with `dispatchListProjection`.
- [x] Keep compatibility mapper for legacy response keys during migration.

## 7) Backfill and Repair

- [x] Build historical `qtyControl` backfill.
- [x] Build reconciliation job (`qtyControl` vs source rows).
- [x] Build targeted repair command for drifted records.
- [x] Restrict repair execution to admin paths.

## 8) Filtering and Indexing

- [x] Move sales/dispatch filters to `qtyControl` predicates only.
- [x] Add/adjust indexes for filter performance.
- [ ] Validate query plans at production-like scale.

## 9) Frontend Alignment

- [ ] Update list consumers to use projected control fields only.
- [ ] Remove dependence on old ambiguous qty fields in list displays.
- [ ] Keep packing flow aligned with normalized command payloads.

## 10) Testing

- [ ] Add domain unit tests for qty math and status derivation.
- [ ] Add integration tests for transactional command behavior.
- [ ] Add projection contract tests for sales/dispatch list payloads.
- [ ] Add regression tests for mixed production + non-production dispatch paths.
- [ ] Add idempotency tests for duplicate task submissions.
- [ ] Add filter correctness tests for supported combinations.

## 11) Rollout

- [ ] Add feature flags: `control_write_v2`, `control_read_v2`, `control_filter_v2`.
- [ ] Run dual-write/dual-read parity window and track mismatches.
- [ ] Switch read/filter defaults to V2 after mismatch closure.
- [ ] Decommission reset-dependent runtime paths.

## 12) Cleanup

- [ ] Remove obsolete control derivation utilities outside new module.
- [ ] Reduce `update-sales-control` to thin command router (or split explicit endpoints).
- [ ] Publish final runbook for normal operations and repair operations.

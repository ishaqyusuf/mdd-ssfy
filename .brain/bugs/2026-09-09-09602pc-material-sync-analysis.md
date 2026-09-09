# 09602PC material synchronization analysis

Read-only investigation of the live order on 2026-09-09. No production data or runtime code changed.

## Observed
- Inbound #308 is Received. Inventory says All Needs Fulfilled: door sizes 2-0 = 20/20, 2-6 = 16/16, 2-8 = 12/12, 3-0 = 10/10.
- All four door rows show INVENTORY SETUP MISMATCH. The three interior rows show COMPLETED · REVIEW PENDING; exterior is ASSIGNED. The expanded 2-0 assignment has 20 submitted and awaiting review.
- The synchronization banner remains with supervisor and inconsistent-quantity messages, but no Sync button.

## Source findings
- `sales-fulfillment-plan.ts` emits productionEligibilityConflict when exact production scope exists but isLineProductionEligible(sourceLine.meta) is false. Submission material policy blocks finalization for this conflict even when material coverage is sufficient.
- `production-inbound-allocation.ts` separately blocks invalid allocation quantities, excess allocations, missing/mismatched physical stock, or insufficient shared stock. Partial planning discards the specific error message and retains only blocked component IDs. The observed warning proves blocked allocation evidence but does not identify which validation failed.
- `production-material-availability.tsx` forces the synchronization panel visible for review state. `covered-materials-action.tsx` keeps the same sync heading and future-tense promise when canApply is false, and treats every false canApply as a supervisor issue. canApply also depends on eligible work and state, not only permission.

## Follow-up
Inspect exact source metadata and allocation/stock evidence before choosing a data repair. Separate actionable synchronization from blocked review presentation, expose specific residual blockers, and avoid implying a shortage or authorization failure from canApply alone. The prior Sync mutation outcome was not captured, so this investigation does not assert what that click changed.

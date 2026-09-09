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

## Production-to-local synchronization and confirmed evidence

User authorized production-to-local DB synchronization. Broad dry run passed (292 tables, 2,329 rows, 30 timestamp-free tables skipped). The first apply stopped at a NoteTags secondary unique-key conflict after earlier table writes. Backed up 226,755 local NoteTags rows to `/private/tmp/gnd-notetags-before-sync.json`, then used scoped built-in duplicate reset recovery; 227,018 source rows were restored successfully. Resumed broad sync completed (1,363 rows written, 30 static tables skipped).

Explicitly dry-ran and refreshed timestamp-free LineItemComponents (40,589 rows). Also dry-ran and reset the LineItem cursor, upserting 6,802 rows because prior local manual classification edits were newer than the source rows and survived ordinary incremental sync. This is an incremental local refresh, not an exact full database mirror; other static tables and updates to old createdAt-only rows are not covered. Production remained read-only; no application code changed.

Local order ID is 27100. The refreshed source proves:
- Lines 7553 / 7554 (sales items 173867 / 173868) have `production.produceable=false` and `inventorySync.productionProduceable=false`, written by `copy-sales` on September 7. Both sales items have dykeProduction=false. Prior local manual true flags were not source truth.
- Component 48006 (2-0) needs/received 20, committed 17, pending suggestion 2089 for 3 against stock 154. Stock 154 has quantity 8 and all 8 already committed, including reservation 2361 for 3 on this same component. The remaining pending suggestion cannot be approved against that stock.
- Component 48007 (2-6) needs/received 16, committed 11. Suggestions 2090 (2 against stock 115) and 2091 (3 against stock 124) remain pending. Stock 115 is fully committed 18/18; stock 124 fully committed 6/6. Existing receipt reservations include 2363 and 2364 against those stocks.
- Component 48008 (2-8) has approved suggestion 2092 for 2 and received-stock reservation 2366 for 10, covering 12/12.
- Component 48021 (exterior) has approved suggestion 2093 for 3 and received-stock reservation 2367 for 7, covering 10/10.
- Review 461 remains PENDING/BLOCKED for the three interior assignments. Production-classification conflict independently prevents finalization.

Ran the actual `validateProductionAllocationCoverage` function against captured local rows: both 48006 and 48007 return `Pending allocations exceed available physical stock. Open Inventory to review them.` This confirms the previously hidden allocation reason. Allocation notes on 2092/2093 and 2366/2367 provide evidence that covered-material application did perform partial work.

Recommended fix direction: reconcile obsolete pending stock suggestions against valid received-stock capacity (do not force approval against exhausted stock), correct copied-sale production classification using the canonical production rules, and report exact residual blockers. No repair was applied during this analysis.

# Inventory Reconciliation Evidence

## Status
Not Clean

## Created Date
2026-07-01

## Source
- Plan: `brain/plans/2026-07-01-inventory-system-correctness-cutover-plan.md`
- Invariant Matrix: `brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md`
- Command: `bun run inventory:reconciliation-evidence --markdown` for the
  latest successful read-only refresh on 2026-07-23.
- Script: `scripts/inventory-reconciliation-evidence.ts`

## Purpose
Record the latest reproducible Phase 8 reconciliation evidence after the repair-path audit checkpoint and reviewed repair slices. This is a read-only evidence snapshot. It does not satisfy the clean reconciliation gate. The HPT door zero-component blocker has been repaired; the current blockers are missing-sales scope, shipment/allocation mismatch review, one skipped comparison, and the partial reconciliation cursor.

## 2026-07-23 Read-Only Refresh

The local `gnd-prisma2` database no longer reproduces the cleaner July 1
post-repair checkpoint recorded below. The refresh was evidence-only: it ran
the monitor, reconciliation, stale-cleanup dry run, and classification output;
it did not run the repair command, an apply, a migration, a sync, or a database
write.

- Monitor status: `needs_backfill`
- Sync coverage: `0.87%`
- Total sales: `21936`
- Synced sales: `191`
- Missing sales: `21745`
- Inventory sale lines: `423`
- Componentless inventory sale lines: `5` across sales `23730` (`08708PC`) and
  `23732` (`08709LM`)
- Stale inventory sale lines: `50`
- Stale stock allocations: `0`
- Stale inbound demand: `58`
- Failed risk count: `347`
- Backfill cursor: `55`
- Missing-sales reviewed scope: `2226` active/order candidates, of which `844`
  are materializable and `1382` are mapping-blocked
- Reconciliation: `needs_review`, `200` checked lines, `281` drift, `14`
  skipped comparisons, `hasMore=true`, next cursor `200`
- Reconciliation domains: sales sync `7` drift / `0` skipped;
  shipment/allocation `73` drift / `7` skipped; component fulfillment `201`
  drift / `7` skipped
- Shipment/allocation classes:
  `completed_delivery_exceeds_consumed_allocation=73`,
  `missing_component_rows=7`
- Stale cleanup remained dry-run only: `50` matched lines and `81` component
  rows; `0` lines were cleaned

Gate implication: the Phase 8 gate remains open and has regressed relative to
the historical July 1 checkpoint. Because repairs remain stopped by user
request, none of the emitted stale-line, componentless-sale, or missing-sale
repair payloads were executed. Before any repair is resumed, reconcile why the
local data now has fewer synced sales/lines and re-review the exact current
candidate baselines.

## 2026-07-01 Result Summary (Historical Checkpoint)
- Monitor status: `needs_backfill`
- Sync coverage: `3.05%`
- Total sales: `21093`
- Synced sales: `644`
- Missing sales: `20449`
- Inventory sale lines: `1582`
- Componentless inventory sale lines: `0`
- Componentless sales: `0`
- Stale inventory sale lines: `0`
- Stale stock allocations: `0`
- Stale inbound demand: `0`
- Failed risk count: `10`
- Backfill cursor: `55`

## Missing Sales Scope Classification
The monitor still counts every non-deleted `SalesOrders` row without an active inventory `SALE` line. The evidence command now adds a read-only scope classification so broad backfill is not treated as a single undifferentiated repair action.

- Status: `needs_scope_decision`
- Total missing sales: `20449`
- Classification counts:
  - `missing_status_review`: `17857`
  - `active_sales_status_candidate`: `1609`
  - `production_completed_status_review`: `725`
  - `terminal_or_history_status_review`: `167`
  - `quote_status_review`: `63`
  - `statusless_order_id_candidate`: `15`
  - `statusless_quote_id_review`: `12`
  - `manual_inventory_status_without_lines`: `1`
- Top statuses: `unknown=17884`, `Active=2144`, `Sales=189`, `Delivered=167`, `Quote=63`, `Draft=1`, `New=1`
- Top production statuses: `unknown=19507`, `Completed=928`, `Queued=7`, `Started=5`, `In Production=2`
- Created-year buckets: `2026=9423`, `2025=8598`, `2024=1715`, `2023=712`, `unknown=1`
- Reviewed backfill scope: `active_order_candidates`
- Reviewed backfill candidate classes: `active_sales_status_candidate`, `statusless_order_id_candidate`
- Reviewed backfill candidate count: `1624`
- Reviewed materializable candidate count: `244`
- Reviewed mapping-blocked candidate count: `1380`
- Next reviewed materializable backfill batch ids if repairs resume: `2792`, `2793`, `2794`, `2795`, `2799`, `2800`, `2803`, `2805`, `2806`, `2807`, `2808`, `2809`, `2810`, `2815`, `2820`, `2824`, `2825`, `2826`, `2828`, `2829`, `2830`, `2832`, `2833`, `2835`, `2836`, `2837`, `2838`, `2839`, `2842`, `2845`, `2846`, `2847`, `2849`, `2853`, `2856`, `2857`, `2858`, `2859`, `2865`, `2866`, `2867`, `2868`, `2873`, `2874`, `2875`, `2876`, `2878`, `2879`, `2880`, `2884`
- Remaining reviewed materializable candidates after that batch if resumed: `194`
- Mapping-blocked sample ids: `271`, `275`, `302`, `303`, `332`, `347`, `350`, `354`, `366`, `374`

Gate implication: `needs_backfill` remains open, but broad backfill must now be reviewed by scope and mapping readiness. The first old active/order batch (`271` through `609`) was mapping-blocked and created no inventory lines. The evidence command now emits the next explicit 50-id materializable batch only from active/statusless-order rows with deterministic mapping hints. Quote, terminal/history, completed-production, manual-prompt, unknown-status, and mapping-blocked active/order buckets need product or mapping-scope decisions before any broad cursor apply.

## Reconciliation Summary
- Status: `needs_review`
- Checked lines: `200`
- Drift count: `9`
- Skipped comparisons: `1`
- Has more: `true`
- Next cursor: `208`

| Domain | Checked | Drift | Skipped | Severity | Sample Count | Notes |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| `sales_inventory_sync` | 200 | 0 | 0 | ok | 0 | HPT door fallback cleared the zero-component sync drift. |
| `shipment_allocation` | 199 | 9 | 1 | error | 9 | Shipment/delivery truth still needs review against consumed inventory allocations. |
| `component_fulfillment` | 721 | 0 | 0 | ok | 0 | Component rows now compare cleanly in the reviewed slice. |

## Shipment Allocation Classification
The evidence command now classifies the remaining shipment/allocation blockers from the same read-only reconciliation slice.

- Status: `needs_review`
- Checked lines: `200`
- Drift count: `9`
- Skipped count: `1`
- Classification counts:
  - `completed_delivery_exceeds_consumed_allocation`: `8`
  - `consumed_allocation_exceeds_completed_delivery`: `1`
  - `missing_legacy_sales_item_link`: `1`

| Class | Order | Line Item | Sales Item | Shipped | Consumed | Delta | Review Action |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `consumed_allocation_exceeds_completed_delivery` | `08589LM` | 23 | 163013 | 0 | 6 | -6 | Review whether delivery compatibility rows need repair. |
| `missing_legacy_sales_item_link` | `08473LM` | 27 | 161566 | - | - | - | Review whether the inventory sale line should be relinked to a legacy sales item or scoped out of shipment comparison. |
| `completed_delivery_exceeds_consumed_allocation` | `08681PC` | 28 | 163693 | 30 | 0 | 30 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08687AD` | 46 | 163753 | 21 | 0 | 21 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08687AD` | 47 | 163754 | 18 | 0 | 18 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08688AD` | 48 | 163757 | 2 | 0 | 2 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08689DB` | 49 | 163766 | 1 | 0 | 1 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08699DB` | 96 | 163913 | 4 | 0 | 4 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08707DB` | 111 | 163955 | 30 | 0 | 30 | Review completed delivery truth before any repair. |
| `completed_delivery_exceeds_consumed_allocation` | `08699DB` | 120 | 163915 | 14 | 0 | 14 | Review completed delivery truth before any repair. |

## Stale Cleanup Preview
Dry-run cleanup found:
- Matched stale line items: `0`
- Component rows under matched stale lines: `0`
- Line item ids: none
- Cleaned line items: `0` because the run was dry-run only.
- Repair candidate line ids: none

## Componentless Line Classification
- Total componentless inventory sale lines: `0`
- Repair candidate sales order ids: none
- Zero-component review sales order ids: none
- Source breakdown: none
- Zero-component source-shape reason: none
- Previous HPT blocker: the prior `86` zero-component repair-source rows across `43` orders were resolved by HPT root-product fallback, inch-dimension variant normalization, quantity derivation from line totals, and a reviewed re-sync apply of those orders.

## Reviewed Repair Plan Output
The evidence command emits a structured read-only `repairPlan` section in both Markdown and JSON. The section does not mutate data; it records reviewed payloads for the existing guarded repair entry points.

Current repair-plan state after the reviewed stale/componentless repair, materializable backfill apply, HPT fallback fix, and reviewed zero-component repair:

1. Stale inventory sale-line cleanup:
   - No candidate line ids remain.
   - The previous reviewed candidate line ids `43`, `94`, and `99` were applied and are recorded under `Applied Reviewed Repair Slice`.
2. Componentless manual sale re-sync:
   - No candidate sales order ids remain.
   - The previous reviewed componentless re-sync set was applied and is recorded under `Applied Reviewed Repair Slice`.
3. Missing-sales backfill:
   - The first old active/order reviewed payload (`271` through `609`) dry-ran cleanly but applied as a mapping-blocked no-op: `50` orders reported `ok`, `0` material writes, `0` failed, and warnings showed missing deterministic inventory mapping for every sales item.
   - The first materializable active/order payload (`1366` through `1521`) applied successfully: `50` orders material-applied, `147` inventory sale lines were created, `17` sales items were skipped for missing deterministic inventory mapping, and missing sales dropped from `21049` to `20999`.
   - The next eleven materializable active/order payloads applied successfully: `1523` through `1640` created `186` sale lines with `41` skipped mapping warnings, `1641` through `1718` created `215` sale lines with `45` skipped mapping warnings, `1720` through `1821` created `156` sale lines with `52` skipped mapping warnings, `1822` through `1926` created `181` sale lines with `23` skipped mapping warnings, `1927` through `2087` created `110` sale lines with `65` skipped mapping warnings, `2088` through `2274` created `82` sale lines with `99` skipped mapping warnings, `2275` through `2397` created `77` sale lines with `77` skipped mapping warnings, `2398` through `2484` created `83` sale lines with `50` skipped mapping warnings, `2485` through `2581` created `81` sale lines with `44` skipped mapping warnings, `2587` through `2688` created `70` sale lines with `26` skipped mapping warnings, and `2690` through `2791` created `82` sale lines with `58` skipped mapping warnings. Missing sales dropped from `20999` to `20449`, while componentless and stale evidence stayed at `0`.
   - Repair loop status: stopped by user request after the `2690` through `2791` apply and post-apply evidence run. Do not continue dry-run/apply repair batches unless the user explicitly resumes repairs.
   - Next reviewed materializable explicit payload if repairs resume: `inventories.backfillSalesInventorySync` with `{"salesOrderIds":[2792,2793,2794,2795,2799,2800,2803,2805,2806,2807,2808,2809,2810,2815,2820,2824,2825,2826,2828,2829,2830,2832,2833,2835,2836,2837,2838,2839,2842,2845,2846,2847,2849,2853,2856,2857,2858,2859,2865,2866,2867,2868,2873,2874,2875,2876,2878,2879,2880,2884],"includeAlreadySynced":false,"source":"repair","scope":"active_order_candidates"}`
   - `bun run inventory:reconciliation-repair` supports the same explicit batch through `--include-missing-backfill --missing-sales-order-ids <csv>` and remains dry-run unless `--apply --confirm-review` is also supplied.
   - Broad cursor backfill is no longer the default next repair payload. It remains a review-only fallback payload starting at cursor `55` and should run only after a product scoping decision includes quote, terminal/history, completed-production, manual-prompt, and unknown-status buckets.
   - Scope summary travels with the repair plan: `active_sales_status_candidate=1609`, `statusless_order_id_candidate=15`, `statusless_quote_id_review=12`, `quote_status_review=63`, `terminal_or_history_status_review=167`, `production_completed_status_review=725`, `manual_inventory_status_without_lines=1`, and `missing_status_review=17857`.
4. Zero-component componentless review:
   - Resolved. The materializable backfill had created `86` componentless repair-source line items across `43` sales orders where sync recorded `inventorySync.componentCount=0`.
   - The fix makes HPT child door rows without their own mapped product fall back to the HPT root `stepProduct`, normalizes inch dimensions such as `34" x 80"` to Dyke variant UIDs, and derives quantity from `lineTotal / unitPrice` when `totalQty` is zero.
   - The reviewed zero-component repair apply updated `131` line items, skipped `10` unmapped sales items, and the post-apply evidence reports `0` componentless inventory sale lines and `0` componentless sales.
5. Shipment/allocation review:
   - Read-only classification payload now separates the remaining blockers into completed-delivery-without-consumed-allocation, consumed-allocation-without-completed-delivery, and missing legacy sales-item link classes.
   - This remains review-required because shipment truth must be decided before mutating legacy delivery rows or consumed inventory allocations.
6. Post-repair evidence:
   - Rerun `bun --env-file=.env.local run inventory:reconciliation-evidence --markdown`.

## Reviewed Repair Runner Dry Run
`bun run inventory:reconciliation-repair` is now the dry-run-first execution companion for this evidence report. The default command does not mutate data and currently reports:

- Stale cleanup dry-run: `0` matched lines and `0` component rows.
- Componentless repair plan: no re-sync candidate sales order ids remain; the prior `43` zero-component HPT sales orders are resolved.
- Missing-sales backfill excluded by default; the remaining reviewed broad backfill plan starts at cursor `55`.
- Explicit missing-sales backfill dry-run is supported for the first reviewed active/order candidate batch and currently plans `50` rows with `0` skipped explicit ids.
- Apply is blocked unless the command is run with both `--apply` and `--confirm-review`.

## Applied Reviewed Repair Slice
The reviewed narrow repair was applied without the broad missing-sales backfill:

1. First apply: `bun --env-file=.env.local run inventory:reconciliation-repair --apply --confirm-review --json`
   - Stale cleanup applied: `3` line items cleaned (`99`, `94`, `43`).
   - Componentless re-sync applied: `20` of `22` candidate sales orders succeeded.
   - Two candidate sales orders failed because stale component cleanup deleted child allocation/demand rows using an exact `deletedAt` timestamp match before deleting the component.
2. Code hardening: `syncSalesInventoryLineItems` stale-component and stale-line child cleanup now deletes confirmed soft-deleted child residue with `deletedAt not null` plus guarded component/parent identity, avoiding MySQL timestamp precision mismatches while preserving the existing exact identity guard.
3. Retry apply: `bun --env-file=.env.local run inventory:reconciliation-repair --apply --confirm-review --componentless-sales-order-ids 23525,23675 --json`
   - Remaining componentless re-sync applied: `2` of `2` candidate sales orders succeeded.
4. Validation:
   - `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed.
   - `bun --env-file=.env.local run inventory:reconciliation-evidence --json` passed.
   - `bun --env-file=.env.local run inventory:reconciliation-evidence --markdown` passed.

## Applied HPT Door Zero-Component Repair Slice
The reviewed HPT door component fallback and zero-component repair were applied after the materializable backfill exposed the HPT source-shape gap:

1. Code hardening:
   - HPT child door rows missing their own mapped `stepProduct` now fall back to the HPT root `stepProduct`.
   - Door dimensions stored as inch strings, for example `34" x 80"` and `36" x 80"`, normalize to the Dyke variant UID shape.
   - Door quantity falls back to `lineTotal / unitPrice` when `totalQty` is zero.
2. Focused coverage:
   - `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed and includes HPT root-product fallback coverage for `34" x 80"` and `36" x 80"` child door rows.
3. Reviewed dry-run:
   - `bun --env-file=.env.local run inventory:reconciliation-repair --markdown --componentless-sales-order-ids <43 reviewed ids>` planned `43` explicit orders, skipped `0`, and mutated no data.
4. Reviewed apply:
   - `bun --env-file=.env.local run inventory:reconciliation-repair --apply --confirm-review --json --componentless-sales-order-ids <43 reviewed ids>` applied `43` of `43`, failed `0`, material-applied `43`, updated `131` line items, skipped `10` unmapped sales items, and emitted `10` mapping warnings.
5. Post-apply evidence:
   - `bun --env-file=.env.local run inventory:reconciliation-evidence --markdown` passed after the apply and reported `0` componentless inventory sale lines, `0` componentless sales, `0` sales-inventory-sync drift, `0` component-fulfillment drift, `9` shipment/allocation drift, `1` skipped comparison, `hasMore=true`, and next cursor `208`.
   - A later documentation-time rerun could not connect to the local database at `127.0.0.1:3307`; rerun evidence once the DB is available before any release acceptance claim.

## Applied Materializable Backfill Batches
Eleven additional reviewed active/order materializable batches were applied after the HPT zero-component repair:

1. Batch `1523` through `1640`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `186` sale lines, skipped `41` unmapped sales items, and emitted `41` mapping warnings.
2. Batch `1641` through `1718`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `215` sale lines, skipped `45` unmapped sales items, and emitted `45` mapping warnings.
3. Batch `1720` through `1821`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `156` sale lines, skipped `52` unmapped sales items, and emitted `52` mapping warnings.
4. Batch `1822` through `1926`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `181` sale lines, skipped `23` unmapped sales items, and emitted `23` mapping warnings.
5. Batch `1927` through `2087`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `110` sale lines, skipped `65` unmapped sales items, and emitted `65` mapping warnings.
6. Batch `2088` through `2274`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `82` sale lines, skipped `99` unmapped sales items, and emitted `99` mapping warnings.
7. Batch `2275` through `2397`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `77` sale lines, skipped `77` unmapped sales items, and emitted `77` mapping warnings.
8. Batch `2398` through `2484`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `83` sale lines, skipped `50` unmapped sales items, and emitted `50` mapping warnings.
9. Batch `2485` through `2581`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `81` sale lines, skipped `44` unmapped sales items, and emitted `44` mapping warnings.
10. Batch `2587` through `2688`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `70` sale lines, skipped `26` unmapped sales items, and emitted `26` mapping warnings.
11. Batch `2690` through `2791`:
   - Dry-run planned `50` explicit orders, skipped `0`, and mutated no data.
   - Apply ran with `--apply --confirm-review`, material-applied `50` of `50`, failed `0`, created `82` sale lines, skipped `58` unmapped sales items, and emitted `58` mapping warnings.
12. Repair loop stop:
   - The user requested repairs stop after the `2690` through `2791` apply and the final evidence rerun. No further repair dry-runs or applies should run unless the user explicitly resumes them.
13. Latest successful evidence:
   - `bun --env-file=.env.local run inventory:reconciliation-evidence --markdown` passed after the latest apply.
   - Missing sales dropped from `20549` to `20449` in this slice and from `20999` to `20449` across the eleven additional batches.
   - Sync coverage rose from `2.58%` to `3.05%` in this slice and from `0.45%` to `3.05%` across the eleven additional batches.
   - Componentless lines, componentless sales, stale lines, stale stock allocations, and stale inbound demand remain `0`.
   - Shipment/allocation drift remains `9`, skipped comparisons remain `1`, and the reconciliation cursor still has more rows (`hasMore=true`, next cursor `208`).

## Gate Decision
Phase 8 clean reconciliation evidence remains open. Do not move to broad browser/operator proof as a cutover gate until:
1. Missing backfill scope is resolved or intentionally scoped by product decision.
2. Shipment/allocation drift count `9` is resolved or explicitly classified.
3. The remaining skipped comparison count `1` is resolved or explicitly classified.
4. The reconciliation cursor is exhausted (`hasMore=false`, `nextCursorId=null`).
5. A rerun reports `status=synced`, `totalDriftCount=0`, `skippedComparisonCount=0`, `hasMore=false`, and `nextCursorId=null`.

## Evidence Update: Pending Review Allocation Semantics
After aligning reconciliation with the sync planner's suggested-allocation semantics, `pending_review` stock allocations count as suggested coverage for component fulfillment status. This removed the two component-fulfillment warning drifts from the baseline. The later reviewed repair cleared componentless and stale-line candidates, so remaining blockers are now broad missing-sales scope and shipment/allocation reconciliation.

## Evidence Update: Reviewed Repair Applied
At the checkpoint after the reviewed stale/componentless repair slice and stale-cleanup precision fix, the sales-inventory-sync domain had `0` drift, component-fulfillment had `0` drift and `0` skipped comparisons, stale cleanup had `0` candidates, and componentless inventory sale lines were `0`. A later materializable missing-sales backfill introduced `86` zero-component HPT rows; the HPT fallback repair slice has now cleared them.

## Evidence Update: Shipment Allocation Classification
The evidence command now adds a read-only `shipmentAllocation` classification section in both JSON and Markdown output. The latest run keeps the gate `Not Clean`, but the shipment blockers are now actionable buckets: `8` completed deliveries exceed consumed inventory allocation, `1` consumed inventory allocation exceeds completed delivery, and `1` inventory sale line has no legacy sales item link for shipment comparison.

## Evidence Update: Missing Sales Scope Classification
The evidence command now adds a read-only `missingSalesScope` section in JSON and Markdown output. The latest run still reports `needs_backfill`, but it separates the broad `21049` missing-sale blocker into review buckets: `2209` active-status sales candidates, `15` statusless order-id candidates, `12` statusless quote-id rows, `63` quote-status rows, `167` terminal/history rows, `725` completed-production rows, `1` manual inventory-status row, and `17857` statusless rows that still require product/data scoping.

## Evidence Update: Scoped Missing Sales Backfill Batch
The evidence command now emits an explicit reviewed first batch for the clearest missing-sales scope, `active_order_candidates`. The batch contains `50` sales order ids drawn only from `active_sales_status_candidate` and `statusless_order_id_candidate` rows and leaves `2174` reviewed active/order candidates for later batches. The repair companion accepts that exact list with `bun --env-file=.env.local run inventory:reconciliation-repair --markdown --include-missing-backfill --missing-sales-order-ids <csv>`, which dry-ran successfully with `plannedCount=50`, `appliedCount=0`, `failedCount=0`, `skippedExplicitIds=0`, and `mutatedData=no`.

## Evidence Update: Materializable Missing Sales Batch Applied
The first old active/order reviewed batch (`271` through `609`) applied as a mapping-blocked no-op: `50` orders returned `ok`, but material writes were `0` because every sales item reported missing deterministic inventory mapping. The evidence command now separates reviewed active/order candidates into materializable and mapping-blocked buckets before recommending a repair batch. The first materializable batch (`1366` through `1521`) applied successfully: `50` orders material-applied, `147` inventory sale lines were created, `17` sales items were skipped for missing deterministic inventory mapping, and missing sales dropped from `21049` to `20999`.

## Evidence Update: Zero-Component Review Bucket
After the materializable backfill, `86` repair-source inventory SALE lines across `43` orders remained componentless with recorded `inventorySync.componentCount=0`. A reviewed componentless re-sync of those `43` orders updated `131` line items but did not create components before the source-shape fix because the source sync still had zero component candidates. This is now historical evidence; the HPT fallback repair slice cleared the zero-component rows.

## Evidence Update: Zero-Component Source-Shape Classification
The evidence command now classifies zero-component componentless rows by source shape. The source-shape run found `86` zero-component rows, all classified as `house_package_doors_missing_component_mapping_fields`: linked sales items and deterministic parent mappings existed, but HPT door/form-step source rows had zero component candidate hints. That finding drove the HPT fallback fix and reviewed repair apply. The latest successful evidence now reports `0` componentless lines, so the next decision is no longer HPT door mapping scope.

## Evidence Update: HPT Door Fallback And Zero-Component Repair Applied
HPT child door rows now use the HPT root product when their own row lacks a mapped product, normalize inch dimensions into Dyke variant UIDs, and derive quantity from price math when `totalQty` is zero. The reviewed repair apply covered the `43` affected orders, updated `131` line items, skipped `10` unmapped sales items, and cleared componentless evidence to `0`. Phase 8 remains open on `needs_backfill`, shipment/allocation drift `9`, skipped comparison `1`, and partial cursor `208`.

## Evidence Update: Additional Materializable Backfill Batches Applied
Eleven more reviewed materializable active/order batches applied successfully after dry-run review. Batch `1523` through `1640` created `186` sale lines, `1641` through `1718` created `215`, `1720` through `1821` created `156`, `1822` through `1926` created `181`, `1927` through `2087` created `110`, `2088` through `2274` created `82`, `2275` through `2397` created `77`, `2398` through `2484` created `83`, `2485` through `2581` created `81`, `2587` through `2688` created `70`, and `2690` through `2791` created `82`. All eleven had `0` failed orders and `0` mapping-blocked orders; skipped mapping warnings remained item-level only (`41`, `45`, `52`, `23`, `65`, `99`, `77`, `50`, `44`, `26`, then `58`). The latest successful evidence now reports `20449` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, and next reviewed materializable batch ids `2792` through `2884` if repairs are resumed. The repair loop is stopped by user request.

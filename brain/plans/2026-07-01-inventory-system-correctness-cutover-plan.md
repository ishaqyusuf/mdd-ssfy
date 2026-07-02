# Plan: Inventory System Correctness Cutover

## Type
Feature Hardening / Cutover Readiness

## Status
In Progress

## Created Date
2026-07-01

## Tracking
- Roadmap Task: Inventory System Correctness Cutover
- Related Feature: `brain/features/inventory-backed-sales-fulfillment.md`
- Source Intake: `brain/intake/2026-06-15-inventory-cutover-pending-scope.md`
- Related Intake: `brain/intake/2026-06-22-sales-overview-inventory-workflows.md`
- Pending Gate Intake: `brain/intake/2026-07-01-inventory-correctness-pending-gates.md`
- Progress Log: `brain/progress.md`
- Completed Slice Ledger: `brain/tasks/done.md`
- Current Work Ledger: `brain/tasks/in-progress.md`
- Phase 0 Invariant Matrix: `brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md`
- Phase 8 Reconciliation Evidence: `brain/reports/2026-07-01-inventory-reconciliation-evidence.md`

## Brain Ledger Status
- Overall Cutover Status: In Progress. Do not move this plan or the roadmap task to Done until Phase 11 release acceptance is recorded.
- Completed Slice Rule: `brain/tasks/done.md` may list completed hardening/proof slices, but those entries are evidence for the active cutover, not completion of the cutover itself.
- Active Work Rule: `brain/tasks/in-progress.md` and `brain/tasks/roadmap.md` remain the source of truth for open gates and next execution order.
- Chronology Rule: `brain/progress.md` keeps dated session history, including documentation-only alignment checkpoints and implementation proof slices.
- Intake Rule: this cutover is already backed by `brain/intake/2026-06-15-inventory-cutover-pending-scope.md` plus related Sales Overview Inventory workflow intake at `brain/intake/2026-06-22-sales-overview-inventory-workflows.md`; create a new intake only if scope expands beyond those inventory correctness and sales-overview inventory workflow records.
- Pending Gate Intake Rule: `brain/intake/2026-07-01-inventory-correctness-pending-gates.md` is a user-requested consolidation of the remaining pending gates for this existing cutover. It does not create duplicate plan scope, resume repairs, or change the Phase 11 completion rule.
- Latest Ledger Correction: 2026-07-01 plan, roadmap, in-progress, progress, done-task, and reconciliation evidence ledgers were realigned after eleven additional reviewed materializable active/order backfill batches. This correction records completed slices as evidence only, keeps the full cutover open, and makes the live Phase 8 gate explicit: repairs are stopped by user request; if resumed, continue reviewed materializable active/order backfill batches, decide non-active and mapping-blocked missing-sales scope, and review shipment/allocation blockers before any clean reconciliation or broad browser-proof claim.
- Latest Documentation Alignment: 2026-07-01 confirmed the source/related intake links, pending phase order, and done-slice scope without running new repair or evidence commands. The authoritative Phase 8 checkpoint was then advanced by seven more reviewed backfill applies; latest successful Markdown evidence reports sync coverage `3.05%`, `20449` missing sales, `0` componentless/stale rows, `9` shipment/allocation drift, `1` skipped comparison, `hasMore=true`, and next cursor `208`.
- Latest Phase 8 Evidence Slice: 2026-07-01 applied two more reviewed materializable active/order backfill batches after dry-run review: `2587` through `2688` created `70` sale lines with `26` item-level mapping warnings, and `2690` through `2791` created `82` sale lines with `58` item-level mapping warnings. Latest post-apply evidence remains not clean but improved: sync coverage `3.05%`, `20449` missing sales, `0` componentless lines, `0` stale lines, `9` shipment/allocation drift, `1` skipped comparison, `hasMore=true`, and next cursor `208`.
- Repair Loop Status: stopped by user request after the `2690` through `2791` apply and final evidence rerun. Do not run more repair dry-runs or applies unless the user explicitly resumes repairs.
- Current Next Gate: with repairs stopped, decide the non-active and mapping-blocked missing-sales buckets and review shipment/allocation drift plus the remaining skipped comparison. If repairs are explicitly resumed, the next reviewed materializable active/order missing-sales batch is `50` ids from `244` remaining materializable candidates, next ids `2792` through `2884`.

## Implementation Notes
- 2026-07-01: First enforcement-proof slice started. Added focused API-query coverage for `createInboundShipmentFromDemandsQuery` proving fulfilled parent orders are rejected from component-selected inbound creation and cancelled parent orders are rejected from demand-id inbound creation before demand preparation or shipment writes run.
- 2026-07-01: Sales Overview Inventory tab loading was tightened to follow the plan's active-tab rule. The linked order-inbounds query now runs only when the `Inbounds` segment is active; inactive segment badges reuse the overview row signal instead of eagerly loading shipment detail.
- 2026-07-01: Terminal-order proof expanded. Package policy coverage now asserts cancelled orders with existing inventory rows are read-only, and API-query coverage proves inbound creation is rejected when fulfillment is derived from completed delivery or completed dispatch-stat evidence rather than only the raw order status field.
- 2026-07-01: Existing-inbound assignment now reuses the same terminal parent-sale guard as create-inbound. `assignInboundDemandsQuery` rejects demand from fulfilled/cancelled sales before package assignment, shipment lookup, demand linking, item quantity writes, or assignment activity evidence.
- 2026-07-01: Sales Overview Inventory read-only UI now covers linked inbound and row-level controls, not only the stock action bar. Fulfilled/cancelled orders with existing inventory rows can inspect linked inbound history, but receive-stock, inbound status updates, stock allocation, and row configuration controls are disabled with the shared lock reason.
- 2026-07-01: Stock allocation review API mutations now enforce the same terminal parent-sale policy as the Sales Overview Inventory UI. Single approve, reject, and bulk approve run through a transaction-scoped preflight that resolves active pending allocation parent sales and rejects fulfilled/cancelled orders before stock allocation writes or component recomputes.
- 2026-07-01: Received-inbound backorder release proof was added. `allocateReceivedInboundToBackorders` now has focused package coverage proving retries skip already covered received demand, only reserve the uncovered remainder for partially covered demand, and skip inactive component rows before stock lookup or allocation creation.
- 2026-07-01: Ship-available partial shipment now guards completed delivery compatibility rows behind confirmed allocation consumption. `shipAvailableSalesInventory` consumes planned component allocations first, rejects stale or concurrently claimed consumption, and writes `OrderDelivery` / `OrderItemDelivery` rows only after inventory truth is confirmed; focused package coverage pins success reconciliation and stale-consume failure ordering.
- 2026-07-01: Phase 0 invariant ownership matrix was recorded in `brain/reports/2026-07-01-inventory-correctness-invariant-matrix.md`. All eight non-negotiable invariants now have named code owners, current evidence, status, and remaining proof gates.
- 2026-07-01: Phase 6 Mark As continue proof was tightened. `resolveSalesInventoryMarkAsAvailabilityForContinue` now recomputes component demand state through an active-row guarded write, and focused package coverage proves stale preview demand cannot mark the order `AVAILABLE`, write audit history, or allow continue unless demand cancellation is confirmed by the apply operation.
- 2026-07-01: Phase 6 production lifecycle projection writes were tightened. `syncInventoryProductionLifecycleForSale` now updates `LineItem.meta.production` through an active-row guarded write and reports `updated` only from confirmed writes; focused package coverage proves stale line items are not counted as updated.
- 2026-07-01: Phase 7 dispatch release proof was tightened. Dispatch allocation recompute now uses an active component guarded write, and focused package coverage proves release skips already-consumed allocations while releasing only eligible picked rows and recomputing only touched components.
- 2026-07-01: Brain tracking was normalized for the current cutover checkpoint. The plan, roadmap, in-progress ledger, done ledger, invariant matrix, and progress log now distinguish completed hardening slices from the remaining repair, reconciliation, browser/operator, UI polish, and release gates. This checkpoint does not mark the full inventory correctness cutover complete.
- 2026-07-01: Phase 8 reviewed inbound-status repair proof was tightened. `repairSalesInventoryInboundStatusBackfill` now guards apply writes by the exact reviewed legacy `SalesOrders.inventoryStatus` baseline as well as active inventory-owned inbound/stale status, and focused API-query coverage proves dry-run is non-mutating, audit history is written only for confirmed guarded writes, and stale apply attempts are classified as `changed_before_apply`.
- 2026-07-01: Phase 8 stale inventory sale-line cleanup proof was tightened. `cleanupStaleSalesInventoryLineItems` now soft-deletes only line items still matching the stale predicate, then cleans allocation, inbound-demand, and component residue only under line items confirmed by that apply; focused package coverage proves a restored/reassigned stale pre-read line does not trigger child cleanup.
- 2026-07-01: Phase 8 sales inventory sync stale-line proof was tightened. `syncSalesInventoryLineItems` now reports removed-sales-item stale line cleanup from confirmed guarded line soft-deletes and cleans child allocation, inbound-demand, and component residue only under lines confirmed by that sync apply; focused package coverage proves stale pre-read lines skip child cleanup when the guarded line write is not confirmed.
- 2026-07-01: Phase 8 sales inventory sync stale-component proof was tightened. Stale component cleanup on still-active synced lines now matches exact pre-read component identity before releasing allocations, cancelling inbound demand, or deleting the component; focused package coverage pins the guarded cleanup payload.
- 2026-07-01: Brain tracking was realigned after the Phase 8 sync stale-component proof. The plan, roadmap, current-work ledger, done ledger, and progress log now state the same cutover posture: completed slices are recorded as done evidence, while the overall cutover remains in progress with Phase 8 reconciliation and Phase 10/11 proof gates still open.
- 2026-07-01: Phase 8 repair entry validation was tightened. Sales inventory overview sync, repair sync, legacy-status setup, and Trigger sync/backfill schemas now require positive integer sales order ids, and backfill cursor/batch inputs are integer-guarded; focused jobs schema coverage pins invalid decimal, negative, zero, and empty explicit-id payload rejection.
- 2026-07-01: Phase 8 explicit backfill repair coverage was tightened. `backfill-sales-inventory-line-items` now caps explicit `salesOrderIds` at 200 and uses the explicit id count as the query limit for targeted repair batches, while cursor-based backfills still use bounded `batchSize`; focused jobs coverage proves explicit targeted repair cannot be silently truncated by the default batch size.
- 2026-07-01: Phase 8 stale cleanup repair input validation was tightened. `cleanupStaleSalesInventoryLineItems` now exposes a route schema that rejects explicit empty `lineItemIds`, non-positive or decimal line ids, and out-of-bounds repair limits before stale cleanup scanning; focused route schema coverage pins the targeted-repair guard so an empty explicit id list cannot widen into the default repair scan.
- 2026-07-01: Phase 8 legacy-status setup repair proof was tightened. `resolveSalesInventoryLegacyStatusSetup` now lives in the sales package and revalidates the exact reviewed manual `SalesOrders.inventoryStatus` inside the transaction before reset/override audit history or single-sale sync can run; focused package coverage proves stale reset attempts stop before history/sync and override checks the same baseline.
- 2026-07-01: Phase 8 repair-path audit checkpoint completed. Targeted review of inventory cutover repair/backfill/cleanup/reconciliation surfaces found no remaining hidden mutating repair path in the sales inventory correctness scope beyond the now-proven sync/repair/backfill, reviewed inbound-status repair, stale cleanup, legacy-status setup, and dry-run reconciliation surfaces. Inventory import/source-label/product-kind backfills and Dyke sync remain separate inventory import/integration workstreams, not Phase 8 sales inventory correctness repair gates.
- 2026-07-01: Phase 8 reconciliation dry-run input validation was tightened. Inventory reconciliation report/query/Trigger inputs now require positive integer `salesOrderId`, non-negative integer `cursorId`, and integer-bounded `limit` / `sampleLimit`, while the sync monitor's embedded reconciliation sampling inputs are integer-guarded; focused jobs schema coverage pins invalid dry-run evidence cursors and limits.
- 2026-07-01: Phase 8 reconciliation evidence runner was added. `bun run inventory:reconciliation-evidence` now produces a read-only monitor/reconciliation/stale-cleanup/componentless-lines evidence snapshot in Markdown or JSON. The initial baseline run was not clean: monitor status was `needs_backfill`, reconciliation status was `needs_review`, drift count was 65, skipped comparisons were 117, componentless line count was 56, and stale line count was 3. The clean reconciliation gate remains open.
- 2026-07-01: Phase 8 reconciliation component-fulfillment semantics were aligned with sync. `pending_review` stock allocations now count as suggested allocation coverage when deriving expected component fulfillment status, matching `syncSalesInventoryLineItems`; this removed two false component-fulfillment warning drifts from the evidence baseline.
- 2026-07-01: Phase 8 reconciliation evidence now emits a reviewed repair plan in Markdown and JSON. The plan remains read-only and lists the exact existing guarded entrypoint payloads for stale-line cleanup dry-run/apply review, explicit componentless-sales re-sync, bounded missing-sales backfill, and post-repair evidence rerun.
- 2026-07-01: Phase 8 reviewed repair runner was added. `bun run inventory:reconciliation-repair` is dry-run by default, reports the same stale/componentless repair candidates, keeps missing-sales backfill excluded unless explicitly requested, and blocks mutation unless both `--apply` and `--confirm-review` are provided.
- 2026-07-01: Phase 8 reviewed stale/componentless repair was applied, excluding broad missing-sales backfill. Stale line cleanup removed the three reviewed stale lines, componentless re-sync cleared all 56 componentless manual inventory sale lines, and the latest evidence now reports `0` sales-inventory-sync drift, `0` component-fulfillment drift, `9` shipment/allocation drift, `1` skipped comparison, and monitor status `needs_backfill`.
- 2026-07-01: Phase 8 sync stale-cleanup precision fix landed. Stale component and stale-line child cleanup now deletes confirmed child allocation/demand residue using guarded identity plus `deletedAt not null` instead of exact timestamp equality, avoiding MySQL timestamp precision mismatches while preserving confirmed-write cleanup semantics.
- 2026-07-01: Phase 8 shipment/allocation evidence was classified. The read-only reconciliation evidence command now reports `shipmentAllocation` buckets: `8` completed deliveries without matching consumed allocation quantity, `1` consumed allocation without matching completed delivery, and `1` missing legacy sales-item link. This does not repair data; it makes the remaining shipment review gate explicit before any delivery/allocation mutation.
- 2026-07-01: Phase 8 missing-sales evidence was classified. The read-only reconciliation evidence command now reports `missingSalesScope` buckets for the broad `needs_backfill` blocker: `2209` active-status candidates, `15` statusless order-id candidates, `12` statusless quote-id rows, `63` quote-status rows, `167` terminal/history rows, `725` completed-production rows, `1` manual inventory-status row, and `17857` still-unknown statusless rows. This does not change monitor semantics; it prevents broad backfill from being treated as one undifferentiated repair.
- 2026-07-01: Phase 8 missing-sales evidence now emits a scoped reviewed active/order backfill batch. The first batch contains sales order ids `271`, `275`, `302`, `303`, `332`, `347`, `350`, `354`, `366`, `374`, `400`, `405`, `407`, `413`, `416`, `417`, `426`, `428`, `429`, `430`, `438`, `439`, `440`, `454`, `456`, `464`, `467`, `469`, `470`, `493`, `494`, `500`, `513`, `514`, `520`, `525`, `527`, `535`, `543`, `544`, `557`, `568`, `569`, `573`, `585`, `595`, `596`, `606`, `608`, and `609`, leaving `2174` reviewed active/order candidates for later batches. The repair runner accepts the explicit list through `--include-missing-backfill --missing-sales-order-ids <csv>` and dry-ran the batch with no mutation.
- 2026-07-01: Phase 8 scoped missing-sales backfill apply evidence was refined. The first old active/order batch applied as a mapping-blocked no-op, so the evidence command now separates materializable active/order candidates from mapping-blocked ones. The first materializable batch (`1366` through `1521`) applied with `50` material-applied orders and `147` created inventory sale lines, reducing missing sales from `21049` to `20999`. It also exposed `86` componentless zero-component lines across `43` orders; a reviewed componentless re-sync updated `131` lines but could not create components because `inventorySync.componentCount=0`, so those rows now require component-scope review instead of another re-sync. The evidence command now classifies all `86` rows as `house_package_doors_missing_component_mapping_fields`, meaning parent mapping exists but HPT door/form-step source rows carry zero component candidate hints.
- 2026-07-01: Phase 8 HPT door component fallback landed. HPT child door rows missing their own mapped `stepProduct` now reuse the HPT root product as a deterministic component source, inch-marked door dimensions normalize to Dyke size variant UIDs, and zero-quantity door rows derive quantity from price math when possible. Focused package coverage proves `34" x 80"` and `36" x 80"` HPT door rows generate component candidates from the root product. A reviewed zero-component repair dry-run/apply of the `43` affected orders updated `131` line items, skipped `10` unmapped sales items, and cleared componentless evidence to `0`.
- 2026-07-01: Phase 8 materializable active/order backfill continued. Reviewed dry-runs for batches `1523` through `1640`, `1641` through `1718`, `1720` through `1821`, and `1822` through `1926` planned `50` explicit orders each with `0` skipped explicit ids, and confirmed applies material-applied all `200` orders. The four batches created `738` inventory sale lines total, skipped `161` unmapped sales items as item-level warnings, reduced missing sales from `20999` to `20799`, and kept componentless/stale evidence at `0`.
- 2026-07-01: Phase 8 materializable active/order backfill continued again. Reviewed dry-runs for batches `1927` through `2087` and `2088` through `2274` planned `50` explicit orders each with `0` skipped explicit ids, and confirmed applies material-applied all `100` orders. The two batches created `192` inventory sale lines total, skipped `164` unmapped sales items as item-level warnings, reduced missing sales from `20799` to `20699`, lifted sync coverage to `1.87%`, and kept componentless/stale evidence at `0`.
- 2026-07-01: Phase 8 materializable active/order backfill continued again. Reviewed dry-runs for batches `2275` through `2397` and `2398` through `2484` planned `50` explicit orders each with `0` skipped explicit ids, and confirmed applies material-applied all `100` orders. The two batches created `160` inventory sale lines total, skipped `127` unmapped sales items as item-level warnings, reduced missing sales from `20699` to `20599`, lifted sync coverage to `2.34%`, and kept componentless/stale evidence at `0`.
- 2026-07-01: Phase 8 materializable active/order backfill continued again. The reviewed dry-run for batch `2485` through `2581` planned `50` explicit orders with `0` skipped explicit ids, and the confirmed apply material-applied all `50` orders. The batch created `81` inventory sale lines, skipped `44` unmapped sales items as item-level warnings, reduced missing sales from `20599` to `20549`, lifted sync coverage to `2.58%`, and kept componentless/stale evidence at `0`.
- 2026-07-01: Phase 8 materializable active/order backfill continued for two more reviewed batches, then was stopped by user request. Reviewed dry-runs for batches `2587` through `2688` and `2690` through `2791` each planned `50` explicit orders with `0` skipped explicit ids; confirmed applies material-applied all `100` orders. The two batches created `152` inventory sale lines total, skipped `84` unmapped sales items as item-level warnings, reduced missing sales from `20549` to `20449`, lifted sync coverage to `3.05%`, and kept componentless/stale evidence at `0`. No further repair dry-runs or applies should run unless the user explicitly resumes repairs.
- 2026-07-01: Received-backorder allocation retry input validation was tightened. The shared `allocateReceivedInboundToBackorders` schema now requires positive integer sales order, line-item component, and inventory variant filters plus integer-bounded limits before retry allocation scans run; focused jobs schema coverage pins invalid retry filter rejection.
- 2026-07-01: Phase 6 Mark As batch input validation was tightened. `salesInventoryMarkAsPreflight` and `resolveSalesInventoryMarkAsAvailabilityForContinue` now share a positive-integer `salesOrderIds` batch guard capped at 100 orders, and focused route schema coverage rejects empty, zero, negative, and decimal order-id batches before production/fulfilled inventory gates run.
- 2026-07-01: Brain ledger correction was recorded for the inventory correctness cutover. The plan, roadmap, in-progress ledger, done ledger, and progress log kept the July 1 cutover in progress, linked the source and related intakes, recorded completed hardening/proof slices as evidence only, and preserved that checkpoint's pending order of Phase 8 repair audit, clean reconciliation, Phase 1-7 operator proof gaps, Phase 9 UI polish, Phase 10 browser proof, and Phase 11 release gates. The repair-path audit was later completed; the current next gate is clean Phase 8 reconciliation evidence.
- 2026-07-01: Phase 5/7 partial shipment and dispatch route input validation was tightened. `shipAvailableSalesInventory`, line hold, dispatch assign, pack, fulfill, and release schemas now reject non-positive or decimal order, line, and allocation ids before shipment/dispatch mutation planning runs; focused route schema coverage pins those invalid payloads.
- 2026-07-01: Phase 4 inbound receiving/status route input validation was tightened. `receiveInboundShipment` and `updateInboundShipmentStatus` schemas now reject non-positive or decimal shipment/item ids, and receive rejects negative receipt quantity or unit-price values before inbound lifecycle transaction work starts; focused route schema coverage pins those invalid payloads.
- 2026-07-01: Phase 3 inbound create/assign route input validation was tightened. `createInboundShipmentFromDemands` and `assignInboundDemands` schemas now reject non-positive or decimal supplier, inbound, demand, and component ids, reject empty assignment batches, and reject non-positive selected component quantities before inbound demand preparation or assignment planning runs; focused route schema coverage pins those invalid payloads.
- 2026-07-01: Phase 5 allocation review route input validation was tightened. Stock allocation approve, reject, and bulk-approve schemas now reject non-positive or decimal allocation ids, reject empty bulk approval batches, and reject non-positive single-approval override quantities before allocation review planning runs; focused schema coverage pins those invalid payloads.
- 2026-07-01: Phase 4 inbound issue route input validation was tightened. `reportInboundItemIssue` and `resolveInboundItemIssue` schemas now reject non-positive or decimal issue/shipment-item ids, require positive reported issue quantities, and reject negative resolved quantities before inbound issue rows are created or updated; focused schema coverage pins those invalid payloads.

## Objective
Make the inventory system operationally correct across sales setup, demand projection, allocation, inbound creation, receiving, production, dispatch, stock audit, reconciliation, and the Sales Overview Inventory tab. "100% correctly" means every inventory mutation is source-of-truth aligned, guarded against stale writes, validated by focused tests, and proven through operator/browser evidence before broader cutover.

## Assumptions
- Inventory remains the operational source for line/component demand, allocation, inbound, and fulfillment projections.
- Sales can keep the manual order-level `SalesOrders.inventoryStatus` prompt, but inventory owns `InboundDemand` status semantics per ADR-009.
- `OrderDelivery` / `OrderItemDelivery` remain canonical shipment records for the current cutover phase per ADR-008.
- Existing inventory foundations are kept; this is a hardening and cutover plan, not a rewrite.
- UI work should follow shadcn primitives and Midday-style composition: thin route shells, active-tab loading, compact operational surfaces, and no heavy eager data loads.

## Non-Negotiable Invariants
1. Fulfilled or cancelled orders are read-only for inventory operations. Existing inventory rows may be inspected, but create inbound, manual sync, allocation, mark available, and tracking changes must be blocked in UI and server mutations.
2. Inventory setup mode is explicit:
   - `not_configured`: active order can sync inventory.
   - `legacy_status_locked`: manual inbound status exists and requires reset or override before setup.
   - `completed_readonly`: fulfilled historical order has no prior inventory integration and renders information only.
   - `active`: inventory rows exist and normal workbench rules apply.
3. `InventoryStock` is physical stock truth, `StockAllocation` is reservation/pick/consume truth, and `InboundDemand` is shortage/inbound truth.
4. Manual order prompts may mutate only unassigned, unreceived mutable demand; broad `AVAILABLE` remains non-destructive.
5. Inventory-created inbound work owns inbound lifecycle status after demand links to an active inbound shipment item.
6. Mutation results, audit rows, status syncs, and component recomputes must be derived only from confirmed guarded writes.
7. Retry and duplicate actions must be safe: no duplicate inbound quantities, duplicate stock movements, duplicate receives, or stale status overwrites.
8. Partial shipment must never clone a sale. Remaining quantity stays on the original inventory-backed line projection.

## Phase Status Snapshot
- Phase 0 Baseline Audit And Invariant Matrix: satisfied at the documentation ownership level; the invariant matrix has no unowned invariants, but implementation/browser proof gates remain open.
- Phase 1 Sales Overview Inventory Tab Correctness: in progress; tab order, active inbounds loading, and fulfilled/cancelled read-only controls have landed, but the full manual/browser validation gate remains open.
- Phase 2 Sales Inventory Sync And Projection: pending for this cutover plan; existing sync foundations remain documented in the feature file.
- Phase 3 Inbound Demand Creation And Assignment: in progress; fulfilled/cancelled parent-sale rejection, confirmed-link evidence, existing-inbound assignment guards, and inbound create/assign input validation proof have landed, but duplicate/concurrency/browser proof remains open.
- Phase 4 Receiving, Cancellation, And Inbound Issues: in progress; earlier receive/cancellation guardrails, inbound receive/status input validation proof, and inbound issue report/resolve input validation proof have landed, but issue replacement behavior and operator validation remain open.
- Phase 5 Allocation, Backorder, And Partial Shipment: in progress; allocation review parent-sale guards, allocation review input validation proof, received-backorder retry/active-component proof, received-backorder retry input validation proof, ship-available confirmed-consumption guards, and ship/hold positive-id route proof have landed, but browser/operator proof remains open.
- Phase 6 Production And Fulfillment Gates: in progress; Mark As preflight foundations, Mark As batch input validation proof, stale-blocker continue proof, and production lifecycle confirmed-write proof have landed, but full production lifecycle browser/operator proof remains open.
- Phase 7 Inventory Dispatch Mode: in progress; allocation transition, fulfill, release-safety package proof, and dispatch positive-id route proof exist, but exact operator proof and reconciliation evidence remain open.
- Phase 8 Reconciliation, Repair, And Monitoring: in progress; dry-run monitor/report foundations, reviewed inbound-status repair proof, standalone stale-line cleanup proof, sync stale-line cleanup proof, sync stale-component cleanup proof, repair-entry positive-id validation proof, explicit backfill repair coverage proof, stale cleanup repair input validation proof, legacy-status setup exact-baseline proof, reconciliation dry-run input validation proof, repair-path audit checkpoint, a reusable read-only reconciliation evidence command, pending-review allocation reconciliation alignment, reviewed repair-plan output, a dry-run-first reviewed repair runner, reviewed stale/componentless repair apply evidence, sync stale-cleanup timestamp precision hardening, shipment/allocation blocker classification, missing-sales scope classification, scoped active/order missing-sales backfill batch evidence, materializable/mapping-blocked backfill classification, zero-component componentless review evidence, HPT door component fallback, reviewed zero-component repair apply evidence, and eleven additional reviewed materializable backfill applies exist. The latest evidence run is not clean, but componentless/stale evidence is clear; repairs are stopped by user request, and full clean-run reconciliation remains open on missing-sales scope, shipment/allocation drift, the remaining skipped comparison, and the partial cursor.
- Phase 9 UI And Operator Experience Polish: pending final pass.
- Phase 10 Test And Browser Proof Matrix: pending; this is the main remaining cutover evidence gate.
- Phase 11 Release And Cutover Gates: pending; do not mark complete until reconciliation, browser proof, and final acceptance checks are recorded.

## Current Pending Phase Checklist
The cutover is not complete. The next execution slices should close these gates in order:
1. Phase 8 reconciliation evidence: `bun run inventory:reconciliation-evidence --json` records read-only monitor/report evidence with exact repair-candidate ids, missing-sales scope classification, materializable/mapping-blocked active-order backfill classification, zero-component componentless review, and shipment/allocation classifications, and `bun run inventory:reconciliation-repair` provides a dry-run-first guarded repair runner. The reviewed stale/componentless repair slice has been applied, the first twelve materializable active/order backfill batches created `1470` inventory sale lines total, and the HPT door fallback plus reviewed zero-component repair apply cleared componentless evidence to `0` lines and `0` sales. The latest successful evidence run is still not clean (`needs_backfill`, `20449` missing sales, `9` shipment/allocation drift, `1` skipped comparison, `hasMore=true`, next cursor `208`). Repairs are stopped by user request; if explicitly resumed, the next reviewed materializable active/order batch has `50` ids from `244` remaining materializable candidates. Non-active and mapping-blocked missing-sales scope plus classified shipment/allocation buckets still need decisions before clean reconciliation can be claimed.
2. Phase 1 browser/operator proof: validate Inventory tab setup modes, fulfilled/no-integration information UI, terminal read-only rows, and locked linked-inbound controls.
3. Phase 2 sync/projection proof: verify save/copy/manual/repair sync sources, mixed line projections, stale-demand handling, and monitor status behavior.
4. Phase 3 duplicate/concurrency proof: validate duplicate create/assign retries, already-linked demand, concurrent receive-before-link, partial selected quantity split, and terminal parent rejection.
5. Phase 4 receiving/cancellation/issues proof: issue route input validation is done; decide replacement behavior for issue receipts and validate receive/cancel issue flows from operator surfaces.
6. Phase 5 allocation/backorder/partial-shipment proof: record allocation review, received-backorder retry, partial shipment, and hold-until-complete evidence.
7. Phase 6 production/fulfillment operator proof: validate configured-order Mark As blockers, safe continue, and production lifecycle behavior in the live workflow.
8. Phase 7 dispatch operator proof: validate assign, pack, fulfill, release, and delivery-quantity reconciliation against consumed allocation state.
9. Phase 9 UI polish: complete the shadcn/Midday pass for dense operational states, locked operations, routing, and responsive behavior.
10. Phase 10 proof matrix: record the full fixture-backed before/action/after browser evidence set in Brain.
11. Phase 11 release gates: only after the above, decide cutover defaults/toggles and record final acceptance.

## Detailed Execution Plan

### Phase 0: Baseline Audit And Invariant Matrix
1. Build a living invariant checklist mapped to code owners:
   - setup policy: `packages/sales/src/sales-inventory-policy.ts`
   - overview projection: `packages/sales/src/sales-inventory-overview.ts`
   - inbound policy and services: `packages/inventory/src/application/inbound/*`
   - fulfillment and dispatch: `packages/sales/src/sales-fulfillment-plan.ts`
   - API orchestration: `apps/api/src/trpc/routers/inventories.route.ts`
   - Sales Overview UI: `apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx`
2. Convert each invariant into one of: proven, implemented but needs proof, missing, or product-decision-needed.
3. Validation gate: a short report showing no invariant is unowned before implementation continues.

### Phase 1: Sales Overview Inventory Tab Correctness
1. Verify the tab order and empty states:
   - segments must be `Stock | Inbounds | Non Stock`
   - fulfilled/no-integration orders render the polished read-only information state
   - fulfilled/cancelled orders with existing rows render inspectable but locked inventory
2. Make the action bar capability-driven only:
   - hide or disable create inbound, allocation, mark available, sync, and tracking edits from shared capability flags
   - show one clear shadcn alert/state when actions are locked
3. Keep Midday-style loading:
   - overview query for first paint
   - inbounds query only for the inbounds segment/detail
   - no eager mounting of every secondary workflow
4. Validation gate:
   - manual-only active order
   - active configured order with stock shortage
   - active configured order with linked inbound
   - fulfilled order with no inventory rows
   - fulfilled/cancelled order with existing rows

### Phase 2: Sales Inventory Sync And Projection
1. Verify save/copy/manual/repair paths queue the same sales inventory sync job with clear source labels.
2. Re-check projection mapping for doors, HPT, moulding, shelf, service, custom, variants, pricing, and produceable metadata.
3. Ensure sync does not revive stale allocations or cancelled/deleted demand.
4. Ensure new `InboundDemand` rows use inventory-owned order prompt status resolution.
5. Validation gate:
   - focused sync tests for mixed line types
   - real-data sync monitor run with no componentless/stale-risk surprises
   - sync monitor remains `needs_review` when reconciliation is partial or skipped

### Phase 3: Inbound Demand Creation And Assignment
1. In the Sales Overview Inventory tab, create inbound only from orderable shortage quantity, not raw pending quantity.
2. Keep component-selection and demand-id inputs sanitized at the inventory boundary.
3. For create-inbound and assign-to-existing-inbound:
   - use only active, unassigned demand
   - guard link writes by expected `qtyReceived`
   - compute item quantities only from confirmed linked demand
   - reject zero confirmed links
   - guard item quantity commits by parent inbound active state
   - update affected `SalesOrders.inventoryStatus` to `ORDERED` only from confirmed linked demand
4. Validation gate:
   - duplicate create retry
   - already-linked demand retry
   - concurrent receive before link
   - partial selected quantity split
   - fulfilled/cancelled parent order rejection

### Phase 4: Receiving, Cancellation, And Inbound Issues
1. Preserve delta-based receive semantics:
   - explicit item list receives only supplied rows
   - omitted `items` preserves legacy receive-all behavior
   - duplicate item ids and cross-shipment item ids fail before mutation
   - new good/issue deltas cannot exceed planned quantity
2. Keep downstream writes behind confirmed item receipt guards:
   - stock increments
   - stock movement
   - inventory log
   - demand receipt
   - issue rows
   - component recompute
3. Cancellation releases only unreceived active demand still linked to the cancelled parent inbound.
4. Decide replacement behavior for damaged/missing/wrong item receipts:
   - automatic follow-up inbound, or
   - explicit operator action with linked issue context
5. Validation gate:
   - repeat receive creates no duplicate stock movement
   - partial receive recomputes only confirmed components
   - cancellation does not release received demand
   - issue-open shipments remain correctly blocked or actionable

### Phase 5: Allocation, Backorder, And Partial Shipment
1. Prove allocation review transitions are idempotent:
   - approve
   - reject
   - bulk approve
   - already transitioned rows report skipped evidence
2. Confirm received inbound auto-allocation to backorders cannot duplicate allocations on retry.
3. Reconcile partial shipment behavior:
   - required components gate shipment
   - optional shortages do not block required shipment
   - `holdUntilComplete` prevents accidental partial shipment
   - completed `OrderItemDelivery` quantities match consumed `StockAllocation` quantities
4. Validation gate:
   - allocation review browser/operator proof
   - received-backorder retry proof
   - partial shipment and held-line proof

### Phase 6: Production And Fulfillment Gates
1. Keep production assignment/start gated by inventory readiness for required inventory-backed components.
2. Confirm sales-control mutations refresh inventory production lifecycle only for production-relevant events.
3. Before `production_completed` or `fulfilled`, run `salesInventoryMarkAsPreflight`.
4. Continue only when:
   - no inventory blockers exist, or
   - the explicit continue mutation safely resolves confirmed unlinked mutable demand and post-preflight is clean
5. Validation gate:
   - no-inventory legacy orders still mark as before
   - configured orders with inbound/allocation blockers prompt
   - stale blockers do not get marked available from preview evidence
   - fulfilled status cannot create new inbound afterward

### Phase 7: Inventory Dispatch Mode
1. Treat inventory dispatch transitions as allocation state transitions:
   - assign: approved to reserved
   - pack: reserved to picked
   - fulfill: picked to consumed
   - release: approved/reserved/picked to released when not consumed
2. Write legacy delivery compatibility rows only after allocation consumption succeeds.
3. Show operator controls only for exact eligible allocation ids.
4. Validation gate:
   - stale allocation ids skip safely
   - fulfill consumes picked allocations before delivery rows
   - release never revives consumed allocations
   - delivery quantities reconcile to consumed inventory quantities

### Phase 8: Reconciliation, Repair, And Monitoring
1. Make dry-run reports the first-class safety surface:
   - sales inventory sync monitor
   - stale sales inventory line cleanup
   - inventory reconciliation report
   - inbound status backfill preview
   - Dyke/inventory drift report
2. Repairs must be explicit, reviewed, and dry-run by default.
3. Add or maintain operator evidence:
   - total mismatch counts
   - remaining mismatch counts after apply
   - classified skipped reasons
   - bounded samples and cursors
4. Validation gate:
   - no hidden mutating repair path without dry-run
   - clean status requires no partial cursors and no skipped comparisons
   - every repair writes enough audit/history evidence to explain the change

### Phase 9: UI And Operator Experience Polish
1. Use shadcn primitives consistently:
   - `Item` rows for dense work lists
   - alert dialogs for destructive or status-changing actions
   - segmented controls for inventory segments
   - dropdown menus for row configuration
   - badges only for scan-friendly status/metric tokens
2. Keep operational pages quiet and dense:
   - no marketing-style hero sections
   - no nested cards
   - no broad first-paint query that loads every tab
3. For status displays, always reveal source:
   - manual order status
   - inventory inbound status
4. Validation gate:
   - desktop and mobile widths do not overflow
   - buttons cannot expose locked operations
   - status clicks route to the correct inventory/inbound surface

### Phase 10: Test And Browser Proof Matrix
1. Domain tests:
   - inbound policy and demand mutation
   - create/assign inbound
   - receive/cancel/issue handling
   - allocation and dispatch transitions
   - sales inventory sync/projection
   - mark-as preflight and continue
2. API tests:
   - router import smoke
   - mutation transaction boundaries
   - response payload evidence fields
3. UI tests/import checks:
   - Inventory tab capability states
   - Mark As preflight dialog
   - inbound status navigation
4. Browser/operator proof:
   - use the existing inventory fixture readiness report
   - capture before/action/after evidence for allocation, inbound receive, backorder release, partial shipment, held line, stock adjustment, low stock, dispatch assign/pack/fulfill/release, and Sales Overview Inventory tab setup modes
5. Validation gate:
   - no broad cutover until fixture readiness is complete, reconciliation is clean, and browser evidence is recorded in Brain.

### Phase 11: Release And Cutover Gates
1. Ship in this order:
   - policy and server guards
   - API payload evidence
   - UI capability wiring
   - reconciliation/repair evidence
   - browser proof
   - cutover toggles/defaults
2. Keep existing legacy paths available until:
   - inventory sync monitor is clean
   - reconciliation has no drift, skipped comparisons, or remaining cursor
   - inbound status backfill preview is clean
   - print parity proof remains acceptable for the target modes
   - operator validation covers the full mutation matrix
3. Final cutover acceptance:
   - no fulfilled/cancelled order can create inbound
   - no shipment-linked or received demand can be mutated by a manual prompt
   - no duplicate receive or duplicate inbound creation can change stock/demand twice
   - production/fulfilled actions cannot bypass unresolved inventory blockers
   - all repair paths are dry-run-first and audited

## Recommended First Implementation Slice
Start with a focused audit and enforcement pass around the Sales Overview Inventory tab and inbound creation boundary:
1. Prove the current fulfilled/cancelled read-only policy in UI and API.
2. Add any missing tests for `canCreateInbound=false` and server-side create-inbound rejection.
3. Browser-check one fulfilled order with no previous inventory integration and one fulfilled/cancelled order with existing inventory rows.
4. Then continue to inbound receive/cancellation and mark-as guard evidence.

## Risks And Mitigations
- Risk: UI-only disabling still lets stale clients call mutations. Mitigation: every capability must be reinforced server-side.
- Risk: old manual order status diverges from inventory-owned inbound status. Mitigation: keep ownership lookup shared and route inventory-owned rows to linked inbound surfaces.
- Risk: confirmed-write evidence drifts from requested input. Mitigation: derive status sync, audit, recompute, and response counts only from rows actually changed.
- Risk: cutover reports look clean from a bounded sample. Mitigation: treat partial cursors and skipped comparisons as `needs_review`.
- Risk: broad validation is slow and fragile. Mitigation: use existing fixture readiness, deterministic proof targets, and focused package tests before browser proof.

## Skills List Used
- plan: used to produce an execution-ready plan before implementation.
- project-brain: used through the repository Brain docs to align with current architecture, decisions, and progress.
- fast-bun-monorepo-command-discipline: used to keep inspection narrow and avoid heavyweight validation during planning.

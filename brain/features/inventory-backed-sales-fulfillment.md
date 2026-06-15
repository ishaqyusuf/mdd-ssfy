# Inventory-Backed Sales Fulfillment

## Goal
Use inventory as the operational truth for sales fulfillment while legacy sales continues to work during migration.

The long-term source of truth for overview, print, production, deployment, fulfillment, and reporting should be inventory-backed projections, not cloned or forked sales records.

## Core Rule
- Do not clone a sale to represent backorder.
- Split fulfillment state at the sale line and component level.
- A line can only move forward when all required fulfillment units are available for that step.
- If one required component is missing, the line remains blocked even when other components are available.

## Core Units
- [x] `LineItem` is the inventory-backed sale line.
- [x] `LineItemComponents` is the BOM / production component demand row.
- [x] `InventoryStock` remains the physical/current stock source.
- [x] `StockAllocation` tracks reserved, picked, consumed, and released inventory.
- [x] `InboundDemand` tracks unavailable quantity expected through supplier/receiving.
- [x] `InboundShipment` / `InboundShipmentItem` support the receiving workflow.
- [x] `SalesFulfillmentPlan` exists as a projection over ordered, allocated, picked, shipped, remaining, backordered, inbound, and received quantities.
- [x] `OrderDelivery` / `OrderItemDelivery` are the canonical shipment records for the current inventory cutover phase; see `brain/decisions/ADR-008-inventory-shipment-record-source.md`.

## Follow-Up Review: 2026-06-12

### Requested Capability Status
- Inventory to Dyke create/update: partially in place. `dykeUpdateFromInventory(...)` can update existing Dyke category/product title/image by UID, and `inventories.dykeUpdateFromInventory` exposes it. Missing: first-class create semantics, variant/pricing sync, delete/archive behavior, idempotent job wrapper, drift report, and operator UI.
- Inventory variant price update sync to Dyke: missing. `updateVariantCost(...)` updates inventory variant pricing/history only; it does not write equivalent `DykePricingSystem` rows.
- Order item production assigned updates inventory lines: missing. `update-sales-control` handles `createAssignments` and sends production assignment notifications, but does not update inventory line/component lifecycle fields.
- Order production fulfilled updates inventory equivalent as fulfilled: missing. Production submissions update legacy/control `prodCompleted`; inventory component `fulfilled` currently means stock/inbound fulfillment, not production completion.
- Print from inventory feature: partially in place. `/p/sales-inventory-v2`, `print.salesInventoryV2`, and `packages/sales/src/print/inventory-print-data.ts` render from inventory `LineItem` / `LineItemComponents` through the v2 PDF template. Missing: 100% Dyke-print compatibility proof, organized parity with the Dyke print composer structure, and completion of all packet types.
- Dispatch system inventory mode: partially in place. Existing dispatch and packing flow uses `update-sales-control`, and `shipAvailableSalesInventory(...)` can create partial shipments and consume allocations. Missing: inventory-native assign/pack/fulfill mode that drives `StockAllocation` reserved -> picked -> consumed while writing legacy `OrderDelivery` compatibility records.
- Inventory management pages: partially in place. Existing pages cover dashboard, products, components, categories, imports, inbounds, allocations, backorders, production plan, suppliers, stock operations, review, and shipping configuration. Existing stock-mode and low-stock alert support are in place. Missing: inventory item dashboard, working item "view" action, variants workspace, top-sales by inventory item/variant, related sales/quotes tabs, stock history/movement timeline, and deeper item-level operational analytics.

### What Is Missing Now
1. Full inventory-to-Dyke sync for create/update/delete/archive, not only title/image update by UID.
2. Inventory variant price and supplier-variant price propagation back into Dyke pricing rows.
3. Bidirectional Dyke/inventory drift report covering structure, variants, pricing, supplier pricing, stock-mode eligibility, and stale/deleted rows.
4. Inventory lifecycle bridge from `update-sales-control` production assignment events into inventory line projections.
5. Inventory lifecycle bridge from production completion events into inventory line/component production fulfillment projection.
6. Dispatch inventory mode that reserves, picks, packs, fulfills, and consumes inventory allocations while preserving legacy dispatch compatibility.
7. Explicit shipment-record decision: either add `SalesShipment` / `SalesShipmentLine` or document `OrderDelivery` / `OrderItemDelivery` as canonical shipment records.
8. Inventory print parity pass against Dyke print output with fixture/golden coverage for invoice, quote, production, packing, BOM, backorder, and customer remaining-summary packets.
9. Inventory item dashboard with overview, variants, stock, sales, quotes, allocations, inbound demand, shipment/dispatch, movement history, and top-sales analytics.
10. Reconciliation monitor/job coverage for inventory-backed sales drift. Dry-run sales reconciliation now exists; browser alerting, print visual parity automation, and production-grade migration gates remain pending.

## Detailed Execution Plan

### Phase A: Contract And Source-Of-Truth Decisions
1. Confirm inventory is the write source for inventory-created/edited items, while Dyke remains supported as a compatibility projection during migration.
2. Define the compatibility mapping:
   - `InventoryCategory.uid` -> `DykeSteps.uid`
   - `Inventory.uid` / `sourceComponentUid` -> `DykeStepProducts.uid`
   - `InventoryVariant` attributes -> Dyke price/variant keys
   - `InventoryVariantPricing` / `SupplierVariant` -> `DykePricingSystem`
3. Decide conflict rules:
   - inventory-origin edits push to Dyke
   - Dyke-origin edits pull to inventory through existing `sync-dyke-step-to-inventory`
   - drift reports surface conflicts instead of silently overwriting when both sides changed
4. Decide shipment records:
   - recommended: keep `OrderDelivery` / `OrderItemDelivery` as legacy-compatible shipment records for now, but add an ADR if they remain canonical
   - only add `SalesShipment` / `SalesShipmentLine` if reporting/audit needs cannot be met by the existing delivery tables
5. Validation:
   - add contract tests for mapping and conflict decisions before write-path changes
   - update Brain/ADR if canonical shipment decision is made

### Phase B: Inventory To Dyke Sync
Detailed implementation handoff: `brain/handoffs/inventory-to-dyke-sync-handoff.md`.

1. Extend `dykeUpdateFromInventory(...)` into a full package service:
   - create missing Dyke step/product rows when inventory rows have no Dyke equivalent
   - update category title/status and product name/image/status
   - map variant attributes to Dyke pricing/variant keys
   - soft-delete/archive Dyke equivalents when inventory is archived, with an escape hatch for legacy-only Dyke records
2. Add a Trigger job, `sync-inventory-to-dyke`, with idempotent payloads:
   - `inventoryCategoryId`
   - `inventoryId`
   - `inventoryVariantId`
   - `source: inventory-form | variant-price | supplier-variant | repair`
3. Queue the job from inventory write paths:
   - `saveInventoryCategoryForm`
   - `saveInventory`
   - `saveVariantForm`
   - `updateVariantCost`
   - `saveSupplierVariantForm` where Dyke supplier pricing should mirror
4. Extend drift reporting:
   - missing Dyke row
   - missing inventory row
   - title/image/status mismatch
   - variant key mismatch
   - cost/sales/supplier price mismatch
   - stale/deleted row mismatch
5. Validation:
   - unit tests for create/update/delete/archive mapping
   - focused integration test with one door/HPT variant set
   - repair job dry-run mode before mutation mode

### Phase C: Inventory Variant Price Sync To Dyke
1. Trace existing price identity:
   - inventory variant `uid`
   - variant attributes
   - inventory `sourceStepUid` / `sourceComponentUid`
   - supplier UID and `SupplierVariant`
   - current Dyke `DykePricingSystem` rows
2. Build `syncInventoryVariantPriceToDyke(...)`:
   - update existing Dyke price rows when a stable mapping exists
   - create missing Dyke price rows only when mapping is unambiguous
   - record skipped rows with reason when mapping is ambiguous
3. Wire it from:
   - `updateVariantCost`
   - `saveVariantForm`
   - `saveSupplierVariantForm`
4. Add UI feedback in the inventory variant pricing form:
   - synced
   - skipped
   - failed
   - drift detected
5. Validation:
   - price sync tests for generic variant price
   - supplier-specific variant price
   - delete/clear price
   - ambiguous mapping skip

### Phase D: Production Assignment And Fulfillment Inventory Bridge
1. Add a package-level bridge service, for example `applySalesControlInventoryLifecycle(...)`, called from `update-sales-control` after successful command execution.
2. On `createAssignments`:
   - ensure `syncSalesInventoryLineItems` has run for the sale
   - map current order item/control UID to `LineItem.salesItemId`
   - derive assigned production quantity per inventory line/component
   - expose assigned production qty in the inventory fulfillment/production projection
3. On `submitAll` / `updateSubmissions` / production completion:
   - map submitted production qty back to inventory lines
   - mark line production readiness/fulfillment in projection without confusing it with physical stock fulfillment
   - if durable schema is needed, add explicit production fields rather than overloading `LineItemComponents.status`
4. Recommended modeling:
   - keep `LineItemComponents.status` for stock/inbound state
   - derive or add separate production fields for `productionAssignedQty`, `productionFulfilledQty`, and `productionStatus`
5. Validation:
   - assignment creates/updates inventory projection without duplicating sales lines
   - partial production completion keeps remaining qty open
   - full production completion marks inventory production equivalent fulfilled
   - legacy sales production views remain unchanged

### Phase E: Dispatch System Inventory Mode
1. Add an inventory-mode dispatch plan backed by `SalesFulfillmentPlan`:
   - assign: reserve/approve available allocations for the dispatch batch
   - pack: move selected allocations to `picked`
   - fulfill: move picked allocations to `consumed`
   - release/cancel: move held allocations to `released`
2. Keep legacy compatibility writes:
   - continue creating/updating `OrderDelivery`
   - continue creating/updating `OrderItemDelivery`
   - keep `update-sales-control` stats in sync
3. Add UI mode gates:
   - existing dispatch mode remains legacy/control driven
   - inventory mode only appears when all target lines have inventory-backed projections
   - partial shipment and hold-until-complete become explicit options
4. Add reconciliation:
   - `OrderItemDelivery` packed/completed qty vs `StockAllocation.picked/consumed`
   - `SalesFulfillmentPlan.shippedQty` vs completed delivery qty
5. Validation:
   - assign-only does not reduce physical stock
   - pack marks allocations picked
   - fulfill consumes allocations and updates shipped/remaining/backorder projections
   - cancel/release restores availability

### Phase F: Inventory Print Parity
1. Reorganize inventory print code to mirror the Dyke/v2 print composer layout:
   - query
   - page builder
   - mode-specific sections
   - line/component row composers
   - parity helpers
2. Complete packet modes:
   - BOM
   - pick list
   - packing list
   - production packet
   - backorder packet
   - customer remaining quantity summary
3. Build parity fixtures:
   - simple door order
   - HPT package
   - shelf line
   - moulding/service mixed order
   - partial shipment/backorder
   - inbound-blocked line
4. Golden checks:
   - line order
   - quantities
   - descriptions
   - variant/supplier labels
   - prices hidden/shown per mode
   - dealer branding behavior
5. Cutover:
   - keep legacy Dyke print available as fallback until fixture parity passes
   - switch production/backorder/packing inventory surfaces to inventory print by default first
   - later switch general sales print once compatibility is proven

### Phase G: Inventory Management Dashboard Expansion
1. Add an item dashboard route/sheet:
   - `/inventory/[id]` or a full-screen mode from the current product sheet
   - wire the existing eye action to open it
2. Add item dashboard query:
   - product summary
   - variants
   - stock by variant/location/supplier
   - stock movements
   - low-stock thresholds
   - inbound demand
   - allocations
   - related sales/orders
   - related quotes
   - top-sales metrics
3. Add variants workspace instead of redirecting `/inventory/variants`:
   - searchable variant table
   - filters for stock mode, low stock, supplier, status, category, item
   - direct price/stock/supplier editing entry points
4. Add analytics:
   - top inventory items by ordered qty
   - top inventory items by shipped qty
   - top inventory items by revenue/cost value where pricing is reliable
   - dead/slow-moving stock
5. Validation:
   - item dashboard loads without opening edit form
   - related sales/quotes use inventory `LineItem` references first and legacy/Dyke mapping only as fallback
   - top-sales numbers reconcile with sales inventory projections

### Phase H: Automation, Reconciliation, And Migration Gates
1. Add reconciliation jobs:
   - inventory -> Dyke drift
   - Dyke -> inventory drift
   - sales-control -> inventory lifecycle drift
   - stock/allocation drift
   - print projection parity drift
2. Add monitor widgets/run status:
   - last run
   - synced
   - skipped
   - failed
   - next cursor
   - repair action
3. Add migration gates:
   - inventory print default gate
   - inventory dispatch mode gate
   - production readiness gate
   - inventory overview/reporting source gate
4. Validation:
   - dry-run reconciliation before mutating repair
   - browser checks for inventory dashboard, variants workspace, print, dispatch mode, production assignment, and production completion
   - focused unit/integration tests for every bridge service

## Phase Status

## Cutover Gap Audit: 2026-06-15

Current cutover gap matrix: `brain/reports/2026-06-15-inventory-cutover-gap-audit.md`.

Summary: foundations exist for sales inventory sync, inventory-to-Dyke job plumbing, variant/supplier price sync back to Dyke, sales-control production lifecycle projection, production readiness gating, inventory dispatch mode commands, canonical shipment-record decision, fulfillment/backorder projections, production plan UI, inbound receiving, stock operations, inventory operations dashboard, inventory print route, and sync monitoring. Remaining cutover work is now primarily browser/manual validation plus final migration gates.

### Phase 1: Sync Foundation
Status: Mostly done.

- [x] Active Dyke custom component create/update paths now go through `@gnd/inventory` services.
- [x] Dyke component pricing updates route through inventory-domain pricing services.
- [x] Targeted Dyke step sync is queued through `sync-dyke-step-to-inventory`.
- [x] Sales inventory sync has one shared job entrypoint, `sync-sales-inventory-line-items`.
- [x] New sales form saves queue sales inventory sync.
- [x] Legacy sales form saves queue sales inventory sync.
- [x] Copy sales queues the same inventory sync job with `source: "copy-sales"`.
- [x] Repair flows queue the same inventory sync job with `source: "repair"`.
- [x] Inventory variant and supplier variant price changes sync back to `DykePricingSystem` through `sync-inventory-to-dyke` with preserved-key guardrails for supplier pricing.
- [x] Structural Dyke/inventory drift reporting exists through `dykeInventoryDriftReport`.
- [x] Sales inventory sync monitor reports coverage, synced count, skipped count, failed-risk count, and next backfill cursor.
- [x] Backfill job returns processed, succeeded, failed, next cursor, and has-more state.
- [x] Generic and supplier variant price drift reporting now follows the inventory-to-Dyke pricing mapping rules.
- [ ] Remaining dormant Dyke admin/use-case helpers still need migration behind the inventory domain.
- [ ] Delete/archive event behavior for Dyke definitions still needs an explicit inventory policy.

### Phase 2: Inventory Sale Projection
Status: Done for core projection.

- [x] Sale lines are projected as inventory-backed fulfillment lines.
- [x] Components are treated as the BOM.
- [x] Projection calculates `orderedQty`.
- [x] Projection calculates `allocatedQty`.
- [x] Projection calculates `pickedQty`.
- [x] Projection calculates `shippedQty`.
- [x] Projection calculates `remainingQty`.
- [x] Projection calculates `backorderedQty`.
- [x] Projection calculates `inboundQty`.
- [x] Projection calculates `receivedQty`.
- [x] Projection supports sale states: `not_fulfilled`, `partially_fulfilled`, `awaiting_inbound`, `backordered`, `ready_to_ship_remaining`, and `fulfilled`.

### Phase 3: Allocation
Status: Mostly done.

- [x] Sales inventory sync creates stock allocation suggestions from available stock.
- [x] Unavailable monitored stock creates `InboundDemand`.
- [x] Allocation states exist: `pending_review`, `approved`, `reserved`, `picked`, `consumed`, `released`, and `cancelled`.
- [x] Pending allocations are not treated as committed stock until approved.
- [x] Allocation review queue exists at `/inventory/allocations`.
- [x] Bulk allocation approval exists through `approveBulkStockAllocation`.
- [x] Sales inventory health widget is backed by `salesInventoryOverview`.
- [ ] Browser validation and operator flow proof are still pending for the allocation review screen.
- [ ] Safer repeat-receive and repeated allocation guardrails still need hardening.

### Phase 4: Production Planning
Status: Projection, board, lifecycle bridge, and readiness enforcement done; operator validation pending.

- [x] Production plan groups by sale.
- [x] Production plan groups by sales item.
- [x] Production plan groups by component.
- [x] Production plan groups by supplier.
- [x] Production plan groups by stock status.
- [x] Component readiness supports `ready_for_production` and `fulfilled`.
- [x] Line readiness is derived from required component readiness.
- [x] Production shortage / blocker surface exists at `/inventory/production-plan`.
- [x] Sales-control production assignment/submission actions update `LineItem.meta.production` with assigned, fulfilled, remaining, and production status projection.
- [x] Existing production assignment/start actions are hard-gated by inventory readiness for inventory-backed required components.
- [ ] Sale-level production-ready transitions need final wiring into the broader sales production workflow.
- [ ] Browser/operator validation for blocked and allowed production assignment remains pending.

### Phase 5: Await Inbound
Status: Mostly done; receive retry guardrails added.

- [x] Unavailable component quantity remains in `InboundDemand`.
- [x] Lines surface as `awaiting_inbound` when required components have open inbound demand.
- [x] Inbound statuses exist: `pending`, `ordered`, `partially_received`, `received`, and `cancelled`.
- [x] Production/backorder projections expose blocked, partially received, and ready-after-receive style states.
- [x] Receiving workspace exists at `/inventory/inbounds`.
- [x] Re-running receive uses persisted inbound item good/issue totals and applies only newly received deltas.
- [ ] Purchasing/order lifecycle depth beyond inbound shipment creation is still pending.
- [ ] Replacement inbound behavior for damaged/missing/incorrect received items is still undecided.

### Phase 6: Backorder and Partial Shipment
Status: Core flow done; shipment source of truth decided; hold-until-complete command guard and workspace added.

- [x] Available quantity can be allocated, picked/packed, shipped, and consumed without cloning the sale.
- [x] Remaining quantity stays on the original sale line projection.
- [x] Backordered quantity is computed at fulfillment/component level.
- [x] Backorder demand can create/update `InboundDemand`.
- [x] Received inbound stock can auto-allocate to backordered components through `allocate-received-inbound-to-backorders`.
- [x] Sale/line can move to `ready_to_ship_remaining` when remaining stock becomes available.
- [x] Backorder queue exists at `/inventory/backorders`.
- [x] `OrderDelivery` / `OrderItemDelivery` are the canonical shipment records for partial shipment and inventory dispatch mode.
- [x] Line-level `holdUntilComplete` metadata prevents accidental partial shipment until all remaining quantity is available.
- [x] Dedicated partial shipment workspace exists at `/inventory/partial-shipments`.
- [ ] Final shipment completion needs reconciliation between completed `OrderItemDelivery` quantities and consumed `StockAllocation` quantities.

### Phase 7: Fulfillment
Status: Command/API foundation mostly done; dedicated UI validation pending.

- [x] Inventory moves through allocation statuses including `reserved`, `picked`, and `consumed`.
- [x] Partial shipment command exists as `shipAvailableSalesInventory`.
- [x] Inventory dispatch mode supports assign, pack, fulfill, and release allocation transitions.
- [x] Inventory dispatch fulfillment consumes only `picked` allocations.
- [x] Inventory dispatch fulfillment writes legacy `OrderDelivery` / `OrderItemDelivery` compatibility rows.
- [x] Dedicated inventory dispatch-mode workspace exists at `/inventory/dispatch-mode` for assign, pack, fulfill, and release actions.
- [x] Backorder queue includes a "Ship Available" action.
- [x] Line/component status is recomputed after fulfillment movement.
- [x] Remaining quantity summary exists in backorder queue projections.
- [x] Auto-release after inbound receiving is queued from receiving workflow.
- [x] "Hold until complete" option is implemented at inventory line level.
- [x] Dedicated partial shipment screen beyond the backorder queue is implemented.
- [x] Inventory dispatch-mode browser route smoke passed at `/inventory/dispatch-mode`.
- [ ] Inventory dispatch assign/pack/fulfill/release action proof still needs an approved allocation fixture with available stock.

### Phase 8: Stock Operations
Status: Mostly done.

- [x] Receiving posts good stock into `InventoryStock`.
- [x] Receiving records issue quantity separately from good quantity.
- [x] Manual stock adjustments exist through `adjustInventoryStock`.
- [x] Stock movement/audit rows are written for receiving and adjustment flows.
- [x] Repeat receive does not duplicate stock or stock movements when the same received totals are submitted again.
- [x] `InventoryStock.qty` remains the physical/current stock source.
- [x] Audit-log coverage is explicitly verified for stock in, stock out, return, correction, consume, and release through `stockAuditVerificationReport`.
- [x] Operations dashboard summarizes tracked/untracked stock, low-stock, out-of-stock, open inbound, pending allocations, backordered lines, and production blockers from inventory-backed data.
- [ ] Operator-facing reason-code taxonomy still needs review and polish.

### Phase 9: Print and UI
Status: Print data/golden packet coverage mostly done; visual/browser proof pending.

- [x] Inventory-backed print data exists for sales print modes.
- [x] Inventory print uses the exact current v2 print template page input shape.
- [x] Inventory print packet data/golden tests cover production BOM, pick list, packing list, backorder summary, and customer remaining summary.
- [x] Backorder queue UI exists.
- [x] Production shortage / production plan UI exists.
- [x] Inbound receiving queue exists.
- [x] Allocation review UI exists.
- [x] Sale inventory health widget exists.
- [x] Dedicated partial shipment screen exists at `/inventory/partial-shipments`.
- [x] Item-level inventory dashboard exists at `/inventory/[id]` with variants, stock, movement history, inbound demand, allocations, and related sales/quotes backed by inventory `LineItem` references.
- [x] Variants workspace exists at `/inventory/variants` with search/filter controls and price, stock, supplier, status, low-stock, dashboard, edit, and stock-operation actions.
- [x] Top-sales analytics exist for inventory items and variants, ranking ordered quantity from inventory-backed `LineItem` rows and shipped quantity from consumed `StockAllocation` rows.
- [x] Inventory operations dashboard exists on `/inventory` with stock-health cards, alert rows, and drilldowns to item dashboards, variants, stock operations, inbound, allocations, backorders, and production plan.
- [x] Inventory dispatch-mode UI exists at `/inventory/dispatch-mode`.
- [x] Inventory print route browser smoke passed after wrapping the PDF viewer in a client-only dynamic component; `/p/sales-inventory-v2?ids=08499LM&mode=production&preview=false` renders a blob-backed PDF iframe.
- [ ] Inventory print still needs mode-by-mode visual packet comparison before broad invoice/quote cutover.

### Phase 10: Automation and Hardening
Status: Partially done; dry-run reconciliation and receive/allocation retry guardrails exist.

- [x] Sales inventory sync is automated through Trigger jobs.
- [x] Allocation shortage creates inbound demand.
- [x] Receiving can queue backorder allocation release.
- [x] Legacy sales can continue while inventory-backed flows mature.
- [x] Dry-run sales inventory reconciliation report exists for missing component rows, completed shipment vs consumed allocation drift, and component allocation/inbound fulfillment status drift.
- [x] `run-inventory-reconciliation-report` Trigger job supports bounded cursor runs, samples, severity, skipped counts, skipped reasons, and no mutation by default.
- [x] Existing Dyke/inventory structural and pricing drift remains exposed through `dykeInventoryDriftReport`.
- [x] Backorder auto-release reports skipped and already-covered demands on retries instead of duplicating allocations.
- [ ] Drift repair and migration gates need production-grade runbooks and alerts.
- [ ] Print projection parity automation beyond golden data tests still needs mode-by-mode browser/PDF visual validation before broad cutover.
- [ ] Cutover of overview, print, production, deployment, fulfillment, and reporting to inventory projections remains pending.

## Pending Work
1. Finish sale-level production-ready transitions in the production workflow.
2. Migrate remaining dormant Dyke admin/use-case helpers into `@gnd/inventory`.
3. Define delete/archive policy for Dyke definitions and inventory sync.
4. Finish browser validation action proof for allocation review, inbound receiving, partial shipment, inventory dispatch mode, stock operations, and mode-by-mode inventory print visuals. Route smoke evidence now lives in `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`; remaining checks need controlled local fixtures with pending allocations, inbound demand/shipments, available dispatch allocations, held partial shipment lines, and safe stock rows.
5. Decide whether inbound issue replacements create linked follow-up inbounds automatically.
6. Verify audit coverage for stock in, stock out, return, correction, consume, and release.
7. Add drift alerts and production-grade reconciliation runbooks.
8. Create migration gates and runbooks for switching overview, print, production, deployment, fulfillment, and reporting to inventory projections.
9. Item-level dashboard, related sales/quotes sections, variants workspace, top-sales analytics, and operations dashboard now exist; remaining UI work is validation plus later analytics polish.

## Evidence Pointers
- Sync foundation: `packages/sales/src/sync-sales-inventory-line-items.ts`, `packages/sales/src/sales-inventory-sync-job.ts`, `packages/jobs/src/tasks/sales/backfill-sales-inventory-line-items.ts`
- Projection and fulfillment: `packages/sales/src/sales-fulfillment-plan.ts`
- Sales inventory overview: `packages/sales/src/sales-inventory-overview.ts`
- Sync monitor: `packages/sales/src/sales-inventory-sync-monitor.ts`
- Inbound receiving: `packages/inventory/src/application/inbound/inbound-demand.ts`
- Allocation review: `packages/inventory/src/inventory.ts`
- API surface: `apps/api/src/trpc/routers/inventories.route.ts`
- UIs: `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/production-plan`
- Inventory -> Dyke partial helper: `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- Inventory variant pricing: `packages/inventory/src/inventory.ts`
- Inventory print: `packages/sales/src/print/inventory-print-data.ts`, `/p/sales-inventory-v2`, `print.salesInventoryV2`
- Inventory reconciliation: `packages/sales/src/inventory-reconciliation-report.ts`, `packages/jobs/src/tasks/inventory/run-inventory-reconciliation-report.ts`, `inventories.inventoryReconciliationReport`
- Production/dispatch command chain: `packages/jobs/src/tasks/sales/update-sales-control.ts`, `packages/sales/src/sales-control/actions.ts`
- Inventory item dashboard: `packages/inventory/src/inventory.ts`, `inventories.inventoryItemDashboard`, `/inventory/[id]`
- Inventory variants workspace: `packages/inventory/src/inventory.ts`, `inventories.inventoryVariantsWorkspace`, `/inventory/variants`
- Inventory top-sales analytics: `packages/inventory/src/inventory.ts`, `inventories.inventoryTopSalesAnalytics`, `/inventory`, `/inventory/[id]`
- Inventory stock audit verification: `packages/inventory/src/application/stock/stock-adjustment.ts`, `inventories.stockAuditVerificationReport`, `/inventory/stocks`
- Inventory operations dashboard: `packages/inventory/src/inventory.ts`, `inventories.inventoryOperationsSummary`, `/inventory`
- Inventory dispatch mode UI: `apps/www/src/components/inventory/inventory-dispatch-mode-page.tsx`, `inventories.assignInventoryDispatchAllocations`, `inventories.packInventoryDispatchAllocations`, `inventories.fulfillInventoryDispatch`, `inventories.releaseInventoryDispatchAllocations`, `/inventory/dispatch-mode`
- Inventory pages: `/inventory`, `/inventory/[id]`, `/inventory/variants`, `/inventory/stocks`, `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/dispatch-mode`, `/inventory/production-plan`, `/inventory/suppliers`, `/inventory/review`

Last updated: 2026-06-15

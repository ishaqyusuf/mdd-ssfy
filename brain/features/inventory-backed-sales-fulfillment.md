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
- [ ] `SalesShipment` / `SalesShipmentLine` do not exist yet as explicit first-class shipment records. Current partial shipment support writes through `OrderDelivery` / `OrderItemDelivery` with `inventory_partial_shipment` metadata.

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
10. Reconciliation jobs for Dyke/inventory sync, sales-control/inventory lifecycle drift, stock/allocation drift, and print projection parity.

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
- [x] Structural Dyke/inventory drift reporting exists through `dykeInventoryDriftReport`.
- [x] Sales inventory sync monitor reports coverage, synced count, skipped count, failed-risk count, and next backfill cursor.
- [x] Backfill job returns processed, succeeded, failed, next cursor, and has-more state.
- [ ] Pricing drift reporting is still not fully canonical while Dyke pricing semantics and inventory pricing semantics finish converging.
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
Status: Projection and board done; enforcement pending.

- [x] Production plan groups by sale.
- [x] Production plan groups by sales item.
- [x] Production plan groups by component.
- [x] Production plan groups by supplier.
- [x] Production plan groups by stock status.
- [x] Component readiness supports `ready_for_production` and `fulfilled`.
- [x] Line readiness is derived from required component readiness.
- [x] Production shortage / blocker surface exists at `/inventory/production-plan`.
- [ ] Existing production start actions still need to be hard-gated by inventory readiness.
- [ ] Sale-level production-ready transitions need final wiring into the broader sales production workflow.

### Phase 5: Await Inbound
Status: Mostly done.

- [x] Unavailable component quantity remains in `InboundDemand`.
- [x] Lines surface as `awaiting_inbound` when required components have open inbound demand.
- [x] Inbound statuses exist: `pending`, `ordered`, `partially_received`, `received`, and `cancelled`.
- [x] Production/backorder projections expose blocked, partially received, and ready-after-receive style states.
- [x] Receiving workspace exists at `/inventory/inbounds`.
- [ ] Purchasing/order lifecycle depth beyond inbound shipment creation is still pending.
- [ ] Replacement inbound behavior for damaged/missing/incorrect received items is still undecided.

### Phase 6: Backorder and Partial Shipment
Status: Core flow done; shipment model still pending.

- [x] Available quantity can be allocated, picked/packed, shipped, and consumed without cloning the sale.
- [x] Remaining quantity stays on the original sale line projection.
- [x] Backordered quantity is computed at fulfillment/component level.
- [x] Backorder demand can create/update `InboundDemand`.
- [x] Received inbound stock can auto-allocate to backordered components through `allocate-received-inbound-to-backorders`.
- [x] Sale/line can move to `ready_to_ship_remaining` when remaining stock becomes available.
- [x] Backorder queue exists at `/inventory/backorders`.
- [ ] Explicit `SalesShipment` / `SalesShipmentLine` records remain pending.
- [ ] Final shipment completion needs stronger reconciliation against explicit shipment records once they exist.

### Phase 7: Fulfillment
Status: Partially done.

- [x] Inventory moves through allocation statuses including `reserved`, `picked`, and `consumed`.
- [x] Partial shipment command exists as `shipAvailableSalesInventory`.
- [x] Backorder queue includes a "Ship Available" action.
- [x] Line/component status is recomputed after fulfillment movement.
- [x] Remaining quantity summary exists in backorder queue projections.
- [x] Auto-release after inbound receiving is queued from receiving workflow.
- [ ] "Hold until complete" option is not implemented.
- [ ] Dedicated partial shipment screen beyond the backorder queue is still pending.
- [ ] Pick-list driven warehouse flow needs deeper integration with inventory allocations.

### Phase 8: Stock Operations
Status: Mostly done.

- [x] Receiving posts good stock into `InventoryStock`.
- [x] Receiving records issue quantity separately from good quantity.
- [x] Manual stock adjustments exist through `adjustInventoryStock`.
- [x] Stock movement/audit rows are written for receiving and adjustment flows.
- [x] `InventoryStock.qty` remains the physical/current stock source.
- [ ] Audit-log coverage should be explicitly verified for stock in, stock out, return, correction, consume, and release.
- [ ] Operator-facing reason-code taxonomy still needs review and polish.

### Phase 9: Print and UI
Status: Partially done.

- [x] Inventory-backed print data exists for sales print modes.
- [x] Backorder queue UI exists.
- [x] Production shortage / production plan UI exists.
- [x] Inbound receiving queue exists.
- [x] Allocation review UI exists.
- [x] Sale inventory health widget exists.
- [ ] Print packets still need explicit verification/completion for BOM, pick list, packing list, backorder packet, production packet, and customer remaining-quantity summary.
- [ ] Dedicated partial shipment screen remains pending.
- [ ] Inventory print must still be proven 100% compatible with Dyke print output before broad cutover.

### Phase 10: Automation and Hardening
Status: Partially done.

- [x] Sales inventory sync is automated through Trigger jobs.
- [x] Allocation shortage creates inbound demand.
- [x] Receiving can queue backorder allocation release.
- [x] Legacy sales can continue while inventory-backed flows mature.
- [ ] Stock/allocation reconciliation jobs are still pending.
- [ ] Drift repair and migration gates need production-grade runbooks and alerts.
- [ ] Cutover of overview, print, production, deployment, fulfillment, and reporting to inventory projections remains pending.

## Pending Work
1. Add explicit `SalesShipment` / `SalesShipmentLine` models or make a deliberate ADR that `OrderDelivery` / `OrderItemDelivery` are the canonical shipment records.
2. Add the "hold until complete" fulfillment option.
3. Build or finalize a dedicated partial shipment screen separate from the backorder queue.
4. Hard-gate production start on inventory readiness across existing production actions.
5. Finish sale-level production-ready transitions in the production workflow.
6. Complete pricing drift reporting between Dyke definitions and inventory definitions.
7. Migrate remaining dormant Dyke admin/use-case helpers into `@gnd/inventory`.
8. Define delete/archive policy for Dyke definitions and inventory sync.
9. Browser-validate allocation review, inbound receiving, production plan, backorder queue, and stock operations.
10. Add guardrails for repeat receiving, repeated allocation, and duplicate auto-release.
11. Decide whether inbound issue replacements create linked follow-up inbounds automatically.
12. Verify audit coverage for stock in, stock out, return, correction, consume, and release.
13. Finish inventory-backed print packets: BOM, pick list, packing list, backorder packet, production packet, and customer remaining-quantity summary.
14. Add stock/allocation reconciliation jobs and drift alerts.
15. Create migration gates and runbooks for switching overview, print, production, deployment, fulfillment, and reporting to inventory projections.
16. Build full inventory-to-Dyke create/update/delete/archive sync.
17. Sync inventory variant price and supplier-variant price updates back to Dyke pricing.
18. Update inventory line projections from production assignment and production fulfilled events.
19. Add inventory-mode dispatch assign/pack/fulfill lifecycle.
20. Build item-level inventory dashboard, variants workspace, related sales/quotes views, and top-sales analytics.

## Evidence Pointers
- Sync foundation: `packages/sales/src/sync-sales-inventory-line-items.ts`, `packages/sales/src/sales-inventory-sync-job.ts`, `packages/jobs/src/tasks/sales/backfill-sales-inventory-line-items.ts`
- Projection and fulfillment: `packages/sales/src/sales-fulfillment-plan.ts`
- Sales inventory overview: `packages/sales/src/sales-inventory-overview.ts`
- Sync monitor: `packages/sales/src/sales-inventory-sync-monitor.ts`
- Inbound receiving: `packages/inventory/src/application/inbound/inbound-demand.ts`
- Allocation review: `packages/inventory/src/inventory.ts`
- API surface: `apps/api/src/trpc/routers/inventories.route.ts`
- UIs: `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/production-plan`
- Inventory -> Dyke partial helper: `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- Inventory variant pricing: `packages/inventory/src/inventory.ts`
- Inventory print: `packages/sales/src/print/inventory-print-data.ts`, `/p/sales-inventory-v2`, `print.salesInventoryV2`
- Production/dispatch command chain: `packages/jobs/src/tasks/sales/update-sales-control.ts`, `packages/sales/src/sales-control/actions.ts`
- Inventory pages: `/inventory`, `/inventory/stocks`, `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/production-plan`, `/inventory/suppliers`, `/inventory/review`

Last updated: 2026-06-12

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
- [x] Inventory owns inbound demand status semantics for order prompt projection and selected line-demand prompt scope; see `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
- [x] `inventories.inventoryBrowserValidationFixtureReport` provides a read-only cutover preflight for browser mutation proof, checking whether the local data set has the required allocation, inbound receiving, dispatch, partial shipment, low-stock, and stock-adjustment fixture categories before mutating workflow validation is rerun. `/inventory` surfaces this through `InventoryValidationFixturePanel` beside the operations dashboard, and the root `bun run inventory:validation-fixtures` command exposes the same report for repeatable CLI evidence, including `--json` for machine-readable payloads, `--markdown` for paste-ready Brain evidence snapshots with workflow samples, `--seed-checklist` for grouped setup actions, `--seed-blueprint` for row-level seed planning, `--evidence-template` for a paste-ready browser mutation worksheet, `--mutation-snapshot` for exact fixture-row before/after state capture, and `--completion-gate` for the Pending 15 cutover checklist. The mutation snapshot now starts with a `Primary Proof Target Index` for run-order rows `10` through `130`, including exact primary row ids, compare fields, and expected deltas for each workflow, then labels stock allocations, inbound shipment items, inbound demands, line projections, stock fixture rows, and delivery compatibility rows with `proofTarget` and `primaryProof`; allocation and inbound rows also include `proofRole`. This lets legacy seed rows, alternate/recovery candidates, direct browser targets, and rows expected to change after mutation be compared cleanly before and after browser validation. Fixture rows include seed-plan identifiers plus `countDiagnostic` metadata so exact SQL-count categories and bounded application-scan categories are distinguishable; the panel and CLI both call out incomplete bounded-count categories. The report now also returns a package-owned browser mutation matrix with runnable/blocked workflow status, deterministic run order, primary action samples, operator guards, candidate fixture samples, operator actions, and expected evidence for allocation approval/rejection/bulk approval, dispatch assign/pack/fulfill/release, inbound receive, received-backorder release, partial ship/hold, stock adjustment, and low-stock dashboard proof. The completion gate groups those rows into allocation review, inventory dispatch fulfillment, inbound/backorder, partial/held shipment, and stock/low-stock coverage, while keeping before/after snapshots and Brain evidence update as explicit manual completion gates. Pending allocation review readiness now requires three pending-review candidates so approve, reject, and bulk-approve proof can each point at a distinct primary sample; dispatch assign/pack readiness also requires spare approved/reserved capacity so dispatch proof does not reuse partial or held proof rows, and pack/release get separate primary samples plus guard text. Ship-available partial readiness now excludes `holdUntilComplete` rows so held-line proof stays separate from ship-available proof. The safe stock-adjustment fixture now requires a monitored non-custom variant with positive stock, avoiding a false-ready state from zero-stock monitored variants. The stock-only fixture groups can be dry-run with `bun run inventory:seed-stock-fixtures` and applied only with an explicit `--apply`; allocation, inbound, received-backorder, and partial-shipment fixture groups can be dry-run/applied with `bun run inventory:seed-allocation-fixture`, `bun run inventory:seed-inbound-fixture`, `bun run inventory:seed-received-fixture`, and `bun run inventory:seed-partial-fixture`. Partial shipment readiness now requires active allocated quantity to be greater than zero and less than ordered line quantity, avoiding false partial-shipment readiness from complete dispatch allocation fixtures. The local fixture preflight is now expected to be `11/11` ready after repairing older `INV-FIX-ALLOC` seeds with the updated allocation helper.

## Sales Overview Inventory UI
- Sales overview side sheets show the order inbound prompt/status in the sheet header and Order Details section for orders, reusing the same `AVAILABLE` / `ORDERED` / `PENDING ORDER` badge semantics as the sales orders table; quotes hide the order-only inbound status.
- The sales overview Inventory tab renders the merged component list as a compact inventory workbench, with stock/non-stock filters, visible row counts, and pending/shortage summary badges.
- The merged component list uses shadcn `Item` primitives instead of a table. Each item shows the uppercase component name, category/step subtitle plus the human-readable variant name when available, kind/tracking tags, compact quantity/stock/allocation/pending metrics, and cost/sales pricing pills in a vertically scroll-friendly layout. Door width/height variants normalize to the standard Dyke size display, such as `2-8 x 8-0`, even when the stored inventory variant UID is the imported `w2_8-h8_0` shape. Raw variant UIDs remain internal identity data and are not used as item subtitle text.
- Row configuration is exposed through a compact dot-icon dropdown on each item, titled by component name, with Step kind, Component kind, Stock tracking, and an Open inventory item footer link when an inventory record exists. The previous horizontal table grid and wheel-bridge behavior are no longer part of this surface.
- The stock-scoped Create inbound form uses orderable shortage quantity, not raw pending quantity. Orderable quantity excludes already-linked open inbound demand while still allowing unlinked pending demand to be attached. This keeps the card-level Pending metric as the true shortage while preventing duplicate inbound creation for stock that is already on an inbound shipment.
- The Inventory tab `INBOUNDS` segment lists inbound shipments linked to the opened sale through stock demand rows. Selecting an inbound shows its stock lines, ordered/received demand progress, status controls, and receive-stock action without leaving the sales overview.
- Legacy and new sales-form save actions no longer ask the old "Is all product in stock?" prompt before saving. Explicit order saves persist the order first, then open a standalone inventory configuration modal that reuses the same sales overview Inventory workbench by saved `salesOrderId`; Save & Close and Save & New wait until that modal closes before continuing navigation. Quotes do not open the inventory configurator.
- `/sales-book/inbounds` is the general Sales Book inbound workspace. It uses flattened shadcn collapsible rows rather than a heavy card grid, supports search/status filtering, shows compact analytics, renders supplier/reference plus linked order/customer context in each row, and expands to stock lines, linked orders, status update controls, receive-stock, and the same shared timeline-style activity history used by the jobs overview.
- Inbound lifecycle activity is notification-backed through `inventory_inbound_activity`. Creating, receiving, extraction events, demand assignment, and status updates write timeline activity; new events carry a lifecycle id so the API can ensure a visible history row even when the notification has no recipients.
- Planned guardrail hardening is tracked in `brain/plans/2026-06-29-sales-inventory-inbound-status-guardrails.md`: inventory-created inbound should update `SalesOrders.inventoryStatus`, direct manual inbound-status edits should defer to inventory inbound status once linked inbound exists, legacy/manual inbound status should block first-time Inventory tab setup until reset/override, and Mark As production/fulfilled actions should prompt before proceeding when configured inventory still has unresolved inbound or unavailable stock.

## Follow-Up Review: 2026-06-12

### Requested Capability Status
- Sales-form custom component selection now shows only components explicitly marked custom, keeps archived custom components hidden from new dropdown choices while preserving older sales references, uses unique option identity so duplicate custom names select the correct price row, carries the selected option price into the selected step, normalizes typed/create/select labels to uppercase with alphabetically sorted suggestions plus a compact right-aligned cost field, opens as an anchored inline alert panel above the footer `Custom` button without resizing the footer, persists selected custom metadata, sends `meta.custom` on custom upsert, and pins the selected custom component first in the list with a custom avatar and destructive border treatment. `Proceed` now automatically persists edited custom prices when needed, selects with the submitted price immediately instead of waiting on a refreshed component payload, updates the loaded selection source before saving the step, and reopening the `Custom` form on an already selected custom component hydrates the current title and price from the selected step snapshot.
- 2026-06-18 legacy sales-form hotfix: the custom-component `Proceed` path now uses the submitted mutation price as the immediate selection cost for existing custom components whose cost was edited, calculates sales price from that cost through the active sales profile multiplier, then refreshes the component list afterward. Legacy flat-rate custom totals now use the calculated sales price while retaining the entered value as base/cost. This preserves the prior "pick existing without editing" behavior while preventing a just-updated custom price from being overwritten by stale refreshed component/pricing data during selection.
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
- [x] Legacy and new sales forms share a custom-component browse/create flow backed by `inventories.upsertDykeCustomStepComponent`; existing step-scoped custom components can be selected to fill cost price, edited prices persist automatically on `Proceed` when the entered price differs from the saved option, new custom components are refreshed and selected after proceed, and selected custom components remain visible even while unselected custom components stay hidden by default. Existing component metadata is preserved during price/name updates. Custom components can be hidden from future selection through `inventories.archiveDykeCustomStepComponent`, which stores `meta.deletedAt` on the Dyke component instead of physically setting the model `deletedAt` column so older sales/print references keep resolving.
- [x] Targeted Dyke step sync is queued through `sync-dyke-step-to-inventory`.
- [x] Sales inventory sync has one shared job entrypoint, `sync-sales-inventory-line-items`.
- [x] Shared sync queue preserves source labels for `new-form`, `old-form`, `copy-sales`, `manual`, and `repair`.
- [x] New sales form saves queue sales inventory sync.
- [x] Legacy sales form saves queue sales inventory sync.
- [x] Save-path guard coverage verifies new-form draft/final saves and successful legacy saves keep queueing the shared inventory sync job.
- [x] Copy sales queues the same inventory sync job with `source: "copy-sales"`.
- [x] Repair flows queue the same inventory sync job with `source: "repair"`.
- [x] Inventory variant and supplier variant price changes sync back to `DykePricingSystem` through `sync-inventory-to-dyke` with preserved-key guardrails for supplier pricing.
- [x] Structural Dyke/inventory drift reporting exists through `dykeInventoryDriftReport`.
- [x] Sales inventory sync monitor reports coverage, synced count, skipped count, failed-risk count, stale inventory sale-line count, stale allocation/demand residue counts, bounded review/stale samples, and next backfill cursor.
- [x] Sales inventory sync monitor can optionally include a bounded dry-run inventory reconciliation summary, adding shipment/allocation, component-fulfillment, and missing-component drift into the same review-risk score when callers request the deeper Phase 5 cutover gate.
- [x] Sales inventory sync monitor keeps the cutover status in `needs_review` when optional reconciliation is clean but partial, preventing a bounded cursor run from being mistaken for full sync proof.
- [x] Sales inventory sync monitor also treats skipped reconciliation comparisons as `needs_review` and includes them in review-risk count through `skippedComparisonCount`, so rows that could not compare shipment/allocation or component-fulfillment state cannot pass the cutover gate just because drift is zero.
- [x] Raw inventory reconciliation reports and queued reconciliation Trigger outputs expose shared `synced` / `needs_review` / `partial` status plus total `skippedComparisonCount`, so one-off reconciliation runs and monitor summaries use the same status and skipped-proof evidence.
- [x] Inventory import control center requests that bounded reconciliation summary and surfaces it as both a monitor stat and a system check, so operators can see whether the visible sales sync coverage is clean, partial, or carrying reconciliation drift.
- [x] Inventory import control center's Review Risk stat now names componentless sales, stale inventory lines, reconciliation drift, and skipped reconciliation comparisons, matching the package-owned `failedRiskCount` composition.
- [x] Inventory import control center also promotes stale allocation/demand residue into the system checks list, so active `StockAllocation` and `InboundDemand` rows attached to stale inventory sale lines are visible as a cleanup gate instead of only appearing in the Review Risk stat subtitle.
- [x] Inventory import control center can queue the existing `run-inventory-reconciliation-report` Trigger task from the sales sync monitor section, starting from the current reconciliation cursor when the bounded summary is partial.
- [x] Inventory import control center shows reconciliation coverage domain cards when the bounded summary is available, separating sales sync, shipment/allocation, and component-fulfillment checked, drift, skipped, severity, and sample totals so clean-but-partial or skipped comparisons are visible.
- [x] Stale inventory sale-line cleanup exists as a dry-run-default inventory route and a bounded visible-samples action in the import control center; the monitor now shows how many allocation and inbound demand rows are attached to stale sale lines before cleanup runs.
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
- [x] Allocation review approve/reject/bulk-approve mutations are retry-safe for already transitioned rows: only active `pending_review` allocations mutate, retries return skipped evidence instead of reviving or recounting rows, and the allocation review UI toast copy surfaces skipped rows to operators.
- [ ] Browser validation and operator flow proof are still pending for the allocation review screen.
- [ ] Broader repeated allocation guardrails still need browser/operator proof across allocation review and dispatch-mode reruns.

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
- [x] Canonical `update-sales-control` production mutations use the package-owned `shouldSyncInventoryProductionLifecycleForSalesControl` decision to refresh inventory production lifecycle for assignment, submit-all, submission update/delete, assignment delete, and mark-complete actions while leaving dispatch-only mutations out of production lifecycle refresh.
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
- [x] Shipment planning uses required components as the gating set; optional component shortages do not block required-component shipment.
- [x] Line-level `holdUntilComplete` metadata prevents accidental partial shipment until all remaining quantity is available.
- [x] Dedicated partial shipment workspace exists at `/inventory/partial-shipments`.
- [ ] Final shipment completion needs reconciliation between completed `OrderItemDelivery` quantities and consumed `StockAllocation` quantities.

### Phase 7: Fulfillment
Status: Command/API foundation mostly done; dedicated UI validation pending.

- [x] Inventory moves through allocation statuses including `reserved`, `picked`, and `consumed`.
- [x] Partial shipment command exists as `shipAvailableSalesInventory`.
- [x] Inventory dispatch mode supports assign, pack, fulfill, and release allocation transitions, with status-guarded assign/pack/release updates that report concurrently claimed rows as skipped instead of overwriting them.
- [x] Inventory dispatch fulfillment consumes only `picked` allocations, with status-and-quantity-guarded consumption so concurrent claims or stale partial split quantities cannot be counted as shipped.
- [x] Inventory dispatch fulfillment writes legacy `OrderDelivery` / `OrderItemDelivery` compatibility rows only after picked allocation consumption succeeds, and the dispatch-mode UI explains concurrent-claim failures as refresh/retry work instead of a generic error.
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
- [x] Inbound receiving now shows order-prompt vs line-demand reconciliation, and `ORDERED` / `PENDING ORDER` prompts update existing open `InboundDemand` row statuses.
- [x] Allocation review UI exists.
- [x] Sale inventory health widget exists.
- [x] Dedicated partial shipment screen exists at `/inventory/partial-shipments`.
- [x] Item-level inventory dashboard exists at `/inventory/[id]` with variants, stock, movement history, inbound demand, allocations, and related sales/quotes backed by inventory `LineItem` references.
- [x] Variants workspace exists at `/inventory/variants` with search/filter controls and price, stock, supplier, status, low-stock, dashboard, edit, and stock-operation actions.
- [x] Top-sales analytics exist for inventory items and variants, ranking ordered quantity from inventory-backed `LineItem` rows and shipped quantity from consumed `StockAllocation` rows while de-duplicating sale counts across ordered lines and consumed allocations.
- [x] Inventory operations dashboard exists on `/inventory` with stock-health cards, alert rows, and drilldowns to item dashboards, variants, stock operations, inbound, allocations, backorders, and production plan.
- [x] Inventory dispatch-mode UI exists at `/inventory/dispatch-mode`.
- [x] Inventory print route browser smoke passed after wrapping the PDF viewer in a client-only dynamic component; `/p/sales-inventory-v2?ids=08499LM&mode=production&preview=false` renders a blob-backed PDF iframe.
- [x] Desktop browser mutation proof for the local validation matrix passed on `1440x900`: allocation approve/reject/bulk, dispatch assign/pack/fulfill/release, inbound receive, received-backorder release, partial ship, held-line skip, stock adjustment, and low-stock dashboard signal. Evidence lives in `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`.
- [x] Inventory print route/mode render proof passed on `1440x900` for production, order-packing, packing-slip, invoice, quote, backorder summary, and customer remaining summary packets, with blob-backed PDF iframes plus print-data section/row evidence.
- [x] Mapped Dyke legacy-vs-inventory print route parity passed for order `08077PC` / sale `21379` on invoice, production, packing-slip, and order-packing modes. Future hardening can add automated pixel/golden PDF diffing, but the desktop browser cutover proof is complete.

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
1. Browser-validate the save-time inbound prompt through `/inventory/inbounds`, including `ORDERED`, `PENDING ORDER`, and `AVAILABLE` mismatch scenarios against real sales fixtures.
2. Migrate remaining dormant Dyke admin/use-case helpers into `@gnd/inventory`.
3. Define delete/archive policy for Dyke definitions and inventory sync.
4. Decide whether inbound issue replacements create linked follow-up inbounds automatically.
5. Add drift alerts, automated pixel/golden PDF diffing, and production-grade reconciliation runbooks.
6. Create migration gates and runbooks for switching overview, print, production, deployment, fulfillment, and reporting to inventory projections.
7. Item-level dashboard, related sales/quotes sections, variants workspace, top-sales analytics, and operations dashboard now exist; remaining UI work is validation plus later analytics polish.

## 2026-06-22 Sales Overview Inventory Tab Start
- `inventories.salesInventoryOverview` now returns grouped sales-overview inventory rows in addition to the existing summary and line-item payload.
- Groups are keyed to invoice items and use the invoice item description when present, falling back to line descriptions or `Invoice Item N`.
- Rows expose component name, step/category name, required quantity, physical in-stock quantity summed from active `InventoryStock` rows, allocated quantity, pending quantity, open inbound quantity, cost, status, tracking policy, inventory ids, variant SKU, and action eligibility.
- The shared sales overview system and the legacy sales overview sheet both register an order-only `Inventory` tab with a `New` badge.
- The first UI slice is read-oriented: stock links open the inventory item dashboard, while allocation, category-policy, and inbound actions are visible as disabled affordances pending the dedicated approved mutation plans.
- If the Inventory tab opens on an order with no inventory-backed rows yet, the tab now shows a synchronizing state, runs the single-order sales inventory sync, and refreshes the overview automatically. If sync still cannot produce rows, the tab leaves a manual `Sync with inventory` retry action.
- Follow-up repair: sales inventory sync now uses valid stock-allocation statuses when reconciling suggested allocation rows, aggregates repeated HPT door rows for the same Dyke product, multiplies selected Dyke form-step components by total door quantity, uses HPT/product quantity for moulding rows without door children, and repairs placeholder inventory names when a later Dyke value is more descriptive.
- Legacy sales overview cold reload now renders the Inventory tab from the live sale overview context so the numeric sale id is available after `getSaleOverview` finishes.
- The Inventory tab now renders a merged component table from top-level overview `rows[]` instead of invoice-item sections. Matching components are merged across the order, demand quantities are summed, and physical stock is shown once for the inventory item/variant.
- The merged component workbench now defaults to `STOCK` and uses `STOCK | NON STOCK | INBOUNDS` segmented navigation. `STOCK` means the row is tracked and neither the step/category nor actual inventory item is marked `component`; `NON STOCK` means tracking is off or the product kind is not inventory; `INBOUNDS` is reserved for order-linked inbound shipment/demand history. Component/item names remain uppercase for scanability.
- The component list is intentionally unframed under the segmented controls: no enclosing card/header around the row list, just compact shadcn item rows with badge-pill metrics.
- The Stock column is quantity-only again, and the Action column exposes an `Edit` dropdown for row configuration. The dropdown can set the step/category product kind, actual inventory item product kind, and category stock tracking; component-kind writes also force stock mode to `unmonitored` so non-priced components stay out of stock workflows.
- Stock actions are scoped to `STOCK` rows only. `Create inbound` appears only inside the `STOCK` view, opens an inline smart form with supplier combobox allow-create, shadcn calendar date picker, PO/reference, checked shortage rows, and per-row qty steppers with plus/minus controls. The submitted qty controls how much pending demand is prepared and linked to the inbound; smaller requested quantities split existing unlinked pending demand rows so the unselected remainder stays pending. Bulk `Allocate available stocks` was removed from the overview; allocation now appears only in a row action menu for rows with pending stock allocation ids and approves those ids through the existing stock-allocation approval flow.
- Sales inventory sync ensures missing component categories, inventory items, and variants are created by source UID during sync. Component rows now snapshot inventory variant pricing into `LinePricing`, preserving unit and total cost/sales values from inventory variant pricing or preferred supplier-variant pricing when available.
- Sales inventory sync now resolves component variant UID from selected Dyke pricing/dependency metadata before falling back to the component UID. It reads selected component `dependenciesUid`, dependency metadata, and `priceStepDeps` pricing keys, normalizes Dyke door-size keys such as `2-4 x 8-0` to the imported variant UID shape `w2_4-h8_0`, and keeps same-component rows separate when their dependency variants differ.
- Component pricing snapshots now merge inventory pricing with sales-form fallback pricing. Inventory variant or supplier pricing remains the preferred cost/sales source; missing fields fall back to selected component `basePrice` / `price`, HPT door `unitPrice` / `lineTotal`, saved shelf row `basePrice` / `salesPrice` / `unitPrice`, and no-door moulding HPT `meta.priceTags.moulding` cost/sales values. When only one side of cost/sales is available, sync reads the order customer profile coefficient and completes the missing side where safe: cost -> sales uses `cost / coefficient`, and sales -> cost uses `sales * coefficient` only when a valid coefficient exists. The sales overview Inventory table displays both Cost and Sales columns.
- `LinePricing` price fields are decimal-capable so these snapshots preserve cents instead of truncating to whole dollars; projection money totals round to two decimals before returning to the UI.
- Sales overview inventory rows now expose `variantUid`; the Inventory tab shows the raw SKU/variant value only when the current visible table has multiple priced rows with the same component name and different variants. Single-variant rows and zero-price/no-price rows hide the variant subtitle to reduce noise.
- Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-inventory-overview.test.ts apps/www/src/hooks/sales-overview-open-params.test.ts` passed with 22 tests and 40 assertions. In-app browser validation passed on `/sales-book/orders?sales-overview-id=08578AD&sales-type=order&mode=sales&salesTab=inventory`, confirming the old sheet shows Inventory `New`, renders Dyke production detail values as inventory components, and shows a single merged inventory component table after cold reload.
- Follow-up validation for dependency-variant mapping: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-inventory-overview.test.ts` passed with 22 tests and 41 assertions, and direct module import passed.
- Follow-up validation for Cost/Sales display: reran sync for order `08578AD` / sales id `23301`; 5 line items updated, 0 warnings, and every merged row had at least cost or sales price after fallback pricing. Focused tests passed with 22 tests and 43 assertions.
- 2026-06-23 follow-up: moulding/shelf fallback pricing now covers saved HPT moulding price tags and shelf row metadata/prices. Rerunning sync for order `08568PC` populated moulding `LinePricing` snapshots for WM886 (`unitCostPrice 1.85`, `unitSalesPrice 2.46`), 55fsQ/SHIMS (`unitCostPrice 4.27` derived from sales and profile coefficient, `unitSalesPrice 5.69`), Flat Board 1x4 (`8.5` / `11.3`), and Flat Board 1x6 (`10.4` / `13.83`). Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 19 tests and 43 assertions; scoped `git diff --check` passed for the sync file and focused test.

## 2026-06-16 Produceable Semantics Update
- Inventory sales-line sync now normalizes Dyke production eligibility onto `LineItem.meta.production.produceable` and `LineItem.meta.inventorySync.productionProduceable`.
- Produceable service rows are production eligible; non-produceable service rows and moulding rows are production ineligible.
- Explicit `produceable: false` metadata overrides legacy/Dyke production truthiness when deriving inventory production eligibility.
- Persisted mixed grouped metadata rows are covered at package level: HPT metadata remains produceable and still extracts HPT/door candidates, service metadata stays produceable when `dykeProduction` is true, and moulding metadata remains non-produceable even when legacy Dyke production flags are truthy.
- Production lifecycle updates preserve the existing production eligibility flag while refreshing assigned/fulfilled/remaining/status values.
- Production plan/readiness projections ignore inventory-backed lines marked non-produceable, while leaving their inventory components available for fulfillment/backorder analytics.
- Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-fulfillment-plan.test.ts` passed with 29 tests and 74 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 12 tests and 25 assertions after adding explicit non-produceable metadata precedence and persisted mixed grouped metadata coverage; `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 22 tests and 63 assertions after adding non-produceable fulfillment queue coverage; `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 5 tests and 10 assertions after adding production lifecycle metadata preservation coverage.

## 2026-06-16 Legacy Production Bypass Update
- Direct legacy production assignment/submission/delete/mark-complete paths now call `syncInventoryProductionLifecycleForSale` after their existing sales-control/stat reset mutation.
- Covered paths include standalone production assignment actions, clean-code production data-access helpers, mirrored `app-deps` helpers, batch assignment, old mark-complete actions, sales-progress fallback deletion, and the older production item action helpers.
- The canonical `update-sales-control` task still owns the modern task path; package-level sales-control tasks were not changed to avoid double-syncing modern flows.
- Sales overview Mark As actions now render the shared `SalesMenu.MarkAs` component in both the legacy overview sheet action bar and the newer sales overview system quick actions, so production-complete and fulfillment-complete run through the same `update-sales-control` job-backed path used by the orders table.
- Validation: `bun test apps/www/src/actions/production-control-reset.test.ts` passed with 2 tests and 42 assertions; focused sales inventory/fulfillment tests still passed with 29 tests and 74 assertions; `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 5 tests and 10 assertions.

## 2026-06-16 Inbound Prompt Reconciliation Update
- `notes.saveInboundNote` now applies `ORDERED` and `PENDING ORDER` prompts to existing open inventory `InboundDemand` rows for the same sale.
- `PENDING ORDER` updates are limited to unassigned open demand and do not downgrade shipment-linked or partially received demand.
- `syncSalesInventoryLineItems` now reads the sale's order-level inbound status and uses the shared inventory demand-status resolver when creating/updating `InboundDemand`, covering the async timing case where the invoice prompt saves before inventory demand rows exist.
- Sales inventory sync, inbound queue, reorder suggestions, reconciliation, and inbound assignment flows now use the inventory-owned `ACTIVE_INBOUND_DEMAND_STATUSES` policy for active demand reads, so previously cancelled/deleted demand history is not counted or revived into the active projection.
- Order prompt mutation uses the separate inventory-owned `ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES` policy, keeping prompt-side updates limited to `pending` and `ordered` demand.
- Added ADR-009 to document inventory as the owner of inbound demand status semantics and sales as a consumer of that policy.
- `AVAILABLE` prompts intentionally do not cancel shortage demand; these disagreements surface in the inbound reconciliation report instead of hiding real stock gaps.
- Added `inventories.inboundStatusDemandReconciliation`, a bounded query comparing `SalesOrders.inventoryStatus` with open line-level demand.
- `/inventory/inbounds` now shows a compact reconciliation panel for orders with prompt/demand mismatches, extracted as a dedicated widget component to keep the workspace page composition-oriented.
- Validation: `bun test packages/inventory/src/application/inbound/inbound-demand.test.ts` passed with 14 tests and 31 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 10 tests and 20 assertions.

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

Last updated: 2026-06-23

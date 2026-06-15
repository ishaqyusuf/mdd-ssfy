# API Endpoints

## Purpose
Tracks notable API surfaces and where they are implemented.

## Current Notes
- Primary API implementation lives in `apps/api`.
- The codebase uses route/query organization around domain-specific files and tRPC routers.
- Sales production routes now include:
  - `sales.productions`: admin-facing production queue list with due-date/status filtering
  - `sales.productionTasks`: worker-scoped production queue list using the authenticated user as `workerId`
  - `sales.productionDashboard`: production workspace summary query for alert buckets, queue counts, and compact due-date calendar data
- Sales overview routes now include:
  - `sales.getSaleOverview`: dedicated single-sale overview query used by the v2 sales overview system; loads one order/quote directly instead of routing through the broader sales list query
- Dispatch / pickup packing routes now include:
  - `dispatch.sendSaleForPickup`: creates or reuses a pickup `OrderDelivery` in `queue` and records packing-workflow membership on the `sales-packing-list` notification channel
  - `dispatch.packingList`: tab-aware query powering `/sales/packing-list` for `current`, `completed`, and admin-only `cancelled` views
  - `dispatch.signPackingSlip`: saves signature + packed/received names, packs all items into the delivery, and completes packing through the `/p/sales-invoice-v2` flow
  - Expo mobile now consumes `dispatch.packingList` for a separate `/(drivers)/warehouse-packing` workspace exposed from Settings, while item-level execution still reuses `dispatch.dispatchOverviewV2` + the shared dispatch detail packing flow
- Inventory dispatch routes now include:
  - `inventories.assignInventoryDispatchAllocations`: moves eligible inventory allocations into `reserved` for dispatch mode
  - `inventories.packInventoryDispatchAllocations`: moves reserved inventory allocations into `picked`
  - `inventories.fulfillInventoryDispatch`: consumes picked allocations and writes completed legacy `OrderDelivery` / `OrderItemDelivery` compatibility rows
  - `inventories.releaseInventoryDispatchAllocations`: releases held inventory dispatch allocations that have not been consumed
  - Shipment history for these routes is canonical in `OrderDelivery` / `OrderItemDelivery`; see `brain/decisions/ADR-008-inventory-shipment-record-source.md`
- Inventory partial shipment routes now include:
  - `inventories.salesPartialShipmentQueue`: dedicated partial-shipment queue with available-now, held-until-complete, awaiting-inbound, backordered, and ready-remaining statuses
  - `inventories.setSalesInventoryLineFulfillmentHold`: line-level hold-until-complete toggle stored in `LineItem.meta.fulfillment`
  - `inventories.shipAvailableSalesInventory`: now skips held lines unless the full remaining quantity can ship, returning skipped held lines with reason `hold_until_complete`
- Inventory inbound and backorder release routes now include retry guardrails:
  - `inventories.receiveInboundShipment`: receive is delta-based from persisted `InboundShipmentItem.qtyGood` / `qtyIssue`, so repeating the same payload does not duplicate stock, movement, demand received quantity, or issue rows; result includes duplicate/skipped quantity counters
  - `inventories.allocateReceivedInboundToBackorders`: auto-release result includes skipped demand and already-covered demand counts for repeated allocation jobs
- Inventory print routes now include:
  - `print.salesInventoryV2`: inventory-backed print data route for `/p/sales-inventory-v2`; emits the same v2 template input shape as current sales print while packet rows are composed from inventory `LineItem` / `LineItemComponents`
  - Data/golden coverage exists for production BOM, pick list, packing list, backorder summary, and customer remaining summary packets
- Inventory reconciliation routes now include:
  - `inventories.inventoryReconciliationReport`: dry-run report over inventory-backed sales lines with checked counts, drift counts, severity, samples, skipped counts, skipped reasons, next cursor, and has-more state
  - `inventories.runInventoryReconciliationReport`: queues Trigger task `run-inventory-reconciliation-report` for bounded dry-run reconciliation; no repair or mutation is performed by this job
  - `inventories.dykeInventoryDriftReport`: existing Dyke/inventory definition and pricing drift report used beside the sales inventory reconciliation report
- Inventory item dashboard routes now include:
  - `inventories.inventoryItemDashboard`: bounded item overview query for `/inventory/[id]`, returning item summary, variants, current stock, stock movements, inbound demand, active allocations, and related sales/quotes from inventory `LineItem` references
- Inventory variants workspace routes now include:
  - `inventories.inventoryVariantsWorkspace`: bounded variants query for `/inventory/variants`, with search plus item, category, supplier, status, stock-mode, and low-stock filters; rows expose stock, price, supplier, status, item, category, and attribute context
- Inventory top-sales analytics routes now include:
  - `inventories.inventoryTopSalesAnalytics`: 90-day default inventory-backed analytics for `/inventory` and `/inventory/[id]`, ranking items and variants by ordered quantity from `LineItem` rows and shipped quantity from consumed `StockAllocation` rows; revenue/cost metrics include reliability counts because legacy-only/unmapped sales are excluded
- Inventory stock audit routes now include:
  - `inventories.stockAuditVerificationReport`: 90-day default audit matrix for `/inventory/stocks`, verifying stock in, stock out, return, correction, consume, and release against expected `StockMovement` types and `InventoryLog` actions
- Inventory operations dashboard routes now include:
  - `inventories.inventoryOperationsSummary`: bounded stock-health query for `/inventory`, returning tracked/untracked variant and item counts, low/out-of-stock alert rows, open inbound demand qty, pending allocation qty, backordered line count, production blocker count, and the current tracking policy metadata
- Community production routes now include:
  - `community.getUnitProductions`: community unit-production task list with builder/project/task/status/due-date filtering and `ids` deep-link filtering
  - `community.getUnitProductionSummary`: lightweight summary query powering unit-production widgets for total tasks, units covered, queued, started, completed, and past-due counts
  - `filters.unitProduction`: filter metadata for the rebuilt `/community/unit-productions` table surface
- Community notification channels now include:
  - `community_unit_production_started`
  - `community_unit_production_stopped`
  - `community_unit_production_completed`
  - `community_unit_production_batch_updated`
- Customer routes now include:
  - `customer.getCustomerDirectoryV2Summary`: lightweight stats for the `sales-book/customers/v2` directory header cards
  - `customer.getCustomerOverviewV2`: shared customer overview payload used by both the v2 full page and the 3xl side-sheet surface

## TODO
- Summarize the highest-value API surfaces by domain.
- Link important sales, checkout, dispatch, jobs, and customer flows to their implementation areas.

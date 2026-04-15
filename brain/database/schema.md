# Database Schema

## Purpose
Tracks important schema-level entities and ownership boundaries.

## Current Notes
- Primary schema work appears to live in `packages/db`.
- Active schema-heavy domains include sales, payment-system, resolution-system, and document-platform foundations.
- Inventory demand is now being shaped around three layers in `packages/db/src/schema/inventory.prisma`:
  - `LineItemComponents` as the gross demand row created from sales/inventory sync
  - `StockAllocation` as stock-side reservation/allocation against that demand
  - `InboundDemand` as the shortage/replenishment row that should link into `InboundShipmentItem` and later post through `StockMovement`
- The first shared inbound service now exists in `packages/inventory/src/application/inbound/inbound-demand.ts`:
  - `createInboundShipmentFromDemands(...)` converts `InboundDemand` shortages into `InboundShipment` + `InboundShipmentItem`
  - `receiveInboundShipment(...)` now splits `qtyGood` vs `qtyIssue`, posts only good qty into `InventoryStock`, writes `StockMovement`, and rolls progress back up into `LineItemComponents`
- Inventory receiving/issue workflow now has an explicit discrepancy model:
  - `InboundShipmentItem.qtyGood`
  - `InboundShipmentItem.qtyIssue`
  - `InboundShipmentItemIssue` for damaged/missing/wrong-item/quality-hold style discrepancies and their resolution lifecycle
- Stock allocation now distinguishes review-stage suggestions from committed reservations:
  - `StockAllocation.status = pending_review` means suggested, not yet committed
  - committed stock should be derived from approved/picked/consumed allocation states, not from pending review rows
- Receipt snaps now reuse the shared document platform instead of a bespoke inbound file table:
  - `StoredDocument.ownerType = "inventory_inbound_shipment"`
  - `StoredDocument.kind = "inbound_receipt"`
- AI receipt parsing now persists in inventory schema through:
  - `InboundShipmentExtraction`
  - `InboundShipmentExtractionLine`
  These hold extraction status, invoice metadata, parsed lines, and inventory match state before the user applies results to inbound items.
- Receiving work should extend the existing inventory schema (`InboundShipment`, `InboundShipmentItem`, `InventoryStock`, `StockMovement`) instead of creating a separate supplier-receipt system outside inventory.
- Legacy Dyke authoring is now starting to move behind the inventory domain/API boundary:
  - `@gnd/inventory` now owns the active custom-component save/update and pricing-update services
  - inventories tRPC now exposes Dyke authoring mutations (`saveDykeStepComponent`, `updateDykeComponentPricing`) instead of relying on `apps/www` server actions for the active custom-component flow
  - targeted Dyke-step structural sync now has a dedicated async job path via `sync-dyke-step-to-inventory`
  - current drift tooling is structural only: it reports Dyke component UIDs missing inventory/variant rows; pricing drift remains undecided until pricing semantics are finalized
- Supplier pricing migration now starts from a split model instead of treating suppliers as inventory:
  - `Supplier` remains the vendor entity and now carries the legacy Dyke supplier UID bridge
  - `SupplierVariant` is the inventory-native join between supplier and inventory variant for supplier SKU, cost, sales price, min order qty, lead time, preferred flag, and active state
  - current door pricing still resolves from legacy dependency buckets; the safe bridge is to keep `Supplier.uid` aligned with the old Dyke supplier UID while introducing `SupplierVariant` as the new canonical inventory-side supplier pricing record
- Sales dispatch / pickup schema notes:
  - pickup packing now uses normal `OrderDelivery.status` transitions (`queue`, `completed`, `cancelled`) instead of requiring a dedicated live `packing queue` status
  - membership/history for the packing-list workflow is recorded through the `sales-packing-list` notification/activity channel
  - pickup packing signatures remain note-backed rather than adding a new `OrderDelivery` signature column; the active lookup still resolves by `deliveryId` tags from `NotePad`

## TODO
- Document the canonical schema modules and the most important tables/models.
- Summarize recent additions such as payment, resolution, and document-platform entities.

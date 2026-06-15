# ADR-008: Inventory Shipment Record Source

## Status
Accepted

## Date
2026-06-15

## Context
Inventory-backed fulfillment now supports partial shipment and inventory dispatch mode while legacy sales, print, packing, and dispatch surfaces continue to read delivery records.

The inventory master plan originally named possible `SalesShipment` / `SalesShipmentLine` models. Those models do not exist today. Current shipment-capable inventory flows already write:

- `OrderDelivery` as the shipment/dispatch header
- `OrderItemDelivery` as the shipment line record
- `OrderDelivery.meta.source` / `OrderItemDelivery.meta.source` to distinguish inventory-origin flows such as `inventory_partial_shipment` and `inventory_dispatch_mode`
- `StockAllocation.status` for inventory-side reservation, pick, consume, release, and cancellation state

Adding new shipment tables now would duplicate existing delivery history and require compatibility writes back to the legacy dispatch model while the migration still depends on legacy sales surfaces.

## Decision
For the current inventory cutover phase, `OrderDelivery` and `OrderItemDelivery` are the canonical shipment records for sales fulfillment, including inventory-backed partial shipment and inventory dispatch mode.

`SalesShipment` and `SalesShipmentLine` will not be added now.

Inventory-specific shipment meaning must be recorded through metadata and allocation state:

- `OrderDelivery.meta.source = "inventory_partial_shipment"` for ship-available/backorder partial shipment.
- `OrderDelivery.meta.source = "inventory_dispatch_mode"` for inventory-mode dispatch fulfillment.
- `OrderItemDelivery.meta.lineItemId` links the legacy shipment line back to inventory `LineItem`.
- `OrderItemDelivery.meta.backorderedQty` records remaining quantity context when relevant.
- `StockAllocation.status = picked` represents packed/prepared inventory.
- `StockAllocation.status = consumed` represents inventory consumed by completed shipment.
- `StockAllocation.status = released` represents dispatch/fulfillment cancellation or release before consumption.

## Consequences
- Fulfillment, print, reporting, reconciliation, and customer remaining-quantity summaries should read shipment history from `OrderDelivery` / `OrderItemDelivery`.
- Inventory availability and consumption should continue to derive from `StockAllocation` and `InventoryStock`, not only from delivery rows.
- Reconciliation jobs should compare completed `OrderItemDelivery` quantities against consumed `StockAllocation` quantities for the same inventory line/component scope.
- Existing legacy dispatch and print flows remain compatible during migration.
- A future `SalesShipment` / `SalesShipmentLine` model can still be proposed later, but only if a specific reporting, audit, or operational requirement cannot be met with the existing delivery tables plus metadata.

## Validation
- Current inventory partial shipment implementation writes `OrderDelivery` / `OrderItemDelivery` with `source: "inventory_partial_shipment"`.
- Current inventory dispatch fulfillment writes `OrderDelivery` / `OrderItemDelivery` with `source: "inventory_dispatch_mode"`.
- No `SalesShipment` / `SalesShipmentLine` Prisma models exist in the current schema.

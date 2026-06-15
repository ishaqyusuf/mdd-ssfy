# Database Relationships

## Purpose
Tracks important cross-model relationships and ownership patterns.

## Current Notes
- Sales shipment relationship for the inventory cutover:
  - `SalesOrders` -> `OrderDelivery` is the shipment/dispatch header relationship.
  - `OrderDelivery` -> `OrderItemDelivery` is the shipment line relationship.
  - `OrderItemDelivery.orderItemId` points to the legacy sales line.
  - `OrderItemDelivery.meta.lineItemId` should point to inventory `LineItem.id` for inventory-origin shipment writes.
  - `LineItemComponents` -> `StockAllocation` remains the inventory-side component reservation/pick/consume relationship.
  - Completed shipment reporting should read `OrderDelivery` / `OrderItemDelivery`; inventory stock consumption reporting should read `StockAllocation.status = consumed` and reconcile the two.

## TODO
- Document major relationships for sales, payments, resolution, documents, customers, and dispatch flows.

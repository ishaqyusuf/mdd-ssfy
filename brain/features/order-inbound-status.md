# Order Inbound Status

## Goal
Track whether a sales order has vendor-order work outstanding without moving into item-level inbound demand or purchase-order generation.

## Flow
- Sales orders carry one manual inbound status in `SalesOrders.inventoryStatus`.
- Supported values are `AVAILABLE`, `ORDERED`, and `PENDING ORDER`.
- Manual order saves ask whether all product is in stock; if not, they ask whether the missing product has been ordered.
- Quotes do not use this status prompt.
- Existing orders preserve their current inbound status unless a user changes it from the inbound status action/modal.

## Data Model
- `SalesOrders.inventoryStatus` is the source of truth.
- No item-level demand rows, supplier rows, or purchase orders are created by this feature.

## API And Notifications
- `notes.saveInboundNote` updates `SalesOrders.inventoryStatus` and writes an order note tagged to `inventory_inbound`.
- Status notes include the previous status, new status, sales id, order number, optional note text, and optional attachment tags.
- `PENDING ORDER` status changes create unread note recipients for subscribers of the `inventory_inbound` channel.

## UI
- The sales orders table exposes an `Inbound` badge column.
- `AVAILABLE` is green, `ORDERED` is blue, and `PENDING ORDER` is amber with row emphasis.
- The order action menu opens the existing inbound status modal for later manual updates.

## Future Improvements
- Generate purchase orders from pending inbound statuses.
- Move from order-level status to item-level inbound requirements when the business is ready for full purchasing workflow.

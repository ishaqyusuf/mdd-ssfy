# Order Inbound Status

## Goal
Track whether a sales order has vendor-order work outstanding while keeping item-level purchasing demand in inventory projections.

## Flow
- Sales orders carry one manual inbound status in `SalesOrders.inventoryStatus`.
- Supported values are `AVAILABLE`, `ORDERED`, and `PENDING ORDER`.
- Manual order saves ask whether all product is in stock; if not, they ask whether the missing product has been ordered.
- Quotes do not use this status prompt.
- Existing orders preserve their current inbound status unless a user changes it from the inbound status action/modal.
- When a user selects `ORDERED` or `PENDING ORDER`, existing open inventory `InboundDemand` rows for the sale are updated to `ordered` or `pending` respectively.
- `PENDING ORDER` only changes unassigned open demand; demand already linked to an inbound shipment and partially received demand are not downgraded.
- Sales inventory line sync also reads `SalesOrders.inventoryStatus`, so demand rows created after the save-time prompt inherit `ORDERED` / `PENDING ORDER` semantics instead of falling back to `pending`.
- Selecting `AVAILABLE` does not cancel shortage demand; inventory reconciliation surfaces any order marked available while component demand is still open.
- The API now accepts optional selected `demandIds` for line-level prompt refinement: selected mutable demand rows can be marked `ordered`, reset to `pending`, or cancelled when the selected line is confirmed `AVAILABLE`.

## Data Model
- `SalesOrders.inventoryStatus` is the source of truth.
- `InboundDemand` remains the line/component purchasing-demand source for inventory dashboards.
- This feature updates existing open `InboundDemand` status from the order prompt, but it does not create supplier rows, purchase orders, shipments, partially received regressions, or new demand rows by itself. Missing demand is handled by sales inventory line sync, which now projects the saved order inbound status onto created demand rows, and reconciliation.
- Order-wide `AVAILABLE` remains non-destructive; selected `demandIds` let future line-aware prompts cancel only explicitly chosen pending/ordered demand rows.
- Inbound demand status semantics are owned by inventory and documented in `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
- Sales overview inventory rows that are non-stock, not-inventory, untracked, or have zero required quantity use derived `Not Applicable` / `N/A` display. This is intentionally not a `SalesOrders.inventoryStatus` value and does not imply order-level `AVAILABLE` stock.

## API And Notifications
- `notes.saveInboundNote` updates `SalesOrders.inventoryStatus`, writes an order note tagged to `inventory_inbound`, and applies `ORDERED` / `PENDING ORDER` to existing open `InboundDemand` rows for the sale.
- `notes.saveInboundNote` accepts optional `demandIds` for line-scoped mutation. When present, status application remains scoped to the same sale and only mutates inventory-owned prompt-mutable statuses.
- If a line-scoped prompt request supplies demand ids but none are valid positive integers, inventory skips demand mutation instead of widening the request into an order-wide status update.
- UI surfaces that need selected-demand enablement should use `canOrderInboundPromptMutateDemand` from `@gnd/inventory/inbound-policy`.
- Status notes include the previous status, new status, sales id, order number, optional note text, and optional attachment tags.
- `PENDING ORDER` status changes create unread note recipients for subscribers of the `inventory_inbound` channel.

## UI
- The sales orders table exposes an `Inbound` badge column.
- `AVAILABLE` is green, `ORDERED` is blue, and `PENDING ORDER` is amber with row emphasis.
- Inventory row-level `N/A` appears only in the Inventory tab requirement display for stock-not-required rows; it is not editable through the manual order inbound status modal.
- The order action menu opens the existing inbound status modal for later manual updates.
- Sales overview action bars no longer expose the old `Inbound` / `Update Inbound` shortcut. Order inbound status updates remain available from inbound-management workflows and inventory-oriented surfaces that use the shared inbound status modal.
- The inbound status modal fetches the order's active mapped inventory demand and can submit selected `InboundDemand` rows through `demandIds` for line-scoped prompt changes.
- Demand rows in the inbound status modal join through `inventories.salesInventoryOverview` by `InboundDemand.id`, so component name, shared category/step formatting, and human-readable variant labels match the Sales Overview Inventory tab's Create inbound form. Queue-provided sales-line, inventory-name, and SKU labels remain the fallback when overview metadata is unavailable.
- Successful manual inbound updates invalidate the Sales Activity tree and sales inventory overview. The existing `Sales Inbound` activity note therefore appears without a page reload, with no duplicate activity write.
- `/inventory/inbounds` includes an inbound reconciliation panel showing orders where the manual prompt and open inventory demand disagree.

## Future Improvements
- Generate purchase orders from pending inbound statuses.
- Browser-validate the selected-demand modal flow with mapped demand fixtures.

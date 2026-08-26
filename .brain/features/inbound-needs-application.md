# Inbound Needs Application

## Status

Implemented — 2026-08-26.

## Purpose

Keep the existing inbound lifecycle controls while ensuring that a shipment
marked `completed` / `Received` is applied to its linked Sales material Needs.
Historical Received shipments that still have open linked demand can be
reconciled explicitly from every inbound detail workspace.

## Behavior

- Changing an inbound status to `completed` applies its planned shipment-item
  quantity to linked active `InboundDemand` rows in the same transaction.
- Applying updates guarded demand `qtyReceived` and status, then recomputes the
  affected `LineItemComponents` Need state. It does not create physical stock,
  stock movement, or inventory-log evidence; `Receive stock` remains the
  physical receiving workflow.
- A historical Received inbound with unused planned capacity against linked
  demand exposes `Apply to needs`. Once that inbound's applicable capacity is
  consumed, the control is disabled as `Applied to needs` even when the linked
  Need still requires more quantity from another inbound.
- An applied Received inbound exposes `Unapply`. The confirmation restores the
  exact pre-application demand snapshot. Existing fully applied historical or
  physical receipts can also be unapplied from Needs, without reversing stock.
- Apply and unapply are guarded by exact demand and shipment-item receipt
  baselines. Later receipt or demand changes make a stored application
  non-reversible until reviewed.
- `Event` rows named `inventory_inbound_needs_applied` and
  `inventory_inbound_needs_unapplied` retain actor-attributed snapshots and
  operation history without adding inventory schema.

## API And Permissions

- `inventories.updateInboundShipmentStatus` automatically applies Needs when
  the target status is `completed`; that transition requires
  `editInboundOrder`.
- `inventories.updateInboundShipmentNeedsApplication` accepts
  `{ inboundId, operation: "apply" | "unapply" }` and requires
  `editInboundOrder`.
- `inventories.inboundShipmentDetail` returns `needsApplication` with derived
  state, action eligibility, linked/applied/open quantities, and the active
  application event id.
- Both mutations publish `inventory.inbound.changed`, refreshing inbound reads,
  Sales Orders, Sales Overview, and the Inventory Needs projection.

## UI

The shared action is available in:

- Sales Book Inbounds
- Inventory Receiving
- Sales Overview Inventory > Inbounds
- the global Inbound Overview sheet

Unapply uses an explicit confirmation explaining that physical stock is not
reversed.

## Validation

- Package tests cover apply, partial-capacity backward compatibility, malformed
  snapshot rejection, exact-snapshot unapply, receipt-drift rejection, and
  backward-compatible unapply without stock mutation.
- API coverage proves the Received status transition calls Needs application in
  the same transaction.
- Route schema and query-event coverage prove bounded inputs and refresh
  registration.

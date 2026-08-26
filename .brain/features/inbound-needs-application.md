# Inbound Needs Application

## Status

Implemented — 2026-08-26.

## Purpose

Keep the existing inbound lifecycle controls while ensuring that a shipment
marked `completed` / `Received` is applied to its linked Sales material Needs.
Historical Received shipments that still have open linked demand can be
reconciled explicitly from every inbound detail workspace or from the global
Received-inbound attention queue.

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
- Legacy Sales `AVAILABLE` adaptation is a separate compatibility workflow. It
  fulfills eligible tracked, unlinked Needs without fabricating a receipt; it
  does not apply a Received inbound and intentionally excludes shipment-linked
  demand from that adaptation.

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
- `inventories.inboundNeedsApplicationAttentionSummary` provides the lean global
  count. `inventories.inboundNeedsApplicationAttention` loads at most 100
  detailed Received shipments only when the modal opens; rows require active
  Sales Need lineage and are enriched with order numbers and the originating
  author.
- `inventories.applyInboundNeedsApplicationAttention` accepts 1-100 unique
  inbound ids, applies them in one transaction, and reconciles the deduplicated
  affected Sales orders after commit.
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

A permission-scoped floating action appears on the right side of the dashboard
when one or more Received inbounds still need application. Its modal shows order
number, author, Received status/date, and `Needs x of y`; operators can apply one
row or select up to 100 rows and use the floating batch action. The action hides
when the queue is empty. The global attention action is explicitly mounted behind
the shared `<Env isDev>` flag, so it is available for development reconciliation
but is not rendered or queried in production. Page-level floating controls use a
lower stacking layer than shared modal and sheet overlays, so they do not display
above open dialogs.

## Validation

- Package tests cover apply, partial-capacity backward compatibility, malformed
  snapshot rejection, exact-snapshot unapply, receipt-drift rejection, and
  backward-compatible unapply without stock mutation.
- API coverage proves the Received status transition calls Needs application in
  the same transaction.
- Route schema and query-event coverage prove bounded inputs and refresh
  registration.
- Authenticated local-browser validation proved four historical gaps were
  listed with resolved order/author metadata and that row selection reveals the
  floating batch action. Order `09437PC` legacy AVAILABLE adaptation was run and
  reached two fulfilled Needs without creating an inbound shipment.

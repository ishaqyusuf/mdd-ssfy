# ADR-037: Automatic Legacy Inbound Status Adaptation

## Status

Accepted

## Date

2026-07-29

## Context

Historical sales can retain `SalesOrders.inventoryStatus` values before any
inventory-backed line, demand, or inbound shipment exists. Requiring operators
to choose between reset and override made the historical intent hard to
interpret and left the Sales Orders list inconsistent with the Inventory tab.

## Decision

Opening the Inventory tab for an active `legacy_status_locked` order
automatically runs one guarded, transactional adaptation for the exact saved
status:

- `ORDERED` synchronizes requirements, advances linked pending shipments to
  `in_progress`, and creates `in_progress` shipments for safely
  supplier-resolved unlinked demand.
- `PENDING ORDER` synchronizes requirements and creates `pending` shipments for
  safely supplier-resolved unlinked demand.
- `AVAILABLE` synchronizes requirements and invokes the same guarded manual
  need-fulfillment core as the explicit operator action, without creating stock,
  allocation, receipt, or movement evidence.

Supplier selection is deterministic: one preferred active supplier variant,
then the inventory default supplier, then the sole active supplier variant.
Missing or ambiguous resolution remains explicit review work. The system never
creates a placeholder supplier.

The canonical mutation actions are `continue` and `clear`. `override` and
`reset` remain temporary API aliases. A failed automatic attempt does not loop;
Retry is operator-driven and Clear is a confirmed recovery action.

Inventory-owned inbound and demand state remains authoritative under ADR-009.
The historical prompt is compatibility input and display context, not proof of
stock, receipt, allocation, or shipment linkage.

## Consequences

- Recognized historical intent can continue without a reset/override decision.
- Automatic adaptation is auditable and stale-status guarded.
- Multi-supplier orders may create more than one inbound shipment.
- Partial success is expected when some demand lacks deterministic supplier
  configuration.
- Existing clients remain compatible during the alias window.
- No database schema migration is required.

## Validation

- Shared compatibility, orchestration, alias, supplier-resolution, manual
  fulfillment, overview, route-import, and UI tests cover the automatic paths.
- Authenticated local browser validation on order `09068PC` confirmed guarded
  `ORDERED` adaptation and supplier-unresolved partial-success behavior.

# ADR-046: Inventory Fulfillment Command Boundaries

Date: 2026-08-04
Status: Accepted

## Context

Backorder, partial-shipment, and inventory-dispatch commands were sharing loose
string inputs and page-level assumptions. A client could supply the audit author,
terminal sales could still reach mutation planning, concurrent allocation claims
were only guarded at individual writes, and order-level `inventoryStatus` was being
used for line-level fulfillment outcomes.

## Decision

- The only shipment delivery modes are `pickup`, `delivery`, and `ship`, defined by
  the shared sales delivery schema.
- Shipment/hold/dispatch mutations require an operational fulfillment capability;
  received-stock release requires inbound or order editing capability. Audit actor
  identity always comes from the authenticated server session.
- Fulfilled and cancelled sales are read-only for inventory fulfillment. Requested
  line ids must belong to the selected sale.
- Allocation, hold, shipment, dispatch, and received-backorder commands run in a
  serializable transaction with bounded retry on Prisma write conflicts.
- `SalesOrders.inventoryStatus` is not a partial-shipment state store. Fulfillment
  truth remains at delivery, allocation, demand, and component/line projection
  grain.
- Queue pagination, summaries, and print selections scan the complete filtered
  result set with stable line-item cursors rather than page-local totals.

## Consequences

- Legacy sentinel modes such as `inventory_partial` and `inventory_dispatch` are
  rejected; source attribution stays in delivery metadata instead.
- Existing invalid delivery modes, order-level fulfillment statuses, and active
  components under terminal sales are reviewed through the dry-run-first
  `inventory:fulfillment-repair` command. Apply mode requires explicit sale ids and
  confirmation.
- Queue reads use new compound indexes and can support infinite scrolling without
  the former 100/300-row ceilings.

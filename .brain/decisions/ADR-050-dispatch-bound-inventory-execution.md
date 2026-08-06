# ADR: Dispatch-Bound Inventory Execution

## Status

Accepted — 2026-08-06.

## Context

The legacy driver platform executes `OrderDelivery` and `OrderItemDelivery`,
while the newer inventory system owns component demand and stock allocation.
Without an explicit relationship, warehouse packing and driver completion can
show a plausible manifest while reserving, consuming, or releasing stock for a
different trip. Split deliveries make sale-level allocation especially unsafe.

## Decision

1. `OrderDelivery` remains the canonical trip/shipment header during cutover.
2. `StockAllocation.orderDeliveryId` binds an exact allocation quantity to one
   trip. Oversized approved rows are split under a guarded transaction.
3. Required component quantity is proportional to the sales-item quantity on
   the current `OrderDelivery`, capped by the full sales-line requirement.
4. Warehouse preparation transitions bound rows from approved to reserved to
   picked. Driver start checks only the current trip's scoped requirements.
5. Completion consumes only picked rows bound to that trip in the same
   canonical completion transaction. Retry/idempotency behavior remains owned
   by the existing proof-completion contract.
6. Cancellation releases approved/reserved rows. Picked rows require explicit
   manager confirmation that physical stock was returned before release.
7. Historical backfill is dry-run-first, exact-quantity, and limited to sales
   with one active dispatch. Multi-dispatch or shortage cases remain reported
   for manual reconciliation.
8. Inventory-backed and legacy lines may coexist. Legacy fallback remains
   explicit and never manufactures SKU, handing, or stock readiness.

## Consequences

- Inventory can be reconciled per physical trip instead of only per sale.
- Split deliveries do not steal stock from later trips.
- Packing/start/completion may reject work that the legacy projection called
  ready; this is intentional when physical inventory evidence is incomplete.
- Cancelling picked work requires an operational return confirmation rather
  than silently placing loaded stock back into availability.
- `OrderItemDelivery` remains necessary for compatibility and customer-facing
  shipment history until a later ADR explicitly retires it.

## Alternatives

- Bind all sale allocations to the first dispatch. Rejected because partial and
  multi-trip orders would over-reserve inventory.
- Consume inventory from the client at completion. Rejected because mobile
  retries and stale manifests could double-consume or select the wrong stock.
- Replace legacy delivery tables immediately. Rejected because proof,
  documents, reporting, and active historical dispatches depend on them.

## Implementation Notes

- Schema: `packages/db/src/schema/inventory.prisma` and
  `packages/db/src/schema/sales.dispatch.prisma`
- Migration: `20260806120000_bind_stock_allocations_to_dispatch`
- Domain: `packages/sales/src/sales-fulfillment-plan.ts`
- API projection/actions: `apps/api/src/db/queries/dispatch-inventory*.ts`


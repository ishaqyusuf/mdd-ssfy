# ADR: One-click Sales Fulfillment Resolves Inventory Dependencies

## Status

Accepted — 2026-08-06.

## Context

The Sales Orders `Fulfilled` action can reach an order with linked open inbound
shipments, genuine production submissions awaiting material review, and legacy
or configuration-only component checks. The former status-action override only
wrote workflow evidence. It did not receive inbound stock or approve production,
so the later sales-control job still stopped at the material-review boundary.

## Decision

The explicit `Receive, approve and continue` confirmation is a staged,
idempotent orchestration owned by the Sales package:

1. Receive every remaining item on each active inbound shipment linked to the
   selected order through the canonical inbound receipt service. Receipt writes
   stock movements, demand quantities, component recomputation, progress, and
   received timestamps; existing issue quantities are preserved.
2. Run canonical manual fulfillment for remaining tracked inventory needs.
3. Re-read and approve every pending production material review, including
   genuine production submissions. Approval retains material evidence,
   production payroll, payment-review automation, reviewer, and history effects.
4. Record the existing audited availability override only for residual legacy or
   configuration checks that canonical tracked-inventory services cannot mutate.
5. Start the existing production-completion or dispatch packing/completion task
   only after the dependency command allows continuation.

The preflight response exposes the affected order, inbound shipment/item/quantity,
production review/submission/quantity, residual availability, payment review,
and dispatch effects before confirmation. The orchestration requires
`editOrders`, `editInboundOrder`, and `editProduction` together so a dependency
appearing between preview and execution cannot cross a permission boundary.

## Alternatives

- Keep separate inbound, production-review, and fulfillment clicks. Rejected
  because the requested status action must finish the complete workflow.
- Force the sales-control job through pending reviews. Rejected because it would
  bypass canonical receiving, reviewer, payroll, payment, and audit effects.
- Fabricate receipts for every unresolved component. Rejected because
  configuration-only or non-stock-tracked components are not physical stock.

## Consequences

- One explicit confirmation can receive inbound, approve real production, pack,
  and fulfill an order.
- A linked inbound shipment is the physical receipt unit; all of its remaining
  items are received, even when its items serve more than one linked demand.
- The stages may commit independently. Retries are safe because inbound receipt,
  review decision, residual override, packing, and completion paths are
  idempotent or concurrency guarded.
- Direct fulfillment tasks still reject pending production review. Only this
  permission-checked operator confirmation resolves the evidence first.
- ADR-039 remains the default production-material rule; this ADR supersedes its
  separate-manual-review expectation for the explicit one-click status flow.

## Implementation Notes

- Package orchestration: `packages/sales/src/sales-status-mark-as-resolution.ts`
- Thin tRPC boundary: `inventories.salesInventoryMarkAsPreflight` and
  `inventories.overrideSalesInventoryMarkAsAvailabilityForContinue`
- UI confirmation: `apps/dashboard/src/components/sales-menu.tsx`

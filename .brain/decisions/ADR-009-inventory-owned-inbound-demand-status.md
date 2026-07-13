# ADR-009: Inventory-Owned Inbound Demand Status

## Status
Accepted

## Date
2026-06-16

## Context
Sales order saves can capture a manual inbound prompt through `SalesOrders.inventoryStatus` before inventory-backed `InboundDemand` rows exist. The actual operational purchasing queue, receiving dashboard, backorder release, and supplier reorder suggestions read `InboundDemand`, not only the order-level prompt.

If the prompt mutates only existing demand rows, an async sales inventory sync can later create new demand as `pending` even when the operator already marked the order as `ORDERED`. If sales owns a separate copy of the mapping rule, demand status semantics can drift between invoice save, inventory sync, inbound receiving, and reconciliation.

## Decision
Inventory owns inbound demand status semantics.

The canonical pure projection rule is `resolveOrderInboundDemandStatus(...)` in `packages/inventory/src/application/inbound/inbound-demand-policy.ts`, publicly re-exported through `packages/inventory/src/inbound-policy.ts` as `@gnd/inventory/inbound-policy`, and re-exported from `@gnd/inventory/inbound` for server/package compatibility.

The canonical pure selected-demand mutation rule is `canOrderInboundPromptMutateDemand(...)`, also exported through `@gnd/inventory/inbound-policy`.

Inventory also owns the status-policy constants used by inbound reads and prompt-side mutation:

- `ACTIVE_INBOUND_DEMAND_STATUSES` defines statuses that active demand reads may include, currently `pending`, `ordered`, and `partially_received`.
- `ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES` defines the narrower statuses that order prompts may mutate, currently `pending` and `ordered`.

Sales inventory sync may read `SalesOrders.inventoryStatus`, but it must call the inventory-owned resolver when projecting or updating `InboundDemand`.

Current mapping:

- `SalesOrders.inventoryStatus = "ORDERED"` projects open demand as `ordered`.
- `SalesOrders.inventoryStatus = "PENDING ORDER"` projects unassigned open demand as `pending`.
- `PENDING ORDER` must not downgrade demand already linked to an inbound shipment; shipment-linked open demand remains `ordered`.
- Received or partially received demand status is derived from `qtyReceived` and must not be downgraded by order prompts.
- `AVAILABLE` does not cancel shortage demand. Reconciliation surfaces conflicts between an available order prompt and open line-level demand.
- Line-scoped prompt refinement may pass selected `InboundDemand` ids. In that selected-demand mode, `AVAILABLE` cancels only the selected mutable demand rows for the same sale; the broad order-level `AVAILABLE` prompt remains non-destructive.
- UI surfaces that let users select specific demand rows should import `canOrderInboundPromptMutateDemand(...)` from `@gnd/inventory/inbound-policy` for enable/disable display instead of duplicating the policy in app-local code.

`notes.saveInboundNote` applies the same domain meaning to existing open demand rows for immediate feedback, while `syncSalesInventoryLineItems` applies the same resolver for demand rows created later.

Order prompt mutation must use `ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES`; queue, reorder, reconciliation, inbound assignment, and sales inventory projection reads must use `ACTIVE_INBOUND_DEMAND_STATUSES`.

## Consequences
- Inventory dashboards and inbound queues can treat `InboundDemand.status` as the operational source for purchasing state.
- Sales remains allowed to capture the human order-level prompt, but it does not own demand-state transition rules.
- Active demand reads and order-prompt writes can evolve separately without broad sales changes.
- Async timing between invoice save and sales inventory sync is safer because both paths apply the same rule.
- Future line-level prompt refinement should extend the inventory resolver or selected-demand mutability helper, not add sales-local mapping logic.
- Browser validation is still required to prove the end-to-end invoice save -> prompt -> inventory dashboard behavior with real fixtures.

## Validation
- `bun test packages/inventory/src/application/inbound/inbound-demand-policy.test.ts packages/inventory/src/application/inbound/inbound-demand.test.ts` covers the inventory-owned resolver, selected-demand mutability helper, active and prompt-mutable status policies, immediate note-side demand update behavior, and reconciliation cases.
- `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` covers sales sync consuming the resolver so newly created demand inherits order prompt semantics without downgrading received or shipment-linked demand.

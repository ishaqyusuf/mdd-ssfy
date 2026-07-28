# ADR-036: Manual Inventory Need Fulfillment Does Not Fabricate Stock

## Status

Accepted — 2026-07-28.

## Context

Sales operators sometimes know that every tracked material need for an order is
fulfilled even when the inventory system has no on-hand stock or allocation
record that can prove it. The former `Mark all available` action was misleading:
it only cleared stale inbound demand after allocations or receipts already
covered the order, so it appeared enabled for ordinary shortages but could not
complete them.

Treating an operator attestation as a stock adjustment would make physical
inventory, allocation, and receiving reports inaccurate.

## Decision

The Sales Overview Inventory action is `Mark all needs fulfilled`.

- It applies only to active, tracked, monitored inventory rows with positive
  pending quantity—the same rows shown in the Needs segment.
- It marks the selected component need `fulfilled` and clears its projected
  inbound quantity without increasing on-hand, allocated, or received
  quantities.
- It cancels only unlinked, unreceived `pending` or `ordered` inbound demand.
- Components owned by linked or partially received inbound work are preserved
  and returned for explicit inbound review.
- Component writes are guarded by the reviewed quantity baseline and the
  absence of active demand. A concurrent quantity or inbound-link change aborts
  the transaction and requires the operator to retry.
- When every applicable need is safely fulfilled, the order's manual inbound
  workflow prompt becomes `AVAILABLE`. This legacy `SalesOrders.inventoryStatus`
  value means no inbound action remains; it is not an on-hand stock ledger or a
  physical-availability assertion.
- Every attempt with applicable needs writes `SalesHistory` evidence including
  fulfilled and protected component ids, cancelled demand ids, actor context,
  and `noPhysicalStockChange=true`.

## Consequences

- Operators have the one-click completion action the label promises.
- Physical stock and allocation quantities remain truthful.
- Linked receiving history cannot be silently destroyed.
- Fulfilled component status now resolves displayed pending quantity to zero
  even when no stock quantity was fabricated.
- Fulfilled and cancelled orders remain read-only through the shared inventory
  operation policy.

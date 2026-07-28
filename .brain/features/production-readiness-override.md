# Production Assignment And Material Readiness

## Status

Current assignment policy updated on 2026-07-28. The 2026-07-27 override flow is
retained only for compatibility and historical audit.

## Operator Behavior

- The Sales Overview Production tab shows an order-level readiness notice above
  the production list.
- Production can be assigned whether materials are ready, awaiting allocation,
  awaiting inbound, or not yet configured.
- Configured orders with unresolved stock, allocation, or inbound evidence show
  blocker counts, pending/open inbound quantities, a bounded component sample,
  and a direct link to the Inventory tab.
- Assigned production order detail shows pending material names, quantities,
  and the linked inbound expected date when available.
- Orders without inventory component configuration can still be assigned and
  show a verify-materials notice to production.
- Fulfilled and cancelled orders remain read-only.
- `submitAll` remains subject to the strict readiness gate.
- Assignment does not mutate inbound demand, stock, allocation, or receipt
  records.

## Implementation Boundaries

- `@gnd/sales` owns readiness projection and the command policy that excludes
  `createAssignments` from readiness enforcement.
- The Trigger task enforces readiness only for `submitAll`.
- The active Production tab loads the core production overview first, then
  starts readiness from the resolved order identity. Readiness never participates
  in the core items response, so a slow or failed projection cannot blank or
  indefinitely load the production list.
- If the readiness projection is temporarily unavailable, the tab keeps the
  core items and assignment available and shows an Inventory-directed notice.
- `sales.productionOrderDetailV2` reads inventory production-plan evidence
  lazily for the expanded worker/admin order and exposes per-item material
  status, open inbound quantity, and expected inbound date.
- The persisted override model, API, and audit history remain compatible but are
  not consulted by assignment.

## Historical Override

ADR-030 documented the previous revision-bound exception. ADR-035 supersedes
that authorization model: assignment is now unconditionally independent of
inventory readiness.

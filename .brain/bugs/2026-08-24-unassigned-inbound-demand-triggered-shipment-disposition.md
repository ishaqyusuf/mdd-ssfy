# Bug: Unassigned Inbound Demand Triggered Shipment Disposition

## Date

2026-08-24

## Problem

Reducing a persisted order line could show `Cancel open inbound quantity` and
`Keep for warehouse stock` even though no inbound shipment had been created for
the order.

## Root Cause

The 2026-08-19 quantity-decision fix correctly correlated inbound quantity to
the same reduced line, but it still treated every open `InboundDemand` as a
supplier-shipment commitment. Inventory projection creates pending, unassigned
demand before an operator creates an inbound, so positive open demand alone was
not proof that either disposition was meaningful.

## Fix

The shared sales-adjustment decision rule now requires positive unreceived
demand linked through `inboundShipmentItemId` to a non-terminal inbound
shipment. Pending unassigned demand follows the ordinary save and inventory
projection-sync path. Operational acknowledgement also stops treating
unassigned demand by itself as inbound activity.

## Prevention

Keep `InboundDemand` (material requirement) distinct from `InboundShipment`
(supplier commitment) in decision names, tests, and UI. Regression coverage
must include the state where demand exists but both `inboundShipmentItemId` and
`inboundId` are absent.

## Related Files

- `packages/sales/src/adjustment-system/domain/change-analysis.ts`
- `packages/sales/src/adjustment-system/domain/change-analysis.test.ts`
- `apps/api/src/db/queries/new-sales-form-adjustments.ts`
- `.brain/features/in-form-sales-order-adjustments.md`
- `.brain/features/inbound-sales-adjustment-reconciliation.md`

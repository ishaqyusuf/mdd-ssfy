# Fixture F2 - Issue 1

## IDs
- salesId: TBD
- dispatchId: 3419
- orderNo: TBD

## Expected
- Packing list metrics are internally consistent:
  - `available` + `listed` should reconcile against dispatchable source quantity.
  - `pending` should represent unpacked quantity from listed dispatch rows for this dispatch scope.

## Actual
- Reported mismatch: packing list `available`, `listed`, and `pending` are incorrect.

## Delta
- To capture via API baseline:
  - `dispatchOverview.dispatchItems[*].deliverableQty|listedQty|packedQty|nonDeliverableQty`
  - dispatch row `control.pendingPacking` and `control.packables`
- Runtime capture blocked in current environment: DB connection unavailable at `localhost:3306` during Phase 0 baseline pull.

## Source References
- file: /Users/M1PRO/Documents/code/_turbo/gnd/apps/api/src/db/queries/dispatch.ts
- file: /Users/M1PRO/Documents/code/_turbo/gnd/packages/sales/src/utils/with-sales-control.ts
- endpoint: trpc.dispatch.dispatchOverview
- endpoint: trpc.dispatch.index

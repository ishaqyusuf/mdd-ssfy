# Fixture F4 - Issue 3

## IDs
- salesId: TBD
- dispatchId: 3420
- orderNo: TBD

## Expected
- Dispatch list progress should match packing-detail aggregates for the same dispatch.

## Actual
- Reported mismatch in packing progress and pending metrics.

## Delta
- Compare:
  - web dispatch list progress fields
  - mobile dispatch list progress fields
  - dispatch overview aggregate from item rows
- Runtime capture blocked in current environment: DB connection unavailable at `localhost:3306` during Phase 0 baseline pull.

## Source References
- file: /Users/M1PRO/Documents/code/_turbo/gnd/apps/www/src/components/tables/sales-dispatch/columns.tsx
- file: /Users/M1PRO/Documents/code/_turbo/gnd/apps/expo-app/src/features/dispatch/components/dispatch-list-item.tsx
- file: /Users/M1PRO/Documents/code/_turbo/gnd/apps/api/src/db/queries/dispatch.ts
- endpoint: trpc.dispatch.index
- endpoint: trpc.dispatch.dispatchOverview

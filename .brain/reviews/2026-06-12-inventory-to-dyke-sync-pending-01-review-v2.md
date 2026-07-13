# Brain Handoff Review: Pending 01 Inventory To Dyke Sync

Created: 2026-06-12 10:27 WAT

## Reviewed Handoff
`brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md`

## Queue Item
None. No submitted queue item exists under `~/.codex/brain-project-manager/queues/handoffs/`; this was a manual review.

## Source Plan
`brain/features/inventory-backed-sales-fulfillment.md`

## Result
Needs Fix

## Findings
- [P1] `packages/inventory/src/inventory.ts:2545` - `updateVariantStatus(...)` still updates or creates `InventoryVariant` rows without queuing `queueInventoryToDykeSync(...)`. This leaves the live variants status UI/API path outside the inventory-to-Dyke projection loop.
- [P1] `packages/inventory/src/application/sync/dyke-update-from-inventory.ts:272` - `syncVariantAndPricing(...)` still reads `variant.status` and `variant.deletedAt` but never uses them to archive matching `DykePricingSystem` rows. `pricingArchived` remains initialized and returned, but never incremented.
- [P2] `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts` - The focused test suite still does not include the fix-handoff-required tests for archived variant compare/sync behavior, draft variant skip behavior, supplier pricing archive via preserved `meta.pricingKey`, or `updateVariantStatus(...)` queue calls.

## Acceptance Criteria Check
- `updateVariantStatus(...)` queues inventory-to-Dyke sync for update and create branches: Fail
- Archived/deleted inventory variants soft-archive matching Dyke pricing rows: Fail
- Draft variants do not publish active Dyke pricing unless explicitly justified: Fail
- Compare mode reports archives without writes: Fail
- Sync mode is idempotent for variant archives: Fail
- Focused tests pass: Partial; existing focused tests pass, but required fix tests are missing.
- Brain progress is updated with fix completion notes: Not applicable; fix is not complete.

## Checks
- `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`: Pass, 20 tests / 41 assertions
- `git diff --check`: Pass
- `bun run --filter @gnd/inventory typecheck`: Fail on known baseline issues:
  - `src/application/inbound/inbound-demand.ts`: `lineItemComponentIds` is not in `ReceiveInboundShipmentResult`
  - `bun:test` module/type declaration errors in existing test files, including `inventory-to-dyke-sync.test.ts`

## Brain Update Check
- Review file: Present
- Fix handoff: Present, existing `brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md`
- Queue item update: Not applicable; no submitted queue item exists.
- Task/plan marked done: Not applicable; work still needs fix.

## Decision
The work does not pass. The latest fix handoff has not been implemented in the current worktree. The existing fix handoff remains accurate and should be used by the implementation agent rather than creating a duplicate repair contract.

## Follow-Up
- `brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md`

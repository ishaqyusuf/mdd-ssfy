# Review: Pending 01 Inventory To Dyke Sync

Created: 2026-06-12 10:14 WAT

## Scope
- Pending: `Full inventory-to-Dyke sync for create/update/delete/archive`
- Reviewed handoff: `brain/handoffs/inventory-to-dyke-sync-handoff.md`
- Queue item: None, manual pre-automation review

## Result
Needs fix.

The previously reported pricing skip, supplier pricing key, category archive result, and weak-test findings are fixed in the current worktree. A remaining Pending 01 blocker was found around variant status/archive projection.

## Blocking Finding

### [P1] Variant status/archive changes are not projected to Dyke
Files:
- `packages/inventory/src/inventory.ts`
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`

Evidence:
- `updateVariantStatus(...)` updates or creates `InventoryVariant` rows but does not call `queueInventoryToDykeSync(...)`.
- The public API mutation `inventories.updateVariantStatus` is wired to that function, and the inventory variants UI calls it for `draft`, `published`, and `archived`.
- `syncVariantAndPricing(...)` selects `InventoryVariant.status` and `deletedAt`, but does not use either value.
- `pricingArchived` is initialized and returned, but no code increments it or soft-archives matching `DykePricingSystem` rows.

Impact:
- Setting an inventory variant to `archived` can leave its legacy Dyke pricing rows active.
- Creating or publishing a variant through the status mutation can leave Dyke unsynced until another write path happens to queue sync.
- This violates Pending 01's create/update/delete/archive projection goal and the handoff's requirement that relevant inventory writes queue `sync-inventory-to-dyke`.

Required fix:
- Queue inventory-to-Dyke sync from `updateVariantStatus(...)` for both update and create branches.
- Teach `syncVariantAndPricing(...)` to treat `variant.deletedAt` or `variant.status === "archived"` as an archive signal for related active `DykePricingSystem` rows.
- In compare mode, report the pending archive count without mutating.
- In sync mode, soft-archive matching Dyke pricing rows with `deletedAt = new Date()`.
- Do not hard-delete Dyke rows.
- Add focused tests for archived variant compare/sync behavior and the `updateVariantStatus(...)` queue call.

## Prior Findings Rechecked
- Pricing skips now route to `result.pricing.skipped`.
- Supplier pricing no longer creates from generated keys when the original legacy key is missing and no existing candidate matches.
- Category archive is preserved in `inventoryToDykeSyncResultSchema` and `result.category.archived`.
- Focused tests now use table-specific fake delegates and cover the earlier missed behaviors.

## Validation
- `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts` passed: 20 tests, 41 assertions.
- `git diff --check` passed.
- `bun run --filter @gnd/inventory typecheck` failed on known baseline issues:
  - `src/application/inbound/inbound-demand.ts`: `lineItemComponentIds` is not in `ReceiveInboundShipmentResult`.
  - several `bun:test` module/type declaration errors, including the new sync test file.
  - no remaining drift-report `uid: { not: null }` errors appeared.

## Fix Handoff
- `brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md`

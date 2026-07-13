# Fix Handoff: Pending 01 Inventory To Dyke Variant Archive Gap

Created: 2026-06-12 10:14 WAT

## Mission
Complete the remaining blocker for Pending 01: `Full inventory-to-Dyke sync for create/update/delete/archive`.

Do not redo the inventory-to-Dyke sync implementation. The current worktree already fixes the earlier pricing skip, supplier key, category archive result, and test coverage findings. This fix is only about variant status/archive projection and queue wiring.

## Read First
1. `brain/reviews/2026-06-12-inventory-to-dyke-sync-pending-01-review.md`
2. `brain/handoffs/inventory-to-dyke-sync-handoff.md`
3. `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
4. `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`
5. `packages/inventory/src/application/sync/inventory-to-dyke-sync-job.ts`
6. `packages/inventory/src/inventory.ts`
7. `apps/api/src/trpc/routers/inventories.route.ts`

## Current Known Good State
- `sync-inventory-to-dyke` task exists.
- `queueInventoryToDykeSync(...)` exists and ignores empty payloads.
- Category create/update/archive logic exists.
- Product create/update/archive logic exists.
- Generic pricing uses `InventoryVariant.uid` as `DykePricingSystem.dependenciesUid`.
- Supplier pricing preserves original legacy supplier pricing keys and skips unsafe generated-key creates.
- Pricing skips are returned under `pricing.skipped`.
- Category archive is returned under `category.archived`.
- Focused sync tests currently pass.

## Blocking Gap
`updateVariantStatus(...)` can update or create inventory variants from the live API/UI path, but it does not enqueue inventory-to-Dyke sync.

Also, `syncVariantAndPricing(...)` reads `variant.status` and `variant.deletedAt`, but does not use them. `pricingArchived` is returned but never incremented. This means archived inventory variants can leave active `DykePricingSystem` rows visible to legacy Dyke readers.

## Required Behavior

### 1. Queue from `updateVariantStatus(...)`
File:
- `packages/inventory/src/inventory.ts`

Requirements:
- After updating an existing variant status, call:
  - `queueInventoryToDykeSync({ inventoryId: data.inventoryId, inventoryVariantId: data.variantId, source: "variant-form" }).catch(() => {})`
- After creating a new variant in the no-`variantId` branch, capture the created variant row and queue sync with the created id.
- Preserve the existing API return behavior unless there is a strong local reason to improve it.
- Do not make this request path wait for Trigger job completion.

Guard rails:
- Do not queue when there is no usable inventory id and no variant id.
- Do not move this logic into the API router; keep inventory-domain write paths responsible for sync.
- Do not add app-level imports to `@gnd/inventory`.

### 2. Archive Dyke pricing when an inventory variant is archived/deleted
File:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`

Requirements:
- In `syncVariantAndPricing(...)`, after resolving `parentStep` and `productUid`, detect:
  - `variant.deletedAt != null`
  - or `variant.status === "archived"`
- For archived/deleted variants, find active `DykePricingSystem` rows scoped to:
  - `dykeStepId = parentStep.id`
  - `stepProductUid = productUid`
  - `dependenciesUid = variant.uid` for generic pricing
  - supplier candidate keys for supplier-specific rows, where safely known
  - `deletedAt: null`
- In compare mode:
  - do not write
  - return the count under `result.pricing.archived`
- In sync mode:
  - soft-archive matching rows by setting `deletedAt = new Date()`
  - return the number of rows archived under `result.pricing.archived`

Supplier-specific archive guidance:
- Prefer exact `supplierVariant.meta.pricingKey` when present.
- Also include generated legacy supplier candidate keys only for matching existing rows, not for creation.
- If supplier identity is too incomplete to build candidate keys, skip supplier-specific archive for that supplier variant with a structured pricing skip such as `missing_supplier_pricing_identity_for_archive`.
- Never hard-delete.
- Never create pricing rows for archived/deleted variants.

Guard rails:
- Do not archive the whole product's pricing bucket just because one variant is archived.
- Do not use `Inventory.uid` as the variant dependency key unless it is also the actual `variant.uid`.
- Do not silently archive ambiguous or unrelated rows.
- Keep sync idempotent: repeated archive sync should report zero new active rows once already archived.
- Keep compare mode write-free.

### 3. Avoid syncing draft variants into active legacy pricing
Decision rule:
- `status === "archived"` must archive.
- `deletedAt` must archive.
- `status === "draft"` should not create or update active Dyke pricing. Skip with a structured reason such as `variant_not_published` unless existing local rules clearly require draft variants in Dyke.
- `status === "published"` may create/update pricing as the current implementation does.

If you find legacy sales explicitly depends on draft variant prices being visible in Dyke, document that evidence in the review notes and keep the behavior, but still handle `archived` and `deletedAt`.

## Tests To Add
File:
- `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`

Add focused tests using the existing fake delegate style:
- `syncInventoryToDyke` compare mode reports `pricing.archived` for an archived variant without calling `updateMany`.
- `syncInventoryToDyke` sync mode soft-archives active generic pricing for `dependenciesUid = variant.uid`.
- archived variant does not create new pricing rows.
- draft variant does not create/update active pricing unless you document a legacy reason.
- supplier pricing archive uses preserved `meta.pricingKey` when present.
- `updateVariantStatus(...)` update branch queues `sync-inventory-to-dyke`.
- `updateVariantStatus(...)` create branch queues with the created variant id.

You may need to mock `@trigger.dev/sdk/v3` the same way existing queue tests do.

## Suggested Validation
Run:
```sh
bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts
git diff --check
bun run --filter @gnd/inventory typecheck
```

Expected typecheck note:
- The package typecheck may still fail on existing baseline `bun:test` declaration errors and `inbound-demand.ts`.
- Report whether any new errors mention the touched sync/inventory files.

## Completion Criteria
- `updateVariantStatus(...)` queues inventory-to-Dyke sync for update and create branches.
- Archived/deleted inventory variants soft-archive matching Dyke pricing rows.
- Draft variants do not publish active Dyke pricing unless explicitly justified.
- Compare mode reports archives without writes.
- Sync mode is idempotent.
- Focused tests pass.
- Brain progress is updated with what was fixed and any remaining validation caveats.

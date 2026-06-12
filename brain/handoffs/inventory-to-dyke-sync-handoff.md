# Handoff: Inventory To Dyke Sync

## Purpose
Build the first missing pending task from `brain/features/inventory-backed-sales-fulfillment.md`: full inventory-to-Dyke create/update/delete/archive sync.

The goal is to let inventory become the operational write source while Dyke remains supported as a compatibility projection for legacy sales form, legacy print, and any old workflows still reading Dyke tables.

## Read First
1. `brain/features/inventory-backed-sales-fulfillment.md`
2. `brain/database/schema.md`
3. `brain/tasks/in-progress.md`
4. `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
5. `packages/inventory/src/application/sync/inventory-update-from-dyke.ts`
6. `packages/inventory/src/application/sync/dyke-inventory-drift-report.ts`
7. `packages/inventory/src/inventory.ts`
8. `apps/api/src/trpc/routers/inventories.route.ts`
9. `packages/jobs/src/schema.ts`
10. `packages/jobs/src/tasks/inventory/sync-dyke-step-to-inventory.ts`

## Current State
- Dyke-to-inventory sync/import exists and is active:
  - `inventoryUpdateFromDyke(...)`
  - Trigger task `sync-dyke-step-to-inventory`
  - full import jobs
  - active-scope resolver based on sales settings
- Active Dyke custom component writes now go through inventory-domain services and then queue Dyke-to-inventory sync.
- Inventory-to-Dyke exists only as a small helper:
  - `dykeUpdateFromInventory(...)`
  - updates existing `DykeSteps.title` by `InventoryCategory.uid`
  - updates existing `DykeStepProducts.name/img` by `Inventory.uid`
  - no create semantics
  - no variant sync
  - no price sync
  - no supplier price sync
  - no delete/archive policy
  - no job wrapper
  - no dry-run/repair
- Current drift report is structural only:
  - checks Dyke component UID missing inventory/variant
  - does not compare inventory-origin rows, titles, images, statuses, variants, prices, supplier prices, or stale/deleted rows
- Inventory write paths are mostly in `packages/inventory/src/inventory.ts`:
  - `saveInventoryCategoryForm`
  - `saveInventory`
  - `saveVariantForm`
  - `updateVariantCost`
  - `saveSupplierVariantForm`
  - `deleteInventories`
  - `deleteInventoryCategory`
- Inventory variant pricing currently updates inventory only:
  - `updateVariantCost(...)` writes `InventoryVariantPricing` and `InventoryVariantPricingHistory`
  - it does not write `DykePricingSystem`

## Current Implementation Attempt Status
An implementation attempt was completed after this handoff was first written. Do not restart from the old baseline. Review and fix the existing worktree changes.

Files currently touched by the attempted implementation:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- `packages/inventory/src/application/sync/dyke-inventory-drift-report.ts`
- `packages/inventory/src/application/sync/inventory-to-dyke-sync-job.ts`
- `packages/inventory/src/application/sync/index.ts`
- `packages/inventory/src/inventory.ts`
- `packages/inventory/src/schema.ts`
- `packages/jobs/src/schema.ts`
- `packages/jobs/src/tasks/inventory/sync-inventory-to-dyke.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`

What the attempt already added:
- `syncInventoryToDyke(...)` service with category/product/pricing sections.
- `queueInventoryToDykeSync(...)` helper in the inventory package.
- Trigger task `sync-inventory-to-dyke`.
- zod payload/result contracts in inventory and jobs schemas.
- queue calls from inventory/category/variant/price/supplier/delete write paths.
- protected API endpoints for compare and queue.
- expanded drift report fields for inventory-origin drift.

Do not duplicate those pieces. Fix them.

## Required Fix Pass From Review
The first review found these blocking issues. Treat this section as the next task's priority list.

### 1. Fix Typecheck Failure In Drift Report
Files:
- `packages/inventory/src/application/sync/dyke-inventory-drift-report.ts`

Problem:
- The attempted implementation uses `uid: { not: null }` for `InventoryCategory.uid` and `Inventory.uid`.
- In Prisma, those fields are non-null strings, so `bun run --filter @gnd/inventory typecheck` fails with:
  - `dyke-inventory-drift-report.ts(62,14): Type 'null' is not assignable...`
  - `dyke-inventory-drift-report.ts(112,14): Type 'null' is not assignable...`

Fix rule:
- Remove `uid: { not: null }` from non-null UID fields.
- If an empty-string guard is needed, filter rows in TypeScript with `String(uid || "").trim()` or use a valid Prisma string filter such as `not: ""` only if supported by the generated client type.
- This is a mechanical P1 fix and should be done first because it blocks validation.

### 2. Fix Generic Pricing Identity Mapping
Files:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- importer reference: `packages/inventory/src/application/import/strategies/optimized-importer.ts`
- supplier/parser reference: `packages/inventory/src/application/suppliers/suppliers.ts`

Problem:
- The attempted sync treats generic pricing as `dependenciesUid === productUid`.
- Existing import logic creates `InventoryVariant.uid` from `DykePricingSystem.dependenciesUid`.
- For width/height, door, HPT, and attribute variants, the actual Dyke pricing identity is the variant UID/dependency key, not always the product UID.
- Updating or creating `dependenciesUid = productUid` can update the wrong row, create a duplicate generic row, or skip an actually valid row as ambiguous.

Correct mapping rule:
- `stepProductUid` should be the Dyke component/product UID.
- Generic price row identity should use the inventory variant UID/dependency UID, not blindly the product UID.
- For a simple no-attribute variant, `variant.uid` may equal `productUid`; that is the only case where `dependenciesUid = productUid` is acceptable.
- For attribute variants, use `variant.uid` as the target `dependenciesUid`.
- If multiple active `DykePricingSystem` rows match the same `dykeStepId + stepProductUid + dependenciesUid`, skip with `ambiguous_generic_pricing_match`.
- If no row exists and the mapping identity is complete, create one with:
  - `dykeStepId`
  - `stepProductUid = productUid`
  - `dependenciesUid = variant.uid`
  - `price = InventoryVariantPricing.price ?? costPrice`
- If identity is incomplete, skip with `missing_dyke_pricing_identity`.

Guard rail:
- Do not use `Inventory.uid` as the dependency key for all variants.
- Do not collapse all variants of a product into one product-level price.

### 3. Fix Supplier-Specific Pricing Identity
Files:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- reference: `packages/inventory/src/application/suppliers/suppliers.ts`

Problem:
- The attempted sync always writes supplier pricing as `dependenciesUid = productUid-supplierUid`.
- Existing supplier pricing key support includes:
  - `supplierUid`
  - `size & supplierUid`
  - `supplierUid-size`
  - `size-supplierUid`
  - `[supplierUid, ...depValues].join("-")`
  - `[...depValues, supplierUid].join("-")`
- The importer preserves supplier-key meaning through `parseDykeSupplierPricingKey(...)` and supplier variant metadata. The attempted sync ignores that and can create duplicate rows that legacy sales does not read.

Correct mapping rule:
- Prefer an exact original legacy pricing key if it is available on supplier variant metadata.
- If original key is not available, generate candidate keys using `buildLegacyDoorSupplierPricingKeys(...)`.
- Search active `DykePricingSystem` rows scoped by:
  - `dykeStepId`
  - `stepProductUid`
  - candidate `dependenciesUid`
  - `deletedAt: null`
- If exactly one row matches, update that row.
- If zero rows match but the original pricing key is known, create using that known key.
- If zero rows match and only generated candidates exist, skip unless the mapping is unambiguous and business-safe.
- If more than one row matches, skip with `ambiguous_supplier_pricing_match`.

Guard rail:
- Supplier-specific prices must never be written into generic buckets.
- Do not invent a new supplier key format unless all legacy readers are updated. Legacy readers already understand the key formats above.

### 4. Add Category Archive/Delete Sync
Files:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- write path reference: `packages/inventory/src/inventory.ts`

Problem:
- `deleteInventoryCategory(...)` now queues inventory-to-Dyke sync, but `syncCategory(...)` does not select `deletedAt` and does not archive the matching `DykeSteps` row.
- A deleted inventory category can leave the legacy Dyke step active.

Fix rule:
- Load `InventoryCategory.deletedAt`.
- If the category is deleted/archived and a matching active `DykeSteps` row exists, set `DykeSteps.deletedAt = new Date()` in sync mode.
- In compare mode, count/report the pending archive without mutating.
- Do not hard-delete Dyke steps.
- Consider whether child products should be archived separately; if uncertain, skip/report children instead of cascading silently.

### 5. Fix Drift Report Step/Category Filter Semantics
Files:
- `packages/inventory/src/application/sync/dyke-inventory-drift-report.ts`

Problem:
- The attempted drift report treats `input.stepId` as:
  - `DykeStepProducts.dykeStepId`
  - `InventoryCategory.id`
  - `Inventory.inventoryCategoryId`
- Dyke step IDs and inventory category IDs are different tables and are not guaranteed to match.

Correct filter rule:
- If the input is a Dyke step ID, first resolve the Dyke step UID.
- Use that UID to filter inventory categories by `InventoryCategory.uid` or inventory source fields such as `sourceStepUid`.
- If the input is intended to be inventory category ID, add a separate explicit schema field such as `inventoryCategoryId`; do not overload `stepId`.
- Keep the existing API contract stable unless all callers are updated.

### 6. Add Focused Tests For The Fixes
No focused tests were found for the attempted implementation.

Add or update tests that prove:
- drift report compiles and handles non-null UID fields without invalid Prisma filters
- generic price sync updates `dependenciesUid = variant.uid`, not always `productUid`
- simple product-level pricing still works when `variant.uid === productUid`
- supplier price sync preserves known legacy supplier pricing key formats
- ambiguous generic/supplier price matches skip with structured reasons
- category delete queues and sync soft-archives the Dyke step
- compare mode performs no writes
- queue helper triggers `sync-inventory-to-dyke` and ignores empty payloads

Prefer focused package tests over full workspace tests.

## Required Fix Pass From Second Review
After the first fix attempt, the review found four remaining issues. Treat this section as the current next task. Do not redo fixed work unless needed to solve these items.

### A. Pricing Skips Are Returned Under The Wrong Result Section
Files:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- `packages/inventory/src/schema.ts`

Problem:
- `syncVariantAndPricing(...)` currently pushes all skip reasons into one shared `skipped` array.
- The function returns that array under `variants.skipped`.
- It returns `pricing.skipped: []`.
- This means supplier/generic pricing failures such as `ambiguous_supplier_pricing_match`, `supplier_variant_no_price`, and `ambiguous_generic_pricing_match` do not appear in `result.pricing.skipped`, where operators/API consumers will look for pricing failures.

Fix rule:
- Keep separate skip arrays:
  - `variantSkips` for variant entity failures.
  - `pricingSkips` for pricing entity failures.
- Every skip with `entity: "pricing"` must end up in `result.pricing.skipped`.
- Every skip with `entity: "variant"` must end up in `result.variants.skipped`.
- Add a focused test that creates a pricing skip and asserts it appears in `pricing.skipped`, not `variants.skipped`.

### B. Supplier Pricing Still Creates From Guessed Generated Keys
Files:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- reference: `packages/inventory/src/application/suppliers/suppliers.ts`

Problem:
- The current code uses `const keyToUse = originalKey ?? candidateKeys[0]`.
- If supplier variant metadata has no preserved `pricingKey`, the sync may create a new `DykePricingSystem` row from a generated candidate key.
- That violates the guard rail: do not invent a supplier key format or create a row that legacy sales may not read.
- The current matching also does not include `originalKey` in the candidate set before checking existing rows. A preserved original row can exist but be missed if `buildLegacyDoorSupplierPricingKeys(...)` did not regenerate it exactly.

Fix rule:
- Build a de-duplicated candidate list that includes `originalKey` first when present, followed by generated legacy keys.
- Use that full list only to find existing active rows.
- If exactly one existing row matches, update it.
- If multiple rows match, skip with `ambiguous_supplier_pricing_match`.
- If zero rows match and `originalKey` exists, create using `originalKey`.
- If zero rows match and `originalKey` is missing, skip with a structured reason such as `missing_original_supplier_pricing_key`.
- Do not create from `candidateKeys[0]` when `originalKey` is missing.
- Add tests for:
  - original key is included in matching.
  - no original key + no existing row skips instead of creating.
  - ambiguous multiple candidate matches skip.

### C. Category Archive Count Is Discarded
Files:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- `packages/inventory/src/schema.ts`
- any API consumers/tests that assert result shape

Problem:
- `syncCategory(...)` now calculates `archived`.
- `syncInventoryToDyke(...)` discards it when assigning `result.category`.
- `inventoryToDykeSyncResultSchema.category` does not include `archived`.
- Compare mode cannot report that a category would soft-archive a Dyke step.

Fix rule:
- Add `archived: number` to `inventoryToDykeSyncResultSchema.category`.
- Add `archived: 0` to the default category result.
- Preserve `catResult.archived` in `syncInventoryToDyke(...)`.
- Add a focused compare-mode test where a deleted inventory category with an active Dyke step returns `category.archived === 1` and performs no update.
- Add a sync-mode test where the same case updates `DykeSteps.deletedAt`.

### D. New Tests Do Not Actually Exercise The Sync Logic
Files:
- `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`

Problem:
- The test mock DB uses `store[args._table]`.
- Prisma-style calls do not pass `_table`, so the fake delegates return empty data.
- The tests pass without proving:
  - generic pricing writes `dependenciesUid = variant.uid`
  - supplier pricing preserves/uses original legacy key
  - supplier pricing skips when original key is missing and no existing row matches
  - pricing skips are returned under `pricing.skipped`
  - category archive compare/sync behavior works

Fix rule:
- Replace the generic proxy mock with table-specific delegates or small per-test fake delegates.
- Each test should seed the exact rows that the service reads and spy on the exact writes that should or should not happen.
- Required focused tests:
  - generic pricing exact match updates row where `dependenciesUid === InventoryVariant.uid`
  - generic pricing create uses `dependenciesUid = InventoryVariant.uid`
  - supplier pricing exact original key updates existing row
  - supplier pricing missing original key with no existing row skips and does not create
  - pricing skip appears in `result.pricing.skipped`
  - category delete compare returns archive count and does not mutate
  - category delete sync soft-archives matching `DykeSteps`

Validation after these fixes:
- `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`
- `git diff --check`
- `bun run --filter @gnd/inventory typecheck`

Known validation state after second review:
- Focused sync test currently passes, but coverage is insufficient because the DB mock does not exercise real service paths.
- `git diff --check` passes.
- `bun run --filter @gnd/inventory typecheck` no longer shows the old drift-report `uid: { not: null }` errors.
- Typecheck still has baseline failures: inbound result shape and `bun:test` type declarations for existing/new tests.

## Target Outcome
Inventory create/update/delete/archive changes should be projected into the equivalent Dyke rows in an idempotent, inspectable, retry-safe way.

At the end of this task:
- inventory category create/update can create/update equivalent `DykeSteps`
- inventory item create/update can create/update equivalent `DykeStepProducts`
- inventory variant create/update can create/update equivalent Dyke variant/pricing rows where mapping is unambiguous
- inventory delete/archive can soft-delete/archive equivalent Dyke rows using an explicit policy
- inventory variant price updates can update equivalent Dyke pricing rows or return a skipped reason when ambiguous
- operator can run dry-run drift/repair before mutation
- existing Dyke-to-inventory importer is not broken
- legacy sales form and print continue to work

## Non-Goals
- Do not replace Dyke-to-inventory import in this task.
- Do not switch all sales/print/dispatch source-of-truth behavior in this task.
- Do not add inventory dispatch mode here.
- Do not add production lifecycle bridging here.
- Do not add a broad UI redesign here.
- Do not hard-delete Dyke rows.
- Do not silently overwrite ambiguous Dyke pricing rows.

## Critical Guard Rails
1. Preserve legacy compatibility. Old sales form, existing Dyke print, and existing Dyke settings must continue to read expected Dyke rows.
2. Prefer soft-delete/archive over destructive deletion. Never hard-delete Dyke data for this migration.
3. Add dry-run first. Every repair/sync operation that can touch many rows needs a compare/dry-run mode before mutation mode.
4. Idempotency is mandatory. Running the same sync twice must not duplicate Dyke steps, products, variants, or pricing rows.
5. Ambiguity must skip, not guess. If an inventory variant cannot be mapped to exactly one Dyke pricing identity, return a structured skipped reason and surface it in drift/reporting.
6. Keep direction explicit. Existing `inventoryUpdateFromDyke` is Dyke -> inventory. New work should be named Inventory -> Dyke, for example `syncInventoryToDyke`.
7. Do not overload stock status. This task is definition/pricing sync, not stock allocation or fulfillment status sync.
8. Avoid broad refactors. Keep changes scoped to sync services, job schema/task wiring, router endpoint, focused tests, and minimal operator feedback.
9. Use typed schemas. Add zod schemas in `packages/jobs/src/schema.ts` and `packages/inventory/src/schema.ts` instead of passing loose objects.
10. Keep source labels intact. Do not wipe `Inventory.sourceStepUid`, `sourceComponentUid`, `sourceCustom`, `productKind`, or `stockMode` semantics while syncing.
11. Watch package boundaries. Inventory package services can depend on `@gnd/db`; avoid importing app UI/API concerns into package code.
12. Validate with targeted tests. Do not rely on full workspace typecheck alone; it has unrelated baseline noise.

## Recommended Implementation Shape

### 1. Define Contracts
Add inventory-to-Dyke contract types in the inventory package and job schema.

Suggested payload:
```ts
{
  inventoryCategoryId?: number | null;
  inventoryId?: number | null;
  inventoryVariantId?: number | null;
  mode: "compare" | "sync";
  source: "inventory-form" | "category-form" | "variant-form" | "variant-price" | "supplier-variant" | "repair";
  triggeredByUserId?: number | null;
}
```

Suggested result shape:
```ts
{
  mode: "compare" | "sync";
  source: string;
  category: { created: number; updated: number; skipped: SyncSkip[] };
  products: { created: number; updated: number; archived: number; skipped: SyncSkip[] };
  variants: { created: number; updated: number; archived: number; skipped: SyncSkip[] };
  pricing: { created: number; updated: number; archived: number; skipped: SyncSkip[] };
}
```

`SyncSkip` should include:
```ts
{
  entity: "category" | "product" | "variant" | "pricing";
  inventoryId?: number | null;
  inventoryVariantId?: number | null;
  uid?: string | null;
  reason: string;
}
```

### 2. Extend `dykeUpdateFromInventory` Into A Real Service
Keep the existing export name only if that avoids churn, but internally split into pure helpers.

Suggested file structure:
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- optional helpers in `packages/inventory/src/application/sync/inventory-to-dyke-mapping.ts`
- optional tests alongside the service

Minimum helpers:
- load inventory category with category attributes
- load inventory item with source UIDs, images, category, variants, pricing, supplier variants
- resolve Dyke step identity
- resolve Dyke product identity
- resolve Dyke variant/pricing identity
- apply category sync
- apply product sync
- apply variant sync
- apply price sync
- apply archive sync

### 3. Category Sync
For an inventory category:
- match `DykeSteps` by `InventoryCategory.uid`
- if missing and mode is `sync`, create Dyke step with stable `uid`
- update title/status-like fields that are known safe
- do not guess fields that Dyke requires but inventory does not own
- if required Dyke fields are unknown, skip create with reason such as `missing_required_dyke_step_defaults`

Important: create support may need more Dyke defaults. If the Dyke model requires route/order fields that cannot be safely derived, implement compare/report first and create only after defaults are confirmed.

### 4. Product Sync
For an inventory item:
- match `DykeStepProducts` by `Inventory.uid` or `Inventory.sourceComponentUid`
- use `Inventory.inventoryCategory.uid` / `sourceStepUid` to find the parent step
- update safe fields:
  - name/title
  - image
  - status/deletedAt if policy allows
- create missing Dyke product only if parent step identity is unambiguous
- for archive/delete:
  - set `deletedAt`
  - do not remove rows physically

### 5. Variant And Pricing Sync
This is the riskiest part. Do it behind explicit mapping and skipped reasons.

For each `InventoryVariant`:
- build a stable variant key from attributes and source metadata
- map to existing `DykePricingSystem` rows using:
  - inventory/source UIDs
  - parent step UID/id
  - product UID
  - variant attribute names/values
  - supplier UID when supplier-specific
- if exactly one match, update price
- if no match and enough identity exists, create price row
- if multiple matches, skip with `ambiguous_dyke_pricing_match`
- if no product/step identity, skip with `missing_dyke_product_identity`

Do not collapse supplier-specific prices into generic prices. Supplier pricing must stay supplier-specific.

Additional mandatory pricing guidance after review:
- For generic pricing, `DykePricingSystem.dependenciesUid` must come from the inventory variant UID/dependency key. It is not always the inventory product UID.
- For supplier pricing, preserve or reconstruct the legacy supplier pricing key. Do not always write `productUid-supplierUid`.
- If original supplier pricing metadata is missing, prefer a structured skip over creating a row that legacy sales cannot read.
- If adding metadata persistence is necessary, keep it scoped to supplier variant metadata and avoid schema migrations unless already required.

### 6. Queue Job
Add a new task instead of doing all sync inline from user mutations.

Files:
- `packages/jobs/src/schema.ts`
- `packages/jobs/src/tasks/inventory/sync-inventory-to-dyke.ts`
- task registry/export if needed

Suggested task name:
- `sync-inventory-to-dyke`

Queue settings:
- `maxDuration: 900`
- `concurrencyLimit: 4` or lower
- payload schema with compare/sync mode

Add queue helper in inventory package:
- `queueInventoryToDykeSync(...)`

Pattern to follow:
- `packages/inventory/src/application/sync/dyke-step-inventory-sync-job.ts`

### 7. Wire Write Paths
After core service and job exist, queue sync from:
- `saveInventoryCategoryForm`
- `saveInventory`
- `saveVariantForm`
- `updateVariantCost`
- `saveSupplierVariantForm`
- `deleteInventories`
- `deleteInventoryCategory`

Use source labels:
- category form -> `category-form`
- inventory form -> `inventory-form`
- variant form -> `variant-form`
- price form -> `variant-price`
- supplier variant form -> `supplier-variant`
- repair button/job -> `repair`

Do not block user save on long sync. Queue the job after the DB write succeeds. If queueing fails, log and return the save result unless product policy says otherwise.

### 8. Extend Drift Reporting
Current `getDykeInventoryDriftReport(...)` is too narrow. Extend or add a new report that covers inventory-origin rows.

Report categories:
- Dyke missing for inventory category
- Dyke missing for inventory product
- inventory missing for Dyke product
- title mismatch
- image mismatch
- status/deleted mismatch
- variant mismatch
- generic pricing mismatch
- supplier pricing mismatch
- ambiguous mapping
- stale custom/imported row

Return counts and sample rows. Keep it paged or scoped by step/category when possible.

### 9. API Surface
Add protected endpoints in `apps/api/src/trpc/routers/inventories.route.ts`:
- compare inventory-to-Dyke sync
- queue inventory-to-Dyke sync
- enhanced drift report

Do not expose mutation as public. Existing `dykeUpdateFromInventory` is public today; this new write path should be protected because it can mutate legacy operational definitions.

### 10. Minimal Operator UI
If UI is in scope for the implementation slice:
- add a button or panel to inventory import/control center or inventory review page
- show compare result first
- allow repair only after compare
- show synced/skipped/failed counts
- show skipped reasons

Do not build a large new UI before service/tests are stable.

## Validation Plan

### Unit Tests
Add tests for mapping helpers:
- category update by UID
- category create when missing and defaults are present
- product update by UID
- product create under matched Dyke step
- product archive sets `deletedAt`
- variant price update with exact match
- supplier variant price update with exact supplier UID match
- ambiguous pricing match skips
- missing parent step skips
- compare mode performs no writes
- repeated sync is idempotent

### Integration-Style Tests
Add focused package/API tests around:
- inventory save queues `sync-inventory-to-dyke`
- variant cost update queues `sync-inventory-to-dyke`
- supplier variant save queues `sync-inventory-to-dyke`
- delete/archive queues `sync-inventory-to-dyke`

### Manual/Browsing Checks
After code implementation:
- create inventory category and item, confirm equivalent Dyke rows appear after job
- update inventory item title/image, confirm old sales form sees new values
- update variant price, confirm Dyke pricing reflects it
- archive inventory item, confirm Dyke equivalent is soft-deleted/hidden
- run drift compare, confirm zero critical drift for touched sample

## Suggested Commands
Prefer focused tests first.

Likely useful commands:
```sh
bun test packages/inventory/src/application/sync
bun test packages/inventory/src/application/sync/dyke-step-inventory-sync-job.test.ts
bun test packages/inventory/src/inventory.test.ts
bun run --filter @gnd/inventory typecheck
```

Known validation state after the first attempt:
- `git diff --check` passed.
- `bun run --filter @gnd/inventory typecheck` failed partly because of new drift-report `uid: { not: null }` errors.
- The same new drift-report errors also appear when checking jobs because `@gnd/jobs` imports `@gnd/inventory`.
- There are unrelated baseline type errors in this repo; when reporting validation, separate new touched-file errors from existing baseline noise.

If touching API router:
```sh
bun run --filter @gnd/api typecheck
```

If touching web UI:
```sh
bun run --filter @gnd/www typecheck
```

Note: full workspace typechecks may have unrelated baseline failures. Capture focused output and grep for touched files when necessary.

## Known Traps
- `deleteSubComponent` in `packages/inventory/src/inventory.ts` currently sets `deletedAt: null`; do not copy that pattern blindly.
- `saveInventory` currently clears source labels (`sourceStepUid`, `sourceComponentUid`, `sourceCustom`) for manual inventory saves. Be careful not to destroy import/source identity needed for mapping.
- `updateVariantCost` has two code paths: existing variant and create-new variant. Both need sync/queue behavior.
- `saveVariantForm` and `updateVariantCost` are separate. Do not wire only one.
- Existing `dykeUpdateFromInventory` increments `categoryUpdated` even if `updateMany` matched zero rows. Fix result accuracy as part of the service rewrite.
- Existing Dyke-to-inventory sync skips steps outside active sales-settings scope. Inventory-to-Dyke sync needs its own policy; do not reuse the active-scope skip blindly if inventory is the source.
- Supplier-specific prices must not be written into generic Dyke pricing buckets.
- Generic prices must not all be written to `dependenciesUid = productUid`; imported variant pricing often uses `InventoryVariant.uid` as the Dyke dependency key.
- Existing supplier pricing keys are not one format. Use `parseDykeSupplierPricingKey(...)` and `buildLegacyDoorSupplierPricingKeys(...)` as the source of truth before updating/creating supplier-specific Dyke rows.
- `stepId` in `dykeInventoryDriftReportSchema` means Dyke step ID in existing callers. Do not reuse it as `InventoryCategory.id`.
- Ambiguous variant dimensions are common for doors/HPT. Skip and report instead of guessing.
- Avoid adding app imports into `@gnd/inventory`.
- Do not make long-running sync run synchronously in a request path.

## Recommended Next-Agent Skills
- `brain-task-manager`: keep task state synchronized in Brain.
- `diagnose`: use for mapping/pricing ambiguity investigation.
- `tdd`: write mapping and idempotency tests before mutation-heavy code.
- `fast-bun-monorepo-command-discipline`: keep Bun commands focused in this monorepo.

## Completion Criteria
- `sync-inventory-to-dyke` task exists and is queued from relevant inventory writes.
- Full service handles category/product create/update/archive.
- Variant/generic price sync is implemented with exact-match and skip-on-ambiguity behavior, using `InventoryVariant.uid` / dependency key for `dependenciesUid`.
- Supplier-specific price sync is implemented with preserved legacy key identity, or explicitly skipped with structured reasons if not safe yet.
- Category delete/archive soft-archives matching Dyke steps.
- Drift report includes inventory-origin missing/mismatch rows.
- Drift report step/category filters use correct Dyke step UID to inventory category mapping and do not overload IDs across tables.
- Compare mode exists and performs no writes.
- Idempotency tests pass.
- Focused tests cover the review fixes listed in `Required Fix Pass From Review`.
- Existing Dyke-to-inventory sync tests still pass.
- `bun run --filter @gnd/inventory typecheck` has no errors in touched inventory-to-Dyke/drift-report files; document any unrelated baseline failures separately.
- Brain updated with what landed and what remains.

Last updated: 2026-06-12

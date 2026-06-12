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
- Variant/generic price sync is implemented with exact-match and skip-on-ambiguity behavior.
- Supplier-specific price sync is implemented or explicitly skipped with structured reasons if not safe yet.
- Drift report includes inventory-origin missing/mismatch rows.
- Compare mode exists and performs no writes.
- Idempotency tests pass.
- Existing Dyke-to-inventory sync tests still pass.
- Brain updated with what landed and what remains.

Last updated: 2026-06-12

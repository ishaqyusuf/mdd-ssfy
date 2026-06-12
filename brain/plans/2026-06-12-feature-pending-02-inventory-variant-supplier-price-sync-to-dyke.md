# Plan: Inventory Pending 02 - Inventory Variant Supplier Price Sync To Dyke

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Sync inventory variant price and supplier-variant price updates back to legacy Dyke pricing rows while preserving legacy sales compatibility and avoiding guessed or ambiguous pricing writes.

## Current Context
Inventory is becoming the operational source for product definitions and pricing, while Dyke remains a compatibility projection for legacy sales form, legacy print, and older pricing readers.

Relevant Brain references:
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/handoffs/inventory-to-dyke-sync-handoff.md`
- `brain/tasks/roadmap.md`

Pending 01, full inventory-to-Dyke create/update/delete/archive sync, is the foundation. Pending 02 should build on its mapping helpers and fixes, especially the rules that:
- generic pricing identity is `DykePricingSystem.stepProductUid + dependenciesUid`
- `dependenciesUid` must use `InventoryVariant.uid` / dependency key, not always `Inventory.uid`
- supplier-specific pricing must preserve or exactly match legacy supplier pricing keys
- pricing skips must be returned under `result.pricing.skipped`

## Proposed Approach
Add or harden price-specific inventory-to-Dyke sync behavior for `InventoryVariantPricing` and `SupplierVariant` rows. The sync should update Dyke rows only when the mapping is stable, create rows only when the identity is explicitly known, and return structured skipped reasons for unsafe cases.

Do not invent new supplier key formats. Do not write supplier-specific prices into generic Dyke pricing buckets. Do not silently overwrite multiple matching rows.

## Implementation Steps
- Confirm Pending 01 pricing fixes are present or reuse the same mapping rules from `brain/handoffs/inventory-to-dyke-sync-handoff.md`.
- Extract or stabilize helper logic for resolving:
  - Dyke parent step from inventory category/source step UID
  - Dyke product/component UID from inventory/source component UID
  - generic dependency key from `InventoryVariant.uid`
  - supplier-specific dependency key from preserved `SupplierVariant.meta.pricingKey` or exact existing legacy row match
- Implement generic variant price sync:
  - update exact active row matching `dykeStepId + stepProductUid + dependenciesUid = InventoryVariant.uid`
  - create only when step/product/variant identity is complete and no active row exists
  - skip when multiple rows match
- Implement supplier-variant price sync:
  - include preserved `meta.pricingKey` first in the candidate key list
  - update exactly one active matching Dyke row
  - create only when `meta.pricingKey` is present and no active row exists
  - skip when `meta.pricingKey` is missing and no existing row uniquely matches
  - skip when multiple candidate rows match
- Wire sync from inventory price write paths:
  - `updateVariantCost`
  - `saveVariantForm`
  - `saveSupplierVariantForm`
- Ensure structured skip reasons are visible in API/job results:
  - `missing_dyke_pricing_identity`
  - `ambiguous_generic_pricing_match`
  - `missing_original_supplier_pricing_key`
  - `ambiguous_supplier_pricing_match`
  - `supplier_variant_no_price`
- Add or update drift reporting so pricing drift uses the same mapping rules as sync.

## Affected Files Or Areas
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- `packages/inventory/src/application/sync/dyke-inventory-drift-report.ts`
- `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`
- `packages/inventory/src/application/suppliers/suppliers.ts`
- `packages/inventory/src/inventory.ts`
- `packages/inventory/src/schema.ts`
- `packages/jobs/src/schema.ts`
- `packages/jobs/src/tasks/inventory/sync-inventory-to-dyke.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `DykePricingSystem`
- `InventoryVariantPricing`
- `SupplierVariant`

## Acceptance Criteria
- Generic inventory variant price changes update the correct active Dyke price row.
- Generic price creation uses `dependenciesUid = InventoryVariant.uid` and only runs when step/product/variant identity is complete.
- Supplier variant price changes update exactly one correct supplier-specific Dyke row when a preserved or exact legacy key exists.
- Supplier price creation only uses preserved `SupplierVariant.meta.pricingKey`; generated candidate keys are not used for creation.
- Ambiguous or missing pricing mappings skip with structured reasons under `result.pricing.skipped`.
- Legacy sales pricing continues to read expected Dyke keys.
- Compare mode reports intended pricing changes without mutating Dyke rows.

## Test Plan
- `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`
- Add table-specific seeded delegate tests that actually exercise:
  - generic pricing exact-match update
  - generic pricing create with `dependenciesUid = InventoryVariant.uid`
  - supplier pricing exact original-key update
  - supplier pricing create with preserved original key
  - supplier pricing missing original key skips and does not create
  - ambiguous generic/supplier matches skip
  - pricing skips appear in `result.pricing.skipped`, not `result.variants.skipped`
  - compare mode performs no writes
- `git diff --check`
- `bun run --filter @gnd/inventory typecheck`
- If typecheck fails from known baseline noise, report whether any touched inventory-to-Dyke/pricing files still fail.

## Brain Update Requirements
- Update `brain/progress.md` with what landed, validation results, and any remaining skipped/unsafe pricing cases.
- Update `brain/features/inventory-backed-sales-fulfillment.md` Pending/Phase status if variant and supplier price sync is completed.
- If supplier price creation policy changes, update or add a Brain decision under `brain/decisions/`.
- Do not create a lower-model handoff here; use `brain-handoff` after this plan is approved.

## Risks / Edge Cases
- Supplier pricing key formats are inconsistent and legacy readers depend on exact strings.
- Creating guessed supplier keys can produce Dyke rows legacy sales never reads.
- Multiple active Dyke pricing rows can match a candidate key.
- Some inventory and Dyke prices may intentionally diverge during migration.
- Pending 01 may still be under fix review; avoid duplicating or conflicting with its service code.

## Open Questions
- None. Current policy: do not create supplier-specific Dyke pricing rows without a preserved original `SupplierVariant.meta.pricingKey`; skip instead unless an existing active row uniquely matches.

## Linked Task
- Task Title: Inventory Pending 02 - Inventory Variant Supplier Price Sync To Dyke
- Task File: brain/tasks/roadmap.md

# Brain Fix Handoff: Pending 01 Test And Brain Update Completion

## Status
Ready

## Source Review
brain/reviews/2026-06-12-inventory-to-dyke-sync-pending-01-review-v3.md

## Original Handoff
brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md

## Source Plan
brain/features/inventory-backed-sales-fulfillment.md

## Queue Item
/Users/M1PRO/.codex/brain-project-manager/queues/handoffs/2026-06-12-gnd-pending-01-inventory-to-dyke-fix-1.json

## Goal
Finish the remaining proof and Brain-update gaps for Pending 01 without broadening the inventory-to-Dyke implementation.

## Fix Items
1. Add focused regression tests proving `updateVariantStatus(...)` queues `sync-inventory-to-dyke` after updating an existing variant.
2. Add focused regression tests proving `updateVariantStatus(...)` queues `sync-inventory-to-dyke` with the created variant id after creating a new variant.
3. Add or adjust a repeated archived-variant sync assertion so already-archived pricing rows are not counted again after active rows are gone, if this is not already covered by an existing test.
4. Update `brain/progress.md` with a new entry that reflects the implemented Pending 01 fix, tests/checks run, and remaining known typecheck caveats. Do not rewrite unrelated historical entries.
5. Fill completion notes in this fix handoff after implementation.

## Context To Read First
- brain/reviews/2026-06-12-inventory-to-dyke-sync-pending-01-review-v3.md
- brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md
- brain/features/inventory-backed-sales-fulfillment.md
- packages/inventory/src/inventory.ts
- packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts
- packages/inventory/src/application/sync/inventory-to-dyke-sync-job.ts
- brain/progress.md

## Acceptance Criteria
- Existing-variant `updateVariantStatus(...)` test proves `queueInventoryToDykeSync` / Trigger task is called with:
  - `inventoryId: data.inventoryId`
  - `inventoryVariantId: data.variantId`
  - `source: "variant-form"`
- Create-variant `updateVariantStatus(...)` test proves the queue payload uses the created variant id.
- Focused sync tests still pass.
- `git diff --check` passes.
- `brain/progress.md` has a fresh Pending 01 completion/fix entry with validation results and baseline caveats.

## Do Not Change
- Do not redesign inventory-to-Dyke sync.
- Do not move the task to done.
- Do not broaden into Pending 02 or other inventory roadmap work.
- Do not remove the existing archive/draft/supplier tests.

## Required Checks
- `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`
- `git diff --check`
- `bun run --filter @gnd/inventory typecheck` if feasible; report known baseline failures separately from any new failures.

## Brain Update Contract
- Update `brain/progress.md` with fix completion notes.
- Keep `brain/features/inventory-backed-sales-fulfillment.md` unchanged unless the fix changes documented behavior.
- Keep the task in `brain/tasks/in-progress.md`.

## Completion Notes
Fill this in after implementation:

- Changed files:
  - `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts` — added `updateVariantStatus` import and 3 new tests (update-branch queue, create-branch queue, archive idempotency)
  - `brain/progress.md` — added Pending 01 fix-2 completion entry under 2026-06-12
- Checks run:
  - `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts` — 29 tests / 65 assertions, 0 failures
  - `git diff --check` — clean
- Brain docs updated:
  - `brain/progress.md` — fresh Pending 01 fix completion entry with validation results and known baseline typecheck caveats
  - `brain/features/inventory-backed-sales-fulfillment.md` — unchanged (fix did not change documented behavior)
  - `brain/tasks/in-progress.md` — unchanged (task remains in-progress per contract)
- Unresolved issues:
  - `@gnd/inventory` typecheck still fails on known baseline issues: `bun:test` type declarations and `inbound-demand.ts: lineItemComponentIds` — no new errors from touched sync/inventory files

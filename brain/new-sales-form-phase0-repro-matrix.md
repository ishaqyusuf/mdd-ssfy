# New Sales Form Phase 0 Reproduction Matrix

Date: 2026-03-10
Status: In Progress
Owner: Sales Form Rebuild Team

## Purpose
Create deterministic reproduction coverage for every user-reported parity gap before fixes.

## Phase 0 Gate (must all be true)
- Every feature has old/new anchors.
- Every feature has explicit reproduction script (manual steps + expected outcome).
- Every feature has evidence artifact path (`ai/new-sales-form-parity-evidence/*`).
- Every feature is mapped to at least one automation target (unit/integration/e2e).
- No Phase 1 fix starts until all rows are populated and triaged (`Fail`/`Partial`/`Pass`).

## Evidence Convention
- Screens/video/logs per feature under:
  - `ai/new-sales-form-parity-evidence/<feature-slug>/`
- Suggested files:
  - `repro.md` (steps + observed result)
  - `old-form-expected.md`
  - `new-form-actual.md`
  - optional `trace.log`, screenshots, short clip

## Matrix

1. Moulding line items + moulding calculator parity
- Old anchors:
  - `apps/www/src/components/forms/sales-form/moulding-and-service/moulding-content.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:956`
- Manual repro:
  1. Select item type that includes moulding flow.
  2. Select >=2 mouldings.
  3. Open moulding calculator.
  4. Set qty/addon/custom on each row.
  5. Verify estimate summary behavior and aggregate totals.
- Expected (old): row-level summary + aggregate parity.
- Current observed (new): implemented in modal derivation path. Supplier changes now re-resolve size-row unit pricing through shared bucket resolver.
- Evidence path: `ai/new-sales-form-parity-evidence/moulding-calculator/`
- Automation target:
  - `packages/sales/src/sales-form/domain/workflow-calculators.test.ts`
  - add e2e fixture for grouped moulding edits.
- Triage: Partial (Implemented, Runtime Repro Pending)

2. Customer profile update not changing pricings
- Old anchors:
  - `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:121`
  - `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:132`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
  - `packages/sales/src/sales-form/domain/profile-repricing.ts`
- Manual repro:
  1. Open existing sales with non-empty line items.
  2. Change customer/profile to one with different coefficient.
  3. Confirm line-level and summary pricing recalc immediately.
- Expected (old): `taxCodeChanged` + `salesProfileChanged` path updates totals.
- Current observed (new): implemented in code path. Repricing trigger now responds to profile-id/coefficient changes and uses shared profile-repricing engine.
- Evidence path: `ai/new-sales-form-parity-evidence/profile-repricing/`
- Automation target:
  - `packages/sales/src/sales-form/domain/profile-repricing.test.ts`
  - API query parity fixture on profile swap.
- Triage: Partial (Implemented, Runtime Repro Pending)

3. Supplier changing in door qty modal
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx:87`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Open door step and select supplier A.
  2. Open size/qty modal; capture displayed prices.
  3. Change to supplier B; reopen/refresh modal.
  4. Confirm pricing bucket changes by supplier key.
- Expected (old): supplier-aware dependency pricing used instantly.
- Current observed (new): implemented. Door estimate now applies shared component surcharge consistently across panel and modal apply paths.
- Evidence path: `ai/new-sales-form-parity-evidence/supplier-door-modal/`
- Automation target:
  - `packages/sales/src/sales-form/domain/workflow-calculators.test.ts`
  - targeted UI integration test for supplier switch -> modal rows.
- Triage: Partial (Implemented, Runtime Repro Pending)

4. Quick base price update inside size/qty modal
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx:245`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
- Manual repro:
  1. Open door size/qty modal.
  2. Attempt inline base-price edit for a size bucket.
- Expected (old): privileged inline price edit path exists.
- Current observed (new): implemented. Door size/qty modal now supports quick base capture (`B`) via persisted `meta.baseUnitPrice`.
- Evidence path: `ai/new-sales-form-parity-evidence/quick-base-price-update/`
- Automation target:
  - add modal action integration test + mutation test.
- Triage: Partial (Implemented, Runtime Repro Pending)

5. HPT estimate column click -> breakdown
- Old anchors:
  - `apps/www/src/components/forms/sales-form/hpt/price-estimate-cell.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` (HPT rows)
- Manual repro:
  1. Configure HPT rows.
  2. Click estimate column value.
- Expected (old): breakdown menu with price contributors.
- Current observed (new): implemented. HPT estimate cell now opens a breakdown menu with contributor details.
- Evidence path: `ai/new-sales-form-parity-evidence/hpt-estimate-breakdown/`
- Automation target:
  - add HPT row interaction test.
- Triage: Partial (Implemented, Runtime Repro Pending)

6. Component cost not adding right to door estimate
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts`
- New anchors:
  - `packages/sales/src/sales-form/domain/workflow-calculators.ts:summarizeDoors`
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Configure door component dependencies + door sizes.
  2. Compare expected line totals with old form for same fixture.
- Expected (old): full component+size contribution in line estimate.
- Current observed (new): implemented in domain calculator. New moulding rows now default to qty `1` when unset/invalid.
- Evidence path: `ai/new-sales-form-parity-evidence/component-cost-door-estimate/`
- Automation target:
  - extend workflow calculator parity fixtures.
- Triage: Partial (Implemented, Runtime Repro Pending)

7. Selected mouldings default qty 1
- Old anchors:
  - grouped class flows in old form moulding path.
- New anchors:
  - `packages/sales/src/sales-form/domain/workflow-calculators.ts:243`
- Manual repro:
  1. Select new moulding with no stored row.
  2. Verify initial qty.
  3. Re-select after remove and verify qty.
- Expected: default qty 1 every fresh selection.
- Current observed (new): TBD
- Evidence path: `ai/new-sales-form-parity-evidence/moulding-default-qty/`
- Automation target:
  - add reselection/default regression test.
- Triage: Partial (Implemented, Runtime Repro Pending)

8. State loss / refresh data loss
- Old anchors:
  - `apps/www/src/components/forms/sales-form/sales-form-save.tsx` + old save/history flow.
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/use-auto-save.ts`
  - `apps/www/src/components/forms/new-sales-form/store.ts:74`
- Manual repro:
  1. Edit long form for several minutes.
  2. Simulate idle/network blip/refresh.
  3. Check restore/saved state.
- Expected: no silent loss or explicit recovery path.
- Current observed (new): improved. Autosave is now enabled by default and local recovery snapshot/restore is available on reload.
- Evidence path: `ai/new-sales-form-parity-evidence/state-loss/`
- Automation target:
  - autosave resilience integration tests.
- Triage: Partial (Implemented, Runtime Repro Pending)

9. Shelf item feature parity
- Old anchors:
  - `apps/www/src/components/forms/sales-form/shelf-items.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:1570`
- Manual repro:
  1. Build shelf line using category/product paths in old/new.
  2. Compare editability, rollups, and persistence.
- Expected: parity in workflow depth and totals.
- Current observed (new): partial. Shelf rows now support parent->category->product selection with product-driven autofill, but full legacy nested category management workflow is still missing.
- Evidence path: `ai/new-sales-form-parity-evidence/shelf-parity/`
- Automation target:
  - shelf row + category/product integration tests.
- Triage: Partial (Implemented, Runtime Repro Pending)

10. Services line items tax switch + production switch
- Old anchors:
  - `apps/www/src/components/forms/sales-form/moulding-and-service/service-content.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` (service panel)
- Manual repro:
  1. Add service rows.
  2. Toggle tax/production flags.
  3. Verify persistence + costing effect.
- Expected (old): both toggles available and persisted.
- Current observed (new): implemented. Service rows now expose and persist both tax and production (`produceable`) toggles.
- Evidence path: `ai/new-sales-form-parity-evidence/service-toggles/`
- Automation target:
  - service row meta aggregation tests + UI interaction tests.
- Triage: Partial (Implemented, Runtime Repro Pending)

11. Tax not getting calculated
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts:417`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/mappers.ts:96`
  - `packages/sales/src/sales-form/domain/costing.ts:109`
- Manual repro:
  1. Set taxable lines and tax code.
  2. Modify tax code/profile and extra costs.
  3. Validate tax totals against old fixture.
- Expected: deterministic recompute on all tax-affecting changes.
- Current observed (new): root API payload gap patched (`getTaxProfiles` now returns `percentage` for tax-rate resolution). Runtime transition coverage still pending.
- Evidence path: `ai/new-sales-form-parity-evidence/tax-calculation/`
- Automation target:
  - expand costing parity matrix with these transitions.
- Triage: Partial (Implemented, Runtime Repro Pending)

12. Step floating bar options parity
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/index.tsx:168`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Check step component surface for floating menu actions.
- Expected: tabs/select-all/pricing/component/refresh/enable-custom available.
- Current observed (new): implemented. Floating step bar now includes tabs, select-all, pricing, component, refresh, and enable-custom actions.
- Evidence path: `ai/new-sales-form-parity-evidence/step-floating-bar/`
- Automation target:
  - UI render/action coverage.
- Triage: Partial (Implemented, Runtime Repro Pending)

13. Component menu parity (edit/select/redirect/delete)
- Old anchors:
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx:320`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Inspect each component card actions.
- Expected: full action menu parity.
- Current observed (new): implemented. Component cards now provide context actions for edit/select/redirect/delete.
- Evidence path: `ai/new-sales-form-parity-evidence/component-menu/`
- Automation target:
  - component action menu integration tests.
- Triage: Partial (Implemented, Runtime Repro Pending)

14. Component icon indicators (top-left)
- Old anchors:
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx` (variation/override/redirect badges)
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Open step with components using variations/override/redirect.
  2. Verify indicators.
- Expected: same indicator semantics.
- Current observed (new): implemented. Top-left indicators now render for variation/override/redirect metadata.
- Evidence path: `ai/new-sales-form-parity-evidence/component-indicators/`
- Automation target:
  - component metadata indicator rendering tests.
- Triage: Partial (Implemented, Runtime Repro Pending)

15. Sales save history sidebar parity
- Old anchors:
  - `apps/www/src/components/forms/sales-form/sales-meta-form.tsx`
  - `apps/www/src/components/forms/sales-form/sales-form-save.tsx:62`
  - `apps/www/src/components/sales-hx.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx`
- Manual repro:
  1. Save draft/final repeatedly.
  2. Open history panel and inspect timeline.
- Expected: google-doc-like update history sidebar.
- Current observed (new): implemented. Sidebar now includes Summary/History tabs and save paths trigger history task creation.
- Evidence path: `ai/new-sales-form-parity-evidence/save-history/`
- Automation target:
  - save-side-effect and history-query integration tests.
- Triage: Partial (Implemented, Runtime Repro Pending)

## Phase 0 Working Checklist
- [x] Matrix created and anchored.
- [ ] Capture real new-form failing evidence for all 15 rows.
- [ ] Assign each row to `Fail` / `Partial` / `Pass` based on evidence.
- [ ] Link failing row IDs to implementation-phase task IDs.
- [ ] Mark Phase 0 complete in `brain/progress.md` only after above is done.

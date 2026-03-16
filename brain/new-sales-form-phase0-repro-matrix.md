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

16. Component edit parity
- Old anchors:
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx:320`
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-component-modal/step-component-modal.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:3734`
- Manual repro:
  1. Open a component card in editable mode.
  2. Trigger `Edit`.
  3. Modify editable fields and save/apply.
  4. Compare resulting behavior and persisted output against old form.
- Expected: edit flow matches old modal behavior and applies changes consistently.
- Current observed (new): field-reported parity gap; current edit dialog exists but behavior is not yet old-form equivalent.
- Evidence path: `ai/new-sales-form-parity-evidence/component-edit/`
- Automation target:
  - component edit integration test.
- Triage: Fail (User Reported)

17. Component image attachment in edit flow
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-component-modal/*`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:3734`
- Manual repro:
  1. Open component edit.
  2. Attempt to add or replace component image/attachment as in old flow.
- Expected: image attachment/update path available and persisted.
- Current observed (new): field-reported missing feature; no equivalent attachment path confirmed in new edit dialog.
- Evidence path: `ai/new-sales-form-parity-evidence/component-image-attachment/`
- Automation target:
  - component edit UI coverage + persistence integration.
- Triage: Fail (User Reported)

18. Redirect component route list parity
- Old anchors:
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx:343`
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class.ts:109`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:143`
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:3777`
- Manual repro:
  1. Open redirect menu/list for same component in old and new forms.
  2. Compare available routes and ordering.
- Expected: redirectable route list matches old-form semantics exactly.
- Current observed (new): implemented in code. Shared redirect-route derivation now mirrors legacy behavior by listing the full ordered step set without excluding the current step; runtime parity proof is still pending.
- Evidence path: `ai/new-sales-form-parity-evidence/component-redirect-routes/`
- Automation target:
  - redirect-route list derivation unit/integration test.
- Triage: Partial (Implemented, Runtime Repro Pending)

19. Door size inline base-cost edit parity
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx:245`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
- Manual repro:
  1. Open door size/qty modal.
  2. Attempt inline base-cost edit on a size row.
  3. Confirm UX, permission behavior, and persistence match old form.
- Expected: same inline price-edit affordance and save behavior as old modal.
- Current observed (new): field-reported mismatch; current implementation is not yet old-form equivalent.
- Evidence path: `ai/new-sales-form-parity-evidence/door-inline-base-cost/`
- Automation target:
  - door size modal edit interaction test.
- Triage: Fail (User Reported)

20. Component cost display should show calculated sales cost
- Old anchors:
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Open same component in old and new forms with dependency/profile-sensitive pricing.
  2. Compare displayed cost value.
- Expected: displayed component cost uses calculated sales cost, not raw base cost.
- Current observed (new): partially hardened in code. Component card/edit/quick-price paths now prefer resolved sales pricing and preserve explicit base-cost metadata; runtime parity evidence is still pending for dependency/profile-sensitive fixtures.
- Evidence path: `ai/new-sales-form-parity-evidence/component-sales-cost-display/`
- Automation target:
  - pricing-display integration test with dependency/profile fixture.
- Triage: Partial (Implemented, Runtime Repro Pending)

21. HPT add-size action broken
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:1410`
- Manual repro:
  1. Open HPT section for a door component.
  2. Click `Add Size`.
  3. Select an available size.
  4. Verify row is added and priced.
- Expected: selected size row is added immediately and works like old form.
- Current observed (new): implemented in code. HPT `Add Size` and door-size modal row derivation now use shared `deriveDoorSizeCandidates(...)`, including old-form-style `doorSizeVariation` width rules saved from the Door step controls modal; runtime proof is still pending.
- Evidence path: `ai/new-sales-form-parity-evidence/hpt-add-size/`
- Automation target:
  - `packages/sales/src/sales-form/domain/workflow-calculators.test.ts`
  - HPT add-size interaction test.
- Triage: Partial (Implemented, Runtime Repro Pending)

22. HPT section add-door option parity
- Old anchors:
  - `apps/www/src/components/forms/sales-form/hpt/*`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Manual repro:
  1. Open HPT section.
  2. Attempt to add a new door option/entry as in old form.
  3. Compare workflow and resulting rows.
- Expected: old-form add-door option flow exists and persists correctly.
- Current observed (new): implemented in code. HPT now provides an `Add Door Option` action that returns the user to the `Door` step to add another path; runtime parity evidence is still pending.
- Evidence path: `ai/new-sales-form-parity-evidence/hpt-add-door-option/`
- Automation target:
  - grouped HPT add-door integration test.
- Triage: Partial (Implemented, Runtime Repro Pending)

24. Door size variant control + filtering parity
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/component-section-footer.tsx`
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-modal/index.tsx`
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper.ts:365`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
  - `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
  - `packages/sales/src/sales-form/domain/workflow-calculators.ts`
- Manual repro:
  1. Open a Door step in the new form.
  2. Open `Controls` -> `Door Size Variant`.
  3. Add a variant group with a rule tied to another step and a width list.
  4. Save and reopen the door size modal and HPT `Add Size`.
  5. Confirm matching widths appear for the active height and non-matching widths do not.
- Expected (old): variant rules save on the Door step and filter visible sizes by active height + selected step components.
- Current observed (new): implemented in code. A redesigned `Door Size Variant` modal now reads and writes old-form-style `meta.doorSizeVariation`, persists updates back to step settings via `sales.updateStepMeta`, and the shared `deriveDoorSizeCandidates(...)` helper now falls back to configured route-step meta so both door modal and HPT size lists can use already-configured variants even when the line-step copy is empty.
- Evidence path: `ai/new-sales-form-parity-evidence/door-size-variants/`
- Automation target:
  - `packages/sales/src/sales-form/domain/workflow-calculators.test.ts`
  - `packages/sales/src/sales-form/domain/route-engine.test.ts`
  - targeted door modal/HPT interaction test.
- Triage: Partial (Implemented, Runtime Repro Pending)

23. Moulding calculator outside-click dismiss parity
- Old anchors:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/moulding-step/index.tsx`
- New anchors:
  - `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx:613`
- Manual repro:
  1. Open moulding calculator.
  2. Click outside the modal/dialog content.
  3. Compare close behavior in old and new forms.
- Expected: outside click dismiss behavior matches old form.
- Current observed (new): code review indicates the current modal already wires backdrop click to `onOpenChange(false)` and stops propagation on content; runtime parity evidence is still needed to confirm the reported mismatch path.
- Evidence path: `ai/new-sales-form-parity-evidence/moulding-outside-click-dismiss/`
- Automation target:
  - modal dismiss interaction test.
- Triage: Partial (Needs Runtime Verification)

## Phase 0 Working Checklist
- [x] Matrix created and anchored.
- [ ] Capture real new-form failing evidence for all 23 rows.
- [ ] Assign each row to `Fail` / `Partial` / `Pass` based on evidence.
- [ ] Link failing row IDs to implementation-phase task IDs.
- [ ] Mark Phase 0 complete in `brain/progress.md` only after above is done.

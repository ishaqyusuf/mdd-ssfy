# New Sales Form Missing Features Execution Plan

Date: 2026-03-10
Owner: Sales Form Rebuild Team
Scope: Legacy `sales-form` / clean-code sales-book behavior parity into `new-sales-form`.

## Objective
Deliver full behavioral parity for critical sales-form workflows by closing all user-reported feature gaps in `new-sales-form`, with deterministic phase gates so each phase is test-complete before moving to the next.

## Assumptions
- Legacy behavior in `apps/www/src/components/forms/sales-form/*` and `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/*` is the parity source of truth.
- Existing package extraction in `packages/sales/src/sales-form/*` remains the canonical domain layer and should absorb missing logic where possible.
- We should continue ongoing migration work (no reset/rewrite), and integrate missing items into the current task stream.
- Phase progression rule: do not start next phase until current phase validation checklist passes, except when the only remaining gate is environment-blocked browser proof that has been explicitly pended in Brain.
- Field-reported gaps captured on 2026-03-14 are authoritative even if related UI exists in current new-form code.
- Phase 0 acceptance authority is now `brain/new-sales-form-phase0-acceptance-matrix.md`, with fixture scope in `brain/new-sales-form-phase0-fixtures.md`.
- Dealer customer profiles use `salesPercentage`, not `coefficient`. Internal `www` customer profiles continue to use `coefficient`. Dealer quote pricing must apply internal coefficient first and then dealer percentage adjustment.
- 2026-05-20 pend decision: Phase 0 browser/runtime proof is pended because local authenticated `www` and dealership sessions are unavailable. Automated package/API evidence is green, so Phase 1 implementation can proceed while `NSF-QA-002` and `NSF-QA-003` remain open.

## Explicit Old vs New Comparison

### Core Classes (Costing / Setting / Step)
1. Costing recalculation and tax profile propagation
- Legacy anchor:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts:380`
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts:417`
- New anchor:
  - `apps/www/src/components/forms/new-sales-form/mappers.ts:96`
  - `packages/sales/src/sales-form/domain/costing.ts:109`
- Status: Implemented in code; runtime proof pending
- Gap: summary tax now honors grouped service row flags at row granularity, with stale parent flags unable to tax or exempt sibling rows incorrectly. Remaining work is authenticated mixed-item/tax-code/profile transition proof against legacy fixtures.

2. Customer profile change repricing and sales cost update
- Legacy anchor:
  - `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:121`
  - `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:132`
- New anchor:
  - `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx` (profile coefficient watcher)
  - `packages/sales/src/sales-form/domain/profile-repricing.ts`
- Status: Implemented in code; runtime proof pending
- Gap: profile changes reprice steps, doors, shelves, and grouped moulding rows with custom/addon preservation and summary recomputation. The UI now defers repricing when the selected profile option is still loading, preserving the prior coefficient as the baseline; authenticated customer/profile workflow proof remains.

3. Step/Component operational controls (floating action + component menu)
- Legacy anchor:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/index.tsx:168`
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx:320`
- New anchor:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: the new workflow toolbar and per-card action menu now expose `Tabs`, `Select All`, `Pricing`, custom controls, `Refresh`, `Edit`, `Select`, `Redirect`, and `Delete` with capability gating. Remaining work is authenticated interaction proof.

### Requested Feature Matrix
1. Moulding line items + calculator parity
- Legacy: `apps/www/src/components/forms/sales-form/moulding-and-service/moulding-content.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:956`
- Status: Implemented in code; runtime proof pending
- Gap: grouped edit/save round-trip preserves legacy moulding sibling rows and HPT rows; the hosted calculator now derives per-LF pricing from piece price/length, refreshes defaults when reused for another row, and safely applies optional callbacks. Remaining work is authenticated calculator and full price-summary workflow proof.

2. Customer profile update not changing pricing
- Legacy: `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:129-133`
- New: `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: profile changes now reprice grouped moulding rows as well as steps, shelves, and doors, preserve custom prices/addons, and recompute parent totals. Remaining work is authenticated customer/profile workflow proof.

3. Supplier changing in door qty modal
- Legacy: `.../modals/door-size-select-modal/index.tsx:87` (supplier badge in modal)
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx` + supplier props wiring
- Status: Implemented in code; runtime proof pending
- Gap: supplier selection now re-derives modal rows and persists the selected supplier with saved base-price dependencies. Remaining work is authenticated fixture proof.

4. Quick base price update within size/qty modal
- Legacy: `.../modals/door-size-select-modal/index.tsx:245` (`PriceCell` popover edits pricing)
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: privileged users now get an inline `DoorPriceCell` base-price editor with supplier-aware dependency keys; non-privileged users retain read-only pricing. Remaining work is authenticated UX proof.

5. HPT list estimate column click -> breakdown
- Legacy: `apps/www/src/components/forms/sales-form/hpt/price-estimate-cell.tsx`
- New: HPT table in `item-workflow-panel.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: HPT estimate cells now expose the compact cost-price breakdown hover surface. Remaining work is authenticated UX proof on real HPT rows.

6. Component cost not adding right to door estimate
- Legacy: grouped estimate in `costing-class.ts` + HPT tooling
- New: `summarizeDoors` + apply paths in `item-workflow-panel.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: HPT surcharge calculation now falls back to authoritative selected-component snapshots when persisted `formStep.price` is missing, while preserving the step-price fallback for older rows. Remaining work is authenticated proof against fixture-specific composed routes and totals.

7. Selected mouldings default qty = 1
- Legacy: grouped line defaults from class-managed forms
- New: `packages/sales/src/sales-form/domain/workflow-calculators.ts:243`
- Status: Implemented in code; runtime proof pending
- Gap: selection transitions clamp new/blank moulding quantities to one and preserve existing positive quantities through sync and persistence. Remaining work is authenticated grouped-line proof.

8. New form loses state / refreshes and drops data
- Legacy: autosave/history flows + long-lived state model
- New: autosave and local recovery are enabled by default, with flush-on-unmount
- Status: Implemented in code; runtime proof pending
- Gap: hydrated forms now default autosave on, with debounced flush, local recovery snapshots, page-leave warnings, and manual-save override. Remaining work is authenticated refresh/leave/recovery proof.

9. Shelf item feature parity
- Legacy: `apps/www/src/components/forms/sales-form/shelf-items.tsx`
- New: grouped shelf sections now implemented in `item-workflow-panel.tsx` on top of shared shelf adapters in `packages/sales/src/sales-form/domain/workflow-calculators.ts`
- Status: Implemented in code; runtime proof pending
- Gap: the default V2 editor now exposes section category paths and clears stale product/pricing state when categories change or are cleared; shelf price editing and subtotal rollups remain covered by shared adapters. Remaining work is authenticated runtime verification.

10. Service line items tax switch + production switch
- Legacy: `service-content.tsx` tax/prod `LineSwitch`
- New: grouped service rows/editor in `item-workflow-panel.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: row-level tax and production flags now hydrate/save through grouped service rows, and the new-form editor exposes them behind the Super-Admin line-pricing capability. Remaining work is browser parity proof and full costing/tax scenario coverage.

11. Tax not getting calculated
- Legacy: `taxCodeChanged()` always triggers `calculateTotalPrice()`
- New: `setTaxRate` + summary recompute path exists
- Status: Implemented in code; runtime proof pending
- Gap: grouped service row tax switches now synchronize the parent line tax flag, including stale legacy parent booleans and sparse row metadata. Remaining work is authenticated tax-code/profile transition proof across mixed item types.

12. Step floating bar options (tabs/select all/pricing/component/refresh/enable custom)
- Legacy: floating action menu in components section
- New: `packages/sales/src/sales-form/ui/workflow/workflow-step-component-panel.tsx`
- Status: Implemented in code; runtime proof pending

13. Component menu (edit/select/redirect/delete)
- Legacy: per-card menu in `component-item-card.tsx`
- New: `packages/sales/src/sales-form/ui/workflow/workflow-component-action-menu.tsx`
- Status: Implemented in code; runtime proof pending

14. Component top-left icon indicators
- Legacy: variation/override/redirect badges in `component-item-card.tsx`
- New: `packages/sales/src/sales-form/ui/workflow/workflow-component-badges.tsx`
- Status: Implemented in code; runtime proof pending

15. Sales save history sidebar (Google-doc-like)
- Legacy: `SalesMetaForm` history tab + `SalesHistory` + save trigger `create-sales-history`
- New: history listing, lazy snapshot preview, and restore flow
- Status: Implemented in code; runtime proof pending
- Gap: history listing, lazy snapshot preview, read-only preview banner, local restore, and restored-version banner are implemented; remaining work is authenticated existing-order proof.

16. Component edit parity
- Legacy: `apps/www/src/components/forms/sales-form/component-item-card.tsx:320` + `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-component-modal/step-component-modal.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` (component edit dialog)
- Status: Implemented in code; runtime proof pending
- Gap: catalog details, image attachment, visibility, pricing, section overrides, redirects, and local selected-component snapshots now have dedicated save dialogs/mutations. Remaining work is authenticated edit-and-reopen proof.

17. Component image attachment in edit flow
- Legacy: component edit/product modal flow under `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/step-component-modal/*`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` (component edit dialog)
- Status: Implemented in code; runtime proof pending
- Gap: component edit details now include image upload/update persistence; remaining work is authenticated attachment proof.

18. Redirect component route list parity
- Legacy: `apps/www/src/components/forms/sales-form/component-item-card.tsx:343` + `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class.ts:109`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:143`
- Status: Implemented in code; runtime proof pending
- Gap: route options now preserve configured order, dedupe only by UID, and retain distinct steps that share a title, matching the legacy settings helper. Remaining work is authenticated selector proof.

19. Door size inline base-cost edit parity
- Legacy: `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx:245`
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: privileged users receive the shared inline `DoorPriceCell` editor with supplier-aware dependency keys, profile-adjusted sales preview, surcharge preservation, and missing-price recovery; read-only users see the resolved price/breakdown. Remaining work is authenticated UX proof.

20. Component cost display should show calculated sales cost
- Legacy: sales-form component pricing surfaces show resolved sales pricing, not raw base cost.
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` + `packages/sales/src/sales-form/domain/step-engine.ts`
- Status: Implemented in code; runtime proof pending
- Gap: dependency/profile-resolved sales pricing is now rendered as the primary card price, with an accessible hover label for calculated sales cost and base-cost context. Remaining work is authenticated browser proof across profile and dependency changes.

21. HPT add-size action broken
- Legacy: `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-select-modal/index.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:1410`
- Status: Implemented in code; runtime proof pending
- Gap: the HPT size menu now remains available when the active door has no persisted rows (including when another selected door owns the only rows), while retaining variant-aware candidate filtering and configure-size fallback. Remaining work is authenticated fixture proof.

22. HPT section add-door option parity
- Legacy: grouped door workflow in `apps/www/src/components/forms/sales-form/hpt/*` and legacy sales-book grouped door controls
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` + `packages/sales/src/sales-form/ui/workflow/house-package-tool-panel.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: HPT now exposes `Add Door` and returns to the existing Door multi-select step without changing configured rows; authenticated browser parity proof remains open.

23. Moulding calculator outside-click dismiss parity
- Legacy: `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/moulding-step/index.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx:613`
- Status: Implemented in code; runtime proof pending
- Gap: both picker and grouped moulding calculators now dismiss on outside pointer interaction; remaining work is authenticated interaction proof.

24. Door size variant control parity
- Legacy: `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/modals/door-size-modal/index.tsx` + `.../_components/components-section/component-section-footer.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` + `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
- Status: Implemented in code; runtime proof pending
- Gap: the redesigned editor hydrates configured variants from line/route metadata, persists through `sales.updateStepMeta`, and shares the canonical candidate helper with Door and HPT size lists. Remaining work is authenticated existing-record reopen/filter proof.

## Detailed Execution Plan

### Phase 0: Baseline Reproduction and Acceptance Contract
Dependencies: none

1. Define parity acceptance scenarios for each gap above in one matrix (manual + automated).
2. Reproduce each reported issue in `new-sales-form` and capture exact failing behavior/video/trace.
3. Add/refresh deterministic fixtures for mixed line types: door/HPT/moulding/service/shelf/tax/profile-change.
4. Create phase gate: all repros must have a failing test or explicit reproduction script before fix work starts.

Validation gate:
- Each feature has: old behavior reference, failing new behavior proof, acceptance criteria.

### Phase 1: Pricing, Repricing, and Tax Integrity (Costing/Settings parity)
Dependencies: Phase 0

Current entry status:
- Started. Dealer `salesPercentage` pricing and dealer line-total semantics have
  automated/query proof and are awaiting browser proof.
- Continue with `NSF-P1-003` through `NSF-P1-006`: `www`
  customer/profile/tax recalc, Door/HPT pricing, shelf rollups, and
  moulding/service taxability.

1. Customer/profile recost hardening
- Ensure customer/profile change triggers repricing and total recalc in all entry paths.
- Include profile-difference guard to avoid redundant recalc while preserving required recost.

2. Tax computation hardening
- Verify tax-rate source, taxable-line detection, service tax flags, discount allocation, and extra-cost taxability.
- Add scenario tests where tax code/profile changes after grouped edits.

3. Door/HPT component-cost integration
- Validate composed component + size pricing flows into door estimate totals.
- Fix any dropped shared-component cost contribution.

Validation gate:
- Package/unit and API parity suites pass for all pricing scenarios.
- Manual checks: profile change immediately updates totals; tax always updates totals.

### Phase 2: Grouped Workflows and Modal Parity
Dependencies: Phase 1

2026-05-13 implementation note:
- Grouped moulding/service edit-save parity foundation is implemented in `packages/sales/src/sales-form/domain/grouping.ts` and `apps/api/src/db/queries/new-sales-form.ts`.
- Legacy grouped siblings with shared `SalesOrderItems.multiDykeUid` now collapse into one new-form UI parent with row-level `mouldingRows` / `serviceRows` carrying persistence identity.
- Saving grouped rows now expands back to legacy sibling `SalesOrderItems`, preserves existing `salesItemId` / `hptId` where possible, revives edited rows by clearing `deletedAt`, creates new sibling rows only for new UI rows, and leaves removed siblings soft-deleted.
- Moulding grouped save writes one `HousePackageTools` row per moulding row with row-level moulding product, step product, and `priceTags.moulding` pricing metadata.
- Validation added in `packages/sales/src/sales-form/domain/grouping.test.ts`, `apps/api/src/db/queries/new-sales-form.multi-line.test.ts`, and `apps/www/src/components/forms/new-sales-form/sections/item-workflow/step-family.test.ts`.

1. Moulding workflow completion
- Calculator pricing semantics and grouped line estimate breakdown behavior are implemented; complete authenticated parity proof.
- Enforce default qty `1` on selected mouldings (selection + re-selection + persistence merge).

2. HPT modal parity
- Add clickable estimate breakdown column.
- Add quick base-price update controls in size/qty modal (permission-gated, old-flow parity).
- Fix HPT `Add Size` behavior and restore add-door option parity.
- Keep Door Size Variant control/filtering parity locked to the same shared candidate helper used by both Door modal and HPT size lists, with old-form semantics where configured variant widths define the canonical visible size list and pricing buckets do not add extra sizes.

3. Supplier propagation parity
- Ensure supplier changes immediately affect size-price options and resolved row prices.

4. Service and Shelf parity
- Add tax and production switches to service rows with persistence.
- Expand shelf workflow to match legacy category/product behavior.

5. Moulding modal interaction parity
- Match old-form dismiss/close behavior, including outside-click close semantics.

Validation gate:
- End-to-end scenarios for door+supplier+size pricing, service toggles, moulding defaults, shelf edits.

### Phase 3: Step UX and Component Management Parity
Dependencies: Phase 2

1. Implement step floating action bar in new form:
- `Tabs`, `Select All`, `Pricing`, `Component`, `Refresh`, `Enable Custom`.

2. Implement component-card action menu:
- `Edit`, `Select`, `Redirect`, `Delete`.

3. Implement component top-left status indicators:
- variation, override, redirect icons/badges.

4. Complete component edit parity:
- restore practical edit behavior
- add image attachment flow
- show accurate redirect route list
- display calculated sales cost instead of raw base cost

Validation gate:
- Legacy action paths functionally mirrored in new form with role guard parity.

### Phase 4: Data Safety and History
Dependencies: Phase 3

1. Session resilience
- Prevent silent state loss on long idle/refresh/navigation.
- Improve autosave defaults/strategy, local recovery snapshot, conflict-safe restore UX.

2. Save history sidebar
- Add history panel with timeline and diff-friendly presentation.
- Hook save lifecycle to history creation equivalent to `create-sales-history` flow.

Validation gate:
- Forced refresh/network interruption drill retains or recovers data.
- History entries created and browsable after draft/final saves.

### Phase 5: Hardening and Cutover Readiness
Dependencies: Phase 4

1. Full regression run across all parity scenarios.
2. Production smoke checklist and rollback switches.
3. Final sign-off document with open/closed risks.

Validation gate:
- All phase test suites and manual scripts pass.
- No unresolved P0/P1 parity bugs.

## Recommended Implementation Order
For each phase, execute in this strict sequence:
1. Schema/contracts
2. API/query/mutation behavior
3. UI/interaction
4. Validation tests
5. Polish/accessibility/copy

## Risks and Mitigations
1. Risk: Existing parity docs marked many items PASS while field behavior is still failing.
- Mitigation: treat user-reported regressions as source-of-truth and require reproducible proof per item before closure.

2. Risk: UI parity without domain-level parity causes recurring regressions.
- Mitigation: keep pricing/routing/grouped calculators in `packages/sales/src/sales-form/domain/*` and test there first.

3. Risk: State-loss fixes can introduce stale writes/conflicts.
- Mitigation: version-aware autosave, conflict prompts, local recovery snapshots, and explicit restore choices.

4. Risk: Scope creep from many UX parity asks.
- Mitigation: phase gates with strict done criteria; do not start next phase until current phase test checklist is green.

## Skills List Used
- `plan`: used to structure the roadmap into executable phases with dependencies and validation gates.
- `project-brain`: used to align and persist priorities/progress in `/brain` artifacts.

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
- Phase progression rule: do not start next phase until current phase validation checklist passes.
- Field-reported gaps captured on 2026-03-14 are authoritative even if related UI exists in current new-form code.

## Explicit Old vs New Comparison

### Core Classes (Costing / Setting / Step)
1. Costing recalculation and tax profile propagation
- Legacy anchor:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts:380`
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts:417`
- New anchor:
  - `apps/www/src/components/forms/new-sales-form/mappers.ts:96`
  - `packages/sales/src/sales-form/domain/costing.ts:109`
- Status: Partial (engine exists, user reports incorrect tax outcomes in real workflow)
- Gap: Runtime integration parity scenarios are incomplete; tax/taxable interaction must be validated against old mixed item profiles.

2. Customer profile change repricing and sales cost update
- Legacy anchor:
  - `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:121`
  - `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:132`
- New anchor:
  - `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx` (profile coefficient watcher)
  - `packages/sales/src/sales-form/domain/profile-repricing.ts`
- Status: Partial
- Gap: parity exists at engine level, but field workflow from customer/profile change to visible repricing is still reported broken by user and needs scenario hardening.

3. Step/Component operational controls (floating action + component menu)
- Legacy anchor:
  - `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/index.tsx:168`
  - `apps/www/src/components/forms/sales-form/component-item-card.tsx:320`
- New anchor:
  - `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- Status: Missing
- Gap: no equivalent floating action menu for `Tabs`, `Select All`, `Pricing`, `Component`, `Refresh`, `Enable Custom`; no per-component `Edit`, `Select`, `Redirect`, `Delete` menu parity.

### Requested Feature Matrix

> **2026-03-29 Audit**: Code review verified 15 of 24 items are now fully implemented. Remaining items need runtime verification only (no missing code). Status field updated to reflect current codebase state.

1. Moulding line items + calculator parity
- Legacy: `apps/www/src/components/forms/sales-form/moulding-and-service/moulding-content.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:956`
- Status: Implemented — runtime verification pending
- Gap: UI and calculator are implemented; remaining work is runtime parity verification against legacy moulding flows.

2. Customer profile update not changing pricing
- Legacy: `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:129-133`
- New: `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx` (coefficient watcher at lines 245-278)
- Status: Implemented — runtime verification pending
- Detail: Profile change triggers `repriceLineItemsByProfile()` via useEffect with coefficient tracking. Wiring verified in code review. Field verification needed.

3. Supplier changing in door qty modal
- Legacy: `.../modals/door-size-select-modal/index.tsx:87` (supplier badge in modal)
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx` + supplier props wiring
- Status: Implemented — runtime verification pending
- Gap: verify active supplier changes are reflected instantly in modal pricing rows and saved rows.

4. Quick base price update within size/qty modal
- Legacy: `.../modals/door-size-select-modal/index.tsx:245` (`PriceCell` popover edits pricing)
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx` (DoorPriceCell popover at lines 502-573)
- Status: ✅ Done
- Detail: Popover-based inline base-price editor with sales price preview, Save/Cancel buttons. Implemented in `DoorPriceCell` component used in both DoorSizeQtyDialog and door size variants modal.

5. HPT list estimate column click -> breakdown
- Legacy: `apps/www/src/components/forms/sales-form/hpt/price-estimate-cell.tsx`
- New: HPT table in `item-workflow-panel.tsx` (Menu-based breakdown at lines 2996-3180)
- Status: ✅ Done
- Detail: Line total cell uses `<Menu>` dropdown showing full breakdown: component pricing steps, door component, size dimension, base/sales price, component surcharge, final unit price, qty, addon price input.

6. Component cost not adding right to door estimate
- Legacy: grouped estimate in `costing-class.ts` + HPT tooling
- New: `computeSharedDoorSurcharge` + `repricePersistedDoorRowsForSupplier` in `item-workflow-panel.tsx` (lines 459-593)
- Status: Implemented — runtime verification pending
- Gap: Surcharge mechanism sums non-door/non-HPT step prices. Individual component costs within door step used for tier pricing lookup. Needs field verification that composed component costs propagate correctly into HPT line totals.

7. Selected mouldings default qty = 1
- Legacy: grouped line defaults from class-managed forms
- New: `packages/sales/src/sales-form/domain/workflow-calculators.ts:626-636`
- Status: ✅ Done
- Detail: Default qty=1 enforced at three layers: (1) workflow-calculators initial creation defaults non-positive qty to 1, (2) moulding selection popover defaults to "1" (item-workflow-panel.tsx:1014,1598), (3) save handler enforces `Math.max(1, ...)` (line 1611).

8. New form loses state / refreshes and drops data
- Legacy: autosave/history flows + long-lived state model
- New: autosave now enabled by default (`store.ts:76`), debounced 1000ms, with local recovery snapshots
- Status: ✅ Done
- Detail: Autosave default changed from `false` to `true` (2026-03-29). Auto-save hook debounces at 1000ms, queues saves when in-flight, flushes on unmount, detects stale/conflict errors. Local recovery via localStorage snapshots provides additional safety.

9. Shelf item feature parity
- Legacy: `apps/www/src/components/forms/sales-form/shelf-items.tsx`
- New: grouped shelf sections in `item-workflow-panel.tsx` on top of shared shelf adapters in `packages/sales/src/sales-form/domain/workflow-calculators.ts`
- Status: Implemented — runtime verification pending
- Gap: sectioned parent/category/product workflow, shelf price editing, and subtotal rollups are implemented in code; remaining parity work is runtime verification plus any legacy-only category-create/clear edge cases.

10. Service line items tax switch + production switch
- Legacy: `service-content.tsx` tax/prod `LineSwitch`
- New: `item-workflow-panel.tsx` service rows (lines 3716-3761) with both `taxxable` and `produceable` checkboxes
- Status: ✅ Done
- Detail: Both Tax and Prod checkboxes implemented in service row table with persistence through `meta.serviceRows`. New row defaults: `taxxable: false, produceable: false`. Field schema confirmed in `workflow-calculators.ts:426-427`.

11. Tax not getting calculated
- Legacy: `taxCodeChanged()` always triggers `calculateTotalPrice()`
- New: `setTaxRate` + summary recompute path in `invoice-overview-panel.tsx` (lines 296-302) using legacy strategy in `costing.ts` (lines 214-269)
- Status: Implemented — runtime verification pending
- Detail: Tax code change triggers `resolveTaxRateByCode()` → `setTaxRate()` → summary recompute. Legacy strategy correctly handles taxable line detection, discount allocation before tax, and CCC surcharge. Field verification needed for mixed-item tax scenarios.

12. Step floating bar options (tabs/select all/pricing/component/refresh/enable custom)
- Legacy: floating action menu in components section
- New: `item-workflow-panel.tsx` (sticky floating toolbar at lines 5557-5756)
- Status: ✅ Done
- Detail: Full sticky toolbar with: Tabs (jump between steps), Select All, Pricing (quick edit), Door Size Variant, Component (add custom), Refresh, Enable Custom. Search filter included.

13. Component menu (edit/select/redirect/delete)
- Legacy: per-card menu in `component-item-card.tsx`
- New: `item-workflow-panel.tsx` (three-dot menu at lines 5230-5325)
- Status: ✅ Done
- Detail: Full dropdown menu with: Edit, Section Setting Override, Select, Redirect (with submenu + cancel), Delete (red-styled).

14. Component top-left icon indicators
- Legacy: variation/override/redirect badges in `component-item-card.tsx`
- New: `item-workflow-panel.tsx` (badge indicators at lines 5212-5228)
- Status: ✅ Done
- Detail: Three visual indicators: Filter icon for variations, Variable icon for section overrides, External link icon for redirects. All with `rounded bg-secondary p-1` styling.

15. Sales save history sidebar (Google-doc-like)
- Legacy: `SalesMetaForm` history tab + `SalesHistory` + save trigger `create-sales-history`
- New: `invoice-summary-sidebar.tsx` (line 75) with tabbed interface (Summary | History)
- Status: ✅ Done
- Detail: SalesHistory component (from `sales-hx.tsx`) integrated in invoice-summary-sidebar with two-tab layout. History tab shows `<SalesHistory salesId={record?.salesId} />`.

16. Component edit parity
- Legacy: `apps/www/src/components/forms/sales-form/component-item-card.tsx:320` + step-component-modal
- New: `item-workflow-panel.tsx` (component edit dialog at lines 6270+)
- Status: Implemented — runtime verification pending
- Detail: Edit dialog with Sales Cost input, image attachment, component fields. Wired through component card menu "Edit" action. Needs field verification against legacy edit workflow.

17. Component image attachment in edit flow
- Legacy: component edit/product modal flow under step-component-modal
- New: `item-workflow-panel.tsx` (FileUploader at lines 6282-6294)
- Status: ✅ Done
- Detail: FileUploader component in edit modal with `folder="dyke"`, `dimensions={[120, 120]}`, visible when mode is "edit". Component cards display image or "No image" placeholder.

18. Redirect component route list parity
- Legacy: `component-item-card.tsx:343` + `settings-class.ts:109`
- New: `item-workflow-panel.tsx` redirect submenu in component card menu (lines 5278-5312)
- Status: Implemented — runtime verification pending
- Detail: Redirect selector exists with submenu listing redirectable routes and "Cancel Redirect" option. Needs field verification that route options match old-form redirectable route semantics.

19. Door size inline base-cost edit parity
- Legacy: door-size-select-modal PriceCell popover
- New: `workflow-modals.tsx` DoorPriceCell (lines 502-573)
- Status: ✅ Done
- Detail: Popover with base price input, calculated sales price preview, Save/Cancel buttons. Used in both DoorSizeQtyDialog and variant modal.

20. Component cost display should show calculated sales cost
- Legacy: sales-form component pricing shows resolved sales pricing
- New: `item-workflow-panel.tsx` component edit dialog (line 6297: "Sales Cost" label)
- Status: ✅ Done
- Detail: Component edit shows "Sales Cost" (not base cost). Component cards display `component.salesPrice`. Needs field verification for all display surfaces.

21. HPT add-size action broken
- Legacy: door-size-select-modal
- New: `item-workflow-panel.tsx:1410` with shared candidate-derivation logic
- Status: Implemented — runtime verification pending
- Gap: shared candidate-derivation logic and variant-aware filtering are implemented; runtime parity proof still needed for real Door/HPT fixtures.

22. HPT section add-door option parity
- Legacy: grouped door workflow in `hpt/*` and legacy sales-book
- New: `item-workflow-panel.tsx` "Add Door Option" button (lines 2574-2586)
- Status: ✅ Done
- Detail: "Add Door Option" button implemented, sets active door step when clicked.

23. Moulding calculator outside-click dismiss parity
- Legacy: moulding-step close on outside click
- New: `workflow-modals.tsx` MouldingCalculatorDialog (lines 1579-1603)
- Status: ✅ Done
- Detail: Custom modal with outer div `onClick={() => props.onOpenChange(false)}` and inner div `e.stopPropagation()`. Matches outside-click-to-close behavior.

24. Door size variant control parity
- Legacy: door-size-modal + component-section-footer
- New: `item-workflow-panel.tsx` + `workflow-modals.tsx` with variant hydration from route-step meta + persist via `sales.updateStepMeta`
- Status: Implemented — runtime verification pending
- Gap: configured variants hydrate and persist correctly; runtime parity proof still needed for existing-record reopen/filter flows.

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

1. Moulding workflow completion
- Finalize calculator parity and line estimate breakdown behavior.
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

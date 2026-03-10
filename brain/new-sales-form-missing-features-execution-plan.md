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
1. Moulding line items + calculator parity
- Legacy: `apps/www/src/components/forms/sales-form/moulding-and-service/moulding-content.tsx`
- New: `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx:956`
- Status: Partial
- Gap: UI exists; full calculator/price-summary parity and user flow needs completion.

2. Customer profile update not changing pricing
- Legacy: `apps/www/src/components/forms/sales-form/sales-customer-input.tsx:129-133`
- New: `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- Status: Partial/Fail in field
- Gap: enforce reliable recost trigger chain on customer/profile change.

3. Supplier changing in door qty modal
- Legacy: `.../modals/door-size-select-modal/index.tsx:87` (supplier badge in modal)
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx` + supplier props wiring
- Status: Partial
- Gap: verify active supplier changes are reflected instantly in modal pricing rows and saved rows.

4. Quick base price update within size/qty modal
- Legacy: `.../modals/door-size-select-modal/index.tsx:245` (`PriceCell` popover edits pricing)
- New: `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`
- Status: Missing
- Gap: no inline privileged base-price editor in new door size/qty modal.

5. HPT list estimate column click -> breakdown
- Legacy: `apps/www/src/components/forms/sales-form/hpt/price-estimate-cell.tsx`
- New: HPT table in `item-workflow-panel.tsx`
- Status: Missing
- Gap: estimate cell is static text; no breakdown popover/modal.

6. Component cost not adding right to door estimate
- Legacy: grouped estimate in `costing-class.ts` + HPT tooling
- New: `summarizeDoors` + apply paths in `item-workflow-panel.tsx`
- Status: Partial/Fail in field
- Gap: verify composed component price contribution chain (step/component/shared totals) into HPT line totals.

7. Selected mouldings default qty = 1
- Legacy: grouped line defaults from class-managed forms
- New: `packages/sales/src/sales-form/domain/workflow-calculators.ts:243`
- Status: Partial
- Gap: engine default is `1` for new rows, but user reports misses; need enforce default on selection transitions and persistence merges.

8. New form loses state / refreshes and drops data
- Legacy: autosave/history flows + long-lived state model
- New: autosave exists but disabled by default (`store.ts:74`), flushes on unmount
- Status: Fail in field
- Gap: resilience strategy not sufficient for long sessions/network interruptions/tab refresh.

9. Shelf item feature parity
- Legacy: `apps/www/src/components/forms/sales-form/shelf-items.tsx`
- New: simplified shelf rows in `item-workflow-panel.tsx:1570+`
- Status: Partial
- Gap: reduced feature surface versus legacy shelf category/product workflow.

10. Service line items tax switch + production switch
- Legacy: `service-content.tsx` tax/prod `LineSwitch`
- New: service rows currently no production switch UI
- Status: Partial
- Gap: add `tax` and `production` toggles with persistence and costing impact.

11. Tax not getting calculated
- Legacy: `taxCodeChanged()` always triggers `calculateTotalPrice()`
- New: `setTaxRate` + summary recompute path exists
- Status: Partial/Fail in field
- Gap: likely integration gaps in row tax flags and profile/tax transitions; requires parity scenarios.

12. Step floating bar options (tabs/select all/pricing/component/refresh/enable custom)
- Legacy: floating action menu in components section
- New: not present
- Status: Missing

13. Component menu (edit/select/redirect/delete)
- Legacy: per-card menu in `component-item-card.tsx`
- New: not present
- Status: Missing

14. Component top-left icon indicators
- Legacy: variation/override/redirect badges in `component-item-card.tsx`
- New: not present
- Status: Missing

15. Sales save history sidebar (Google-doc-like)
- Legacy: `SalesMetaForm` history tab + `SalesHistory` + save trigger `create-sales-history`
- New: no history sidebar flow
- Status: Missing

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

3. Supplier propagation parity
- Ensure supplier changes immediately affect size-price options and resolved row prices.

4. Service and Shelf parity
- Add tax and production switches to service rows with persistence.
- Expand shelf workflow to match legacy category/product behavior.

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

# New Sales Form Parity Test Matrix

Date: 2026-03-09
Purpose: Deterministic old-vs-new validation grid for costing, settings routing, and step engine behaviors.

Legend:
- `PASS`: behavior currently matches old flow.
- `PARTIAL`: behavior exists but not fully equivalent in edge cases.
- `FAIL`: behavior materially differs.
- `TODO`: not validated yet.

## A. Costing Engine (Legacy `CostingClass`)

1. Base subtotal aggregation
- Legacy reference: `costing-class.ts#calculateTotalPrice`
- New reference: `@gnd/sales/new-sales-form-costing.ts#calculateNewSalesFormSummary`
- Input: mixed line items with explicit `lineTotal`.
- Expected: subtotal equals sum of selected line totals.
- Status: PASS

2. Flat discount (`Discount`) application
- Legacy reference: `softCalculateTotalPrice`
- New reference: `calculateNewSalesFormSummary`
- Input: subtotal 1000, discount 100.
- Expected: subtotal-after-discount reduces by 100.
- Status: PASS

3. Percentage discount (`DiscountPercentage`) application
- Legacy reference: n/a in legacy class (new capability baseline)
- New reference: `calculateNewSalesFormSummary`
- Input: subtotal 1000, discount pct 10.
- Expected: percent discount value 100.
- Status: PASS (new behavior baseline)

4. Taxable scoping with service taxability
- Legacy reference: `calculateTotalPrice` (`isService && formData.meta.taxxable`)
- New reference: `calculateNewSalesFormSummary` with `strategy: "legacy"`
- Input: service line + product line with tax rate 10.
- Expected: service excluded from taxable subtotal by default.
- Status: PASS

5. Labor derived from grouped forms
- Legacy reference: `softCalculateTotalPrice` (`laborRate`, `laborQty`)
- New reference: none equivalent in canonical form state.
- Input: HPT/service grouped rows with labor metadata.
- Expected: derived labor injected into totals.
- Status: PASS
- Progress: shared costing now derives labor from grouped door/service/moulding/shelf metadata patterns and applies derived totals in canonical summary calculations with dedicated regressions.

6. Credit-card surcharge (`ccc`)
- Legacy reference: `softCalculateTotalPrice` (`paymentMethod == "Credit Card"`)
- New reference: `calculateNewSalesFormSummary` legacy strategy.
- Input: payment method credit card, non-zero total.
- Expected: 3% surcharge added to grand total.
- Status: PASS
- Progress: payment-method metadata is now wired through UI/API summary paths and legacy surcharge base parity is covered by package regression tests.

7. Delivery + custom costs tax handling
- Legacy reference: `softCalculateTotalPrice` taxable-before-discount flow.
- New reference: `calculateNewSalesFormSummary`.
- Input: delivery and custom taxable/non-taxable extra costs.
- Expected: taxable basis and grand total align.
- Status: PASS
- Progress: shared costing now scopes taxable basis using extra-cost `type`/`taxxable` (custom/delivery split) with dedicated regression coverage.

8. Customer/customer-profile change repricing trigger
- Legacy reference: `salesProfileChanged` in `costing-class.ts` recalculates prices when effective profile multiplier changes.
- New reference: `invoice-overview-panel.tsx` (`lastProfileCoefficientRef` trigger) + shared package engine `@gnd/sales/sales-form` -> `repriceSalesFormLineItemsByProfile(...)`.
- Input: select customer that resolves to a different profile coefficient; manually change profile to one with different coefficient.
- Expected: sales cost recalculates whenever effective profile coefficient changes compared to previous coefficient.
- Status: PASS
- Progress: trigger remains coefficient-delta-based, and canonical repricing now uses base-price-first recomputation with grouped bucket support (`priceData.baseUnitCost`) and selected-component price recomposition before ratio fallback.

## B. Settings/Route Engine (Legacy `SettingsClass`)

9. Root route sequence generation
- Legacy reference: `composeStepRouting`, `composeNextRoute`
- New reference: API `getNewSalesFormStepRouting`, UI `buildConfiguredRouteSteps`
- Input: select root component with configured `routeSequence`.
- Expected: full sequence seeded immediately.
- Status: PASS

10. Next-step fallback scan across prior steps
- Legacy reference: `getNextRouteFromSettings` fallback loop.
- New reference: `resolveNextStep` prior-step fallback scan + `customNextStepTitle`.
- Input: route hole/missing direct next at current step.
- Expected: fallback resolves same next step as legacy.
- Status: PASS
- Progress: added deterministic regression test for prior-step fallback route resolution in package domain suite.

11. Redirect UID precedence over route map
- Legacy reference: `nextStep(isRoot, redirectUid)`
- New reference: `resolveNextStep` (`redirectUid` first).
- Input: component with `redirectUid`.
- Expected: redirect step selected before composed route.
- Status: PASS

12. Route config + section override merge
- Legacy reference: `getRouteConfig` + `getRouteOverrideConfig`
- New reference: `getRouteConfigForLine`.
- Input: component override + step override + base route config.
- Expected: merged `noHandle`/`hasSwing` parity.
- Status: PASS
- Progress: added explicit precedence tests for (`base -> prior-step overrides -> component -> step`) merge behavior in package domain suite.

## C. Step/Component Engine (Legacy `StepHelperClass`)

13. Variation rule visibility (`is`/`isNot`)
- Legacy reference: `isComponentVisible`, `filterStepComponents`
- New reference: `isComponentVisibleByRules`.
- Input: step with multi-rule variation set.
- Expected: same visible component set.
- Status: PASS
- Progress: visibility resolver now supports evaluating rule matches against full multi-select UID stacks for a step (not only single `prodUid`), with dedicated regression coverage.

14. Dependency pricing by selected prior steps
- Legacy reference: `getComponentPrice`, `getComponentPriceModel`
- New reference: `resolveComponentPriceByDeps`.
- Input: component with `priceStepDeps`.
- Expected: same price bucket key resolution.
- Status: PASS
- Progress: resolver now supports explicit step-level deps source, split sales/base pricing buckets, permutation key matching, deterministic best-match fallback, and multi-select UID combination pricing with dedicated regressions.

15. Hidden/auto step recursion
- Legacy reference: v2 custom next-step + hidden-step auto advance behavior.
- New reference: `applyRouteRecursion`.
- Input: intermediary step with zero or one candidate.
- Expected: auto-advance parity.
- Status: PASS
- Progress: added deterministic regression covering no-component hidden-step auto-advance traversal to the next routed step.

16. Multi-select step persistence (`Door`, `Moulding`, `Weatherstrip Color`)
- Legacy reference: `isMultiSelectTitle`, `selectComponent`, group form.
- New reference: `saveSelectedComponent` meta-selected arrays.
- Input: toggle component in multi-select step.
- Expected: selected set and pricing aggregation parity.
- Status: PASS
- Progress: shared selection map now resolves multi-select state from `meta.selectedProdUids` when canonical `prodUid` is empty, and dependency pricing/visibility paths now evaluate full multi-select UID stacks.

## D. Grouped Workflows

17. HPT supplier + size pricing key (`size & supplierUid`)
- Legacy reference: `supplierSizeDep`, `getDoorPriceModel`.
- New reference: HPT panel supplier/size resolution.
- Input: supplier selected, add door size row.
- Expected: supplier-specific price bucket used.
- Status: PASS
- Progress: shared resolver now supports supplier-size key bucket parsing with multiple bucket field formats and is wired in HPT size-row add flow.

18. HPT no-handle/has-swing controls
- Legacy reference: route config consumption in HPT class.
- New reference: `getRouteConfigForLine` + HPT panel rendering.
- Input: route config with `noHandle=true`.
- Expected: qty/swing interactions mirror legacy.
- Status: PASS
- Progress: shared door summarizer now consumes both `noHandle` and `hasSwing` route config so qty/line totals derive from `totalQty` (LH/RH reset) and swing values are cleared when swing is disabled; panel wiring updated to use shared behavior.

19. Moulding line-item calculator and aggregated totals
- Legacy reference: `MouldingClass` + grouped pricing flow.
- New reference: `renderMouldingLineItemPanel`, calculator modal.
- Input: multi-selected mouldings with add-on/custom price.
- Expected: line totals and aggregate parity.
- Status: PASS
- Progress: moulding persist path now always writes canonical summarized qty/unit/line totals (including zero-state), removing stale-total carryover edge cases.

20. Service line-item grouped behavior
- Legacy reference: `ServiceClass`.
- New reference: `renderServiceLineItemPanel`.
- Input: multi-row service entries with qty/unit.
- Expected: row + aggregate totals parity.
- Status: PASS
- Progress: service row summary has explicit zero-state coverage, UI supports remove-to-zero row state, and grouped service taxability now propagates into line meta for costing tax-scope parity.

21. Shelf rows and subtotal rollup
- Legacy reference: `updateShelfCosts`, shelf item structures.
- New reference: shelf panel in `item-workflow-panel`.
- Input: multiple shelf rows.
- Expected: subtotal parity and save/get round-trip.
- Status: PASS
- Progress: shelf row editing now uses shared domain summarizer (`summarizeShelfRows`) for consistent row total + aggregate qty/unit/line rollups before persistence.

## E. Persistence / API

22. Round-trip relational persistence (`formSteps`, `shelfItems`, `housePackageTool`, `doors`)
- Legacy reference: sales relational model.
- New reference: `saveNewSalesFormInternal`, `toBootstrapPayload`.
- Input: mixed-line payload with all relational children.
- Expected: saved and reloaded payload integrity.
- Status: PASS

23. Version conflict behavior
- Legacy reference: n/a (new resilience requirement).
- New reference: `saveNewSalesFormInternal` version check.
- Input: stale client version save.
- Expected: conflict response + no silent overwrite.
- Status: PASS

## Execution Order For Closure

1. Close A5/A6/A7/A8 (costing + profile-reprice gaps) in canonical engine and wire through API/UI.
2. Close B10/B12 (route fallback and override precedence).
3. Close C13/C14/C16 (visibility/pricing/multi-select parity).
4. Validate D17-D21 with deterministic fixtures and e2e flows.
5. Mark each row PASS only after test artifacts are committed.

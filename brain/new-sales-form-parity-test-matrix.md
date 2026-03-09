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
- Status: PARTIAL

5. Labor derived from grouped forms
- Legacy reference: `softCalculateTotalPrice` (`laborRate`, `laborQty`)
- New reference: none equivalent in canonical form state.
- Input: HPT/service grouped rows with labor metadata.
- Expected: derived labor injected into totals.
- Status: FAIL

6. Credit-card surcharge (`ccc`)
- Legacy reference: `softCalculateTotalPrice` (`paymentMethod == "Credit Card"`)
- New reference: `calculateNewSalesFormSummary` legacy strategy.
- Input: payment method credit card, non-zero total.
- Expected: 3% surcharge added to grand total.
- Status: PARTIAL (engine supports it; new form meta path not fully wired)

7. Delivery + custom costs tax handling
- Legacy reference: `softCalculateTotalPrice` taxable-before-discount flow.
- New reference: `calculateNewSalesFormSummary`.
- Input: delivery and custom taxable/non-taxable extra costs.
- Expected: taxable basis and grand total align.
- Status: PARTIAL

## B. Settings/Route Engine (Legacy `SettingsClass`)

8. Root route sequence generation
- Legacy reference: `composeStepRouting`, `composeNextRoute`
- New reference: API `getNewSalesFormStepRouting`, UI `buildConfiguredRouteSteps`
- Input: select root component with configured `routeSequence`.
- Expected: full sequence seeded immediately.
- Status: PASS

9. Next-step fallback scan across prior steps
- Legacy reference: `getNextRouteFromSettings` fallback loop.
- New reference: `resolveNextStep` + `customNextStepTitle`.
- Input: route hole/missing direct next at current step.
- Expected: fallback resolves same next step as legacy.
- Status: PARTIAL

10. Redirect UID precedence over route map
- Legacy reference: `nextStep(isRoot, redirectUid)`
- New reference: `resolveNextStep` (`redirectUid` first).
- Input: component with `redirectUid`.
- Expected: redirect step selected before composed route.
- Status: PASS

11. Route config + section override merge
- Legacy reference: `getRouteConfig` + `getRouteOverrideConfig`
- New reference: `getRouteConfigForLine`.
- Input: component override + step override + base route config.
- Expected: merged `noHandle`/`hasSwing` parity.
- Status: PARTIAL

## C. Step/Component Engine (Legacy `StepHelperClass`)

12. Variation rule visibility (`is`/`isNot`)
- Legacy reference: `isComponentVisible`, `filterStepComponents`
- New reference: `isComponentVisibleByRules`.
- Input: step with multi-rule variation set.
- Expected: same visible component set.
- Status: PARTIAL

13. Dependency pricing by selected prior steps
- Legacy reference: `getComponentPrice`, `getComponentPriceModel`
- New reference: `resolveComponentPriceByDeps`.
- Input: component with `priceStepDeps`.
- Expected: same price bucket key resolution.
- Status: PARTIAL

14. Hidden/auto step recursion
- Legacy reference: v2 custom next-step + hidden-step auto advance behavior.
- New reference: `applyRouteRecursion`.
- Input: intermediary step with zero or one candidate.
- Expected: auto-advance parity.
- Status: PARTIAL

15. Multi-select step persistence (`Door`, `Moulding`, `Weatherstrip Color`)
- Legacy reference: `isMultiSelectTitle`, `selectComponent`, group form.
- New reference: `saveSelectedComponent` meta-selected arrays.
- Input: toggle component in multi-select step.
- Expected: selected set and pricing aggregation parity.
- Status: PARTIAL

## D. Grouped Workflows

16. HPT supplier + size pricing key (`size & supplierUid`)
- Legacy reference: `supplierSizeDep`, `getDoorPriceModel`.
- New reference: HPT panel supplier/size resolution.
- Input: supplier selected, add door size row.
- Expected: supplier-specific price bucket used.
- Status: PARTIAL

17. HPT no-handle/has-swing controls
- Legacy reference: route config consumption in HPT class.
- New reference: `getRouteConfigForLine` + HPT panel rendering.
- Input: route config with `noHandle=true`.
- Expected: qty/swing interactions mirror legacy.
- Status: PARTIAL

18. Moulding line-item calculator and aggregated totals
- Legacy reference: `MouldingClass` + grouped pricing flow.
- New reference: `renderMouldingLineItemPanel`, calculator modal.
- Input: multi-selected mouldings with add-on/custom price.
- Expected: line totals and aggregate parity.
- Status: PARTIAL

19. Service line-item grouped behavior
- Legacy reference: `ServiceClass`.
- New reference: `renderServiceLineItemPanel`.
- Input: multi-row service entries with qty/unit.
- Expected: row + aggregate totals parity.
- Status: PARTIAL

20. Shelf rows and subtotal rollup
- Legacy reference: `updateShelfCosts`, shelf item structures.
- New reference: shelf panel in `item-workflow-panel`.
- Input: multiple shelf rows.
- Expected: subtotal parity and save/get round-trip.
- Status: PARTIAL

## E. Persistence / API

21. Round-trip relational persistence (`formSteps`, `shelfItems`, `housePackageTool`, `doors`)
- Legacy reference: sales relational model.
- New reference: `saveNewSalesFormInternal`, `toBootstrapPayload`.
- Input: mixed-line payload with all relational children.
- Expected: saved and reloaded payload integrity.
- Status: PASS

22. Version conflict behavior
- Legacy reference: n/a (new resilience requirement).
- New reference: `saveNewSalesFormInternal` version check.
- Input: stale client version save.
- Expected: conflict response + no silent overwrite.
- Status: PASS

## Execution Order For Closure

1. Close A5/A6/A7 (costing gaps) in canonical engine and wire through API/UI.
2. Close B9/B11 (route fallback and override precedence).
3. Close C12/C13/C15 (visibility/pricing/multi-select parity).
4. Validate D16-D20 with deterministic fixtures and e2e flows.
5. Mark each row PASS only after test artifacts are committed.

# New Sales Form Parity Audit

Date: 2026-03-09
Scope: Legacy sales-book step engine classes vs `new-sales-form` implementation.
Verdict: Not 100% in line.

## 2026-03-10 Addendum

- Parity closure is re-opened based on current field/user-reported missing features across pricing, grouped workflows, supplier/door modal behaviors, component control UX, save history, and state resilience.
- Execution authority for closure sequencing is now `brain/new-sales-form-missing-features-execution-plan.md`.

## Legacy Scope Reviewed

- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/costing-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/group-form-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/service-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/moulding-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/hpt-class.ts`

## New Scope Reviewed

- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- `apps/www/src/components/forms/new-sales-form/mappers.ts`
- `apps/www/src/components/forms/new-sales-form/store.ts`
- `apps/api/src/db/queries/new-sales-form.ts`
- `apps/api/src/schemas/new-sales-form.ts`

## Parity Matrix

1. SettingsClass route composition and fallback resolution
- Legacy: Route resolution uses `composeNextRoute` + `getNextRouteFromSettings` fallback scan over prior steps.
- New: Route build/advance exists via `buildConfiguredRouteSteps`, `resolveNextStep`, and recursion.
- Status: Partial.
- Gap: Legacy fallback semantics are broader and deterministic from class state; new logic uses simplified custom-title fallback map and does not mirror all legacy fallback paths.

2. Route config and section override merge
- Legacy: `getRouteConfig` merges router config with first active override mode from step forms.
- New: `getRouteConfigForLine` merges route config and active component/step overrides.
- Status: Partial.
- Gap: Equivalent intent exists, but no proof yet of full precedence parity across multi-step override combinations.

3. Step component visibility rules
- Legacy: `isComponentVisible` evaluates variations rules (`is`/`isNot`) against prior selected step component UIDs.
- New: `isComponentVisibleByRules` applies rule matching with same operator concepts.
- Status: Mostly aligned.
- Gap: Needs full scenario parity checks across complex variation stacks.

4. Dependency pricing model (priceStepDeps + pricing matrix)
- Legacy: `getComponentPrice` and `getComponentPriceModel` resolve pricing by dependency UID stack and visible combinations.
- New: `resolveComponentPriceByDeps` resolves by dependency key and fallback key.
- Status: Partial.
- Gap: New model does not yet replicate full variant-combination model behavior from legacy price model generation.

5. Multi-select step behavior (Door/Moulding/Weatherstrip)
- Legacy: Multi-select is first-class via group item forms and selected item IDs.
- New: Multi-select state is stored in step `meta.selectedProdUids` and `selectedComponents`.
- Status: Partial.
- Gap: Data model parity differs, and not all legacy grouped behaviors are encoded in one canonical group engine.

6. HPT door size + supplier-dependent pricing
- Legacy: `HptClass` composes `size & supplierUid` dependency pricing and no-handle/has-swing behavior.
- New: HPT panel and door dialog support supplier key pricing, size rows, no-handle/has-swing config.
- Status: Partial-to-strong.
- Gap: Needs end-to-end parity verification for all door variants and supplier overrides.

7. Moulding/service grouped line-item engines
- Legacy: Dedicated classes (`MouldingClass`, `ServiceClass`) with group form state and pricing merge.
- New: Dedicated UI panels with row-level persistence in `line.meta`.
- Status: Partial.
- Gap: Core UX exists, but canonical grouped domain behavior is not yet unified to legacy class semantics.

8. CostingClass subtotal/tax/labor/ccc logic
- Legacy: `CostingClass` computes subtotal/taxable splits, service taxability, labor derived from group forms, credit-card surcharge (`ccc`), and tax profile application.
- New: `computeSummary` + `recalculateSummary` perform simplified totals from line totals and extra costs.
- Status: Not aligned.
- Gap: Missing legacy-derived labor computation, payment-method surcharge, and full taxable-scoping behavior parity.

9. Customer profile repricing behavior
- Legacy: `salesProfileChanged` recalculates component/group prices via multiplier and then total recomputation.
- New: `repriceLineItemsByProfile` applies ratio-based updates to line/formStep/shelf/HPT rows.
- Status: Partial.
- Gap: New repricing is approximation-oriented and not fully equivalent to legacy component-level recomputation path.

10. Persistence and relational round-trip
- Legacy: Relies on legacy sales form actions + relational writes.
- New: `new-sales-form` save/get persists `formSteps`, `shelfItems`, `housePackageTool`, `doors`, `extraCosts` and includes version conflict checks.
- Status: Strong alignment on structural persistence.
- Gap: Structural parity is not the same as behavioral parity of runtime pricing and route/cost engines.

## Blocking Gaps To Reach 100%

1. Port legacy `CostingClass` behavior into a canonical pricing engine consumed by new UI and API recalc.
2. Port/verify full Settings route fallback semantics and override precedence behavior.
3. Port full dependency pricing variant semantics from legacy price model flow.
4. Add parity tests for grouped workflows: HPT, moulding, service, shelf, mixed-line orders.
5. Add parity tests for labor/tax/discount/payment-method edge cases and credit-card surcharge behavior.

## Recommended Next Implementation Order

1. Schema: Freeze parity fields required for full costing and grouped flows.
2. API: Expand recalc + save semantics to match legacy costing logic exactly.
3. UI: Replace approximation paths with canonical engine outputs.
4. Validation: Add scenario and e2e parity matrix.
5. Polish: Final UI/interaction consistency pass.

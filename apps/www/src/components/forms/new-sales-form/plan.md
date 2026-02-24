# New Sales Form Master Plan (Thread Handoff)

Last Updated: 2026-02-24
Owner: Codex + User
Status: In Progress (parity incomplete)
Workspace Runtime: Bun

## Priority Focus (Current)

Primary legacy parity source-of-truth for edit flows is the clean-code sales-book pipeline rooted at:
- `apps/www/src/app/(clean-code)/(sales)/sales-book/(form)/edit-order/[slug]/page.tsx`

Dependency chain to treat as highest-priority reference during parity work:
1. `getSalesBookFormUseCase`
2. `getTransformedSalesBookFormDataDta`
3. `getSalesBookFormDataDta`
4. `SalesBookFormIncludes`

Concrete paths:
- `apps/www/src/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case.ts`
- `apps/www/src/app/(clean-code)/(sales)/_common/data-access/sales-form-dta.ts`
- `apps/www/src/app/(clean-code)/(sales)/_common/utils/db-utils.ts`

Plan maintenance rule:
- This `plan.md` must be updated in every substantive thread with important findings, scope decisions, status changes, and validation outcomes before handoff.
- New-form isolation rule:
  - Never depend on old form runtime stores/components/dependencies (`app-deps`/legacy form context) for new-sales-form behavior.
  - Re-implement or consume dedicated `newSalesForm` API/contracts instead of wiring legacy form internals.
- UI control import rule:
  - Use `@gnd/ui/controls/*` imports for form controls (`input`, `select`, `checkbox`, `switch`, `combobox`) in new-sales-form scope.
  - Keep button imports on `@gnd/ui/button`.

## Legacy Step Engine Findings (Must Preserve)

### Source paths reviewed
- `apps/www/src/app/(clean-code)/(sales)/sales-book/(form)/edit-order/[slug]/page.tsx`
- `apps/www/src/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case.ts`
- `apps/www/src/app/(clean-code)/(sales)/_common/data-access/sales-form-dta.ts`
- `apps/www/src/app/(clean-code)/(sales)/_common/utils/sales-step-utils.ts`
- `apps/www/src/app/(clean-code)/(sales)/_common/data-access/sales-form-step-dta.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class.ts`
- `apps/www/src/app/(v2)/(loggedIn)/sales-v2/form/_hooks/use-step-items.tsx`
- `apps/www/src/app/(v2)/(loggedIn)/sales-v2/form/_action/get-next-dyke-step.ts`

### Core mechanics
1. Old form is step-based per line item, not flat line editing.
2. Root/parent selection drives route:
   - root step is loaded from sales settings (`rootStep`, typically step id `1`).
   - first selected component UID (parent) determines route key.
3. Step routing comes from sales settings:
   - `setting.data.route[<rootComponentUid>]`
   - `routeSequence` is compiled to `route[currentStepUid] -> nextStepUid`.
4. Each step fetches its own components dynamically:
   - `getStepComponentsUseCase(stepTitle, stepId)` from step helper.
   - component lists are cached in `kvStepComponentList[stepUid]`.
5. Component visibility/filtering is dynamic:
   - based on variation rules and prior step selections.
   - section overrides and route config can change behavior (`noHandle`, etc).
6. Next-step resolution is hybrid:
   - settings route first (`composeNextRoute` / `getNextRouteFromSettings`),
   - custom overrides by item type and step title (`getNextDykeStepAction`),
   - hidden/auto-selected intermediary steps are skipped/applied automatically.
7. Item-type-specific workflow diverges hard after Item Type:
   - `Shelf Items`: shelf grid workflow.
   - `Moulding`: specie -> moulding -> line-item workflow.
   - `Services`: line-item workflow.
   - door families/interior/exterior/bifold/slab: door/HPT workflow.
8. Group/HPT behavior is first-class:
   - multi selections, grouped forms, door size lines, swing/qty, package pricing.
   - `housePackageTool` and `doors` are edited through dedicated step-aware controls.

### Non-negotiable parity implications
- New UI must implement per-item step progression and dynamic component fetching.
- New UI must not flatten step logic into free-form generic fields.
- Parent component selection must always control subsequent step series from settings route.
- Door/HPT/moulding/service/shelf must branch using same item-type logic boundaries.

## Provided UI Pattern Contract (Must Follow)

### Design references reviewed
- `ai/designs/sales-form/sales-invoice-editor.tsx`
- `ai/designs/sales-form/sales-door-details.tsx`
- `ai/designs/sales-form/moulding-calculator-modal.tsx`
- `ai/designs/sales-form/sales-invoice-print-preview.tsx`

### Required visual/interaction structure
1. Invoice-editor shell with:
   - top action bar
   - item workflow region
   - right-side invoice overview panel
   - mobile summary bottom sheet.
2. Item workflows are carded and stateful:
   - active item focus
   - `stepDisplayMode` (`compact`/`extended`)
   - door workflow mode (`selection`/`package`)
   - moulding workflow mode (`selection`/`lineItems`).
3. Modal parity required:
   - door detail sizing modal/table with qty + unit + totals.
   - moulding calculator modal (budget/length/waste -> pieces + LF).
   - print preview modal with template switch + print/export actions.
4. Customer panel pattern:
   - search/select UX + profile block style.
   - global invoice details grouped in overview.
5. Header/action parity:
   - save/finalize + print + overview toggles + item add flows.

### Current status against pattern
- Basic scaffold exists but full pattern parity is not achieved.
- Missing major pattern pieces: step cards/modes, overview drawer fidelity, modal fidelity, mobile summary parity.

## Restart Readiness Checklist (Required Before New UI Implementation Batch)

Before next implementation batch starts, treat these as mandatory:
1. Build step-engine UI primitives first:
   - per-item step rail
   - step component fetch-on-open/select
   - route-driven next-step progression.
2. Wire item-type branching to step flow:
   - door/HPT
   - moulding
   - service
   - shelf.
3. Implement design-state primitives from provided UI:
   - `stepDisplayMode`
   - `activeItem`
   - `doorViewMode`
   - `mouldingViewMode`
   - `isOverviewOpen`
   - `showMobileSummary`.
4. Introduce modal parity surfaces (door details, moulding calculator, print preview) before polish.
5. Validate each batch with scenario checks and record outcomes here before handoff.

## 0) Progress Checklist

### 2026-02-24 Batch P0-1 (Completed)
- [x] Added structured `extraCosts` contract to new sales form API schemas.
- [x] Added `taxCode` metadata field to form contract.
- [x] Implemented recalculation support for:
  - line subtotal
  - discount (flat and percentage)
  - labor
  - delivery
  - other costs
  - adjusted subtotal
  - tax and grand total
- [x] Persisted extra costs through save mutations and mapped from read payloads.
- [x] Added frontend normalization for extra costs.
- [x] Added store actions for extra cost CRUD.
- [x] Updated summary UI to edit/display extra costs and adjusted subtotal.
- [x] Verified no new TypeScript errors in `new-sales-form` files via targeted checks.

### Next Batch (Planned)
- [ ] Customer/profile/tax side-effect parity engine
- [ ] Payment term/due-date + quote `goodUntil` parity behavior
- [ ] Save action parity (`default`, `close`, `new`) and side effects
- [ ] Door/HPT/moulding/service parity engine start

### 2026-02-24 Batch P0-2 (Completed)
- [x] Added `resolveCustomer` endpoint to `newSalesForm` TRPC API.
- [x] Wired customer selection in new UI to resolve and apply:
  - `customerId`
  - `customerProfileId`
  - `billingAddressId`
  - `shippingAddressId`
  - `paymentTerm`
  - `taxCode`
- [x] Updated parity statuses for customer side-effect rows.

### 2026-02-24 Batch P0-3 (Completed)
- [x] Added `Save & Close` and `Save & New` actions in new header actions.
- [x] Wired action behavior through save flush + route transitions.

### 2026-02-24 Batch P0-4 (Completed - Core Relational Parity Pass)
- [x] Re-scoped implementation reference to clean-code dependency chain:
  - `getSalesBookFormUseCase`
  - `getTransformedSalesBookFormDataDta`
  - `getSalesBookFormDataDta`
  - `SalesBookFormIncludes`
- [x] Extended new form API line-item contract to carry:
  - `formSteps`
  - `shelfItems`
  - `housePackageTool` (including `doors` and `molding`)
- [x] Implemented `getNewSalesForm` relation hydration for the fields above.
- [x] Implemented `saveNewSalesFormInternal` persistence for:
  - `DykeStepForm`
  - `DykeSalesShelfItem`
  - `HousePackageTools`
  - `DykeSalesDoors`
- [x] Added update-time soft-delete handling for old relational rows before reinsert.
- [x] Updated frontend line-item normalizers to preserve relational fields during edit/save cycles.
- [ ] Validation pending: runtime save/get parity scenarios for door/HPT/moulding/shelf/form-step records.

### 2026-02-24 Batch P0-5 (Completed - Relational Round-Trip Validation)
- [x] Added targeted API parity tests for new-sales-form relational fields:
  - `apps/api/src/db/queries/new-sales-form.test.ts`
- [x] Added multi-line mixed parity test coverage:
  - `apps/api/src/db/queries/new-sales-form.multi-line.test.ts`
- [x] Verified create/save/get round-trip includes:
  - `formSteps`
  - `shelfItems`
  - `housePackageTool`
  - `doors`
  - `molding`
- [x] Verified mixed line-type boundary behavior:
  - door line keeps HPT/doors
  - shelf-only line keeps shelfItems without HPT
  - service line keeps formSteps without HPT/shelfItems
- [x] Verified update save path soft-deletes previous relational rows and replaces with current payload rows.
- [x] Test command and result:
  - `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts`
  - `3 pass, 0 fail` (executed on 2026-02-24)

### 2026-02-24 Batch P1-1 (Completed - UI Parity Pass, Core Metadata + Item Detail Editors)
- [x] Extended summary UI to include old-page critical metadata controls:
  - payment term
  - quote `goodUntil`
  - delivery option
  - tax code
  - notes
- [x] Added advanced line-item detail editors for relation-backed data:
  - `formSteps`
  - `shelfItems`
  - `housePackageTool`
  - `doors`
- [x] Added save-flow guardrails aligned with old behavior:
  - customer required before save
  - at least one line item required before save
  - `Save & Close` / `Save & New` now navigate correctly even when form is not dirty.
- [ ] Remaining UI parity gaps (next):
  - print preview parity modal/actions
  - door details modal fidelity
  - moulding calculator modal fidelity
  - supplier workflow parity surfaces

### 2026-02-24 Batch P1-2 (In Progress - Step Engine UI Rebuild Start)
- [x] Replaced flat line-item emphasis with a step-oriented workflow surface:
  - new panel: `sections/item-workflow-panel.tsx`
  - per-line step rail, active-step editor, step-scoped component selection.
- [x] Wired dynamic step component loading per active step via TRPC:
  - `sales.getStepComponents` query integration in new form API hooks.
- [x] Added new route-sequence API endpoint under `newSalesForm`:
  - `getStepRouting`
  - returns `composedRouter`, `stepsByUid`, `stepsById`, `rootStepUid`, `rootComponents`.
- [x] Started route-driven progression in UI:
  - root component selection bootstrap for empty items
  - "Add Next Step (Route)" uses root selected component + sales-settings route map.
- [x] Added first custom-next-step fallback mapping in UI for item-type branches:
  - `Moulding`, `Services`, `Door Slabs Only`, `Bifold`, and base mapping keys.
- [x] Adopted provided UI structural states in live layout:
  - overview toggle (`isOverviewOpen`)
  - mobile summary modal (`showMobileSummary`)
  - step display mode toggle (`stepDisplayMode`)
  - active item focus (`activeItem`).
- [x] Added autosave toggle capability (`autosaveEnabled`) in editor state and header actions.
- [x] Ensured manual save flush still works when autosave is off:
  - background debounce disabled
  - explicit manual save operations continue to persist.
- [x] Added invoice overview side panel scaffold to match target shell behavior.
- [ ] Pending in this batch:
  - strict parity of all custom next-step overrides by item type, including hidden/auto step recursion behavior
  - component variation-visibility parity
  - replacement of generic advanced editors with dedicated modal-driven flows.

### 2026-02-24 Batch P1-3 (In Progress - Route Auto-Generation + Visual Parity Tightening)
- [x] Confirmed missing parity behavior from legacy:
  - selecting a component should auto-create/move to next step from settings route (not manual button)
  - root selection should immediately seed next configured step
  - component imagery is first-class in old and provided UI, must be rendered in selection cards.
- [x] Implemented route-driven auto next-step append on component selection:
  - precedence: `redirectUid` override -> settings route -> item-type custom fallback title map.
- [x] Removed manual "Add Next Step" dependency from workflow and aligned with automatic progression behavior.
- [x] Added image rendering for root and step components in workflow cards (including selected-state presentation).
- [x] Tightened item workflow visuals toward provided invoice-editor card standard:
  - stronger active card treatment
  - step chip rail styling
  - image-first component card layout.
- [x] Re-validated behavior paths manually in implementation logic:
  - root component pick creates first + next step
  - mid-flow component change rewires subsequent step where route diverges
  - autosave/manual save toggle path untouched by this batch.
- [x] Updated backend step routing root resolution to be configuration-driven:
  - `rootStepUid` now resolves from configured route root component UIDs first
  - fallback to step id `1` only when no configured root match is found.

Validation note:
- Project-level `tsc` remains red due large pre-existing repository type errors outside new-sales-form scope; no new syntax errors remain in the modified workflow file after correction.
- Re-ran targeted API parity tests after routing query update:
  - `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts`
  - `3 pass, 0 fail`.

### 2026-02-24 Batch P1-4 (In Progress - Remaining 3 Priorities)
- [x] Hidden/auto step recursion parity:
  - auto-advance recursive routing after selection for route-only intermediary steps
  - skip/auto-fill behavior for low-choice intermediary steps.
- [x] Modal parity (excluding print preview):
  - added door details modal flow (dimension, swing, qty, totals)
  - added moulding calculator modal flow (length/waste/pieces computation).
- [x] UI fidelity polish:
  - header action bar styling and control grouping
  - invoice overview panel fidelity
  - mobile summary drawer/sheet style improvement.

Implementation notes:
- `item-workflow-panel` now applies route recursion after each selection:
  - selected component sets current step
  - next step is resolved from route settings
  - intermediary route steps with no components are traversed
  - intermediary steps with one candidate or hidden-auto titles are auto-selected and progressed recursively.
- Added workflow modals:
  - `workflow-modals.tsx` with `DoorDetailsDialog` and `MouldingCalculatorDialog`
  - wired into active line workflow toolbar buttons by item type.
- UI updates:
  - redesigned `header-actions` as grouped control bar
  - improved `invoice-overview-panel` card hierarchy
  - upgraded mobile summary overlay presentation in `new-sales-form.tsx`.

Validation note:
- `tsc` output filtered to modified new-sales-form files returned no new errors for:
  - `item-workflow-panel.tsx`
  - `workflow-modals.tsx`
  - `header-actions.tsx`
  - `invoice-overview-panel.tsx`
  - `new-sales-form.tsx`

### 2026-02-24 Batch P1-5 (In Progress - User-Requested Missing Logic)
- [x] Item-type route pill prebuild parity:
  - on root item-type selection (component UID), fetch configured route from settings
  - prebuild and display all route steps as pills immediately
  - open/focus next step automatically.
- [x] Step click progression parity:
  - when component is selected on current step, automatically focus next prebuilt step.
- [x] Services custom section parity:
  - show service line-item editing surface (old-form style behavior) instead of generic component flow where applicable.
- [x] Shelf items custom section parity:
  - show shelf-items custom section/editor (old-form style behavior) instead of generic component flow where applicable.

Implementation details:
- Root component selection now builds full configured step sequence from settings route (`composedRouter[componentUid].routeSequence`) and renders that full sequence in the step pills immediately.
- Next-step focus now defaults to the next sequential prebuilt step after a component pick.
- Service item flow now surfaces a dedicated line-item editor (title/description/qty/unit/line total) when active step is `Line Item`.
- Shelf item flow now surfaces a dedicated shelf row editor with add/remove row controls and per-row qty/price/total behavior when active step is `Shelf Items`.

Validation note:
- Filtered `tsc` check for touched `new-sales-form` files produced no new hits for the modified files in this batch.

### 2026-02-24 Patch Note (Image Rendering Parity)
- [x] Fixed component image rendering mismatch with old form:
  - old form resolves stored image keys via Cloudinary base URL (`${NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/<imgKey>`)
  - new workflow now applies equivalent URL resolution for:
    - root component cards
    - step component cards
    - selected-step preview image.

### 2026-02-24 Batch P1-6 (In Progress - Pixel-Perfect UI Pass)
- [x] Align invoice shell layout, spacing, and card hierarchy to provided sample.
- [x] Improve customer and summary visual structure to sample-style card patterns.
- [x] Ensure mobile-responsive behavior is sample-like:
  - summary/overview content is collapsible on mobile
  - right-side overview remains desktop side panel.

Implemented UI changes:
- `new-sales-form.tsx`
  - desktop keeps right-side overview panel (`lg:block`) when enabled
  - mobile uses in-page collapsible summary section (toggleable, animated) instead of modal overlay
  - header mobile-summary action now toggles collapse state.
- `sections/invoice-overview-panel.tsx` (contains customer profile summary block)
  - updated to card-style sample hierarchy (search block + selected customer block)
  - stronger labels, card backgrounds, and row spacing for sample fidelity.
- `sections/invoice-overview-panel.tsx`
  - grouped metadata, notes, extra-costs, and totals into bordered sample-style card sections.

Validation:
- Filtered `tsc` check for touched files returned no matching errors for:
  - `new-sales-form.tsx`
  - `sections/invoice-overview-panel.tsx` (customer profile + invoice summary)
  - `sections/invoice-overview-panel.tsx`
  - `sections/header-actions.tsx`
  - `sections/invoice-overview-panel.tsx`

### 2026-02-24 Patch Note (Invoice Summary Sidebar)
- [x] Added dedicated invoice summary sidebar container following provided sample pattern:
  - desktop: right-side sticky sidebar with header + close/hide action
  - mobile: slide-over sidebar with backdrop overlay and close action.
- [x] Sidebar now hosts only `InvoiceOverviewPanel` with sample-structured invoice summary sections (`sections/invoice-summary-sidebar.tsx`).
- [x] Main form layout updated to work with sidebar shell and overview toggles in `new-sales-form.tsx`.

### 2026-02-24 Batch P1-7 (In Progress - Strict Sample Layout Structure)
- [x] Forced right-side summary layout on desktop using a true two-pane shell:
  - `main` content column
  - right summary sidebar as sibling pane.
- [x] Updated summary sidebar behavior to match sample structure:
  - desktop: always-visible right pane
  - mobile: slide-over panel with backdrop.
- [x] Reworked top header structure to sample-like header bar instead of card block.
- [x] Added sample-like mobile sticky bottom action bar (`Review Totals` + `Finalize`).
- [ ] Remaining strict parity items:
  - exact token-level spacing/typography parity against sample across all rows
  - exact bottom desktop footer action row parity (separate from top header controls).

### 2026-02-24 Patch Note (Exact Invoice Summary Content Structure)
- [x] `InvoiceOverviewPanel` now mirrors requested content sections:
  1. Customer Profile
  2. Global Invoice Details
  3. Totals & Pricing (Entire Invoice)
  4. Customer Credit Limit
- [x] Added sample-style visual structure inside summary:
  - icon/title heading block
  - customer profile with change/search mode layout
  - global details two-row grid inputs/selects
  - totals card with tax group + labor + add-on + highlighted grand total
  - credit limit progress strip with used/limit display.
- [x] Customer profile card is now collapsible for billing/shipping detail visibility (show/hide on toggle).

### 2026-02-24 Patch Note (Default Item Workflow Row)
- [x] Enforced one default line item on record hydration when payload line items are empty.
- [x] Because active item is set from first line during hydrate, item workflow now opens with one item by default.

### 2026-02-24 Patch Note (Item Type Step Series Injection)
- [x] Added explicit first-step (`Item Type`) selection logic:
  - when selected, fetches configured route sequence for selected component UID
  - injects full step series into step pills immediately
  - opens next step after `Item Type` by default.

### 2026-02-24 Legacy Engine Deep-Dive (Analysis Only, No New Runtime Changes)
- Scope reviewed:
  - `app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/step-helper.tsx`
  - `.../_utils/helpers/zus/step-component-class.ts`
  - `.../_utils/helpers/zus/settings-class.ts`
  - `.../_utils/helpers/zus/costing-class.ts`
  - `.../_utils/helpers/zus/group-form-class.ts`
  - `.../_utils/helpers/zus/service-class.ts`
  - `.../_utils/helpers/zus/moulding-class.ts`
  - `.../_utils/helpers/zus/hpt-class.ts`
  - `app/(v2)/(loggedIn)/sales-v2/form/_hooks/use-step-items.tsx`
  - `app/(v2)/(loggedIn)/sales-v2/form/_action/get-next-dyke-step.ts`
  - `_common/use-case/step-component-use-case.ts`
  - `_common/utils/sales-step-utils.ts`
- Confirmed legacy filter model for step components:
  - base component list is loaded per step via `getStepComponentsUseCase(stepTitle, stepId)` (TRPC/API `sales.getStepComponents` equivalent).
  - visibility is computed in client (`StepHelperClass.isComponentVisible`) from per-component `variations.rules[]`:
    - each rule points to prior `stepUid` + allowed/disallowed `componentsUid[]` + operator (`is` / not-is semantics).
    - component marked visible only when a variation rule-set matches currently selected prior-step component UIDs.
  - route/section overrides merge into effective config via `SettingsClass.getRouteConfig()`:
    - base from `composedRouter[rootComponentUid].config`
    - overridden by first active `sectionOverride` on selected steps (`overrideMode`).
- Confirmed legacy pricing model:
  - each visible component is re-priced in `filterStepComponents()`:
    - `basePrice = getComponentPrice(componentUid)`
    - `salesPrice = calculateSales(basePrice)` unless `_metaData.custom`.
  - `getComponentPrice()` resolves by dependency pricing matrix:
    - no deps: default component price bucket
    - with deps: key is joined selected dependency component UIDs (`uid1-uid2-...`).
  - multiplier/profile logic and totals live in `CostingClass` (`salesMultiplier`, tax, labor, extra costs, group totals).
- Confirmed multi-select behavior boundaries:
  - multi-select step titles: `Door`, `Moulding`, `Weatherstrip Color`.
  - `ComponentHelperClass.selectComponent()` branches:
    - Moulding-path writes to `groupItem.form[componentUid]`, toggles selected state, updates `itemIds`, qty totals, grouped pricing.
    - non-moulding single-select writes selected component into current step form then advances route.
  - Door/HPT group form is managed by `HptClass` with per-size selections (`doorUid-size`) and supplier/size price dependency keys.
  - Service lines use `ServiceClass` group forms (`groupItem.form[lineUid]`) with add/remove/selected and pricing metadata.
- Confirmed next-step resolution precedence in legacy:
  - settings route (`composedRouter`) + redirect UID override first (`SettingsClass.getNextRouteFromSettings`).
  - when missing, fallback scans prior steps for unresolved route candidates.
  - v2 custom action adds door-type specific overrides (`Bifold`, `Moulding`, `Services`, `Door Slabs Only`, etc.) and hidden-step recursion auto-advance.
- Implementation implications for new-sales-form (must port before claiming parity):
  - apply variation-rule visibility filtering against selected prior-step components before rendering selectable components.
  - compute component pricing through dependency matrices (not static salesPrice) using selected step-path keys.
  - support multi-select group flows for moulding/door/weatherstrip and preserve groupItem qty/pricing math.
  - keep service/shelf branch behavior distinct from door/moulding paths.
  - keep route config + section override merge semantics identical to legacy for `noHandle`, swing behavior, production/shipping flags, and shelf line-item behavior.

### 2026-02-24 Patch Note (Header Dropdown Menu)
- [x] Added post-`Save Final` dropdown menu in header actions.
- [x] Left non-settings actions as placeholders (non-functional) for now.
- [x] Wired `Settings` menu option to open existing sales form settings sheet modal.

## 1) Mission and Constraints

### Mission
Rebuild sales form flows with **exact legacy business behavior** and **UI fidelity** to reference design, while using fully new architecture/code.

### Non-negotiable constraints
1. Exact business logic parity for:
   - create order
   - create quote
   - edit order
   - edit quote
2. No dependency on legacy form implementation modules/classes.
3. UI and interaction fidelity to:
   - `ai/designs/sales-form/sales-invoice-editor.tsx`
   - `ai/designs/sales-form/sales-door-details.tsx`
   - `ai/designs/sales-form/moulding-calculator-modal.tsx`
   - `ai/designs/sales-form/sales-invoice-print-preview.tsx`
4. Fully connected through TRPC (`newSalesForm` namespace).
5. Autosave required with conflict-safe version control.

## 2) Scope

### In scope
- New API contracts and query layer.
- New frontend form architecture.
- New routes under sidebar sales.
- Migration/cutover plan and parity validation.

### Out of scope
- Refactoring unrelated legacy sales modules.
- Replatforming unrelated dashboards/tables.

## 3) Canonical Paths

### Backend
- Schemas: `apps/api/src/schemas/new-sales-form.ts`
- Queries: `apps/api/src/db/queries/new-sales-form.ts`
- Router: `apps/api/src/trpc/routers/new-sales-form.route.ts`
- Router registry: `apps/api/src/trpc/routers/_app.ts`

### Frontend module
- Root: `apps/www/src/components/forms/new-sales-form`
- Main orchestrator: `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx`
- API hooks: `apps/www/src/components/forms/new-sales-form/api.ts`
- Mappers: `apps/www/src/components/forms/new-sales-form/mappers.ts`
- Store: `apps/www/src/components/forms/new-sales-form/store.ts`
- Autosave: `apps/www/src/components/forms/new-sales-form/use-auto-save.ts`
- Typed schema: `apps/www/src/components/forms/new-sales-form/schema.ts`
- Sections:
  - `apps/www/src/components/forms/new-sales-form/sections/header-actions.tsx`
  - `apps/www/src/components/forms/new-sales-form/sections/status-strip.tsx`
  - `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
  - `apps/www/src/components/forms/new-sales-form/sections/line-items-panel.tsx`
  - `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`

### Routes
- `apps/www/src/app/(sidebar)/(sales)/sales-form/layout.tsx`
- `apps/www/src/app/(sidebar)/(sales)/sales-form/create-order/page.tsx`
- `apps/www/src/app/(sidebar)/(sales)/sales-form/create-quote/page.tsx`
- `apps/www/src/app/(sidebar)/(sales)/sales-form/edit-order/[slug]/page.tsx`
- `apps/www/src/app/(sidebar)/(sales)/sales-form/edit-quote/[slug]/page.tsx`

### Navigation touched
- `apps/www/src/components/sidebar/links.ts`

## 4) What Is Implemented Already

### Implemented backend foundation
1. TRPC contracts for bootstrap/get/search/recalculate/saveDraft/saveFinal/deleteLineItem.
2. Query layer persists `SalesOrders` + `SalesOrderItems` and stores versioned form meta in `salesOrders.meta.newSalesForm`.
3. Conflict detection exists (`CONFLICT`) when stale version is saved.

### Implemented frontend foundation
1. Typed IO via `RouterInputs`/`RouterOutputs` wrappers.
2. Normalization and save payload composition.
3. Zustand store for record + save states.
4. Autosave queue/debounce single-flight behavior.
5. Route pages wired to new form component.

### Known truth
Current implementation is scaffold-level and **not parity complete**.

## 5) Legacy Behavior Sources (Do Not Import, But Must Reproduce)

Primary behavior references:
- `apps/www/src/components/forms/sales-form/sales-form.tsx`
- `apps/www/src/components/forms/sales-form/sales-form-save.tsx`
- `apps/www/src/components/forms/sales-form/sales-meta-form.tsx`
- `apps/www/src/components/forms/sales-form/sales-customer-input.tsx`
- `apps/www/src/components/forms/sales-form/customer-data-section.tsx`
- `apps/www/src/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/sales-form-dta.ts`
- `apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/save-sales/*`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/*`
- `apps/api/src/db/queries/sales-form.ts`
- `apps/api/src/db/queries/customer.ts`

## 6) Phase 0 Gap Audit Matrix

Status key: `missing`, `partial`, `done`

| Requirement | Legacy Source | New Target | Status | Validation |
|---|---|---|---|---|
| Create order defaults parity | `sales-form-dta.ts` | API query + mappers | partial | default payload diff test |
| Create quote defaults parity | `sales-form-dta.ts` | API query + mappers | partial | default payload diff test |
| Edit hydration parity | `sales-form-dta.ts`, `zus-form-helper.ts` | API get + mappers/store | partial | known order/quote fixture diff |
| Save action parity (`default/close/new`) | `sales-form-save.tsx` | new orchestrator/routes | partial | save-guard parity (customer + non-empty lines) and clean navigate behavior for close/new implemented; full side-effect parity still pending |
| Save side effects (history/stats/extra costs) | `sales-form-save.tsx` | save mutations/query layer | missing | mutation side-effect assertions |
| Customer lookup/select parity | `sales-customer-input.tsx`, `customer-data-section.tsx` | customer panel + API | partial | search/select matrix |
| Profile/tax/payment side effects parity | `SettingsClass`, `costing-class.ts` | store/mappers/api | partial | profile/tax change recalculation tests |
| Payment term/due date behavior | `sales-meta-form.tsx`, `sales-utils.ts` | summary panel + API | partial | payment term control now exposed in summary panel; due-date parity engine still pending |
| Good-until quote behavior | `sales-meta-form.tsx` | summary panel + API | partial | quote-only `goodUntil` control now exposed in summary panel; scenario tests still pending |
| Delivery mode parity | `sales-meta-form.tsx` | summary panel/store | partial | delivery option control now exposed in summary panel; persistence tests still pending |
| Extra costs + labor calc parity | `sales-meta-form.tsx`, `costing-class.ts` | store/mappers + API | partial | multi-cost total parity tests |
| Item engine parity (door/moulding/service/HPT) | `context.tsx`, `zus/*-class.ts` | new domain engine files | partial | relation mapping/persistence implemented in `getNewSalesForm` + `saveNewSalesFormInternal`; targeted round-trip tests added/passing; step-oriented workflow panel + dynamic step component fetch now started in UI; full route/custom-step/modals parity pending |
| Supplier/component workflow parity | `sales-form.ts` + legacy modals | API + new modals/sections | missing | CRUD + propagation checks |
| Print preview parity | legacy preview/print paths | new print modal + payload | missing | visual/data compare |
| Autosave reliability + stale recovery | legacy watch + manual save semantics | autosave hook + UI | partial | concurrency/network tests |
| UI fidelity to invoice editor | `sales-invoice-editor.tsx` | new orchestrator/sections/modals | missing | screenshot/state checklist |
| Modal fidelity (door/calculator/print) | reference modal files | `new-sales-form/modals/*` | missing | modal behavior checklist |
| Route coverage | legacy form routes | `/sales-form/*` | partial | 4-route smoke tests |
| Navigation active states | `sidebar/links.ts`, `sales-nav.tsx` | same | partial | nav highlighting checks |

## 7) Priority Backlog (Must-Have Order)

### P0 (Parity blockers)
1. Rebuild domain engine parity:
   - customer/profile/tax/payment defaults and side effects
   - extra costs and labor calculations
   - delivery/payment term/good-until logic
2. Rebuild save semantics parity:
   - save/default/close/new behavior
   - side effects (history/stat/extra-costs)
3. Implement full item workflow parity:
   - door/HPT/moulding/service flows

### P1 (UI fidelity blockers)
1. Refactor `new-sales-form.tsx` to mirror `sales-invoice-editor.tsx` structure/states.
2. Build modal parity components and wire data:
   - door details
   - moulding calculator
   - print preview

### P2 (Hardening)
1. End-to-end parity tests for 4 form flows.
2. Conflict and autosave stress tests.
3. Route/navigation finalization and cutover.

## 8) Implementation Protocol (For Any Thread)

When a new thread picks this up:
1. Read this file first.
2. Confirm alignment with the clean-code dependency chain listed in `Priority Focus (Current)` before implementing parity work.
3. Pick a subset of rows from the gap matrix.
4. Update row statuses and validation notes in this file before/after edits.
5. Do not mark `done` without a concrete validation step.
6. Keep all new code inside `new-sales-form` module/API namespace.
7. Record all important implementation notes and decisions in this file before ending the thread.

## 9) Validation Checklist

### Functional
- Create order parity
- Create quote parity
- Edit order parity
- Edit quote parity

### Save flows
- Save draft/default
- Save & close
- Save & new
- Save final
- Refresh consistency

### Autosave
- Debounce queue behavior
- In-flight coalescing
- Stale conflict handling
- Offline/error retry UX

### UI fidelity
- Header/actions/status
- Item workflow sections
- Summary behavior
- Modal parity
- Mobile responsiveness

## 10) Cutover Criteria
Do not cut over legacy entry points until:
1. All P0 rows are `done`.
2. UI fidelity rows are `done`.
3. Save/autosave/parity validation passes for all 4 flows.

## 11) Changelog (Plan-Level)
- 2026-02-24: Master handoff plan consolidated with full matrix and execution protocol.
- 2026-02-24: Priority focus updated to clean-code sales-book edit-order dependency chain (`getSalesBookFormUseCase -> getTransformedSalesBookFormDataDta -> getSalesBookFormDataDta -> SalesBookFormIncludes`); added mandatory plan-maintenance rule for important updates every substantive thread.
- 2026-02-24: Implemented core relational parity pass for line-item `formSteps`, `shelfItems`, `housePackageTool`/`doors`/`molding` in new-sales-form API get/save paths and preserved these fields in frontend normalizers.
- 2026-02-24: Added and passed targeted relational round-trip tests for new-sales-form API (`bun test apps/api/src/db/queries/new-sales-form.test.ts`).
- 2026-02-24: Added and passed multi-line mixed parity test coverage for door/shelf/service line boundaries (`bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts`).
- 2026-02-24: Completed first UI parity pass for summary metadata controls and advanced line-item detail editors; added save-guard behavior parity for required customer/line-items and fixed close/new navigation when not dirty.
- 2026-02-24: Added detailed pre-implementation architecture brief documenting legacy step-engine mechanics (route-driven per-item step progression with dynamic step component fetch) and the mandatory provided UI pattern contract/modals to guide the next UI rebuild batch.
- 2026-02-24: Started step-engine UI rebuild with a new step-oriented workflow panel, active-step component loading (`sales.getStepComponents`), and editor-shell state wiring for overview/mobile-summary behavior.
- 2026-02-24: Added `newSalesForm.getStepRouting` API and wired first route-based step progression controls in the new UI (root step bootstrap + add-next-step by composed route).
- 2026-02-24: Added autosave on/off UI toggle and updated autosave hook semantics so manual flush/save still persists while debounce autosave is disabled.
- 2026-02-24: Replaced dependency on legacy app-deps form-settings modal for new-sales-form Settings action with a new modal in `components/modals` (`new-sales-form-settings-modal.tsx`) that preserves section route-sequence editing, per-section config toggles (`noHandle`, `hasSwing`, `production`, `shipping`, `shelfLineItems`), drag-sort step ordering, create-step mutation, and save via `saveSalesSettingUseCase`.
- 2026-02-24: Fixed settings modal data source for new-sales-form: removed legacy form-store dependency (`useFormDataStore`) and now hydrate from `newSalesForm.getStepRouting`; save now uses TRPC `settings.updateSetting` (`type: sales-settings`) to keep new form settings flow isolated from old form runtime dependencies.
- 2026-02-24: Fixed missing step-list rendering in settings sequence rows by aligning route-shape handling and step-option normalization:
  - API `getNewSalesFormStepRouting` now supports both settings meta shapes (`meta.route` and `meta.data.route`) when composing router.
  - Modal step options now filter to valid titled steps (excluding root and `--` variants), so route step dropdowns consistently render readable options.
- 2026-02-24: Updated invoice summary responsive behavior and header controls:
  - summary sidebar now defaults collapsed for `lg` and below and remains pinned only at `xl+`.
  - added header toggle button (`Invoice Summary`) for `lg` and below.
  - removed duplicated inner `Invoice Summary` title block from overview panel and applied that visual title style to the sidebar header title.
- 2026-02-24: Settings modal UI alignment polish:
  - normalized step-sequence row layout so step select, drag handle, and delete action align consistently (`minmax(0,1fr)` + fixed `size-8` controls + removed extra select horizontal margin).
- 2026-02-24: Settings visual parity update:
  - each root section now renders its root-component image before the section title.
  - enforced uppercase display for section titles and settings component lists (step options + section add-list labels).
- 2026-02-24: Layout stability update:
  - new-sales-form shell height now uses `calc(100dvh - var(--header-height, 5rem))` to respect main header height and reduce viewport flicker.
- 2026-02-24: Root step component rendering correction in new-sales-form workflow panel:
  - root selection cards now show only components active in settings route (`composedRouter` keys).
  - image resolver now handles both raw file names and `dyke/...` paths to prevent incorrect/doubled image URL construction.
- 2026-02-24: Root image-source parity correction:
  - aligned `newSalesForm.getStepRouting` with old-form image precedence by selecting and prioritizing `dykeStepProducts.img` before fallback to `product.img` / `door.img`, preventing stale root component thumbnails from old product media.
- 2026-02-24: Step-component filter engine migration started in new workflow panel:
  - added variation-rule visibility filtering aligned to legacy `StepHelperClass.isComponentVisible` semantics (`rules.stepUid`, `rules.operator`, `rules.componentsUid`, OR across variations + AND within rule set).
  - added dependency-price resolution hooks on component payload (`priceStepDeps`/pricing buckets) to support path-key pricing when present; current payload may still need dedicated pricing API to reach full legacy parity.
- 2026-02-24: Pricing payload wired in API component loader (`sales.getStepComponents`):
  - loader now fetches `dykePricingSystem` rows for returned `stepProductUid` values and composes pricing matrix per component (`pricing[dependenciesUid || componentUid] -> { id, price }`).
  - component payload now includes `priceStepDeps` (from `step.meta.priceStepDeps`) and `pricing` map, plus default `basePrice`/`salesPrice` from component-default pricing bucket when available.
  - this unblocks dependency-path price resolution in new-sales-form component selection UI.
- 2026-02-24: Removed `Door Details` button/surface from new item workflow action bar per current UI direction.
- 2026-02-24: Component-card display update in workflow:
  - removed UID text from root and step component cards.
  - added explicit pricing line on each component card with fallback text when no price is available.
- 2026-02-24: Visibility/price parity refinement:
  - root item-type cards now load from `sales.getStepComponents` (not static routing list) so pricing/variation metadata is available on root selection.
  - root cards remain restricted to settings-active route keys and now use the same variation visibility + dependency-price resolver path as regular step component cards.
- 2026-02-24: Default custom-component visibility rule:
  - custom components are now hidden by default in new workflow component selection lists (root + step component grids).
- 2026-02-24: Legacy multi-select deep-dive completed (doors + mouldings), implementation spec captured:
  - Multi-select step titles in legacy are explicitly bounded (`Door`, `Moulding`, `Weatherstrip Color`) via `StepHelperClass.isMultiSelectTitle`.
  - Moulding flow:
    - selection state is stored under `groupItem.form[lineUid]` with `selected` flags and reflected in `groupItem.itemIds`.
    - selecting/unselecting mouldings updates qty totals and grouped pricing (`updateGroupedCost` + `calculateTotalPrice`).
    - UI is two-part:
      - selectable moulding popover (`SelectMoulding` with filtered visible components),
      - line-item table (`MouldingContent`) editing qty/addon/custom price with per-line estimate composition.
  - Door/HPT flow:
    - selected doors are multi-selected as door-size lines keyed by `doorUid-size` path.
    - each selected size line persists in `groupItem.form[path]` with qty (lh/rh/total), swing, unit labor, addon/custom price, and per-line itemPrice.
    - route config (`noHandle`, `hasSwing`) changes required inputs and qty math.
    - supplier-aware pricing key behavior exists (`size & supplierUid`) when supplier is set.
  - Shared grouped-state mechanics:
    - grouped forms use `GroupFormClass` helpers for deep form updates.
    - item removal is soft-select (`selected=false`) or line removal from `itemIds` + form map cleanup.
  - Pricing composition rules used by both:
    - line estimate = component stack + selected item price + flat/addons/custom overrides.
    - grouped totals roll into item totals, then global pricing/tax/labor pipeline in `CostingClass`.
- 2026-02-24: New-form multi-select workflow started in `item-workflow-panel` for legacy multi-select step titles (`Door`, `Moulding`, `Weatherstrip Color`):
  - clicking a component now toggles membership in `formSteps[n].meta.selectedProdUids` instead of forcing single-selection overwrite.
  - step card highlight now reflects selected membership from `selectedProdUids`.
  - step value/price for multi-select steps is now composed from selected components (primary display + aggregate step price).
  - when first selection exists, route recursion continues from the first selected component to keep next configured step active; when all selections are cleared, downstream generated steps are trimmed.

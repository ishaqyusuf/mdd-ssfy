# Legacy Sales Form Mobile + Architecture Execution Plan

Date: 2026-04-16
Owner: Sales Form Team
Status: Proposed

## Objective

Modernize the active legacy sales form without a big-bang rewrite by combining:

- clean mobile-responsive UX
- domain-oriented frontend re-architecture
- class/helper centralization behind adapters
- save-flow separation into cleaner client/server boundaries

This plan is for the active legacy form, not the `new-sales-form` parity stream.

## Scope

- `apps/www/src/components/forms/sales-form/*`
- `apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/*`
- current legacy save orchestration and related post-save side effects
- mobile UX for HPT/house package, moulding, service lines, shelf items, and item/step navigation

## Non-Goals

- full business-logic rewrite of legacy pricing/controllers
- immediate package extraction of the legacy sales form
- merging this effort into `new-sales-form` parity closure

## Design Direction

### Core UX Direction

- The form should feel like an editor, not a dashboard.
- Mobile should focus on one active invoice item at a time.
- Visual hierarchy should rely on spacing and typography instead of noisy card stacks.
- Step navigation should be lightweight and fast.
- Specialized steps must feel native on mobile rather than desktop tables compressed onto a phone.

### Mobile Interaction Rules

- Only one invoice item is actively edited on mobile.
- Item switching happens from a top action dropdown/select.
- Step switching happens from `flex-wrap gap` CTA buttons that show step labels only.
- When a component is selected, the UI shows only the selected value, not `Label: Value`.
- Long selected values should line-clamp and stay within roughly half the mobile viewport width.
- Summary/history move into a flatter side sheet rather than competing with the item canvas.

### Visual Cleanup Rules

- Remove card-on-card composition from the main form shell.
- Reduce borders to structural dividers only.
- Remove non-essential shadows and decorative gradients.
- Keep one calm page surface with minimal chrome.
- Keep `Save` as the primary persistent action; secondary actions move into overflow or sheet.

## Target Frontend Architecture

Adopt a modular-monolith domain boundary for the legacy form:

```text
apps/www/src/domains/sales-form/legacy/
  index.ts
  shell/
  item-editor/
  step-navigation/
  summary/
  state/
    hooks/
    adapters/
    selectors/
  steps/
    hpt/
    moulding/
    service/
    shelf-items/
    takeoff/
    components/
  lib/
    legacy-controllers/
    legacy-helpers/
    utils/
  modals/
  types/
```

## Component and Folder Ownership

### `shell/`

- page frame
- header actions
- sidebar/sheet shell
- save button surface
- form watcher/footer

### `item-editor/`

- invoice item selector
- active item canvas
- item actions menu
- item title/edit affordances
- selected component preview display

### `step-navigation/`

- step CTA row
- active-step state
- active-step content panel

### `summary/`

- customer block
- metadata fields
- cost summary
- extra costs
- history panel

### `steps/*`

- one bounded UI home per step family
- HPT/house package
- moulding
- service
- shelf items
- takeoff
- shared step-specific components

### `state/`

- React-facing hooks
- adapters around legacy classes/helpers/store
- selectors for active item, steps, and pricing presentation

### `lib/legacy-controllers/`

- centralized home for current legacy classes that still drive behavior

## Legacy Class Strategy

Do not delete or rewrite all classes immediately. Re-home them and put adapters in front of them.

### Cross-Form Legacy Controllers

- `SettingsClass` -> `lib/legacy-controllers/settings-controller.ts`
- `ItemClass` -> `lib/legacy-controllers/item-controller.ts`
- `step-component-class` / `StepHelperClass` -> `lib/legacy-controllers/step-controller.ts`
- `CostingClass` -> `lib/legacy-controllers/costing-controller.ts`
- `GroupFormClass` -> `lib/legacy-controllers/group-form-controller.ts`

### Step-Specific Controllers

- `HptClass` -> `steps/hpt/lib/hpt-controller.ts`
- `MouldingClass` -> `steps/moulding/lib/moulding-controller.ts`
- `ServiceClass` -> `steps/service/lib/service-controller.ts`

### Legacy Helpers

- `zus-form-helper` -> `lib/legacy-helpers/zus-form-helper.ts`
- `zus-step-helper` -> `lib/legacy-helpers/zus-step-helper.ts`
- `legacy-dyke-form-helper` -> `lib/legacy-helpers/legacy-dyke-form-helper.ts`
- `hpt-helper` -> `lib/legacy-helpers/hpt-helper.ts`

### UI Dependency Rule

No newly touched UI component should instantiate legacy classes directly. UI should consume hooks/adapters only.

Preferred direction:

- UI component
- domain hook
- adapter
- legacy controller/helper
- store

## Save Logic Direction

Current save orchestration is too close to the view layer. Move to four layers:

1. UI action surface
2. client application save service
3. server save boundary
4. post-save client effects

### Target Save Structure

```text
apps/www/src/domains/sales-form/legacy/
  application/
    build-save-payload.ts
    save-sales-form.ts
    handle-save-result.ts
  server/
    save-sales-form.server.ts
    save-sales-form.types.ts
  state/hooks/
    use-save-sales-form.ts
```

### Save Refactor Goals

- normalize save response contract
- centralize validation/redirect branching
- centralize query invalidation and toast handling
- isolate event/task side effects
- keep server-side pricing authoritative
- keep save transaction safety aligned with the hardening plan

## Design Checklist

### Shell

- [ ] Remove noisy wrapper cards and excessive borders
- [ ] Keep one calm page background
- [ ] Keep `Save` as the primary persistent action
- [ ] Move secondary actions into overflow or sheet

### Item Focus

- [ ] Show one active invoice item on mobile
- [ ] Add top action selector: `Item 1`, `Item 2`, etc
- [ ] Move item actions into a compact action menu

### Step Navigation

- [ ] Replace bulky step headers with wrapped CTA chips/buttons
- [ ] Show step label only on each CTA
- [ ] Clicking a CTA shows only that step content

### Selected Component Value

- [ ] Show selected value only
- [ ] Remove inline label/value duplication
- [ ] Clamp long values on mobile

### Summary Sheet

- [ ] Flatten summary styling
- [ ] Use one-column metadata layout on small screens
- [ ] Convert cost summary to stacked rows

### HPT / House Package

- [ ] Replace mobile door tabs with a selector
- [ ] Show one door at a time on mobile
- [ ] Use stacked editable rows instead of compressed table patterns

### Moulding / Service / Shelf Items

- [ ] Use flatter mobile rows instead of heavy cards
- [ ] Keep add-line/add-product actions thumb-friendly
- [ ] Preserve readable totals and actions without horizontal overflow

## Execution Phases

### Phase 0: Guardrails and Plan Lock

- confirm active entrypoints and import graph
- capture current screenshots and behaviors
- freeze core non-regression flows

### Phase 1: Domain Root and Stable Entrypoint

- create `domains/sales-form/legacy`
- re-export the current shell through one canonical entrypoint

### Phase 2: Shell Re-Home

- move/wrap shell files under `shell/`
- keep behavior unchanged

### Phase 3: Centralize Classes and Helpers

- re-home legacy classes/helpers
- normalize imports
- avoid logic rewrites

### Phase 4: Add Adapters and Hooks

- introduce `state/hooks` and `state/adapters`
- stop direct class construction in top-level UI

### Phase 5: Flatten Shell UI

- reduce cards/borders/shadows
- simplify header action model

### Phase 6: Active Item Editing Model

- add invoice item selector
- render one active item at a time on mobile
- move item actions into menus

### Phase 7: Step CTA Navigation

- replace step header chrome with wrapped CTA buttons
- show only active step content

### Phase 8: Selected Component Value Cleanup

- show value only
- clamp long values

### Phase 9: Summary Sheet Cleanup

- flatten summary panel
- simplify metadata and totals presentation

### Phase 10: Save Logic Refactor

- extract `useSaveSalesForm`
- add typed save boundary
- separate post-save side effects

### Phase 11: HPT Mobile Refactor

- move HPT into its own step domain
- replace mobile tabs with selector
- clean mobile row editing

### Phase 12: Moulding and Service Refactor

- move to dedicated step domains
- align mobile row patterns

### Phase 13: Shelf Items Refactor

- move to dedicated step domain
- flatten section/product layout for mobile

### Phase 14: Takeoff Isolation

- move takeoff into its own step domain
- keep it from polluting the primary item editor

### Phase 15: Modal and Import Cleanup

- re-home modal entrypoints
- normalize imports through the new domain

### Phase 16: QA and Cleanup

- mobile/tablet/desktop responsive validation
- save-path validation
- remove dead wrappers and transitional imports

## Acceptance Criteria

### UX

- no horizontal scrolling on phone widths
- one active invoice item is always obvious on mobile
- step CTAs wrap cleanly
- selected component values do not break layout
- HPT, moulding, service, and shelf steps remain editable and readable on mobile

### Architecture

- legacy sales-form code has one canonical domain root
- classes/helpers are centralized and no longer scattered
- touched UI components do not instantiate legacy classes directly
- save orchestration is no longer owned by a button component

### Reliability

- save flows still support default / close / new
- query invalidation and post-save effects remain correct
- server-authoritative save behavior remains aligned with hardening requirements

## Related Brain Docs

- `brain/sales-form-system-hardening-plan.md`
- `brain/new-sales-form-missing-features-execution-plan.md`
- `brain/plans/ongoing.md`
- `brain/tasks/in-progress.md`

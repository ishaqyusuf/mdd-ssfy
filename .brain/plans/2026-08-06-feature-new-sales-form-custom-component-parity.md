# New Sales Form Custom Component Parity

Status: Implemented 2026-08-06

## Objective

Bring the legacy sales form's step-level Custom component workflow into the new
sales form as an entry-only selection path. Custom catalog entries remain hidden
from ordinary component grids, can be searched or created from the Custom action,
appear in the grid only while selected, and disappear as soon as they are cleared
or replaced by a standard component.

## Findings

- The legacy form gates the Custom action with the active step form's
  `meta.custom` setting; it is not literally enabled on every route step.
- The legacy `CustomComponentForm` already provides a shared autocomplete that:
  searches previously saved custom components for the active step, supports a
  new title, hydrates an existing cost price, upserts on Proceed, and archives
  catalog options without changing historical sales snapshots.
- The new dashboard form already uses the same autocomplete and the existing
  `inventories.upsertDykeCustomStepComponent` /
  `inventories.archiveDykeCustomStepComponent` mutations.
- Shared new-form visibility already hides unselected custom components and can
  retain a selected custom snapshot even when the current catalog query no
  longer returns it.
- The remaining behavioral gaps are:
  - the `Enable Custom: On/Off` picker action can reveal all custom components;
  - multi-select mutation logic can retain a custom alongside standard choices;
  - there is no canonical custom deselection action for single-select steps;
  - the cost-price field is always rendered instead of being step-applicable;
  - `price: null` currently leaves an old pricing row unchanged because the API
    only writes when `price != null`;
  - the custom controller is embedded in the large dashboard workflow panel and
    has limited focused regression coverage.

## Assumptions

- Custom is available only on steps configured with `step.meta.custom` or the
  corresponding form-step metadata, matching the legacy rule. Enabling Custom
  for additional steps is configuration work, not a UI default.
- Custom entries are scoped to a workflow step and are mutually exclusive with
  standard selections on that step, including multi-select step families.
- Title is required and normalized to uppercase. Cost price is optional and is
  stored only when pricing applies to the active step.
- Internal sales users may select or create custom entries on eligible steps.
  Catalog deletion/archival remains permission-gated. Dealer and storefront
  surfaces do not gain Custom unless separately authorized.
- Existing saved orders and quotes containing custom snapshots must continue to
  render even when the catalog entry has been archived.
- No Prisma schema migration is required.

## Interaction Contract

| State | Standard grid | Custom form | Result |
| --- | --- | --- | --- |
| Default | Standard visible components only | Closed | No custom catalog card is visible |
| Custom opened | Standard visible components only | Inline above the bottom action bar | Search existing or type a new title |
| Existing option chosen | Standard components remain visible | Title and applicable price hydrate | Nothing is persisted until Proceed |
| Proceed | Selected custom card is inserted first and marked selected | Closes | Custom becomes the step's exclusive selection |
| Selected custom clicked/cleared | Standard components remain | Closed | Custom is removed and immediately disappears |
| Standard component selected | Normal selection behavior | Closed | Any selected custom is removed before standard selection |
| Edit prior custom | Selected custom remains first | Opens prefilled | Proceed updates/reselects; Cancel preserves selection |

## Detailed Execution Plan

### Phase 1: Lock the acceptance matrix

1. Identify three real workflow fixtures before coding:
   - one custom-enabled, priced, single-select step;
   - one custom-enabled step where component pricing does not apply;
   - one custom-enabled multi-select step.
2. Record legacy behavior for Custom placement, title normalization, existing
   option selection, price hydration, cancellation, selection, and replacement.
3. Confirm whether the step configuration flag is the sole Custom eligibility
   authority. If the product requirement changes to every step, update step
   configuration deliberately rather than bypassing it in the picker.
4. Turn the matrix into browser acceptance scenarios shared by create order,
   edit order, create quote, and edit quote.

Validation gate: every behavior in the interaction contract has a named fixture
and an expected persisted step shape before implementation begins.

### Phase 2: Make custom selection a canonical domain rule

1. Consolidate custom detection into one package-owned helper that accepts both
   object and JSON-string metadata and recognizes `component.custom` plus
   `_metaData.custom`.
2. Extend the shared selection reducer in
   `packages/sales/src/sales-form/domain/mutation-engine.ts` and the workflow
   selection actions so custom is exclusive:
   - selecting a custom replaces all selections on the active step;
   - selecting a standard component first removes any selected custom;
   - on a multi-select step, normal standard-to-standard toggling remains
     unchanged;
   - deselecting the selected custom clears the step selection.
3. Add a shared `clearWorkflowStepSelection` action. It must clear
   `componentId`, `prodUid`, value, price/base price, `selectedProdUids`,
   `selectedComponents`, custom metadata, redirect/section override snapshots,
   and dependent downstream route steps using the existing route-rebuild rules.
4. Preserve `custom: true` in both the selected component snapshot and step
   metadata so save/reload, repricing, and print normalization do not depend on
   the live catalog row.
5. Ensure switching to a standard component produces no stale custom cost in
   the line total or item summary.

Validation gate: unit tests cover single-select replacement, explicit clear,
custom-to-standard replacement, standard-to-custom replacement, multi-select
exclusivity, downstream-step truncation, and JSON metadata compatibility.

### Phase 3: Enforce entry-only visibility

1. Keep `includeCustomComponents` false in salesperson selection mode and remove
   the visible `Enable Custom: On/Off` action from the new-form component toolbar.
2. Replace the boolean visibility escape hatch with an explicit mode if catalog
   management still needs it, for example `visibilityMode: "selection" |
   "catalog-management"`. Sales forms always use `selection`.
3. In selection mode, the visible-component resolver returns:
   - all eligible standard components;
   - only the currently selected custom component for that step;
   - a selected snapshot fallback when the catalog row is archived, stale, or
     absent from the current query.
4. Sort the selected custom first without mutating the query result array.
5. When selection changes, derive visibility from canonical step state rather
   than maintaining a second local “show selected custom” flag.

Validation gate: resolver tests prove that zero unselected customs render by
default, one selected custom renders first, and it disappears immediately after
clear or standard replacement.

### Phase 4: Extract and reuse the custom editor UI

1. Keep `CustomComponentCombobox` as the shared legacy/new dashboard control,
   but move the new-form orchestration out of the large
   `item-workflow-panel.tsx` into a focused hook/component pair, such as:
   - `use-workflow-custom-component.ts` for open target, draft, option matching,
     submit, archive, and cache refresh;
   - `workflow-custom-component-panel.tsx` for the inline form and actions.
2. Leave the shared `packages/sales` workflow panel responsible only for
   presentation and selection callbacks. Dashboard-specific tRPC mutations stay
   in the dashboard adapter boundary.
3. Render a destructive-accent `Custom` button in the bottom action bar only
   when:
   - the active step supports custom;
   - the current surface capability allows custom use;
   - the step is a component-card step rather than Shelf/Service/other dedicated
     editors with their own entry model.
4. Anchor the form above the action bar, retain responsive width, and keep the
   existing component grid in place while editing.
5. On open, hydrate the selected custom by UID first and normalized title second.
   Do not hydrate a standard selection into the custom form.
6. Autocomplete behavior:
   - query only custom options belonging to the active step;
   - case-insensitive matching with uppercase display normalization;
   - choosing an option hydrates its title and cost price;
   - typing a non-match offers `Create "TITLE"`;
   - no catalog write occurs until Proceed;
   - keyboard navigation, Escape, focus return, loading, empty, and error states
     remain accessible.
7. Show Cost Price only when pricing applies. Introduce one shared
   `supportsWorkflowComponentPricing(step, components)` decision using explicit
   step/pricing metadata as primary authority and existing pricing records as a
   compatibility fallback. Do not infer “not priced” merely because every
   current numeric value is zero.
8. Proceed selects the returned/reused component immediately, closes the form,
   and focuses the selected card. Cancel closes without changing the current
   selection.

Validation gate: focused component tests cover CTA gating, autocomplete/create,
conditional price, Cancel, Proceed, pending/error states, and keyboard focus.

### Phase 5: Reuse and harden the existing API

1. Keep the existing inventory mutations and schemas; do not add a second custom
   component endpoint or table.
2. Preserve step-scoped, case-insensitive reuse so creating the same normalized
   title for the same step selects/updates one catalog component.
3. Correct optional price semantics:
   - `price === undefined`: pricing is not applicable; leave pricing untouched;
   - finite number: create/update the applicable pricing row;
   - `price === null`: explicitly clear the applicable stored price.
4. Validate supplied `id`/`uid` belongs to a custom component on the requested
   step before update. Do not allow a client to convert or edit an unrelated
   standard/other-step component through this endpoint.
5. Keep archive soft and preserve historical snapshots. Archived options must be
   removed from future autocomplete results but remain renderable on saved sales.
6. Reuse existing workflow-cache invalidation and inventory-sync queuing after
   upsert/archive. Refresh only the active step component query in the client.
7. Split capabilities into clear intent if needed:
   - `canUseCustomComponents` for selecting/creating on eligible sales steps;
   - `canManageCustomCatalog` for archiving existing options;
   - retain administrative step-configuration permission separately.

Validation gate: API tests cover create, normalized-title reuse, cross-step
rejection, standard-component rejection, price set/update/clear/not-applicable,
archive, historical DTO hydration, permissions, invalidation, and sync queuing.

### Phase 6: Persistence, pricing, and compatibility verification

1. Verify selected custom snapshots survive draft save, final save, reload, and
   old/new form switching with UID, title, custom marker, base cost, calculated
   sales price, and step identity intact.
2. Confirm profile pricing is applied once when cost price is provided and is not
   double-adjusted on hydration or customer-profile change.
3. Confirm price-less customs contribute zero component price without erasing
   unrelated step/line costs.
4. Confirm standard replacement removes custom price and metadata before total,
   tax, and summary calculations run.
5. Load historical custom sales whose catalog row is archived/missing and prove
   the selected snapshot remains visible and printable.
6. Spot-check legacy selection after API hardening to ensure the shared
   autocomplete and null-price semantics remain compatible.

Validation gate: focused Sales domain and normalization suites pass, followed by
same-document old/new parity checks for one priced and one price-less custom.

### Phase 7: Browser acceptance and rollout

1. Browser-test the acceptance matrix in the internal new order form:
   - no custom cards on initial step load;
   - Custom opens the inline form;
   - autocomplete selects an existing entry;
   - new title creates and selects an entry;
   - applicable price affects totals correctly;
   - selected custom appears first and selected;
   - clearing/replacing it makes it disappear;
   - reopening hydrates the selected custom;
   - no `Enable Custom` catalog reveal remains.
2. Repeat save/reload on an order and a quote. Run one edit-form legacy switch
   check using an already-saved record, never an unsaved draft.
3. Test desktop and narrow viewport placement, dropdown scrolling, keyboard-only
   operation, focus return, pending/error feedback, and zero console errors.
4. Confirm dealership/storefront surfaces do not expose Custom without an
   explicit capability decision.
5. Update `.brain/features/sales-form-system-hardening.md`, API contracts and
   permissions if semantics change, and the progress/task logs with test and
   browser evidence.

Release gate: all entry-only visibility, exclusivity, persistence, price, and
legacy-compatibility scenarios pass; no schema migration is pending.

## Expected File Ownership

- Shared selection/visibility/domain:
  - `packages/sales/src/sales-form/domain/mutation-engine.ts`
  - `packages/sales/src/sales-form/ui/workflow/workflow-selection-actions.ts`
  - `packages/sales/src/sales-form/ui/workflow/workflow-visible-components.ts`
  - `packages/sales/src/sales-form/ui/workflow/workflow-records.ts`
- Shared workflow presentation:
  - `packages/sales/src/sales-form/ui/workflow/workflow-step-component-panel.tsx`
  - adjacent focused custom/selection tests
- Dashboard orchestration/UI:
  - `apps/dashboard/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
  - new focused custom controller/panel files beside that section
  - `apps/dashboard/src/components/forms/sales-form/custom-component-combobox.tsx`
- Existing inventory/API authority:
  - `packages/inventory/src/application/definitions/dyke-step-components.ts`
  - `packages/inventory/src/schema.ts`
  - `apps/api/src/trpc/routers/inventories.route.ts`

## Risks and Mitigations

- **Custom metadata exists as both objects and JSON strings.** Use the existing
  metadata reader everywhere and test both representations.
- **Multi-select behavior may accidentally remove standard selections.** Apply
  exclusivity only when either the incoming or currently selected component is
  custom; retain normal standard toggling otherwise.
- **Clearing a step can leave invalid downstream choices.** Route the clear
  through the canonical route rebuild/truncation logic and test dependencies.
- **A null price can mean “clear” or “not applicable.”** Preserve the three-state
  API contract (`undefined`, number, `null`) and test each state.
- **Archived customs may disappear from historical documents.** Treat saved
  component snapshots as render authority and catalog rows only as enrichment.
- **Role leakage to dealer/storefront surfaces.** Gate both UI slots and server
  mutation authorization with explicit capabilities.
- **The workflow panel is already large.** Extract the custom controller and
  panel instead of adding more effects and callbacks to the parent component.
- **Autocomplete may load a large custom catalog.** Keep it step-scoped, reuse
  the existing cached step query, and derive options with memoized pure helpers.

## Skills List Used

- `plan`: structures an implementation-ready, phased execution plan.
- `from-in-app-browser`: verifies the current and legacy sales-form surfaces
  without disturbing the user's active new-form tab.
- `agency-engineering` — Frontend Developer: defines accessible component and
  interaction boundaries for the React workflow UI.
- `vercel-react-best-practices`: keeps derived state memoized, avoids extra
  effects, and prevents further growth of the monolithic workflow panel.
- Project Brain integration: aligns the plan with current sales-form hardening,
  parity backlog, architecture, and documentation requirements.

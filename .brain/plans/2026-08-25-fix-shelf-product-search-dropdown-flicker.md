# Plan: Stable Shelf Product Search Dropdown Refresh

## Type
UX bug fix

## Status
Done

## Created Date
2026-08-25

## Last Updated
2026-08-25

## Completion Evidence
- Implemented in the package-owned Shelf V2 product cell used by the shared
  cached-index workflow and the legacy dashboard query workflow.
- Search refreshes now render the last settled visible-result count as
  non-interactive skeleton rows, with five rows on first load, one row after an
  empty result, and the existing 50-row rendering cap.
- Focused Shelf validation passes 12 tests / 50 assertions and scoped Biome,
  including direct contracts for both dashboard wiring paths.
- Authenticated in-app browser QA on an unsaved disposable Shelf row for order
  `09408PC` proved a five-option list changed to five skeletons while busy,
  settled to one option, then changed to one skeleton before the stable
  `No product found` state. `aria-expanded` stayed true during both searches,
  Arrow/Enter selected the latest result, Escape closed the popup, and the
  console had no warnings or errors. At a 390x844 viewport, the one-row busy and
  settled states stayed height-stable without document overflow. A later
  five-row busy state settled to 20 `door` results inside the existing 320px
  scroll boundary (962px scroll height), covering a result-count increase.
- `@gnd/sales` typecheck remains red only on the pre-existing
  `sales-control/actions.ts` assignment-id diagnostic; the changed Shelf files
  produced no TypeScript diagnostic.

## Objective
Keep the Shelf Items V2 product combobox open and visually stable while its
search results refresh. During a refresh, replace the settled product rows with
the same number of non-interactive skeleton rows; when the refresh settles,
show the new products and remember their rendered count for the next refresh.

## Current Cause
- `ShelfInlineProductCell` currently returns an empty product list whenever
  `isSearchingProducts` is true.
- The combobox therefore changes from a populated option list to its compact
  `Searching...` empty state and then back to options. That height collapse and
  repopulation produces the visible flicker.
- The shared package panel already provides a correct refresh signal for both
  deferred cached-index work and query fetching. The dashboard rollback panel
  supplies the same prop from its query state, so the rendering fix can remain
  package-owned.

## Recommended Interaction Contract

| State | Visible content | Interaction | Height/count rule |
| --- | --- | --- | --- |
| First load, no settled result yet | Skeleton rows | Input remains editable; rows are not selectable | Use the existing default-result footprint of 5 rows |
| Refresh after N visible products | N skeleton rows | Keep combobox open; disable option selection while refreshing | Preserve exactly N rendered rows, capped by the existing 50-row render limit |
| Refresh after an empty result | One skeleton row | Keep input and Escape available | Preserve the one-row empty-state footprint |
| Settled with products | New product options | Restore normal arrow/Enter selection | Render the new count and remember it for the next refresh |
| Settled with no products | `No product found` | Input and Escape remain available | Show one empty-state row |

The loading representation will use skeletons instead of disabled stale product
labels. This prevents users from reading or selecting results that belong to
the previous query while still preserving the listbox footprint.

## Detailed Execution Plan

### Phase 1: Lock the refresh-state contract
1. Add focused tests for a small result-slot resolver covering:
   - the initial five-row loading fallback;
   - exact preservation for previous counts of 1, 5, and 20;
   - the existing 50-row render cap;
   - the one-row footprint after a settled empty result;
   - zero skeleton rows when the search is settled.
2. Replace the current source assertion that requires
   `if (props.isSearchingProducts) return [];` with assertions for the stable
   skeleton contract.
3. Keep search ranking, query limits, selected-product hydration, category
   breadcrumbs, and product-selection behavior outside this change.

Validation gate: tests must fail against the current clear-the-list behavior
before the renderer is changed.

### Phase 2: Preserve the last settled result footprint
1. In `ShelfInlineProductCell`, continue deriving the visible settled products
   as `props.products.slice(0, 50)` regardless of refresh state.
2. Add a component-local ref that stores the last settled visible-product
   count. Update the ref only after a non-searching render commits; do not put
   this transient bookkeeping in parent state or form state.
3. Derive the loading row count as follows:
   - before any settled response: 5;
   - after a non-empty settled response: its exact rendered count;
   - after a settled empty response: 1 to match the empty-state footprint.
4. Do not copy product data into another state variable. Products remain
   controlled by the current cached-index or React Query result, avoiding
   duplicated server state and stale selection data.

Dependency: this phase uses the existing `isSearchingProducts` prop. The
shared panel's signal remains the union of deferred-query mismatch, index
loading/refetching, and API-fallback loading/refetching; the legacy dashboard
panel continues to use its query pending/fetching state.

### Phase 3: Render a stable, accessible loading list
1. Import the shared `Skeleton` primitive into
   `shelf-inline-items-editor.tsx` and add a compact skeleton-row component that
   mirrors one product option's two-line footprint: title line plus price/
   breadcrumb metadata line.
2. While refreshing:
   - keep `ComboboxContent` mounted and the controlled `open` value unchanged;
   - render exactly the derived number of skeleton rows;
   - do not render stale `ComboboxItem` nodes;
   - do not render the `ComboboxEmpty` searching message alongside skeletons.
3. Mark the result container `aria-busy="true"` and expose one polite,
   screen-reader-only `Searching products...` status. Mark visual skeleton rows
   as presentation-only so they do not enter the option set.
4. Keep the search input enabled and focused. Escape must still close the
   popup, but Arrow/Enter must not target a stale product while skeletons are
   visible.
5. When refresh completes, replace skeletons atomically with the new
   `ComboboxItem` list. Render `No product found` only for a settled empty
   result, and let `autoHighlight` select the first new option for keyboard
   navigation.
6. Preserve the existing anchor-width contract and `20rem` maximum height.
   Skeleton rows will use the same row spacing as product options, so the popup
   retains its previous height during loading and remains scroll-bounded for
   long result sets.

Validation gate: a loading render must contain no selectable option from the
previous query, no duplicate empty/searching message, and no combobox close/
open state change.

### Phase 4: Verify both dashboard execution paths
1. Shared package panel:
   - verify the cached product index still compiles once;
   - type rapidly and confirm `shelfProductSearch !==
     deferredShelfProductSearch` switches the list to skeletons without a
     network request per keystroke;
   - confirm the new deferred results replace the skeletons and establish the
     next remembered count.
2. Legacy dashboard rollback panel:
   - verify React Query pending/fetching state drives the same skeleton list;
   - confirm rapid query changes cannot select a product from the previous
     query and the latest query result wins;
   - do not alter the existing search API or query key behavior.
3. Verify initial index/query loading, a result count increase, a result count
   decrease, and a zero-result response. The popup may resize once when the new
   settled result count differs; it must not collapse during the refresh.

### Phase 5: Automated and browser validation
1. Run the focused package UI tests:
   - `bun test packages/sales/src/sales-form/ui/workflow/shelf-inputs.test.ts`
   - `bun test packages/sales/src/sales-form/ui/workflow/shelf-inline-items-editor.test.ts`
2. Run the dashboard Shelf workflow regression covering both panel wiring
   paths, including the existing `shelf-workflow-ui.test.ts` slice.
3. Run `bun --filter @gnd/sales typecheck`, the narrowest dashboard typecheck
   scan for touched files, scoped Biome, and `git diff --check`.
4. Perform authenticated in-app browser QA on a disposable Shelf row without
   saving:
   - open the product picker and record its settled option count and bounding
     height;
   - type several characters rapidly and confirm `aria-expanded` stays true;
   - during each refresh, confirm skeleton count equals the prior footprint and
     the popup height is unchanged;
   - after settlement, confirm the correct new products appear and the next
     refresh uses that new count;
   - verify no-result recovery, Arrow/Enter/Escape behavior, desktop and narrow
     widths, bounded scrolling, console output, and request activity.

Acceptance gate: no close/open animation, no loading-height collapse, no stale
product selection, no input lag, no per-keystroke network request on the cached
package path, and no regression to product selection or Shelf pricing.

### Phase 6: Documentation impact check
1. Update `.brain/features/sales-form-system-hardening.md` after implementation
   with the settled-count skeleton contract and validation evidence.
2. Append implementation and browser-QA evidence to `.brain/progress.md`.
3. Do not update API or database Brain documents unless implementation expands
   beyond this UI-only plan; no contract, permission, or schema change is
   currently proposed.

## Affected Files
- `packages/sales/src/sales-form/ui/workflow/shelf-inline-items-editor.tsx`
- `packages/sales/src/sales-form/ui/workflow/shelf-inline-items-editor.test.ts`
- `packages/sales/src/sales-form/ui/workflow/shelf-inputs.test.ts`
- `packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx`
  (validation only unless the refresh signal needs a narrowly proven fix)
- `apps/dashboard/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
  (validation only unless legacy signal wiring is incomplete)
- `apps/dashboard/src/components/forms/new-sales-form/sections/shelf-workflow-ui.test.ts`
- `.brain/features/sales-form-system-hardening.md` after implementation
- `.brain/progress.md` after implementation

## Risks And Mitigations
- **Remembered count updates too late:** store the count after every settled
  commit and test consecutive rapid searches. Keep the value in a ref so it
  cannot trigger a render loop.
- **Skeletons become keyboard options:** render presentation rows, not disabled
  `ComboboxItem` instances, and verify Arrow/Enter behavior while busy.
- **Duplicate accessibility announcements:** conditionally render one loading
  status or the settled empty state, never both.
- **First-load or zero-result collapse:** use the explicit 5-row first-load and
  1-row empty-state footprints.
- **Long lists change page height:** retain the current `20rem` maximum height,
  contained overscroll, and 50-row UI cap.
- **Only one dashboard path is fixed:** validate the shared cached-index panel
  and the legacy API-backed rollback panel against the same package renderer.
- **Unrelated dirty-worktree changes overlap these files:** implementation must
  patch only the loading-list slice and preserve existing Shelf initialization,
  pricing-border, and selection-close work.

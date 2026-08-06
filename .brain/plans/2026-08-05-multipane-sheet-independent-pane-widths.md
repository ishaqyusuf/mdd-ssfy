# Multi-Pane Sheet Independent Pane Widths

## Objective

Make the shared multi-pane sheet preserve an explicitly configured natural
width for each pane, so opening the secondary pane expands the sheet around the
two pane widths instead of dividing one outer width between two `flex-1`
children. Add a stable visual divider between the panes on side-by-side
layouts, while retaining the existing single-pane replacement behavior when
the viewport cannot fit both panes at their natural widths.

## Implementation Status

Completed on 2026-08-06. The opt-in Custom Sheet V2 uses typed additive pane
sizing, fixed-basis slots, a 1px divider, deterministic one-pane fallback,
shadcn/Radix chassis, Midday frame and motion timing, layered dismissal without
click-through, delayed pane cleanup with focus restoration, and pane-owned
footer slots. The legacy custom sheet remains unchanged. Sales Overview is the
first and only V2 consumer, is configured as `2xl + 2xl`, and all current
secondary entry points were verified in the authenticated in-app browser. See
ADR-051.

## Assumptions

- This plan targets the opt-in
  `packages/ui/src/components/custom/sheet-v2.tsx` implementation and its only
  current consumer, the canonical Sales Overview sheet. The legacy
  `sheet.tsx` contract stays unchanged.
- "Natural width" means a deliberate preferred width supplied by the sheet
  consumer, not CSS `fit-content` derived from whichever child happens to be
  widest. Form controls, tables, and loading states make content-measured widths
  unstable.
- The divider is visual and non-resizable in this slice. If operator resizing
  is requested later, it should be added as an explicit resizable mode with
  persisted defaults and minimum/maximum widths.
- `primarySize` and `secondarySize` describe the preferred width of their
  respective pane. For example, `primarySize="2xl"` and
  `secondarySize="2xl"` produce two independently sized `2xl` panes.
- The combined shell is the arithmetic sum of the two resolved pane widths and
  the divider. It must not apply Tailwind's `max-w-4xl` class: Tailwind width
  labels are ordinal tokens, not additive units (`2xl + 2xl` is wider than the
  framework's predefined `4xl` max width).
- If the two preferred widths plus sheet padding, divider, and viewport gutter
  do not fit, preserving both widths and showing them side by side is
  impossible. The correct fallback is one pane at a time, not proportional
  shrinking or horizontal sheet scrolling.
- Existing unrelated working-tree changes must be preserved.

## Detailed Execution Plan

### Phase 1: Lock The Sizing Contract And Baseline

Dependencies: none.

1. Record the current failure mechanism in a focused regression test or test
   fixture:
   - `secondarySize` currently selects the expanded **outer sheet** maximum
     width;
   - the primary slot and secondary content both use `flex-1`;
   - the browser therefore allocates the available outer width proportionally,
     currently close to 50/50, regardless of the primary pane's `2xl` setting.
2. Browser-measure the current Sales Overview sheet with no secondary pane and
   with each secondary pane kind open. Capture:
   - viewport width;
   - outer sheet width;
   - primary and secondary `getBoundingClientRect().width` values;
   - horizontal overflow;
   - whether the secondary content's two-column sections remain usable.
3. Define the acceptance invariant before changing CSS:

   ```text
   side-by-side shell width
     = primary preferred width
     + 1px divider
     + secondary preferred width

   primary width before opening secondary
     = primary width after opening secondary
   ```

4. Validate the clarified `2xl + 2xl` example first. Each pane should resolve to
   the same width it has when rendered alone, and the combined shell should
   resolve to exactly twice that width plus the divider.

Validation gate:
- The test demonstrates that changing the expanded shell width currently
  changes the pane allocation.
- The selected primary and secondary widths, plus chrome, fit at the chosen
  side-by-side threshold.

### Phase 2: Separate Pane Widths From Shell Width

Dependencies: Phase 1.

1. Introduce one typed width resolver in
   `packages/ui/src/components/custom/sheet-v2.tsx` (or a small adjacent module)
   that maps supported sheet size tokens to stable CSS lengths. Do not try to
   reverse-engineer values from Tailwind class strings at runtime.
2. Correct the semantics of the existing public props:
   - `primarySize` remains the preferred width of a single sheet and the
     primary pane;
   - `secondarySize` becomes the secondary pane's own preferred width instead
     of selecting an expanded outer-shell max width;
   - add an explicit side-by-side threshold prop only if the default cannot
     safely fit the supported width pair.
3. Put the resolved values on the sheet root as CSS custom properties, for
   example `--sheet-primary-pane-width` and
   `--sheet-secondary-pane-width`. This keeps the root, primary slot, secondary
   slot, and tests on one source of truth.
4. When only the primary pane is visible, keep the outer sheet width equal to
   the primary preferred width.
5. When both panes are visible, calculate the outer width from the sum of the
   two pane widths and the separator. Move horizontal chrome into the pane
   slots so each configured pane width is its complete border-box width and the
   root does not add hidden width outside the sizing equation. Remove the
   expanded max-width token as an input to pane proportions.
6. Cap the shell against the dynamic viewport only as a safety guard. The
   side-by-side eligibility rule must prevent this cap from silently shrinking
   the configured panes during normal operation.

Validation gate:
- Changing the secondary preferred width changes only the secondary pane and
  the total shell width.
- Opening the secondary pane does not change the primary pane's measured width.
- The single-pane uses of the shared sheet retain their current sizing.

### Phase 3: Give Each Pane A Non-Negotiable Flex Basis

Dependencies: Phase 2.

1. Refactor `Sheet.MultiContent` into explicit primary and secondary slots.
   Give each slot a unique id derived from `sheetName`; replace the current
   global `multi-sheet-content` portal target so multiple mounted sheets cannot
   collide.
2. On a side-by-side layout, apply the equivalent of
   `flex: 0 0 var(--sheet-*-pane-width)` to each slot:
   - no `flex-grow`;
   - no `flex-shrink`;
   - width/basis sourced from that pane's own CSS variable.
3. Keep `min-w-0` on the pane's **inner content wrapper** so tables, long
   labels, and scroll areas are contained inside the pane instead of making the
   pane wider. Do not use `min-w-0` as a substitute for the outer fixed basis.
4. Remove `flex-1` from the two sibling pane slots. It may remain on vertical
   children such as scroll areas because that allocates height, not horizontal
   pane width.
5. Keep primary and secondary header/body/footer composition independent so
   each pane owns its vertical layout and scroll containment.

Validation gate:
- Computed styles show `flex-grow: 0` and `flex-shrink: 0` for both side-by-side
  pane slots.
- Long content wraps or scrolls inside its pane and cannot change the sibling's
  width.

### Phase 4: Add A Dedicated Divider

Dependencies: Phase 3.

1. Render one `@gnd/ui/separator` between the explicit pane slots when the
   secondary pane is open in side-by-side mode.
2. Use a vertical, decorative, 1px separator with `bg-border`, full available
   height, and `shrink-0`. The divider owns its width; neither pane should fake
   it with a border that changes that pane's box calculation.
3. Replace the current primary-only `pr-4` gap with balanced pane-local padding
   around the separator. Keep that padding inside each pane's border-box so a
   `2xl` pane remains `2xl`; the divider is the only extra shell width.
4. Hide/unmount the divider when the secondary pane is closed or when the
   layout is in one-pane mode.
5. Add stable data slots such as `data-sheet-pane="primary"`,
   `data-sheet-divider`, and `data-sheet-pane="secondary"` for layout tests and
   browser inspection.

Validation gate:
- Exactly one divider appears between panes, at 1px, in light and dark themes.
- No divider appears in primary-only or narrow-screen replacement mode.
- The divider does not move either pane off its configured width.

### Phase 5: Make The Responsive Fallback Deterministic

Dependencies: Phases 2-4.

1. Replace the broad `isDesktop` meaning with a layout-specific
   `isSideBySide` decision. Its threshold must be high enough for:

   ```text
   primary width + secondary width + divider + safe viewport gutter
   ```

2. Use the same side-by-side decision for all four behaviors: shell width,
   primary visibility, secondary visibility, and divider visibility. Avoid a
   JS breakpoint/CSS breakpoint mismatch.
3. Below that threshold:
   - keep the outer sheet at one-pane/full-available width;
   - hide the primary while a secondary pane is active;
   - give the secondary the available single-pane width;
   - preserve the Back control and existing local pane state;
   - do not introduce horizontal scrolling to simulate two panes.
4. Confirm that opening, closing, and changing pane kind does not create a
   hydration flash or momentarily mount both full-width panes on a narrow
   viewport.

Validation gate:
- Every supported viewport has exactly one of two states: two unshrunk panes
  with a divider, or one active pane with no divider.
- There is no intermediate compressed 50/50 state.

### Phase 6: Migrate Sales Overview To The New Contract

Dependencies: Phases 2-5.

1. Update
   `apps/dashboard/src/components/sheets/sales-overview-sheet/index.tsx`:
   - retain `primarySize="2xl"`;
   - change `secondarySize="5xl"` to `secondarySize="2xl"` for the clarified
     equal-pane example;
   - set the side-by-side threshold only if the shared default does not match
     the measured width sum.
2. Audit the four secondary pane implementations:
   - `customer-edit-pane.tsx`;
   - `sales-address-pane.tsx`;
   - `inbound-create-pane.tsx`;
   - `inbound-detail-pane.tsx`.
3. Adjust only genuine container-width problems. In particular, verify that
   viewport-based `sm:grid-cols-2` rules inside a `2xl` pane do not create
   cramped fields; prefer pane/container-aware layout if the browser evidence
   shows a problem.
4. Preserve the current one-root/one-overlay behavior, active-tab-only loading,
   local secondary-pane state, footer hiding, Back action, and sale-change
   cleanup.

Validation gate:
- All pane kinds open inside the canonical Sales Overview sheet with the same
  primary width and the configured secondary width.
- Pane switching changes only the secondary content unless an explicit
  per-pane width is deliberately configured.

### Phase 7: Focused Tests And Browser Proof

Dependencies: Phases 1-6.

1. Add focused pure tests for width resolution and shell-width composition.
2. Extend the existing Sales Overview sheet contract coverage to assert:
   - independent primary/secondary width configuration;
   - fixed-basis pane slots rather than sibling `flex-1` allocation;
   - a unique secondary slot derived from `sheetName`;
   - a dedicated divider;
   - divider absence in one-pane mode.
3. Run targeted Biome checks on the shared sheet and Sales Overview files.
4. Run `bun --filter @gnd/ui typecheck` and the Dashboard typecheck, recording
   any known repository-wide baseline separately from changed-file failures.
5. Authenticated browser validation:
   - measure closed/open primary width at wide desktop; tolerance <= 1px;
   - measure every secondary pane kind;
   - verify divider position and 1px width;
   - test one viewport just above and just below the side-by-side threshold;
   - test 1024px, 768px, and 390px widths for replacement behavior and no
     horizontal overflow;
   - test keyboard Back/Escape, focus return, independent scrolling, light and
     dark themes;
   - confirm only one dialog/sheet root and one overlay remain mounted.

Validation gate:
- The width invariant passes in automated checks and actual browser geometry.
- No changed-file lint/type error, overflow, focus, or sheet lifecycle
  regression remains.

### Phase 8: Brain Documentation Impact Check

Dependencies: successful implementation and validation.

1. Update `.brain/features/sales-overview.md` with the independent pane sizing,
   breakpoint fallback, divider, and browser evidence.
2. Update `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, and
   `.brain/progress.md` when implementation state changes.
3. Add a shared UI feature note or ADR only if the implementation intentionally
   turns this into a reusable multi-pane contract used outside Sales Overview.
4. No database, migration, API contract, or permission documentation update is
   expected because this is a presentation/layout change.

## Skills List Used

- `plan`: structured the diagnosis and proposed change into executable phases,
  dependencies, decision points, validation gates, and risks.

## Risks and Mitigations

- **The two natural widths do not fit common desktops.** Measure before setting
  the threshold; use single-pane replacement below the exact supported width
  instead of allowing flex shrink.
- **"Natural" becomes content-measured and unstable.** Define it as an explicit
  preferred pane width and contain content with `min-w-0`, wrapping, and local
  scrolling.
- **The new prop silently changes old single-pane sheets.** Keep the existing
  single-pane size path intact and migrate only the current multi-pane caller.
- **The portal targets the wrong sheet when more than one is mounted.** Derive
  primary/secondary slot ids from `sheetName` and test uniqueness.
- **The divider changes the width arithmetic.** Give it its own fixed 1px slot
  and include it explicitly in the shell calculation.
- **Viewport and React breakpoints disagree.** Centralize one
  `isSideBySide` decision and use it for rendering and sizing together.
- **Forms become cramped inside a narrower secondary pane.** Test every pane
  kind and convert affected inner grids to container-aware behavior only where
  evidence requires it.
- **A refactor breaks pane close/focus behavior.** Preserve local state and the
  one-dialog contract; browser-test Back, Cancel, Save, Escape, and focus return
  independently.
- **Existing unrelated work is overwritten.** Limit edits to the shared sheet,
  focused Sales Overview wiring/tests, and corresponding Brain docs; inspect
  the diff before every implementation edit.

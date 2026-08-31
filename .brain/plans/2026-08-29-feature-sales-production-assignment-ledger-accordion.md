# Sales Production Assignment Ledger Accordion

Status: Implemented and browser-verified on 2026-08-29

## Outcome

Replace only the admin assignment list inside the Sales Overview Production item with the approved `A — Ledger Accordion` disclosure. Preserve the surrounding Production item document and all existing assignment, submission, permission, dispatch, and material-review behavior.

## Reference Compared

- Approved UI: `/Users/M1PRO/.gstack/projects/gnd/designs/sales-production-assignments-20260829/comparison.html#concept-a-title`
- Current GND surface:
  - `apps/dashboard/src/components/sheets/sales-overview-sheet/production/v2/production-item-document.tsx`
  - `apps/dashboard/src/components/sheets/sales-overview-sheet/production-assignment-row.tsx`
  - `apps/dashboard/src/components/sheets/sales-overview-sheet/production-submissions.tsx`
- Midday analogue:
  - `/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/ui/src/components/accordion.tsx`
  - `/Users/M1PRO/Documents/code/_kitchen_sink/midday/apps/dashboard/src/components/login-accordion.tsx`
- GND already exposes the matching shadcn primitive at `packages/ui/src/components/accordion.tsx`.

## Migration Principle

Use the existing `@gnd/ui/accordion` primitive as the semantic disclosure boundary. Keep fetching and mutation ownership in the current assignment row/provider components. This migration changes hierarchy and interaction, not the domain contract or data-loading strategy.

## Migration Contract

### Filesystem and component boundaries

- Keep `ProductionV2RecordsSection` responsible for the section heading, total count, loading/error states, and assignment iteration.
- Refactor the admin assignment presentation in `production-assignment-row.tsx` into a focused trigger summary and expanded content while retaining `ProductionAssignmentRowProvider` as the row state/mutation context.
- Keep submission rendering and deletion behavior in `production-submissions.tsx`; polish its visual rows only as required by the approved design.
- Do not add a second component library or a parallel assignment data model.

### Trigger summary

- The complete assignment summary is keyboard- and pointer-clickable through the shadcn accordion trigger.
- Before expansion, show assignee, due date, assigned-by/date, quantity progress, lifecycle badge, pending material-review badge when applicable, and submission count.
- Keep destructive and edit controls outside the nested trigger activation path so interacting with them does not toggle the disclosure unexpectedly.

### Expanded content

- Show the submission heading/count, submission records, and the existing empty state.
- Preserve submit/cancel behavior and the existing pending-quantity, dispatch-mode, and material-review guards.
- Preserve due-date editing, guarded assignment deletion, guarded submission deletion, material-review states, notes, quantities, and mutation refresh behavior.

### State and performance

- The accordion owns only expanded assignment ids. Existing submit-form state remains local to each assignment row.
- Use stable assignment ids as accordion values and React keys; do not use array indexes for disclosure identity.
- Keep the existing single assignment query and avoid new per-row fetches or eager secondary requests.
- Prefer `type="multiple"` so opening one assignment does not erase another worker's inspection context.

### Accessibility and responsive behavior

- Rely on Radix/shadcn trigger/content semantics for `aria-expanded`, content relationships, Enter/Space activation, and focus behavior.
- Provide a visible focus state and preserve a minimum 44px action target on compact layouts.
- Allow metadata and badges to wrap without horizontal overflow at 390px; keep action placement unambiguous and do not make the whole row a non-semantic click handler.

## Validation

- Add focused source/component contracts for stable id-based accordion values, summary metadata, nested content, and separation of disclosure versus mutation controls.
- Run the narrowest assignment/Production V2 tests, scoped Biome, and whitespace validation.
- Authenticated browser QA on a Production item with at least one assignment and submission:
  - collapsed summary fidelity
  - pointer and keyboard disclosure
  - submit/cancel
  - due-date edit
  - guarded assignment and submission deletion states
  - pending material-review presentation
  - 1440px, tablet, and 390px overflow/focus checks

## Conformance Audit Gate

Completed against the approved Option A HTML, Midday's accordion wrapper, and GND's `@gnd/ui/accordion` primitive.

- The admin records section owns one `type="multiple"` accordion and uses stable assignment ids for item values and React keys.
- Trigger summaries expose assignee, assigned-by/date, due date, quantity progress, lifecycle state, pending-review state, and submission count without nesting edit or destructive controls.
- Expanded content retains the current row provider, submit-form state, due-date mutation, assignment deletion, submission deletion, dispatch locks, material-review guards, and exact query refresh paths.
- Submission records use the approved ledger columns on desktop and a wrapping stacked layout on narrow screens. The existing worker submission path remains unchanged.
- The surrounding Production item accordion now supplies `""` before initialization so it remains controlled for its lifetime; clean reload QA produces no accordion warnings.
- Follow-up polish removes the space-heavy disabled-create alert and composes
  the existing `@gnd/ui` tooltip around the disabled action. The reason remains
  available on hover without changing the production mutation policy, and the
  independent material-verification alert remains inline.
- Intentional adaptation: GND's existing date picker remains the due-date editor instead of introducing the prototype's text-only action. No new query, API, package, dependency, or component library was added.
- No architecture, component-system, or domain-behavior deviation requires an ADR.

## Implementation Validation

- Focused validation: 15 tests / 26 assertions across the Ledger Accordion contract, worker policy, Production V2 selection/presentation, and controlled item-accordion contract.
- Scoped Biome and whitespace validation pass for the implementation slice.
- The broad Dashboard typecheck retains unrelated repository baseline failures; filtered output contains no diagnostics for the changed implementation or new test files.
- Authenticated browser QA:
  - order `09488AD`: empty-submission state, complete trigger summary, pointer collapse/reopen, submit/cancel, and clean reload with no warning/error logs
  - order `09396PC`: completed assignment, one approved-material submission, evidence fallback, no-quantity state, and guarded assignment deletion
  - desktop, 768px, and 390px layouts have no horizontal overflow; compact actions meet the 44px target
  - the trigger is a native Radix/shadcn button with `aria-expanded` and associated content semantics; the in-app automation key injector did not independently toggle it, so keyboard activation remains primitive-backed rather than separately browser-proven
  - follow-up QA on `09488AD` confirms the large availability alert is absent,
    the Create Assignment control remains disabled, and hover displays `Create
    unavailable` plus the complete assigned-quantity reason

## Documentation Impact

- Updated `.brain/features/sales-production-workspace.md`, `.brain/tasks/done.md`, and `.brain/progress.md` after implementation and QA.
- No API, database, migration, or permission documentation should change unless implementation reveals a real contract change.

## Flat Submission Follow-up Contract (2026-08-29)

### Reference compared

- Target: `production-assignment-row.tsx`, `production-submissions.tsx`, and
  `production-submit-form.tsx` in the Sales Overview Production feature.
- Approved reference: Option A Ledger Accordion, with the user's follow-up
  direction for a flat indented submission region.
- Midday references: `add-transactions.tsx` for compact icon-only actions and
  `invoice-details.tsx` for subordinate sections separated by whitespace and a
  top divider instead of nested cards.

### Migration principle and filesystem

- Keep one assignment accordion and the current row provider. The expanded
  assignment body owns one indented, background-free submission section.
- Keep action and form behavior in the existing three Production components;
  add no route, query, store, package, or parallel component system.

### Interaction, state, and data

- The submission heading becomes `Submissions (X of Y)`, using reported
  production quantity and assigned quantity rather than submission-row count.
- The expanded submission heading owns only the icon-only add/cancel submission
  action. The plus state is a small primary rounded-xl button; its close state
  retains the same footprint. It has an accessible label and hover/focus
  tooltip.
- Edit due date and guarded assignment deletion move into the assignment row,
  immediately before the accordion chevron. They are sibling controls rather
  than children of the accordion trigger, so either action can run without
  expanding or collapsing the assignment.
- The add action remains controlled by the existing row-local Collapsible and
  opens the existing `ProductionSubmitForm`. It is disabled when no submission
  quantity remains, when the assignment is complete, or when the order is
  fulfilled.
- Due-date and assignment-delete actions retain their current dispatch,
  permission, pending mutation, and submission guards, and additionally lock
  when the canonical Sales Overview document status is fulfilled. Due date is
  presented as a centered small rounded-xl ghost calendar control.
- Remove the assignment-status and submission-count badges from the accordion
  trigger because quantity progress already communicates completion. Preserve
  a pending material-review indicator when present.
- Remove the standalone admin `Create assignment` section. Put its icon-only
  small primary rounded-xl plus trigger after the total badge in the
  `Assignments` heading and open the same existing assignment form beneath that
  heading. Preserve the worker's existing standalone `Create submission` flow.

### Presentation and form

- Remove the expanded-content background, submission ledger border/background,
  desktop header strip, and empty-submission explanatory callout. Indent the
  subordinate content with responsive left padding and keep submission rows
  separated only by dividers.
- Remove the submission heading subtitle. The inline form begins below a
  shadcn Separator and retains `Submit Assignment`, quantity, note, submit, and
  cancel behavior without either of the current nested card borders.
- Use one right-side action gutter across the section and nested assignment:
  heading plus buttons align with the assignment delete action, while the
  accordion chevron remains at the extreme outer edge. Vertically center both
  heading action rows.

### Validation and conformance gate

- Update the focused Ledger Accordion contract for trigger simplification,
  independent assignment actions, heading-owned assignment creation, quantity
  heading, icon tooltips, lifecycle locks, flat submission rows, and
  separator-owned form layout.
- Run focused Production tests, scoped Biome, filtered Dashboard typecheck, and
  authenticated browser QA on empty and completed submission states, including
  icon tooltips, disabled actions, form open/cancel, desktop, and narrow layout.
- Final audit must confirm no mutation, permission, API, database, or loading
  behavior changed and every intentional visual omission matches this contract.

## Assignment Form Alignment Follow-up (2026-08-30)

- Reuse `SalesFormQuantityStepper` for Create Assignment quantities, bounded by
  each pending LH, RH, or general quantity. Keep the existing assignment schema
  and mutation unchanged.
- Top-align the desktop two-column field grid, stack it below `sm`, and allow
  the Assign To select to override its legacy horizontal margin so its label
  and trigger share the Due Date baseline without narrow-sheet collisions.
- Correct the shared React DayPicker v9 styling at `@gnd/ui/calendar`: use the
  `month_grid` slot and retain shadcn's proportional full-width week grid.
  Weekday headings use `flex-1`, date cells use the same full-width
  aspect-square columns, and Tailwind v4 variable utilities follow the upstream
  `-(--cell-size)` syntax. Let the controlled date popover fit that intrinsic
  calendar width rather than stretching it across the default popover width.
- Add focused component/source contracts for assignment-stepper reuse, field
  alignment, responsive stacking, and shared calendar grid classes. Verify the
  rendered geometry at desktop and 390px before completion. No query, mutation,
  API, permission, database, migration, package, or dependency contract changes.

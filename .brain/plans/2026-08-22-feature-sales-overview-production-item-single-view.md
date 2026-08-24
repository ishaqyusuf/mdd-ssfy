# Sales Overview Production Item Single-View Implementation Plan

## Status

Implemented locally on 2026-08-22 for Sales Overview V2. Focused validation is
complete; broad dashboard typecheck and authenticated browser acceptance remain
recommended follow-up checks under the fast Bun workflow.

## Implementation Outcome

- The existing `generalViewVersion === "v2"` Sales Overview selection now routes
  Production through a lazy `ProductionTabGateway`, parallel to General V2.
  The current Production tab remains the explicit legacy fallback.
- The V2 package is split into a thin tab/list owner, an item document content
  component, a loading skeleton, and a pure worker-assignment selector with
  focused tests. This follows the Midday content/context/state ownership pattern
  without adding a route, API, database, or package boundary.
- The approved Command Document order is implemented with shadcn Accordion,
  Collapsible, Item, Alert, Empty, Badge, Select, Separator, and Skeleton
  composition. Only the create form is collapsible.
- Existing assignment/submission forms, mutation actions, focused invalidation,
  material guards, delete guards, due-date editing, nested submissions, and Note
  tag identity are reused. The shared item context was extracted so V2 does not
  import the legacy renderer.
- Worker assignment selection covers zero, one, and multiple eligible
  assignments and defaults multiple choices to the earliest due date.
- Production V2 now uses a single-open accordion for every role. The first
  available item is the default, `prod-item-view` remains the URL authority,
  opening another item closes the current item, and refresh/browser navigation
  restore the selected item. The legacy Production fallback retains its
  existing multi-open behavior.
- Focused validation passes 20 tests / 48 assertions plus scoped Biome on all
  new V2 files. A focused ESLint attempt was unavailable because Bun resolved
  ESLint 10 while the repository still uses legacy ESLint configuration.

## Approved Design

- Direction: `A — Command Document`.
- Approved interactive reference:
  `~/.gstack/projects/gnd/designs/production-item-single-view-20260822/finalized.html`.
- Approved desktop reference:
  `~/.gstack/projects/gnd/designs/production-item-single-view-20260822/variant-A.png`.
- The prototype is a hierarchy and interaction reference. Production code must
  use the repository's existing shadcn primitives and theme tokens rather than
  copying prototype-only colors or CSS.

## Objective

Replace the Production item's `Details`, `Notes`, and role-specific
`Assignments` / `Submissions` tabs with one calm, continuous item view. The
view must reduce context switching without dropping any current admin or worker
capability, permission, loading state, or mutation guard.

## Locked Presentation Contract

Every expanded item renders in this order:

1. Role-aware create action:
   - admin: `+ Create assignment`;
   - production worker: `+ Create submission`.
2. The simple inline form directly beneath the action when open.
3. `Assignments` for admins or `Submissions` for workers.
4. `Details`.
5. `Notes & activity`.

Only the create form collapses. The work, details, and activity sections remain
visible. There are no item-level tabs.

Existing item-shell rules remain authoritative:

- title and description use standard shadcn `ItemTitle` / `ItemDescription` and
  both remain uppercase;
- the expanded item has one neutral outline and no active background color;
- collapsed neighboring items use only their bottom divider;
- the first available item expands automatically when the URL has no valid
  item selection;
- exactly one V2 item remains expanded, and opening another item updates
  `prod-item-view` while closing the previous item.

## Capability Inventory

### Admin

- Create an assignment with assignee, due date, and bounded general or LH/RH
  quantities.
- Disable creation for zero pending quantity and dispatch-locked work.
- Show the no-assignment empty state without hiding Details or Notes.
- Show assignment owner, assigned-by identity/date, editable due date,
  quantities, completion, and material-review states.
- Submit production against an assignment through the existing bounded form.
- Show nested submissions and their material state.
- Preserve guarded assignment and submission deletion, including the existing
  disabled reasons when submissions, execution, dispatch, delivery, or material
  review prevent deletion.

### Production worker

- Show only server-authorized worker assignments and the worker's own
  submissions.
- Create a bounded submission with general or LH/RH quantities and an optional
  note.
- Show submitted/assigned aggregate progress at the section heading.
- Preserve material unavailable, material evidence unavailable, pending
  material approval, dispatch lock, and completed-work behavior.
- Preserve worker-authored deletion only where the existing sale-bound authority
  permits it.
- Never expose assignment creation, another worker's ownership metadata, admin
  progress strips, or admin-only mutation actions.

### Shared details and activity

- Render every non-hidden item config with the existing red-value treatment.
- Preserve the Production Note tag identity: `itemControlUID`, `salesItemId`,
  and `salesId`.
- Preserve note creation, public/production filtering, author/date, attachment
  preview, empty/loading/error states, and authorized admin note actions.
- Use text plus color for statuses so completion, warnings, and blocking states
  remain understandable without color perception.

## Implementation Plan

### 1. Replace the tab controller with a section composer

1. For the later-authorized V2-only delivery, keep
   `apps/dashboard/src/components/sheets/sales-overview-sheet/production-item-detail.tsx`
   as the legacy fallback and implement the stateless single-view composer under
   `production/v2/`.
2. Remove `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, local tab state, and
   `productionItemTabClassName`.
3. Keep `prod-item-view` as the expanded-item deep-link authority. Treat legacy
   `prod-item-tab` as ignored compatibility input during this slice; do not
   rewrite the URL on render merely to remove it.
4. Compose the work section first, Details second, and the existing item-scoped
   `Note` module last. Give sections semantic headings and `aria-labelledby`
   relationships.
5. Keep each section's loading and failure presentation independent so a slow
   Notes query does not blank Assignments or Details.

### 2. Separate creation controls from work records

1. Refactor
   `apps/dashboard/src/components/sheets/sales-overview-sheet/production-assignments.tsx`
   so its provider owns one continuous work surface with:
   - a top-level role-aware create control;
   - the inline form;
   - the work-section heading/progress; and
   - assignment/submission records.
2. Move the current admin `Collapsible` out of the Assignments heading and make
   it the first element in the surface. Reuse `ProductionAssignmentForm` without
   changing its mutation contract.
3. Lift the worker `Add submission` trigger/form out of
   `production-assignment-row.tsx` into the same top action location. Reuse
   `ProductionSubmitForm` rather than creating another submission writer.
4. If exactly one worker assignment is eligible, select it automatically. If
   more than one worker-owned assignment can accept a submission, show a compact
   assignment selector inside the opened form and default to the earliest due
   eligible assignment. This prevents the top-level action from submitting
   against an arbitrary hidden row.
5. Disable the top action when no eligible assignment exists. Keep the reason
   visible through existing warning/status copy rather than making the disabled
   control unexplained.
6. Closing or successfully submitting resets only the create form. It must not
   collapse the production item or scroll the user away from the refreshed work
   section.

### 3. Render the admin Assignments document section

1. Keep `ProductionAssignmentRow` as the authority for assignment-specific
   actions and states, but remove any duplicated create trigger.
2. Match Command Document hierarchy with simple separators, compact metadata,
   and no assignment card mosaic or heavy shadow.
3. Preserve editable due dates, Submit, status badges, guarded Delete, and
   nested `ProductionSubmissions`.
4. Keep the assignment skeleton and empty state inside the work section. Details
   and Notes remain rendered while this section loads or is empty.

### 4. Render the worker Submissions document section

1. Show `My submissions · submitted / assigned` at the section heading using
   `getWorkerProductionSubmissionProgress`.
2. Keep submission records flat and aligned to the same horizontal inset as the
   other sections.
3. Preserve author/date, handle quantities, notes, material-review state, and
   guarded deletion from `production-submissions.tsx`.
4. Remove the duplicated row-level Add submission disclosure after the
   top-level form is verified. Keep row-local status and destructive actions.
5. Render explicit empty states for no authorized assignment and no submissions
   without implying that Details or Notes are unavailable.

### 5. Align Details and Notes with Command Document

1. Keep Details as a small responsive definition grid using theme border and
   muted tokens. Do not add a separate card per fact.
2. Use two or three columns only where the available item width supports them;
   collapse to one column without horizontal overflow.
3. Add the `Notes & activity` section heading outside the existing `Note`
   implementation and keep `headline=""` to avoid duplicate headings.
4. Reuse the existing Note composer/list, filters, attachment behavior, and
   action permissions. Add an embedded spacing variant only if required; do not
   fork note mutations or tag construction.

### 6. Preserve loading and data boundaries

1. Do not fetch item work or notes for collapsed production items. The single
   view mounts only for expanded items through the existing item disclosure.
2. Once expanded, load work and notes concurrently because both are now visible.
   Keep separate skeletons/error boundaries so either section can resolve
   independently.
3. Preserve the current focused assignment query and Note tag filters. No broad
   order-history or cross-item query may be introduced for this layout change.
4. After successful mutations, retain the existing focused invalidation paths;
   do not refresh the full Sales Overview sheet unless the current mutation
   contract already requires it.

### 7. Accessibility and interaction acceptance

1. The create trigger is a real button with `aria-expanded` and
   `aria-controls`; its label changes between role-specific create and Close.
2. Cancel and successful mutation return focus to the create trigger.
3. Section headings follow a valid hierarchy and status badges are not the only
   carrier of meaning.
4. Quantity steppers keep keyboard behavior, bounds, disabled semantics, and
   visible labels.
5. Destructive actions retain confirmation/disabled behavior and accessible
   names identifying the assignment or submission target.

### 8. Automated validation

1. Update the focused Production item source contract to assert:
   - no item-level Tabs imports or triggers;
   - fixed section order;
   - role-aware create labels;
   - preserved Note tag identity;
   - uppercase shadcn item labels and item border/divider rules.
2. Add component/policy coverage for:
   - admin versus worker section visibility;
   - zero, one, and multiple eligible worker assignments;
   - create-form open/close/reset behavior;
   - submitted/assigned progress;
   - material blocked, material pending, dispatch locked, completed, and empty
     states;
   - assignment/submission deletion guards.
3. Run the narrowest relevant Bun tests first, scoped Biome/TypeScript checks
   second, then `bun run typecheck` only after focused validation. Report any
   unrelated repository baseline separately.

### 9. Authenticated browser acceptance

1. Admin proof:
   - unassigned item with open create-assignment form;
   - assigned item with editable due date, nested submission, Submit, and
     guarded Delete;
   - empty Notes and populated activity.
2. Worker proof:
   - zero-submission item with open create-submission form;
   - partially and fully submitted items;
   - pending material approval and configured-unavailable material;
   - allowed and disallowed deletion.
3. Verify 1,440px, 768px, and 375px layouts, keyboard-only traversal, focus
   return, no horizontal overflow, and no new console errors.
4. Browser acceptance must not create a durable production record unless a
   disposable local fixture and explicit mutation step are approved.

## Expected File Scope

- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-item-detail.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-assignments.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-assignment-row.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-submissions.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-submit-form.tsx`
- focused Production item tests beside the existing Sales Overview sheet tests
- `.brain/features/sales-production-workspace.md`
- `.brain/progress.md`

`production-assignment-form.tsx` and shared Note modules should change only when
an opt-in embedded-layout API is necessary. No schema, migration, new mutation,
API contract, or permission change is expected.

## Risks and Mitigations

- **Eager work after tab removal:** mount only for expanded items and keep work
  and notes queries independent and concurrent.
- **Worker top action targets the wrong assignment:** make eligible assignment
  selection explicit when more than one can accept production.
- **Permission drift while moving controls:** reuse existing mutation components
  and server authorities; move presentation ownership only.
- **Duplicate creation UI:** remove row-level create triggers only after the
  top-level form has parity coverage.
- **Activity becomes visually overwhelming:** use Command Document separators
  and compact typography while retaining complete records and empty states.
- **Legacy deep links include `prod-item-tab`:** keep the parameter harmless and
  ignored during rollout instead of creating render-time URL churn.

## Documentation Impact

- Update `.brain/features/sales-production-workspace.md` and
  `.brain/progress.md` after implementation and authenticated acceptance.
- Update `.brain/api/*`, `.brain/database/*`, or an ADR only if implementation
  unexpectedly changes an API/permission contract, persistence, or durable
  architecture. None is planned.

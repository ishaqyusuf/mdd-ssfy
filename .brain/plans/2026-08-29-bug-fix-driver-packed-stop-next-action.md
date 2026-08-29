# Driver Packed-Stop Next-Action Consistency Plan

## Objective

Make the driver route list and selected-stop workspace present one truthful,
server-authoritative next action after packing. A fully packed stop must never
prompt the driver to pack again. It may show `Start trip` only when every
departure gate passes; otherwise it must explain the blocking gate and direct
the driver to the appropriate review/help path without bypassing inventory,
packing-review, assignment, or proof controls.

## Confirmed Reproduction

- Authenticated Chrome fixture: order `09176PC`, dispatch `4403`.
- Route list: `7 / 7 packed` and `Ready to load`.
- Selected stop: `100%`, `7 of 7 packed`, every line `Packed`, top and list-level
  actions still say `Pack items` / `Edit`.
- The same stop reports `Inventory: Review`, `Dispatch state: Packing`, and
  `Departure: Blocked`.
- The rendered server payload has persisted dispatch status `queue`, summary
  `7 / 7 packed`, and inventory-backed manifest lines in
  `inventory_review`. Required component rows have no dispatch-bound picked
  allocations.
- Current focused tests pass (13 tests / 97 expectations), demonstrating a
  coverage gap: they test lifecycle status, inventory readiness, and source
  composition independently, but not the packed-plus-blocked action state.

## Root Cause

1. `driver-packing-command-dashboard.tsx` chooses between `Start trip` and
   `Pack items` using `dispatchReadiness.canDispatch`. Every non-terminal stop
   that cannot depart falls back to `Pack items`, even when remaining packing
   quantity is zero.
2. The route queue projects `Ready to load` and `canStartTrip` from effective
   dispatch/control status and packed totals. It does not apply the selected
   stop's inventory departure readiness, so list labels, summary counts, and
   the primary route action can disagree with detail.
3. The main route directly attempts Start Trip for any stop whose projected
   status is `packed`; the canonical start command then has to reject stale or
   blocked attempts.
4. The UI does not model `packing complete but departure blocked` as its own
   semantic state. Packing completion and departure readiness are separate
   facts in the domain, but the current action selection collapses them.

## Assumptions

- `Pack items` means the user's described `park items` action.
- Dispatch-bound inventory remains authoritative. The fix must not make
  `7 / 7 packed` sufficient to start an inventory-backed trip.
- Drivers may correct an already-packed quantity through item-level `Edit`, but
  that correction path must remain secondary after packing is complete.
- Inventory reconciliation/preparation is a warehouse or manager action. A
  driver-facing UI must expose the blocker or help path, not silently reserve,
  pick, or fabricate inventory evidence.
- No database migration should be necessary. If implementation discovers that
  departure capability cannot be projected efficiently for the route list,
  stop-level direct action must fail closed to `Review stop` until a bounded
  batch projection is available.

## Detailed Execution Plan

### Phase 1 — Lock the regression matrix

1. Add a pure action-state fixture for each combination:
   - packing incomplete and editable -> `Pack items`;
   - packing complete plus every gate ready -> `Start trip`;
   - packing complete plus inventory review -> `Review inventory` / blocked;
   - packing complete plus strict pending packing review -> review blocked;
   - nonblocking pending review plus all other gates ready -> `Start trip`;
   - in progress -> `Complete with proof`;
   - completed -> read-only completed state;
   - list control says packed while persisted/detail readiness is blocked ->
     fail closed, never `Ready to load` or direct Start Trip.
2. Reproduce dispatch `4403` with a browser assertion that checks the exact
   contradiction: route `Ready to load`, detail `7 / 7 packed`, detail
   `Departure blocked`, and top `Pack items`.
3. Keep the original server Start Trip guard as a required green control; the
   UI change must not weaken it.

### Phase 2 — Create one server-owned driver action projection

1. Extract/reuse one shared dispatch action-state resolver under the Sales
   dispatch-manifest boundary. Its inputs must keep these dimensions separate:
   persisted trip status, assigned actor, packed/target quantity, guarded
   review mode, destination validity, and dispatch-scoped inventory readiness.
2. Return semantic capabilities and blocker codes rather than inferring an
   action from a display label. At minimum expose:
   `packingComplete`, `canEditPacking`, `canStartTrip`, `canComplete`, and
   ordered `startTripBlockers` with an operator-safe reason.
3. Reuse or align the existing mobile lifecycle capability projection instead
   of creating a web-only rule. Keep the canonical mutation as the final
   authority and treat client capability as presentation guidance.
4. Preserve legacy-only behavior: a fully packed legacy dispatch with no
   component ledger may pass the inventory gate under the accepted legacy
   fallback; inventory-backed lines may not.

### Phase 3 — Make route list, summary, and detail consistent

1. Extend the driver manifest/list read model with the same bounded capability
   projection used by detail. Batch required readiness data to avoid an N+1
   query per stop.
2. Count `Ready to load` only when `canStartTrip` is true, not merely when an
   effective status/control projection says `packed`.
3. Move packed-but-blocked stops into `Needs attention` with a specific label
   such as `Inventory review`, while preserving packed progress as a separate
   fact.
4. Change the main-route primary action to dispatch on capability:
   - `canStartTrip` -> Start Trip;
   - `canComplete` -> Complete delivery;
   - packing incomplete and editable -> open packing;
   - otherwise -> open Review stop with the blocker visible.
5. Remove the status-only direct Start Trip attempt from the route workspace.
   A stale/unknown list capability must open detail rather than submit a
   mutation.

### Phase 4 — Correct the selected-stop action hierarchy

1. Derive the primary action from `remaining` plus server capabilities, not
   from `canDispatch` alone.
2. For the exact `4403` state, render:
   - primary status: `Packing complete`;
   - blocker: `Waiting for inventory verification`;
   - departure: `Blocked`;
   - secondary driver action: `I need help` or `Review blocker`;
   - no top-level `Pack items` button.
3. When every departure gate later passes, replace the blocked action with the
   enabled `Start trip` action without requiring another packing submission.
4. Hide the packing-list header button when remaining quantity is zero. Keep
   per-line `Edit` available only when the server says packing is editable, so
   corrections remain possible without misrepresenting the next workflow step.
5. Replace `Driver load 0 / 7` with wording that does not imply packed goods
   disappeared. Use a staged label such as `Packed 7 / 7` and
   `Load verification pending`, then `Loaded 7 / 7` only after the applicable
   readiness transition.

### Phase 5 — Validate the operational data path

1. Run the existing dispatch inventory reconciliation for `4403` read-only or
   dry-run first and identify why its component ledger has no picked
   dispatch-bound allocations.
2. Do not auto-repair the order as part of the UI fix. If the fixture needs
   inventory preparation, perform it through the existing guarded warehouse or
   manager command under separate operator approval.
3. Confirm that inventory preparation changes the same stop from
   `Packing complete / Inventory review` to `Ready to load / Start trip`
   without another Pack submission.

### Phase 6 — Verification and documentation

1. Run focused Sales lifecycle/readiness tests, API driver projection tests,
   dashboard model/component tests, and scoped formatting/type diagnostics.
2. Browser-check at least four fixtures: incomplete packing, `4403`-style
   packed-but-blocked inventory, fully ready inventory-backed, and fully packed
   legacy-only.
3. Verify route card label, summary counts, detail metrics, desktop action,
   mobile action bar, refresh/direct entry, and back-to-route consistency.
4. Verify Start Trip remains idempotent and server-rejected for stale or
   blocked manifests.
5. Update `.brain/features/driver-platform-revival.md`,
   `.brain/features/sales-dispatch-table.md`, and `.brain/api/contracts.md` if
   the driver projection contract changes. Add an ADR only if a new durable
   lifecycle stage or persisted status is introduced. No database documentation
   update is expected without schema/data-model changes.

## Acceptance Criteria

- A stop with `remaining === 0` never presents top-level `Pack items`.
- A stop appears as `Ready to load` only when the same server projection allows
  Start Trip.
- Route summary, route card, selected-stop detail, desktop action, and mobile
  action bar agree for the same manifest revision.
- Packed-but-blocked stops preserve `7 / 7 packed` and explain the exact
  blocker; they do not lose packing evidence or prompt a duplicate pack.
- Removing the blocker reveals Start Trip without another packing write.
- Inventory-backed trips cannot start without dispatch-bound picked evidence.
- Legacy-only accepted fallback behavior remains covered and unchanged.

## Implementation Outcome

- The selected stop feeds the existing protected `dispatch.manifest`
  projection's server-owned `mobileLifecycle.capabilities` and
  blocker codes into one pure action resolver reused by desktop and mobile
  action surfaces.
- Packing writes and packing-review decisions invalidate the selected manifest,
  so capability transitions appear without a duplicate packing submission.
- Fully packed, inventory-blocked stops now show `Inventory review required`,
  `Packing complete`, and `Inventory verification pending`; the top-level Pack
  action is hidden while item-level correction remains available.
- Ready stops still expose Start Trip, and the canonical Start Trip mutation and
  server guards remain unchanged.
- The route list now fails closed when its status-only projection says
  `ready_to_load`: it displays `Packed` and opens the authoritative stop detail
  instead of attempting Start Trip directly. The summary retains its server
  status count as `Packed stops / Review before departure` until a bounded
  list-wide departure-capability projection exists.
- Authenticated Chrome verification on `09176PC` / dispatch `4403` confirmed
  `7 / 7 packed`, `Inventory review required`, no top-level Pack action,
  `Packing complete`, `Departure blocked`, and `Load status 7 / 7`. The route
  card now reads `Packed` rather than `Ready to load`.
- Focused driver-dashboard, lifecycle, and inventory-readiness validation passes
  15 tests / 112 expectations. Scoped Biome lint/check and whitespace checks
  pass; broad typecheck was not run under the repository's fast Bun command
  discipline.

## Skills List Used

- `chrome:control-chrome` — inspected the authenticated driver route and exact
  rendered server payload in the user's open Chrome session.
- `diagnosing-bugs` — reproduced the contradiction, traced the divergent
  projections, and identified the missing regression seam.
- `plan` — organized the mitigation into dependency-ordered implementation and
  validation phases.
- Project Brain protocol — aligned the plan with ADR-050, ADR-054, ADR-065,
  ADR-066, ADR-069, ADR-073, and current driver/fulfillment records.

## Risks and Mitigations

- **Risk: UI fix accidentally bypasses inventory.** Keep canonical Start Trip
  guards unchanged and drive presentation from their capability projection.
- **Risk: route list adds N+1 readiness queries.** Batch readiness inputs or
  fail closed to Review stop; do not load a full detail manifest for every row.
- **Risk: list/detail cache drift after packing.** Invalidate the driver
  manifest, summary, detail/action projection, packing overview, and selected
  manifest from one shared boundary.
- **Risk: blocked wording sends drivers to an action they cannot perform.** Map
  blocker codes to role-appropriate copy and use Help/Review for drivers;
  reserve/pick controls stay manager/warehouse-only.
- **Risk: old dispatches have conflicting control and persisted status.** Test
  the mismatch explicitly and choose the more restrictive capability until
  reconciliation proves readiness.
- **Risk: packing corrections become inaccessible.** Retain item-level Edit as
  a secondary capability-gated action after packing completion.

# Driver Ready Route Start And Manifest Cleanup Plan

## Objective

Make `/sales-book/dispatch-task` a cleaner driver command center by removing
pricing/labor content and repeated facts from the driver packing manifest,
adding a truthful Ready section before Needs Attention, enabling one guarded
Start Trip command for all eligible stops in the current route scope, and
making the summary metrics clickable filters. Preserve the existing packing,
inventory, assignment, guarded-review, proof, and Start Trip authorities.

## Assumptions

- This request targets the responsive web driver route at
  `/sales-book/dispatch-task` and its selected-stop Packing List, with shared
  API/domain work reused by Expo where appropriate.
- A Ready stop is not merely packed. It is assigned to the authenticated
  driver, fully packed, destination-valid, inventory-ready, allowed by the
  current guarded-packing policy, non-terminal, and authorized by the same
  server rules used by the canonical Start Trip command.
- The first release should start all eligible overdue/today stops assigned to
  the driver through one server request. It should not create a new persisted
  Route/Trip database entity unless implementation proves the current
  per-dispatch lifecycle cannot support the batch safely.
- Non-shippable service and labor-only rows do not belong in a driver's load
  manifest. Physical items remain visible, but their driver presentation must
  contain no prices, labor rates, unit costs, or cost-derived phrases.
- The driver may retain item-level packing correction where authorized, but
  bulk Start Trip never changes packing or inventory evidence.
- Design concepts and HTML prototypes are a separate approval-gated phase. No
  production UI implementation begins until one direction is selected.

## Detailed Execution Plan

### Phase 1 — Lock the current behavior and acceptance matrix

1. Capture representative fixtures for a door/garage-door order whose legacy
   subtitle repeats product type, size, handing, quantity, and labor cost; a
   fully ready multi-stop route; a packed-but-inventory-blocked stop; a pending
   packing-review stop; an already-in-progress stop; and a completed stop.
2. Add contract expectations that distinguish these facts:
   `packingComplete`, `canStartTrip`, `startTripBlockers`, `driverVisible`, and
   driver-safe item presentation.
3. Confirm the current role boundary for each fixture. Drivers may read and act
   only on assigned dispatches; managers and warehouse operators retain their
   existing broader surfaces.
4. Record the exact current payload leak: the legacy composite `subtitle`
   includes strings such as `$ .../qty labor` or `no labor cost` and is passed
   to the driver manifest.

Dependency: none. This phase freezes the regression evidence before contract
or UI work.

Validation: focused query/model tests plus authenticated browser screenshots at
mobile and desktop widths.

### Phase 2 — Create one driver-safe structured manifest presentation

1. Move driver item presentation into the shared Sales dispatch-manifest
   boundary rather than maintaining separate string composition in the API,
   driver dashboard, and warehouse packing UI.
2. Return structured driver fields instead of asking the driver UI to parse a
   legacy subtitle:
   - one canonical product title;
   - item type only when it adds information not already in the title;
   - normalized size;
   - normalized handing/swing without repeating the ordered quantity;
   - ordered, packed, and remaining quantities in their dedicated quantity
     fields;
   - optional non-financial configuration attributes needed to identify the
     physical item.
3. Add a server-side driver visibility policy:
   - omit non-shippable labor/service-only rows from the load manifest;
   - omit all price, rate, labor-cost, unit-cost, and line-total fields from the
     assigned-driver response;
   - preserve the richer warehouse/manager projection only where their
     workflow actually requires it.
4. Make de-duplication semantic and case-insensitive. Normalize punctuation and
   labels so `Garage Door`, `garage door`, repeated dimensions, repeated
   handing, and quantity phrases appear once at most.
5. Render quantities in one consistent location. A line should read like
   `H.C. 2 Panel Square Top` with secondary facts such as
   `Pre-hung door · 30 × 80 · LH`, while `7 / 7 packed` remains in the progress
   column and is not repeated in the description.
6. Add tests for legacy identifiers, raw subtitle fallback, doors, garage
   doors, LH/RH, no-handle items, zero quantities, service-only rows, money
   tokens, `no labor cost`, and repeated case/punctuation variants.

Dependency: Phase 1 fixtures.

Decision point: if the current shared `dispatch.manifest` response cannot safely
vary by actor scope, introduce an explicit driver projection instead of relying
on UI-only redaction. UI-only hiding is not acceptable for financial content.

Validation: API response assertions must prove forbidden financial tokens and
fields are absent, not merely hidden by CSS.

### Phase 3 — Add a server-owned Ready projection

1. Extend the bounded driver work-queue projection with a semantic next-action
   result for every visible stop. Reuse the existing mobile lifecycle resolver
   and canonical Start Trip guards; do not infer readiness from persisted
   `packed` status alone.
2. Project at minimum:
   `packingComplete`, `canStartTrip`, `nextAction`, ordered blocker codes,
   manifest/action revision, and a driver-safe blocker label.
3. Batch the readiness inputs for the current page/route scope to avoid one
   full manifest query per stop. Keep selected-stop details on demand.
4. Define dashboard groups from the same projection:
   - **Ready**: `canStartTrip === true`;
   - **Needs Attention**: packed or scheduled work blocked by inventory,
     packing review, destination, assignment, stale data, or an open exception;
   - **In Progress** and **Completed**: canonical lifecycle states;
   - incomplete packing remains in the normal route queue.
5. Replace the current status-only `Packed stops / Review before departure`
   approximation with separate packed-progress and ready-to-depart facts. A
   packed-but-blocked stop remains visibly packed but never enters Ready.
6. Ensure summary counts are stable global counts for the driver's active route
   scope rather than shrinking to whatever metric filter is currently open.

Dependency: Phase 1. This may proceed in parallel with Phase 2 after the
regression fixtures are locked.

Validation: query tests cover mixed routes and prove the Ready panel, metric
count, filtered view, selected-stop action, and canonical mutation all agree at
the same revision.

### Phase 4 — Add one guarded Start Trip batch command

1. Add a dedicated protected command such as `dispatch.startReadyRoute`. The
   browser sends an idempotent request id plus the exact ready dispatch ids and
   their action/manifest revisions; it never sends a trusted driver id.
2. Resolve the authenticated driver on the server and validate every requested
   dispatch again for assignment, lifecycle state, packing completion,
   guarded-review policy, inventory binding/readiness, destination, deletion,
   and revision freshness.
3. Reuse the canonical per-dispatch Start Trip domain transition. The batch is
   orchestration, not a shortcut around existing rules.
4. Return bounded per-stop outcomes: `started`, `already_started`,
   `stale_refresh_required`, or `blocked` with a safe reason. Ready stops may
   continue when another row became blocked, but the result must clearly list
   every skipped stop.
5. Make retries safe by deriving stable per-dispatch idempotency from the batch
   request id. Do not emit duplicate lifecycle events or notifications.
6. Invalidate only the affected driver queue, stable summary, Ready panel,
   selected manifests, and route activity after completion.
7. Keep the existing single-stop Start Trip command in the selected-stop view
   as a supported fallback.

Dependency: Phase 3 action/revision projection.

Decision point: use the existing per-dispatch model for this release. Propose a
persisted Route/Run entity only if product requirements expand to route-level
GPS, route-wide proof, vehicle/load verification, or durable route scheduling.

Validation: tests cover mixed eligible/blocked rows, cross-driver forgery,
stale revisions, duplicate requests, notification failure after committed
starts, and refresh/retry behavior.

### Phase 5 — Make the dashboard operational and clickable

1. Add a Ready panel immediately before Needs Attention in the supporting
   dashboard column. It lists the current ready orders with customer, order
   number, schedule, packing total, and a compact Review link.
2. Add one visually dominant `Start trip` button labeled with scope, for
   example `Start trip · 3 stops`. Before submission, show a concise
   confirmation listing included stops and any excluded blockers.
3. Disable the button when there are no eligible rows, data is stale/offline,
   or a batch is already running. Preserve the existing weak-network and
   explicit sync-state behavior.
4. Make each summary metric a keyboard-accessible URL-backed control with
   hover, focus, selected, loading, empty, and back/forward behavior:
   - Assigned -> all active assigned stops;
   - Packed -> all packed stops, grouped into Ready and Needs Review;
   - In Progress -> active trips;
   - Needs Attention -> overdue/blocking work;
   - Completed -> completed stops.
5. Keep metric counts independent from the active filter. The selected metric
   changes the route list and is visually indicated, but it does not rewrite
   the underlying totals.
6. Preserve the selected stop and route scroll position when entering a metric
   view or returning from a stop.
7. On mobile, place the Ready panel before Needs Attention and keep the batch
   action reachable without competing with the selected stop's one primary
   action.

Dependency: Phases 3 and 4.

Validation: keyboard/screen-reader checks, 390/768/1280/1440 responsive checks,
URL refresh/back/forward tests, and authenticated driver QA.

### Phase 6 — Approval-gated GStack design exploration

1. After this plan is approved, use `design-html` to produce three responsive
   HTML concepts based on the actual data/actions above and the selected Route
   Command visual language.
2. Each concept must show desktop and phone states for: normal route, multiple
   ready stops, no ready stops, packed-but-blocked, batch confirmation, partial
   batch result, selected metric, and cleaned packing lines.
3. Keep all concepts behaviorally equivalent. They may explore hierarchy,
   density, Ready-panel placement, and metric interaction, but may not change
   lifecycle meaning or invent driver permissions.
4. Review the concepts against touch target, scan time, action clarity,
   one-handed mobile use, contrast, overflow, and weak-network criteria.
5. Present the three concepts for explicit selection. Do not mix concepts or
   begin production UI work until the user chooses a direction.

Dependency: approval of this plan.

Validation: static HTML interaction checks and responsive screenshots; no
production application source changes.

### Phase 7 — Implement the selected design and verify end to end

1. Implement the selected concept using the existing thin server route,
   bounded prefetch/hydration, URL-owned filters, intercepted stop route, and
   focused component boundaries.
2. Keep the shared summary, queue, Ready panel, and selected manifest as
   independently refreshable query boundaries. Do not load every full manifest
   to render the first screen.
3. Add focused package/API/dashboard tests and run scoped Biome, touched-file
   TypeScript diagnostics, and the narrowest relevant builds/tests.
4. Browser-test at least: one ready stop, several ready stops, mixed
   ready/blocked, stale revision, offline, partial batch success, single-stop
   fallback, and completed route.
5. Run the Brain impact check. Update driver and dispatch feature docs plus API
   contracts if the projection/batch endpoint changes. Update permission docs
   only if authorization changes; update database docs only if a schema change
   becomes necessary; add an ADR only for a durable route/run model or new
   lifecycle authority.

Dependency: selected design from Phase 6.

## Acceptance Criteria

- Assigned-driver API payloads and rendered packing lines contain no labor
  price, labor-cost, unit-cost, rate, line-total, or other financial detail.
- A driver sees each product type, product title, size, handing, and quantity in
  one intended location without semantic duplication.
- Ready contains only stops that the canonical server Start Trip transition
  would currently accept.
- One button starts all currently eligible stops in the driver's overdue/today
  route scope through one protected, idempotent request and reports every
  started/skipped outcome.
- Packed-but-blocked rows remain visibly packed, appear under Needs Attention
  or Needs Review, and never start through the batch.
- Every summary metric is accessible, URL-backed, clickable, and produces the
  matching list while stable totals remain visible.
- Single-stop Start Trip, packing correction, help, proof completion, weak-
  network recovery, permissions, and inventory guards continue to work.
- One of three HTML design concepts is explicitly approved before production
  UI implementation.

## Skills List Used

- `plan` — organized the proposal into approval-gated, dependency-ordered
  implementation and validation phases.
- Project Brain protocol — aligned the plan with the implemented driver command
  center, packed-stop action fix, canonical manifest, dispatch permissions, and
  existing bulk-action invariants.

Reserved for the next approved phase:

- `design-html` — will generate the requested three responsive interface
  concepts after this plan is approved.

## Design exploration outcome — 2026-08-29

The plan was approved and Phase 6 produced three behaviorally equivalent,
responsive HTML concepts. The user selected Option A, Ready Rail, for
production implementation.

- **A — Ready Rail (recommended):** preserves the approved Route Command
  hierarchy and places a compact Ready panel immediately before Needs
  Attention. This is the lowest-churn direction and keeps route scanning
  dominant while making batch departure obvious.
- **B — Departure Deck:** promotes the cleared load into a full-width departure
  deck directly below the clickable metrics. This makes Start Trip the clearest
  action but uses more vertical space before the route list.
- **C — Ready Board:** gives every ready stop an individual verification card
  above the route list, plus one route-level action. This provides the strongest
  pre-departure review but is the densest phone layout.

All concepts include clickable metric states, Ready before Needs Attention, a
single Start Trip action for three eligible stops, confirmation, a partial
success result, and a packing manifest that shows each physical item and its
quantity/progress once. Prototype syntax, desktop/phone rendering, overflow,
dialog states, and forbidden financial-copy checks passed.

Artifacts:
`~/.gstack/projects/gnd/designs/driver-ready-dashboard-20260829/`.

## Implementation outcome — 2026-08-29

- Implemented Option A, Ready Rail, immediately before Needs Attention with
  explicit ready-stop links and one prominent route-level Start Trip action.
- Added a batched server readiness projection that separates packed state from
  departure eligibility without loading every full manifest on the list view.
- Added `dispatch.startReadyRoute`, which accepts only explicit stop ids,
  revalidates assignment and every canonical Start Trip guard, and returns
  per-stop started, already-started, or blocked outcomes.
- Preserved the existing selected-stop packing sheet. Its driver manifest now
  uses a shared server-safe item presentation that excludes labor/financial
  copy and emits product type, size, handing, and quantity only once.
- Made the top metrics URL-backed controls with stable totals, including Packed
  and Ready navigation states.
- Focused validation passed 47 tests / 473 assertions and scoped Biome. Exact
  authenticated list/manifest reads passed against local data; browser QA
  verified the Ready Rail, clickable metrics, blocked-stop exclusion, disabled
  empty-route safety, and existing stop-sheet navigation. The local driver
  fixture had no eligible Ready stops, so the enabled confirmation/result path
  is covered by contract tests rather than a state-mutating browser fixture.
- No schema, migration, durable Route entity, or ADR was required.

## Follow-up packing QA and pipeline design — 2026-08-29

- Fixed submit-time revision freshness, absent-production legacy
  materialization, handled-quantity command transport, and truthful packing
  precondition presentation.
- Verified the original `09499LM` 12-unit failure as a successful pack after
  the fix.
- Assigned 12 additional orders to Miguel through the authenticated admin
  workspace and exercised them through the driver surface: four normal packs,
  two guarded-review outcomes, and six legitimate inventory blocks. Start and
  completion remained unavailable where destination, schedule, inventory, or
  review evidence was incomplete.
- Finalized the Option A follow-up desktop pipeline with three interactive
  views: route sequencing/Ready Rail, existing stop packing sheet with enriched
  stop details, and active-trip navigation/proof handoff. The artifact passed
  interaction checks and route/detail/trip overflow checks at 1440, 768, and
  375 pixels.
- Artifact:
  `~/.gstack/projects/gnd/designs/driver-route-pipeline-20260829/finalized.html`.

## Route pipeline implementation outcome — 2026-08-29

- Implemented the selected Option A route map, existing stop-detail packing
  workspace with map/directions, destination-review preflight, and Active Trip
  workspace using focused shadcn components and the existing URL/query model.
- Added a protected, assignment-rechecked Google place normalization command
  and versioned dispatch-scoped routing projection while preserving the primary
  customer address.
- Destination-only failure is now repairable inside Ready; every other canonical
  departure blocker remains excluded. Batch start still revalidates each stop.
- Extended nonblocking guarded physical verification through the actual
  inventory start/completion assertion instead of relying on settings copy.
- Focused validation passed 67 tests / 212 assertions. Authenticated browser QA
  covered a 15-stop route, Ready Rail, batch modal, stop map, pickup behavior,
  settings state, and the live duplicate-quantity cleanup.
- Google Places API (New) was disabled during the 2026-08-29 browser pass. A
  production-key autocomplete probe returned HTTP 200 on 2026-08-31, clearing
  the live destination-resolution configuration gate without exposing the key.

## Risks and Mitigations

- **Financial data remains in the payload after visual hiding.** Redact and
  project driver-safe fields on the server; assert forbidden fields/tokens are
  absent from assigned-driver responses.
- **String cleanup removes useful product identity.** Prefer canonical
  structured fields, retain non-financial configuration attributes, and cover
  legacy fixtures before removing subtitle fallback.
- **Packed is mistaken for Ready.** Make `canStartTrip` the only Ready
  membership rule and retain the canonical mutation as final authority.
- **Batch Start Trip creates partial or duplicate transitions.** Use one
  idempotent server command, revalidate every dispatch, return per-row results,
  and reuse existing lifecycle transitions and notification semantics.
- **A batch starts future or unintended work.** Default the batch to the
  explicitly displayed overdue/today Ready scope and show a confirmation list;
  never infer hidden rows from a client-side count.
- **List-wide readiness creates N+1 queries.** Batch the minimal readiness
  inputs and keep full manifest/inventory detail on demand.
- **Clickable metric counts become misleading.** Compute stable totals from a
  summary scope independent of the selected metric filter and test each
  count-to-list mapping.
- **A new route entity is introduced too early.** Ship server-side batch
  orchestration over existing dispatches first; require a separate decision and
  ADR for durable route-level state.
- **The redesign overloads mobile drivers.** Preserve one dominant action,
  use 44px minimum targets, show Ready before attention, and validate all three
  concepts at phone widths before selection.

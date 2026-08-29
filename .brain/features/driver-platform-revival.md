# Driver Platform Revival

## Status

Closeout specified on 2026-08-07; implementation is paused pending execution of
the approved local tickets. Automated contract, domain, and focused mobile
validation is green. The dedicated development router renders in SDK 54 Expo
Go, and device proof now includes a reversible inventory-backed dispatch moving
from `UNPACKED 0/3 · Inventory Review` to `PACKED 3/3 · Ready To Load`.
Assigned-driver completion remains open. The development employee picker now
fills the selected email plus the shared development master password and waits
for explicit form submission, but the approved password-free genuine employee
session operation remains unimplemented. Mixed inventory/legacy packing
atomicity, final driver start/proof completion, lifecycle failure evidence, and
pilot handoff are tracked in `.scratch/driver-platform-revival-closeout/`.

## Behavior

- Authenticated drivers receive a server-owned work queue grouped into
  `overdue`, `today`, `tomorrow`, `upcoming`, and `unscheduled` sections.
- Queue totals are authoritative and independent of loaded pages. Cards and
  detail views label the delivery date explicitly instead of mixing overdue
  work into a generic urgent list.
- Dispatch detail uses a typed manifest. Legacy lines preserve their existing
  source fields and expose size, item type, LH/RH/total quantities, and an
  explicit missing-data warning instead of inventing handing information.
- Inventory-backed lines expose SKU/variant, required components, bound and
  available allocations, inbound shortage, readiness, and a stable revision.
- A split delivery scopes component demand proportionally to the item quantity
  on that `OrderDelivery`; one trip cannot reserve the whole sales line.
- Warehouse confirmation binds exact approved allocation quantities to the
  dispatch and transitions them to picked. Starting a trip requires its scoped
  required components to be picked. Completion consumes only picked allocations
  bound to that dispatch. Cancellation releases active allocations; picked
  stock requires an explicit manager confirmation that it was physically
  returned.
- Legacy-only dispatches continue through the existing fulfillment path and
  are labeled `legacy_item`; missing inventory identity is never treated as
  available inventory.
- Development quick-login employees are returned only when the API process is
  in `NODE_ENV=development`, and the mobile selector is compiled only under
  `__DEV__`. Preview and production do not expose the account list.
- Dark mode shares the Al-Ghurobaa podcast app's semantic identity: near-black
  background, layered charcoal card/popover surfaces, high-contrast neutral
  text, and green primary/accent/ring tokens. The palette is applied through
  the shared navigation and NativeWind semantic variables rather than
  screen-specific colors; the existing light palette is unchanged.

## Interfaces

- Mobile: `apps/mobile/src/app/(drivers)/dispatch`, the shared dispatch detail
  surface, and the warehouse packing surface.
- API: protected `dispatch.driverWorkQueue`,
  `dispatch.driverWorkQueueSummary`, `dispatch.manifest`,
  `dispatch.prepareInventoryForDispatch`,
  `dispatch.inventoryReconciliation`, and
  `dispatch.backfillInventoryBindings`.
- Domain: `packages/sales/src/dispatch-manifest/*`, inventory dispatch
  transitions in `sales-fulfillment-plan.ts`, and atomic dispatch lifecycle
  orchestration in `sales-control/tasks.ts`.

## Rollout and Operations

- Run inventory reconciliation before binding historical allocations.
- Backfill defaults to dry-run and automatically selects only a sale with one
  active dispatch. Exact quantities are planned from that dispatch's scoped
  manifest; ambiguous sales remain untouched.
- Pilot with assigned drivers and warehouse operators before broad enablement.
  Compare legacy packing quantities, inventory readiness, and post-completion
  consumed allocations for every pilot trip.
- Do not claim mobile cutover complete until a valid packed/assigned local
  dispatch completes Start Trip and proof completion in Expo Go, consumes its
  exact picked allocations once, and passes the approved reconciliation and
  retry gates.

## Validation Evidence

- Sales and API TypeScript checks pass.
- Focused work-queue, manifest normalization, permissions, quick-login,
  inventory transitions, reconciliation, and transaction tests pass.
- Prisma Client generation and local schema synchronization pass.
- Android debug assembly/install passes.
- The dedicated driver development router, direct icon imports, and Expo Go
  native-module compatibility boundary reduce the active bundle from roughly
  10,418 modules to roughly 3,100 and avoid the prior Hermes `hades` crash.
- Expo Go 54.0.8 device proof passes ordinary login, development-only employee
  list rendering, authenticated assigned queue, dispatch detail, the
  Al-Ghurobaa dark palette, and exact warehouse preparation for the reversible
  inventory fixture. The picker now replaces both credential fields when a
  different employee is selected; device proof of the revised interaction is
  pending because the connected Android device became unavailable during the
  implementation session.
- Theme/runtime/security regression coverage passes 12 tests with 51
  assertions, including exact dark identity tokens and development-only
  account/router boundaries.

## Approved Closeout Work

- Specification: `.scratch/driver-platform-revival-closeout/map.md`
- Immediate frontier: genuine development employee quick login and atomic mixed
  inventory/legacy packing.
- Dependent frontier: inventory-backed driver journey, lifecycle failure safety
  and reconciliation, then pilot/cutover evidence and handoff.

## Related Records

- `.brain/plans/driver-platform-revival/map.md`
- `.scratch/driver-platform-revival-closeout/map.md`
- `.brain/decisions/ADR-050-dispatch-bound-inventory-execution.md`
- `.brain/features/inventory-backed-sales-fulfillment.md`
- `.brain/features/mobile-dispatch-proof-completion.md`

## 2026-08-23 Responsive Dashboard Design Exploration

- Created three clickable responsive driver dashboard directions using the
  existing Sales Finance, Sales Rep Dashboard, driver work queue, manifest,
  readiness, proof, and weak-network contracts as references.
- Route Command emphasizes a balanced light command center, Dispatch Ledger
  emphasizes exact operational scanning, and Field Focus emphasizes phone-first
  weak-signal execution. All three preserve the same server-owned product
  contract so selection is a hierarchy and visual-taste decision.
- Verified the prototypes at 375, 768, and 1280 pixels, exercised their primary
  actions, removed document-level mobile overflow, and observed no console
  errors.
- The comparison board is stored at
  `/Users/M1PRO/.gstack/projects/gnd/designs/driver-dashboard-system-20260823/design-board.html`.
- The complete proposed implementation and rollout plan is
  `.brain/plans/2026-08-23-feature-driver-dashboard-command-center.md`.
- No production route or application behavior changed. Direction selection is
  required before implementation.
- Route Command was approved exactly as shown on 2026-08-23. No Dispatch Ledger
  or Field Focus remix was requested. This locks the visual base but does not
  authorize implementation.
- Decision record:
  `.brain/decisions/ADR-065-route-command-as-driver-dashboard-visual-base.md`.

## 2026-08-23 Responsive Web Command Center Implementation

- `/sales-book/dispatch-task` now renders the approved Route Command dashboard
  for Delivery-role users instead of the generic dispatch table.
- The route server-prefetches the assigned-driver manifest and authoritative
  summary, then hydrates a URL-owned responsive workspace with conventional
  search, fixed Today/All Stops/Exceptions/Completed views, next stop, blocking
  attention, activity, and explicit connectivity state. Sidebarless users see
  the compact GND mark without the wordmark beside the standard page title.
- Selecting a stop uses a Next.js intercepted route to open a full-page modal
  while retaining the route dashboard and browser history underneath. The same
  URL renders a standalone stop page on refresh or direct entry. The default
  stop surface is the approved Design A packing dashboard, with progress
  metrics, manifest rows, destination, readiness gates, and activity visible in
  one workspace. Help, packing, and lifecycle-aware proof remain URL-owned;
  invalid proof/help deep links return to the dashboard.
- Design A's Pack Items action reuses the existing Sales Overview packing form
  as a right-side sheet on desktop and a full-width sheet on mobile. The
  dashboard stays mounted underneath. Ready and awaiting-production quantities
  remain separate, the form owns scrolling, and Cancel/Pack actions stay fixed.
  Packing writes invalidate the selected manifest, dashboard manifest, summary,
  and existing dispatch overview queries.
- Proof completion uses the established server mutation and stores a versioned
  recoverable browser draft containing a stable request id, signature path,
  notes, and bounded image attachments. Successful sync clears the draft;
  failures retain it for retry.
- No API, authorization, database, or migration contract changed. The existing
  mobile surface remains canonical until the reversible pilot, weak-network,
  real-device, and cutover gates are satisfied.
- The command header connectivity indicator now uses React's external-store
  hydration contract with a stable online server snapshot, then subscribes to
  browser `online` and `offline` events. The final focused dashboard and packing
  suites pass 26 tests / 76 assertions, scoped Biome is clean, and the broad
  Dashboard typecheck reports no diagnostics in the touched migration files.
  Authenticated Delivery-role Chrome QA verifies URL search, the intercepted
  modal, direct-route fallback, modal Back/Close history, Design A dashboard,
  reused packing side sheet, and desktop/mobile layouts at 1512x827 and 390x844
  without hydration or runtime errors. No dispatch mutation was submitted
  during this acceptance pass.

## 2026-08-23 Stop Packing Workflow Design Exploration

- Created five standalone responsive HTML prototypes for the selected-stop
  packing experience requested after the Route Command implementation. Every
  direction preserves the same interaction contract: select a stop, review
  authoritative ordered/available/packed truth, enter exact scalar or LH/RH
  quantities, keep guarded-review quantity outside canonical packed readiness,
  and visibly recalculate status, sync, and activity after submission.
- Ranked the directions for this product as: A Packing Command Sheet, C Pack
  Coach, D Split Manifest Desk, B Load Bay Ledger, then E Exception-First
  Board. Option A is recommended because it most directly combines the
  approved Route Command shell with the existing Sales Overview packing
  dashboard and secondary Pack Items pane.
- Verified every prototype at 1440 by 1000 and 390 by 844 pixels. Desktop and
  mobile captures have no document-level horizontal overflow and produced no
  browser console errors.
- The comparison board, interactive HTML files, and ten screenshots are stored
  under
  `/Users/M1PRO/.gstack/projects/gnd/designs/driver-stop-packing-20260823/`.
- No production route, mutation, API, authorization, database, or mobile
  behavior changed. The ranked recommendation is not an approval decision;
  implementation remains pending the user's variant selection.

### Selection and implementation

- Option A Packing Command Sheet was approved and implemented later on
  2026-08-23 inside the intercepted full-page stop workspace.
- The implementation reuses the canonical Sales Overview packing form and
  guarded availability plan in the existing side-sheet interaction. Design A
  owns the selected-stop dashboard; the form opens above it and does not
  introduce a driver-only packing mutation or alternate readiness calculation.
- Architecture decision:
  `.brain/decisions/ADR-066-intercepted-driver-stop-workspace.md`.

### 2026-08-23 Loading-state follow-up

- Dispatch Tasks now has an immediate route-level loading boundary plus a
  section-shaped Suspense fallback. The skeleton preserves the command header,
  conventional search/tabs, five-metric strip, next stop, route rows, attention,
  and activity layout across desktop and mobile.
- Standalone and intercepted selected-stop routes render the same Design A
  skeleton while the bounded manifest and packing overview prefetches stream.
  The fallback preserves the stop header, five metrics, packing rows,
  destination, readiness, activity, and mobile action bar.
- Opening Pack Items now shows a full-height shared packing-drawer skeleton for
  both dynamic-module and query loading. It matches the canonical admin form's
  header, selection bar, item list, and fixed footer; no driver-only form or
  mutation was added.
- This is a presentation and streaming change only. API, authorization,
  database, packing authority, lifecycle, and mobile-app contracts are
  unchanged.

### 2026-08-23 Standalone stop header ownership fix

- The standalone selected-stop route now keeps the standard application header
  as its only page-level header. The stop workspace header remains available
  inside the intercepted full-page modal, where it owns modal navigation and
  context, and remains reduced to subflow controls for direct proof/help URLs.
- Standalone and modal loading skeletons mirror the same ownership rule, so a
  duplicate GND mark and route header do not flash while data streams.
- Delivery-window rendering now uses the canonical dispatch business timezone
  (`America/New_York`) on both server and client to prevent hydration drift.
- Authenticated Chrome verification on dispatch `4403` confirms one visible
  banner on the standalone stop page and no new warnings or errors after a full
  reload. No dispatch or packing mutation was submitted.

### 2026-08-23 Floating Pack Items sheet follow-up

- Driver Pack Items now uses the shared `CustomSheetV2` presentation instead of
  a raw edge-attached sheet. It is inset and rounded on desktop, remains
  full-width on mobile, and keeps the existing fixed footer and independently
  scrolling item form.
- The loading state uses the same custom floating sheet shell, preventing a
  geometry change when the packing module or dispatch data resolves.
- Opening and closing Pack Items now changes the stop-local `mode` query with a
  shallow URL transition. The selected-stop dashboard remains mounted, so the
  route-level loading boundary does not flash and any asynchronous packing work
  stays inside the floating sheet skeleton. The same client-owned transition is
  used for proof/help subflows; dashboard search and list state remain
  server-backed.
- Packing-form item titles render as normalized uppercase in both Ready to Pack
  and Awaiting Production sections. The description beneath each title is the
  exact canonical Production subtitle, including its complete section, size,
  handing, quantity, and labor description; packing no longer rebuilds or
  shortens that subtitle for legacy-title rows. This is presentation-only;
  stored product text is unchanged.
- The canonical packing provider, guarded availability plan, mutations,
  permissions, and invalidation paths remain unchanged.

### 2026-08-23 End-to-end dispatch lifecycle completion

- The approved Design A stop dashboard exposes desktop trip actions as well as
  the mobile action bar. A ready stop can start its trip and an in-progress stop
  can open the existing proof form without leaving the selected workspace.
- Delivery completion requires recipient signature evidence, preserves
  retryable form state on validation failure, submits through the canonical
  proof mutation, and returns to a read-only completed dashboard with
  proof-saved, delivered, and 100% packed confirmation.
- Guarded packing may be submitted while production or material evidence is
  pending, but counts as packed only after exact report approval. Approved
  guarded quantities can be replayed through canonical packing without being
  blocked by the still-pending upstream material review.
- Fully packed legacy dispatches with no component ledger may pass the
  inventory departure gate. Inventory-backed lines retain component-ledger
  authority.
- Authenticated acceptance covered admin assignment, driver guarded packing
  and consent, admin approval, trip start, required-signature validation,
  signed completion, and the completed stop UI. Evidence is stored in
  `artifacts/dispatch-lifecycle-20260823/`.
- Decision: `.brain/decisions/ADR-068-guarded-fulfillment-and-production-review-authority.md`.

### 2026-08-23 Expo delivery logic hardening

- The existing mobile route and screen flow is preserved, but action authority
  now comes from one protected detail projection with lifecycle stage, risks,
  packing revision, pending-review count, capabilities, and typed blockers.
- Expo packing uses the shared guarded planner and one serializable,
  revision-bound command for legacy rows, exact inventory transitions, and
  guarded-report creation. Atomic manager reset replaces the former clear then
  status-update sequence.
- The assigned-driver flow no longer exposes cancellation or generic status
  editing. Start Trip is a narrow server-owned command; Report Issue remains
  durable; completion remains the idempotent proof command.
- Phone, email, map, Start Trip confirmation, packing review, completion, and
  post-action navigation are connected. Settings exposes Warehouse Packing
  only to the corresponding capability.
- Proof drafts survive process restart in app-owned storage; native
  connectivity/focus drives truthful freshness; all dispatch projections use
  one invalidation boundary; Completed/server search, authoritative packing
  summaries, and typed notification outcomes are current.
- Automated implementation gate: 83 focused tests / 500 assertions pass. The
  broad repository typechecks retain unrelated existing diagnostics, while the
  changed dispatch runtime paths add no focused diagnostics. Android/device UI
  review is intentionally held for the user's next-phase permission.
- Decision: `.brain/decisions/ADR-069-atomic-revision-bound-mobile-dispatch-commands.md`.

### 2026-08-29 Packed-stop next-action consistency

- The responsive web driver stop now treats packing completion and departure
  readiness as separate facts. Incomplete stops offer Pack Items, ready stops
  offer Start Trip, in-progress stops offer proof completion, and fully packed
  blocked stops expose their review requirement without prompting another pack.
- The selected-stop web workspace consumes the existing protected
  `dispatch.manifest.mobileLifecycle` projection. Its desktop and mobile actions, proof/help
  subflows, and packing correction affordances are gated by the same
  server-owned `mobileLifecycle.capabilities` used by the mobile driver flow.
- Packing-complete inventory holds show `Inventory review required`, preserve
  the exact packed total in Load status, and keep item-level Edit available as a
  secondary correction path.
- The route list no longer attempts Start Trip from its status-only projection.
  A projected ready-to-load row fails closed to `Packed` and opens the selected
  stop, where the authoritative departure readiness controls the next action.
- The route summary labels its status-only count `Packed stops` with
  `Review before departure`; it no longer claims those rows are warehouse
  verified. Packing and review mutations invalidate the authoritative manifest
  so the next capability is refreshed in-place.
- Authenticated Chrome verification on `09176PC` / dispatch `4403` confirmed the
  corrected route card and selected-stop state at `7 / 7 packed`. Focused
  driver-dashboard, lifecycle, and inventory-readiness suites pass 15 tests / 112
  expectations.
- Implementation plan:
  `.brain/plans/2026-08-29-bug-fix-driver-packed-stop-next-action.md`.
- No API, permission, database, migration, or canonical Start Trip mutation
  contract changed.

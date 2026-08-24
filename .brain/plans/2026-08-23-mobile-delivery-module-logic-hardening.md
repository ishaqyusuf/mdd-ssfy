# Mobile Delivery Module Logic Hardening

## Objective

Upgrade the Expo driver and warehouse-delivery module to the current dispatch,
packing, inventory, exception, proof, permission, notification, and
invalidation contracts while preserving the existing mobile information
architecture and visual flow. The result must remove client-owned business
decisions, prevent partial packing/lifecycle writes, survive weak-network and
app-restart conditions, and prove the full assigned-driver journey on a
reversible local fixture before any cutover claim.

Status: Done on 2026-08-23. The logic-hardening implementation and first
automated feature gate are complete. The current UI remains frozen; Android,
screen-level UI testing, and design alternatives require the separate user
approval gate.

This plan supersedes the mobile-client portions of the August 5 driver revival
plans where they conflict with the current August 23 contracts. ADR-026,
ADR-050, ADR-054, ADR-057, ADR-065, and ADR-066 remain authoritative.

## Assumptions

- The current Expo UI flow is approved and should be retained: driver queue,
  stop detail, packing workspace, issue report, proof completion, notifications,
  and settings entry points remain recognizable and route-compatible.
- The responsive web Route Command and Packing Command implementations are a
  current behavior reference, not a request to port their desktop UI into Expo.
- `OrderDelivery` remains the canonical trip header and `OrderItemDelivery`
  remains the compatibility shipment-line record during this hardening.
- Inventory readiness, dispatch lifecycle, guarded packing, permissions, and
  completion idempotency remain server-owned. Expo may present those decisions
  but must not independently recreate them.
- Drivers may report durable exceptions. Trip cancellation and picked-stock
  release remain manager operations unless a later explicit product decision
  creates a narrower driver self-cancel policy.
- Offline work does not authorize offline lifecycle, packing, inventory, or
  completion mutations. Draft capture may work offline; submission requires a
  fresh server preflight.
- Android Expo Go is the immediate runtime gate. iOS proof is a separate rollout
  decision.
- No production mutation, production data synchronization, or broad visual
  redesign is authorized by this plan.

## Detailed Execution Plan

### 0. Audit findings and release priority

#### P0 — Release-blocking correctness gaps

1. **Mobile packing allocation is currently red.**
   `bun test apps/mobile/src/features/dispatch ...` passes 23 tests but fails
   all three `buildPackingPayload` cases. Scalar payloads now include unexpected
   zero LH/RH fields, and handled input such as `LH 2 / RH 3` is recomposed into
   an incorrect mixed scalar/handled result. The current local allocator is not
   safe to use as a second authority beside
   `@gnd/sales/dispatch-packing-plan`.
2. **Mixed legacy/inventory packing is not atomic.**
   `onConfirmDispatchAfterPacking` commits legacy packing first and inventory
   preparation second. If the second operation rejects because of shortage,
   stale revision, pending guarded review, or permission change, the operator
   can receive a failure after only the legacy half committed. The older
   closeout ticket already identified this boundary, and the current code still
   has it.
3. **The packing draft path can silently omit inventory work.**
   `savePackingSlip` submits legacy rows, clears legacy packing when appropriate,
   but does not persist selected inventory quantities. A successful “Packing
   slip updated” toast can therefore describe only part of the visible draft.
4. **Mobile uses an obsolete local Pack All/availability authority.**
   `getPackTargetQty`, `buildPackingPayload`, and screen-local fallbacks can
   diverge from the current shared rule that prefers submission deliverables,
   existing listed quantity, published deliverable quantity, and explicit
   availability—and never falls back to ordered quantity when availability is
   zero.
5. **Packing reset is a multi-command partial-write sequence.**
   Mobile clears packing, then separately calls manager-only
   `updateDispatchStatus`, then separately sends a notification. A failure in
   the second step can leave packing cleared with a stale lifecycle; a failure
   in the third step produces inconsistent operator feedback.
6. **The driver detail still exposes trip cancellation.**
   The accepted permission record says cancellation/reconciliation require a
   dispatch manager, while the legacy task authorization path still permits an
   assigned actor. Mobile should not preserve the broader legacy path by
   accident. The driver action should be Report Issue; cancellation and picked
   inventory return stay in the manager workspace.
7. **“Mark ready” does not mark anything ready.**
   The pending-production modal only sends `dispatch_packing_delay`, but the UI
   reports that the item was marked ready. This is false operational feedback.
   Current guarded packing requires a persisted report, manager decision, and
   canonical packing update before readiness changes.

#### P1 — High-risk reliability and contract drift

1. **Lifecycle gates are derived from raw status strings in Expo.**
   `canStart`, `canComplete`, `canReportException`, packing visibility, and
   button labels are recreated from `queue`, `packed`, and `in progress` rather
   than one server action-capability projection. This misses assignment,
   special-order, pending-report, inventory, stale-revision, and permission
   blockers.
2. **Proof recovery is mount-local, not restart-safe.**
   The stable request id, signature, recipient, note, and photos survive a
   failed request only while the completion form stays mounted. An app kill,
   OTA reload, or process eviction loses the draft, contrary to the documented
   restart-recovery objective.
3. **Proof payload size can become operationally unsafe.**
   Up to five base64 images are held in React state and sent in one mutation.
   There is no client aggregate-size gate, durable file staging, resize policy,
   or resumable local asset record. Unsupported image types are silently
   omitted instead of producing the documented feedback.
4. **Mutation invalidation is incomplete and duplicated.**
   Packing does not invalidate `driverManifest`, `driverWorkQueueSummary`,
   `manifest`, `detail`, or `packingReports.context`; action invalidation also
   misses current detail/readiness combinations. The app can show a successful
   toast beside a stale queue, stop, or review state.
5. **Connectivity copy is inferred from query error state.**
   “Dispatches synced” does not represent actual network state, last successful
   sync time, background/foreground recovery, or stale age. React Query is not
   connected to native focus/online managers and its cache is not persisted.
6. **Notification behavior is stale.**
   `dispatch_packing_delay` always shows “Approved” even when the event means
   pending review or rejection, and several current dispatch lifecycle channels
   do not deep-link to and refresh the affected stop.
7. **Permissions are not reflected consistently in navigation or controls.**
   Settings exposes Warehouse Packing to ordinary driver sections even though
   `dispatch.packingList` requires packing/manager capability. Packing and
   duplicate controls are also gated by coarse client roles/status rather than
   action-specific server capability.
8. **Key contact/navigation controls are inert.**
   The phone, email, and location buttons in Delivery Details have no handlers.
   A complete turn-by-turn Start Trip confirmation screen exists but is not
   mounted by the active flow.
9. **Completion accepts client-owned audit semantics.**
   The form allows the worker to toggle delivery versus pickup note type and
   sends device time as `receivedDate`. These should be derived from the live
   dispatch/server clock unless an explicit audited override is required.

#### P2 — Maintainability and coverage debt

1. `dispatch-detail-screen/index.tsx` is 1,326 lines, its scroll content is 475
   lines, packing slip is 419 lines, and completion form is 363 lines. The
   central view-model type is effectively `{ [key: string]: any }`, and the
   dispatch feature contains widespread `as any` coercion.
2. Source-string tests prove that method names exist but do not exercise
   restart recovery, capability gating, notification outcomes, or the operator
   state machine.
3. Dead or disconnected paths remain, including the unused Start Trip
   confirmation and older list/action components. They make it difficult to
   know which code owns the live flow.
4. Mobile date helpers still use a Day.js wrapper even though due-date display
   is now server-normalized to the canonical dispatch timezone.
5. Warehouse list summary totals are derived from the currently loaded array,
   not an authoritative server summary.

### 1. Freeze the accepted UI and define the authority matrix

Dependencies: none.

1. Capture a route/interaction contract for the existing Expo screens:
   `/(drivers)/dispatch`, `/dispatch/all`, `/dispatch/[dispatchId]`,
   `/warehouse-packing`, `/warehouse-packing/[dispatchId]`, notifications, and
   settings. Record the elements that must not move or be visually redesigned.
2. Build one authority matrix for each displayed fact and action:
   - queue/order/due/next stop: `dispatch.driverManifest`;
   - stop overview, manifest revision, packing/readiness: canonical dispatch
     detail/manifest projection;
   - action visibility and blockers: server lifecycle/capability projection;
   - normal and guarded packing: shared packing planner plus one server command;
   - issue reporting: durable `DispatchException`;
   - completion: `dispatch.completeDispatchWithProof`;
   - activity/notifications: persisted server activity and typed notification
     channels.
3. Add a current-behavior acceptance matrix covering scalar products, LH/RH
   doors, legacy-only, inventory-only, mixed execution, pending production,
   guarded review, shortage, duplicate dispatch, pickup, delivery, and terminal
   states.
4. Add red regression tests for every P0 finding before changing runtime code.
5. Treat the existing three failing mobile packing tests as a release block,
   not as an assertion update exercise.

Validation:

- The matrix maps every mobile control to one server authority and identifies
  whether the current UI is retained, disabled, or connected.
- No implementation phase begins with unresolved ownership of cancellation,
  packing reset, guarded review, or completion time/type.

### 2. Replace mobile packing math with the shared package boundary

Dependencies: Phase 1 authority matrix.

1. Delete the mobile-owned availability/Pack All decision path from
   `packing-payload.ts`, `packing-qty.ts`, and screen-local fallback code.
2. Export a React Native-safe, non-UI adapter around
   `@gnd/sales/dispatch-packing-plan` for:
   - canonical Pack All target;
   - scalar versus LH/RH normalization;
   - deliverable/submission allocation;
   - explicit stock availability;
   - guarded-review eligible remainder;
   - genuinely unavailable remainder.
3. Ensure the adapter returns a stable mobile view model and command intent;
   item components must not inspect raw endpoint internals.
4. Preserve exact quantity semantics. Never emit a scalar `qty` for an LH/RH
   request and never add meaningless zero keys if the command contract does not
   require them.
5. Port the shared packing regression matrix to the mobile adapter, including
   the August 23 Pack All cases that prevented ordered-quantity fallback.

Validation:

- Existing three mobile packing failures are green without weakening expected
  values.
- Shared and mobile planners return byte-equivalent command intent for scalar,
  LH/RH, partial capacity, re-pack, multiple submissions, stock-only,
  zero-availability, and unavailable quantities.

### 3. Introduce one idempotent, revision-bound packing command

Dependencies: Phase 2 shared planner.

Recommended approach: add one protected `dispatch.confirmPacking` command
instead of continuing client-sequenced legacy task plus inventory mutation.

Input:

- `dispatchId`;
- `requestId`;
- `expectedManifestRevision`;
- `replaceExisting`;
- selected item intents with stable item/sales-item identity and scalar or
  LH/RH quantity;
- optional bounded operator note.

The server must derive the sale id, live status, actor, role/capability, current
dispatch assignment, item execution mode, delivery mode, and notification
recipients. The client must not send those as authority.

Server execution:

1. Acquire the deterministic dispatch lock and reload the live dispatch,
   manifest, special-order enforcement, pending packing-report hold, and
   assignment/packing capability.
2. Reject a stale `expectedManifestRevision` before any write and return a
   typed `STALE_MANIFEST` result with the new revision.
3. Build the normal/guarded/unavailable plan with the shared package planner.
4. Reject genuinely unavailable quantities as one whole request.
5. Commit legacy packing compatibility rows and exact inventory
   reserve/pick/bind transitions in one serializable transaction.
6. Persist guarded-review requests in the same dispatch-scoped orchestration
   when they are part of the confirmed operator selection. Guarded quantity is
   explicitly pending and does not count as packed/readiness until approval.
7. Record request id and fingerprint so same-content retries are idempotent and
   different-content reuse conflicts.
8. Return a refreshed manifest revision, packing/readiness summary, normal
   packed quantities, pending-review quantities, and typed blockers.
9. Emit notifications after commit; a notification failure is reported as
   delivery metadata and cannot roll back or misreport the committed packing.

Replace these mobile sequences with the command:

- `onPackItem`;
- `onPackItemsSelection`;
- `onPackAll`;
- warehouse `onPrepareInventory` after legacy packing;
- `savePackingSlip`;
- `onConfirmDispatchAfterPacking`.

Add a separate guarded `dispatch.resetPacking` command if reset remains an
approved mobile operation. It must lock once, validate permission/current
state/pending report, clear canonical packing and applicable inventory state,
derive the resulting lifecycle, and notify after commit. Do not preserve the
current clear-then-update-status chain.

Validation:

- Inventory-only, legacy-only, and mixed selections either commit completely
  or leave every related row unchanged.
- Same-request retry is idempotent; competing content conflicts.
- Shortage, stale revision, pending review, wrong sale/dispatch identity,
  reassignment, special-order block, and terminal state produce no partial
  write.
- Reconciliation proves exact dispatch-bound picked quantity after success.

### 4. Make stop actions server-owned and permission-specific

Dependencies: canonical packing command shape may be developed in parallel,
but this phase must land before pilot.

1. Extend the assigned-driver detail response—prefer the existing protected
   `dispatch.detail` boundary—to include:
   - canonical lifecycle stage and label;
   - active risk codes;
   - current manifest revision;
   - open exceptions and pending guarded reports relevant to the driver;
   - action capabilities such as `canStartTrip`, `canComplete`,
     `canReportException`, `canEditPacking`, `canResetPacking`, and
     `canOpenWarehousePacking`;
   - typed blockers/reasons for disabled actions.
2. Switch Expo from raw-status helpers to this capability model. Status text
   remains visible, but no button is enabled solely because a string equals
   `packed` or `in progress`.
3. Call the direct protected `dispatch.startDispatch` route from mobile.
   Retain server-side inventory readiness, special-order, assignment, and actor
   normalization. Remove the client Trigger polling path for Start Trip.
4. Keep `dispatch.completeDispatchWithProof` as the only completion command.
5. Remove assigned-driver cancellation from the stop UI. Keep Report Issue as
   the recovery path. Managers continue cancellation/return confirmation from
   the authorized admin surface.
6. Remove direct mobile lifecycle editing through `updateDispatchStatus`.
7. Gate Warehouse Packing entry and mutation controls by explicit capability,
   not `isAdmin`, current section name, or raw status.
8. Present open exception and pending packing-review state in the existing
   status/readiness regions without changing the overall screen flow.

Decision point:

- If the business still requires a driver self-cancel action, define a separate
  ADR and command with allowed pre-trip states, reason, request id, inventory
  release policy, and explicit prohibition on picked-stock release. Do not use
  the generic manager cancellation contract.

Validation:

- Permission matrix covers assigned driver, cross-driver, packing operator,
  dispatch manager, reassigned driver, inactive employee, and terminal trip.
- UI visibility matches server capability, while API tests prove hidden buttons
  are not the authorization boundary.

### 5. Connect the accepted field actions without redesigning the screen

Dependencies: Phase 4 capability response.

1. Mount the existing Start Trip confirmation flow from the current primary
   action and populate it with live customer, destination, manifest, and
   readiness data.
2. Use safe native links for phone, email, and preferred map directions:
   validate non-empty values, use `Linking.canOpenURL`, encode destinations,
   and show actionable fallback feedback.
3. Open directions only from the canonical destination. Missing address remains
   a server blocker; do not fall back to customer prose as a routable address.
4. After Start Trip succeeds, refresh the stop and queue before presenting the
   completion action.
5. After successful completion, clear the proof draft, refresh all dispatch
   surfaces, and return to the exact queue context.
6. Keep arrival as a product decision. If required, add a durable activity
   checkpoint with authenticated actor/time/request id; do not create an
   unrecognized client-only status.

Validation:

- Phone/email/maps actions work on Android or produce explicit fallback copy.
- Start Trip never opens from stale or blocked readiness.
- Completion returns the user to a fresh queue with the completed stop removed
  from active views and present in Completed.

### 6. Add durable proof drafts and bounded media handling

Dependencies: Phase 4 direct action adapter. Can be developed in parallel with
Phase 3 server packing work.

1. Create a versioned `dispatch-proof-draft-v2` store keyed by dispatch id and
   authenticated user id. Persist only:
   - stable UUID request id;
   - dispatch/user identity and manifest revision;
   - recipient and note;
   - signature path;
   - app-owned attachment file references, MIME, filename, byte size, and
     content fingerprint;
   - created/updated timestamps and attempt state.
2. Copy selected photos into an app-owned temporary directory before recording
   the draft. Do not rely on expiring picker URIs or persist large base64 strings
   in AsyncStorage.
3. Apply per-file and aggregate size limits before submission. Resize/compress
   where acceptable, show unsupported MIME/extension feedback, and cap at five
   files.
4. Restore the draft after cold start, OTA reload, background eviction, or route
   revisit only when dispatch/user identity still matches.
5. Revalidate live assignment, lifecycle, and manifest revision before retry.
6. Preserve the draft for retryable network/server failures. Quarantine or ask
   the user to discard it for terminal completion, reassignment, changed-content
   request conflict, or invalid proof.
7. Submit only on explicit user action after reconnect; do not silently replay
   a delivery completion in the background.
8. Delete local proof files only after confirmed server success, explicit user
   discard, or a documented expiry cleanup. Log cleanup failures without
   claiming the draft is gone.
9. Derive note type from the canonical dispatch delivery mode and use server
   completion time. Remove the mutable Dispatch/Pickup toggle unless a separate
   audited override is approved.
10. Measure the real API body ceiling. If bounded compressed media still cannot
    safely fit, add deterministic staged/direct uploads while retaining the
    existing request fingerprint and final idempotent completion contract.

Validation:

- Draft survives process kill and restores the exact request id, signature,
  note, recipient, and attachment set.
- Same-request replay does not duplicate documents, notes, payment review,
  inventory consumption, or completion.
- Unsupported/oversized media is visible to the user and never silently lost.

### 7. Centralize freshness, connectivity, and invalidation

Dependencies: typed query/action adapters from Phases 3-6.

1. Add one dispatch query-key registry/invalidation function covering:
   `driverManifest`, `driverWorkQueue`, `driverWorkQueueSummary`, `manifest`,
   `detail`, `dispatchOverviewV2`, `packingList`, `packingReports.context`,
   activity, and notification inbox where applicable.
2. Prefer dispatch-specific keys for active-stop refresh and path-level keys
   only for true list-wide changes.
3. Connect TanStack Query to React Native app focus and network state. Refetch
   the active queue/stop on foreground and on reconnect, with request
   deduplication.
4. Display actual Online/Offline/Syncing/Sync failed state plus last successful
   sync age. Do not label a never-loaded or stale cache “synced.”
5. Invalidate from successful command results and from typed dispatch
   notification actions.
6. Do not persist the general customer/manifest query cache until a mobile data
   retention and encryption policy is approved. Proof draft persistence is
   separately bounded and purpose-specific.

Validation:

- Packing, start, exception, guarded decision, reassignment, due-date update,
  reset, and completion refresh the queue and open stop without manual pull.
- Foreground/reconnect produces one bounded refresh rather than a request
  storm.

### 8. Bring notifications and list semantics to current behavior

Dependencies: central invalidation and route helpers.

1. Add typed mobile actions for assigned, unassigned, queued, packed, packing
   reset, in progress, trip canceled, date updated, completed, duplicate, and
   packing-review events.
2. Route driver-relevant notifications to the driver stop. Route packing-only
   work to Warehouse Packing only when the user has capability. Route manager
   work to an authorized manager surface.
3. Render packing review status accurately: pending, approved, and rejected
   must have distinct copy and tone. Never show “Approved” for a pending or
   rejected event.
4. Add the current Completed driver view and server-owned search to the existing
   tab/list shell without redesigning card layout.
5. Keep due buckets server-owned and display Tomorrow separately if current
   operations require it; do not merge it into Upcoming in the model layer
   without an explicit presentation decision.
6. Add an authoritative Packing List summary endpoint or response metadata so
   list metrics do not depend on the loaded array.

Validation:

- Cold and warm notification taps open the correct route, enforce permissions,
  and refresh the affected data.
- Today, All Stops, Exceptions, and Completed counts/rows agree with the server
  for more than one page of data.

### 9. Refactor orchestration behind the unchanged UI

Dependencies: land incrementally with Phases 2-8; do not perform a risky
big-bang rewrite.

1. Introduce a typed stable mobile model for queue rows, stop detail, manifest
   items, capabilities, blockers, packing selection, review status, and proof
   draft. Normalize Router outputs once in API adapters.
2. Split the 1,326-line detail orchestrator into bounded modules:
   - `use-driver-stop-query`;
   - `use-driver-stop-actions`;
   - `use-dispatch-packing-controller`;
   - `use-dispatch-proof-draft`;
   - `use-dispatch-contact-actions`;
   - pure queue/detail/packing model adapters;
   - thin screen composition retaining the current components and ordering.
3. Replace `{ [key: string]: any }`, `as any`, and raw API-object reads with
   explicit contracts. Keep reusable component files near the repository's
   150-line mobile standard unless a documented composition reason requires
   more.
4. Remove dead components only after route/source tests prove no live import:
   old action bars, old list cards, disconnected Start Trip code, and duplicate
   helpers.
5. Use server-formatted due presentation for business dates. Use `date-fns`
   only for genuinely client-owned dates such as local draft age.

Validation:

- No behavior or screen-order change is introduced by extraction commits.
- Dispatch production files compile without `any` escape hatches at API/model
  boundaries.
- Dependency tests prevent mobile from importing web UI or direct database
  modules.

### 10. Verification, pilot, cutover, and rollback

Dependencies: all correctness phases.

Automated matrix:

- Packing: scalar, LH/RH, partial, Pack All, zero availability, existing
  packing, multiple submissions, stock-only availability, unavailable quantity,
  legacy-only, inventory-only, mixed, guarded pending/approve/reject, stale
  revision, shortage, and concurrent request.
- Lifecycle: queue, packing queue, missing items, packed, in progress,
  completed, cancelled, reassigned, special-order blocked, open exception, and
  pending packing report.
- Permission: unauthenticated, assigned driver, cross-driver, packing operator,
  dispatch manager, inactive employee, and forged actor/sale/status input.
- Proof: first success, same-request replay, different-content conflict,
  competing request, upload resume, process kill/restore, invalid MIME,
  oversized aggregate, five-photo limit, reassignment, and completed conflict.
- Notification: every dispatch channel, pending/approved/rejected packing
  review, cold start, warm route, permission rejection, and invalidation.

Runtime matrix:

1. Run the reversible local fixture from warehouse confirmation through assigned
   queue, stop verification, directions, Start Trip, proof completion, and same
   request replay.
2. Capture state snapshots before packing, after packing/pick, after Start Trip,
   after completion, and after replay.
3. Prove exact picked allocation consumption once and no active
   reserved/picked rows on a completed dispatch.
4. Test Android phone and tablet/landscape layouts in Expo Go, including cold
   start, warm cache, pull-to-refresh, deep link, modal/keyboard, background and
   restore, offline draft, reconnect, and interrupted upload.
5. Pilot with a small driver/warehouse cohort behind a reversible mobile command
   flag. Keep legacy reads available during observation, but do not dual-write
   competing packing authorities.

Operational metrics:

- packing command success/conflict/stale rates;
- proof first-attempt and retry success;
- draft restore and cleanup outcomes;
- assignment/permission rejection rate;
- queue/detail stale age;
- notification deep-link failures;
- inventory reconciliation drift;
- duplicate request conflicts and duplicate side-effect count.

Cutover gate:

- zero P0 findings;
- all focused tests green;
- assigned-driver local fixture completes and replays idempotently;
- mixed packing proves all-or-nothing;
- proof restores after app kill;
- phone/tablet weak-network evidence complete;
- no unexplained inventory/shipment reconciliation mismatch;
- operator sign-off and rollback rehearsal recorded.

Rollback:

- Disable the new mobile packing command path and return to read-only/issue/
  proof-safe behavior; do not restore the known partial mixed-packing sequence.
- Preserve already committed canonical packing, inventory, exception, proof,
  and completion evidence.
- Never roll back by deleting completed proof, consumed inventory, or audited
  exceptions.

### Recommended implementation sequence and estimate

| Slice | Dependency | One-engineer estimate | Release posture |
| --- | --- | ---: | --- |
| Audit matrix and red tests | None | 1-2 days | Required before edits |
| Shared mobile packing adapter | Matrix | 2-3 days | P0 hotfix |
| Atomic revision-bound packing command | Shared planner | 4-6 days | P0 release gate |
| Server capabilities and direct actions | Authority matrix | 3-4 days | P0/P1 release gate |
| Proof draft/media recovery | Direct action adapter | 3-5 days | P1 release gate |
| Connectivity, invalidation, notifications | Typed adapters | 2-4 days | P1 hardening |
| Incremental component extraction | Prior slices | 2-4 days | No UI redesign |
| Fixture, device QA, pilot, rollback | All slices | 3-5 days | Cutover gate |

Planning range: approximately 4-6 engineering weeks for one engineer, or 3-4
weeks with two coordinated engineers plus dedicated operator/device QA. The
atomic packing command and real-device proof are the schedule-critical path.

### Primary implementation areas

Mobile:

- `apps/mobile/src/features/dispatch/api/*`
- `apps/mobile/src/features/dispatch/lib/*`
- `apps/mobile/src/features/dispatch/state/*`
- `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/*`
- `apps/mobile/src/features/dispatch/components/dispatch-complete-form.tsx`
- `apps/mobile/src/features/dispatch/components/dispatch-list-screen.tsx`
- `apps/mobile/src/features/dispatch/components/packing-list-screen.tsx`
- `apps/mobile/src/components/notifications/notification-center-screen.tsx`
- `apps/mobile/src/trpc/query-client.ts`
- `apps/mobile/src/app/(drivers)/*`
- `apps/mobile/src/driver-app/*`

API/domain:

- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/api/src/trpc/routers/packing-reports.route.ts`
- `apps/api/src/db/queries/dispatch.ts`
- `apps/api/src/db/queries/packing-reports.ts`
- `apps/api/src/db/queries/dispatch-proof-completion.ts`
- `packages/sales/src/dispatch-packing-plan.ts`
- `packages/sales/src/dispatch-manifest/*`
- `packages/sales/src/sales-control/tasks.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- `packages/sales/src/sales-control/task-authorization.ts`

Brain updates required during implementation:

- `.brain/features/driver-platform-revival.md`
- `.brain/features/mobile-dispatch-proof-completion.md`
- `.brain/api/contracts.md`
- `.brain/api/endpoints.md`
- `.brain/api/permissions.md`
- `.brain/plans/driver-platform-revival/map.md`
- `.brain/progress.md`
- `.brain/tasks/in-progress.md`
- a new ADR only if cancellation authority, offline retention, proof upload
  architecture, or the canonical packing command boundary changes durably.

## Skills List Used

- `plan`: structured the audit into an implementation-ready, dependency-ordered
  execution plan with explicit validation and rollout gates.
- Project Brain protocol: aligned the plan with current dispatch, packing,
  inventory, proof, exception, permission, and rollout decisions.
- `monorepo-expo`: applied the repository's Expo API, stable UI-model,
  pull-to-refresh, performance, component-boundary, and native data-flow rules.

## Risks and Mitigations

- **Concurrent worktree changes:** Current dispatch/API/Brain work is modified
  by other active work. Implement from small commits, re-read the current
  contract before each slice, and avoid overwriting unrelated work.
- **Atomic command scope grows too broad:** Keep one dispatch lock and one
  command, but split pure planning from transactional execution and
  post-commit notification. Do not add unrelated production or order updates.
- **Guarded review conflicts with atomic packing:** Treat pending-review
  quantity as a first-class result that does not count as packed. Reject
  unavailable quantity before normal writes and persist any approved request
  identity under the same dispatch scope.
- **Historical mixed data is incomplete:** Keep explicit `legacy`, `inventory`,
  and review-required modes. Never infer SKU, handing, submission, or stock
  readiness from labels.
- **Proof media exhausts memory/request limits:** Stage app-owned files, enforce
  aggregate limits, compress before base64 conversion, and move to staged/direct
  upload if measured production limits require it.
- **Persisted mobile data leaks customer information:** Persist only the minimum
  proof draft contract, scope it to user/dispatch, clean it deterministically,
  and do not persist the general query cache without an approved retention and
  encryption policy.
- **Driver loses emergency recovery after cancel removal:** Keep Report Issue
  prominent and durable, surface support state, and require an explicit policy
  decision before adding a narrower self-cancel command.
- **Refactor changes the liked UI:** Extract orchestration behind snapshot and
  component tests; keep route names, screen order, copy hierarchy, and component
  layout unchanged unless a correctness state requires new feedback.
- **Broad mobile typecheck noise hides regressions:** Maintain focused
  dispatch-only type/test commands and fail on new diagnostics in touched
  files, while separately tracking the existing repository baseline.
- **Pilot corrupts active inventory:** Use a reversible local fixture first,
  then a small flagged cohort with reconciliation snapshots and no production
  backfill or synchronization in the implementation task.

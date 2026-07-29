# Plan: Production Worker Inventory Update Requests And Resume Notifications

## Type
Feature

## Status
Proposed

## Created Date
2026-07-29

## Last Updated
2026-07-29

## Goal Or Problem
Let an assigned production worker request an inventory/inbound correction from
the canonical Sales Overview when the worker's assigned production submission
is blocked by unresolved material readiness. Notify the order's sales rep and
configured operations administrators, preserve inventory truth, and
automatically notify the requesting worker when the same worker-scoped strict
submission gate becomes ready so the worker can return directly to the order
and continue submission.

## Current Context
- Production assignment is intentionally independent of material readiness
  under ADR-035, while `submitAll` still enforces the strict inventory-backed
  readiness gate.
- Worker production rows already open the canonical Sales Overview in
  `production-tasks` mode and server-side production reads scope data to the
  authenticated worker.
- The Production tab already shows readiness and material blocker evidence.
  It currently offers only informational copy and, for administrative viewers,
  a link to the Inventory tab.
- Existing inventory correction paths include allocation approval, inbound
  creation/receiving, order inventory repair, projection sync, and the audited
  `Mark all needs fulfilled` action from ADR-036. A worker request must not
  perform any of those mutations.
- The notification platform already supports explicit employee recipients,
  role/channel subscribers, unread activity, and typed notification actions.
  New notification types must be added to the typed action map before their
  rows are clickable.
- `sales_production_assigned` is already emitted to assigned workers, but it is
  not currently registered as a notification-center action. This plan does not
  require changing that unrelated notification.
- The worktree contains active inventory compatibility changes. Implementation
  must preserve and rebase around those changes rather than overwrite them.

## Proposed Approach
Add a dedicated, durable production-material request lifecycle owned by
`@gnd/sales`. A worker can open or remind one request for their active,
incomplete assignments on an order. The server derives the worker, order,
assigned control UIDs, blockers, sales rep, and recipients; the client supplies
none of those authorization-sensitive identities.

The request records a snapshot of the worker-scoped strict gate and writes
Sales History evidence, then emits a typed
`sales_production_material_update_requested` notification to the order sales
rep plus configured operations subscribers. Clicking the request notification
opens the canonical Sales Overview on the Inventory tab, where the admin sees
the requesting worker and scoped blocker summary and uses existing inventory
or inbound actions.

After readiness-affecting inventory mutations, a bounded reconciliation job
re-evaluates open requests with the same strict gate used by `submitAll`.
Event-driven reconciliation provides the normal fast path; a small scheduled
sweep covers legacy, repair, or external update paths during the inventory
migration. Only an atomic `OPEN -> READY` transition may emit
`sales_production_materials_ready`. Clicking that notification opens the
canonical order overview in worker-scoped Production mode.

This is not a production-readiness override, approval, stock adjustment, or
inbound mutation. Historical readiness overrides remain compatibility-only,
and a request never fabricates stock or bypasses `submitAll`.

Recommended V1 defaults:
- one current request row per order and requesting worker;
- an optional worker note capped at 500 characters;
- reminder notifications no more than once every 15 minutes;
- a bounded five-minute safety reconciliation for still-open requests;
- explicit sales-rep delivery plus configured Sales/Inventory administration
  channel subscribers, with no silent fallback to user `1`.

## Visual Plan
```mermaid
sequenceDiagram
  actor Worker as "Assigned production worker"
  participant UI as "Sales Overview / Production"
  participant API as "Sales request API"
  participant DB as "Request + Sales History"
  participant Notify as "Notification system"
  actor Admin as "Sales rep / inventory admin"
  participant Inventory as "Existing inventory and inbound workflows"
  participant Reconcile as "Readiness reconciler"

  Worker->>UI: Open assigned order
  UI->>API: Request inventory update
  API->>API: Verify active worker assignments
  API->>API: Evaluate worker-scoped strict submit gate
  alt Assigned work is already ready
    API-->>UI: Already ready; refresh submission controls
  else Assigned work is blocked or not configured
    API->>DB: Upsert OPEN request and audit snapshot
    API->>Notify: Notify sales rep + configured admins
    Notify-->>Admin: "Production material update requested"
    Admin->>UI: Click notification
    UI-->>Admin: Open order Inventory tab
    Admin->>Inventory: Allocate, receive, repair, or attest fulfillment
    Inventory->>Reconcile: Queue affected order/component reconciliation
    Reconcile->>API: Re-evaluate the original worker assignment scope
    alt Strict gate is now ready
      Reconcile->>DB: Atomically mark request READY and audit
      Reconcile->>Notify: Notify requesting worker
      Notify-->>Worker: "Materials ready — resume production"
      Worker->>UI: Click notification
      UI-->>Worker: Open assigned order Production tab
    else Still blocked
      Reconcile-->>DB: Keep request OPEN with latest check time
    end
  end
```

## Implementation Steps

### Phase 0 - Confirm Product And Role Routing Defaults
1. Confirm the live role names that should subscribe as operations
   administrators. Recommended policy is the order's active sales rep plus the
   configured Sales Manager/Inventory Manager or Super Admin channel roles.
2. Confirm that V1 uses an optional note, a 15-minute reminder cooldown, and a
   five-minute safety sweep. These are non-blocking defaults unless product
   chooses different values.
3. Confirm that admins do not need an explicit acknowledge/dismiss workflow in
   V1. The recommended lifecycle is request, automatic ready, or automatic
   close when the order/assignment is no longer actionable.
4. Record any changed durable product decision in an ADR before implementation.

Dependencies:
- Live role mapping must be known before production channel configuration.

Validation:
- Document the final recipient matrix for an order with an active sales rep,
  no sales rep, inactive sales rep, and multiple configured admin subscribers.

### Phase 1 - Add The Durable Request Model
1. Add a modern Prisma model such as
   `SalesProductionMaterialRequest` under the sales schema with:
   - `id`;
   - `salesOrderId`;
   - `requestedByUserId`;
   - nullable `routedSalesRepId`;
   - lifecycle status `OPEN`, `READY`, or `CLOSED`;
   - `requestCount`, `requestedAt`, and `lastReminderAt`;
   - optional worker `note`;
   - JSON assignment-scope snapshot containing assignment ids and server-derived
     control UIDs;
   - JSON readiness/blocker snapshot and nullable readiness revision;
   - `lastCheckedAt`, `readyAt`, `closedAt`, and nullable close reason;
   - request/ready notification queue timestamps for support diagnostics;
   - standard `createdAt`, `updatedAt`, and nullable `deletedAt`.
2. Add one unique key for `(salesOrderId, requestedByUserId)` so later shortages
   reopen the same current-lifecycle row while Sales History preserves every
   transition.
3. Add indexes for `(status, lastCheckedAt)`, `salesOrderId`, requester, and
   routed sales rep.
4. Add relations from `SalesOrders` and `Users` using distinct requester and
   routed-recipient relation names.
5. Generate and apply the additive migration only through
   `bun run db:migrate` and `bun run db:push`, per repository rules.
6. Update `.brain/database/schema.md`, `.brain/database/relationships.md`, and
   `.brain/database/migrations.md`.

Dependencies:
- Phase 0 lifecycle and recipient decisions.

Decision point:
- Keep assignment scope as an audited JSON snapshot in V1 rather than creating
  request-item join rows. Add a join table only if operations later need
  item-level request assignment, filtering, or partial manual resolution.

Validation:
- Prisma generation succeeds.
- The migration is additive and preserves existing production, inventory,
  override, notification, and Sales History rows.

### Phase 2 - Build The Sales-Domain Request And Reconciliation Service
1. Add a shared `@gnd/sales` module, for example
   `packages/sales/src/production-material-requests.ts`, and export it from
   `packages/sales/package.json`.
2. Implement a server-only request command that:
   - loads the active, non-terminal order;
   - derives active incomplete assignments owned by the authenticated worker;
   - rejects a caller with no assignment on that order;
   - derives the worker's assigned control UIDs from the database;
   - refreshes the sales inventory projection using the existing repair-safe
     sync before evaluating readiness;
   - evaluates `getSalesProductionPlan` /
     `evaluateProductionReadinessGate` for only that assigned scope;
   - returns `already_ready` without writing when the strict gate allows
     submission;
   - otherwise upserts `OPEN`, snapshots the blockers, increments request count,
     and writes a `production_material_update_requested` Sales History event.
3. Make re-request behavior idempotent:
   - a repeated click inside the cooldown returns the existing open state
     without another notification;
   - a click after the cooldown updates the snapshot and creates one reminder
     audit event;
   - a previous `READY` or `CLOSED` row may reopen for a genuinely new blocked
     assignment state.
4. Implement a scope-aware read projection:
   - workers see only their own request state;
   - administrative viewers see bounded open requester summaries for the order;
   - blocker detail is limited to the same safe material fields already exposed
     by production readiness.
5. Implement reconciliation for explicit order ids:
   - load all current open requests;
   - re-resolve each requester's live incomplete assignment scope;
   - close requests without a live assignment or for fulfilled/cancelled orders;
   - evaluate the strict gate without consulting the compatibility override;
   - keep blocked rows open and update `lastCheckedAt`;
   - atomically claim `OPEN -> READY` before returning a ready-notification
     work item;
   - write `production_material_update_ready` or
     `production_material_update_closed` Sales History evidence.
6. Ensure no request or reconciliation method changes InventoryStock,
   StockAllocation, InboundDemand, InboundShipment, component quantity, or
   legacy order inventory status.

Dependencies:
- Phase 1 schema.

Decision points:
- Strict readiness must be scoped to the worker's assigned control UIDs, not
  the whole order, because unrelated assignments must not delay that worker.
- A manually fulfilled component from ADR-036 counts as ready because the
  existing strict gate already treats `fulfilled` as ready; the request service
  must not introduce a second interpretation.

Validation:
- Domain tests cover blocked, not-configured, ready, fulfilled, read-only,
  assignment removed, multiple workers, reopened requests, cooldown, and
  concurrent reconciliation.

### Phase 3 - Add Protected API Contracts
1. Add a protected mutation such as
   `sales.requestProductionMaterialUpdate({ salesOrderId, note? })`.
2. Require a production-viewing capability and enforce the active assignment
   check server-side. Do not accept worker id, sales rep id, recipients,
   assignment ids, or control UIDs from the client.
3. Add a protected, scope-aware query such as
   `sales.productionMaterialRequestStatus({ salesOrderId })`.
4. Keep admin visibility behind existing Sales Overview/production operational
   viewing permissions; inventory mutation permissions remain on their
   existing endpoints.
5. Return explicit mutation outcomes:
   `created`, `reminded`, `cooldown`, and `already_ready`, plus
   `notificationQueued` so a committed request is not misrepresented when
   notification dispatch fails.
6. On commit, derive the active order sales rep and queue the request
   notification. Preserve the request if notification queuing fails, log the
   failure, and allow a safe retry.
7. Document the route, payload, outcomes, authorization, and failure semantics
   in `.brain/api/endpoints.md`, `.brain/api/contracts.md`, and
   `.brain/api/permissions.md`.

Dependencies:
- Phase 2 command/read services.

Validation:
- API tests prove worker scoping, recipient spoof prevention, terminal-order
  denial, no-assignment denial, admin visibility, and persisted-request behavior
  when notification dispatch fails.

### Phase 4 - Add Typed Request And Ready Notifications
1. Add two notification channels and typed handlers:
   - `sales_production_material_update_requested`;
   - `sales_production_materials_ready`.
2. Request tags should contain only navigation and display evidence:
   `requestId`, `salesId`, `orderNo`, requester id/name, blocker count, and
   request status. Ready tags should include `requestId`, `salesId`, `orderNo`,
   and requester id.
3. Route the request to:
   - the active `SalesOrders.salesRepId` as an explicit employee recipient;
   - configured operations role/channel subscribers;
   - never a client-supplied recipient and never a silent fallback account.
4. Route ready only to the worker who owns the request.
5. Configure both channels for in-app delivery by default and sync the channels
   before enabling the UI. Assign the confirmed admin roles in the Notification
   Channels workspace.
6. Extend `packages/notifications/src/notification-center.ts` so both types
   parse into clickable actions.
7. Add dashboard handlers:
   - request action: open the canonical order Sales Overview with
     `mode=sales` and `salesTab=inventory`;
   - ready action: open the canonical order with
     `mode=production-tasks` and `salesTab=production`, allowing
     `useSalesOverviewQuery` to apply the authenticated worker id.
8. Invalidate the relevant production/readiness/request queries on navigation
   so a ready notification cannot reopen stale blocker UI.

Dependencies:
- Phase 0 recipient policy.
- Phase 3 API request flow.

Validation:
- Schema/handler tests cover both channels.
- Notification transformation tests prove the actions are clickable.
- Dashboard handler tests prove exact canonical URL/query state for admin and
  worker actions.

### Phase 5 - Add Reconciliation Triggering And Eventual-Safety Sweep
1. Add a typed Trigger task such as
   `reconcile-production-material-requests` accepting:
   - deduplicated positive `salesOrderIds`, capped at 200;
   - a source label;
   - optional cursor/batch inputs for the safety sweep.
2. The task calls the Phase 2 reconciler, queues ready notifications only for
   atomically claimed transitions, and logs counts for checked, still blocked,
   ready, closed, and failed requests.
3. Queue targeted reconciliation after every existing path that can make a
   requested assignment ready:
   - manual `Mark all needs fulfilled`;
   - single and bulk allocation approval;
   - inbound receive completion;
   - completion of `allocate-received-inbound-to-backorders`;
   - order inventory repair that recomputes component demand;
   - targeted sales-inventory projection sync/repair.
4. Prefer post-commit order ids returned by each mutation. Where an operation
   returns component ids, resolve the distinct affected sales order ids after
   commit rather than accepting ids from the browser.
5. Run reconciliation both after inbound receipt and after the downstream
   allocation job. The first catches receipt-based readiness; the second catches
   readiness that requires allocation.
6. Add a bounded five-minute sweep over `OPEN` requests as a migration safety
   net for legacy or external update paths. It is read/reconciliation-only and
   must not repair or mutate inventory.
7. Prevent notification storms:
   - only the winning `OPEN -> READY` update emits ready;
   - repeated event hooks are safe;
   - failed orders remain open for the next targeted event or sweep;
   - task retries reuse request ids and transition guards.

Dependencies:
- Phase 2 reconciliation.
- Phase 4 notification types.

Validation:
- Integration tests cover each event hook.
- Concurrent task tests prove one ready transition/notification work item.
- A failed notification does not revert inventory work or lose the persisted
  request state.

### Phase 6 - Add Worker And Admin Sales Overview UI
1. Extend the existing Production readiness banner; do not create a parallel
   production overview.
2. In worker-assigned mode, show `Request inventory update` only when:
   - the worker has active incomplete assignments;
   - the server says the worker-scoped strict gate is blocked or not configured;
   - the order is not fulfilled/cancelled.
3. Use a compact confirmation dialog that explains:
   - the request tells Sales/Inventory that physical materials appear available
     but the system is not ready;
   - it does not change stock or bypass submission checks;
   - the optional note is visible to the sales rep/admin.
4. After success, replace the CTA with an `Update requested` state, timestamp,
   and cooldown-aware `Send reminder` action. Handle `already_ready` by
   refreshing readiness and exposing normal submission controls.
5. Keep projection-query failures distinct from confirmed blockers. If the
   server cannot verify readiness, show retry guidance and do not create an
   ungrounded request.
6. In the admin Inventory tab, add a bounded request callout showing requester,
   requested time, optional note, and scoped blocker summary. Reuse existing
   Inventory tab actions for allocation, inbound, repair, or manual
   fulfillment; do not add a second inventory mutation path.
7. Ensure the UI is responsive, mounts only on the active tab, and follows the
   existing Sales Overview sheet architecture.
8. Refresh request/readiness state after task feedback, inventory actions, and
   notification navigation.

Dependencies:
- Phases 3 and 4.

Validation:
- Component tests cover worker/admin modes, ready/read-only states, cooldown,
  query failure, and mutation failure.
- 375px/mobile-width browser validation proves the CTA, request state, admin
  callout, and submission controls remain usable.

### Phase 7 - End-To-End Validation And Rollout
1. Create a deterministic fixture with:
   - one order;
   - two production workers assigned to different production control UIDs;
   - one blocked tracked component;
   - an active sales rep;
   - a configured admin channel subscriber.
2. Validate the primary path:
   - worker A requests;
   - sales rep/admin receive one in-app notification;
   - click opens the correct order Inventory tab;
   - admin uses an existing valid correction path;
   - worker A receives one ready notification;
   - click opens the same order Production tab in worker scope;
   - worker A submits successfully.
3. Validate isolation:
   - worker B cannot see or mutate worker A's request;
   - unrelated blocked order lines do not delay worker A;
   - an unassigned employee cannot create a request;
   - no physical stock or inbound records change merely from requesting.
4. Validate alternate correction paths: allocation approval, inbound receive
   plus allocation, manual fulfillment, and repair sync.
5. Validate failures: no sales rep, no subscribers, notification queue failure,
   stale assignment, terminal order, duplicate click, concurrent resolver,
   and inventory status temporarily unavailable.
6. Run focused tests, then:
   - `bun run typecheck`;
   - narrow package checks for `@gnd/db`, `@gnd/sales`, `@gnd/notifications`,
     `@gnd/jobs`, `@gnd/api`, and `@gnd/dashboard`;
   - targeted Biome checks and `git diff --check`;
   - the narrowest relevant dashboard build if the broad baseline permits.
7. Roll out additively:
   - deploy schema and server contracts;
   - sync/configure the two notification channels and verify recipients;
   - deploy the dashboard UI;
   - monitor open request age, reconcile failures, notification queue failures,
     and ready-to-submit conversion for the first release window.
8. Update the feature docs, API docs, database docs, task status, progress log,
   and add an ADR only if implementation changes the durable decisions in this
   plan.

Dependencies:
- All prior phases.

Validation:
- Production-like authenticated browser evidence for both roles.
- No unresolved high-severity findings from final code/permission review.

## Affected Files Or Areas
- `packages/db/src/schema/sales.prisma`
- `packages/db/src/schema/users.prisma`
- generated Prisma migration/schema artifacts
- `packages/sales/src/production-material-requests.ts` (new)
- `packages/sales/package.json`
- `packages/sales/src/production-readiness-gate.ts`
- `apps/api/src/trpc/routers/sales.route.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- allocation/inbound/order-repair orchestration that returns affected order ids
- `packages/jobs/src/schema.ts`
- `packages/jobs/src/tasks/sales/reconcile-production-material-requests.ts`
  (new)
- `packages/jobs/src/tasks/sales/allocate-received-inbound-to-backorders.ts`
- `packages/notifications/src/channels.ts`
- `packages/notifications/src/schemas.ts`
- `packages/notifications/src/index.ts`
- `packages/notifications/src/notification-center.ts`
- two new notification handler files under
  `packages/notifications/src/types/`
- `apps/dashboard/src/components/notification-center/notification-center.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-readiness-banner.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/context.tsx`
- `apps/dashboard/src/components/sales-overview-system/tabs/inventory-tab.tsx`
- focused package/API/dashboard tests
- `.brain/features/sales-production-workspace.md`
- `.brain/features/production-readiness-override.md`
- `.brain/features/inventory-backed-sales-fulfillment.md`
- `.brain/api/endpoints.md`
- `.brain/api/contracts.md`
- `.brain/api/permissions.md`
- `.brain/database/schema.md`
- `.brain/database/relationships.md`
- `.brain/database/migrations.md`
- `.brain/progress.md`

## Acceptance Criteria
- An authenticated worker can request an inventory update only for their own
  active, incomplete production assignments on the selected order.
- The request is available from the canonical Sales Overview Production tab
  when that worker's strict submission scope is unresolved.
- Creating or reminding a request does not change stock, allocation, inbound,
  component fulfillment, order status, or readiness override state.
- The order sales rep and configured administration subscribers receive a typed
  in-app request notification; its click opens the correct order Inventory tab.
- The admin can see who requested the update and the bounded blocker snapshot
  while using existing inventory/inbound actions.
- One current request lifecycle exists per worker/order, with audited reopen and
  reminder history and server-enforced cooldown.
- Readiness resolves against the same worker-scoped strict gate used by
  `submitAll`, without consulting the historical compatibility override.
- Only an atomic transition from open to ready queues the worker-ready
  notification.
- Clicking the worker-ready notification opens the correct order Production tab
  in authenticated worker scope, and a valid submission can continue.
- Removed assignments and fulfilled/cancelled orders close open requests without
  sending a misleading ready notification.
- Multiple workers on one order remain isolated by assignment scope and request
  ownership.
- Notification or reconciliation failures are logged, retryable, and do not
  roll back committed inventory work or fabricate readiness.

## Test Plan
- Unit tests for request eligibility, scope derivation, strict readiness,
  idempotency, cooldown, reopen, close, and atomic ready transitions.
- Unit tests for both notification schemas, handlers, recipient routing, and
  action parsing.
- API permission tests for assigned worker, unassigned worker, admin viewer,
  spoofed identity fields, terminal order, and notification-queue failure.
- Integration tests for manual fulfillment, allocation approval, inbound
  receipt/downstream allocation, order repair, and projection sync hooks.
- Dashboard component tests for worker CTA/state, admin callout, query failure,
  and ready/read-only states.
- Notification-center navigation tests for the exact Inventory and Production
  overview targets.
- Authenticated browser test for the complete worker -> admin -> worker loop,
  including 375px layout coverage.
- Package/API/dashboard typechecks, focused Biome, whitespace validation, and
  the narrowest relevant build.

## Risks / Edge Cases
- **Wrong readiness scope:** Whole-order evaluation could block one worker on
  another worker's materials. Mitigate by deriving live assigned control UIDs
  server-side and reusing them for request and reconciliation.
- **Notification spam:** Multiple clicks or mutation hooks could create repeated
  alerts. Mitigate with one worker/order row, a reminder cooldown, and atomic
  lifecycle transitions.
- **Missed legacy update path:** Some inventory changes may bypass a new event
  hook during migration. Mitigate with explicit hook coverage plus a bounded
  five-minute open-request sweep.
- **False ready after receipt:** Receipt may still require allocation. Mitigate
  by using the strict gate and reconciling after both receipt and downstream
  allocation.
- **Manual fulfillment semantics:** ADR-036 permits audited fulfillment without
  fabricating stock. Mitigate by preserving that existing gate meaning and
  showing the request note/audit to the admin.
- **No sales rep or admin subscriber:** A persisted request could have no
  notification recipient. Mitigate by requiring channel-role configuration
  before UI rollout, returning `notificationQueued`, showing the durable request
  in Sales Overview, and monitoring unrouted open requests.
- **Assignment changes while open:** A request may refer to removed or completed
  work. Mitigate by re-resolving live assignments on every reconciliation and
  closing obsolete requests without a ready alert.
- **Notification succeeds but status bookkeeping fails:** At-least-once task
  delivery can produce rare duplicates. Mitigate with atomic request transition
  guards, deterministic request ids in tags, retry-safe task inputs, and
  notification timestamp diagnostics.
- **Projection temporarily unavailable:** The client could otherwise create an
  ungrounded request. Mitigate by requiring server-side readiness evaluation
  and returning retry guidance on projection failure.
- **Active overlapping worktree changes:** Current inventory compatibility work
  touches some planned files. Mitigate by re-reading current diffs before
  implementation and keeping edits narrow.

## Open Questions
- TODO: Confirm the exact live role names to subscribe as inventory/operations
  admins in addition to the order sales rep.
- TODO: Confirm or change the recommended optional 500-character note,
  15-minute reminder cooldown, and five-minute safety sweep.
- TODO: Confirm that an explicit admin acknowledge/dismiss state is not needed
  for V1; recommended default is automatic ready/close only.

## Linked Task
- Task Title: Production Worker Inventory Update Requests And Resume Notifications
- Task File: .brain/tasks/roadmap.md

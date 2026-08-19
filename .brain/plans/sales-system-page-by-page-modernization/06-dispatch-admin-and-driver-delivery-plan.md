# Plan: Dispatch Admin And Driver Delivery Modernization

## Type

Feature Modernization

## Status

Implementation Complete — Release Validation Deferred By Operator

## Sequence

06

## Created Date

2026-07-30

## Last Updated

2026-08-18

## Goal

Provide one standard, clean, and simple dispatch operating model across admin
backlog, scheduling, assignment, packing readiness, load readiness, trip
execution, driver workload, delivery exceptions, proof completion, and final
inventory-backed fulfillment.

## Approved Reference Contract

- Use Sales Finance as the visual reference for the title, compact actionable
  summaries, URL-backed page tabs, search/filter toolbar, virtual table, and
  right-side detail sheet.
- Use Midday Invoices as the architecture reference for thin server routes,
  targeted prefetch/hydration, URL-owned sheets, filters, table composition,
  row actions, bottom bars, skeletons, and empty states.
- Use existing dispatch, Packing List, inventory allocation, proof completion,
  notification, and permission services as the business-rule source of truth.
- Do not duplicate the accepted Packing List execution workflow inside Dispatch
  Admin. Dispatch Admin orchestrates and displays readiness; Packing executes.
- Treat fulfillment as a derived result of proof-bound trip completion and
  successful dispatch-bound inventory consumption, never as an unrestricted
  manually selected status.

## Lifecycle Model

Backlog is order demand that needs delivery but has no active dispatch. After a
dispatch is created, assignment and packing are separate prerequisites that can
progress independently. Both must be valid before the trip is ready to load.

1. `backlog` — eligible sales order without an active dispatch.
2. `ready_to_assign` — active dispatch without an assigned driver.
3. `assigned` — driver assigned; packing may still be pending.
4. `packing` — warehouse execution is active.
5. `packing_blocked` — missing items or inventory/readiness blocker.
6. `ready_to_load` — packed and inventory-ready.
7. `in_transit` — authorized driver has started the trip.
8. `delivered` — proof accepted and trip completion committed.
9. `fulfilled` — delivery completion and inventory consumption are both
   canonical and successful.
10. `cancelled` — guarded terminal outcome with inventory release rules.

Exception state overlays any active lifecycle stage and remains distinct from
assignment, readiness, trip, proof, and cancellation state.

Legacy storage values remain compatible during migration and are projected as:

- `queue` + no driver -> `ready_to_assign`
- `queue` + driver -> `assigned`
- `packing queue` -> `packing`
- `missing items` -> `packing_blocked`
- `packed` -> `ready_to_load`
- `in progress` -> `in_transit`
- `completed` + canonical proof/inventory result -> `fulfilled`

## Required Invariants

- Packing readiness, driver assignment, trip state, proof state, exception
  state, and final fulfillment remain distinct.
- `OrderDelivery` remains the canonical trip header.
- `StockAllocation.orderDeliveryId` remains the exact inventory-to-trip binding.
- A driver can operate only assigned work unless a protected administrative
  capability explicitly allows otherwise.
- Starting a trip requires assignment, packing/inventory readiness, and a
  server-authorized transition.
- Delivery completion remains idempotent, proof-bound, and retry-safe.
- Cancellation releases approved/reserved inventory through canonical domain
  commands; picked stock requires explicit returned-stock confirmation.
- Customer contact, address, proof, deleted records, exports, and exceptions
  remain protected and office-scoped.
- Bulk actions validate every selected dispatch and return per-row results;
  they must not bypass inventory, permission, proof, or transition rules.

## Admin Information Architecture

Keep the previous dashboard at `/sales-book/dispatch-admin` as the canonical
compatibility surface. Run the replacement workspace at the Super Admin-only
`/sales-book/dispatch-admin/v2` rollout URL with six URL-backed business views:

1. **Dashboard** — actionable operating overview.
2. **Backlog** — eligible orders not yet converted to active dispatches.
3. **Dispatches** — the canonical active/completed dispatch table.
4. **Calendar** — scheduled dispatches by delivery date.
5. **Drivers** — assignment load, current trip, and availability signals.
6. **Exceptions** — open and resolved operational exceptions.

Within Dispatches, stage views are:

- Ready to assign
- Assigned
- Packing
- Ready to load
- In transit
- Completed

Assignment, packing, loading, and fulfillment are stages and actions, not
independent mini-applications or disconnected top-level routes.

## Dashboard Design

- Title: `Dispatch`
- Description: `Plan, pack, assign, and complete customer deliveries.`
- Show at most five clickable operational summaries: Backlog, Ready to assign,
  Ready to load, In transit, and Exceptions.
- Show overdue work as an actionable Alert rather than an additional decorative
  card.
- Summary interactions update the current URL filters.
- Remove the permanent driver workload sidebar; Drivers owns that information.
- Keep analytics and vanity totals out of the operational queue.

## Header And Open Action

- Embed PageTabs inside the shared `SearchFilterTRPC` toolbar, following Sales
  Finance.
- Search order number, customer, destination, phone, and driver.
- Support schedule, driver, lifecycle stage, delivery mode, readiness, due
  bucket, and risk filters.
- Use a `ToggleGroup` for table/calendar switching.
- Group column visibility, export, deleted records, and administrative overflow
  actions on the right.
- `Create dispatch` opens a sheet containing eligible backlog orders. It must
  not create an empty trip without an order.

## Route And Page Composition

The route remains a server component and is responsible only for:

- loading typed search params and sort state;
- loading initial table settings;
- evaluating the selected workspace section;
- prefetching only the selected section's summary/list data;
- composing `HydrateClient`, `Suspense`, `ErrorBoundary`, title, workspace, and
  the always-mounted dispatch sheet.

Client behavior belongs in focused workspace, header, view, table, sheet, form,
and URL-hook files.

## Detail Sheet Contract

The dispatch sheet is URL-owned through:

- `dispatchId`
- `sheetMode=details|create|assign|schedule|exception|resolve`
- `detailTab=overview|items|route|proof|activity`

Required tabs:

- **Overview** — schedule, driver, lifecycle, readiness, risk, and primary next
  action.
- **Items/Packing** — quantities, inventory binding, packing progress, blockers,
  and `Open Packing`.
- **Route/Contact** — protected destination, customer contact, route zone, and
  navigation action.
- **Proof** — receiver, signature, photos, upload/checkpoint state, and final
  completion result.
- **Activity** — assignment, schedule, packing, trip, exception, cancellation,
  proof, and completion events.

The sheet owns display and form composition, not business logic. Closing clears
sheet params, resets form/editor state, and invalidates only affected detail,
list, summary, workload, and exception queries.

## Forms And Mutations

Move inline table mutation UI into focused sheet forms for:

- Create dispatch
- Assign/reassign driver
- Schedule/reschedule
- Report exception
- Resolve exception
- Guarded cancellation

Use `FieldGroup`/`Field`, explicit labels and descriptions, searchable driver or
order comboboxes, and `AlertDialog` for destructive transitions. Packing opens
the canonical Packing List workflow. A manager completion override is
permission-gated, reason-bound, and preserves the same proof/inventory
invariants as driver completion.

## URL State Contract

Use typed `nuqs` state for:

- `section`
- `stage[]`
- `q`
- `driversId[]`
- `dueBuckets[]`
- `scheduleRange`
- `deliveryModes[]`
- `readiness[]`
- `risks[]`
- `sort`
- `view`
- `dispatchId`
- `sheetMode`
- `detailTab`

Filters, sorting, selected section, and open detail sheets must survive refresh
and be shareable. Clearing filters preserves the selected business section.

## Table Contract

Retain the existing Tables-2 behavior and refactor it in place:

- cursor/infinite query;
- virtualization;
- sticky identifier and action columns;
- column resize, reorder, and saved visibility;
- server sorting;
- row selection;
- table-owned horizontal scrolling;
- dedicated Skeleton, Empty, No Results, and Error states.

Default columns:

1. Select
2. Schedule
3. Order / customer
4. Destination / zone
5. Driver
6. Packing readiness
7. Trip status
8. Risk
9. Actions

Optional hidden columns include order date, delivery mode, created by, and last
activity. Row click opens the detail sheet. Interactive controls and row-menu
actions stop propagation.

## Row And Bulk Actions

Eligibility-aware row actions:

- Assign/reassign
- Schedule/reschedule
- Open Packing
- Start trip
- View proof
- Report/resolve exception
- Cancel
- Open Sales Overview

Do not expose an unrestricted `Mark as status` menu.

The selected-row bottom bar shows selected count, deselect all, assign driver,
reschedule, open packing batch, export selected, and cancel eligible dispatches.
Bulk commands return partial-success results with row-specific reasons.

## API And Data Contract

Create focused workspace projections instead of stretching one generic list:

- `workspaceSummary`
- `backlog`
- `list`
- `calendar`
- `driverWorkload`
- `exceptions`
- `detail`
- `driverManifest`

API schemas remain explicit Zod boundaries. Routers authorize and orchestrate;
query modules load data; `@gnd/sales` owns reusable lifecycle, readiness,
exception, transition, and projection logic.

Transition inputs include expected revision and idempotency keys where retries
or stale clients can cause duplicate or conflicting writes. Query responses are
lean, cursor-paginated, office-scoped, and tailored per surface. Exports remain
manager-only, bounded or asynchronous.

## Durable Exception Model

Add a dedicated durable dispatch exception record rather than treating an issue
as a cancellation side effect. The record must preserve:

- dispatch/trip identity;
- office/order ownership through the trip;
- reason code and bounded notes;
- open/resolved status;
- reporter and reporting timestamp;
- resolver, resolution note, and resolution timestamp;
- optional proof/document attachments;
- activity/audit timestamps.

Initial driver reason taxonomy:

- `wrong_address`
- `customer_not_home`
- `damaged_items`
- `access_issue`
- `other`

Reporting an exception does not silently discard the selected reason or notes.
Server policy decides whether the underlying trip remains assigned, is paused,
is rescheduled, or is cancelled.

## Driver Dashboard Contract

Mobile is the canonical driver surface. `/sales-book/dispatch-task` remains a
limited web fallback until route parity and usage evidence support cleanup.

Driver home includes:

- visible offline/sync Alert;
- shift and server-ranked manifest summary;
- one prominent Next Stop card;
- ordered stops grouped by overdue, today, tomorrow, upcoming, and unscheduled;
- completed and exception counts;
- Today, All, and Exceptions navigation.

Driver journey:

1. Verify load.
2. Start trip.
3. Open real native navigation/deep link.
4. Mark arrived.
5. Deliver or report a durable exception.
6. Capture receiver, signature, and up to five photos.
7. Submit with one request ID and deterministic proof fingerprints.
8. Confirm server sync.

Only assigned work is visible. Failed proof uploads remain resumable after app
restart. Remove the static placeholder map. Location is purpose-limited and is
never used as authorization.

## Shadcn Composition Contract

- Use existing installed components before creating product-local primitives.
- Use full `CardHeader`/`CardContent`/`CardFooter` composition.
- Use `Badge` for status, `Alert` for operational callouts, `Empty` for empty
  states, and `Skeleton` for loading.
- Keep `TabsTrigger` inside `TabsList`.
- Every Sheet, Dialog, Drawer, and AlertDialog has an accessible title.
- Use `FieldGroup`/`Field` for forms and `ToggleGroup` for 2-7 view choices.
- Use semantic tokens and existing variants; no raw state colors or manual dark
  overrides.
- Use `gap-*`, `size-*`, `cn()`, and configured Lucide icons with `data-icon`
  inside buttons.

## Implementation Files

Dashboard:

- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-admin-title.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-admin-workspace-client.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-admin-summary.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-admin-header.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-tabs.ts`
- `apps/dashboard/src/components/dispatch-admin/open-dispatch-sheet.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-sheet.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-sheet-header.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch-content.tsx`
- `apps/dashboard/src/components/dispatch-admin/dispatch/form-context.tsx`
- `apps/dashboard/src/components/dispatch-admin/views/*`
- `apps/dashboard/src/components/tables-2/sales-dispatch/*`
- `apps/dashboard/src/hooks/use-dispatch-filter-params.ts`

API/domain/database:

- `apps/api/src/schemas/dispatch-workspace.ts`
- `apps/api/src/db/queries/dispatch-workspace.ts`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `packages/sales/src/dispatch-manifest/workspace.ts`
- `packages/sales/src/dispatch-manifest/status.ts`
- `packages/sales/src/dispatch-manifest/exceptions.ts`
- `packages/sales/src/exports.ts`
- `packages/sales/package.json`
- `packages/db/src/schema/sales.dispatch.prisma`

Driver:

- `apps/mobile/src/app/(drivers)/dispatch/*`
- `apps/mobile/src/features/dispatch/api/*`
- `apps/mobile/src/features/dispatch/components/dispatch-list-screen.tsx`
- `apps/mobile/src/features/dispatch/components/driver-dashboard-*`
- `apps/mobile/src/features/dispatch/components/dispatch-detail-screen/*`
- `apps/mobile/src/features/dispatch/lib/*`

## Delivery Phases

### D0 — Brain, Security, State, And Baseline

- Persist this approved contract and activation state.
- Audit procedures, ownership, office scope, exports, deleted records, and
  compatibility routes.
- Add lifecycle projection and transition tests.

### D1 — Shared Lifecycle And Data Contracts

- Add reusable lifecycle/readiness/risk projections.
- Add workspace schemas and focused queries.
- Add durable exception persistence and authorization.

### D2 — Admin Shell And Dashboard

- Replace the current summary/sidebar shell with the Sales Finance-style
  workspace, tabs, filters, and actionable summaries.

### D3 — Backlog, Assignment, And Dispatch Table

- Add backlog creation flow.
- Refactor columns, row actions, URL filters, and guarded bulk actions.

### D4 — Detail, Packing, Calendar, Drivers, And Exceptions

- Add the URL-owned detail sheet and tabs.
- Connect Packing without duplicating it.
- Add calendar, driver workload, and durable exception views.

### D5 — Driver Home And Manifest

- Replace client-derived dashboard ordering with the server-ranked manifest.
- Add Next Stop, sync state, due groups, and native directions.

### D6 — Delivery Execution, Exception, And Proof

- Persist issue reason/details.
- Preserve resumable/idempotent proof behavior.
- Validate retries, stale revisions, and interrupted uploads.

### D7 — Parity, Cleanup, And Cutover

- Validate canonical admin/mobile flows.
- Preserve redirects while usage is measured.
- Remove obsolete summary/header/sidebar/map/status helpers only after parity.

## Validation And Acceptance

Automated coverage:

- lifecycle projection and invalid transitions;
- backlog eligibility;
- office/role/driver ownership scoping;
- packing and inventory readiness;
- exception persistence and resolution;
- idempotent proof completion and stale-revision handling;
- bulk partial-success behavior;
- URL state, sheet reset, row-action propagation, and query invalidation;
- driver ranking, offline queue, and resumable uploads.

Browser/device acceptance:

- `/sales-book/dispatch-admin` on desktop, tablet, and narrow web viewport;
- manager, packing operator, and driver permission boundaries;
- deep-linked filters and detail sheet;
- backlog -> assign -> pack -> ready to load -> trip -> proof -> fulfillment;
- exception, reschedule, cancellation, and inventory-return paths;
- native driver Today/All/Exceptions, navigation, offline, interrupted proof,
  app relaunch, retry, and confirmed sync.

## Non-Goals

- Reopening accepted Packing design
- Continuous driver surveillance
- Automatic route optimization without approved operating rules
- Removing compatibility routes before parity and usage evidence
- Treating decorative analytics as dispatch workflow

## Accepted Product Decisions

- Dispatch Admin owns orchestration; Packing List owns packing execution.
- Mobile is canonical for drivers; web is a limited fallback.
- Fulfillment cannot bypass proof and inventory rules.
- Exceptions are durable workflow records, not transient cancellation labels.
- The six-view workspace and lifecycle stages above are the approved default
  information architecture.

## Completion Gate

Sequence 06 is complete only when the admin and driver acceptance flows,
security/office-scope evidence, durable exceptions, inventory-safe transitions,
proof reliability, automated checks, and runtime QA all pass. Sequence 07 must
not remove compatibility routes before this gate is met.

## 2026-08-18 Implementation Handoff

- Implemented the shared lifecycle/risk projection, six-view URL-backed admin
  workspace, targeted section prefetching, Sales Finance-style summaries and
  toolbar, dispatch table projection, URL-owned creation/action/detail sheet,
  calendar, backlog, driver workload, and exception views.
- Added the durable `DispatchException` model and additive migration, protected
  exception list/report/resolve routes, manager-safe bulk assignment and
  inventory-aware cancellation handling, and one server-owned driver manifest.
- Updated Expo driver work to use the server manifest, Today/All/Exceptions
  views, a prominent next stop, live directions, durable exception reporting,
  and the existing proof-bound completion authority.
- Exception resolution currently records `keep_assigned`. Reschedule and cancel
  remain separate canonical dispatch commands so resolving an exception cannot
  silently bypass schedule, cancellation, or inventory rules.
- The operator explicitly requested that all remaining automated tests and
  runtime QA be skipped for this stage. Therefore the implementation is handed
  off, but the release completion gate above remains deferred and must be run
  before compatibility cleanup or production rollout.
- Follow-up on 2026-08-18: the authenticated page exposed a dashboard process
  that predated Prisma Client generation. The additive exception migration was
  applied and resolved in the local migration ledger, the dashboard was
  restarted, and the original Prisma relation error stopped reproducing.
- Follow-up route split on 2026-08-18: moved the replacement workspace and its
  calendar to `/sales-book/dispatch-admin/v2`, restricted the v2 page and
  dropdown sub-link to Super Admins with `editOrders`, and restored the previous
  dashboard/calendar at `/sales-book/dispatch-admin`. ADR-057 supersedes only
  ADR-054's single-route placement decision; all dispatch, packing, inventory,
  proof, lifecycle, and exception authorities remain unchanged.

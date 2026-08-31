# Sales Dispatch Table

## Status
- 2026-08-31: Guarded-packing rejection now re-evaluates dispatch coverage while
  holding the dispatch lock. If a nonblocking pending report was the only reason
  a pre-trip dispatch became `packed`, rejection restores its snapshotted
  pre-packed status and refreshes canonical sales controls. Other accepted or
  pending coverage is preserved, and in-progress/terminal deliveries are not
  demoted.
- 2026-08-30: New Sales Form orders now persist a nullable order-level Delivery
  Due Date. Fulfillment backlog rows expose that value to Split Desk, and adding
  an order initializes its individual dispatch date from the saved default.
  Existing operator edits win, a batch override retains its prior semantics,
  and legacy orders without a default continue to initialize to today.
- 2026-08-30: Fulfillment V2 now uses the same adaptive PageTabs header layout
  as Sales Orders and Sales Production. Backlog, Active, All, Calendar, Drivers,
  and Exceptions stay together on a dedicated full-width row; search, active
  filter chips, column controls, and other toolbar actions render below without
  competing for the tab row. The opt-in covers both Fulfillment header paths
  while leaving the legacy dispatch search header unchanged.
- 2026-08-29: Implemented the selected Split Desk Create Dispatch planner with
  three concurrent work surfaces: selected orders and their destinations,
  proposed stop sequence and schedule, and permission-aware driver workload.
  Every order owns an editable individual delivery date. An optional batch
  date temporarily overrides and strikes through those dates without mutating
  them; clearing the override immediately restores the latest individual
  values. The standard shadcn dialog remains URL-owned and closes without
  leaving Backlog. Creation still writes one atomic dispatch per eligible
  order through the manager-only command.
- 2026-08-29: Standardized paginated Fulfillment, Backlog, Exceptions, Driver
  manifest, and dispatch-creation search reads on 20 records per request.
  Infinite scroll may append later 20-record pages. Bulk Fulfillment and Bulk
  Production Completed both accept at most 40 unique Sales Order ids; an
  oversized task-start request returns its exact safe limit message before a
  Trigger run is created.
- 2026-08-29: Consolidated Guarded packing and After a quantity is verified into
  one Sales Operations card with a card footer. Turning off the master switch
  now leaves every dependent control visible but disabled. A strict-to-
  nonblocking policy change keeps existing approval requests pending and their
  policy snapshots immutable, while the current policy releases fully verified
  dispatches to packed readiness and sends each assigned driver a dedicated
  in-app `Dispatch can continue` notification in the same serializable settings
  transaction. Released approvals remain reviewable during an in-progress trip.
  Canonical inventory readiness remains an independent Start Trip requirement.
- 2026-08-28: Completed live admin/driver guarded-packing validation on order
  `09439PC`, dispatch `4602`. Miguel selected all 19 units, the final Pack action
  produced one confirmation and one sales-rep review, approval completed the
  dispatch at 19/19, and the packed dispatch retained an enabled Start Trip
  action. The overview no longer double-counts overlapping ready/listed coverage,
  so Pending now renders `0` instead of `-7`.
- 2026-08-28: Dispatch Details now includes assigned driver, dispatch date,
  delivery mode, and dispatch status. Update driver uses a right-side down
  chevron, and Unassign driver is the first dropdown action. Assignment,
  unassignment, and date changes notify the affected driver's in-app inbox and
  open the exact dispatch; Chrome validation confirmed all three for Miguel.
- 2026-08-28: Fulfillment v2 aligns its server and client dispatch-list query
  keys. Authenticated reload now stays server-rendered without the earlier
  `dispatch.list` 401/client-render fallback.
- 2026-08-28: Aligned the guarded-packing confirmation dialog with the shared
  Pack Items list language. Confirmed lines now render as one compact,
  scroll-bounded `ItemGroup` with divider-separated rows and right-aligned
  quantities instead of giving every item a separate bordered card. Submission
  behavior, selected quantities, approval policy, and final confirmation remain
  unchanged.
- 2026-08-28: Made guarded dispatch packing configurable from Super Admin
  Sales Operations settings. Admin and driver Pack Items forms can now select
  permitted `Awaiting production submission` and pending-material-review
  quantities, and Select All includes them. Each pending report snapshots the
  policy that governed submission: strict approval hold or nonblocking delivery,
  sales-rep notification, and optional production-evidence creation on approval.
  Self-notifications are suppressed; another actor's report targets the order's
  sales representative and opens the existing Sales Overview packing review.
  Late terminal decisions are read-only. Dispatch Overview now exposes Dispatch
  Details with assign, update, and unassign controls. The URL-owned driver stop,
  full-page fallback, shared packing sheet, and loading skeleton remain aligned
  with the Midday migration contract.
- 2026-08-28: Reworked the dispatch Packing overview exploration after the
  first five concepts were rejected as too ambitious. The replacement round
  contains exactly three restrained, responsive evolutions of the current
  white-sheet UI: Polished Current, Balanced Split, and Clean Ledger. They
  preserve the existing information, `Start trip` and `Pack items` actions,
  and familiar section hierarchy while improving spacing, summary density,
  desktop balance, and mobile stacking. The selection board lives at
  `~/.gstack/projects/gnd/designs/dispatch-packing-overview-refined-20260828/`.
  Preview customer contact details are anonymized. No application UI was
  changed; operator selection remains the implementation gate.
- 2026-08-28: Added a new selection-gated GStack HTML exploration for the
  canonical Sales Overview dispatch Packing overview. Five responsive concepts
  live at
  `~/.gstack/projects/gnd/designs/dispatch-packing-overview-20260828/`:
  Action Brief, Operations Ledger, Stage Path, Two Queues, and Dispatch
  Briefing. All reuse dispatch `4602`'s current 19-piece information shape and
  expose the readiness, blocker, lifecycle, packing-history, and contact/action
  context that the existing `dispatchOverviewV2` projection already supports
  or can derive. No application UI was changed; operator selection remains the
  gate before implementation.
- 2026-08-26: Mark as Fulfilled no longer emits `sales_dispatch_created` when
  `ensureSalesOrderFulfillmentDispatch` creates its internal queue dispatch.
  That dispatch exists only to complete the terminal fulfillment workflow and
  is not a newly assigned operational dispatch. Genuine dispatch creation and
  driver-assignment paths retain their existing notifications.
- 2026-08-26: Repaired dispatch-created notification delivery. The
  `sales_dispatch_created` channel now has its own activity/email/WhatsApp
  handler instead of reusing driver-assignment wording, while
  `sales_dispatch_assigned` remains the direct driver event. Both React Email
  templates are registered with the notification email service and receive
  order, dispatch, delivery-mode, due-date, and recipient context. This removes
  the `Unknown email template: sales-dispatch-assigned` worker failure and
  preserves separate created-versus-assigned notification semantics.
- 2026-08-25: Simplified Sales Overview dispatch mode to two meaningful tabs:
  `Productions` and `Overview`. The empty `General` tab was removed and the
  admin-facing `Packing List` label became `Overview`, while its established
  packing content and secondary Pack Items workflow remain unchanged. Driver
  stop packing continues as a dedicated single-screen route without Sales
  Overview tabs. A GStack HTML comparison at
  `~/.gstack/projects/gnd/designs/dispatch-overview-admin-driver-20260825/`
  provides three admin concepts (Command Overview, Operations Ledger, Stage
  Control) and three driver concepts (Packing Command Sheet, Load Bay Ledger,
  Pack Coach). No redesigned concept has been implemented; selection remains
  the gate for the next UI phase.
- 2026-08-25: Removed the Fulfillment V2 dispatch detail sheet and its parallel
  overview/packing/proof/action UI. All table rows, calendar dispatches,
  exception actions, and the table action button now open the existing Sales
  Overview sheet directly on Packing for the selected order and dispatch. The
  separate multi-order Create Dispatch dialog remains. This consolidates
  packing continuation on the established Sales Overview authority instead of
  maintaining a second redesign.
- 2026-08-25: Fulfillment V2 now places its PageTabs/search/filter/action
  toolbar after the analytics and overdue alert, immediately above the All
  dispatch table. Backlog, Calendar, Drivers, and Exceptions retain the toolbar
  directly above their section content.
- 2026-08-25: Fulfillment V2 is now the sidebar destination for order editors
  and uses the same `editOrders` page boundary as the former linked
  Fulfillment page. Its navigation is reduced to generated `All`, counted
  `Backlog`, Calendar, Drivers, and Exceptions tabs; the duplicate Dashboard
  and Dispatches tabs are removed. All retains the analytics, warning-toned
  overdue alert, and active dispatch table. Filter controls now use semantic
  Stage/Schedule/Delivery/Risk/Driver icons, while the duplicate table/calendar
  selector, auto-refresh, and CSV export controls are removed. V2 overdue
  counts now use the exact legacy Fulfillment status/date predicate. Summary
  cards reuse the established colored Fulfillment presentation. Drivers starts
  with an `editEmployee`-guarded Add driver tile that opens the employee dialog
  with Driver/Dispatch/Delivery role fallback selection. Create Dispatch is now
  a dialog with server-backed rich order search, removable order-number pills,
  and an atomic manager-only multi-order create command capped at 50 orders.
- 2026-08-25: Fulfillment Calendar now retains the shared seven-card dispatch
  summary and overdue-dispatch alert above its tabs and Week/Month calendar.
  List-only search/filter controls, column settings, refresh/auto-refresh,
  export, deleted/sweeper actions, table, and driver workload remain excluded.
  The list and Calendar workspaces consume one shared overview component, and
  the Calendar route prefetches its summary alongside the visible calendar
  period.
- 2026-08-23: Standardized Sales Overview packing and its Production handoff
  around shared Sales-package policies. Pack All now uses published
  deliverable/listed/available capacity and never falls back to ordered
  quantity, while stock/non-production lines can use authoritative availability
  without a production-submission id. Production-backed lines with no completed
  submission remain at zero and display `Awaiting production submission`.
  Dispatch mode continues to freeze new assignments and assignment edits, but
  no longer blocks submission of work that was already assigned, preventing the
  Production-to-Packing deadlock. The Pack footer now invokes the canonical
  submit handler directly, and Sales Overview remounts its scroll viewport when
  tabs change so scroll position cannot leak between Production, General, and
  Packing. Authenticated development QA on order `09010DB`, dispatch `4478`,
  persisted the 80 available units as packed and left the 8 unsubmitted
  production units pending.
- 2026-08-23: Corrected the Packing List metadata source after the initial item
  redesign exposed empty legacy manifest fields. Dispatch packing now reuses
  the exact composed Production title/subtitle pair, including item type, door
  size, swing/handing, quantity, and labor context, instead of rebuilding a
  reduced subtitle or preferring stale `Sales Item <database id>` control
  labels. A live comparison then exposed that persisted item controls still
  collapsed distinct Production configurations. The packing manifest now
  projects canonical Production controls first and appends only unmatched
  persisted controls as compatibility rows. Both the primary list and secondary
  Pack Items sheet consume the same projection. Packing quantities, payloads,
  permissions, and task execution are unchanged. Added focused package, API,
  and presentation regression coverage.
- 2026-08-22: The Sales Overview Packing List and its secondary Pack Items
  form now share the standard Production-style item hierarchy. Both surfaces
  use borderless shadcn `Item` rows separated only by dividers, suppress legacy
  `Sales Item <database id>` fallback labels when a real product subtitle is
  available, and present product title followed by item type, size, handing,
  and ordered quantity metadata. The secondary form now reuses
  `SalesFormQuantityStepper` for Qty/LH/RH editing while preserving the existing
  packing payload, replacement semantics, permissions, and task execution.
  Added focused presentation and source regression coverage.
- 2026-08-22: Sales Overview dispatch packing now opens `Pack Items` in the
  canonical secondary sheet instead of replacing the Packing List item summary
  inline. The primary overview remains present, the secondary surface owns its
  back navigation, scrollable quantity form, Pack All action, note, and fixed
  Cancel/Pack footer, and closing returns focus to the trigger. Packing payload,
  replacement semantics, permissions, and task execution are unchanged. Added
  focused source regression coverage; no automated or browser validation ran in
  this pass.
- 2026-08-21: Published 14 approved `ready-for-agent` implementation tickets
  for the Fulfillment Admin and Responsive Driver Workflow under
  `.scratch/fulfillment-admin-responsive-driver-implementation/issues/`.
  Ticket 01, the connected prototype, is the immediate frontier. The admin
  order-grain and responsive-driver trunks then progress independently before
  converging on assistance notifications, proof, full reconciliation, rollout
  controls, and the evidence-backed canonical-surface decision. Existing
  Wayfinder tickets and the published specification were not modified.
- 2026-08-21: Published the ready-for-agent Fulfillment Admin and Responsive
  Driver Workflow specification from the approved 11-ticket Wayfinder. The spec
  defines the order-grain Fulfillment list, canonical order lifecycle,
  order-first Dispatch tab, assignment-scoped responsive packing, blocker and
  notification loop, resumable browser proof, prototype, pilot, rollback, and
  ADR-gated web cutover. It preserves current Expo, Packing List,
  `OrderDelivery`, dispatch-bound inventory, Dispatch Exception, and proof
  authorities until their explicit gates pass. No implementation ticket or
  runtime behavior changed in this publication step.
- 2026-08-21: The complete 11-ticket Dispatch Admin/responsive-driver Wayfinder
  recommendation batch was approved. Missing proposed-answer comments were
  added for canonical web/Expo ownership, blocker-specific admin authority,
  browser proof completion, the connected prototype, and compatibility/cutover.
  Existing lifecycle, quantity, packing, notification, admin, and driver-IA
  comments were retained without duplication. Tickets remain open; approval of
  proposed comments does not implement behavior, resolve dependencies, change
  ADR-054, or authorize a rollout.
- 2026-08-21: The existing Dispatch Admin/driver Wayfinder was refined with a
  proposed order-grain Fulfillment list, reuse of the canonical Sales Order
  lifecycle as the single list status, exception badges instead of a Progress
  column, an order-first Sales Overview Dispatch tab, and a phone-first driver
  queue with structured blocker reporting plus deduplicated in-app/email admin
  escalation. These are planning inputs only; the blocked authority, quantity,
  lifecycle, notification, and information-architecture tickets remain open.
- 2026-08-21: Fulfillment table rows now match the Sales Orders compact `40px`
  density. Ship To displays only the customer/destination name, and Progress
  displays only the packed quantity summary; the phone and percentage/pending
  subtitle lines were removed. This is a Fulfillment-only presentation mode;
  the standard Dispatch and driver-task views retain their existing `56px`
  rows and secondary details.
- 2026-08-21: Fulfillment and the standard Dispatch table now pass only their
  actual user-editable search fields (`q`, `status`, and `scheduleDate`) into
  the Midday search-filter provider. Internal route defaults such as Dashboard,
  Table, Week, Overview, and Open no longer render as filter chips, trigger the
  filter-options query on initial load, or participate in Clear filters. Tabs,
  calendar state, sheet state, and workspace routing remain URL-owned.
- 2026-08-21: Fulfillment Calendar is now a first-class `PageTabs` workspace
  beside Pending, All, and Completed. The Calendar tab owns its composition.
  It originally omitted list summaries and the overdue banner as well as
  list-only controls; the summary/banner omission was superseded on 2026-08-25.
  Calendar state is URL-backed with Week and Month modes plus a date anchor,
  and the month mode displays complete Monday-Sunday calendar weeks. Legacy
  `?view=calendar` links redirect to the canonical Calendar tab.
- 2026-08-21: The Fulfillment Calendar period title is now a centered clickable
  picker. Week mode offers ten weeks before and after the selected anchor, and
  Month mode offers four months before and after it; both accept unrestricted
  past and future selection and persist the chosen anchor in `calendarDate`.
- 2026-08-19: The order-management dispatch workspace was renamed Fulfillment
  and moved to `/sales-book/fulfillment`. The sidebar now exposes it as one
  top-level link without the former Delivery or v2 sub-links. The prior
  `/sales-book/dispatch-admin` route path is retired.
- 2026-08-19: Fulfillment now uses the Sales Finance `PageTabs` pattern inside
  its shared search toolbar. The legacy native status tabs that preceded search
  were removed; Pending, All, and Completed remain URL-backed filters.
- 2026-08-18: The Finance/Midday-style Dispatch Admin replacement moved to
  `/sales-book/dispatch-admin/v2` for a reversible Super Admin rollout. The
  previous Dispatch Admin dashboard is restored at `/sales-book/dispatch-admin`,
  including its summaries, overdue alert, filters, table/calendar switch,
  export/deleted/sweeper controls, calendar, and workload sidebar.
- 2026-08-18: A follow-up local Wayfinder map now charts the requested
  office-admin and phone-responsive driver workflow, including driver-led
  warehouse quantity verification, partial packing, protected admin approval
  requests, notification/email response, delivery proof, and fulfillment. The
  current Expo/Packing List/ADR-054 authorities remain active until the map's
  decisions are reviewed and approved. See
  `.scratch/dispatch-admin-responsive-driver-workflow/map.md`.
- 2026-08-18: Dispatch Admin was rebuilt as a Sales Finance/Midday-style
  operating workspace with Dashboard, Backlog, Dispatches, Calendar, Drivers,
  and Exceptions. The workspace uses a shared lifecycle projection, URL-backed
  filters/sheets, actionable summaries, durable exception records, and one
  server-owned driver manifest. Remaining automated and runtime validation was
  explicitly deferred by the operator for this stage.
- 2026-08-06: Hardened legacy `Mark as completed` for already-produced orders.
  Pack-all and pack-available now treat an empty production plan as a workflow
  no-op and continue packing existing deliverables; the direct production
  submission command still rejects an empty plan. This covers both fresh
  completion and production-submitted-before-packing states. Authenticated dev
  browser verification completed the first ten visible orders and confirmed
  all ten reached `Ready to fulfill` without the empty-submission error.
- 2026-08-05: Fixed the legacy `Mark as completed` orchestration so pack-all is
  the single owner of auto-assignment, production submission, and packing. The
  command no longer pre-submits production and then fails when pack-all sees an
  empty second submission scope. Direct production submission remains strict
  and still rejects a genuine empty request.
- 2026-08-05: Dispatch workspace access was split by operational capability.
  Delivery-only users now receive the dedicated `/sales-book/dispatch-task`
  route as their visible/default Dispatch link. `/sales-book/dispatch-admin`
  now requires `editOrders`, and direct navigation by a delivery-only user is
  redirected to the task workspace by the authenticated navigation proxy.
- 2026-06-16: Dispatch list routes are migrated to the `tables-2` table standard.
- 2026-07-17: Dispatch density and content-fit widths were tightened against the Sales Orders/Midday invoices standard while keeping the interactive dispatch controls readable.
- 2026-07-27: Admin dispatch single-row and batch menus now reuse the canonical Sales Orders `Mark as` workflow for production completion and fulfillment.

## Fulfillment v2 Workspace (updated 2026-08-29)

- `/sales-book/fulfillment/v2` is the linked Fulfillment workspace for
  `editOrders`. User-visible sections are Backlog, All, Calendar, Drivers, and
  Exceptions. Backlog stays the queue of delivery/pickup orders without an
  active non-cancelled dispatch; it is not an overdue or partial-delivery
  synonym. All uses the bare `/sales-book/fulfillment/v2` URL and clears stale
  section-specific query state when selected; the filter loader maps that
  query-free route to the internal `dispatches` section. `dashboard` remains an
  accepted compatibility value for old bookmarked URLs but is no longer
  exposed as a tab.
- Backlog uses the same divider-based, virtualized table interaction model as
  All, including infinite scroll, row checkboxes, direct Create Dispatch, and
  the canonical batch Mark As menu. It retains the shared Fulfillment analytics
  cards above its tabs and search toolbar so queue context remains visible while
  operators work the backlog. All includes terminal Fulfilled and Cancelled
  projections so order-level status actions are visible without a second
  dispatch-specific confirmation.
- Backlog's date column is independently identified as Created and sorts the
  undispatched-order queue by `SalesOrders.createdAt`. Oldest-first is the
  explicit default; clicking Created toggles between `createdAt.asc` and
  `createdAt.desc`. A due-date sort carried from All is replaced with the
  Backlog ascending default when Backlog opens.
- The Drivers tab count is the permission-aware driver population used by the
  driver selector. Exceptions combines native driver reports with guarded
  packing review batches and preserves open/resolved history at dispatch level.
- Infinite loading uses scroll geometry rather than virtual-row snapshots from
  the same native scroll event, preventing the first bottom-of-list scroll from
  stalling before the virtualizer updates.
- Every paginated list slice requests 20 rows. Bulk Fulfillment is independently
  capped at 40 unique orders, so loading more rows never expands one task beyond
  the durable job contract.
- Lifecycle filters project legacy storage into `ready_to_assign`, `assigned`,
  `packing`, `packing_blocked`, `ready_to_load`, `in_transit`, `fulfilled`, and
  `cancelled` without rewriting historical rows.
- The admin route is a thin server composition boundary. It loads URL/sort
  state and table settings, prefetches only the active section, then hydrates
	  the client workspace. The global Sales Overview sheet owns dispatch packing
	  continuation.
- The title and five colored summary cards follow the established Fulfillment
  visual language. Search, semantic filters, PageTabs, table column tools, and
  administrative overflow share one Midday-style toolbar. Calendar is selected
  only through its page tab; automatic refresh and CSV export are intentionally
  absent.
- The URL-owned create mode opens a dialog with server-backed multi-order
	  search and removable order-number pills. The former V2 dispatch detail
	  sheet and its assign/schedule/exception/proof surfaces were removed; row,
	  calendar, exception, and action-button entry points open Sales Overview on
	  its Packing tab with the selected dispatch id.
- Sales Overview dispatch mode labels the established packing surface
  `Overview` and exposes only `Productions` and `Overview`. The driver task
  route remains a role-specific, tabless stop workspace. Assignment,
  rescheduling, delivery-mode, and blocker controls shown in the HTML concepts
  are design proposals only until an admin option is selected.
- Packing continuation belongs to the established Sales Overview Packing
	  workflow (which retains the accepted packing authorities and secondary Pack
	  Items sheet). Fulfillment displays readiness and opens that workflow.
- The workspace table removes unrestricted trip status selection. Assignment,
  scheduling, packing, exceptions, start, proof completion, fulfillment, and
  cancellation retain their guarded domain commands.

## Routes
- Canonical dispatch route: `/sales-book/dispatch`
- Compatibility redirect: `/sales-book/dispatch/v2` redirects to `/sales-book/dispatch` and preserves query params.
- Fulfillment dashboard: `/sales-book/fulfillment?tab=pending|all|completed|calendar`
  (`editOrders`). Calendar accepts `calendarView=week|month` and
  `calendarDate=YYYY-MM-DD`; legacy `?view=calendar` redirects to the Calendar
  tab.
- Linked Fulfillment workspace: `/sales-book/fulfillment/v2` (`editOrders`)
- Previous Fulfillment composition: `/sales-book/fulfillment` (`editOrders`;
  retained as a child path while V2 is the sidebar destination)
- Driver task route: `/sales-book/dispatch-task` (`editDelivery` without
  `editOrders`)

## Frontend Implementation
- Dispatch route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch/page.tsx`
- Dispatch redirect: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch/v2/page.tsx`
- Fulfillment route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/fulfillment/page.tsx`
- Fulfillment v2 route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/fulfillment/v2/page.tsx`
- Driver route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx`
- Fulfillment list/calendar composition:
  `apps/dashboard/src/components/dispatch-admin/fulfillment-list-workspace.tsx`
  and `fulfillment-calendar-workspace.tsx`
- Fulfillment calendar:
  `apps/dashboard/src/components/dispatch-admin/dispatch-calendar-view.tsx`
- Admin v2 calendar: `apps/dashboard/src/components/dispatch-admin/dispatch-calendar-view-v2.tsx`
- Table module: `apps/dashboard/src/components/tables-2/sales-dispatch/*`
- Headers:
  - `apps/dashboard/src/components/dispatch-header.tsx`
  - `apps/dashboard/src/components/dispatch-admin/admin-dispatch-header.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky order columns, column visibility/settings, table-owned horizontal and vertical scrolling, `useScrollHeader(parentRef)` header-offset behavior, empty state, no-results state, row selection, and the existing dispatch row-action flows.

## Density And Widths
- The shared `TABLE_CONFIGS["sales-dispatch"].rowHeight` remains `56` for the
  standard Dispatch and driver-task views. Fulfillment opts into a compact table
  presentation whose row height derives from `TABLE_CONFIGS["sales-orders"]`
  (`40px`), and its skeleton uses the same derived value. Fulfillment Ship To
  and Progress are single-line cells; schedule, status, and driver controls
  retain their existing behavior.
- Current content-fit defaults:
  - Schedule: `sizes.custom(118, 180, 136)`
  - Order: `sizes.custom(140, 230, 160)`
  - Order Date: `sizes.custom(104, 150, 118)`
  - Ship To: `sizes.custom(180, 360, 220)`
  - Assigned To: `sizes.custom(132, 220, 160)`
  - Progress: `sizes.custom(118, 180, 132)`
  - Status: `sizes.custom(116, 170, 132)`
  - Actions: `sizes.custom(72, 72)`

## Contracts Reused And Added
- Existing admin/list query: `trpc.dispatch.index`
- Existing driver query: `trpc.dispatch.assignedDispatch`
- Existing server filter loader: `loadDispatchFilterParams`
- Existing client filter hook: `useDispatchFilterParams`
- Existing sort state: `loadSortParams` / `useSortParams`
- Existing mutations and actions for driver assignment, bulk assignment, cancellation, due-date updates, status updates, submit dispatch, and sales overview dispatch opening
- Existing `SalesMenu.MarkAs` workflow for inventory preflight, production completion, fulfillment, task monitoring, and query invalidation
- Added protected admin projections: `dispatch.workspaceSummary`, `backlog`,
  `list`, `calendar`, `driverWorkload`, `exceptions`, and `detail`.
- Added manager-only `dispatch.createDispatches`, accepting 1-50 unique eligible
  order ids plus one shared delivery mode, date, and optional driver. It
  rechecks backlog eligibility and creates every dispatch in one transaction;
  any stale or ineligible order rejects the whole batch.
- Added the bounded manager-only `dispatch.fulfillmentCalendar` projection for
  active scheduled dispatches in the requested 7-42 day visible range plus a
  bounded unscheduled queue. The accepted v2 `dispatch.calendar` projection is
  unchanged.
- Added the authenticated `dispatch.driverManifest` projection and durable
  `reportException` / manager-only `resolveException` mutations.

The dispatch table maps selected dispatch rows to their underlying sales order ids
before invoking batch `Mark as`. Duplicate active dispatch rows for one order are
deduplicated so the sales workflow runs once per order. These sales actions are
enabled only by the admin route and only for pending dispatch statuses, including
missing-item rows that must pass the canonical inventory preflight; completed and
cancelled rows, the standard dispatch route, and the driver task route do not
receive them. The dispatch trip status menu remains separate and continues to
own queue/packed/in-progress/completed trip transitions.

The sidebar now targets `/sales-book/fulfillment/v2`; the previous
`/sales-book/fulfillment` composition remains directly addressable as a child
path. Both routes share the existing dispatch, Packing List, inventory, and
proof authorities; V2 changes the page composition and adds an atomic
multi-order dispatch-create surface without changing those downstream
authorities.

## 2026-08-18 Route Split Validation

- Focused sidebar and dispatch migration parity coverage passes with 24 tests
  and 120 assertions.
- Authenticated browser proof confirmed the legacy summary/dashboard and legacy
  calendar at `/sales-book/dispatch-admin`, the new six-section calendar
  workspace at `/sales-book/dispatch-admin/v2`, and the Super Admin-only v2
  dropdown link.
- The replacement workspace still emits its pre-existing PageTabs hydration
  warning when client-saved tab ordering differs from the server ordering; it
  recovers to the correct section after hydration.

## 2026-08-18 Validation Handoff

- Shared lifecycle unit tests, `@gnd/sales` typecheck, dispatch-scoped dashboard
  and mobile TypeScript scans, API dispatch compilation, formatter, diff check,
  and an HTTP 200 route probe were completed during implementation.
- The operator then explicitly requested that all remaining tests and QA be
  skipped. No responsive review, device run, or broad repository validation is
  claimed for this handoff. After a later authenticated runtime failure, the
  additive exception migration was applied locally and the restarted Dispatch
  Admin route rendered its summary and table without the Prisma relation error.

## Cleanup
Removed after import scans:
- `apps/dashboard/src/components/tables/sales-dispatch/data-table.tsx`
- `apps/dashboard/src/components/tables/sales-dispatch/columns.tsx`
- `apps/dashboard/src/components/tables/sales-dispatch/batch-actions.tsx`

`apps/dashboard/src/components/tables-2/core/*` was not modified.

## Validation
- Focused Biome check passed for the dispatch routes, headers, sidebar links, table settings/config, and new sales-dispatch table files.
- Filtered `@gnd/dashboard` typecheck grep reported no diagnostics for touched dispatch route/table/header/config files.
- Import scans found no remaining references to `components/tables/sales-dispatch` or `tables/sales-dispatch`.
- `git diff --check` passed.
- `git diff -- apps/dashboard/src/components/tables-2/core` was clean.
- Browser smoke passed in authenticated sessions:
  - `/sales-book/dispatch?size=5` rendered search, table headers, rows, and table-owned horizontal scroll on desktop and mobile.
  - Search for `07340` updated the URL to `q=07340` and narrowed the dispatch rows.
  - `/sales-book/dispatch/v2?q=07340` redirected to `/sales-book/dispatch?q=07340`.
  - `/sales-book/dispatch-admin?view=table&q=07340&size=1` rendered the admin table on desktop and mobile after the route warmed.
- Caveat: `/sales-book/dispatch-task` still timed out before first byte even when temporarily reduced to static markup, so end-to-end browser smoke for that route remains blocked by a route/access/dev-server issue outside the table module.
- 2026-07-17 density proof:
  - Focused Dispatch parity test passed with 4 tests / 39 assertions.
  - Full `apps/dashboard/src/components/tables-2` suite passed with 293 tests / 2382 assertions.
  - Focused Biome passed for the Dispatch table files and table config.
  - Touched-path `@gnd/dashboard` typecheck scan produced no diagnostics for `sales-dispatch` / `table-configs`.
  - Authenticated browser proof on `/sales-book/dispatch?size=20` confirmed `56px` row height, `45px` header height, vertical table-owned overflow (`scrollHeight 2005` vs `clientHeight 459`), horizontal table-owned overflow (`scrollWidth 1180` vs `clientWidth 1146`), clean scroll movement from `scrollTop 0` / `scrollLeft 0` to `scrollTop 600` / `scrollLeft 34`, and `--header-offset` changing from `0px` to `70px`.
  - Screenshot evidence saved at `/private/tmp/gnd-sales-dispatch-table.png`.
- 2026-07-27 Mark-as action proof:
  - Focused dispatch selection and migration parity coverage was added for distinct orders, duplicate dispatch rows, terminal/invalid rows, and admin-only route wiring.
  - The final scoped diff check passed.
  - The final focused suite, browser QA, and package typecheck were not run under the explicitly requested fast Bun monorepo command discipline.

## 2026-08-28 Fulfillment lifecycle browser QA

- A 12-order admin/driver matrix verified queued cancellation and same-order
  requeue, assignment, packing, trip start, completion proof, customer
  signature, terminal delivery state, and completed-dispatch cancellation
  protection. Order `09510PC` / dispatch `4604` completed the full route with
  Miguel as driver and remained read-only after delivery.
- Bulk driver changes now route every changed dispatch through the same
  notification-aware update boundary as a single assignment. Chrome verification
  confirmed five unassignment notices followed by five assignment notices;
  single assignment and due-date-change notices were also confirmed.
- The bulk menu places Unassign driver before named drivers. The delivery option
  selector opens inside the viewport, and current delivery details select the
  newest active delivery record.
- Dispatch table packing totals prefer dispatch-scoped control (including an
  explicit zero) before any order-level fallback. Browser verification on
  duplicate order `07276DB` now shows current dispatch `4567` as 0/0 instead of
  borrowing another dispatch's order-wide 34/34 progress.
- Address delivery `09239PC` / dispatch `4476` was packed 18/18 in Chrome,
  started, completed through the doorstep proof form with recipient, note, and
  drawn signature, and finished as Delivered with proof saved.

## 2026-08-28 Dispatch packing overview presentation

- The admin Dispatch Packing Overview now renders its dispatch status as a
  readable colored-dot label. The former solid badge used the same color for
  its foreground and background, which left only an unlabeled color capsule.
- The overview, shipping, dispatch, actions, and items surfaces no longer use
  independent outer cards. Semantic sections are separated by single horizontal
  rules, and item rows use one shared list with line dividers.
- Authenticated browser verification on order `09439PC` / dispatch `4602`
  confirmed the visible `PACKED` label and the divider-based item list.

## 2026-08-29 Canonical packing totals and dispatch overview tools

- Fulfillment list rows and Dispatch Packing Overview now share one packing-total
  rule. Current listed allocations define the target after packing begins;
  before that, remaining order quantity defines the target without borrowing
  historical packed quantity from another dispatch. Rows explicitly marked
  `unpacked` remain audit history and no longer inflate current totals.
- Live diagnosis of `09439PC` / dispatch `4602` found two superseded unpacked
  rows (`3681`, `3682`) for submission `13119`. The sales lines, item controls,
  production submissions, active packing rows, and packing selector all agree
  at 19 units; the former `19/21` and second-line `1/3` displays were therefore
  stale-history projection errors. Browser verification now shows `19/19`,
  `Packed 1/1`, and a packing-slip row of `1 RH`.
- Dispatch overview continues to load unpacked rows for packing history and
  falls back to the sales-item link for legacy allocations whose production or
  control linkage is missing; only current quantity calculations exclude them.
- Sales Overview dispatch mode now exposes `Productions`, `Overview`, and
  `Inventory`. The Overview footer keeps a filtered More menu and a primary
  Preview action that opens a freshly generated packing list scoped to the
  selected dispatch id.
- Live verification corrected `09455PC` / dispatch `4509` from `0/0` to `0/53`
  with `53 left` and `0%`.
- Remaining sampled `0/0` rows (`08163DB` and `08647DB`) also show `TOTAL 0` in
  their overviews, confirming they are genuine empty packing scopes rather than
  projection mismatches.

## 2026-08-29 Dispatch preview query-state ownership

- The Sales Preview overlay clears only its own `salesPreview*` and
  `previewMode` query state when it closes. It does not clear the dispatch-owned
  `dispatchId`, so the Sales Overview remains bound to the selected dispatch.
- Opening a preview without an explicit dispatch override also preserves any
  existing dispatch context instead of writing `dispatchId=null`.
- Authenticated browser verification on `09439PC` / dispatch `4602` confirmed
  that closing the packing-slip preview retains `dispatchId=4602` and leaves the
  `19 of 19 Items packed` Dispatch Packing Overview visible.

## 2026-08-29 Durable Backlog bulk fulfillment

- Backlog `Mark as -> Fulfilled` sends one capped 1-40 order parent job rather
  than resolving dispatches and starting one top-level job per order in the
  browser. The selection stays owned by the status action until the monitored
  parent reaches a terminal result.
- Dispatch resolution is idempotent per order: an active dispatch is reused, a
  completed dispatch is an `already_fulfilled` outcome, and a new queue
  dispatch is created inside a short serializable transaction with bounded
  conflict retry. The 40 orders are never wrapped in one database transaction.
- Parent and child idempotency keys make retries safe, while the aggregate
  result preserves per-order succeeded, already-fulfilled, and failed outcomes.
- Backlog list and workspace analytics use the same package-owned predicate.
  The parent returns the authoritative post-run Backlog count; after terminal
  invalidation the task watcher writes this exact count into every cached
  workspace summary. Rows, tab count, and analytics therefore reconcile
  without a manual reload even when query responses complete out of order.

## 2026-08-29 Fulfillment queue finance/status parity

- Backlog columns are now Created, Order/Customer, Destination, Invoice,
  Status, and Actions. It intentionally has no schedule, driver, packing,
  delivery-mode, trip, or risk column because those concepts do not exist until
  dispatch planning begins.
- All and Active use Schedule, Order/Customer, Destination, Driver, Packing,
  Invoice, Status, and Actions. Trip and Risk were removed; overdue schedule
  dates render red while the existing risk filter remains available.
- Invoice and order-status cells are shared with Sales Orders. `editOrders`
  actors may apply payment or run Mark As; other readers receive the same
  finance and lifecycle presentation without mutation controls.
- Active is the canonical non-terminal dispatch queue. It includes ready to
  assign, assigned, packing, packing blocked, ready to load, and in transit,
  and excludes fulfilled and cancelled. Its tab count is computed from the
  same lifecycle projection as its table stages.
- Calendar retains the fulfillment analytics cards above its tabs and calendar.
  Closing Create Dispatch clears only dialog-owned query keys, preserving the
  selected Backlog tab.

## 2026-08-29 Create Dispatch Split Desk

- Produced five interactive, responsive concepts for the next Create Dispatch
  planning experience: Split Desk, Map First, Driver Lanes, Comparison Matrix,
  and Guided Planner.
- Every concept uses the same operational contract: select multiple orders,
  review complete destinations, compare driver workload and route impact,
  optimize the proposed sequence, save a draft, and confirm one dispatch per
  order under a shared planned route.
- Split Desk is the recommended default because orders, route, and driver
  evidence remain visible together. Map First favors geographic planning;
  Driver Lanes favors high-volume reassignment; Comparison Matrix favors
  auditable driver decisions; Guided Planner favors occasional users.
- Split Desk was selected and is now the production Create Dispatch dialog.
  The implementation uses existing `@gnd/ui` shadcn Dialog, Card, Field,
  Popover, Calendar, ToggleGroup, RadioGroup, ScrollArea, and Button primitives.
  The planner uses the existing custom modal system at its predefined `7xl`
  size. Its desktop grid has five equal tracks: Orders owns one, Choose Driver
  owns one, and Proposed Route spans the remaining three. Tablet and mobile
  retain the full-width stacked composition. The three work areas share one
  white Card surface rather than rendering as separate cards; semantic
  Separators divide them vertically on desktop and horizontally when stacked.
  The shared surface is flush with the fulfillment-mode header and action
  footer, with no inset content-shell padding or duplicate outer card border.
  The fulfillment-mode toggle now lives in the Orders work area. Order entry is
  a quiet search-to-add command input: suggestions appear while typing, a
  selected result is added to the existing order list, and the input clears
  without retaining selection chips. Pickup always clears the driver assignment
  to Unassigned and disables every driver radio because pickup dispatches do not
  require a driver. Redundant instructional descriptions, override alerts, and
  footer summaries are intentionally omitted from the planner surface.
  Side-panel headers,
  recommendation badges, and workload metrics reflow where necessary so the
  compact tracks do not clip operational text.
  Backlog results, an exact selected-order lookup, driver records, and workload
  run as parallel TanStack queries; selected-order maps and workload ranking are
  memoized. The UI never invents route mileage or an optimization score: it
  shows the current stop sequence and saved destinations supported by existing
  data.
- Each selected order keeps an individual draft delivery date. The optional
  batch override is an overlay: active rows display the individual value with
  a strike-through and the effective batch value beside it. Individual dates
  remain editable while the override is active, and clearing it restores the
  latest individual values. Submission sends both the individual date set and
  optional override; the server resolves one effective due date per dispatch
  inside the existing atomic batch command.
- The selectable comparison board is saved at
  `~/.gstack/projects/gnd/designs/dispatch-assignment-planner-20260829/finalized.html`.
  It remains the historical concept record; Split Desk is the implemented
  selection.

## 2026-08-30 Canonical Active and Completed workspaces

- Fulfillment now orders its operational tabs as Backlog, Active, Completed,
  All, Calendar, Drivers, and Exceptions. Completed, All, and Exceptions expose
  authoritative global counts alongside the existing Backlog, Active, and
  Drivers counts.
- Active membership is server-owned and evaluated after the canonical dispatch
  control projection: assigned nonterminal deliveries belong to Active, while
  fulfilled, cancelled, and unassigned deliveries do not. Open pickup
  dispatches remain Active without a driver because pickup deliberately has no
  driver assignment.
- Completed uses the same membership authority and contains only canonically
  fulfilled dispatches. Its table replaces Schedule with Completed and renders
  `deliveredAt`, falling back to the last operational update for repaired legacy
  records.
- Section filtering happens before the final infinite-scroll page is returned.
  The repository scans ordered candidates in bounded chunks so projected
  filtering does not produce short intermediary pages or client-side leakage.
- Empty-state copy is section-specific and clearing table filters preserves the
  selected workspace. Existing Sales Overview Packing actions and the shared
  fulfillment table visual system remain unchanged.
- Due Today and Past Due are counted, URL-addressable subsets of canonical
  Active. Due Today requires the business-timezone `today` bucket; Past Due
  requires `overdue`. Both inherit the assigned-delivery/open-pickup rule and
  therefore cannot broaden into completed, cancelled, or unassigned delivery
  work.
- Their list query first narrows database candidates with the existing due-date
  boundary helper, then applies canonical lifecycle membership before final
  pagination. This avoids scanning historical completed dispatches while
  keeping lifecycle projection authoritative.

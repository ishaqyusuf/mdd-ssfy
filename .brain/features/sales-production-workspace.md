# Sales Production Workspace

## Goal
Provide a cleaner production operations surface for both admins and production workers with fast due-date triage, clear urgency alerts, and a more usable daily queue.

## Canonical Admin Workspace (2026-08-18)

- Canonical route: `/sales-book/productions`.
- Compatibility route: `/sales-book/productions/v2`, implemented as a
  query-preserving local redirect to the canonical route.
- The admin workspace follows the Sales Finance page system: compact title,
  separate summary cards, shared `PageTabs` inside the Midday search/filter
  toolbar, Tables-2 queue, and isolated Suspense/error boundaries.
- Work-state PageTabs are ordered `Due Today`, `Calendar`, `Unscheduled`,
  `Active`, `Past Due`, `Review`, and `Completed`; every work-state tab displays
  its current summary count while Calendar is intentionally count-free.
- The queue also exposes `Due Today` and `Past Due` tabs. Past Due uses the
  start of the current day as an exclusive boundary, so it never includes
  today’s assignments.
- Calendar is a first-class page tab rather than a separate Table/Calendar
  toolbar display control. Active returns to the canonical queue table.
- Calendar selection loads bounded scheduled production rows only. Week and
  Month views match the Fulfillment calendar interaction model, group same-day
  assignments into one order card, show the assignment count, and preserve the
  existing Sales Overview `sales-production` open flow. Orders whose production
  assignments have no due date live in the separate Unscheduled table tab.
- The centered period label is clickable in both views. Week mode offers the
  selected week plus ten earlier and ten later weeks; Month mode offers the
  selected month plus four earlier and four later months. Selection is
  unrestricted in either direction and writes the new anchor to the URL.
- Desktop/tablet render the virtualized queue table. Widths below 768px render
  production cards backed by the same row DTO.

## Routes
- Admin board: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/productions/page.tsx`
- Admin board v2 compatibility: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/productions/v2/page.tsx`
- Worker sales-book route: `apps/dashboard/src/app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx`
- Canonical worker dashboard:
  `apps/dashboard/src/app/(sidebar)/(sales-production-worker)/production/dashboard/page.tsx`
- Worker v2 compatibility redirect:
  `apps/dashboard/src/app/(sidebar)/(sales-production-worker)/production/dashboard/v2/page.tsx`

## Shared UI
- Shared client shell: `apps/dashboard/src/components/production-workspace.tsx`
- Canonical admin shell: `apps/dashboard/src/components/sales-production/workspace.tsx`
- Admin title, summary, header, calendar, and reviews:
  `apps/dashboard/src/components/sales-production/*`
- Admin and worker analytics reuse the compact admin card component at
  `apps/dashboard/src/components/sales-production/analytics-card.tsx` so the
  small radius, inline icon, monospaced count, compact description, hover, and
  active-filter treatments stay synchronized.
- Shared list/table: `apps/dashboard/src/components/tables-2/sales-production/*`
- Shared filter state: `apps/dashboard/src/hooks/use-sales-production-filter-params.ts`

## V2 Compatibility
- `/sales-book/productions/v2` is no longer an admin list implementation. It
  preserves the incoming query and redirects locally to
  `/sales-book/productions`.
- `/production/dashboard` is the canonical worker route and owns the complete
  tabs, analytics, calendar, and `sales.productionTasks` table implementation.
- `/production/dashboard/v2` preserves incoming query parameters and redirects
  locally to `/production/dashboard`; sidebar and internal links use only the
  canonical base path.
- The previous dedicated v2 board/list code and `sales.productionsV2` /
  `sales.productionDashboardV2` read models remain only for worker/detail/action
  reference; they are not the canonical admin list surface.

## Canonical Admin UX
- Shared Production analytics cards for Unassigned, Past due, Due today, and
  Awaiting review. The worker dashboard reuses this compact admin design while
  both surfaces retain their own labels, counts, and filter actions.
- Due Today/Calendar/Unscheduled/Active/Past Due/Review/Completed PageTabs in
  the shared search/filter toolbar.
- The Calendar page tab supports URL-backed Week and Month periods, a centered
  clickable period picker, and inline order cards. Calendar cards open Sales
  Overview on the Production tab; undated work is intentionally excluded.
- Responsive production cards below 768px and the existing virtual table at
  tablet/desktop widths.
- Search, queue, due, assignee, priority, material, sort, and column controls
  appear only where their underlying view supports them.
- Ready requires 100% assigned production quantity, at least one active owned
  assignment, no active unowned assignment, and available materials.
  Unassigned includes null-owner assignment rows. Combined due views preserve
  all supported filters and pagination state.

## Shared Worker/Legacy Queue UX
- Worker routes now expose URL-owned PageTabs in this order: `Due Today`,
  `Calendar`, `Unscheduled`, `Past Due`, `Future`, and `Completed`. Due Today is
  the default worker view; Unscheduled means incomplete assignments with no due
  date, and Future means incomplete assignments due after the current day.
- The worker dashboard starts with four authenticated-account analytics cards:
  Due Today, Past Due, Future, and Completed. Each card writes the same
  URL-owned filter as its matching tab, and the Future/Completed counts are
  also shown on their tabs.
- The decorative worker dashboard hero is removed. Tabs and search share the
  compact toolbar row, internal canonical filter values stay hidden, and the
  retired saved-view/Add-tab controls are disabled on worker routes.
- The worker queue hides the admin column-visibility selector; the canonical
  admin Production workspace retains its column selector and quick filters.
- Worker dashboard summaries and calendars use the authenticated-account
  `sales.productionDashboardTasks` read. Worker table slices continue through
  `sales.productionTasks`; neither endpoint trusts a caller-supplied worker id.
- Calendar renders only on its tab and reuses the canonical admin Production
  Week/Month calendar, including period navigation, the status legend, grouped
  inline order cards, and overflow menus. Unscheduled work uses the normal
  account-scoped table tab; worker calendar cards open the Production Tasks
  context.
- `sales.productionCalendarTasks` owns worker calendar scoping by replacing
  any caller assignee with the authenticated user. Exact-date and calendar
  reads use the same incomplete-order assignment boundary as Due Today,
  without the retired item-control readiness predicate.
- The worker queue no longer renders a duplicate title or current-filter
  subtitle beneath the tab/search toolbar.
- Completed worker rows are determined from that worker's related assignment
  quantities/submissions (or completed assignment timestamps), so a worker can
  see finished work before the entire multi-worker order is globally complete.
- The worker Completed analytics count uses the same assignment-level
  completion rule as its list. Client-side card transitions discard the
  server's initial Due Today fallback so no stale preset can leak into another
  analytics view.
- Worker routes retain the role-specific shared workspace and production task
  query while reusing the same Tables-2 row contract.
- The legacy workspace queue table now follows the Sales Orders `tables-2` pattern:
  - table-owned scroll with `VirtualRow` and header-offset spacer
  - draggable and resizable compact headers
  - persisted column visibility, sizing, order, and dividers under `sales-production`
  - sticky Due Date column
  - worker mode columns: Due Date, Sales, Sales Rep, Status, Progress, Actions
  - admin mode columns: Due Date, Assigned To, Customer, Order #, Sales Rep, Status, Progress, Actions
  - sticky Actions column
  - compact 40px rows matching the Sales Orders table, with tighter
    content-tailored widths instead of the old `@gnd/ui/data-table` shell
- The queue table now uses the Sales Orders-style height contract `calc(100vh - 350px + var(--header-offset, 0px))` instead of capping the table at 560px.
- The queue table surface is flat, not wrapped in a table card; the filter/action row sits directly above the table like the Sales Orders table surface.
- Desktop Materials cells show only the primary material state; supporting ETA,
  availability, and verification copy is intentionally omitted. Desktop Progress
  retains its visual bar but omits the numeric percentage.
- The desktop Due Date title uses the same shared relative/short-date formatter
  as the Sales Orders Date column and omits the alert-status subtitle. Incomplete
  work due today or earlier is red; work due in the following seven days is
  amber; completed and later dates remain neutral.
- The desktop Assigned To cell uses a compact secondary badge for assigned
  workers and an outlined `Unassigned` badge when no worker is assigned.

## V2 Core UX
- Worker dashboard v2 is a mobile-friendly assigned-production board with:
  - due-date cards
  - clickable month calendar
  - worker-only queue
  - inline expandable order detail
  - simplified worker queue status that favors per-order completion progress over admin assignment/status badges
  - notification-channel-backed note activity in the expanded section
- Admin productions v2 is a dedicated admin board with:
  - completed label visibility
  - expandable order detail
  - quick-assign panel scaffolded inline
- Inline detail sections are the new home for production information, notes/activity, and production actions such as submission and submission removal.
- Expanded worker/admin order detail shows material readiness independently of
  assignment authorization. Pending materials include required, available, and
  inbound quantities plus the linked shipment expected date when present.
- Production items inside the expanded order now render as a responsive card grid:
  - single-column when there are 2 items or fewer
  - `lg:grid-cols-2` when there are more than 2 items
  - clicking an item injects its full detail panel directly after that visual row instead of nesting inside the card
- Worker submission entry now uses compact button-group controls:
  - quantity presets remain the primary input
  - handled assignments use LH/RH toggle selection plus quantity presets
  - large quantities still expose the combobox fallback
  - single-handle assignments auto-select the only valid handle

## Data Contract
- Canonical URL state:
  - `tab=queue|calendar|reviews|completed`; `tab=calendar` is normalized
    internally to the queue-backed calendar workspace
  - `view=table|calendar`
  - `calendarView=week|month` and `calendarDate=YYYY-MM-DD`
  - `queue`, `q`, `assignedToId`, `priority`, `due`, `date`, `material`, and
    `sort`; `due=unscheduled` selects orders with an active undated assignment
- Legacy `production`, `show`, `productionDueDate`, `salesNo`, `label`, and
  `date` values are normalized by
  `@gnd/sales/production-workspace-query`.
- `sales.productions`: full/admin production queue
- `sales.productionTasks`: authenticated worker queue
- `sales.productionDashboardTasks`: authenticated worker summary, alert, and
  compact calendar projection; the router always replaces worker scope with
  the current session user id
- `sales.productionSummary`: bounded canonical summary counts without list or
  calendar work
- `sales.productionDashboard`: legacy summary, alert, spotlight, and calendar
  payload retained for legacy consumers
- `sales.productionCalendar`: bounded due-date aggregates plus grouped
  scheduled production order cards for an explicit `from` and `to` range.
  Scheduled rows are capped at 1,500 assignments before same-order/day grouping;
  undated assignments are served by the production list contract instead.
- Material-only and created-date sorted pagination stream forward from the raw
  database cursor; custom priority/due sorts use a minimal global candidate
  projection and omit a misleading total when completion eligibility is
  evaluated after hydration.
- `productionDueDate`: exact queue filter used by the compact calendar
- `show`: alert preset selector for `due-today`, `due-tomorrow`, and `past-due`
- Worker routes additionally support `show=future`, defined as incomplete
  assigned work due from tomorrow forward.
- Sales overview Production tab badges count the same production-capable `sales.productionOverview.items` rows rendered in the tab, instead of using `prodAssigned.total` quantity totals. This keeps the badge inline with visible production cards for both the v2 sales overview system and the legacy sales overview sheet.
- Sales Overview Production item cards show the customer-facing title and
  subtitle only; internal `controlUid` values remain available to notes,
  assignments, selection, and URL state but are never rendered as card copy.

## Sales Overview Worker Item Detail (2026-08-21)

- Production-only users see only production items with quantity assigned to the
  authenticated worker. The first available item expands automatically when no
  valid `prod-item-view` is present. V2 keeps exactly one item expanded for
  every role; opening another item closes the previous one and writes the new
  item identity to `prod-item-view` so refresh and browser navigation restore
  the same item.
- `Details` is the default Production item tab for every role. Admins retain
  `Details`, `Notes`, and `Assignments`; production-only users receive
  `Details`, `Notes`, and `Submissions (X/Y)`, where X is reported submission
  quantity and Y is the authenticated worker's assigned quantity.
- Production item tabs use the same compact bordered rail, uppercase trigger,
  active-state treatment, and count-badge pattern as the main Sales Overview
  tabs rather than the retired full-width grid treatment.
- The worker Submissions tab reuses the scoped assignment authority to add work
  only up to the remaining assigned quantity and to display the worker's
  existing deletable submissions. It does not expose assignment creation,
  assignment ownership metadata, or the Assigned/Production/Fulfilled progress
  strip.
- Submission deletion is sale-bound and authenticated. Production workers may
  delete only submissions they authored for an assignment currently owned by
  them; `editProduction` retains the administrative delete boundary.
- The worker Submissions surface is flat inside the production item card: it
  omits nested assignment/form cards, uses simple separators for existing
  submissions, and aligns to the same horizontal content inset as Details.
  Submission quantities reuse the shared new Sales Form
  `SalesFormQuantityStepper` with bounded minus/input/plus controls. Handle
  quantities with no pending work remain visible but disabled.
- The production item disclosure chevron sits in the title row beside the item
  controls. Worker cards no longer reserve a second empty progress row beneath
  the subtitle.
- Production item labels use the standard shadcn `ItemContent`, `ItemTitle`,
  and `ItemDescription` typography. A shared presentation helper normalizes the
  rendered title and complete subtitle values to uppercase, so visual,
  accessible, and browser text all use the same capitalization without changing
  stored sales-item data.
- Collapsed production items use only the accordion's bottom divider, with no
  card side or top borders. Expanded items replace that divider with a neutral
  border around the full card and add no background tint, gradient, or elevated
  shadow.
- In the V2 admin view, each production item's fixed Assigned / Production /
  Fulfilled progress strip is replaced by compact shadcn badges beneath the
  subtitle. Zero assignment shows `Not Assigned`; partial work shows `X of Y`
  for every active overlapping stage; a completed upstream stage disappears
  once the next stage starts. Fully assigned work shows `Assigned` until the
  first submission, fully submitted non-shippable work shows
  `Production Completed`, fully submitted shippable work shows
  `Ready to Fulfill`, and completed dispatch shows `Fulfilled`. Production and
  fulfillment badges remain absent until their stage has actual progress.
- The progressive item badges retain the existing role boundary: they replace
  the admin progress strip only and remain hidden from production-only users.
- The Sales Overview header priority selector is hidden for production-only
  users. Admin/order-capable users retain the existing selector and Production
  assignment controls.
- Worker detail hides the admin `Inventory setup incomplete` notice. Configured
  unavailable material or an unavailable readiness projection shows a blocking
  worker alert for affected work; missing material configuration remains
  nonblocking and invisible to workers.

## V2 Data Contract
- `sales.productionsV2`: v2 list query for worker/admin boards
- `sales.productionDashboardV2`: v2 summary counts plus label metadata including `completed`
- `sales.productionOrderDetailV2`: lazy inline detail payload for expanded order sections
- `sales.productionOrderDetailV2.items[].materials`: inventory-owned material
  readiness, quantities, and nullable inbound expected date for the production
  item.
- Admin and worker production queues show a `Materials` column with ready,
  pending, or not-configured status and the latest linked inbound expected date
  when available.
- Queue material lookup is informational and bounded. Failure renders
  `Materials unavailable` without suppressing production rows; mixed dated and
  undated requirements show a latest-known ETA plus the unscheduled count.
- `sales.productionOrderDetailV2.items[].noteContext`: normalized note identity used by the new inbox/chat note system
- Worker scoping remains server-enforced in v2 through authenticated `workerId` injection at the router layer.
- The `show: "past-due"` production alert/query only includes orders with incomplete production work; production-completed orders are excluded even if dispatch is still pending.
- Worker expanded-order item grids now apply a client-side safety filter too, so only production items assigned to the logged-in worker render in worker mode.
- `completed` semantics now differ by scope in the shared production list pipeline:
  - worker mode treats an order as completed only when that worker's related assignments are fully submitted
  - admin mode treats an order as completed only when total submitted production qty meets the full production qty for the order
- Production assignment mutations emitted through `update-sales-control` now trigger a targeted `sales_production_assigned` notification to the assigned worker from the Trigger jobs layer.
- Inventory readiness never blocks `createAssignments`. Per ADR-063, worker,
  admin, and supervisor reports with unresolved or unavailable evidence are
  saved under guarded material review and remain excluded from finalized
  production until approved. Submission identity and elevated
  submit-for-others capability are derived server-side.

## Submission Material Verification (2026-07-30)

- The live Sales Overview production form warns production-only workers when
  material evidence is pending/unavailable or cannot be loaded, but preserves
  their physical-work report through the ADR-063 pending material-review path.
  It does not present pending quantity as finalized production.
- A pending submission immediately consumes the assignment's reported
  remainder so repeat submission is prevented. It displays `Awaiting material
  approval` to the worker.
- The live admin `ProductionWorkspace` includes a bounded material verification
  queue with fresh evidence, staleness indication, decision notes, confirmed
  good/issue inbound quantities, and scoped manual-fulfillment choices.
- Admins may recheck without mutation, combine multiple linked inbound receipts
  with no-inbound manual fulfillment, approve only after fresh readiness, or
  reject and void the submitted rows.
- Pending work never creates payroll or becomes packable/dispatchable. Approval
  uses only the immutable submission scope for payroll and downstream effects.
- Review scope snapshots the original authenticated reporter, assignment owner,
  revision, and labor terms. Approval re-reads fresh assignment state; stale
  reassignment/deletion cancels the review safely and never pays a replacement
  worker. Exact same-request retries replay before mutable assignment checks.
- Pre-snapshot pending reviews are preserved through an exact legacy-scope
  compatibility check. Untouched active assignments are bound to their current
  owner, revision, and labor terms in the decision transaction; reporter,
  quantity, control, or assignment revisions not strictly earlier than the
  submission cancel safely without finalization or payroll. Equal timestamps
  are treated as ambiguous rather than eligible for backfill.
- Worker and admin notifications use typed production material-review channels.
- All produceable legacy submission writers route through the shared
  `@gnd/sales` submission authority; non-production dispatch compatibility rows
  remain outside this review workflow.

## V2 Notes
- Order-level notes now use the newer inbox/chat note flow on the `sales_info` notification channel.
- Production item notes now use the newer inbox/chat note flow on the `sales_item_info` notification channel.
- Production item note identity is normalized from v2 detail data via:
  - `salesId`
  - `salesNo`
  - `itemId`
  - `itemControlId`
- Current caveat: production items are still keyed by string `controlUid` in sales-control, so `itemControlId` currently falls back to the numeric sales item id until the sales domain exposes a dedicated numeric item-control identifier.

## Notes
- The rebuild intentionally reuses the existing production list infrastructure instead of creating a second list system.
- The current dashboard summary is optimized around open production queue visibility and near-term due dates.
- The 2026-08-21 worker cutover promotes the restarted implementation to
  `/production/dashboard`; `/production/dashboard/v2` is now query-preserving
  compatibility only. The admin normalization remains
  `/sales-book/productions/v2` -> `/sales-book/productions`.
- The current v2 slice now includes a worker-focused interaction pass:
  - item-card chevrons are pinned to the top-right of each card
  - worker submission UX is optimized for fast repetitive entry
  - row-level detail expansion replaces the older nested accordion feel for production items

## Submit-All Action Integrity (2026-08-18)

- The Sales Overview production menu passes the `submit` action directly when
  `Submit All` can execute immediately, avoiding a stale React state closure
  that previously dispatched an actionless Trigger payload.
- The legacy update-sales-control command resolver rejects payloads with zero
  actions before command execution, while retaining its one-action-only rule.

## Sales Overview Production Item Single-View Design Review (2026-08-22)

- The proposed replacement removes the Production item-level `Details`, `Notes`,
  and role-specific `Assignments` / `Submissions` tabs. An expanded item instead
  presents one continuous content view in this fixed order:
  1. a role-aware create action and its simple inline collapsible form
  2. assignments for admins or the authenticated worker's submissions
  3. production item details
  4. notes and activity
- Only the create form collapses. Assignments/submissions, details, and
  notes/activity remain visible so workers and admins do not have to switch
  context to understand or act on an item.
- The admin design inventory preserves assignment creation, worker and due-date
  selection, bounded LH/RH quantities, editable due dates, guarded assignment
  deletion, assignment submission, nested submissions, completion, and material
  review states.
- The production-worker inventory preserves assignment-bounded submission
  quantities, optional submission notes, personal submission counts/history,
  guarded deletion, pending material approval, material blocking, and completed
  quantities. Shared notes preserve author/time, visibility/type, attachments,
  empty states, and authorized administrative actions.
- `A — Command Document` is the approved direction. The rejected exploration
  directions remain Operations Rail, Production Ledger, and Conversation
  Canvas. Command Document uses a calm continuous layout with simple separators,
  gives assignments/submissions the strongest hierarchy, uses a compact details
  definition grid, and finishes with chronological notes/activity. It shows
  admin and worker states with the same component system, preserves uppercase
  shadcn item title/description, outlines only the expanded item, leaves
  collapsed items with bottom dividers, and adds no expanded-state background.
- Persistent GStack artifacts live outside the repository at
  `~/.gstack/projects/gnd/designs/production-item-single-view-20260822/`.
  The approved interactive source is `finalized.html`, its metadata lives in
  `approved.json` / `finalized.json`, and the comparison board remains
  `design-board.html`. The implementation checklist is
  `.brain/plans/2026-08-22-feature-sales-overview-production-item-single-view.md`.
  No application behavior changed during design approval.

## Sales Overview Production Item Single View — V2 Implementation (2026-08-22)

- The approved Command Document is implemented only when the Sales Overview is
  in V2 mode. A dynamic Production gateway uses the same rollout selection as
  General V2 and retains the previous Production item tabs as the legacy
  fallback.
- Expanded V2 items render the role-aware create action and inline form first,
  followed by Assignments/Submissions, Details, and Notes & activity. The
  information sections do not collapse and no item-level tab state is written.
- Admin assignment creation, editable due dates, assignment submission, nested
  submissions, material states, and guarded deletion continue through the
  existing mutation components. Production workers retain server-filtered own
  assignments/submissions, bounded quantities, optional notes, material and
  dispatch locks, pending approval states, and guarded deletion.
- Zero, one, and multiple eligible worker assignments are handled explicitly;
  multiple choices default to the earliest due eligible assignment. Successful
  creation closes only the inline form.
- Item shells use shadcn Item title/description composition in uppercase.
  Collapsed items have only a bottom divider; expanded items receive one neutral
  outline with no active color. Only the first assigned worker item opens by
  default.
- The implementation follows the Midday split between a thin V2 tab owner,
  item-document content, shared context, skeleton, and pure selection policy.
  No API, database, permission, migration, or new package contract changed.
- Focused Production validation passes 20 tests / 48 assertions; new V2 files
  pass scoped Biome. Broad dashboard typecheck and authenticated browser QA were
  not run under the fast Bun command discipline.
- When an item has no assignments or submissions, the V2 section stops after
  its role-specific heading and count badge. Redundant empty-state panels are
  omitted for both admins and production workers.
- The admin material-pending readiness alert is compact: it shows only
  `Material Pending` and the `Review Inventory` action. Detailed blocker and
  inbound copy remains available on the Inventory surface reached by that CTA.

## 2026-08-23 Pending-material submission approval completion

- Worker production submission remains available when material evidence is
  pending. A new review request is written directly to the order sales rep's
  in-app inbox with worker, quantity, order, and classification context.
- Missing material configuration no longer renders a fake inventory component
  with ID `0`. The admin sees explicit physical-availability consent and uses
  `APPROVE_CONFIGURATION_EXCEPTION`, which records no physical stock movement.
- Pending review assignment snapshots refresh after the submission's own
  sales-control recalculation. Genuine later ownership or assignment revision
  changes still cancel approval as stale.
- Approved or rejected decisions are delivered directly to the submitting
  worker and are mandatory operational notification-center channels.
- Authenticated worker/admin acceptance on order `09396PC` verified submission,
  sales-rep notification, explicit exception approval, persisted approved
  state, and worker notification. Evidence is in
  `artifacts/dispatch-lifecycle-20260823/`.
- Decision: `.brain/decisions/ADR-068-guarded-fulfillment-and-production-review-authority.md`.

# Sales Production Workspace

## Goal
Provide a cleaner production operations surface for both admins and production workers with fast due-date triage, clear urgency alerts, and a more usable daily queue.

## Release safety hardening (2026-08-31)

- Assignment create, delete, and batch assignment require `editProduction` at
  the server action, independent of UI visibility.
- Assignment deletion is scoped to the expected order and item identity.
- Submission quantity validation locks the assignment before re-reading active
  submissions, so concurrent idempotency keys cannot both consume the same
  remaining quantity.

## Order-level assignment default (2026-08-30)

- New Sales Overview production assignments initialize their Due Date from the
  order's saved `SalesOrders.prodDueDate`.
- The assignment retains its own editable due date after creation; changing an
  assignment schedule does not rewrite the Sales Form's order-level planning
  default.
- Assignment date pickers use the shared shadcn calendar's semantic day states:
  today receives a faint accent background for orientation, while the selected
  due date retains the stronger primary-filled treatment. When today is also
  selected, the selected treatment remains visually dominant.

## Queue date controls (2026-09-01)

- The production table's Due Date header is connected to the canonical
  production sort. Repeated activation cycles through earliest due date,
  latest due date, and the default ordering.
- Active and Completed production tables expose shared calendar-range filters
  for Production due date and Order date. The controls retain the existing
  date presets and write their values to URL state so filtered queues survive
  refresh and can be shared.
- Production due-date ranges filter active assignment due dates through
  `production.dueDate`; order-date ranges filter `SalesOrders.createdAt`
  through the existing `dateRange` contract. Review and Calendar workspaces do
  not retain these table-only filters.

## Assignment detail alignment (2026-08-30)

- Sales Overview assignment facts are top-aligned so assignee, due date, and
  progress headings share a stable baseline even when progress wraps.
- Assignment and submission rows reserve the same compact right action gutter.
  Calendar, delete, and add-submission icon buttons remain aligned and clear of
  the accordion chevron instead of crowding or clipping against the sheet edge.
- Submission records retain their nested ledger treatment, with vertically
  centered content and compact icon actions.

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
- Table filters include calendar ranges for Production due date and Order date;
  the Due Date column header uses the same URL-owned sort state as the Sort by
  menu.
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
  - admin mode columns: Due Date, context-owned Order Date, Assigned To,
    Customer, Order #, Invoice, Sales Rep, Materials, Status, Progress, Actions
  - Order Date is mandatory immediately after Due Date on the Active and
    Unscheduled admin table tabs; it is hidden on Due Today, Past Due, and
    Completed regardless of saved column visibility/order preferences
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
  - `queue`, `q`, `assignedToId`, `priority`, `due`, `date`, `dateRange`,
    `production.dueDate`, `material`, and `sort`; `due=unscheduled` selects
    orders with an active undated assignment
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
- Clicking a Production item whose top begins below the midpoint of the Sales
  Overview sheet's internal content viewport waits for the single-open
  accordion transition, then smoothly aligns that item near the viewport top.
  Items already in the upper half do not move, direct URL restoration does not
  trigger a jump, reduced-motion preferences are respected, and the page scroll
  position is never used for this repositioning.
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

## Admin batch status actions (2026-08-29)

- The canonical admin table now has a sticky checkbox column and a Sales
  Orders-style floating selection bar. Responsive admin cards expose the same
  accessible checkbox selection; production-worker tables and cards do not.
- The floating bar and row overflow actions reuse `SalesMenu.MarkAs`, including
  fulfillment permission checks, inventory preflight/resolution, monitored task
  handoff, query invalidation, and feedback.
- Production rows expose canonical lifecycle status in addition to production
  completion evidence. Batch production completion skips rows already complete
  or fulfilled, while batch fulfillment skips rows already fulfilled before
  any mutation boundary.
- Authenticated in-app browser proof on the Past Due table confirmed the Select
  column, `1 selected` bar, Deselect all control, canonical Production completed
  and Fulfilled actions, and zero console errors. No status action was submitted.
- The select-column header is now a tri-state Mark All checkbox over every row
  currently loaded into the infinite admin table. Production Completed starts
  one monitored `bulk-mark-sales-production-completed` parent run for the
  eligible selection instead of one top-level browser task per order.
- The parent reloads current lifecycle state, skips orders already at or past
  production completion, and runs at most 40 deduplicated orders through
  bounded seven-day-idempotent child updates. Terminal feedback separates
  actual completions, already-completed skips, material-review outcomes, and
  failures before one Production/list refresh and selection reset.
- Authenticated execution proof refreshed Past Due, selected all 40 loaded
  rows, completed the canonical dependency-resolution flow, and verified a
  terminal count change from 1,099 to 1,059 with zero console errors.
- Production list and worker-task infinite queries request 20 rows per page.
  Infinite scroll may combine several pages in the table, but each network
  request remains bounded to 20 records.
- Mark All continues to select every currently loaded row. If that selection
  exceeds the 40-order task contract, the server blocks the task before
  enqueueing and the UI shows the exact safe direction: `Bulk production
  completion is limited to 40 orders.` Unknown task-start/runtime errors remain
  sanitized.
- Production queue lifecycle projection now prefers actual completed-delivery
  evidence over stale legacy production/order statistics. Rows already past
  production completion are filtered from pending queues, and the shared
  dependency resolver plus durable parent repeat that eligibility check at
  their mutation boundaries.
- Regression QA reproduced the prior all-selection failure on fulfilled legacy
  order `07471PC`, verified it no longer appeared after refresh, selected all 40
  loaded rows, and completed one parent run. Past Due decreased from 1,058 to
  1,018 exactly.

## Admin invoice visibility and expanded filters (2026-08-29)

- Admin table and responsive-card rows expose read-only invoice total and a
  compact Paid, Outstanding, or Not set status. Production-worker surfaces do
  not receive finance presentation.
- Production list and summary reads accept the applicable Sales Orders search
  fields: customer, phone, P.O., sales rep, order number, item, and invoice
  status. Invoice filtering is intentionally limited to Paid and Outstanding;
  payment creation and editing remain owned by Sales Orders and Sales Overview.
- Calendar retains only search, assignment, and priority filters. Review and
  Calendar navigation clear incompatible order/payment filters rather than
  carrying hidden URL state into those projections.
- The filter menu uses semantic icons for assignment, queue state, due date,
  material state, and sort instead of the generic search fallback.
- Authenticated Past Due QA confirmed the Invoice column, Paid row states, the
  expanded filter menu, and distinct semantic filter icons. A later reload was
  blocked by the unrelated existing dispatch-manifest module-resolution error.

## Two-row tabs and filter header (2026-08-29)

- Production uses the shared adaptive search/filter header composition already
  established by Sales Orders. The tab rail occupies the complete first row;
  search, active filter chips, and column controls start on the second row.
- The tab rail never wraps into multiple lines. Wide layouts show all seven
  Production tabs, while narrower layouts preserve the active tab and place
  excess destinations in the existing overflow menu.
- The adaptive behavior remains opt-in. Other custom-tab workspaces retain
  their previous layout unless they request the adaptive composition.
- Authenticated QA confirmed all seven desktop tabs on one baseline with search
  below. At 900 pixels, three tabs remained inline, four moved into `+4`, and
  the full-width search/filter row remained directly beneath the rail.

## Submit-All Action Integrity (2026-08-18)

- The Sales Overview production menu passes the `submit` action directly when
  `Submit All` can execute immediately, avoiding a stale React state closure
  that previously dispatched an actionless Trigger payload.
- The legacy update-sales-control command resolver rejects payloads with zero
  actions before command execution, while retaining its one-action-only rule.
- The Production item action dropdown reuses the footer action menu's
  intrinsic-width behavior. Assign All, Submit All, Delete Submissions, and
  Delete Assignments stay on one line with their quantity labels, and every
  action icon has a non-shrinking standard 16px footprint.

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

- The approved Command Document remains rollout-selected with General V2 for
  admin/order-capable users. Production-only workers always use the V2
  Production document even while the office-wide General surface remains on
  V1; the previous Production item tabs remain the admin V1 fallback.
- Expanded V2 items render Assignments for admins or Submissions for workers,
  followed by Details and Notes & activity. Create forms expand inside the
  corresponding records section; the information sections do not collapse and
  no item-level tab state is written.
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
- When an admin item has no assignments, the V2 section stops after its heading
  and count badge. A worker item with no submissions instead shows one
  full-width `Create submission` action directly below the Submissions heading.
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

## Assignment Ledger Accordion (2026-08-29)

- `A — Ledger Accordion` is the approved replacement for the admin assignment listing inside the Sales Overview Production item. The surrounding Production item single-view UI remains unchanged.
- Each assignment is an accessible disclosure trigger. Before expansion it shows
  the assignee, due date, assigned-by/date metadata, and quantity progress. The
  redundant assignment-state and submission-count badges are omitted because
  progress and the expanded quantity heading communicate those states.
- Due-date editing and guarded assignment deletion are independent icon actions
  immediately before the disclosure chevron, so using either control does not
  expand or collapse the assignment. Fulfilled orders lock both actions.
  Existing submissions do not lock assignment deletion; assignment deletion
  remains unavailable once the order is fulfilled or while dispatch mode is
  active.
- Expanding one assignment reveals an indented, background-free submission
  region headed `Submissions (X of Y)`. Its only header action is an icon-only
  add-submission button, which disables after the full assigned quantity is
  submitted or the order is fulfilled. Submission rows use dividers rather
  than another card or ledger header strip; the empty explanatory copy is
  omitted.
- Implementation must reuse the current queries, mutations, permission checks, dispatch locks, and material-review rules. This is a presentation and interaction migration, not a new assignment domain workflow.
- Use GND's `@gnd/ui` shadcn `Accordion` or `Collapsible` primitives with existing buttons, badges, item composition, and theme tokens. Chakra UI must not be introduced.
- Before application code changes, use the `midday` and `midday-migration-planner` skills to record the reference comparison, migration contract, state ownership, accessibility behavior, and conformance audit.
- The approved design reference is `/Users/M1PRO/.gstack/projects/gnd/designs/sales-production-assignments-20260829/comparison.html#concept-a-title`; approval metadata is stored beside it in `approved.json`.
- The implementation uses one multi-value `@gnd/ui` accordion with stable assignment ids. The first assignment opens by default, while opening another assignment does not discard the current inspection context.
- The expanded ledger renders submission owner/date, quantity, evidence, and
  guarded deletion. Material-review state is intentionally omitted from each
  submission row. The submit form begins below a
  separator without a nested card and retains the existing quantity, note,
  submit, and cancel behavior.
- Admin assignment creation is no longer a standalone section. A small primary
  rounded-xl plus button follows the total badge in the `Assignments` heading
  and opens the same existing form. Its unavailable reason remains in a
  tooltip. Worker submission creation now follows the same section-owned
  pattern instead of using a separate top section.
- The submission plus is also small, primary, and rounded-xl. The assignment
  due-date control is a centered small ghost calendar button with the same
  rounded-xl shape.
- Assignment rows use one consistent right-side action gutter: the disclosure
  chevron sits at the outer content edge, calendar/delete actions sit one slot
  before it, and both the Assignments-heading plus and Submissions-heading plus
  reserve the same right gutter. Both headings vertically center their labels,
  badges, and action buttons.
- Assignment records are owned by the item-level assignment provider. Create,
  submit, assignment-delete, and submission-delete success callbacks refresh
  that provider snapshot immediately in addition to emitting the broader
  Production query event, so counts and submission rows update without a page
  reload.
- Production deletion loading notices use the shared loading-toast lifecycle;
  clearing the tracked toast now dismisses the active infinite-duration notice
  before forgetting its id, so successful or failed deletes cannot leave a
  stale `Deleting...` notification behind.
- Compact layouts keep the complete assigned-by/date metadata, wrap state and progress safely, and use 44px action targets. Desktop, 768px, and 390px authenticated checks found no horizontal overflow.
- Authenticated QA covered the empty-submission assignment on `09488AD` and the completed one-submission/material-approved assignment on `09396PC`. Pointer disclosure and submit/cancel passed, and a clean final reload produced no browser warnings or errors.
- The disabled create action no longer renders a full-width `Create unavailable`
  alert. Its current policy reason is exposed from the disabled shadcn button
  through a compact hover tooltip instead.
- The inline Create Assignment form reuses the Sales Form quantity stepper for
  bounded plus/minus entry. Assign To and Due Date top-align their labels and
  controls, with the legacy select inset explicitly removed for this grid. The
  form stacks to one column below `sm` so labels, availability counts, steppers,
  and actions do not collide on narrow sheets.
- The shared shadcn calendar uses React DayPicker's v9 `month_grid` slot and the
  upstream proportional grid: weekday headings use `flex-1`, week rows remain
  full-width, and date cells fill an equal aspect-square column. Tailwind v4
  variable utilities use the shadcn `-(--cell-size)` syntax, and date popovers
  size to the calendar content.
- Material-review warnings are silent across the create-submission and expanded
  submission surfaces. Successful submissions use the standard `Submitted`
  feedback even when a worker submission is saved for pending review.
- Worker self-submissions retain pending-review behavior for unresolved
  evidence. Admins, production editors, and the sales representative assigned
  to the exact order automatically approve when they submit on behalf of a
  different assignment owner. The review snapshot, unresolved classification,
  reviewer identity, and operator-approval resolution remain auditable.
- Guarded-packing controls under Sales Operations remain separate downstream
  settings; they do not change production submission classification or
  on-behalf approval authority.
- No API, database, migration, or dependency contract changed. The production
  permission boundary changed as documented in ADR-075. The
  shared shadcn accordion trigger gained an optional, backward-compatible
  sibling-actions slot so row actions can remain outside the disclosure button.

## Production Worker V2 Detail Cutover (2026-08-30)

- Production-only worker Sales Overview sheets retain the top-level Productions
  and Notes tabs, but the Productions tab now selects the V2 Command Document
  independently of the office-wide General V2 rollout setting.
- Worker items remain server-scoped to the authenticated worker. Each visible
  item shows an explicit assigned-quantity badge beneath its title and exposes
  only the worker's submissions; assignment creation, ownership controls, and
  the admin assignment ledger remain hidden.
- Worker submission rows reuse the same responsive ledger presentation shown
  beneath an expanded admin assignment, preventing owner, date, quantity,
  evidence, and delete controls from collapsing into one crowded line.
- Submission creation belongs to the Submissions heading. When submissions
  exist, a compact rounded plus button sits beside `X/Y submitted`; when none
  exist, one full-width `Create submission` button appears immediately below
  the heading. Both expand the existing assignment-bounded submission form in
  place, with no separate create section or helper subtitle.
- This is a presentation and worker cutover change only. Existing submission
  authority, quantity bounds, dispatch locks, material review, queries, API
  contracts, and database schema are unchanged.

## Production deletion lock visibility (2026-08-30)

- Submission rows derive one visible deletion restriction before interaction.
	Shipped submissions and submissions viewed during dispatch show a compact
	informational notice and retain a disabled delete control instead of reporting
	the restriction only after a click. Material-review state does not restrict
	the submitting worker from retracting unshipped work.
- Assignment rows use the same treatment when the order is fulfilled, the
  assignment already contains submissions, or the order is in dispatch mode.
  The admin accordion keeps the restriction at the top of its expanded record,
  while the existing action tooltip exposes the same reason from the collapsed
  heading.
- The restriction copy is centralized in a pure presentation policy so worker
	and operator surfaces use the same reason priority. Mutation authorization,
	soft-delete behavior, API contracts, and database schema are unchanged.

## Production submission retraction during material review (2026-08-30)

- A production worker may retract their own unshipped submission regardless of
	whether its material review is pending, approved, or absent. Production editors
	retain their existing submit-for-others deletion authority; ownership remains
	server-enforced for ordinary workers.
- Retraction soft-deletes the submission, removes any unpaid pending payroll
	created from it, rebuilds canonical sales controls, and refreshes the
	inventory/production lifecycle. Deleted quantity immediately stops counting as
	reported or finalized production.
- A pending material review remains actionable after its last submission is
	retracted. Its resolution records `SUBMISSION_RETRACTED`, and an administrator
	may still receive inbound or resolve inventory evidence. A later material
	approval receives an empty submission set, so it cannot restore production
	quantity or create worker payroll.
- For a shared review with other active submissions, only the retracted
	assignment scope is removed and the remaining review continues normally.
- Review detail returns active submissions separately from
	`retractedSubmissions` and exposes `hasRetractedSubmissions`. Notification
	links carry the exact `reviewId`; the Review panel shows `Retracted` instead of
	`Qty 0`, explains the audit state, and continues five-second detail refresh in
	the embedded admin order.
- No database migration or permission expansion was required. The existing
	soft-delete field, review resolution JSON, authenticated ownership boundary,
	and material-review decision authority remain canonical.

## Submission-row material status visibility (2026-08-30)

- Worker and admin submission rows do not render pending or approved material
  review badges. A recorded submission is communicated by its presence, date,
  quantity, note, and the section's submitted count.
- Material review remains a domain and admin-workflow concern. Pending reviews,
  decision controls, notifications, inventory evidence, and finalization rules
  are unchanged and continue to render in the dedicated admin review surfaces.
- Older production-detail presentations follow the same rule. Workers receive
  neutral submitted-work confirmation rather than material-approval messaging.
- This is a presentation-only change with no API, database, permission, or
  material-review lifecycle changes.

## Canonical production workflow status and queue eligibility (2026-08-30)

- Production tables describe the current workflow stage independently from
  quantity progress. The canonical stages are `Not assigned`,
  `Partially assigned`, `Assigned`, `In production`, `Awaiting review`, and
  `Production completed`; a zero production target resolves to
  `No production required` and is not a production-queue candidate.
- Assignment coverage determines the pre-production stages, accepted
  submission quantities determine active progress, unresolved material review
  takes precedence as `Awaiting review`, and the canonical completed lifecycle
  determines `Production completed`. The progress column remains a separate
  completed/target measurement.
- Every production list and summary query requires at least one active,
  produceable item control with an active positive production quantity. Stale
  aggregate production statistics cannot make an order with no live production
  work appear in Unscheduled or another Production queue.
- Fulfilled-order deletion guidance is section-scoped rather than repeated per
  row. Admins see one notice before the Assignments list covering assignments
  and submissions; production workers see one notice in their Submissions
  section. The underlying delete controls remain disabled by the existing
  policy.
- This change is an additive read projection and query-boundary correction. It
  does not change database schema, mutation authorization, material-review
  decisions, or assignment/submission storage.

## Production readiness notice lifecycle (2026-08-30)

- Inventory and material readiness notices are pre-work guidance. They render
  only when an order has at least one production item and every production item
  still has zero assigned quantity and zero submitted quantity.
- As soon as assignment or submission activity exists, the Production surface
  suppresses Material Pending, Inventory ready, readiness-unavailable, and
  related inventory notices. The readiness query is disabled at the same
  boundary so old orders and active work do not request or flash irrelevant
  setup guidance.
- Non-production line activity does not suppress guidance for a separate,
  untouched production line. Legacy handed quantities are recognized even when
  their aggregate `qty` field is zero.
- The successful `Inventory ready` notice uses the shared shield-and-check
  glyph. Its `ShieldCheck` alias resolves to Hugeicons' valid
  `SecurityCheckIcon`, preventing the shared missing-icon fallback from
  presenting a search glyph for a completed readiness state.
- This is presentation and query-enablement behavior only. Material evidence,
  pending-review records, approval decisions, Inventory tab data, assignment
  authority, and submission persistence are unchanged.

## Production calendar-date normalization (2026-08-30)

- Production assignment due dates are operational calendar days, not elapsed
  timestamps. New and edited assignment dates are normalized before transport,
  queue predicates use one New York business-date boundary helper, and table
  presentation uses `Today`, `Tomorrow`, and day-overdue labels instead of hour
  countdowns from midnight.
- Single-item, menu, inline, and batch assignment entry points share the same
  normalization. Exact-date, due-today, tomorrow, future, and past-due queries
  share half-open date ranges rather than process-local `startOf("day")` calls.
- The compatibility representation remains a canonical UTC-anchored `DateTime`
  until a system-wide calendar-date migration can move calendar-only database
  fields and API contracts to `DATE` / `YYYY-MM-DD`. Historical timestamps are
  not rewritten without a field-level timezone audit because their original
  calendar intent can be ambiguous.
- Assignment, unassignment, and submission are mandatory operational in-app
  channels. Direct forced recipients remain visible even when ordinary channel
  preferences exclude optional notifications.
- Focused date, query, and notification tests pass. With explicit operator
  approval, live assignment `14290` on order `09480AD` was deleted and recreated
  for Carlos at quantity two with an August 30 due date. Authenticated worker QA
  confirms `Today`, Due Today count 1, no Past Due match, and both lifecycle
  notifications in Carlos's inbox.

## Production worker table alignment (2026-08-30)

- Worker tables derive sticky columns from their active column definition. The
  admin-only selection column is not reserved when it is absent from worker
  mode, and the same derived sticky layout is supplied to the header and body.
- Authenticated Due Today and Past Due checks confirm all seven visible header
  and row cells share identical horizontal positions and widths. The former
  50px Due Date displacement is eliminated without changing the admin checkbox
  column or mobile card layout.

## Review Queue Sidebar Pagination (2026-08-29)

- The canonical Review tab loads pending material reviews in bounded 20-row
  cursor pages instead of presenting the full queue as one document-length
  list.
- The standalone review sidebar has a viewport-aware fixed height, its own
  keyboard-focusable vertical scroll region, and overscroll containment. The
  selected material-review detail remains visible while an operator browses
  the queue.
- Scrolling near the bottom automatically requests the next page through the
  existing `nextCursor` contract. Embedded legacy uses of the shared panel keep
  their explicit Load more fallback because they do not own an internal scroll
  container.
- No API, database, permission, migration, or ADR contract changed; this reuses
  the existing material-review cursor query.

## Inline order material review and cross-session refresh (2026-08-30)

- Sales Overview's admin Production tab embeds the canonical pending-material
  review workflow above the order items. The panel is scoped by the open sales
  number, renders only when that order has a pending review, and reuses the
  existing permission-guarded decision mutation rather than adding a second
  approval path.
- The order-scoped panel renders only that order's reconciliation detail. It
  omits the pending-review queue because the surrounding Sales Overview already
  supplies the order context. The standalone Reviews workspace retains its
  searchable, paginated queue beside the selected review.
- Material evidence and manual availability selection share one flat checklist
  instead of repeating the same needs in summary and action cards. Each row
  includes the canonical production description (such as item type and size),
  readiness, and available/required quantities. Directly resolvable rows have an
  enabled checkbox; linked-inbound and already-resolved rows remain visible and
  read-only.
- Both inline and standalone review detail use one outer shadcn Card with flat
  divided sections. The standalone queue uses divided rows rather than a stack
  of nested cards.
- The review copy distinguishes a status recheck from an approval. `Recheck
  material status` may correctly remain pending; the resulting message directs
  the operator to receive linked inbound items or select independently verified
  needs before approval.
- Open assignment/submission ledgers listen for same-session production query
  events and use a bounded five-second refresh while mounted. The embedded
  review query uses the same bounded interval. This closes the different-browser
  gap between a worker submission, an admin decision, and the other user's open
  order without refreshing the entire page.
- The canonical decision still owns inventory evidence updates, final review
  state, production progress, payroll/completion effects, and direct worker
  notification. No database schema, API contract, permission rule, or durable
  architecture decision changed.

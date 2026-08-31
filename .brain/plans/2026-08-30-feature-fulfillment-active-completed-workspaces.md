# Fulfillment Active and Completed Workspaces

Status: Core implementation and the counted Due Today/Past Due extension were
completed on 2026-08-30. Canonical membership, server-owned paged section
filtering, reconciled counts, the counted due and Completed tabs,
section-aware date presentation, focused tests, and authenticated browser
verification are shipped in the working tree. The
read-only reconciliation report, telemetry, and optional rollout flag remain
deferred observability work and are not required for the initial no-migration
correctness release.

## Objective

Make the admin Fulfillment workspace tell one unambiguous operational story:
Backlog contains work that still needs dispatch planning, Active contains work
that has entered fulfillment and is not terminal, Completed contains fulfilled
dispatches, and All remains the audit view. Counts, rows, filters, pagination,
and mutation transitions must all use the same canonical lifecycle projection.

## Current Evidence

- The current tabs are Backlog, Active, All, Calendar, Drivers, and Exceptions.
- Active is implemented as every workspace stage except `fulfilled` and
  `cancelled`; that includes `ready_to_assign`, so unassigned records appear.
- The database query filters stored `OrderDelivery.status` before pagination,
  but the table later derives its displayed status from dispatch control data.
  In authenticated browser inspection, Active contained both Unassigned rows
  and rows displayed as Fulfilled.
- The Active count is also based on stored status plus driver id, not the same
  enriched lifecycle used by the rendered table. Count and membership can
  therefore disagree.
- Pickup dispatches intentionally have no driver, so a literal `driverId !=
  null` rule would make active pickups disappear unless the product contract
  explicitly handles them.

## Recommended Product Contract

### Tab order

1. Backlog
2. Active
3. Completed
4. All
5. Calendar
6. Drivers
7. Exceptions

Keep Backlog, Active, and Completed visible first on narrow screens. The full
desktop tab row may show all seven when space allows, with the existing adaptive
overflow as the fallback.

### Membership rules

- **Backlog:** orders that still require dispatch planning, plus any open
  delivery dispatch that exists but still needs assignment. The row should say
  whether a dispatch has not been created or has been created but is unassigned.
- **Active:** nonterminal dispatch work that is operationally assigned.
  - Delivery: a driver is assigned and canonical stage is `assigned`, `packing`,
    `packing_blocked`, `ready_to_load`, or `in_transit`.
  - Pickup: no driver is required, so an open pickup dispatch is Active once it
    has been created and scheduled/confirmed.
- **Completed:** canonical stage is `fulfilled`. Cancelled dispatches do not
  belong here.
- **All:** every non-deleted dispatch, including active, fulfilled, cancelled,
  and legacy records. This is the audit/recovery view, not the daily work queue.
- **Calendar:** scheduled non-deleted work. Terminal visibility should be an
  explicit calendar filter rather than an accidental consequence of stored
  status.

The pickup exception is the recommended interpretation of “assigned, not
completed.” Strictly requiring a driver for every Active row would orphan
pickups because Pickup deliberately disables driver assignment.

## Detailed Execution Plan

### Phase 1 — Establish one canonical section contract

1. Add `completed` to `dispatchWorkspaceSections` and its URL/parser schema.
2. Create one Sales-package section-membership helper that accepts the canonical
   lifecycle projection, driver id, delivery mode, and section.
3. Define Active and Completed only through this helper. Do not duplicate stage
   arrays in the page, table, summary, and API.
4. Add unit fixtures for assigned delivery, unassigned delivery, open pickup,
   fulfilled, cancelled, blocked packing, and in-transit records.
5. Decision gate: confirm that open pickups belong in Active. If product rejects
   that exception, add a dedicated Pickup/Needs assignment destination before
   removing them from Active.

Dependencies: existing lifecycle projection in
`packages/sales/src/dispatch-manifest/status.ts` and the deliberate pickup
driver lock in Split Desk.

Validation: each fixture belongs to exactly the intended lifecycle tab, except
All, which intentionally overlaps every dispatch state.

### Phase 2 — Make list filtering and counts use the same projection

1. Stop stripping `section` in the `dispatch.list` router. Pass it into the
   repository query as an authoritative workspace scope.
2. Replace the Active view's client-only `defaultFilters` contract with the
   server-owned section scope. User-selected stage filters should narrow the
   section but never broaden it.
3. Enrich candidates with dispatch control, compute the canonical lifecycle,
   apply section membership, and only then finalize the returned page.
4. Preserve full pages and correct cursors after projection filtering. Use a
   bounded candidate-scanning cursor for the first implementation: scan ordered
   records in chunks, enrich each chunk, collect 20 matching rows, and return
   the next scanned offset. Do not filter a pre-paginated 20-row page in the
   client.
5. Rework `workspaceSummary` to run the same lifecycle and membership helper.
   Return explicit `backlog`, `active`, `completed`, `all`, `openExceptions`,
   `overdue`, and `driverCount` totals.
6. Keep summary counts stable/global while a user searches the current table.
   Show a separate filtered result count if needed; do not silently change tab
   totals with local filters.
7. Cache the canonical summary briefly and invalidate it after assignment,
   packing, trip, completion, cancellation, restore, and delete mutations.

Dependencies: Phase 1 contract; existing `withDispatchListControl` projection.

Validation:

- A stored `packed` row projected as fulfilled appears in Completed, never
  Active.
- An unassigned delivery does not appear in Active.
- An open pickup remains discoverable under the approved pickup rule.
- Tab counts equal the exact number of records returned by the corresponding
  unfiltered section.
- Infinite scroll has no duplicates, missing rows, or short intermediary pages.

Performance decision: ship the bounded scan first because it requires no schema
migration. Record candidate-to-match ratio and query duration. Add a persisted,
indexed workspace-stage projection only if p95 list/summary latency misses the
agreed budget; do not introduce that migration preemptively.

### Phase 3 — Add the Completed workspace without redesigning the page

1. Add Completed after Active in `dispatchAdminPageTabs`.
2. Add its count from `workspaceSummary.completed` and increase desktop
   visibility to seven tabs where the row fits. Preserve the current adaptive
   overflow on smaller widths.
3. Add `DispatchCompletedView` using the existing table/card design and shared
   header; do not create a new visual system.
4. Add the Completed branch to the server prefetch and workspace client.
5. Give every section a purpose-specific empty state:
   - Active: “No assigned dispatches are currently in progress.”
   - Completed: “No completed dispatches match these filters.”
   - Backlog: retain the planning/create-dispatch guidance.
6. Preserve Sales Overview opening behavior from every row and retain the
   applicable Preview/Packing List actions.

Dependencies: Phase 2 API scope and count.

Validation: direct URLs, browser back/forward, refresh, copied links, and tab
selection all restore the correct workspace.

### Phase 4 — Make controls and columns section-aware

1. Active defaults to schedule ascending, with overdue dates rendered in red as
   they are today. It keeps Schedule, Order/customer, Destination, Driver,
   Packing, Invoice, Status, and Actions.
2. Completed defaults to completion time descending. Add `deliveredAt` to the
   list projection and render a Completed column; retain scheduled date as
   secondary context or an optional column.
3. All defaults to newest operational change first and retains the complete
   audit-oriented column set.
4. Remove the unconditional `query.sort = ["dueDate", "createdAt"]` override.
   Resolve a safe default per section while respecting explicit supported user
   sorts.
5. Narrow filters by section:
   - Active: search, active sub-stage, schedule, mode, driver, risk.
   - Completed: search, completion range, mode, driver, invoice/payment.
   - All: full stage/status, schedule, mode, driver, risk where meaningful.
   - Backlog: planning-specific search, created/due date, delivery mode, order
     status, and invoice/payment.
6. Clear incompatible hidden filters when changing sections, but preserve
   shared search, driver, and delivery-mode filters when doing so is predictable.
7. Add `openExceptions` as the Exceptions tab count because it is actionable.

Dependencies: section-aware list input and completion timestamp.

Validation: no hidden filter can make a newly selected tab appear empty without
visible explanation; each sort order is deterministic with an id tie-breaker.

### Phase 5 — Keep records moving between tabs correctly

1. Centralize query invalidation for workspace list sections and summary.
2. After assignment, an eligible delivery leaves Backlog and enters Active.
3. After completion, the row leaves Active and enters Completed immediately;
   its counts change in the same refresh cycle.
4. After cancellation, the row leaves Active and remains available in All.
5. After reopening/restoring where allowed, recalculate membership from the
   canonical projection instead of manually moving client rows.
6. Preserve permissions: users without order-edit authority see payment and
   operational facts but cannot mutate them. Terminal rows expose only actions
   permitted by existing lifecycle and permission guards.

Dependencies: existing query-event/invalidation registry and dispatch mutation
guards.

Validation: mutation integration tests assert old-tab removal, new-tab
appearance, and count reconciliation without a full page reload.

### Phase 6 — Regression, browser, and data-quality validation

1. Domain tests for every section membership rule and pickup edge case.
2. API tests proving filtering happens before final pagination and counts use
   the same authority.
3. Regression fixtures for raw/effective status disagreement, including raw
   `packed` plus canonically fulfilled controls.
4. UI contract tests for tab order, counts, Completed routing, empty states,
   section-aware columns, and adaptive overflow.
5. Authenticated browser QA at desktop, tablet, and mobile widths:
   - verify tab visibility/overflow;
   - compare representative Active and Completed rows;
   - exercise search, driver, schedule/completion filters, sorting, infinite
     scroll, row opening, back/forward, and refresh;
   - complete or reassign a safe test dispatch and verify live tab movement;
   - confirm no runtime errors or horizontal overflow.
6. Run a read-only reconciliation report showing raw stored status, canonical
   effective status, assigned driver, delivery mode, and expected section. Use
   it to quantify legacy mismatches before rollout; do not mutate records as
   part of the report.

### Phase 7 — Rollout and observability

1. Release the canonical scope behind a temporary Fulfillment workspace flag if
   the reconciliation report finds a large legacy mismatch.
2. Log list duration, candidate rows scanned, rows returned, and count duration
   without customer-sensitive fields.
3. Compare old Active count, new Active count, Completed count, and orphaned
   records in development/preview before full cutover.
4. Define orphaned as a nonterminal record in neither Backlog nor Active. The
   acceptable post-cutover value is zero.
5. Remove the old `activeDispatchStages` client preset after parity and browser
   acceptance pass.

## Acceptance Criteria

- Completed is a first-class counted tab beside Active.
- Active never renders a canonically fulfilled or cancelled dispatch.
- Active does not render an unassigned delivery; open pickups follow the
  approved explicit rule.
- Completed contains fulfilled dispatches and excludes cancelled records.
- All remains a complete non-deleted audit view.
- Counts, filters, pagination, export, and visible rows agree on membership.
- Assignment and completion move rows and counts without manual refresh.
- No existing packing, Sales Overview, payment visibility, inventory,
  permission, calendar, driver, or exception workflow regresses.
- No database migration is required for the initial correctness release.

## Risks and Mitigations

- **Pickup disappears from daily work:** encode and test the pickup exception
  before enforcing driver assignment.
- **Projection filtering causes slow pages:** use bounded scanning, measure
  candidate-to-match ratio, cache the summary, and add a stored projection only
  when measured latency requires it.
- **Counts disagree during mutations:** use one section helper and centralized
  invalidation rather than independent UI math.
- **Legacy status drift:** ship a read-only reconciliation report and retain All
  as the recovery/audit workspace.
- **Hidden filters make tabs look empty:** make filters section-aware and clear
  incompatible values on navigation.
- **Terminal records become editable:** retain existing permission and
  lifecycle guards and reduce Completed actions to explicitly allowed commands.

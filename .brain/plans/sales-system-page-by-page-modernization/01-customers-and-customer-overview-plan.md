# Plan: Sales Customers And Customer Overview Modernization

## Type
Feature Modernization

## Status
Active - Documentation And Baseline

## Sequence
01

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Modernize `/sales-book/customers` and Customer Overview together as the first
monitored sales-system page group. Improve clarity, responsiveness, speed, and
task flow without changing unrelated sales pages or replacing working customer
contracts prematurely.

## Monitoring Rule
Every phase below is a separate review boundary. Do not combine phases into one
implementation batch. After each phase:

1. Summarize the exact files and behavior changed.
2. Run the phase-specific tests.
3. Validate desktop and mobile in the authenticated browser.
4. Record screenshots or concrete visual observations.
5. Update Brain completion evidence.
6. Pause for operator inspection before the next phase.

## Current Routes And Surfaces
- Canonical directory: `/sales-book/customers`
- Compatibility directory: `/sales-book/customers/v2`
- Current full detail route: `/sales-book/customers/v2/[accountNo]`
- Customer Overview side sheet:
  `apps/dashboard/src/components/sheets/customer-overview-sheet/*`
- Shared V2 overview content:
  `apps/dashboard/src/components/customer-v2/customer-overview-v2-content.tsx`
- Customer table:
  `apps/dashboard/src/components/tables-2/customers/*`
- Existing detail query: `customers.getCustomerOverviewV2`
- Existing directory query: `sales.customersIndex`

## Baseline Observations
- The canonical customer table already uses the restarted `tables-2` standard,
  cursor loading, compact rows, sticky columns, persisted settings, and
  table-owned scrolling.
- The default table prioritizes contact information and partnership state but
  does not provide an at-a-glance customer-health summary.
- Customer Overview exists as both a sheet and a V2 full page.
- Legacy and V2 overview components still overlap.
- The current overview payload supports many tabs and actions but is large and
  tightly coupled.
- On a narrow viewport, the Customer Overview hero, actions, tabs, and summary
  cards do not adapt cleanly; content clips or becomes excessively tall.
- Customer directory mobile behavior is usable through table-owned horizontal
  scrolling, but the page header and actions need deliberate mobile treatment.

## Product Outcome

### Customer Directory
The page should answer:
- Who is this customer?
- How can staff contact them?
- Where are they located?
- Are they active, new, dormant, overdue, or otherwise worth attention?
- What is the fastest safe next action?

Recommended page structure:
1. Compact page header
2. Optional actionable summary row
3. Search/filter/saved-view toolbar
4. Customer table
5. URL-addressable Customer Overview

Recommended default columns:
- Customer
- Primary contact
- Location
- Open balance
- Last sale
- Lifecycle/account state
- Actions

Partnership/dealer state should remain available as an optional column, saved
view, badge, or detail attribute. Final default columns require operator review
before implementation.

### Customer Overview
One customer-detail composition should power both side-sheet and full-page
presentation.

Recommended tabs:
- Overview
- Orders
- Quotes
- Finance
- Activity
- Addresses

Recommended primary actions:
- Edit customer
- Create order
- Create quote
- Open receivables
- Send/download statement
- Partnership invitation when permitted

Desktop should use a bounded side sheet for fast directory review. Mobile
should use a full-screen detail presentation with a sticky header, safe-area
actions, and a horizontally scrollable tab strip. The shareable full-page route
should reuse the same content instead of maintaining a second feature.

## URL Contract Direction
The final contract should use explicit customer-owned parameters:
- `customerId`
- `customerMode=details|create|edit`
- `customerTab=overview|orders|quotes|finance|activity|addresses`

Existing `viewCustomer`, `accountNo`, `tab`, and customer-form parameters must
remain compatible until route and browser parity are proven. Do not remove or
rename them in an early visual slice.

## Data And Performance Direction
- Keep `sales.customersIndex` as the initial directory contract unless a
  measured blocker requires a query change.
- Prefetch only directory list and summary data required above the fold.
- Open Customer Overview from cached row identity where possible.
- Split or lazily consume overview data by active tab before removing the
  existing aggregate query.
- Inactive tabs should make no network request.
- Filters and search remain server-backed and URL-owned.
- Customer mutation completion must refresh directory, overview, sales-form,
  and Sales Overview projections through the existing query-event system.
- No schema change is expected for the first visual and responsive phases.

## Permissions
- Read, edit, partnership, payment, statement, and sales-creation actions must
  remain capability-aware.
- Dealer-owned or otherwise read-only customers must remain protected by the
  server.
- UI gating is not an authorization boundary.
- Financial and partnership data must not appear for users without the
  corresponding permissions.

## Incremental Phases

### C0 - Baseline And Acceptance Map
Status: Active

- Record the existing directory, sheet, full-page route, queries, URL
  parameters, actions, permissions, responsive behavior, and loading behavior.
- Define representative customer fixtures: active, new, no-address,
  outstanding balance, dealer/partnership, read-only, and no-sales customer.
- Capture desktop `1440x900`, mobile `390x844`, loading, empty, filtered-empty,
  error, and long-content states.
- Agree on the exact first visible change before editing UI.

Acceptance:
- Baseline evidence is reproducible.
- No implementation code changes.
- The first implementation slice is narrow and observable.

### C1 - Customer Page Shell And Mobile Header
Status: Proposed

- Refine only title, subtitle, primary action placement, spacing, and mobile
  header behavior.
- Keep the table, query, filter, columns, and overview behavior unchanged.
- Ensure search and create actions remain visible without header collision.

Acceptance:
- No document-level overflow at `390x844`.
- Desktop table position and usable height do not regress.
- Existing customer search/create behavior is unchanged.

### C2 - Directory Information And Toolbar
Status: Proposed

- Review default columns with the operator.
- Add only approved lifecycle, balance, or last-sale projections.
- Keep partnership available without letting it dominate the default table.
- Add summary cards only if their metrics lead to a real operator action.
- Reuse the current table core; do not modify
  `components/tables-2/core/*`.

Acceptance:
- Default rows answer customer identity, contact, location, commercial state,
  and next action without opening the overview.
- Search, filters, resizing, visibility, ordering, infinite loading, and row
  opening retain parity.

### C3 - Customer Overview Responsive Shell
Status: Proposed

- Consolidate the sheet header, hero, action placement, tab navigation, and
  mobile full-screen behavior.
- Keep existing tab data and business actions unchanged.
- Ensure the detail surface can be closed, reopened, deep-linked, and navigated
  with browser back/forward.

Acceptance:
- Header, actions, and tabs do not clip at `390x844`.
- Desktop sheet remains bounded and keeps the directory mounted.
- Opening the overview does not trigger unrelated tab queries.

### C4 - Overview Content And Lazy Tabs
Status: Proposed

- Make Overview a concise summary rather than a stack of oversized cards.
- Move Orders, Quotes, Finance, Activity, and Addresses into clear tab
  ownership.
- Load only active-tab data.
- Preserve restarted embedded table modules where they still fit the design.

Acceptance:
- Initial sheet payload and query count are measured and improved.
- Inactive tabs issue zero requests.
- Existing order, quote, payment, transaction, partnership, and address actions
  remain available to permitted users.

### C5 - Create, Edit, And Cross-Sales Actions
Status: Proposed

- Use one customer create/edit surface.
- Preserve the difference between changing the customer on a sale and editing
  the customer record.
- Add create-order/create-quote actions with the current customer preselected.
- Verify typed invalidation refreshes all customer projections.

Acceptance:
- Saving an edit updates directory and overview without manual reload.
- Editing a customer does not silently change a sale's assigned customer,
  pricing profile, totals, payments, production, or inventory.
- Unauthorized and read-only cases fail on the server.

### C6 - Full-Page Route Consolidation
Status: Proposed

- Reuse the same content for sheet and shareable full-page detail.
- Decide the final non-V2 route only after parity evidence.
- Add compatibility redirects without removing old links prematurely.

Acceptance:
- Sheet and full-page customer behavior do not drift.
- Existing deep links and query parameters continue to resolve.
- Any route retirement requires usage evidence and explicit approval.

### C7 - Cleanup And Completion
Status: Proposed

- Remove only components and contracts proven unused.
- Update feature, API, permission, task, and progress documents.
- Record final performance, accessibility, responsive, and operator acceptance
  evidence.

Acceptance:
- Focused tests, typecheck, formatting, browser validation, and static import
  scans pass.
- Legacy removal has explicit evidence.
- The operator accepts Customers and Customer Overview before another sales
  page becomes active.

## Likely File Areas
- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/customers/page.tsx`
- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/customers/v2/*`
- `apps/dashboard/src/components/customer-header.tsx`
- `apps/dashboard/src/components/customer-search-filter.tsx`
- `apps/dashboard/src/components/tables-2/customers/*`
- `apps/dashboard/src/components/customer-v2/customer-overview-v2-content.tsx`
- `apps/dashboard/src/components/sheets/customer-overview-sheet/*`
- `apps/dashboard/src/components/sheets/customer-create-sheet.tsx`
- `apps/dashboard/src/hooks/use-customer-overview-query.ts`
- `apps/dashboard/src/hooks/use-customer-filter-params.ts`
- `apps/dashboard/src/hooks/use-create-customer-params.ts`
- `apps/dashboard/src/lib/query-events/*`
- `apps/api/src/trpc/routers/customer.route.ts`
- `apps/api/src/db/queries/customer.ts`

## Testing Plan
- Existing customer table migration-parity tests
- URL/filter/sort regression tests
- Customer overview tab and action tests
- Query-event invalidation tests
- Customer edit ownership/permission tests
- Desktop and mobile authenticated browser scenarios
- Empty, filtered-empty, loading, error, long-name, missing-address, and
  read-only fixtures
- Browser back/forward and sheet reopen checks
- Query-count and initial-payload comparison for overview changes

## Non-Goals
- Rebuilding the global sidebar
- Changing orders, quotes, finance, production, packing, or dispatch UI
- Renaming broad shared table components
- Adding unrelated database schema
- Removing V2/legacy routes before parity
- Starting the next sales page automatically

## TODO
- Confirm whether the final Customer Overview should be primarily a sheet with
  a shareable full-page route, or primarily a full page with a quick-view
  sheet.
- Approve the final default customer columns before C2.
- Approve whether summary cards provide enough operational value to add.
- Select the exact C1 visual change after baseline review.

## Related Brain Documents
- `.brain/features/sales-customers-table.md`
- `.brain/features/sales-customer-editing.md`
- `.brain/features/dealership-customer-overview.md`
- `.brain/features/dealership-program-recruitment.md`
- `.brain/features/query-invalidation-events.md`
- `.brain/plans/2026-07-23-bug-fix-sales-customer-editing-from-form-and-overview.md`
- `.brain/plans/sales-system-page-by-page-modernization/map.md`

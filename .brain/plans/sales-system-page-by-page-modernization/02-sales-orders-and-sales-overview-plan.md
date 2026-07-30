# Plan: Sales Orders And Sales Overview Modernization

## Type
Feature Modernization

## Status
Deferred - Activate Only After Sequence 01 Acceptance

## Sequence
02

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Make `/sales-book/orders` the fast, dependable workspace for finding and
operating sales orders, with one coherent Sales Overview composition for
quick-view sheets and shareable detail surfaces.

## Activation Gate
- Sequence 01 has operator acceptance and completion evidence.
- The operator explicitly activates Sequence 02.
- Customer URL, sheet, responsive, and review-boundary lessons are recorded.
- Existing order and Sales Overview behavior has a reproducible baseline.

## Current Context
- Canonical orders route: `/sales-book/orders`
- Compatibility route: `/sales-book/orders/v2`
- Deleted view: `/sales-book/orders/bin`
- Create/edit routes live under the sales-book form route group.
- The canonical table already uses the newer `tables-2/sales-orders` standard,
  route prefetch, summary data, URL filters, virtualization, persisted columns,
  and row-open behavior.
- Sales Overview has current, V2, and compatibility implementations with shared
  business actions but remaining composition overlap.

## Intended Experience

### Orders Page
- Compact page header with `New order` as the primary action.
- Actionable summary metrics rather than lifetime totals.
- Stable views for active work, attention-required work, completed work, and
  explicitly requested deleted records.
- One toolbar for search, filters, saved views, columns, and exports.
- Default columns should expose order identity, customer, value, payment,
  fulfillment readiness, owner, age/due state, and actions.
- Managerial desktop uses the virtualized table; narrow screens keep table-owned
  scrolling or use an operator-approved summary-card representation.

### Sales Overview
Recommended tabs:
- Overview
- Items
- Payments
- Production
- Fulfillment
- Documents
- Activity

The same content should power quick-view and shareable detail presentation.
Only the active tab should load. Actions must remain permission-aware and must
not silently change payment, production, inventory, or document state.

## URL Direction
- `orderId`
- `orderMode=details|create|edit`
- `orderTab=overview|items|payments|production|fulfillment|documents|activity`
- Shared list parameters: `q`, `status`, `owner`, `dateFrom`, `dateTo`, `view`,
  and `sort`

Existing URL contracts remain compatible until browser and usage parity pass.

## Incremental Phases

### O0 - Baseline And Contract Map
- Inventory routes, statuses, filters, summary queries, row actions, Sales
  Overview variants, permissions, and form handoffs.
- Record desktop/mobile, loading, empty, error, long-order, partially paid,
  blocked-production, and mixed-fulfillment fixtures.

### O1 - Page Shell And Responsive Header
- Change only title, summary placement, action hierarchy, spacing, and mobile
  header behavior.
- Preserve current table/query/filter behavior.

### O2 - Order Views, Columns, And Filters
- Approve the default columns and actionable summaries.
- Align status language without changing domain transitions.
- Add saved views only after the filter contract is stable.

### O3 - Sales Overview Shell
- Consolidate open/close, header, tabs, responsive width, back/forward, and
  cached-row placeholder behavior.
- Keep business tab content and actions unchanged.

### O4 - Overview Content And Lazy Data
- Give each tab clear ownership.
- Prefetch the compact overview only; load inactive tabs on demand.
- Preserve current embedded restarted tables where appropriate.

### O5 - Actions And Form Handoffs
- Verify edit, duplicate, payment, production, fulfillment, message, document,
  cancel, restore, and delete behavior.
- Preserve draft recovery and explicit confirmation for destructive actions.

### O6 - Compatibility And Cleanup
- Consolidate only proven duplicate overview components.
- Retire V2/legacy routes only with usage evidence and explicit approval.

## Data And Permission Direction
- Keep list, summary, and detail queries separate.
- Default list size stays bounded and cursor-paginated.
- Preserve server authority for order totals, payments, production readiness,
  fulfillment, ownership, soft-delete visibility, and office scope.
- Mutations publish narrow query invalidation events rather than broad cache
  resets.

## Likely File Areas
- `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/orders/*`
- `apps/dashboard/src/components/sales-orders-v2-header.tsx`
- `apps/dashboard/src/components/tables-2/sales-orders/*`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/*`
- `apps/dashboard/src/components/sales-overview-system/*`
- `apps/dashboard/src/hooks/use-sales-overview-*`
- `apps/dashboard/src/hooks/use-sales-filter-params.ts`
- `apps/api/src/trpc/routers/sales.route.ts`
- `apps/api/src/db/queries/sales.ts`
- `packages/sales/src/control/*`

## Validation
- Orders migration-parity and URL-filter tests
- Sales Overview tab/action/permission tests
- Form handoff and autosave/recovery tests
- Payment, production, fulfillment, document, and invalidation regressions
- Authenticated desktop/mobile browser validation
- Query-count, first-payload, sheet-open, and large-list measurements

## Non-Goals
- Rebuilding Quotes, Production, Packing, Dispatch, or Finance
- Changing fulfillment state ownership
- Broad `tables-2/core` changes
- Removing compatibility routes before parity

## TODO
- Approve actionable order summary metrics.
- Decide whether deleted orders remain a dedicated URL or a guarded page view.
- Select the canonical shareable Sales Overview route after baseline evidence.

## Completion Gate
Orders and Sales Overview require operator acceptance before Sequence 03 can be
activated.

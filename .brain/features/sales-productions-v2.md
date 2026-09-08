# Sales Productions V2

## Purpose
Tracks the promoted sales production board used by admins for production queue oversight.

## Current Behavior
- `/sales-book/productions` is the canonical admin production workspace.
- `/sales-book/productions/v2` is a query-preserving compatibility redirect to
  the canonical route.
- Sidebar and Sales Book navigation link directly to the canonical route.
- The old dedicated v2 board is no longer mounted by either admin route.
- The canonical page uses the Sales Finance workspace system with PageTabs
  ordered Due Today, Calendar, Active, Past Due, Review, and Completed. Calendar
  replaces the former Table/Calendar toolbar control and Active returns to the
  table queue. The calendar matches the Fulfillment workflow with URL-backed
  Week/Month navigation, a centered clickable period picker, inline
  status-colored order cards, overflow popovers, and an Unscheduled section.
  Week selection offers ten periods before and after the current anchor; Month
  selection offers four periods before and after. Same-order/day assignments
  collapse into one card with an assignment count, and every card opens Sales
  Overview on the Production tab.

## Implementation Notes
- The canonical list uses `sales.productions`, bounded production calendar
  scheduled/unscheduled rows, and
  `components/tables-2/sales-production`.
- The old `packages/sales/src/production-v2` read-model contracts remain only
  for unremoved legacy consumers and production-detail/action reference.
- Do not restore the global redirect-engine rule from productions to v2.

## Production receipt and status behavior (2026-09-08)

The Production tab now shows pending inbound references and suppliers with Open
inbound / Mark as received. This supersedes the embedded review/checklist above.
The section disappears when no pending physical receipts remain. Other material
operations stay in Inventory or the standalone review workspace. Decision note
is removed from material-review forms; the server generates action/actor audit.

Workers use a default-off Sales setting and a dedicated assigned-material query
and receipt command. Their Inventory tab is restricted to that scope. Receiving
atomically applies physical stock to Needs, validates allocation capacity, records
an audit and persists the refreshed order projection. Both Inventory and pipeline
queries refresh before successful UI feedback. Receipt does not approve existing
production submissions or payroll; those reviews retain their existing workflow.

Item badges show reported quantities and review pending explicitly. Submission
supersedes plain Assigned except a real partial staffing gap. Any submitted or
finalized quantity hides Material Ready; actual blockers remain. Missing commercial
metadata does not erase a known current canonical Production stage.

Validated with domain/API/component tests, real concurrent local transactions,
and an authenticated disposable-order receipt. See the
[task](../tasks/2026-09-08-production-status-and-worker-inbound-receipt.md) for exact
coverage and baseline typecheck limitations. Retained cancellation/reconciliation
and separate primary/secondary attention presentation remain a queued follow-up.

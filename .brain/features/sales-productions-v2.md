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

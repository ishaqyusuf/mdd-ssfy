# Sales Productions V2

## Purpose
Tracks the promoted sales production board used by admins for production queue oversight.

## Current Behavior
- `/sales-book/productions` is the canonical admin production workspace.
- `/sales-book/productions/v2` is a query-preserving compatibility redirect to
  the canonical route.
- Sidebar and Sales Book navigation link directly to the canonical route.
- The old dedicated v2 board is no longer mounted by either admin route.
- The canonical page uses the Sales Finance workspace system with Active,
  Review, and Completed PageTabs plus a Table/Calendar display control for the
  Active queue.

## Implementation Notes
- The canonical list uses `sales.productions`, bounded summary/calendar
  queries, and `components/tables-2/sales-production`.
- The old `packages/sales/src/production-v2` read-model contracts remain only
  for unremoved legacy consumers and production-detail/action reference.
- Do not restore the global redirect-engine rule from productions to v2.

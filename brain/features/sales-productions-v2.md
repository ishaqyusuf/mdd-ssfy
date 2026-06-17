# Sales Productions V2

## Purpose
Tracks the promoted sales production board used by admins for production queue oversight.

## Current Behavior
- `/sales-book/productions/v2` is the canonical sales production board route.
- `/sales-book/productions` is a compatibility redirect to `/sales-book/productions/v2` and preserves query params.
- Sales tabs and sales-book tab summary links route directly to `/sales-book/productions/v2`.
- The board title is `Production Board`; the v2 suffix is no longer shown in the page title.
- The board header keeps search, status, and priority controls in a row on wider screens to reduce header height.
- The right rail calendar is labeled `Calendar` and no longer includes the old compact date-picker description or Current Focus mini-card, leaving more room for the queue snapshot.
- Production order summary trigger areas show pointer cursor, hover/focus treatment, and a parent collapsed-header background change so operators can tell the order card summary is clickable without tinting the expanded overview.

## Implementation Notes
- The board still uses `packages/sales/src/production-v2` read-model contracts through `trpc.sales.productionsV2` and `trpc.sales.productionDashboardV2`.
- The legacy `ProductionWorkspace` route implementation is no longer mounted from `/sales-book/productions`.

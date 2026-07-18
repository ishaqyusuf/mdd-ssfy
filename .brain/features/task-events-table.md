# Task Events Table

## Purpose
The task events dashboard at `/task-events` lists scheduled/background task events with their status, latest run time, latest record count, and latest run result. It is the list entry point for opening an individual task event detail page.

## Current Implementation
- Route: `apps/www/src/app/(sidebar)/task-events/page.tsx`
- Dashboard component: `apps/www/src/app/(sidebar)/task-events/_components/task-events-dashboard.tsx`
- Table module: `apps/www/src/components/tables-2/task-events/*`
- Data source: existing `trpc.taskEvents.list.queryOptions()`
- The route uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("task-events")`.
- The dashboard uses `useSuspenseQuery` for the task event list, keeps the local title/description/event-name/status search, and renders the restarted `tables-2/task-events` table instead of a card-mapped list.
- The table uses the `tables-2` core primitives through a domain table module, with no changes to `components/tables-2/core`.

## Table Behavior
- Compact row styling is registered through `TABLE_CONFIGS["task-events"]`.
- Columns are content-tailored:
  - Event: `260/520/340`, sticky
  - Status: `104/150/118`
  - Last Run: `150/240/170`
  - Records: `108/150/124`, right-aligned
  - Latest Result: `220/420/280`
  - Actions: `96/128/108`, sticky right
- Row height is `64px`.
- The table owns vertical and horizontal scroll, virtual rows, draggable headers, resize handles, persisted visibility/sizing/order, and column divider settings.
- The dashboard keeps the refresh action, column visibility control, search input, and Task Diagnostics link above the table.

## Preserved Behavior
- Existing task event list data contract is unchanged.
- Existing search behavior is preserved client-side across task title, description, event name, and status.
- The Open action still routes to `/task-events/[eventName]`.
- The Task Diagnostics link still opens `/task-events/diagnostics`.

## Validation
- Focused parity test: `bun test apps/www/src/components/tables-2/task-events/migration-parity.test.ts`
- Full restarted table suite: `bun test apps/www/src/components/tables-2`
- Targeted Biome check over the route, dashboard component, table module, and table registry.
- Broad `@gnd/www` typecheck still exits on unrelated baseline errors, but the touched-file grep reported no diagnostics for this slice.
- Static scans found no card-mapped list, old manual fetch, raw table, `PageStickyHeader`, or legacy data-table usage in the task events route/dashboard/table surface.
- `git diff --check` passed.
- `apps/www/src/components/tables-2/core` has no diff.
- Runtime route smoke did not complete locally because both the HTTPS proxy and direct HTTP dev-server URL timed out after 20s with no bytes.

# Task Event History Table

## Purpose
The task event detail route at `/task-events/[eventName]` shows schedule configuration, run controls, and recent `ScheduleHistory` rows for a selected task event.

## Current Implementation
- Route: `apps/www/src/app/(sidebar)/task-events/[eventName]/page.tsx`
- Detail component: `apps/www/src/app/(sidebar)/task-events/_components/task-event-detail.tsx`
- Table module: `apps/www/src/components/tables-2/task-event-history/*`
- Data source: existing `trpc.taskEvents.history.queryOptions({ eventName })`
- The route uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("task-event-history")`.
- The history table uses the `tables-2` core primitives through a domain table module, with no changes to `components/tables-2/core`.

## Table Behavior
- Compact row styling is registered through `TABLE_CONFIGS["task-event-history"]`.
- Columns are content-tailored:
  - Time: `136/210/156`, sticky
  - Value: `72/112/84`
  - Trigger: `96/150/112`
  - Meta: `300/700/460`
- Row height is `112px`; the meta cell keeps a bounded multi-line preview with tighter spacing and clipped recipient/skipped-sales sections so the history remains readable without oversized rows.
- The table owns vertical and horizontal scroll, virtual rows, draggable headers, resize handles, persisted visibility/sizing/order, and column divider settings.
- The local column visibility control is rendered above the run-history table.

## Preserved Behavior
- Existing task event status/configuration save behavior is unchanged.
- Existing Run Test, Run Now, and manual payment-report run behavior is unchanged.
- Existing task event list invalidation after saves and terminal runs is preserved.
- Existing `SearchFilter` usage for sales-order-backed task filters is unchanged; filter metadata can still load client-side through its existing tRPC route.

## Validation
- Focused parity test: `bun test apps/www/src/components/tables-2/task-event-history/migration-parity.test.ts`
- Full restarted table suite: `bun test apps/www/src/components/tables-2`
- Targeted Biome check over the route, detail component, table module, and table registry.
- Broad `@gnd/www` typecheck still exits on unrelated baseline errors, but the touched-file grep reported no diagnostics for this slice.
- Static scans found no raw table/manual fetch usage in the task event detail route/detail component.
- `git diff --check` passed.
- `apps/www/src/components/tables-2/core` has no diff.
- 2026-07-17 density validation:
  - Focused parity test passed with 3 tests / 37 assertions.
  - Full `apps/www/src/components/tables-2` suite passed with 305 tests / 2529 assertions.
  - Browser proof on `/task-events/sales-daily-payment-report-schedule` confirmed `112px` rows, `45px` header, table-owned vertical scroll (`scrollTop 0 -> 600`, `scrollHeight 2355`, `clientHeight 259`), no document-level horizontal overflow, and screenshot evidence at `/private/tmp/gnd-task-event-history-table.jpg`.
  - Narrow viewport proof at `760px` confirmed table-owned horizontal and vertical scroll (`scrollWidth 814`, `clientWidth 661`, `scrollLeft 0 -> 153`, `scrollTop 0 -> 600`) with no document-level horizontal overflow; screenshot evidence is at `/private/tmp/gnd-task-event-history-table-narrow.jpg`.

# Contractor Jobs Table

## Status
Validated restarted Sales Orders parity migration slice, 2026-07-16.

The `/hrm/contractors/jobs` route now renders through `apps/www/src/components/tables-2/contractor-jobs/*` while preserving the existing jobs query, filter params, KPI widget, job settings sheet, and open-job sheet behavior.

## Behavior
- The route follows the canonical Sales Orders shell: `PageShell`, `HydrateClient`, `ScrollableContent`, `PageTitle`, `JobHeader`, `JobsKpiWidget`, `ErrorBoundary`, `Suspense`, and table.
- Server hydration uses `batchPrefetch` for `jobs.getJobs`; table settings hydrate from `getInitialTableSettings("contractor-jobs")`.
- The table consumes the shared `tables-2/core` primitives directly: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky columns, persisted sizing/order/visibility/dividers, infinite scroll, selection, bottom bar, and the header-offset spacer.
- `TABLE_CONFIGS["contractor-jobs"]` owns the 64px compact row height. Contractor Jobs sorting is intentionally not wired yet because `getJobsSchema` does not currently expose a sort contract.
- The existing `JobHeader` remains the page header, with shared saved page tabs supplied by the search/filter surface and the Contractor Jobs column-visibility/divider control beside settings and create actions. The obsolete hard-coded `All Jobs` / `Custom Jobs` button strip has been removed so the page has one tab system.
- Row behavior is preserved: normal cell clicks open `openJobId`, status/action cells remain non-clickable, row actions preserve approve/reject/edit/delete/status workflows, and selected rows expose the print/review bottom bar.
- Project Overview Jobs embeds reuse `tables-2/contractor-jobs` through `embedded`, `defaultFilters.projectId`, and exported `projectTabColumns`; embedded mode keeps table-owned scroll/DnD/resize/persisted settings but hides the bottom bar so the tab behaves as a compact project-scoped list.
- `/jobs-dashboard/jobs-list` reuses the same restarted table with worker-scoped `defaultFilters.userId`, server `batchPrefetch`, `getInitialTableSettings("contractor-jobs")`, `ScrollableContent`, and a compact `workerDashboardColumns` set. The dashboard keeps the guarded `Submit Job` empty-state action while staying off the legacy contractor jobs table and legacy skeleton.
- The Job Overview modal scope section now uses `apps/www/src/components/tables-2/job-scope/*` for non-custom job tasks instead of the old `@gnd/ui/namespace` table. The embedded scope table preserves title/rate/qty/maxQty/total display while using compact 48px table-core rows, a sticky Task column, table-owned scroll, DnD, resize, dividers, virtual rows, and persisted settings.
- The New Job modal install task list now uses `apps/www/src/components/tables-2/new-job-install-tasks/*` instead of an embedded raw `<table>`. The embedded quantity table preserves builder-task gating, missing-task fallback, `job.tasks.${index}.qty` form binding, admin-only max constraints, zero-max disabled state, validation errors, quantity suffixes, and live totals while using compact 56px table-core rows, a sticky Item column, table-owned scroll, DnD, resize, dividers, virtual rows, persisted settings, and Rate/Total columns that are forcibly hidden unless task quantity details are allowed.

## Constraints Preserved
- No custom shared page-header abstraction is used.
- `apps/www/src/components/tables-2/core/*` remains unchanged.
- The existing jobs API/query/filter contracts are reused.
- Old table imports are not used by the route.
- The old `apps/www/src/components/tables/contractor-jobs/*` files were removed on 2026-07-17 after import scans confirmed there were no live source consumers outside Brain notes and negative audit assertions.

## Validation
- `bun test apps/www/src/components/tables-2/contractor-jobs/migration-parity.test.ts` passed with 4 tests / 31 assertions.
- Targeted Biome passed for the Contractor Jobs route/header/table/settings files.
- HTTP SSR smoke for `/hrm/contractors/jobs` returned `200` with Job markers and no sampled app-error/login markers.
- Static scans confirmed the route/table/header do not import `PageStickyHeader`, `components/tables/contractor-jobs`, `@gnd/ui/data-table`, or `fetchInfiniteQuery`; only the parity test assertion strings mention the old patterns.
- Project Overview embed validation on 2026-07-16 confirmed `components/widgets/project-overview/index.tsx` imports `tables-2/contractor-jobs` instead of the legacy contractor-jobs table; the full restarted parity suite passed with 57 tests / 480 assertions.
- Worker jobs dashboard validation on 2026-07-16 confirmed `/jobs-dashboard/jobs-list` imports `tables-2/contractor-jobs`, uses compact worker columns, preserves guarded job submission, and has no live legacy contractor-jobs table/fetch imports. Focused contractor/audit tests passed with 8 tests / 48 assertions; the full restarted parity suite passed with 58 tests / 491 assertions; targeted Biome, filtered touched-file typecheck, `git diff --check`, and a route HEAD smoke all passed.
- Job Overview scope validation on 2026-07-17 confirmed `job-scope.tsx` no longer renders the namespace table; focused job-scope plus contractor/payment-portal parity tests passed with 13 tests / 85 assertions, the full `tables-2` suite passed with 253 tests / 2337 assertions, touched-file typecheck scan showed no diagnostics, `/hrm/contractors/jobs` and `/contractors/jobs/payment-portal` returned `200`, `git diff --check` passed, and `components/tables-2/core` stayed unchanged.
- New Job install task validation on 2026-07-17 confirmed `install-tasks-list.tsx` no longer renders raw table markup; focused new-job install task parity tests passed with 4 tests, the full `tables-2` suite passed with 257 tests / 2337 assertions, focused Biome passed, touched-file typecheck scan showed no diagnostics while broad `@gnd/www` remains blocked by unrelated baseline API/UI errors, and `git diff --check` passed.
- Shared page-tab cleanup validation on 2026-07-23 confirmed the Contractor Jobs header no longer renders the legacy `All Jobs` / `Custom Jobs` button group while the shared `All` / saved `Custom` tabs, search, settings, KPI cards, and table remain available. The focused migration-parity suite passed with 6 tests / 51 assertions, targeted Biome and `@gnd/www` typecheck passed, and authenticated browser QA showed no console errors.

# Site Actions Table

## Status
Validated restarted Sales Orders parity migration slice, 2026-07-16.

The `/site-actions` operation log now renders through `apps/www/src/components/tables-2/site-actions/*` while preserving the existing `siteActions.index` query and URL filter hook.

## Behavior
- The route follows the restarted Sales Orders shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, `ErrorBoundary`, `Suspense`, and `getInitialTableSettings("site-actions")`.
- The table consumes `tables-2/core` directly: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky columns, persisted sizing/order/visibility/dividers, infinite scroll, selection, and the header-offset spacer.
- `TABLE_CONFIGS["site-actions"]` owns compact 56px rows, sticky select/date columns, safe sort field mappings, and content-tailored widths for Date, Event, Activity, Author, and Ref.
- The page title exposes `SiteActionsColumnVisibility` so operators can toggle columns and dividers.
- Selected rows expose a Sales Orders-style floating bottom bar with selected count and Deselect all.
- `siteActionsFilterSchema` now accepts `q`, `status`, `cursor`, `size`, and `sort[]` so table-owned infinite loading and header sorting reach the API.
- `getSiteActions` maps sortable UI fields to safe Prisma fields and filters `q` across description, event, and type.

## Constraints Preserved
- No custom shared page-header abstraction is used.
- `apps/www/src/components/tables-2/core/*` remains unchanged.
- The old `components/tables/site-actions/*` files were deleted after import scans confirmed no live consumers.

## Validation
- Focused Site Actions/page audit tests passed with 6 tests / 39 assertions.
- Full restarted parity suite passed with 65 tests / 562 assertions.
- Targeted Biome passed for the route, table files, table settings/config, audit tests, API schema/query, and notification helper.
- Filtered `@gnd/www`, `@gnd/api`, and `@gnd/notifications` typecheck greps reported no touched-file diagnostics.
- Static scan found no live legacy Site Actions table, `@gnd/ui/data-table`, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the route/table.
- `git diff --check` passed.
- HEAD smoke for `/site-actions` returned `200`.

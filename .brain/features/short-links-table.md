# Short Links Table

## Summary
The `/settings/short-links` settings page now renders its list through the restarted Sales Orders-style `tables-2` pattern instead of an inline `@gnd/ui/table`.

## Behavior
- Route shell uses `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("short-links")`.
- The settings page keeps the existing create/edit/deactivate dialog workflow, URL-backed search, and "Show inactive" toggle.
- The table lives in `apps/www/src/components/tables-2/short-links/*` and consumes the shared table-core behavior through `VirtualRow`, `useScrollHeader(parentRef)`, `useTableDnd`, draggable headers, resize handles, sticky columns, persisted settings, virtual rows, selection, and a Deselect all bottom bar.
- `TABLE_CONFIGS["short-links"]` owns compact 64px rows, sticky select/short-link columns, sort field mappings, and content-tailored widths for Short Link, Target, Status, Clicks, Last Click, Expiry, and Actions.

## Query Contract
- `shortLinks.list` accepts URL/query table inputs for `q`, `includeInactive`, `cursor`, `size`, and `sort[]`.
- Sort values are mapped to safe Prisma fields for slug, target URL, click count, last click, expiry, active status, and created date. Unknown sort fields fall back to `createdAt.desc`.
- Cursor paging uses offset-style cursors so the table can use the same infinite-scroll contract as other restarted table pages.

## Validation
- Focused Short Links/page audit tests passed with 6 tests / 38 assertions.
- Full restarted parity suite passed with 68 tests / 597 assertions.
- Targeted Biome passed for the route, settings page, table files, table settings/config, API schema/query, and audit tests.
- Filtered `@gnd/www`, `@gnd/api`, and `@gnd/db` typecheck greps reported no touched-file diagnostics.
- Static scan found no live legacy inline table, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the route/settings surface.
- `git diff --check` passed.
- HEAD smoke for `/settings/short-links` returned `200` after the route warmed.

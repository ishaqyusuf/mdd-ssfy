# Unit Productions Table

## Status
Validated restarted Sales Orders parity migration slice, 2026-07-16.

The `/community/unit-productions` route now renders through `apps/www/src/components/tables-2/unit-productions/*` with the restarted Sales Orders table-core behavior while preserving the existing production query, filters, summary widgets, open production sheet, production task action cells, and batch Start / Stop / Complete bottom bar.

## Behavior
- The route follows the canonical Sales Orders shell: `PageShell`, `HydrateClient`, `ScrollableContent`, `PageTitle`, `UnitProductionsHeader`, summary widgets, `ErrorBoundary`, `Suspense`, and table.
- Server hydration uses `batchPrefetch` for `community.getUnitProductions`; table settings hydrate from `getInitialTableSettings("unit-productions")`.
- The table consumes shared `tables-2/core` primitives directly: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky select/due-date columns, persisted sizing/order/visibility/dividers, infinite scroll, row selection, bottom bar, and the header-offset spacer.
- `TABLE_CONFIGS["unit-productions"]` owns compact padding and the 64px compact row height.
- The existing `UnitProductionsHeader` remains the page header and now owns both column-visibility/divider control and the open production sheet action.
- Row behavior is preserved: normal cells open the production task params, action cells keep `UnitTaskProductionAction`, and selected rows expose Start / Stop / Complete / Deselect all in the Sales Orders-style bottom bar.
- Project Overview Production embeds reuse `tables-2/unit-productions` through `embedded`, `defaultFilters.projectSlug`, and exported `projectTabColumns`, preserving compact table-owned scroll/DnD/resize while using a project-scoped task/details column set.

## Constraints Preserved
- No custom shared page-header abstraction is used.
- `apps/www/src/components/tables-2/core/*` remains unchanged.
- The existing community unit production API/query/filter contracts are reused.
- Old table imports are not used by the Unit Productions route/header/table.
- The old `apps/www/src/components/tables/unit-productions/*` files were removed on 2026-07-17 after import scans confirmed there were no live source consumers outside Brain notes and negative audit assertions.

## Validation
- `bun test apps/www/src/components/tables-2/unit-productions/migration-parity.test.ts` passed with 4 tests.
- The restarted parity/audit suite including Unit Productions passed with 37 tests / 245 assertions.
- Targeted Biome passed for the Unit Productions route/header/table/settings files.
- Filtered `@gnd/www` typecheck reported no touched-file diagnostics for the Unit Productions route/header/table/settings files while the full command still exits nonzero from unrelated baseline issues.
- `git diff --check` passed.
- Static scans confirmed the Unit Productions route/header/table do not import `PageStickyHeader`, legacy `components/tables/unit-productions`, `@gnd/ui/data-table`, or manual `fetchInfiniteQuery`.
- Project Overview embed validation on 2026-07-16 confirmed `components/widgets/project-overview/index.tsx` imports `tables-2/unit-productions` instead of the legacy unit-productions table.
- 2026-07-17 follow-up: focused Unit Productions parity tests passed again with 4 tests / 33 assertions, focused Biome passed for the route/header/table/settings files, direct local HTTP route smoke returned `200` in `0.719s`, and authenticated browser validation on `https://gndprodesk.localhost/community/unit-productions` loaded the live `65,096`-task dataset.
- The authenticated browser proof confirmed a `45px` header, exact `64px` data rows, sticky Select and Due Date columns, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 3885 -> 3955`, `clientHeight 389 -> 459` after header offset), table-owned horizontal scroll (`scrollLeft 0 -> 138`, `scrollWidth 1284`, `clientWidth 1146`), `--header-offset: 70px` after scroll, and no document-level horizontal overflow.
- The first portless HTTPS curl/browser attempt timed out before warmup, but direct local HTTP rendered quickly and the warmed authenticated HTTPS browser route rendered successfully.

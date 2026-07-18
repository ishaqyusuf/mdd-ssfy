# Community Projects Table

## Status
Validated restarted Sales Orders parity migration slice, 2026-07-16.

The `/community/projects` route now renders through `apps/www/src/components/tables-2/community-projects/*` while preserving the existing community projects query, filter params, analytics cards, project modal, supervisor editor, addon editor, archive actions, and overview/unit navigation.

## Behavior
- The route follows the canonical Sales Orders shell: `PageShell`, `HydrateClient`, `ScrollableContent`, `PageTitle`, `CommunityProjectHeader`, analytics cards, `ErrorBoundary`, `Suspense`, and table.
- Server hydration uses `batchPrefetch` for `community.getCommunityProjects`; table settings hydrate from `getInitialTableSettings("community-projects")`.
- The table consumes the shared `tables-2/core` primitives directly: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky columns, persisted sizing/order/visibility/dividers, infinite scroll, selection, bottom bar, and the header-offset spacer.
- `TABLE_CONFIGS["community-projects"]` owns the 64px compact row height and sticky select/project columns.
- The existing `CommunityProjectHeader` remains the page header, now with the Community Projects column-visibility/divider control beside the create action.
- Row behavior is preserved: normal cells route to the project overview, unit counts link to project units, supervisor and addon editors remain inline non-row-click cells, row actions preserve overview/units/edit/archive/delete workflows, and selected rows expose Mark active / Archive in a Sales Orders-style bottom bar.

## Constraints Preserved
- No custom shared page-header abstraction is used.
- `apps/www/src/components/tables-2/core/*` remains unchanged.
- The existing community project API/query/filter contracts are reused.
- Old table imports are not used by the route.
- The old `apps/www/src/components/tables/community-project/*` files were removed on 2026-07-17 after import scans confirmed there were no live source consumers outside Brain notes and negative audit assertions.

## Validation
- `bun test apps/www/src/components/tables-2/community-projects/migration-parity.test.ts` passed with 4 tests / 33 assertions.
- The combined restarted parity suite passed for Unit Invoices, Community Templates, Customer Services, Employees, Contractor Jobs, Community Projects, and page-tab query utilities.
- Targeted Biome passed for the Community Projects route/header/table/settings files.
- Filtered `@gnd/www` typecheck reported no touched-file diagnostics for the Community Projects route/header/table/settings files while the full command still exits nonzero from unrelated baseline issues.
- HTTP SSR smoke for `/community/projects` returned `200` with Community Projects markers and no sampled app-error/login markers.
- Static scans confirmed the route/table/header do not import `PageStickyHeader`, `components/tables/community-project`, `@gnd/ui/data-table`, or `fetchInfiniteQuery`; only the parity test assertion strings mention the old patterns.
- Live Playwright scroll smoke was attempted, but the workspace does not expose an importable `playwright` package to a one-shot script. Scroll behavior is therefore verified by the source-level table-owned `useScrollHeader(parentRef)` / scroll-container / header-offset contract plus SSR smoke rather than a successful browser scroll interaction.

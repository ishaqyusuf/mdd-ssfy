# Community Builders Table

## Status
Validated migration slice, 2026-06-16. Restarted Sales Orders parity hardening completed 2026-07-17.

The `/community/builders` route now renders through `apps/www/src/components/tables-2/community-builders/*` while preserving the existing community builders route, query, filters, header, and builder modal behavior.

## Behavior
- The route stays at `/community/builders`; no `/v2` route was added.
- The page reuses the existing `BuilderHeader`, including the existing `SearchFilterAdapter` search/filter surface and `OpenBuilderModal` action.
- Existing builder filters are preserved through `loadBuilderFilterParams` and `useBuilderFilterParams`.
- Existing row/modal state is preserved through `useBuilderParams` and `openBuilderId`.
- Existing data loading uses `trpc.community.getBuilders`; no new builders query was introduced.
- The route now follows the current restarted Sales Orders shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("community-builders")`; it no longer manually fetches infinite query data in the route.
- The table supports persisted table-2 column visibility, sizing, ordering, dividers, sticky builder column behavior, virtualized rows, table-owned infinite scroll, DnD column ordering, draggable/sortable headers, resize handles, `useScrollHeader(parentRef)`, and row-click-to-open builder details.
- Compact sizing is content-tailored: Builder `220/420/280`, Projects `96/140/110`, Tasks `84/130/100`, Homes `84/130/100`, Actions `72/96/80`, with 64px compact rows.
- The builder edit/create form now renders its task grid through `components/tables-2/builder-form-tasks/*` instead of the embedded namespace table. The modal keeps the existing builder form contract while adding compact 48px rows, table-owned scroll, virtual rows, draggable/resizable headers, a sticky Task column, and content-fit task/addon/flag/action widths.

## Constraints Preserved
- No new community builder `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- Cleanup removed the old `apps/www/src/components/tables/builder/*` files only after runtime import scans found no remaining consumers.

## Validation
- 2026-07-17 restarted parity validation:
  - Builder form task-grid validation passed with focused Biome, focused Builder form plus Community Builders parity tests (8 tests / 37 assertions), full `apps/www/src/components/tables-2` tests (233 tests / 2337 assertions), touched-file typecheck scan, direct Next and HTTPS `/community/builders` route smokes, legacy table markup scan, `git diff --check`, and a clean `components/tables-2/core` diff. A Playwright CLI screenshot in an unauthenticated browser context was blank and was not counted as browser proof.
  - focused Biome passed for the builders route/header/table files, table config, and page audit test.
  - full restarted table migration parity suite passed with 103 tests / 878 assertions.
  - static scans found no live builder route references to `components/tables/builder`, `@gnd/ui/data-table`, `getQueryClient`, `fetchInfiniteQuery`, `PageStickyHeader`, manual `IntersectionObserver`, or row `map` rendering patterns.
  - filtered `@gnd/www` typecheck grep reported no diagnostics for touched builders files while broad typecheck remains blocked by unrelated baseline errors.
  - HTTP smoke returned `200` for `/community/builders` on both `127.0.0.1:3010` and `https://gndprodesk.localhost:3011` after route compile warmup.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` remained unchanged.
- Focused Biome passed for the builders route, header, new `tables-2/community-builders` files, and table settings/config files.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched builders route/table/header/settings/config files while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans found no remaining runtime references to `components/tables/builder` or `tables/builder`.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the builder slice.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/community/builders` rendered the builder header, existing `Search Builders...` input, table headers, virtualized builder rows, no app error, no console errors, and no document-level horizontal overflow.
  - desktop `/community/builders?q=Mattamy` preserved the existing URL search contract and bound the value into the header input without changing backend query semantics.
  - mobile `390x844` `/community/builders` rendered rows, no app error, no console errors, no document-level horizontal overflow, and table-owned horizontal scrolling.

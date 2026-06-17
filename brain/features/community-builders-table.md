# Community Builders Table

## Status
Validated migration slice, 2026-06-16.

The `/community/builders` route now renders through `apps/www/src/components/tables-2/community-builders/*` while preserving the existing community builders route, query, filters, header, and builder modal behavior.

## Behavior
- The route stays at `/community/builders`; no `/v2` route was added.
- The page reuses the existing `BuilderHeader`, including the existing `SearchFilterAdapter` search/filter surface and `OpenBuilderModal` action.
- Existing builder filters are preserved through `loadBuilderFilterParams` and `useBuilderFilterParams`.
- Existing row/modal state is preserved through `useBuilderParams` and `openBuilderId`.
- Existing data loading uses `trpc.community.getBuilders`; no new builders query was introduced.
- The table supports persisted table-2 column visibility, sizing, ordering, dividers, sticky builder column behavior, virtualized rows, and row-click-to-open builder details.

## Constraints Preserved
- No new community builder `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- Cleanup removed the old `apps/www/src/components/tables/builder/*` files only after runtime import scans found no remaining consumers.

## Validation
- Focused Biome passed for the builders route, header, new `tables-2/community-builders` files, and table settings/config files.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched builders route/table/header/settings/config files while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans found no remaining runtime references to `components/tables/builder` or `tables/builder`.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the builder slice.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/community/builders` rendered the builder header, existing `Search Builders...` input, table headers, virtualized builder rows, no app error, no console errors, and no document-level horizontal overflow.
  - desktop `/community/builders?q=Mattamy` preserved the existing URL search contract and bound the value into the header input without changing backend query semantics.
  - mobile `390x844` `/community/builders` rendered rows, no app error, no console errors, no document-level horizontal overflow, and table-owned horizontal scrolling.

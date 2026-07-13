# Community Templates Table

## Status
Validated migration slice, 2026-06-16.

The `/community/templates` route now renders through `apps/www/src/components/tables-2/community-templates/*` while preserving the existing community template route, query, filters, header actions, and modal/action behavior.

## Behavior
- The route stays at `/community/templates`; no `/v2` route was added.
- The page reuses the existing `BuilderHeader`-style Midday search-filter adapter through `CommunityTemplateHeader`, while keeping the existing `communityTemplateFilterParams` schema and `filters.communityTemplateFilters` endpoint.
- Existing template filters are preserved through `loadCommunityTemplateFilterParams` and `useCommunityTemplateFilterParams`.
- Existing data loading uses `trpc.community.getCommunityTemplates`; no new templates query was introduced.
- Existing row actions are preserved: edit template modal, print preview link, delete confirmation, model-cost edit, install-cost edit, and project-units link.
- Community-unit restricted access keeps the install-cost column out of the active column set.
- The table supports persisted table-2 column visibility, sizing, ordering, dividers, sticky model column behavior, virtualized rows, and table-owned horizontal scrolling.

## Constraints Preserved
- No new community template `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- The route no longer awaits template filter metadata before rendering; filter options are loaded lazily by the existing Midday adapter when needed.
- Cleanup removed the old `apps/www/src/components/tables/community-template/*` files and old `CommunityTemplateSearchFilter` wrapper after runtime import scans found no remaining consumers.

## Validation
- Focused Biome passed for the templates route, header, new `tables-2/community-templates` files, and table settings/config files.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched templates route/table/header/settings/config files or the retargeted legacy install-cost modal row type while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans found no remaining runtime references to `CommunityTemplateSearchFilter`, `community-template-search-filter`, `components/tables/community-template`, or `tables/community-template`.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the templates slice.
- HTTP smoke returned `200` for `/community/templates`.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/community/templates` rendered the header, existing `Search Community Templates` input, table headers, virtualized template rows, no app error, and no document-level horizontal overflow.
  - desktop `/community/templates?q=2795` preserved the existing URL search contract, bound the value into the header input, and returned matching template rows without fresh console errors.
  - mobile `390x844` `/community/templates` rendered rows, no app error, no fresh console errors, no document-level horizontal overflow, and table-owned horizontal scrolling.

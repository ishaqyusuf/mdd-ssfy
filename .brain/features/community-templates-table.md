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
- The table supports persisted table-2 column visibility, sizing, drag ordering, dividers, sticky model column behavior, virtualized rows, sort URL state where configured, and table-owned horizontal scrolling. The restarted 2026-07-16 migration follows the Sales Orders table shell directly: the route composes `ScrollableContent`, `PageTitle`, `CommunityTemplateHeader`, and `DataTable` without a shared `PageStickyHeader` wrapper, while the table owns `useScrollHeader(parentRef)`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, and the header-offset spacer.
- The model-cost edit modal now renders its desktop task cost/tax grid through `components/tables-2/community-model-cost-form-tasks/*` instead of inline `@gnd/ui/table` markup. The modal preserves start/end dates, Clear Costs, Create Copy, Delete, total, save/delete mutations, and Unit Invoice page-tab invalidation while adding compact 48px rows, a sticky Task column, content-fit Task/Cost/Tax widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, and persisted settings.
- The install-cost edit modal now renders its desktop task quantity grid through `components/tables-2/community-install-cost-form-tasks/*` instead of inline `@gnd/ui/table` markup. The modal preserves form reset, save mutation, modal/sidebar footer placement, and install-cost meta payload behavior; the former blank `Def. Qty` cells now show task `defaultQty` when available while editable quantities still write `installCost.<uid>`. The embedded table uses compact 48px rows, a sticky Task column, content-fit Task/Def. Qty/Qty widths, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, dividers, persisted settings, and active quantity row highlighting.

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
- Restarted Sales Orders parity migration on 2026-07-16:
  - Removed the shared `PageStickyHeader` wrapper from the Community Templates page and aligned the route shell to the Sales Orders/Midday invoices composition with `ScrollableContent`, title, header, and table.
  - Switched route hydration to sort-aware `batchPrefetch` so the route no longer blocks on manual infinite-query fetch.
  - Added the Sales Orders table-core column drag flow to Community Templates: `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, non-reorderable/action-column handling, resize handles, sort buttons for configured sort fields, and the header-offset scroll spacer.
  - Added `migration-parity.test.ts` to lock Community Templates against the failed shared-header implementation and require Sales Orders-style table-owned scroll/DnD plus `TABLE_CONFIGS["community-templates"].rowHeight`.
  - Validation: `bun test apps/www/src/components/tables-2/community-templates/migration-parity.test.ts` passed; combined Unit Invoices + Community Templates parity suite passed with 10 tests / 51 assertions; targeted Biome passed for the Templates route/table/header/test files; `git diff --check` passed; HTTP SSR smoke for `/community/templates` returned `200` with Community Template markers.
- Community Model Cost form task-grid restart on 2026-07-17:
  - `apps/www/src/components/forms/community-model-cost-form.tsx` now uses `CommunityModelCostFormTasksTable` from `components/tables-2/community-model-cost-form-tasks`.
  - Focused parity test passed with 4 tests, full `apps/www/src/components/tables-2` passed with 225 tests / 2337 assertions, focused Biome passed, touched-file typecheck scan showed no diagnostics, `/community/templates` returned `200` on direct Next, `git diff --check` passed, and `components/tables-2/core` stayed unchanged.
- Community Install Cost form task-grid restart on 2026-07-17:
  - `apps/www/src/components/forms/community-install-cost-form.tsx` now uses `CommunityInstallCostFormTasksTable` from `components/tables-2/community-install-cost-form-tasks`.
  - Focused install-cost form parity test passed with 4 tests, combined community install-cost/model-cost parity tests passed with 13 tests / 44 assertions, full `apps/www/src/components/tables-2` passed with 229 tests / 2337 assertions, focused Biome passed, touched-file typecheck scan showed no diagnostics, `/community/templates` returned `200` on direct Next and HTTPS proxy, legacy table markup scan on the form was clean, `git diff --check` passed, and `components/tables-2/core` stayed unchanged.

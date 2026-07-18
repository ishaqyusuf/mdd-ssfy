# Unit Invoices Table

## Status
Validated migration slice, 2026-06-16.

The `/community/unit-invoices` route now renders through `apps/www/src/components/tables-2/unit-invoices/*` while preserving the existing route, unit-invoice query, filter params, report menu, and invoice modal behavior.

## Behavior
- The route stays at `/community/unit-invoices`; no `/v2` route was added.
- The route loading state uses `UnitInvoicesSkeleton` from `components/tables-2/unit-invoices`; the old `_v1` `DataTableLoading` wrapper has been removed so the page no longer imports `components/tables/skeleton` during loading.
- Existing unit-invoice filters are preserved through `loadUnitInvoiceFilterParams` and `useUnitInvoiceFilterParams`.
- Existing data loading uses `trpc.community.getUnitInvoices`; no new unit-invoice query was introduced.
- Existing header behavior is preserved through `UnitInvoicesHeader`, including the existing `SearchFilterAdapter` and `UnitInvoicesReportMenu`.
- The `q` search now matches Project Units visible unit text search by checking `search`, `modelName`, `lotBlock`, `project.title`, and `project.builder.name`; project-scoped lot/block searches such as Breezewood Villas plus `/01` should no longer drop invoice units that appear on Project Units.
- Row click and row actions still open the existing `editUnitInvoiceId` URL param and `UnitInvoiceModal`.
- The Unit Invoice edit modal's desktop task editor now uses `components/tables-2/unit-invoice-form-tasks/*` instead of an embedded `@gnd/ui/table`/`table-sm` grid. It keeps the existing mobile card editor, task add/delete/save flow, locked task fields, paid/check/check-date inputs, first-check sync checkboxes, and typed Unit Invoice page-tab invalidation after invoice save/delete. The desktop table is intentionally compact with 52px rows, a sticky Task column, table-owned scroll, virtual rows, DnD, draggable headers, resize handles, column dividers, and persisted settings.
- The table supports persisted table-2 column visibility, sizing, drag ordering, dividers, sticky Unit column behavior, virtualized rows, existing sort URL state, and table-owned horizontal scrolling. The restarted 2026-07-16 migration intentionally follows the Sales Orders route/table shell directly instead of the earlier shared `PageStickyHeader` wrapper: the route composes `ScrollableContent`, `PageTitle`, `UnitInvoicesHeader`, and `DataTable` in one stack, while the table owns `useScrollHeader(parentRef)`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, and the header-offset spacer.
- Saved filter tabs on `/community/unit-invoices` use the shared `pageTabs` surface. Saved tab counts are computed server-side through `whereUnitInvoices`, so badges use the same filter semantics as the table and printable report filters. The shared filter row renders tabs before the search input, automatically prepends an `All` tab when saved tabs exist, keeps the save `+` action inside the tab group, and exposes a single Edit control for the sortable saved-tabs management dialog. Unit invoice form and related model-cost changes now invalidate the typed `unitInvoices` page-tab path so count badges refresh with the table.
- Cross-page unit-invoice count refreshes should call `usePageTabs().invalidate("unitInvoices")` or the shared typed invalidation helper. Raw fallback paths and full app URLs are normalized to `/community/unit-invoices` before visible tabs, edit-modal tabs, and defaults are invalidated, keeping Unit Invoice saved-tab counts aligned after invoice-affecting actions from adjacent Community workflows.

## Constraints Preserved
- No new unit-invoice `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- The Project Overview Invoices tab now imports `tables-2/unit-invoices` with exported project-tab columns; the widget no longer imports the legacy embeddable Unit Invoices table. The old `apps/www/src/components/tables/unit-invoices/*` files were removed on 2026-07-17 after import scans confirmed there were no live source consumers.
- Browser validation exposed a `CustomModal` accessibility issue where custom ids overrode Radix-generated dialog title/description ids. `apps/www/src/components/modals/custom-modal.tsx` now lets Radix own generated ids for normal titles/descriptions while preserving hidden accessible labels and portal placeholders for the `titleAsChild` / `descriptionAsChild` path.

## Validation
- Focused Biome passed for the unit-invoices route, header, new `tables-2/unit-invoices` files, table settings/config files, and the `CustomModal` accessibility fix.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched unit-invoices route/table/header/settings/config files or `CustomModal` while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans confirmed the route no longer imports `components/tables/unit-invoices`; after the Project Overview embed restart, the 2026-07-17 cleanup confirmed no live source imports remained before deleting the old legacy folder.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the unit-invoices slice.
- Search-parity implementation validation on 2026-07-09:
  - `bun test apps/api/src/trpc/routers/community.route.test.ts` passed.
  - `bunx biome check --formatter-enabled=false apps/api/src/db/queries/unit-invoices.ts apps/api/src/trpc/routers/community.route.test.ts` passed.
  - `bun --filter @gnd/api typecheck` was attempted and remains blocked by unrelated baseline diagnostics outside the Unit Invoices search change.
- Saved-tab count validation on 2026-07-15:
  - `bun test apps/api/src/trpc/routers/page-tabs.route.test.ts apps/api/src/db/queries/sales-orders-v2.test.ts apps/api/src/trpc/routers/community.route.test.ts apps/www/src/components/page-tabs/query-utils.test.ts` passed.
  - Focused Biome passed for the touched page-tabs, Unit Invoices, Sales Orders, and shared search-filter files.
  - Filtered `@gnd/api` typecheck output showed no touched-file diagnostics for page-tabs, sales-orders-v2, unit-invoices, or the community route test.
- Typed invalidation validation on 2026-07-16:
  - Unit Invoice form saves/deletes and Community Model Cost changes now invalidate the typed `PAGE_TAB_PATHS.unitInvoices` key so saved-tab counts can refresh after invoice-affecting edits.
  - Cross-page updates can refresh this page's tab counts with `usePageTabs().invalidate("unitInvoices")`, while same-page updates can call the no-arg hook path and raw custom paths remain available through normalized `invalidatePath`.
  - The hook delegates to `createPageTabsInvalidation`, so current-path invalidation, typed key invalidation, and raw path fallback are covered by the same runtime-tested helper.
  - `bun test apps/api/src/trpc/routers/page-tabs.route.test.ts apps/www/src/components/page-tabs/invalidation.test.ts apps/www/src/components/page-tabs/query-utils.test.ts` passed.
  - `git diff --check` passed.
  - Follow-up global page-tabs validation kept Unit Invoices in the typed registry while expanding the same count/invalidation model across Sales Book, HRM, and Community pages; focused page-tabs tests and focused Biome still pass.
- Superseded sticky-header validation on 2026-07-16:
  - The earlier shared `PageStickyHeader` wrapper pass was validated at the time, but it has been superseded by the restarted Sales Orders parity migration below because the page should follow the Sales Orders table shell directly instead of a custom shared page-header abstraction.
- Restarted Sales Orders parity migration on 2026-07-16:
  - Removed the shared `PageStickyHeader` wrapper from the Unit Invoices page and aligned the route shell to the Sales Orders/Midday invoices composition with `ScrollableContent`, title, header, table, and modal.
  - Switched route hydration back to `batchPrefetch` so the route does not block on a manual infinite-query fetch.
  - Added the Sales Orders table-core column drag flow to Unit Invoices: `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, non-reorderable column handling, action-column full-width handling, resize handles, and the header-offset scroll spacer.
  - Added `migration-parity.test.ts` to lock the Unit Invoices page against the failed shared-header implementation and require Sales Orders-style table-owned scroll/DnD plus `TABLE_CONFIGS["unit-invoices"].rowHeight`.
  - Validation: `bun test apps/www/src/components/tables-2/unit-invoices/migration-parity.test.ts apps/www/src/components/page-tabs/query-utils.test.ts` passed; targeted Biome passed for the Unit Invoices route/table/header/test files; `git diff --check` passed; HTTP SSR smoke for `/community/unit-invoices` returned `200` with Unit Invoices markers. Playwright scroll automation was attempted with system Chrome and cached Chromium headless shell, but both timed out during browser launch before page interaction.
- Restarted loading cleanup on 2026-07-17:
  - `/community/unit-invoices/loading.tsx` now renders `UnitInvoicesSkeleton` from `tables-2/unit-invoices`.
  - The unused `_v1/data-table/data-table-loading.tsx` wrapper was deleted after scans confirmed it was the only live importer of `components/tables/skeleton`.
  - Validation: focused Unit Invoices parity tests passed with 5 tests / 27 assertions; full restarted table parity suite passed with 170 tests / 1670 assertions; targeted Biome passed; touched-file filtered `@gnd/www` typecheck grep reported no diagnostics; static scan found no live `DataTableLoading`, `data-table-loading`, or `components/tables/skeleton` references; `git diff --check` passed and `components/tables-2/core` had no diff.
- Project Overview embed validation on 2026-07-16 confirmed `components/widgets/project-overview/index.tsx` imports `tables-2/unit-invoices` instead of the legacy unit-invoices table; the full restarted parity suite passed with 57 tests / 480 assertions.
- Legacy folder cleanup on 2026-07-17 removed `apps/www/src/components/tables/unit-invoices/*` after static scans found no live imports outside Brain notes and negative audit assertions.
- Unit Invoice edit-form task grid restart on 2026-07-17:
  - Added `components/tables-2/unit-invoice-form-tasks/*` and registered `unit-invoice-form-tasks` in table settings/config with compact 52px rows and a sticky Task column.
  - Replaced the desktop embedded `@gnd/ui/table`/`table-sm` grid in `unit-invoice-form.tsx` with the domain-local table-core module while preserving the mobile card layout and task field behavior.
  - Validation: `bun test apps/www/src/components/tables-2` passed with 221 tests / 2327 assertions; `bun test apps/www/src/components/tables-2/unit-invoices/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 9 tests / 43 assertions; focused Biome passed for the touched form/table/test/settings/config files; touched-file filtered `@gnd/www` typecheck output showed no diagnostics; HTTP smoke returned `200` for `/community/unit-invoices`; `git diff --check` passed; `components/tables-2/core` had no diff.
- Saved-tab placement validation on 2026-07-15:
  - Shared saved filter tabs now render inline before the search input with an automatic first `All` tab, embedded save `+` action, and a single Edit control for the management dialog.
  - `bunx biome check --formatter-enabled=false apps/www/src/components/page-tabs/page-tabs.tsx apps/www/src/components/page-tabs/manage-page-tabs-dialog.tsx apps/www/src/components/page-tabs/confirm-delete-button.tsx apps/www/src/components/page-tabs/save-page-tab-button.tsx apps/www/src/components/midday-search-filter/search-filter-trpc.tsx` passed.
- HTTP smoke returned `200` for `/community/unit-invoices`.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/community/unit-invoices` rendered the header, existing `Search unit invoices...` input, table headers, virtualized invoice rows, no app error, no fresh console errors, and no document-level horizontal overflow.
  - desktop search updated the existing `q` URL param without fresh console errors.
  - mobile `390x844` `/community/unit-invoices` rendered rows, no app error, no fresh console errors, no document-level horizontal overflow, and table-owned horizontal scrolling.
  - row click opened `editUnitInvoiceId`, rendered the invoice modal, resolved Radix-generated dialog title/description ids, and produced no fresh console errors after the `CustomModal` fix.

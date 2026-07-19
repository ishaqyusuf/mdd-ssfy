# Sales Dealers Table

## Status
- 2026-07-16: `/sales-book/dealers` is migrated to the restarted Sales Orders table-core pattern.
- 2026-07-17: `/sales-book/dealers` density and width tuning now matches the compact Sales Orders/Midday invoices target more closely.

## Route
- Canonical route: `/sales-book/dealers`
- Access: Super Admin only through the existing route `AuthGuard`
- Route file: `apps/www/src/app/(sidebar)/(sales)/sales-book/dealers/page.tsx`
- Admin surface: `apps/www/src/components/dealers/dealers-admin-page.tsx`
- Table module: `apps/www/src/components/tables-2/dealers/*`

## Behavior
- The route uses the direct Sales Orders/Midday invoices shell: `PageShell`, `HydrateClient`, `ScrollableContent`, `PageTitle`, `AuthGuard`, `batchPrefetch`, and `getInitialTableSettings("dealers")`.
- The admin surface keeps the dealer metrics, Add dealer dialog, saved page tabs, search input, and column visibility controls above the table.
- Saved page tabs render before the search input, and dealer create/profile/update/onboarding resend flows invalidate the `dealers` page-tab key so saved-tab counts can refresh.
- Dealer search remains URL-backed but is not saveable in page tabs: the `search` key is excluded from saved queries and the save action is hidden whenever the dealer search input is non-empty.
- The dealer saved-tab strip is hidden when there are no saved tabs and no active search/sort query to save, preventing an empty bordered tab shell before the dealer search input. The surrounding dealer tab/search header is also flat in this empty state, so the no-tab/no-filter state does not leave a divider that reads as an empty tabs border.
- The old inline `@gnd/ui/table` dealer list and failed shared `PageStickyHeader` wrapper are no longer used on this route.

## Table-Core Contract
- The dealer table consumes `tables-2/core` through `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky columns, persisted sizing/order/visibility/dividers, and the header-offset spacer.
- The existing `trpc.dealer.list` and `trpc.dealer.salesProfiles` contracts are reused. No new dealer API contract or Prisma schema change was added.
- The table keeps the current list-query semantics (`search`, `size: 50`) rather than introducing infinite pagination in this slice.

## Compact Widths
- `TABLE_CONFIGS["dealers"].style = "compact"`
- Row height: `48`
- Dealer: `sizes.custom(180, 320, 220)`
- Email: `sizes.custom(150, 280, 200)`
- Status: `sizes.custom(104, 150, 116)`
- Sales profile: `sizes.custom(180, 280, 210)`
- Customer link: `sizes.custom(150, 280, 200)`
- Created: `sizes.custom(112, 170, 128)`
- Actions: `sizes.custom(82, 104, 92)`
- The dealer cell is single-line with a smaller `size-6` identity marker and inline dealer id.
- The sales profile selector uses an `h-8` compact trigger with the coefficient rendered inline instead of stacked below.

## Validation
- 2026-07-17 density/width tuning validation:
  - `bun test apps/www/src/components/tables-2/dealers/migration-parity.test.ts` passed with 5 tests / 43 assertions.
  - `bun test apps/www/src/components/tables-2` passed with 289 tests / 2340 assertions.
  - Focused Biome passed for the touched Dealers table/config/test files.
  - Filtered `@gnd/www` typecheck scan produced no diagnostics for touched Dealers/table-config files.
  - Browser smoke on the authenticated local `/sales-book/dealers` page confirmed `48px` rows and table-owned horizontal overflow/scroll (`scrollWidth 1166` vs `clientWidth 1146`, `scrollLeft 0 -> 20`). The local dataset had only 5 dealer rows, so natural vertical overflow was not present (`scrollHeight 439`, `clientHeight 439`); vertical scroll proof requires a taller dealer fixture or exposed viewport resize control.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.
- 2026-07-17 page-tabs empty-shell validation:
  - Dealer admin page now only passes a save-tab action into `PageTabs` when `queryFromActiveFilters` returns a saveable query.
  - Follow-up browser validation confirmed `/sales-book/dealers` renders no saved-tab shell and no dealer tab/search wrapper border when there are no saved tabs and no active filter query.
  - Focused page-tabs/restarted-header tests passed with 17 tests / 25 assertions.
  - Filtered `@gnd/www` typecheck scan produced no diagnostics for the touched page-tabs/search/dealer files.
- Initial migration validation:
  - `bun test apps/www/src/components/tables-2/dealers/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 8 tests / 44 assertions.
- The restarted parity suite passed with 51 tests / 362 assertions.
- Targeted Biome passed for the Dealers route/admin/table files, table settings/config, and restarted-page audit.
- Filtered `@gnd/www` typecheck scan reported no diagnostics for the touched Dealers/table files; the broad typecheck remains blocked by existing unrelated baseline errors.
- `git diff --check` passed.
- Static scans found no live `PageStickyHeader`, legacy dealer table, `@gnd/ui/data-table`, `fetchInfiniteQuery`, or manual `fetchQuery` usage in the Dealers route/admin/new table.
- HTTP SSR smoke for `/sales-book/dealers` returned `200`.

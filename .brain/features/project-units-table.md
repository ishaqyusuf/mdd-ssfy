# Project Units Table

## Status
Validated restarted Sales Orders parity migration slice, 2026-07-16.

The `/community/project-units` route now renders through `apps/www/src/components/tables-2/project-units/*` while preserving the existing project unit query, filter params, analytics cards, unit modal, install-cost shortcuts, template/version actions, print preflight modal, production send action, and batch print/open/delete behavior.

## Behavior
- The route follows the canonical Sales Orders shell: `PageShell`, `HydrateClient`, `ScrollableContent`, `PageTitle`, `ProjectUnitHeader`, analytics cards, `ErrorBoundary`, `Suspense`, and table.
- Server hydration uses `batchPrefetch` for `community.getProjectUnits`; table settings hydrate from `getInitialTableSettings("project-units")`.
- The table consumes the shared `tables-2/core` primitives directly: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky columns, persisted sizing/order/visibility/dividers, infinite scroll, selection, bottom bar, and the header-offset spacer.
- `TABLE_CONFIGS["project-units"]` owns the 64px compact row height, compact cell padding, and tailored column widths so Lot / Block, Date, Project, Template, Install Cost, Production, Installation, and Actions fit content without broad legacy table spacing.
- The existing `ProjectUnitHeader` remains the page header, now with Project Units column-visibility/divider control beside the create action.
- Row behavior is preserved: normal cells route to unit overview when a unit slug exists, template cells route to the template, install-cost cells open the install-cost editor, installation cells route to contractor jobs filtered by unit, row actions preserve open/template/version/preview/print/edit/delete workflows, and selected rows expose Print selected / Open first / Delete / Deselect all in a Sales Orders-style bottom bar.
- The Project Overview Units tab imports the new `tables-2/project-units` embedded table and project-tab columns instead of the legacy Project Units table. The same Project Overview widget now also uses restarted `tables-2` embeds for Unit Productions, Unit Invoices, and Contractor Jobs, so no Project Overview tab imports the legacy `components/tables/*` project-tab tables.

## Constraints Preserved
- No custom shared page-header abstraction is used.
- `apps/www/src/components/tables-2/core/*` remains unchanged.
- The existing community project units API/query/filter contracts are reused.
- Old Project Units table imports are not used by the project-units route, header, or Project Overview Units tab.
- The old `apps/www/src/components/tables/project-units/*` files were removed on 2026-07-17 after import scans confirmed there were no live source consumers outside Brain notes and negative audit assertions.

## Validation
- 2026-07-17 authenticated browser proof:
  - Claimed the existing Codex in-app browser GND tab, navigated to `https://gndprodesk.localhost/community/project-units`, then restored the tab to its original Sales Orders URL after measurement.
  - Runtime table measurement confirmed the restarted table renders one table with exact `64px` data rows, a `45px` header, sticky Select / Lot-Block / Actions cells, `scrollWidth 1604` vs `clientWidth 1353`, `scrollHeight 3885` vs `clientHeight 653`, and no document-level horizontal overflow.
  - Table-owned scroll was exercised inside the table viewport: vertical scroll moved `scrollTop 0 -> 650`, horizontal scroll moved `scrollLeft 0 -> 236`, rows stayed `64px`, the header stayed `45px`, and `--header-offset` updated to `70px` after scroll.
  - Focused validation in the same pass: `bun test apps/www/src/components/tables-2/project-units/migration-parity.test.ts` passed with 4 tests / 42 assertions; focused Biome passed for the Project Units route/header/table/hooks/config files; direct route smoke returned `200` for `/community/project-units`; `components/tables-2/core` diff stayed clean.
- `bun test apps/www/src/components/tables-2/project-units/migration-parity.test.ts` passed with 4 tests / 45 assertions after the Project Overview all-tab guard was added.
- The combined restarted parity suite passed for Project Units, Community Projects, Contractor Jobs, Employees, Customer Services, Community Templates, Unit Invoices, and page-tab query utilities with 30 tests / 209 assertions.
- Targeted Biome passed for the Project Units route/header/table/settings files, Project Overview units-tab import, and the exported document uploader type.
- Filtered `@gnd/www` typecheck reported no touched-file diagnostics for the Project Units route/header/table/settings files, Project Overview units-tab import, and the exported document uploader type while the full command still exits nonzero from unrelated baseline issues.
- `git diff --check` passed.
- Static scans confirmed the Project Units route/header/new table and Project Overview Units tab do not import `PageStickyHeader`, `components/tables/project-units`, `@gnd/ui/data-table`, or `fetchInfiniteQuery`; only the parity test assertion strings mention the old patterns.
- HTTP SSR smoke for `/community/project-units` returned `200` with Project Units title/data markers. The unauthenticated curl response also included the app's `/login/v2` redirect marker, so this is auth-limited render evidence rather than a complete logged-in browser smoke.
- Earlier standalone Playwright scroll smoke was unavailable in this workspace, but the authenticated Codex in-app browser proof above now covers the live table-owned scroll behavior.

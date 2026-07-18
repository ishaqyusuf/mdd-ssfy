# Customer Service Table

## Status
Validated migration slice, 2026-06-16.
Density follow-up, 2026-07-17.

The `/community/customer-services` route now renders through `apps/www/src/components/tables-2/customer-service/*` while preserving the existing route, customer-service query, search filter, summary widgets, chart, work-order sheet params, and row actions.

## Behavior
- The route stays at `/community/customer-services`; no `/v2` route was added.
- Existing customer-service filters are preserved through `loadCustomerServiceFilterParams` and `useCustomerServiceFilterParams`.
- Existing data loading uses `trpc.customerService.getCustomerServices`; no new customer-service query was introduced.
- Existing Punchout employee loading is preserved through `trpc.hrm.getEmployees({ roles: ["Punchout"] })` for the assignment combobox.
- Existing row actions are preserved: assignment, status update, edit work order, and delete work order.
- The table supports persisted table-2 column visibility, sizing, drag ordering, dividers, sticky appointment column behavior, row selection, select-all, a Sales Orders-style selection bottom bar, virtualized rows, sort URL state where configured, and table-owned horizontal scrolling. The restarted 2026-07-16 migration follows the Sales Orders table shell directly: the route composes `ScrollableContent`, `PageTitle`, `CustomerServiceHeader`, summary widgets, chart, and `DataTable` without a shared `PageStickyHeader` wrapper, while the table owns `useScrollHeader(parentRef)`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, and the header-offset spacer.
- The 2026-07-17 density follow-up keeps the same contracts but lowers the table row height to `56px`, tightens Appointment/Customer/Description/Assigned To/Status/Actions widths to content-fit ranges, and gives the assignment combobox an `h-8` trigger so two-line work-order rows no longer need the old `72px` safety height.
- The existing work-order summary widgets and filter chart remain outside the table.

## Constraints Preserved
- No new customer-service `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- Cleanup removed the old `apps/www/src/components/tables/customer-service/*` files after runtime import scans found no remaining consumers.
- A shared `packages/ui/src/components/custom/summary-card-skeleton.tsx` invalid HTML nesting issue was fixed after browser validation exposed a fresh hydration warning on this route.

## Validation
- Focused Biome passed for the customer-services route, header, new `tables-2/customer-service` files, table settings/config files, and the shared summary-card skeleton fix.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched customer-services route/table/header/settings/config files while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans found no remaining runtime references to `components/tables/customer-service` or `tables/customer-service`.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the customer-service slice.
- HTTP smoke returned `200` for `/community/customer-services`.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/community/customer-services` rendered summary widgets, chart area, header search, table headers, virtualized work-order rows, no app error, no fresh console errors after the skeleton fix, and no document-level horizontal overflow.
  - desktop `/community/customer-services?q=Yanaixy` preserved the existing URL search contract, bound the value into the header input, and narrowed to the matching work order without fresh console errors.
  - mobile `390x844` `/community/customer-services` rendered the route, no app error, no fresh console errors, no document-level horizontal overflow, and table-owned horizontal scrolling.
- Restarted Sales Orders parity migration on 2026-07-16:
  - Removed the shared `PageStickyHeader` wrapper from the Customer Services page and aligned the route shell to the Sales Orders/Midday invoices composition with `ScrollableContent`, title, header, summary widgets, chart, and table.
  - Switched route hydration to sort-aware `batchPrefetch` for work orders and Punchout employees so the route no longer blocks on manual query-client fetches.
  - Added the Sales Orders table-core column drag flow to Customer Services: `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, non-reorderable/action-column handling, select-all header checkbox, resize handles, sort buttons for configured sort fields, and the header-offset scroll spacer.
  - Added a domain-local Sales Orders-style selection bottom bar with selected count and Deselect all.
  - Added `migration-parity.test.ts` to lock Customer Services against the failed shared-header implementation and require Sales Orders-style table-owned scroll/DnD/selection plus `TABLE_CONFIGS["customer-service"].rowHeight`.
  - Validation: combined Unit Invoices + Community Templates + Customer Services parity suite passed with 14 tests / 82 assertions; targeted Biome passed for the Customer Services route/table/header/bottom-bar/test files; `git diff --check` passed; HTTP SSR smoke for `/community/customer-services` returned `200` with Customer Service markers.
- Density follow-up on 2026-07-17:
  - Focused Customer Services parity tests passed with 4 tests / 38 assertions.
  - Full `apps/www/src/components/tables-2` tests passed with 305 tests / 2538 assertions.
  - Focused Biome passed for `customer-service/columns.tsx`, `customer-service/migration-parity.test.ts`, and `utils/table-configs.ts`.
  - Touched-file typecheck grep produced no Customer Service/table-config diagnostics after the parity test switched from Bun-only matcher typings to `includes(...).toBe(...)` assertions.
  - Direct HTTP route smoke for `/community/customer-services` returned `200`.
  - Follow-up authenticated browser proof on `https://gndprodesk.localhost/community/customer-services` loaded work-order rows and confirmed `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 2285`, `clientHeight 299`), and no document-level horizontal overflow. At the current desktop width the tightened columns fit the table container exactly (`scrollWidth 1131`, `clientWidth 1131`), so horizontal overflow was not present to scroll.
  - `git diff --check` passed for touched files and `components/tables-2/core` stayed unchanged.

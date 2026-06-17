# Customer Service Table

## Status
Validated migration slice, 2026-06-16.

The `/community/customer-services` route now renders through `apps/www/src/components/tables-2/customer-service/*` while preserving the existing route, customer-service query, search filter, summary widgets, chart, work-order sheet params, and row actions.

## Behavior
- The route stays at `/community/customer-services`; no `/v2` route was added.
- Existing customer-service filters are preserved through `loadCustomerServiceFilterParams` and `useCustomerServiceFilterParams`.
- Existing data loading uses `trpc.customerService.getCustomerServices`; no new customer-service query was introduced.
- Existing Punchout employee loading is preserved through `trpc.hrm.getEmployees({ roles: ["Punchout"] })` for the assignment combobox.
- Existing row actions are preserved: assignment, status update, edit work order, and delete work order.
- The table supports persisted table-2 column visibility, sizing, ordering, dividers, sticky appointment column behavior, row selection, virtualized rows, and table-owned horizontal scrolling.
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

# Unit Invoices Table

## Status
Validated migration slice, 2026-06-16.

The `/community/unit-invoices` route now renders through `apps/www/src/components/tables-2/unit-invoices/*` while preserving the existing route, unit-invoice query, filter params, report menu, and invoice modal behavior.

## Behavior
- The route stays at `/community/unit-invoices`; no `/v2` route was added.
- Existing unit-invoice filters are preserved through `loadUnitInvoiceFilterParams` and `useUnitInvoiceFilterParams`.
- Existing data loading uses `trpc.community.getUnitInvoices`; no new unit-invoice query was introduced.
- Existing header behavior is preserved through `UnitInvoicesHeader`, including the existing `SearchFilterAdapter` and `UnitInvoicesReportMenu`.
- Row click and row actions still open the existing `editUnitInvoiceId` URL param and `UnitInvoiceModal`.
- The table supports persisted table-2 column visibility, sizing, ordering, dividers, sticky Unit column behavior, virtualized rows, existing sort URL state, and table-owned horizontal scrolling.

## Constraints Preserved
- No new unit-invoice `*V2` query was added.
- No new filter param or filter metadata endpoint was added.
- `apps/www/src/components/tables-2/core/*` was not modified.
- The old `apps/www/src/components/tables/unit-invoices/*` files were not removed because `apps/www/src/components/widgets/project-overview/index.tsx` still imports the legacy embeddable project overview table. Cleanup is deferred until that widget is migrated or no longer references the legacy folder.
- Browser validation exposed a `CustomModal` accessibility issue where custom ids overrode Radix-generated dialog title/description ids. `apps/www/src/components/modals/custom-modal.tsx` now lets Radix own generated ids for normal titles/descriptions while preserving hidden accessible labels and portal placeholders for the `titleAsChild` / `descriptionAsChild` path.

## Validation
- Focused Biome passed for the unit-invoices route, header, new `tables-2/unit-invoices` files, table settings/config files, and the `CustomModal` accessibility fix.
- Filtered `@gnd/www` typecheck produced no diagnostics for the touched unit-invoices route/table/header/settings/config files or `CustomModal` while the full workspace typecheck remains blocked by existing baseline errors.
- Import scans confirmed the route no longer imports `components/tables/unit-invoices`; the remaining legacy imports are limited to the project overview widget.
- `git diff -- apps/www/src/components/tables-2/core` was clean.
- `git diff --check` passed for the unit-invoices slice.
- HTTP smoke returned `200` for `/community/unit-invoices`.
- Browser smoke passed with Quick Login as Pablo Cruz / Super Admin:
  - desktop `/community/unit-invoices` rendered the header, existing `Search unit invoices...` input, table headers, virtualized invoice rows, no app error, no fresh console errors, and no document-level horizontal overflow.
  - desktop search updated the existing `q` URL param without fresh console errors.
  - mobile `390x844` `/community/unit-invoices` rendered rows, no app error, no fresh console errors, no document-level horizontal overflow, and table-owned horizontal scrolling.
  - row click opened `editUnitInvoiceId`, rendered the invoice modal, resolved Radix-generated dialog title/description ids, and produced no fresh console errors after the `CustomModal` fix.

# Sales Form Door Suppliers Table

## Purpose
The legacy sales form Door Suppliers chooser lets operators choose, add, edit, and delete supplier options that drive supplier-specific door pricing in the old sales form workflow.

## Current Implementation
- Surface: `apps/www/src/components/forms/sales-form/door-suppliers.tsx`
- Table module: `apps/www/src/components/tables-2/door-suppliers/*`
- Data source: existing `sales.getSuppliers`
- Mutations: existing `sales.deleteSupplier` plus `DoorSupplierForm` for create/edit
- Selection: existing `StepHelperClass.setDoorSupplier`

## Table Behavior
- Uses the legacy sales-form semantic table compatibility renderer.
- Does not use virtualization, fixed-height table-owned scrolling, DnD, draggable headers, resize handles, sticky columns, or persisted table settings.
- Clicking a supplier row selects it; edit and delete actions stop row-click propagation and keep their existing callbacks.
- The selected, supplier, and actions columns preserve their explicit widths and content alignment.
- Column widths:
  - Selected: `50/50/50`
  - Supplier: `180/320/220`
  - Actions: `92/120/104`

## Validation
- 2026-07-20: consolidated legacy sales-form table compatibility test passed with 3 tests, covering semantic table rendering, isolation from restarted table behavior, supplier selection wiring, conditional door columns, legacy sizing/alignment application, and the door-size modal viewport constraint.
- 2026-07-17: focused door-suppliers parity test passed with 4 tests / 34 assertions.
- 2026-07-17: full restarted table parity suite passed with 144 tests / 1354 assertions.
- 2026-07-17: touched-file filtered `@gnd/www` typecheck grep reported no diagnostics.
- 2026-07-17: non-test static scans found no `@gnd/ui/data-table` or old `table-sm` usage in the supplier chooser.

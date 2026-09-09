# Production table inline overdue date

## Status
Done

## Created Date
2026-09-09

## Request
Show a calendar icon beside overdue Production table dates and allow editing directly from the row, refreshing the list cache after saving.

## Checklist
- [x] Reuse existing Production date semantics and authorized assignment-edit action.
- [x] Add overdue-only calendar action with selection, Save/Cancel, pending lock and recoverable errors.
- [x] Refresh Production lists, calendars, summary and order-scoped pipeline queries after saving.
- [x] Keep mobile actions outside the order-opening button and preserve worker read-only access.
- [x] Complete final verification and documentation.

## Evidence
- Uses batchEditProductionOrdersAction with exactly one salesId and dueDate only. Server editProduction and canonical lifecycle guards remain authoritative; only active incomplete assignments change. Date-only normalization reuses createProductionDueDate.
- UI uses shared Button/Popover/Calendar primitives and a small cell component, following the inspected Midday invoice due-date pattern. No extra detail query runs when rendering table cells.
- Two focused rendered checks pass (8 assertions): overdue/incomplete/edit permission gating and no writes on render. Existing date/presentation/action checks pass13 tests (35 assertions).
- Fresh in-app Production tab: 09583PC shows the icon beside Yesterday. Clicking opens September8 selected with Save disabled; selecting September10 enables Save. Cancel closes the picker and retains the table. No customer date was saved during inspection.
- First typecheck found an incorrect event scope property; corrected to the existing sales-reference array contract. Final dashboard typecheck completed with existing repository-wide errors and no diagnostics in the changed runtime files (/tmp/gnd-inline-due-date-final-types.log).
- No schema, migration, API or permission contract change. Existing scheduling action is reused rather than adding a second write path.

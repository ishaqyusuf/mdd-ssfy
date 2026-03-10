# New Form Actual (Code Evidence)

Save history sidebar parity is now implemented:
- Summary/History tabs in invoice sidebar.
- History tab renders existing `SalesHistory` timeline.
- Draft/final save paths trigger `create-sales-history` task.

Anchors:
- `apps/www/src/components/forms/new-sales-form/sections/invoice-summary-sidebar.tsx`
- `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx`

Current parity status:
- Core history UX and save-trigger integration are present.
- Remaining validation: ensure old-form-equivalent detail density in timeline items.

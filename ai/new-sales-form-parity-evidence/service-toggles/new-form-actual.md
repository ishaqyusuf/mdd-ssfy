# New Form Actual (Code Evidence)

Service row toggles now include both:
- `taxxable`
- `produceable`

The row summary propagates both flags into line-level metadata for costing/workflow.

Anchors:
- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- `packages/sales/src/sales-form/domain/workflow-calculators.ts`

Current parity status:
- Tax + production switch parity implemented for service rows.

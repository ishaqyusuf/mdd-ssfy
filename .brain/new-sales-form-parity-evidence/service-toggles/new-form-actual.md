# New Form Actual (Code Evidence)

Service row toggles now include both:
- `taxxable`
- `produceable`

The row summary propagates both flags into line-level metadata for costing/workflow.
Multi-row package proof now verifies:
- parent `qty`, `unitPrice`, and `lineTotal` derive from `meta.serviceRows`.
- line-level `meta.taxxable` is true when any service row is taxable.
- line-level `meta.produceable` is true when any service row is produceable.
- grouped service display totals are derived from stored rows before stale parent totals.

Anchors:
- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- `packages/sales/src/sales-form/domain/workflow-calculators.ts`

Current parity status:
- Tax + production switch parity implemented for service rows.
- Package proof passing; browser proof pending behind the local auth/session gate.

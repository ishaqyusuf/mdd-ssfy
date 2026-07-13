# New Form Actual (Code Evidence)

Moulding calculator/package parity is implemented at the shared workflow layer:

- fresh selected moulding rows default to `qty: 1`.
- existing persisted moulding rows preserve their stored quantity.
- row totals include shared non-moulding component price, moulding component sales price, addon, and custom override.
- parent line `qty`, `unitPrice`, and `lineTotal` roll up from persisted `meta.mouldingRows`.
- grouped display totals now use the line workflow steps when adding shared component price back to persisted moulding rows.

Anchors:
- `packages/sales/src/sales-form/domain/workflow-calculators.ts`
- `packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts`
- `packages/sales/src/sales-form/ui/workflow/workflow-line-totals.ts`
- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`

Current parity status:
- Package proof passing.
- Browser calculator interaction proof is still pending behind the local auth/session gate.

# New Form Actual (Code Evidence)

Door estimate component-cost composition is now normalized across paths:
- shared door surcharge is derived from non-door steps.
- surcharge application now runs in both HPT panel row updates and door size modal apply path.
- persisted rows keep `meta.baseUnitPrice` and computed effective unit with surcharge.

Anchor:
- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`

Current parity status:
- Code path now consistently includes component surcharge in door estimate calculations.
- Runtime parity fixture comparison is still pending.

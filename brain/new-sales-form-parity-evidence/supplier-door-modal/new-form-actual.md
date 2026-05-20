# New Form Actual (Code Evidence)

Supplier-driven recalculation path in door size/qty modal is now aligned to shared pricing resolver:
- modal row derivation now uses `resolvePricingBucketUnitPrice(...)`
- supports supplier buckets with `salesPrice` / `basePrice` / `price` forms
- supplier key changes trigger row re-derivation when modal is open

Anchor:
- `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`

Current parity status:
- Supplier switch is implemented in code path; runtime fixture validation still pending.

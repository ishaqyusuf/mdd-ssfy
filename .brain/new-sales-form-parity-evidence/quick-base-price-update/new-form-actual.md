# New Form Actual (Code Evidence)

Quick base-price update is now available in door size/qty modal:
- row-level `B` action writes `meta.baseUnitPrice` from current unit value.
- pricing derivation falls back to persisted `baseUnitPrice` when applicable.

Anchors:
- `apps/www/src/components/forms/new-sales-form/sections/workflow-modals.tsx`

Current parity status:
- Inline quick base capture exists and persists through grouped row metadata.

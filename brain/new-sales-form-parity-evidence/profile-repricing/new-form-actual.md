# New Form Actual (Code Evidence)

Profile-change repricing behavior has explicit new-form handling:
- customer change resolves and applies `customerProfileId`.
- profile reprice effect now tracks both coefficient changes and profile-id changes.
- line repricing uses shared `repriceSalesFormLineItemsByProfile(...)` domain logic.

Anchors:
- `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- `apps/www/src/components/forms/new-sales-form/mappers.ts`
- `packages/sales/src/sales-form/domain/profile-repricing.ts`

Current parity status:
- Repricing trigger + engine wiring are implemented in code.
- Runtime fixture parity validation remains pending.

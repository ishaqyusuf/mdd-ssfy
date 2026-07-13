# New Form Actual (Code Evidence)

Profile-change repricing behavior has explicit new-form handling:
- customer change resolves and applies `customerProfileId`.
- profile meta changes now use the shared `setSalesFormCustomerProfileMeta(...)`
  reducer so profile id/payment term, repriced line items, and summary totals
  update in one state transition.
- the profile reprice effect still tracks both coefficient changes and
  profile-id changes as a safety net for async customer/profile data.
- line repricing uses shared `repriceSalesFormLineItemsByProfile(...)` domain
  logic.

Anchors:
- `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- `apps/www/src/components/forms/new-sales-form/store.ts`
- `apps/www/src/components/forms/new-sales-form/mappers.ts`
- `packages/sales/src/sales-form/domain/profile-repricing.ts`
- `packages/sales/src/sales-form/state/actions/meta.ts`

Current parity status:
- Repricing trigger + engine wiring are implemented in code with package proof.
- Runtime fixture parity validation remains pending behind the local auth/session
  gate.

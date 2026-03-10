# New Form Actual (Code Evidence)

Tax-rate resolution bug identified and patched:
- `customers.getTaxProfiles` previously returned only `taxCode/title`.
- UI tax selector derives `taxRate` from profile `percentage`; missing field forced `0` tax rate.
- API router now includes `percentage` in tax profile payload.

Anchor:
- `apps/api/src/trpc/routers/customer.route.ts`
- `apps/www/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`

Current parity status:
- Core tax-rate data path is now present for recalculation.
- Runtime parity fixture validation still required for complex transitions (discount/extras/payment method).

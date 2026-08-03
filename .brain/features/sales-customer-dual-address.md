# Sales Customer Billing And Shipping Addresses

## Behavior

- Customer creation and full customer editing opened from an order or quote use
  separate Billing Address and Shipping Address sections.
- Shipping defaults to `Same as billing`. While selected, the shipping fields
  are hidden and the sale receives the billing address id for both relations.
- Clearing the checkbox reveals an independent shipping draft. For an existing
  shared address, the draft starts with the billing values but not its id.
- Editing a sale customer checks `Same as billing` only when both assigned ids
  are non-null and equal. Distinct ids hydrate both sections independently.
- Generic customer-directory creation and address-only editing retain their
  single-address presentation.

## Persistence

- The customer upsert contract accepts optional sales context plus nested
  `billingAddress` and `shippingAddress` inputs while retaining the legacy flat
  input and `addressId` response alias.
- Sales-context upserts return `billingAddressId` and `shippingAddressId`.
  Billing is primary; distinct shipping is a second customer-owned row.
- New and legacy sales forms prefer the explicit pair and fall back to the
  legacy primary id so existing callers remain compatible.
- `customers.assignSalesAddress` verifies the office sale/customer pair and
  customer-edit permission, applies copy-on-write when an address is shared,
  and changes only the initiating sale's requested address relation.

## Sales Overview

- Edit Customer opens in the same Sales Overview secondary pane and reuses the
  complete General, Billing Address, Shipping Address, and same-address form.
- Edit/Add Billing Address and Edit/Add Shipping Address open in the existing
  `@gnd/ui/custom/sheet` secondary pane, not in another sheet overlay.
- Desktop keeps the Sales Overview primary pane visible while the sheet widens.
  Narrow screens replace the primary content with the secondary pane and expose
  the shared Back control.
- Every secondary pane owns its header and action footer. The Sales Overview
  primary footer is hidden while a secondary pane is active and restored on
  Back or Cancel; Back keeps the mounted draft while Cancel discards it.
- Successful saves publish `customer.changed`, refresh dependent sale data, and
  close only the address pane.

## Validation

- Focused API, permission, reconciliation, form-state, query-event, and sheet
  contract coverage protects the same/distinct address behaviors and
  copy-on-write assignment.
- Authenticated browser QA on order `09078VC` verified one sheet/dialog,
  customer and address pane headers/footers, same-address toggling, primary
  footer replacement, cancel/discard behavior, and the narrow mobile layout
  without submitting customer changes.
- No Prisma schema or migration is required.

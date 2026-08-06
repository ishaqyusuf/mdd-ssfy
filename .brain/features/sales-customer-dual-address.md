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
- When either relation is unassigned, the sales form displays the customer's
  primary address (or legacy customer address) for that billing or shipping
  slot. Explicitly shared ids retain the `Same as billing` presentation.
- `customers.assignSalesAddress` verifies the office sale/customer pair and
  customer-edit permission, applies copy-on-write when an address is shared,
  and changes only the initiating sale's requested address relation.

## Sales Overview

- Edit Customer opens in the same Sales Overview secondary pane and reuses the
  complete General, Billing Address, Shipping Address, and same-address form.
- Edit/Add Billing Address and Edit/Add Shipping Address open in the existing
  `@gnd/ui/custom/sheet-v2` secondary pane, not in another sheet overlay.
- Desktop keeps the Sales Overview primary pane visible while the sheet widens.
  Narrow screens replace the primary content with the secondary pane and expose
  the shared Back control.
- Every secondary pane owns its header and action footer. On wide layouts, the
  Sales Overview primary footer remains visible in its pane while the secondary
  footer renders beside it. Narrow layouts hide the primary pane and footer
  together. Back keeps the mounted draft while Cancel discards it. The primary
  footer stays fixed in its pane-owned bottom slot and does not move to the
  expanded sheet edge.
- Wide layouts preserve independent `2xl` primary and secondary widths with a
  1px divider. Narrow layouts show one pane at a time. Reveal/hide motion uses
  the shared 300ms/200ms Midday timing, and outside clicks close the secondary
  before the primary.
- Successful saves publish `customer.changed`, refresh dependent sale data, and
  close only the address pane.
- Existing address ids hydrate the secondary form before editing, and its
  submit action is consistently labeled `Save` for both Add and Edit modes.
- Billing and shipping forms expose an independent recipient name. Legacy
  unnamed rows hydrate with the customer display name, while explicitly named
  rows retain their own recipient; new shipping drafts use the billing address
  assigned to the open sale, not an arbitrary customer primary-address row.
- Selecting a Google Place populates street, unit, city, state abbreviation,
  ZIP (including suffix), country, coordinates, and place id from Google's
  structured address components, with legacy formatted-address fallbacks.
  Autocomplete filters use supported primary place types only so Google does
  not reject the entire request for an address-component-only type.
- Canonically fulfilled orders are immutable from every Sales Overview
  address-capable entry point. The direct address mutation and address-capable
  sales-context customer mutation enforce the same lifecycle guard server-side;
  customer-only identity/contact updates remain available without address writes.

## Validation

- Focused API, permission, reconciliation, form-state, query-event, and sheet
  contract coverage protects the same/distinct address behaviors and
  copy-on-write assignment.
- Authenticated browser QA on order `09078VC` verified one sheet/dialog,
  customer and address pane headers/footers, same-address toggling, primary
  footer replacement, cancel/discard behavior, and the narrow mobile layout
  without submitting customer changes.
- No Prisma schema or migration is required.
- Authenticated in-app browser QA on order `09158PC` reverified full customer,
  billing-only, and shipping-only panes with fixed widths, divider, animated
  open/close, layered dismissal, focus restoration, and the pane-owned primary
  footer without submitting customer changes.

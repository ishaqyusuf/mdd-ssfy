# Sales Customer Editing

## Status

Implemented on 2026-07-23; address-only Sales Overview editing added on
2026-07-24.

## Purpose

Allow authorized office users to edit the customer attached to a sale from the
new sales form or Sales Overview without first navigating to the customer
directory.

## User Behavior

- The new sales form shows separate `Edit` and `Change` actions for an assigned
  customer.
- `Edit` opens the existing customer form prefilled for that customer.
- `Change` opens the existing customer selector and changes the sale
  association only after a customer is selected.
- The canonical Sales Overview exposes `Edit customer` for the attached
  customer.
- Billing and shipping address cards expose independent Edit/Add actions for
  orders and quotes.
- Address actions open the existing customer sheet with only address search,
  address lines, route, city, state/province, postal code, and country. Name,
  email, and phone fields are not editable in this mode.
- A successful edit refreshes customer and sales projections without requiring
  the user to leave Sales Overview or manually reload the page.

## Data Integrity

- Editing a customer preserves the sale's current `customerId`.
- A distinct sale shipping address is preserved when the customer profile is
  refreshed.
- When the customer response omits an address, existing sale address ids are
  retained rather than cleared.
- Customer editing does not mutate sale totals, payments, inventory,
  production, or documents.

## Authorization

- Both the new sales form and Sales Overview require the existing
  `editSalesCustomers` capability before rendering the edit action.
- Dealer/read-only sales do not render the office customer-edit action.
- Server-side customer and address mutations require `editSalesCustomers` and
  reject dealer-owned customer data; UI gating is not the authorization
  boundary.

## Freshness

Successful `customers.createCustomer` and
`customers.createCustomerAddress` mutations emit `customer.changed`. The event
invalidates customer directory/overview/search reads, new-sales-form customer
resolution, Sales Customers, and Sales Overview projections. The event executor
supports the live tRPC options Proxy, and customer mutation completion waits for
the active local Sales Overview refetch before the editor's success handler
closes the sheet.

## Validation

- Authenticated order and quote browser tests submitted unchanged billing
  addresses through the address-only editor, verified that no personal fields
  were present, and confirmed that the editor closed while the active Sales
  Overview and list stayed refreshed.
- 49 focused tests / 95 assertions passed.
- Focused Biome, API and sales package typechecks, and scoped diff checks
  passed.
- Authenticated browser proof on office order `08890PC` verified both entry
  points and their prefilled editor without submitting customer changes.
- The broad WWW typecheck remains red on the existing repository-wide baseline;
  filtered output showed no new production diagnostic from this feature.
- The complete repository test run finished with 2,113 passing, 1 skipped, and
  25 existing unrelated failures; none were in the focused customer-editing
  set.
- Independent review found no documented-standards violations. Its two
  substantive spec findings were closed by enforcing `editSalesCustomers` at
  UI/API boundaries and preserving sale pricing profile, terms, and tax during
  direct reconciliation and later customer-query refreshes.
- A post-implementation regression report found that the overview remained
  stale after saving. The query-event executor's plain-object route guard was
  incompatible with the live tRPC options Proxy and stopped before every
  invalidation. Real-proxy regression coverage now verifies that
  `customer.changed` invalidates customer projections and
  `sales.getSaleOverview`; the focused query-event suite passes 31 tests / 65
  assertions.

## Related Plan

`.brain/plans/2026-07-23-bug-fix-sales-customer-editing-from-form-and-overview.md`

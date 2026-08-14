# Special Order Usability And Operational Override Addendum

## Destination

Publish an implementation-ready addendum to the existing Special Order
acknowledgment specification, then break it into tracer-bullet tickets covering
Sales Overview enrollment, customer approval ergonomics, customer-facing policy
and C.C.C presentation, and an audited role-configured approval override.

## Notes

Domain: GND internal dashboard Sales Orders and their public Special Order
approval experience. Preserve the canonical language in `CONTEXT.md` and the
revision-bound evidence and server-authoritative enforcement architecture in
ADR-053. Reuse the C.C.C principal/display contract in ADR-011 and ADR-016.

Starting implementation artifact:
[`../special-order-acknowledgment/spec.md`](../special-order-acknowledgment/spec.md).
The original 14-ticket implementation is complete; this map covers only the
approved 2026-08-14 follow-up.

Published implementation addendum:
[`spec.md`](./spec.md) (`ready-for-agent`). Approved pipeline comments remain on
the five child decision tickets; the implementation ticket breakdown is pending
its separate approval checkpoint.

Standing stakeholder constraints:

- Sales Overview must be able to enroll an eligible order as a Special Order
  through the same audience, customer-email, confirmation, reason, activity,
  and revision rules as the Sales Form. Enrollment and sending the approval
  request remain separate actions.
- The approval form displays the immutable customer snapshot name as a disabled
  Customer name field. It does not accept an alternate signer name.
- On small screens, Digital Signature opens a full-screen,
  landscape-optimized signing modal with rotate guidance and explicit OK and
  Cancel behavior; portrait remains usable because browser orientation locking
  is not reliable.
- Customer-facing approval and invoice/order documents display `Policy`
  without a visible version suffix. Internal policy history remains versioned.
- Customer invoice/order documents place the full policy in the left footer
  space beside the price summary. Operational documents retain compact status.
- Public approval totals use the canonical Sales C.C.C calculation and display
  `grandTotal`, applicable derived C.C.C, and `totalWithCcc` without changing
  accounting principal or double-charging.
- Add a role-configured `Override Special Order Approval` capability. It is
  additive to the operation's existing permission, applies to Signature
  Pending and Reapproval Required, does not override Customer Declined, and
  records attributable audit evidence for every override.

## Decisions so far

<!-- Approved pipeline comments will become the canonical decision detail. -->

## Not yet specified

None. The current frontier covers every known decision required for the
addendum specification.

## Out of scope

- Replacing immutable internal policy versioning or removing version data from
  settings, history, evidence, or audit records.
- Changing `SalesOrders.grandTotal` or `amountDue` to include C.C.C, or changing
  payment-ledger ownership of actual charged C.C.C.
- Allowing the override capability to grant purchasing, production, packing,
  or dispatch authority by itself.
- Overriding an explicit Customer Declined response.
- Employee-specific override toggles outside Role configuration.
- Quotes, dealership, storefront, or mobile Sales Form enrollment.
- Closing or rewriting the completed original Special Order implementation
  tickets.

# ADR-045: In-form customer-approved sales adjustments

## Status

Accepted

## Date

2026-08-04

## Context

Editing quantities on an order after payment, inbound, production, or
fulfillment work can change receivables, inventory demand, and customer money.
Treating the edit as an ordinary form save loses the approved before/after
evidence and can over-credit a wallet or invalidate downstream work. A separate
employee portal would also split one sales-editing task across interfaces.

## Decision

Keep editing and review inside the new sales form, but persist the proposed
revision as a separate adjustment aggregate. The current order stays effective
until a token-scoped customer approval is accepted and an idempotent background
job applies the exact approved snapshot.

Settlement is due-first: successful applied money is compared with the revised
order principal, and only the overpayment becomes wallet credit. Quantity
increases create due and never auto-charge. The apply job writes through the
existing legacy/canonical payment compatibility boundary and queues existing
inventory and sales-history jobs after commit.

Release one supports quantity changes to persisted lines only. It blocks
quantities below completed-production or fulfillment floors and marks other
operationally committed changes for review after application.

## Consequences

- Normal form saves cannot bypass approval when commitments exist.
- Customer rejection, expiration, stale source versions, and failed application
  leave the live sale unchanged and retain audit evidence.
- The employee shares a secure approval link manually; automated delivery is a
  later transport concern.
- New configured lines and external-provider refunds require future adapters and
  policy rather than partial raw-database writes.

## Alternatives Rejected

- Directly mutating the sale and recording a note afterward: approval and
  financial evidence would be retrospective.
- A separate internal adjustment portal: it duplicates the sales editor and
  makes the loaded baseline easier to lose.
- Crediting the full order-value reduction: this over-refunds partially paid
  orders instead of first reducing the outstanding balance.

# Square Refunds For Sales

## Destination

Publish an implementation-ready specification for an audited Sales-owned
Square Refund lifecycle that returns money to the original Square tender,
tracks provider truth through completion, applies explicit Sales Order
allocations, reconciles externally initiated refunds, and leaves implementation
ready to split into tracer-bullet tickets.

## Notes

Domain: GND Sales payments, Sales Orders, Finance, customer communication, and
the Square Payments/Refunds API. Every decision session must use the `grilling`
and `domain-modeling` skills and preserve the Square Refund and Wallet Credit
language in `CONTEXT.md`.

Starting architecture references:

- `.brain/features/sales-payment-v2-checkout.md`
- `.brain/features/sales-finance.md`
- `.brain/decisions/ADR-001-payment-and-resolution-boundaries.md`
- `.brain/decisions/ADR-011-derived-ccc-payment-channel-charge.md`
- `packages/square/src/index.ts`
- `packages/sales/src/payment-system/`
- `apps/api/src/db/queries/wallet.ts`

Standing stakeholder constraints approved before initialization:

- A Square Refund returns money to the original Square tender. It is not Wallet
  Credit, payment cancellation, order cancellation, or a return/RMA decision.
- Release one supports full and partial refunds for completed Square link,
  Terminal, and card payments with remaining refundable value.
- The dedicated role capability is `can.editRefundSquare`; ordinary payment
  editing does not grant Square-refund authority.
- The shared workflow is available from Sales Overview and Finance payment
  detail, with an explicit review/confirmation step, actor evidence, reason,
  amount, and allocation evidence. Dual approval and amount thresholds are not
  required in release one.
- Direct refund reasons cover payment corrections, duplicate charges, and
  overpayments. Cancellation or order-adjustment refunds must reference the
  completed commercial action that authorized the amount. Returns and exchanges
  are excluded.
- A refund spanning several Sales Orders requires explicit allocations whose
  total equals the provider refund. GND must never silently allocate everything
  to the first order.
- Complete cancellation or duplicate-charge refunds include the remaining
  customer charge, including applicable C.C.C and tip. Partial commercial
  adjustments default to principal; including C.C.C or tip requires explicit
  authorization and evidence. Square's retained processing fee is GND's cost.
- A provider refund is persisted as pending without changing confirmed applied
  payment or amount due. Confirmed balances change only after Square completion,
  while pending value is reserved against overlapping refund requests.
- Completion notifies the customer. Failure, rejection, or unusually long
  pending status notifies the initiator and Finance. Every transition appears
  in Sales Activity.
- Square refunds initiated outside GND are ingested, placed in Finance review,
  and manually allocated before local order balances change.
- Completing a refund can reopen a financial balance and Finance exception, but
  never rolls back production, packing, dispatch, fulfillment, or commercial
  order status automatically.
- A completed Square Refund is immutable. Correcting a mistaken refund requires
  a new customer payment; history is never deleted or rewritten.
- Original invoice principal remains unchanged. Refund outcome and resulting
  balance appear in payment history, Sales Activity, Finance, invoice/payment
  summaries, and the customer completion email. Pending and failed attempts are
  internal audit evidence.
- Release one processes new provider events from launch onward and offers a
  read-only reconciliation report for older Square refunds; bulk historical
  allocation/backfill is deferred.

## Decisions so far

- [Audit The Current GND Square Refund Path](./issues/01-audit-current-gnd-square-refund-path.md)
  — the active refund path is compatibility-only, can record false local
  completion, loses actual Square tender identity, misallocates multi-order
  refunds, and produces divergent financial/document projections.
- [Verify The Square Refund Provider Contract](./issues/02-verify-square-refund-provider-contract.md)
  — Square requires completed payments, durable idempotency, asynchronous
  provider truth, authenticated idempotent webhook handling, pending-value
  reservation, and read-side reconciliation; only `COMPLETED` posts locally.

## Not yet specified

None. The current ticket set captures every presently visible decision on the
route to the implementation-ready specification.

## Out of scope

- Wallet Credit, cash, check, Zelle, wire, gift-card, or other cross-method
  reimbursements.
- Product returns, exchanges, RMA policy, inventory disposition, or automatic
  commercial order cancellation.
- Automatic rollback of production, packing, dispatch, fulfillment, or order
  lifecycle state.
- Dual approval, refund amount thresholds, or a second refund-specific approval
  role in release one.
- Bulk historical refund allocation or rewriting historical invoices.
- Direct implementation inside this planning map; execution follows the
  published specification and separately approved tracer-bullet tickets.

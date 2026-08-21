# Square Refunds — Midday Migration Contract

Status: implemented and locally validated
Date: 2026-08-20
Source: approved Wayfinder map and issues 03–09

## Scope

Replace the unsafe legacy Square refund path with a forward-only, provider-aware
refund workflow. Redesign the Sales Overview Transactions tab so payments,
pending refunds, completed refunds, and remaining refundable amounts are visible
and actionable from one responsive workspace.

## Midday analogue

The reference is Midday's Transactions workspace:

- URL-backed selection and sheet state rather than an isolated modal.
- A table owns transaction presentation and row actions.
- A focused details/refund sheet owns mutation UX.
- API routers authorize and orchestrate; domain services own invariants.
- Provider mutations and reconciliation run in jobs, not in React or table code.

## Ownership boundaries

| Concern | Owner |
| --- | --- |
| Refund money, allocation, state-transition invariants | `packages/sales/src/payment-system/refunds` |
| Square API normalization and webhook verification | `packages/square` |
| Canonical tender/refund/event persistence | `packages/db` Prisma schema |
| Authorized queries and command submission | `apps/api` focused Sales Refund router |
| Provider submission, reconciliation, completion projection | `packages/jobs` |
| Transaction table, detail sheet, refund form | `apps/dashboard` Sales Overview components |
| Activity, documents, notification side effects | completion projection job using existing shared systems |

## Data and lifecycle contract

1. A Square tender is identified by the actual Square Payment ID. Payment-link
   IDs, order IDs, and Terminal checkout IDs are correlation identifiers only.
2. One immutable refund intent owns one durable Square idempotency key.
3. Provider status and local application status are stored independently.
4. `PENDING` reserves refundable value but does not change confirmed order
   balance or create the negative local payment projection.
5. Only Square `COMPLETED` may apply allocations and affect confirmed balances.
6. Completed refunds and their allocations are immutable.
7. Multi-order refunds require explicit allocations whose sum equals the refund
   principal. CCC and tip are explicit components; partial refunds default to
   principal only.
8. External Square refunds enter an unallocated Finance-review state and do not
   alter an order until a permitted user supplies allocations.
9. Webhooks are authenticated from the exact URL and raw body, deduplicated by
   Square event ID, and processed idempotently despite retries or reordering.
10. Historical payments without a verified Square Payment ID remain read-only.

## UI contract

- Transactions tab summary: received, completed refunds, pending refunds, net,
  and balance due.
- Transaction rows show method, provider status, gross, refunded, pending, net,
  affected orders, and a clear refund action.
- Row/details selection is URL-backed so refresh and back navigation preserve
  context inside Sales Overview.
- Refund form shows remaining refundable value, allocation controls, explicit
  CCC/tip fields, reason/note, and confirmation copy explaining pending status.
- The action is hidden or disabled without `can.editRefundSquare`; the server
  enforces the same permission.
- Pending, failed, external-review, and completed states have distinct messages
  and accessible labels. Keyboard and narrow-screen behavior are first class.

## Compatibility and rollout

- Development always selects Square sandbox even if an old local force-production
  flag remains from testing.
- The legacy Square branch in `resolvePayment` is blocked from initiating new
  refunds; non-Square resolution compatibility remains intact.
- Existing Square payment records are not silently guessed or rewritten. New
  verified tenders are captured going forward; historical candidates can be
  reconciled read-only.
- No production enablement occurs in this task. Production requires a separate
  cutover gate after sandbox acceptance.

## Acceptance gates

- Unit tests cover eligibility, remaining amount with pending reservations,
  allocation invariants, idempotency, status mapping, and immutable completion.
- Permission-boundary tests require `editRefundSquare` for every refund mutation.
- Sandbox tests prove development resolves to sandbox and exercise the configured
  Square sandbox client without creating a production mutation.
- Sales Overview displays payment and refund lifecycle accurately.
- Completed refunds appear in Sales Activity and the canonical Finance ledger;
  customer notification and document snapshot refresh are triggered once.
- Brain database, API, permission, feature, ADR, task, and progress records match
  the shipped behavior.

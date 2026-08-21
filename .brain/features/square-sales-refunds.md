# Square Sales Refunds

## Goal

Let authorized Sales and Finance operators refund a verified Square tender
without allowing provider failure, retries, external refunds, or multi-order
payments to corrupt GND balances or activity history.

## Scope

- Full and partial refunds against completed Square payments no older than one
  year, with at most 20 refunds per tender.
- Payment-level principal, C.C.C., and tip classification plus explicit frozen
  allocations to every affected Sales Order.
- Provider submission, webhook ingestion, reconciliation, local accounting,
  customer/internal notifications, and Finance exceptions.
- Shared Sales Overview and Sales Finance refund detail/action experience.
- External Square refunds enter Finance review until an authorized operator
  supplies exact allocations.
- Wallet credits and non-Square payment corrections remain separate workflows.

## Flow

1. GND captures the actual completed Square `Payment.id` in
   `SquareTenderPayment` when a payment-link or Terminal payment settles.
2. The operator opens the shared refund sheet from Sales Overview Transactions
   or a Square-backed Sales Finance payment.
3. The server resolves the tender, validates eligibility and remaining capacity,
   requires `editRefundSquare`, freezes cents-based allocations and commercial
   evidence, and reserves the amount before provider submission.
4. A job submits the immutable intent using its persisted idempotency key.
   Webhooks and hourly reconciliation converge the latest Square status.
5. Only provider `completed` permits the idempotent local accounting apply.
   Failed/rejected states release the reservation; pending stays reserved.
6. Completion posts the canonical refund and per-order compatibility
   projections, rebuilds due amounts, writes activity/audit evidence, refreshes
   sales documents, and sends the appropriate customer and internal notices.

## Data Model

- `SquareTenderPayment`: verified provider payment identity, amount, currency,
  source, legacy/link/Terminal references, provider metadata, and settlement
  evidence.
- `SalesSquareRefund`: immutable intent and provider/local state, component
  totals, reservation, reason, commercial-action reference, actor, idempotency
  key, provider id, failure details, and timestamps.
- `SalesSquareRefundAllocation`: frozen per-order principal/C.C.C./tip amounts
  and original/applied Sales Payment links.
- `SalesSquareRefundTransition`: append-only provider/application transition
  evidence.
- `SquareRefundWebhookEvent`: raw-payload event inbox deduplicated by Square
  event id.

Provider states are `not_submitted`, `pending`, `completed`, `failed`, and
`rejected`. Application states are `reserved`, `awaiting_allocation`,
`ready_to_apply`, `applying`, `applied`, and `apply_failed`.

## APIs

- `salesRefunds.overview`: payment/refund projection for one Sales Order using
  the same shared viewer boundary as the canonical Sales Overview.
- `salesRefunds.create`: protected GND-origin immutable refund command.
- `salesRefunds.retry`: retries the same intent/idempotency key.
- `salesRefunds.externalReview`: Finance review queue for external refunds.
- `salesRefunds.allocateExternal`: exact allocation command for an external
  completed refund.
- `POST /api/webhooks/square/refunds`: raw-body, exact-URL signature-verified
  Square refund webhook.
- Scheduled jobs process and reconcile refund state and age escalations.

## UI

- Sales Overview Transactions presents received, completed refund, pending,
  net, and due totals; responsive payment/refund rows; and a payment detail
  secondary pane controlled by `salesTransaction` and `salesRefund` URL state.
  Sales Finance continues to reuse the standalone shared detail sheet.
- Authorized users see the refund composer with verified tender evidence,
  amount components, eligible-order allocation, reason/note, commercial-action
  basis/reference, immutable confirmation, and provider/application timeline.
- Sales Finance payment detail reuses the same refund sheet. Review exposes an
  external-refund queue and manual multi-order allocation workflow.

## Edge Cases

- Pending refunds reserve capacity, including across retries and reconciliation.
- Client input never supplies a Square Payment id; the server resolves it from
  the canonical tender.
- Duplicate or out-of-order webhooks are safe; event id and provider refund id
  are durable idempotency boundaries.
- External refunds never guess allocations or alter Sales balances before
  Finance supplies an exact split.
- Completed/applied refunds cannot be edited or deleted.
- A refund that reopens a fulfilled/delivered order creates a Finance resolution
  case without changing the commercial or operational lifecycle state.
- Square-retained processing fees remain merchant cost metadata and never
  reduce the customer's approved refund.

## Validation

- 32 focused tests / 326 assertions cover environment selection, refund-domain
  invariants, dedicated command permission, and the legacy Square boundary.
- A real Square sandbox `$1.00` payment completed and was refunded completely;
  both resources reported `COMPLETED` and referenced the same provider payment.
- Authenticated desktop and mobile browser QA covered the redesigned Sales
  Overview Transactions surface and the Sales Finance refund review surface.
- Regression validation on 2026-08-21 confirmed a Sales Team operator can load
  order `09388PC` Transactions after consolidating the read boundary; the page
  displayed payment `#11935`, `$1,127.12` received/net, and no refund/error.
- Refund-composer follow-up on 2026-08-21 moved Sales Overview refunds into the
  existing secondary pane instead of opening a nested generic sheet. A
  one-order partial refund now keeps its principal allocation synchronized.
- Refund eligibility accepts both canonical `SalesPayments.squarePaymentsId`
  evidence and legacy `SquarePaymentOrders` rows. New Terminal settlements
  persist the legacy order links, while historical verified Terminal tenders
  remain refundable through their direct Sales Payment association.
- Authenticated local Square sandbox QA on `09396PC` submitted a `$4.00`
  partial refund against Payment `#11952`. The request reserved exactly `$4.00`
  and Activity displayed the provider `pending` transition. Provider completion
  remains webhook/hourly-reconciliation driven.

## Follow Up

- Before production enablement, configure the production webhook subscription,
  perform the separately approved controlled low-value production proof, and
  monitor pending/reconciliation alerts. Historical ambiguous tenders remain
  report-only rather than being inferred.

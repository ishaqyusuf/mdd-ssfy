# Square Refund Provider Contract

Retrieved: 2026-08-19  
Scope: Current Square first-party documentation only. This note describes the provider contract that the GND Square refund workflow must respect; it does not define GND's commercial approval policy.

## Executive conclusion

Square refunds are asynchronous provider resources, not synchronous reversals. GND should create one durable local refund intent, call `RefundPayment` once per logical refund using a persisted idempotency key, and then converge local state from the returned `PaymentRefund`, verified webhooks, and read-side reconciliation. Only `COMPLETED` is provider success. `PENDING` reserves capacity but must not be posted as a completed refund; `REJECTED` and `FAILED` are terminal non-success states.

## 1. Eligibility and refundable amount

The current [`RefundPayment` endpoint](https://developer.squareup.com/reference/square/payments-api/refund-payment) supports full and partial refunds and requires `PAYMENTS_WRITE`. For a linked refund, `payment_id` identifies the original Square payment; when `destination_id` is omitted, Square normally returns funds to the original payment source.

Square's [`Refund Payments` guide](https://developer.squareup.com/docs/payments-api/refund-payments) imposes these limits:

- The payment must be `COMPLETED`. An `APPROVED` card payment cannot be refunded and must instead be canceled or completed first.
- The original payment must be no more than one year old.
- A payment ID can have at most 20 refunds.
- The cumulative refund cannot exceed the amount originally collected.
- The endpoint defines the maximum new refund amount as `payment.total_money - sum(previously COMPLETED refund amounts)`; amount and currency are supplied in the currency's smallest denomination and the currency must match the business/payment currency.

The documented amount formula mentions completed refunds, not pending ones. Square also defines `REFUND_ALREADY_PENDING` as an error condition in its [`ErrorCode` reference](https://developer.squareup.com/reference/square/enums/ErrorCode). GND should therefore treat every locally submitted `PENDING` refund as reserved capacity and prevent overlapping attempts rather than assume Square will arbitrate concurrent requests safely.

The endpoint also offers the beta `payment_version_token`. When supplied, Square rejects a stale payment version with `VERSION_MISMATCH`; when omitted, the refund proceeds without this optimistic-concurrency check. This can supplement, but should not replace, GND's own per-payment serialization and balance reservation.

## 2. Idempotency and request retries

`RefundPayment` requires an `idempotency_key` of at most 45 characters. Square's [`Idempotency` documentation](https://developer.squareup.com/docs/build-basics/common-api-patterns/idempotency) and [`Using the REST API`](https://developer.squareup.com/docs/build-basics/general-considerations/using-rest-api) establish the retry behavior:

- Retrying an identical operation with the same idempotency key does not create another resource; Square returns the existing/original successful result.
- Reusing the same key with changed request data produces `400 IDEMPOTENCY_KEY_REUSED`.
- An ambiguous outcome such as a client timeout should therefore be retried with the same key and byte-equivalent business inputs, never a newly generated key.

Provider-facing consequence: persist the idempotency key before the first network attempt and bind it permanently to one immutable logical refund amount, payment, destination, and application-fee allocation. A new key is appropriate only for a genuinely new refund intent. Square's [`Handling Errors` guide](https://developer.squareup.com/docs/build-basics/general-considerations/handling-errors) recommends exponential backoff with jitter for rate limiting; retries must still preserve the original idempotency key.

## 3. Provider lifecycle and timing

For the modern V2 resource, the canonical [`PaymentRefund` status](https://developer.squareup.com/reference/square/objects/PaymentRefund) values are:

| Status | Provider meaning | GND accounting meaning |
| --- | --- | --- |
| `PENDING` | Square is securing seller funds or moving funds back to the buyer. | Reserve the requested amount and show pending; do not reduce confirmed paid allocations. |
| `COMPLETED` | Square approved the refund and sent funds to the buyer's payment card. | Post the refund exactly once and update confirmed financial balances. |
| `REJECTED` | Square rejected the refund; the buyer is not credited. | Release the reservation and create a finance exception. |
| `FAILED` | The refund failed; the buyer is not credited. | Release the reservation and create a finance exception. |

Square says most pending refunds complete within a few hours. For card and bank-transfer payments, the maximum documented `PENDING` time is 14 days; the seller should contact Square Support if it remains pending beyond that. A refund can bypass `PENDING` and go directly to a terminal status. These rules come from the [`Refund Payments` guide](https://developer.squareup.com/docs/payments-api/refund-payments).

`COMPLETED` is a provider guarantee that the refund amount was sent, not proof that the buyer can already see the credit in their bank account. The developer guide says appearance can take 7–10 business days depending on the bank. Square's seller-facing [`Manage customer refunds`](https://squareup.com/help/us/en/article/6116-process-refunds) article describes the wider operational expectation: Square typically processes in 2–7 business days and the issuing bank can take a further 2–7 business days, for as much as 4–14 business days end to end. Customer messaging should distinguish "completed by Square" from "visible at your bank."

Square's first-party pages are not perfectly consistent about whether failure to secure seller funds ultimately appears as `FAILED` or `REJECTED`: the Refunds API overview describes `FAILED`, while the detailed guide describes unavailable seller and linked-bank funds under `REJECTED`. The safe contract is to treat both as terminal non-success, persist Square's exact returned status and errors, and never infer buyer credit from the cause alone.

Do not use the legacy V1 `Refund`/`RefundStatus` value `APPROVED` as the success state for this workflow. The modern `PaymentRefund` resource uses `COMPLETED`.

## 4. Refund webhooks and externally initiated refunds

Subscribe to `refund.created` and `refund.updated`, both of which require `PAYMENTS_READ`. Square's [`Refunds API Webhooks` guide](https://developer.squareup.com/docs/refunds-api/webhooks) explicitly states that these notifications cover refund activity for the seller regardless of which Square product or Square API application initiated it.

- `refund.created` is emitted for `RefundPayment` calls and when a seller refunds through Square Point of Sale, Square Terminal, or other Square products.
- `refund.updated` is emitted when any field on the refund changes, commonly when status changes to completed. It is not exclusively a status-change event.
- A Point of Sale refund webhook does not include POS `Note` data. A `reason` supplied through `RefundPayment` is returned in the notification.

Consequently, a provider refund ID that GND did not create is not noise or an automatic duplicate. It is an externally initiated refund that must be imported into an unallocated/review state and reconciled to the original Square payment before GND changes Sales allocations.

## 5. Webhook trust, deduplication, and delivery behavior

Every notification must be authenticated before any data is processed. Square's [`Verify and Validate an Event Notification`](https://developer.squareup.com/docs/webhooks/step3validate) requires checking `x-square-hmacsha256-signature` using the subscription signature key, the exact notification URL, and the raw request body. Invalid signatures must be discarded, and signature comparison should use a constant-time crypto implementation.

The [`Square Webhooks` overview](https://developer.squareup.com/docs/webhooks/overview) defines the delivery contract:

- Acknowledge receipt with a `2xx` response as soon as possible; the response window is 10 seconds.
- A missing or non-`2xx` acknowledgement triggers retries and therefore duplicate deliveries.
- Square retries with exponential backoff for up to 24 hours, after which the notification is discarded.
- Most notifications arrive in under 60 seconds, but delivery order is not guaranteed.
- Retried deliveries include `square-retry-number` and `square-retry-reason` headers.

The [`refund.updated` event reference](https://developer.squareup.com/reference/square/webhooks/refund.updated) defines `event_id` as unique for the event. GND should enforce a durable uniqueness constraint on `event_id`, acknowledge only after the event is durably recorded, and process through an idempotent inbox/worker. Because arrival order is not guaranteed, the worker should upsert by Square refund ID and converge from the newest Square resource state (fetching it when necessary), rather than blindly apply status transitions in arrival order.

## 6. Fees and buyer refund amount

Square's [`Refund a Payment with an Application Fee`](https://developer.squareup.com/docs/payments-api/collect-fees/payment-with-app-fee-refund) guide states that Square retains the processing fees from the original transaction. Those retained fees are a merchant cost and must not be deducted from the customer's approved refund amount.

Application fees are separate from Square processing fees. By default, Square refunds an application fee proportionally: all of it for a full refund, and the proportional amount for a partial refund. `app_fee_money` or `app_fee_allocations` can control that behavior when the original payment used application fees and the caller has the necessary permission.

The [`PaymentRefund` object](https://developer.squareup.com/reference/square/objects/PaymentRefund) includes `processing_fee` entries for provider fee assessments and adjustments. GND should retain these returned values for finance reconciliation and should not derive provider fees from the buyer refund amount.

## 7. Errors and disputes

The current [`RefundPayment` error contract](https://developer.squareup.com/reference/square/payments-api/refund-payment) includes, among others:

- `PAYMENT_NOT_REFUNDABLE`, including a payment that is too old.
- `PAYMENT_NOT_REFUNDABLE_DUE_TO_DISPUTE` when the payment has been disputed.
- `REFUND_AMOUNT_INVALID` when the requested amount exceeds the amount available.
- `REFUND_DECLINED` when the issuer declines the refund.
- `REFUND_ERROR_PAYMENT_NEEDS_COMPLETION` when the payment is still approved rather than completed.
- Permission, card mismatch/invalid card, and unsupported brand, country, currency, instrument, or source errors.

The [`Refunds API` reference](https://developer.squareup.com/reference/square/refunds-api) adds that if Square cannot secure the funds, the buyer receives no credit and future refunds to that payment are not allowed; the seller must reimburse the buyer by another means.

A dispute is not a retryable refund failure. `PAYMENT_NOT_REFUNDABLE_DUE_TO_DISPUTE` should stop automated refund submission and route to finance/dispute handling. Square's [`Disputes API`](https://developer.squareup.com/docs/disputes-api/overview) is a separate chargeback lifecycle with its own states, deadlines, evidence, and webhooks. GND must not manufacture a successful local refund to compensate for a disputed payment.

## 8. Read APIs and reconciliation

The supported recovery path is layered:

1. [`GetPaymentRefund`](https://developer.squareup.com/reference/square/refunds-api/get-payment-refund) retrieves the authoritative `PaymentRefund` by refund ID and requires `PAYMENTS_READ`. Use it after an ambiguous create response, for pending-status refreshes, and when an out-of-order webhook needs confirmation.
2. [`ListPaymentRefunds`](https://developer.squareup.com/reference/square/refunds-api/list-payment-refunds) retrieves account refunds with created-time and updated-time windows, location/status/source filters, pagination, and a maximum/default page size of 100. Results are eventually consistent and can lag by several seconds. An incremental reconciliation job should sort/filter on `UPDATED_AT`, use an overlap window, paginate fully, and upsert idempotently.
3. The [`Retrieve Refunds` guide](https://developer.squareup.com/docs/refunds-api/retrieve-refunds) states that `Payment.refunded_money` is the total refunded amount and `Payment.refund_ids` lists its one or more partial refunds. Fetch each referenced refund when verifying a payment. A refund's `order_id` identifies a refund order distinct from the original payment's order.
4. Square's beta [`Events API`](https://developer.squareup.com/docs/events-api/overview) can recover missed webhook events for the previous 28 days. It must be enabled, is application-owned, and requires the application's personal access token rather than a seller OAuth token. It is a supplemental disaster-recovery mechanism, not a replacement for refund reads and webhooks.

At minimum, GND's provider record should preserve Square refund ID, original payment ID, location ID, amount/currency, exact provider status, reason, created/updated timestamps, refund order ID, destination type, processing-fee data, locally persisted idempotency key, verified webhook event IDs, and enough raw provider response metadata to audit reconciliation.

## Required GND invariants derived from the contract

- Never call Square until the local immutable refund intent and its idempotency key are durable.
- Never reuse an idempotency key for changed inputs, and never generate a new key merely because a response was lost.
- Never expose more refundable capacity than the original payment minus completed and reserved pending refund amounts.
- Never post a local completed refund until Square reports `COMPLETED`.
- Treat `REJECTED` and `FAILED` as no-credit outcomes requiring explicit exception handling.
- Do not assume webhooks are unique, ordered, immediate, or sufficient for recovery.
- Import and review Square refunds created outside GND.
- Reconcile from `GetPaymentRefund`/`ListPaymentRefunds`; use Events API only as an additional short-window recovery source.
- Keep Square processing fees separate from the buyer refund amount and from any GND customer charge/service-charge policy.

## Official sources

- [Refund Payments guide](https://developer.squareup.com/docs/payments-api/refund-payments)
- [RefundPayment API reference](https://developer.squareup.com/reference/square/payments-api/refund-payment)
- [PaymentRefund object](https://developer.squareup.com/reference/square/objects/PaymentRefund)
- [Refunds API reference](https://developer.squareup.com/reference/square/refunds-api)
- [Refunds API Webhooks](https://developer.squareup.com/docs/refunds-api/webhooks)
- [Square Webhooks overview](https://developer.squareup.com/docs/webhooks/overview)
- [Verify and Validate an Event Notification](https://developer.squareup.com/docs/webhooks/step3validate)
- [Idempotency](https://developer.squareup.com/docs/build-basics/common-api-patterns/idempotency)
- [Using the REST API](https://developer.squareup.com/docs/build-basics/general-considerations/using-rest-api)
- [Handling Errors](https://developer.squareup.com/docs/build-basics/general-considerations/handling-errors)
- [Refund a Payment with an Application Fee](https://developer.squareup.com/docs/payments-api/collect-fees/payment-with-app-fee-refund)
- [GetPaymentRefund](https://developer.squareup.com/reference/square/refunds-api/get-payment-refund)
- [ListPaymentRefunds](https://developer.squareup.com/reference/square/refunds-api/list-payment-refunds)
- [Retrieve Refunds](https://developer.squareup.com/docs/refunds-api/retrieve-refunds)
- [Events API](https://developer.squareup.com/docs/events-api/overview)
- [Manage customer refunds](https://squareup.com/help/us/en/article/6116-process-refunds)
- [Disputes API](https://developer.squareup.com/docs/disputes-api/overview)

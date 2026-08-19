# Verify The Square Refund Provider Contract

Type: research
Status: closed
Blocked by: None
Parent: [`../map.md`](../map.md)

## Question

What current Square Payments/Refunds API constraints govern eligible payments,
remaining refundable amount, idempotency, pending/completed/failed/rejected
states, webhook delivery, externally initiated refunds, processing fees,
provider reconciliation, and customer settlement timing?

## Research output

[`../research/square-refund-provider-contract.md`](../research/square-refund-provider-contract.md)

## Comments

### Resolution

Square permits full or partial refunds only for completed payments no older
than one year, with at most twenty refunds per payment. One immutable local
intent must persist and reuse its provider idempotency key. Only provider
`COMPLETED` is accounting success; pending value must be reserved locally, and
failed/rejected outcomes release it without posting a refund. Verified
`refund.created` and `refund.updated` webhooks cover other Square products and
applications but can be duplicated, delayed, retried, and unordered, so GND
also needs idempotent Get/List reconciliation. Square retains original
processing fees.

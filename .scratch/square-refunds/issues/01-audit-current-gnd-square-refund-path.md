# Audit The Current GND Square Refund Path

Type: research
Status: closed
Blocked by: None
Parent: [`../map.md`](../map.md)

## Question

What Square-payment, refund, payment-ledger, wallet, resolution, document,
notification, permission, and Sales Order balance paths exist today; which are
canonical versus compatibility-only; and where can the current behavior record
local completion before provider truth, lose idempotency, misallocate a refund,
or leave projections inconsistent?

## Research output

[`../research/current-gnd-square-refund-path.md`](../research/current-gnd-square-refund-path.md)

## Comments

### Resolution

The active refund execution is compatibility-only and unsafe as a provider
lifecycle. It can commit local completion after Square failure, commonly sends
a placeholder or Terminal checkout id instead of the Square tender payment id,
allocates the whole refund to an unordered first Sales Order, has no durable
pending/idempotency/webhook state, and leaves Finance, daily reporting, stored
balances, notifications, and documents on conflicting projections. The shared
payment-system package, canonical ledger/allocation tables, document lifecycle,
and notification adapters are reusable foundations, but a new canonical refund
aggregate and command boundary must own provider truth.

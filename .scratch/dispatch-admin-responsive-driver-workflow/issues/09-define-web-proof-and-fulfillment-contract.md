# Define Web Proof Completion And Fulfillment Contract

Type: grilling
Status: open
Blocked by: 01, 05
Parent: [`../map.md`](../map.md)

## Question

How should the responsive website capture recipient identity, signature,
photos, notes, completion type, arrival evidence, and failed-delivery reasons
while preserving the existing resumable and idempotent proof contract? Define
browser storage/recovery, weak-network behavior, request identity, upload
limits, retry messaging, permission checks, and the precise distinction between
Delivered and Fulfilled.

The answer must keep final inventory consumption and fulfillment on the server
and must not treat a client-side success screen as terminal evidence.

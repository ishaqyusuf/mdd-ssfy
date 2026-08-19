# Define The Shared Dispatch Lifecycle

Type: grilling
Status: open
Blocked by: 02, 03, 04
Parent: [`../map.md`](../map.md)

## Question

What shared lifecycle should admin and driver surfaces display from backlog to
fulfillment, including assignment, packing in progress, approval requested,
packing blocked, partially packed, ready to load, in transit, arrived,
delivered, fulfilled, failed, returned, cancelled, and rescheduled states?
Define which states are authoritative transitions versus derived display or
exception overlays, the permitted next actions in each state, and the behavior
for partial quantities and changed assignments.

The answer must keep assignment, packing readiness, trip state, delivery proof,
exception state, and final fulfillment distinct.

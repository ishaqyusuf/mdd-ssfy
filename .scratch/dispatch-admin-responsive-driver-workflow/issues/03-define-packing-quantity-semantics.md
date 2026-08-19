# Define Packing Quantity Semantics

Type: grilling
Status: open
Blocked by: None
Parent: [`../map.md`](../map.md)

## Question

What is the exact row and quantity grain the driver verifies: sales door/item,
shipment line, inventory component, or a grouped presentation backed by more
than one of these? Define requested, produced, physically available, packed,
short, remaining, and previously delivered quantities; partial-packing rules;
whether zero is allowed; and how a reduced shipped quantity affects the current
dispatch, later backorder/reattempt work, customer documents, and the unchanged
commercial Sales Order.

The answer must preserve split-delivery allocation ownership and distinguish a
physical shortage from stale production or inbound administration.

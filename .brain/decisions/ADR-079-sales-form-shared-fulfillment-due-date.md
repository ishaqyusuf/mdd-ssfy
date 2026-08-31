# ADR-079: Sales Form Shared Fulfillment Due Date

## Status

Accepted — 2026-08-31

## Context

The New Sales Form exposed payment Due and Delivery Due as separate controls,
even though order entry treats them as one customer-facing fulfillment
commitment. Keeping both editable allowed the order-level dispatch default to
drift from the date shown as Due. Production remains a separate planning
commitment.

## Decision

For New Sales Form orders, `paymentDueDate` is the visible Fulfillment due date
and remains governed by the existing Net-term behavior. Every manual or
term-derived change writes the same value to `deliveryDueDate`, and the shared
save-payload composer normalizes `deliveryDueDate` from `paymentDueDate` before
persistence.

`prodDueDate` remains independent. Created production assignments and
dispatches continue to own their operational schedules; this decision changes
only the order-level planning default described by ADR-076.

The order-entry Fulfillment choice is limited to Pickup and Delivery. The
broader compatibility schema may continue accepting historical Ship values,
but New Sales Form surfaces do not offer Ship.

## Consequences

- Order entry has one visible Fulfillment due date instead of competing Due and
  Delivery Due controls.
- Existing records with different order-level values converge on the visible
  `paymentDueDate` the next time the shared sales-form payload is saved.
- Payment aging and new-dispatch initialization use the same order-level date.
- Production planning stays independent, and existing operational rows are not
  rewritten.

## Superseded Decision

ADR-076 remains authoritative for order defaults versus created operational
records. Its rejected alternative against reusing payment due for the dispatch
default is superseded for New Sales Form orders by this decision.

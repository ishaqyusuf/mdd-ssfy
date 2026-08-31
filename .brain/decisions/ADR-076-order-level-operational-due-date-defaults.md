# ADR: Order-Level Operational Due Date Defaults

## Status

Accepted

## Context

Production assignments and dispatches need dates before their operational rows
exist. Re-entering those dates for every assignment or dispatch creates avoidable
work, while treating an eventual assignment or dispatch date as order metadata
would blur planning intent with an executed schedule.

## Decision

`SalesOrders.prodDueDate` and `SalesOrders.deliveryDueDate` are the canonical
order-level planning defaults. New production assignments initialize from
`prodDueDate`; new dispatch plans initialize from `deliveryDueDate`.

`OrderItemProductionAssignments.dueDate` and `OrderDelivery.dueDate` remain the
canonical schedules for their created operational records. Operators may edit
those dates without rewriting the order-level defaults.

## Alternatives

- Store delivery intent only in `SalesOrders.meta.newSalesForm.form`. Rejected
  because operational queries would depend on compatibility JSON.
- Create an `OrderDelivery` while saving the sales form. Rejected because a
  planning default must not create executable dispatch work prematurely.
- Reuse payment or production due dates for dispatch. Rejected because the
  dates describe different business commitments.

## Consequences

- Sales Form users set production and delivery intent once.
- Assignment and dispatch creation retain their independent editable schedules.
- Existing orders with no saved default continue to use the established empty
  production date or current-day dispatch fallback.
- Hosted environments must apply the additive nullable-column migration before
  deploying code that selects `deliveryDueDate`.

## Implementation Notes

- Migration: `20260830110000_add_sales_delivery_due_date`.
- New Sales Form save/bootstrap paths project both fields through the relational
  `SalesOrders` row and the compatibility form metadata.
- Fulfillment backlog rows expose `deliveryDueDate` only to initialize the
  planner; `dispatch.createDispatches` still receives an explicit date for every
  created dispatch.

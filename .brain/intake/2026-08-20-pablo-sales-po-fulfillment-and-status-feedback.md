# Brain Intake: Pablo Sales P.O., Fulfillment, And Status Feedback

## Status
Partially Complete

## Created Date
2026-08-20

## Last Updated
2026-08-20

## Raw Input
Pablo reported that an order P.O. value is deleted after opening and saving the
order, asked for the P.O. number to be restored inside Global Invoice Details,
reported that employee Donovan cannot mark orders fulfilled because the flow
returns an inventory-permission error, and noted that he did not receive a
clear final update describing what was fixed and ready to use. The 30-second
video showed the Sales Orders list, order `09353PC`, and the new sales form
invoice summary while Pablo described the P.O. loss and missing field.

## Generated Plans
- [x] Preserve and restore sales P.O. data in the new form - `.brain/plans/2026-08-20-bug-fix-sales-po-persistence-and-invoice-details.md` - Status: Approved
- [x] Add a dedicated Mark Sales Order Fulfilled permission - `.brain/plans/2026-08-20-bug-fix-sales-fulfillment-permission-alignment.md` - Status: Done
- [x] Standardize client-ready delivery status updates - `.brain/plans/2026-08-20-docs-client-delivery-status-reporting.md` - Status: Approved

## Recommended Execution Order
1. Preserve and restore sales P.O. data in the new form - the current behavior can silently destroy customer purchase-order data and the client supplied a concrete production example.
2. Add a dedicated Mark Sales Order Fulfilled permission - fulfillment is blocked for an employee and the action needs an explicit least-privilege server boundary.
3. Standardize client-ready delivery status updates - close the communication gap after the product defects have explicit owners and validation states.

## Agent Recommendations
- Preserve and restore sales P.O. data in the new form: open-code - bounded sales-form hydration, persistence, UI, and regression coverage.
- Add a dedicated Mark Sales Order Fulfilled permission: antigravity - cross-boundary UI, tRPC, task, session-permission, and audit analysis is required before changing authorization.
- Standardize client-ready delivery status updates: open-code - bounded documentation/template and workflow checklist work.

## Merged Items
- The video reports both P.O. deletion and the missing Global Invoice Details P.O. control. They are merged because they share one metadata authority, editor surface, save path, and end-to-end acceptance matrix.
- Pablo's three fulfillment messages are merged into one permission-alignment ticket because they describe one failed Mark Fulfilled outcome and one inventory-permission error.

## Duplicate Or Existing Items
- The P.O. report reopens behavior previously completed by `Sales P.O. Persistence And Address-Only Overview Editing` and `.brain/bugs/sales-po-save-update-depth.md`. It is not skipped: current production evidence indicates a regression, and `.brain/features/sales-form-system-hardening.md` deliberately hid the new-form P.O. control on 2026-08-05.
- Fulfillment status actions and inventory permission boundaries already exist in `.brain/features/sales-order-status-actions.md`, `.brain/features/inventory-backed-sales-fulfillment.md`, `.brain/api/permissions.md`, and ADR-025. No existing task specifically covers Donovan's Mark Fulfilled failure.
- No existing plan was found for a client-facing end-of-day delivery-status contract.

## Needs Clarification
- Confirm which operational role Donovan is intended to perform for fulfillment (`editOrders`, `editPickup`, `editDelivery`, or `viewPacking`). Do not interpret “everyone” as authorization to grant fulfillment writes to all employees.

## Skipped Items
- Pablo's “are you back to work” message and the user's hospital response are scheduling context, not project tickets.
- The August 19 refund-button discussion was outside the requested “today” scope and was not added to this intake.

## Approval Notes
- User approved all three generated plans on 2026-08-20. Each plan was marked
  Approved and its companion task was promoted from Roadmap to Backlog.
- The fulfillment plan was subsequently refined at the user's direction to add
  a dedicated `markSalesOrderFulfilled` permission instead of borrowing broad
  order, pickup, delivery, packing, or inventory permissions.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

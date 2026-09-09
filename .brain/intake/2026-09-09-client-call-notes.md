# Client Call Notes — 2026-09-09

## Status
Capture in progress. Items are reported notes until clarified and triaged.

## Created Date
2026-09-09

## Last Updated
2026-09-09

## Session Context
The user is on a client call and will send today's bugs, tasks, and feature
requests. Keep this document updated as notes arrive, preserving the client's
reported behavior, requested outcome, examples, and explicit priorities.

## Notes
### 01 — Remove items from an existing inbound
- Type: Feature.
- Report: After creating a new inbound, the client needed to remove some items
  that had been added. They report that this action is currently unavailable.
- Expected outcome: Allow removal of selected items from an existing inbound.
- Priority: Unspecified.
- Status: Captured; pending scope clarification and triage.
- Open questions: Which inbound statuses should permit removal? How should
  already received or allocated items be handled? No specific inbound supplied.
- Related Brain context: [Inventory-backed sales fulfillment](../features/inventory-backed-sales-fulfillment.md).

### 02 — Verify inbound Adjust accuracy
- Type: Task / Investigation.
- Request: Check the existing inbound Adjust feature to ensure it works accurately.
- Expected outcome: Verify adjustment behavior and correct any confirmed defects.
- Priority: Unspecified.
- Status: Captured; no specific defect or reproduction example supplied yet.
- Open questions: Which adjustment action/fields are involved, and what expected
  versus actual values or behavior has the client observed?
- Related Brain context: [Inventory-backed sales fulfillment](../features/inventory-backed-sales-fulfillment.md).

### 03 — Production calendar: most recently assigned first within each date
- Type: Feature / UX change.
- Request: Change sorting on the Production page calendar so items within a
  date appear in descending assignment recency.
- Expected outcome: A newly assigned item appears at the top of its assigned
  date. Changing an assignment date or moving an item to another date puts it
  at the top of the destination date, as the most recently assigned item there.
- Sorting meaning: Use the recency of the assignment/rescheduling action within
  each date, not merely the scheduled date or the order's creation date.
- Priority: Unspecified.
- Status: Captured; pending implementation planning.
- Open questions: Confirm how grouped orders with multiple assignments should
  determine assignment recency during planning.
- Related Brain work: [Production planning calendar visibility and canonical colors](../tasks/2026-09-07-production-planning-calendar-visibility-and-canonical-colors.md).

## Decisions and Clarifications
None yet.

## Generated Plans
None yet; this session is collecting notes.

## Approval Notes
Note capture is authorized. No implementation requested in this session.

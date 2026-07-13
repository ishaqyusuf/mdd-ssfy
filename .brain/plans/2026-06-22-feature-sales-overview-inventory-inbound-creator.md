# Plan: Sales Overview Inventory Inbound Creator

## Type
Feature

## Status
Approved

## Created Date
2026-06-22

## Last Updated
2026-06-22

## Intake
- Intake File: brain/intake/2026-06-22-sales-overview-inventory-workflows.md
- Intake Item: Add a smart create-inbound workflow inside the sales overview Inventory tab.

## Goal Or Problem
When a sale has pending inventory quantities, operators need a fast way to create inbound purchasing/receiving records from the sales overview without manually re-entering every component and quantity in the inventory workspace.

## Current Context
Inventory already owns `InboundDemand`, `InboundShipment`, and `InboundShipmentItem` behavior. `brain/features/order-inbound-status.md` says the order-level inbound prompt does not create supplier rows or purchase orders by itself. This plan should add a sale-scoped inbound creator that consumes pending line-level demand rather than duplicating the inbound status prompt.

## Proposed Approach
Add a `Create inbound` action in the sales overview Inventory tab. It should open a smart inbound form as an embedded tab section or secondary sheet. The form should default to all pending inventory lines checked, group lines under a top-most supplier/date/status/PO form, allow supplier autocomplete with create support, and split unchecked or reduced quantities into additional inbound forms below so operators can assign different suppliers, dates, statuses, or PO references.

## Implementation Steps
- Inspect existing inbound creation APIs and UI under `/inventory/inbounds`.
- Define a sale-scoped inbound draft builder that maps pending inventory rows into form lines with component, required pending qty, and qty ordered.
- Add supplier autocomplete with allow-create behavior by reusing existing supplier APIs where possible.
- Add form fields for supplier, date, status, and PO/reference number.
- Default the top form to include all pending quantities.
- When an item is unchecked or qty ordered is reduced, automatically create or update a lower draft form for the remaining quantity with reason metadata such as different supplier, later order, or deferred purchase.
- Make the top form controls optionally propagate supplier/date/status/PO values to lower forms until a lower form is manually overridden.
- Submit inbound drafts through existing inventory inbound mutation paths or add a focused protected mutation if existing APIs cannot accept sale-scoped drafts.
- Add validation and audit feedback showing created inbound shipment/items and linked demand rows.

## Affected Files Or Areas
- `packages/inventory/src/application/inbound/*`
- `packages/inventory/src/inventory.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/www/src/app/(sidebar)/inventory/inbounds`
- `apps/www/src/components/inventory/*`
- `apps/www/src/components/sales-overview-system/*`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/api/contracts.md`

## Acceptance Criteria
- Inventory tab exposes a `Create inbound` action when pending quantities exist.
- The inbound form defaults all pending inventory lines checked with qty ordered equal to pending qty.
- Supplier autocomplete supports existing suppliers and creating a new supplier when allowed.
- Reducing qty or unchecking a line preserves the remaining quantity in a separate lower form instead of dropping it silently.
- Submitting creates inbound records linked to the relevant inventory demand/lines and refreshes the Inventory tab status.

## Test Plan
- Run focused tests for the inbound draft builder and quantity-splitting behavior.
- Run focused API tests for sale-scoped inbound creation or reuse of existing inbound mutations.
- Manual browser verification with one sale that has pending quantities split across at least two suppliers.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/features/order-inbound-status.md` if the user-facing inbound prompt and create-inbound behavior need a new relationship note.
- Update `brain/api/contracts.md` if API contracts change.
- Update `brain/progress.md`.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Supplier creation may require permissions distinct from inbound creation.
- Partial quantities must not double-create inbound demand or break repeat-receive guardrails.
- A lower form inheriting top-form controls needs clear override behavior to avoid silently changing already-split supplier intent.

## Open Questions
- TODO: Confirm whether the created record should be a draft purchase order concept if one exists, or an `InboundShipment` with status/reference metadata.
- TODO: Confirm required status options and default status for the sales-overview inbound form.

## Linked Task
- Task Title: Sales Overview Inventory Inbound Creator
- Task File: brain/tasks/roadmap.md

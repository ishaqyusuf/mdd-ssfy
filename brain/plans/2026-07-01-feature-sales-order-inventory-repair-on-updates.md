# Plan: Sales Order Inventory Repair On Order Updates

## Type
Feature

## Status
Proposed

## Created Date
2026-07-01

## Last Updated
2026-07-01

## Intake
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Intake Item: When an order is updated and already-created inbound is removed from the order, perform an inventory stock repair/resolution.

## Goal Or Problem
Order edits can remove, reduce, or replace sales items after inventory-backed inbound demand or inbound shipment links already exist. The system needs a resolution flow so stale demand, linked inbound quantities, and stock allocation state do not remain attached to order contents that no longer require them.

## Current Context
- Existing sales inventory sync and stale cleanup repair work focuses on confirmed-write cleanup and reconciliation evidence.
- Inbound creation and assignment now guard demand links and parent inbound state, but order-update-time resolution for removed items needs a clear operator workflow.
- The sales form save path already opens inventory configuration after saved orders; this plan should fit that order-update moment rather than relying only on later reconciliation.

## Proposed Approach
Add a repair preview after order updates that compares previous inventory-backed order requirements with the newly saved order state. If removed or reduced rows have open inbound demand, linked inbound shipment items, or allocations, show a resolution modal before closing the update flow or mark the order as needing inventory review. Apply actions must be scoped to active, unreceived, mutable demand first; shipment-linked or received rows should require explicit review and should never be silently deleted.

## Implementation Steps
- Identify sales order save/update entry points for legacy and current sales forms.
- After a successful order save, run or reuse sales inventory sync in preview mode to classify inventory differences:
  - removed item/component
  - reduced quantity
  - changed inventory mapping/variant
  - unchanged row
- For each affected removed/reduced row, classify linked inventory state:
  - unassigned pending/ordered demand
  - demand linked to active inbound shipment
  - partially received or received demand
  - stock allocation pending/approved/reserved/picked/consumed
- Add a resolution modal/helper component that appears only when action is needed.
- Provide explicit actions by class:
  - cancel mutable unassigned demand
  - release mutable allocation
  - review linked inbound in the Inbounds segment
  - leave as-is and flag inventory review
- Apply guarded writes only for mutable rows confirmed by exact reviewed baselines.
- Write order-scoped audit history for cancelled demand, released allocation, skipped linked inbound, and review-required outcomes.
- Ensure the sales overview Inventory tab refreshes after resolution and surfaces any remaining review-required rows.

## Affected Files Or Areas
- `apps/www/src/actions/sales-inventory-sync-save-paths.test.ts`
- `apps/www/src/components/forms/sales-form/inventory-configurator-dialog.tsx`
- `apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx`
- `packages/sales/src/sync-sales-inventory-line-items.ts`
- `packages/sales/src/sync-sales-inventory-line-items.test.ts`
- `packages/sales/src/sales-inventory-overview.ts`
- `packages/inventory/src/application/inbound/*`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/api/contracts.md`
- `brain/api/endpoints.md`

## Acceptance Criteria
- Updating an order that removes or reduces inventory-backed items detects stale inbound/allocation state before the workflow silently closes.
- Mutable unassigned demand can be cancelled through an explicit resolution action.
- Linked, partially received, received, picked, or consumed state is not silently removed; it is surfaced for review or routed to the linked inbound/stock surface.
- Resolution apply writes are audited and guarded by reviewed baselines.
- The Inventory tab reflects the post-resolution state after apply or review-required skip.

## Test Plan
- Focused package tests for order-diff classification and mutable/non-mutable repair classes.
- Focused API tests for guarded resolution apply.
- Manual browser verification with one order where a pending inbound item is removed and one order where a linked inbound item is removed.
- Run `bun run typecheck` or a narrower package/app check when implementation changes shared contracts.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/api/contracts.md` and `brain/api/endpoints.md` if routes are added or payloads change.
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
- Received inbound may have already increased stock; repair should not reverse physical stock without a separate stock adjustment workflow.
- A changed sales item may map to the same inventory component under a different sales row id; classification must avoid false stale cleanup.
- The modal should not block quote saves because quotes do not use order inbound status.

## Open Questions
- TODO: Confirm whether review-required outcomes should block Save & Close, or allow close with an inventory-review badge.

## Linked Task
- Task Title: Sales Order Inventory Repair On Order Updates
- Task File: brain/tasks/roadmap.md

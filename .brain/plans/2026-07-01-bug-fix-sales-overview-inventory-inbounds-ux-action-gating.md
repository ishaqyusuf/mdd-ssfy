# Plan: Sales Overview Inventory Inbounds UX And Action Gating

## Type
Bug Fix

## Status
Proposed

## Created Date
2026-07-01

## Last Updated
2026-07-01

## Intake
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Intake Item: Fix disabled inbound actions, inbound status deep-linking, missing-stock CTA, inbound count loading, and Inbounds segment layout.

## Goal Or Problem
The sales overview Inventory tab has several operator-facing issues: the Create inbound submit path can remain disabled or impossible to use after the form is filled, Mark all available is still disabled, clicking inbound status should always open `inventorySegment=inbounds`, the Inbounds segment shows a bare "No inbound shipments" message instead of required stock/inbound actions, the inactive Inbounds count can show `0` until the segment is clicked, and the side inbound list layout should be replaced by collapsible rows like `/sales-book/inbounds`.

## Current Context
- `apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx` already contains the stock/inbounds/non-stock segment UI, create inbound form, order inbound query, inactive count fallback, and side-list Inbounds panel.
- Existing guardrail work already added routing from inventory-owned inbound status to the Inventory tab's `Inbounds` segment, but this request says the behavior must be consistent whenever the inbound status is clicked.
- `inventories.orderInboundShipments` is currently loaded only when `inventorySegment === "inbounds"`, which likely explains the `0` count before clicking if overview row hints are missing.

## Proposed Approach
Treat this as a focused sales overview bug/polish slice. Fix action gating for create inbound and Mark all available, make inbound status click-through consistently set `inventorySegment=inbounds` and selected inbound id when available, make the inactive Inbounds count rely on stable overview summary data or a lightweight count query, and redesign the Inbounds segment as collapsible shipment rows plus a missing-stock alert/CTA when additional stock still needs inbound creation.

## Implementation Steps
- Audit create inbound form state in `InventoryActionBar`:
  - supplier selection
  - selected inbound rows
  - selected component quantities
  - submit button disabled conditions
  - mutation pending/read-only states
- Fix the Create inbound button so it enables when required supplier and at least one valid orderable row/quantity are selected.
- Implement or correctly wire `Mark all available` using the existing guarded availability mutation/preflight path from `brain/plans/2026-06-29-sales-inventory-inbound-status-guardrails.md`.
- Ensure all inbound status click handlers in sales orders, sales overview header/details, and inbound-management contexts open the Inventory tab with `inventorySegment=inbounds`; pass `inventoryInboundId` when a single linked inbound exists.
- Replace inactive Inbounds count fallback with a reliable source:
  - extend `salesInventoryOverview` with linked inbound shipment count, or
  - add/use a lightweight count query enabled outside the active Inbounds segment.
- In the Inbounds segment, compute remaining pending/orderable stock rows even when shipments already exist.
- Replace the empty state with an alert when pending stock still needs inbound:
  - `X inventory still needed`
  - `Check stock`
  - `Create inbound`
- When no shipments are linked and no pending inbound action is needed, keep a calm empty state.
- Redesign linked inbound display from side-list + detail panel to collapsible rows:
  - trigger row shows the current side-list summary: inbound id, supplier/reference, status, item count, ordered/received progress.
  - expanded content shows stock lines, linked orders, status controls, receive-stock controls, and timeline/activity.
- Preserve read-only locks for fulfilled/cancelled/completed-readonly orders.

## Affected Files Or Areas
- `apps/www/src/components/sales-overview-system/tabs/inventory-tab.tsx`
- `apps/www/src/components/sales-overview-system/hooks/use-sales-inventory-segment-query.ts`
- `apps/www/src/components/sales-inbound-status-badge.tsx`
- `apps/www/src/components/tables-2/sales-orders/columns.tsx`
- `apps/www/src/components/tables-2/inbound-management/columns.tsx`
- `apps/www/src/components/sheets/sales-overview-sheet/*`
- `packages/sales/src/sales-inventory-overview.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/api/contracts.md`

## Acceptance Criteria
- Create inbound submit becomes available after a valid supplier and valid pending stock rows/quantities are selected.
- Mark all available is usable only when the guarded preflight says it is safe, and disabled/read-only states explain why.
- Clicking an inbound status always opens the sales overview Inventory tab with `inventorySegment=inbounds`; single-linked inbound clicks select that inbound.
- The Inbounds segment count is correct before and after the segment is opened.
- The Inbounds segment shows remaining pending inventory needs and create/check-stock CTAs even when no inbound is linked or when existing inbounds do not cover all pending stock.
- Linked inbound details render as collapsible rows rather than a separate side list.

## Test Plan
- Focused component/import checks for sales overview Inventory tab changes.
- Focused package/API tests if overview DTOs or counts change.
- Browser verification for:
  - no linked inbound with pending stock
  - linked inbound with remaining pending stock
  - linked inbound fully covering stock
  - read-only fulfilled/cancelled order
  - inbound status click from sales orders and overview.
- Run `bun run typecheck` or the narrowest relevant check after contract changes.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/api/contracts.md` and `brain/api/endpoints.md` if DTOs/routes change.
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
- Loading full inbound details to fix the inactive count could regress first paint; prefer summary/count data.
- Mark all available must not cancel shipment-linked, partially received, or received demand.
- Collapsible expanded content should not mount every timeline/detail query eagerly if many inbounds exist.

## Open Questions
- None.

## Linked Task
- Task Title: Sales Overview Inventory Inbounds UX And Action Gating
- Task File: brain/tasks/roadmap.md

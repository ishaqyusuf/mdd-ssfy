# Sales Order Sales Rep Transfer

## Status
- Implemented
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/36
- Created Date: 2026-07-08
- Implemented Date: 2026-07-08

## Source Request
Client asked to make the system able to change the sales rep attached to an order. The example was a door customer buying while the owner is away from the desk, another sales rep uses the owner's computer/session to create the sale, and the business later needs to transfer that sale to the rep who actually created it.

## Problem
Sales orders are currently attached to a sales rep through the order ownership relationship. When an order is created from the wrong workstation/session, the order can stay attached to the wrong rep. That affects default rep-scoped sales lists, dashboards, customer follow-up, reporting, and possible commission attribution.

## Current Codebase Context
- `SalesOrders.salesRepId` already exists and is indexed, so the base feature should not need a new ownership column.
- Sales order list and overview DTOs already read the order sales rep relationship.
- Canonical order list queries apply default sales-rep scoping for non-`all sales` views, so a transfer should move the order between rep-scoped default lists.
- Sales history already exists and is used for audited sales/order changes, making it the right audit target for transfer evidence.
- Legacy sales form creation uses form metadata to connect the starting sales rep, while later order edits should not accidentally undo an explicit transfer.

## Product Direction
Add a permission-controlled `Change Sales Rep` / `Transfer Sales Rep` action on existing sales orders. An authorized internal user should be able to view the current rep, select an active eligible sales rep, optionally enter a reason, and confirm the transfer without reopening or recreating the sale.

The transfer should update the current order sales rep, record audit history, refresh existing sales surfaces, and leave the order number, slug, customer, line items, totals, payments, production, dispatch, inventory, and taxes unchanged.

## Implementation Direction
- Add one protected sales API mutation as the single ownership-transfer authority.
- Validate a real non-deleted order, a real eligible internal sales rep, positive integer ids, and actor permission.
- Recommended permission default: Super Admin and sales-management/edit-sales users; if no existing permission cleanly maps, add a dedicated transfer-sales-rep permission during implementation.
- Execute update and audit history write transactionally.
- Store structured audit metadata for previous rep, new rep, actor, reason, and action source.
- Do not regenerate order number or slug even if the historical number contains the previous rep's initials.
- Invalidate/refresh order lists, summaries, single-sale overview, sales filters, dashboards, mobile dashboard data where relevant, and sales-rep dashboard panels.
- Treat the transfer as sales-document metadata so future previews/prints show the corrected rep; invalidate any current-document cache if the existing sales document system caches rep metadata.
- Ensure later legacy/new sales form saves preserve the transferred sales rep unless the explicit transfer action is used again.

## Implementation Notes
- Added `sales.salesRepOptions` and `sales.transferSalesRep` under the sales tRPC router.
- Reused existing `SalesOrders.salesRepId`; no database migration or schema change was required.
- The transfer mutation is order-only, requires password confirmation, allows `editOrders` users to transfer any active order, allows the currently assigned sales rep to transfer orders they own, validates an active sales/order-capable target user, updates only `salesRepId`, and writes `SalesHistory` metadata for previous rep, next rep, actor, order id, and optional reason.
- The sales overview `SALES REPRESENTATIVE` section now shows an inline `Change Rep` control for managers and current-owner sales reps, opens a password confirmation modal before completing the transfer, refreshes sales document/list/dashboard query families after success, and leaves quotes out of scope.
- Added focused regression coverage in `apps/api/src/db/queries/sales-rep-transfer.test.ts`.

## Testing Seam
Primary seam: the protected sales transfer mutation/API behavior. It should prove the externally visible contract in one place: ownership changes, history is written, invalid transfers are rejected, unrelated business data is unchanged, and rep-scoped list behavior follows the new owner.

Secondary checks:
- overview/list DTOs display the corrected rep
- UI confirmation invokes the shared mutation and refreshes sales queries
- browser smoke for Super Admin or sales manager transferring an order and seeing it move to the new rep view

## Out Of Scope
- Bulk transfers
- Quote ownership changes unless deliberately extended after product review
- Order number/slug regeneration
- Recreating/copying/moving the sale
- Reassigning production workers, dispatch drivers, pickup/packing ownership, or inventory ownership
- Recalculating already-paid commission, payroll, or historical accounting records
- Workstation impersonation or automatic physical-creator detection
- Bulk historical backfill
- Editing/deleting transfer audit entries

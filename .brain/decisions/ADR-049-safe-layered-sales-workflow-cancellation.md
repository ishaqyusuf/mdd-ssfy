# ADR: Safe Layered Sales Workflow Cancellation

## Status

Accepted — 2026-08-06.

## Context

The Sales Orders status menu previously cancelled fulfillment by marking every
non-cancelled dispatch `cancelled`, including completed work, and cancelled
production by deleting tagged submissions in a background task. Those paths did
not review delivery proof, unpack packing rows, reconcile payroll/material or
payment reviews, revoke readiness overrides, or preserve a durable idempotent
cancellation record. Cancelled dispatch controls also projected the entire
sales order as terminal `Cancelled`.

Inbound receipt and stock may already be physical truth when an operator wants
to reverse a later workflow layer. Erasing that truth would fabricate inventory
and delivery history.

## Decision

Cancellation is a package-owned, guarded layer rollback:

1. A lazy preview is the eligibility authority and returns a deterministic
   revision, blockers, reversible effects, and preserved evidence.
2. Fulfillment cancellation stops at the pre-transit boundary. It cancels all
   reversible active dispatches and marks packed rows unpacked while preserving
   packing and delivery evidence.
3. Production cancellation owns only submissions tagged
   `sales_mark_as_completed`. Manual/legacy submissions and reviews shared with
   them survive. Only pending unpaid payroll is soft-deleted.
4. Automatic payment review is reverted only while its automatic action is
   untouched and no surviving layer justifies the review.
5. Inbound receipts, demand receipts, inventory stock, stock movements, logs,
   and manual availability evidence never roll back through this command.
6. Execution derives the actor from authentication and atomically rechecks the
   revision, mutates domain rows, rebuilds sales control, writes Sales History,
   and inserts a unique-request cancellation ledger inside a serializable
   transaction.
7. A cancelled dispatch remains individually cancelled, but cancelled-only
   dispatch controls project the parent order through its remaining production
   state. Explicit sales-order cancellation remains terminal.

## Consequences

- In-transit, delivered, proof-bearing, paid/processing-payroll, and ambiguous
  legacy cases are intentionally blocked and require a separate correction or
  return workflow.
- Cancellation is single-order and reason-required; bulk cancellation is not
  exposed from the Sales Orders bottom bar.
- Legacy status metadata may lag current dispatch/submission evidence. The menu
  may expose a guarded review in that case, but only the server preview can
  authorize execution.
- `requestId` retries return the stored result without duplicating side effects;
  stale previews require a fresh review.

## Alternatives

- Restore a previous aggregate status directly. Rejected because status is a
  projection and does not undo the underlying side effects.
- Delete all production, dispatch, inbound, and stock records. Rejected because
  it destroys manual and physical evidence.
- Permit in-transit or delivered cancellation. Rejected because returns and
  delivery corrections need separate physical workflows.

## Implementation Notes

- Package command: `packages/sales/src/sales-workflow-cancellation.ts`
- API: `sales.workflowCancellationPreview` and `sales.cancelWorkflowLayer`
- UI: `apps/dashboard/src/components/sales-workflow-cancellation-dialog.tsx`
- Ledger: `SalesWorkflowCancellation`

# Bug: Ready-to-fulfill Order Offered Cancel Fulfillment Without a Dispatch

## Date

2026-08-27

## Problem

Production order `09382LM` displayed `Ready to fulfill`, but its status actions
offered `Cancel Fulfillment`. Opening that review returned `No active
fulfillment was found for this order.`

## Production Evidence

- Production was complete with one completed production row.
- Fulfillment was pending at zero percent.
- Dispatch reported zero dispatched, 18 pending-dispatch units, 15 available
  units, and no delivery assignment.
- The production row retained `Materials not set`; that evidence did not create
  or imply a fulfillment record.

## Root Cause

The client status-menu predicate treated `ready_to_fulfill` plus completed
production metadata as sufficient evidence that fulfillment had started. The
guarded server preview correctly derives fulfillment from active dispatch rows
and rejected cancellation because none existed. A regression test explicitly
preserved the overly broad client behavior.

## Resolution

- `Cancel Fulfillment` is now visible only for lifecycle states that represent
  started fulfillment: queued, packing, packed, in transit, or fulfilled.
- `ready_to_fulfill` continues to expose guarded `Cancel Production`, but no
  longer fabricates fulfillment rollback availability.
- The server-side no-active-fulfillment guard remains unchanged as defense in
  depth.
- Regression coverage now asserts that completed production without started
  fulfillment does not expose `Cancel Fulfillment`.

## Verification

- Exact order-state mismatch harness passed after the change.
- Focused status-menu and workflow-cancellation coverage passed 20 tests / 42
  assertions.
- Sales status feedback coverage passed 8 tests / 17 assertions.
- Targeted Biome and `git diff --check` passed.
- Dashboard typecheck remains blocked by unrelated repository-wide baseline
  diagnostics; no focused changed-file diagnostic was observed.

## Related Files

- `apps/dashboard/src/components/sales-status-menu-actions.ts`
- `apps/dashboard/src/components/tables-2/sales-orders/status-menu-actions.test.ts`
- `packages/sales/src/sales-workflow-cancellation.ts`
- `.brain/features/sales-order-status-actions.md`

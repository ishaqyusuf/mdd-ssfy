# Bug: Dedicated Fulfillment Permission Blocked By Broad Resolver Grants

## Date

2026-08-24

## Problem

Pablo Cruz could see and confirm `Mark as Fulfilled`, and his role editor showed
`Mark Sales Order Fulfilled` enabled, but order `09403DB` failed at `Review,
approve and continue` with an inventory-permission error.

## Root Cause

The fulfillment preflight honored `markSalesOrderFulfilled`, while
`inventories.overrideSalesInventoryMarkAsAvailabilityForContinue` immediately
required `editOrders`, `editInboundOrder`, and `editProduction` as additional
global grants. The role editor presented fulfillment as a standalone
capability, so the downstream additive checks contradicted that contract.

## Resolution

Dependency-resolution authorization is now action-aware: `fulfilled` uses the
dedicated fulfillment grant for the scoped, audited resolver; only
`production_completed` retains the three broad workspace requirements. All
existing order scoping, Special Order enforcement, canonical receiving,
production-review, audit, task-start, and terminal job checks remain.

Implemented on 2026-08-26 after explicit operator approval. Focused permission,
preflight, dependency-resolution, task-authorization, and terminal-job coverage
passes 52 tests / 412 assertions.

## Prevention

- Regression-test both sides of the split: Fulfilled has no hidden broad grant,
  while Production Completed retains all three.
- Verify permission bugs from both the role editor and the exact failing server
  mutation; visibility alone is not end-to-end authorization proof.

## Related Files

- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/api/src/trpc/routers/permission-boundaries.test.ts`

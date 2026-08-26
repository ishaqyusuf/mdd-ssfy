# Bug: One-click Fulfillment Stopped After Cancelling a Stale Review

## Date

2026-08-26

## Problem

During a sequential authenticated Chrome run, order `09430DB` returned HTTP
500 from `inventories.overrideSalesInventoryMarkAsAvailabilityForContinue`.
The automatic resolver correctly cancelled material review `162`, whose legacy
assignment revisions were not strictly older than its submissions, but then
reported `Unable to resolve inventory` instead of regenerating the production
work within the same fulfillment attempt.

## Root Cause

The resolver treated every non-approved review decision as terminal. A
`CANCELLED` decision with `staleAssignmentScope` is different: cancellation is
the required repair step, and a new production submission/review must be built
from the updated assignment scope before the resolver can continue.

## Resolution

- Fulfilled dependency resolution now performs at most three bounded production
  preparation and review-decision passes.
- A stale-scope cancellation triggers another preparation pass in the same API
  request; prepared counts are accumulated across passes.
- Other cancellation outcomes remain hard failures, and exhausted convergence
  fails visibly instead of looping.
- The focused regression asserts the exact prepare, cancel, regenerate, approve
  sequence.

## Verification

- The original retry created replacement review `227`, approved it, returned
  HTTP 200, and completed dispatch `4523` for `09430DB`.
- A 20-order Chrome campaign completed dispatches `4518` through `4537`; all 20
  persisted with `status = completed` and a delivery timestamp.
- Focused resolver and reconciliation validation passes 16 tests / 51
  assertions; targeted Biome and whitespace checks pass.

## Related Files

- `packages/sales/src/sales-status-mark-as-resolution.ts`
- `packages/sales/src/sales-status-mark-as-resolution.test.ts`
- `.brain/features/inventory-backed-sales-fulfillment.md`

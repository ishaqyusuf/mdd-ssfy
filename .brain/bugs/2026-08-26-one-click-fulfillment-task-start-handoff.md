# Bug: One-click Fulfillment Lost the Terminal Task Start

## Date

2026-08-26

## Problem

Sales user Donovan Brautigam could resolve inventory and production blockers
for order `09406DB`, but the row remained in production. The dependency
mutation initially returned an HTTP 500 during review retries and later
succeeded, created dispatch `4515`, and displayed a success toast without a new
`update-sales-control` diagnostic run.

## Root Cause

The Sales status menu started the monitored `update-sales-control` server action
without awaiting its task-start promise. The resolver flow immediately cleared
its dialog and invalidated order queries, so the async handoff could be lost
before Trigger accepted and registered the terminal fulfillment task.

## Resolution

- Both production-completed and fulfilled paths now await
  `salesControlTask.trigger(...)` before finishing their handoff.
- The existing status-action lock remains active until task acceptance or a
  surfaced start failure.
- A focused source contract fails unless both monitored task starts are
  awaited.
- Authenticated Chrome verification registered run
  `run_06g3t1o1htt4edif9462pmv701`; it succeeded, completed dispatch `4515`, and
  refreshed `09406DB` to `Fulfilled`.

## Prevention

- Treat monitored task acceptance as part of the status command, not a
  fire-and-forget UI side effect.
- Keep browser verification tied to both a visible start signal and a persisted
  task diagnostic before accepting a dependency-resolver success toast as
  completion.

## Related Files

- `apps/dashboard/src/components/sales-menu.tsx`
- `apps/dashboard/src/components/sales-menu-status-feedback.test.ts`
- `.brain/features/sales-order-status-actions.md`

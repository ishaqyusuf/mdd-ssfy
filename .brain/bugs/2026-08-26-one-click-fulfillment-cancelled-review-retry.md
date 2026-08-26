# Bug: One-click Fulfillment Could Not Retry a Cancelled Material Review

## Date

2026-08-26

## Problem

After the dedicated fulfillment permission was granted, sales user Donovan
Brautigam still could not fulfill order `09454DB`. The Chrome confirmation
failed with `Unable to resolve inventory` and left the order in production.

## Root Cause

The fulfillment resolver intentionally created automatic completion
submissions for existing unassigned production work. The material-review
decision treated every null assignee as stale, even when the modern assignment
snapshot also recorded a null assignee and every other scope field matched.
That cancelled the review. The next retry then reused the deterministic
idempotency key owned by the cancelled review, so no clean replacement review
could be created.

## Resolution

- Scope validation permits a matching null owner only for submissions carrying
  the server-owned `sales_mark_as_completed` provenance. Normal unassigned
  production submissions still fail the stale-scope guard.
- Automatic status-completion review keys now include the normalized item scope
  and latest review ID. Concurrent attempts remain idempotent, while a later
  attempt after a closed review receives a new key.
- Chrome verification completed the dependency resolver and background sales
  control run; order `09454DB` now displays `Fulfilled`.

## Prevention

- Cover automatic unassigned completion separately from worker-submitted
  production; provenance is part of the invariant.
- Exercise retry behavior after a closed review, not only first-attempt and
  concurrent idempotency.

## Related Files

- `packages/sales/src/production-submission-review/decision.ts`
- `packages/sales/src/production-submission-review/decision.test.ts`
- `packages/sales/src/sales-status-mark-as-resolution.ts`
- `packages/sales/src/sales-status-mark-as-resolution.test.ts`

# Bug: Packing Review Approval Runtime Failures

## Date

2026-08-28

## Problem

Guarded-packing approval could fail with either MySQL `1052` (`createdAt` was
ambiguous in the received-inbound repair ordering) or a Prisma required-relation
violation while rebuilding `SalesItemControl`. An authenticated hard reload of
Sales Operations could also fall back to client rendering after independent
server session reads disagreed, and the shared mini logo emitted a Next.js
aspect-ratio warning.

## Root Causes

- The order-scoped inbound attention query wrapped a derived table but ordered
  its outer result with bare `receivedAt`, `createdAt`, and `inboundId` names.
- Sales-control rebuild deleted every control before recreating active controls.
  Audit reports retain their canonical control identity through an
  `onDelete: Restrict` relation, so a referenced control cannot be removed.
- The root layout passed explicit headers into session resolution while the
  protected layout and server tRPC context independently used the zero-argument
  path. Those uncached calls could observe different session results in one RSC
  request.
- The square mini-logo asset was declared as `48x49`, and shared navigation
  containers could constrain one rendered axis without explicit proportional
  sizing CSS.

## Resolution

- Retained the derived `attention` wrapper and qualified all outer ordering as
  `attention.receivedAt`, `attention.createdAt`, and `attention.inboundId`.
- Rebuild active controls with `upsert`, hard-delete only stale controls with no
  packing-report relation, recreate quantity controls, and restore production
  assignment links. All audit relations remain restrictive and all report
  identities remain intact.
- Routed zero-argument server session resolution through React's request cache.
  Explicit-header callers still bypass that request cache, and the root layout
  now shares the cached path used by protected layouts and server tRPC context.
- Added `h-auto max-w-full` to both shared mini-logo variants and corrected their
  intrinsic declaration to `48x48`.

## Verification

- Focused inventory, sales-control, packing-report, auth, and UI coverage passes
  29 tests / 85 assertions.
- `@gnd/ui` and `@gnd/site-nav` typechecks pass. Inventory, sales, and dashboard
  retain unrelated baseline diagnostics; filtered output contains no touched-file
  errors.
- An authenticated hard reload of `/settings/sales/operations` remained on the
  server-rendered protected page with no fresh client-render fallback, auth error,
  or logo warning.
- Disposable local report `#20` was submitted and approved, then the same
  approval was retried idempotently. The approved audit row and referenced item
  control remain queryable; the order has 28 rebuilt quantity controls and 6
  sales-stat rows. Neither runtime database error recurred.

## Documentation Impact

No database schema, migration, public API, contract, or permission documentation
changed because the fix preserves the existing models and tRPC behavior.

## Related Files

- `packages/inventory/src/application/inbound/inbound-needs-attention.ts`
- `packages/sales/src/sales-control/index.ts`
- `apps/dashboard/src/lib/auth/session.ts`
- `apps/dashboard/src/lib/auth/session-resolver.ts`
- `apps/dashboard/src/app/layout.tsx`
- `packages/ui/src/components/icons.tsx`
- `.brain/progress.md`

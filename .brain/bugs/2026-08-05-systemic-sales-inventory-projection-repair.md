# Systemic Sales Inventory Projection Repair

## Symptoms

- Most affected orders displayed `Automatic inventory synchronization failed`.
- Active orders with saved production lines could display `N/A` in the Sales
  Orders Inbound column even though rebuilding the projection produced tracked
  needs. Order `09166LRG` was the reported example.
- Failures were spread across different orders rather than repeated attempts on
  one order.

## Root Causes

1. The deterministic parent selector limited its unique `Item Type` fallback to
   house-package-tool rows. Generic grouped Service and Shelf rows persisted the
   same valid parent shape but were rejected.
2. Legacy non-produceable Service rows could carry only metadata and no form
   steps. Those rows are not inventory demand, but their missing mapping was
   promoted to a projection failure.
3. A projection marker could remain `ready` with a positive saved need count
   after its current tracked component rows were missing. Applicability trusted
   the empty current rows and labeled the order `N/A` instead of repairing it.
4. A legitimately zero-need `N/A` result had no operator verification path, so
   there was no explicit way to prove it was still correct after mapping logic
   changed.

## Fix

- Use a unique valid `Item Type` form step as the deterministic parent for any
  grouped sale line; ambiguous Item Type mappings remain rejected.
- Treat non-produceable Service snapshots as optional inventory evidence and do
  not create mutable demand or fail the projection when a legacy service row is
  unmapped.
- Resolve an active `ready` projection with a positive historical need count but
  zero current needs as `not_synced`, allowing the Inventory tab's existing
  one-attempt auto-repair to rebuild it.
- Mark only active zero-need projections as verifiable. Clicking `N/A` in the
  Sales Orders Inbound column now shows `Checking…`, runs a direct repair-source
  projection rebuild, refreshes the orders list, and confirms either the newly
  found need count or a fresh zero-need result. Historical orders past the
  repair boundary retain explanation-only `N/A` behavior.
- Sync warnings remain failures. The verifier never silently reconfirms `N/A`
  after a failed rebuild.

## Data Repair And Verification

- `09166LRG` now resolves to `Needs 5`, `162 pending`, and five tracked inbound
  rows in the live Sales Overview Inventory UI.
- The original failed set was replayed successfully. A final systemic scan found
  three additional historical failures (`09096LM`, `09113PC`, and `09164PC`);
  all three repaired to `ready` with 3, 2, and 3 needs respectively.
- The current local projection-state scan returns zero failed and zero syncing
  rows after repair.
- Clicking `N/A` for `09168PC` visibly entered `Checking…` and completed with a
  fresh `ready`, zero-need projection whose source is `repair` and whose
  `lastError` is null.
- 102 focused projection, overview, API import, and dashboard tests pass. The
  Sales package typecheck and targeted Biome checks pass. The broad API
  typecheck retains the unrelated Prisma excessive-stack-depth baseline in
  `inbound-receiving.ts`; the broad Dashboard typecheck exhausted its existing
  4 GB heap limit.

## Prevention

The protection is layered: successful sales saves continue queueing projection
sync; active stale positive projections self-repair when Inventory opens; and an
operator can force a fresh verification of any active `N/A` result. The sync
monitor remains the batch diagnostic/repair surface for fleet-wide audits.

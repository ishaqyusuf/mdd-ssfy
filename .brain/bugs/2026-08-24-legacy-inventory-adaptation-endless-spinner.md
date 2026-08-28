# Bug: Legacy inventory adaptation endless spinner

## Date

2026-08-24

## Problem

Opening the Inventory tab for a recognized historical sales status could show
`Adapting legacy AVAILABLE status` and `Migration in progress` indefinitely,
including order `09405PC` after a successful save.

## Root Cause

The browser stored only a module-level `null` attempt marker after requesting
adaptation. That marker suppressed another request but was not durable success
evidence. A preserved `AVAILABLE` order with no legacy-owned projection could
therefore continue resolving as `legacy_locked`, while the UI interpreted the
in-memory marker as an active migration forever. Zero-requirement adaptations
also did not persist the `ready/0` projection needed to reconcile the legacy
status after reload.

## Fix

Legacy adaptation now runs in the guarded
`migrate-sales-inventory-legacy-status` Trigger task after a successful save.
The worker rechecks permission and the exact order revision/status, records
durable `syncing`, `ready`, or `failed` projection state, and persists
authoritative need totals, including `ready/0`. Opening an order is read-only;
unqueued and failed historical orders expose explicit Run/Retry controls.

## Prevention

Do not represent background lifecycle state in module-level client memory.
Every asynchronous migration must have durable terminal evidence, exact stale
write guards, bounded retries, and tests for zero-row success, replay, failure,
and reload behavior. The UI must also age out orphaned `syncing` evidence after
the worker's maximum duration. Read-oriented screens must never begin
migrations merely by mounting.

## 2026-08-28 Post-receipt recurrence and hardening

Recent orders `09405PC` and `09495PC` exposed a second route into the same
misleading state. Compatibility treated only a narrow status-specific signal as
canonical: positive `AVAILABLE` projections required legacy provenance, while
`ORDERED` required outstanding linked inbound quantity. Completing receipt
reduced that open quantity to zero, so a successful `ready` projection and a
completed linked inbound could resolve back to `legacy_locked`.

Compatibility now treats any durable `ready` projection or any active/completed
linked inbound demand from a non-cancelled, non-deleted shipment as canonical
evidence. Ready compatibility outranks stale setup-mode locks in the UI and
migration replay. The ordinary receive transaction
also applies `AVAILABLE` through the existing no-active-demand guard after the
shipment commit, and successful adaptation replay returns `already_migrated`
without another sync/history write. Received-backorder allocation recognizes
pending-review coverage before reserving again, preventing the duplicate
suggestion/reservation chain observed during the reproduction.

## Related Files

- `packages/sales/src/sales-inventory-projection-state.ts`
- `packages/sales/src/sales-inventory-legacy-status-setup.ts`
- `packages/jobs/src/tasks/sales/migrate-sales-inventory-legacy-status.ts`
- `apps/dashboard/src/actions/trigger-task.ts`
- `apps/dashboard/src/components/sales-overview-system/tabs/inventory-tab.tsx`
- `apps/dashboard/src/hooks/use-legacy-inventory-adaptation-task.ts`
- `apps/dashboard/src/store/task-monitor.ts`

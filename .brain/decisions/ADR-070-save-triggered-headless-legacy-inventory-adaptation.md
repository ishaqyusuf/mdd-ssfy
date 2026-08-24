# ADR: Save-triggered headless legacy inventory adaptation

## Status

Accepted

## Context

Recognized historical sales inventory statuses require one-time reconciliation
into canonical inventory, inbound, and history records. Performing that work
from the Inventory tab made a read operation mutate data and left the UI unable
to distinguish an in-memory attempt from durable success, causing an endless
spinner after reload.

## Decision

Queue legacy inventory adaptation only after a successful sales save. Run it in
a monitored Trigger worker that reauthorizes the saved actor and rechecks the
exact order revision and legacy status. Reuse `SalesInventoryProjectionState`
as the durable `syncing` / `ready` / `failed` lifecycle contract, including
authoritative zero-need success, instead of introducing another table.

Opening an order remains read-only. Unqueued and failed historical orders use
explicit Run/Retry controls. Ordinary orders keep the synchronous Configure
Inventory decision point after save.

## Alternatives

- Continue adapting automatically when the Inventory tab mounts.
- Block navigation until legacy reconciliation completes.
- Add a dedicated migration-job state table.
- Batch-backfill every historical order.

## Consequences

- Sales save and navigation are no longer blocked by legacy reconciliation.
- Lifecycle evidence survives navigation, reload, retries, and task-monitor
  recovery.
- Exact revision/status guards prevent an older job from overwriting a newer
  sale.
- The existing projection row now carries both normal-sync and legacy-migration
  evidence, so compatibility resolution must consider its `source` and totals.
- Historical untouched orders require an explicit operator action; no automatic
  batch backfill is introduced.

## Implementation Notes

- Task: `migrate-sales-inventory-legacy-status`.
- Intent: `sales.adapt-legacy-inventory` version 1.
- Automatic idempotency key: sales order, normalized legacy status, and exact
  saved `updatedAt`.
- Deploy the worker before dashboard/API callers and canary terminal projection
  state plus Vercel/Trigger errors.

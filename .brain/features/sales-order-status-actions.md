# Sales Order Status Actions

## Status

Implemented on 2026-07-27 for the canonical Sales Orders table.

## Behavior

- The Sales Orders `Status` cell is a keyboard-accessible dropdown trigger styled with the shared ghost button variant while retaining the lifecycle status tone.
- The dropdown begins with the `Mark as` label, followed by `Mark as Completed` and `Mark as Fulfilled`.
- The current lifecycle controls rollback availability:
  - `Cancel Production` is available after production is complete and before fulfillment begins.
  - `Cancel Fulfillment` is available once fulfillment has started.
- Production completion and cancellation run as monitored sales-control tasks. Their terminal task effects publish `sales.production.changed`.
- Fulfillment completion publishes the existing fulfillment event; fulfillment cancellation uses the registered dispatch mutation event.
- The `Inbound` status cell uses the same non-button, button-variant visual treatment and retains the inbound status tone. Existing manual-inbound and inventory-inbound click behavior remains unchanged.

## Saved Query Counts

- Production, fulfillment, dispatch, and other registered Sales Orders domain events include the saved page-tab query targets.
- Saved page-tab list/default queries refetch inactive cache entries as well as active ones. A saved filter such as production complete plus fulfillment pending therefore updates its count after an order is fulfilled without a page reload.

## Validation

- Focused status-action, task-effect, and query-event coverage: 35 tests / 66 assertions passed.
- Focused Biome checks and `git diff --check` passed.
- The repository-wide suite completed with 2,174 passing, 1 skipped, and 25 pre-existing/unrelated failures.
- Browser mutation proof was blocked because the already-running local Next server accepted connections without returning page bytes.

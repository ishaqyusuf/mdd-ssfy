# Sales Order Status Actions

## Status

Implemented on 2026-07-27 for the canonical Sales Orders table.

## Behavior

- The Sales Orders `Status` cell is a keyboard-accessible dropdown trigger styled with the shared ghost button variant while retaining the lifecycle status tone.
- The inline Status dropdown has no redundant `Mark as` label. Its first two
  actions are `Production completed` and `Fulfilled`.
- The current lifecycle controls rollback availability:
  - `Cancel Production` is available after production is complete and before fulfillment begins.
  - `Cancel Fulfillment` is available once fulfillment has started.
- Production completion and cancellation run as monitored sales-control tasks. A visible toast confirms that the background update started; terminal task effects publish `sales.production.changed`, refresh the affected queries, and show a visible success toast.
- Fulfillment completion publishes the existing fulfillment event; fulfillment cancellation uses the registered dispatch mutation event.
- Automatic production completion tags only the submissions it creates; `Cancel Production` soft-deletes those tagged submissions and preserves earlier manual production records. Orders with only legacy/manual completion records return an explicit unavailable error instead of reporting a no-op success.
- `Cancel Fulfillment` cancels every non-cancelled dispatch attached to the order in one transaction and resets the sale once. Every dispatch is constrained to that parent sale and the transaction rejects if the requested set does not match, preventing cross-order or partial cancellation.
- Dispatch cancellation notifications are emitted after commit and are non-fatal: notification delivery failures are logged without turning a committed status change into a false UI error.
- Sales menu portal interactions stop at the menu content boundary so selecting an inline status action does not open the underlying order row.
- When either action is blocked by configured inventory, `Inventory needs
  attention` presents blocker rows in uppercase and keeps `Mark available and
  continue` enabled. Confirming it records an explicit order-level availability
  override without rewriting canonical inventory or inbound state, and then
  starts the selected production-completion or fulfillment task.
- The `Inbound` status cell uses the same non-button, button-variant visual treatment and retains the inbound status tone. Existing manual-inbound and inventory-inbound click behavior remains unchanged.

## Saved Query Counts

- Production, fulfillment, dispatch, and other registered Sales Orders domain events include the saved page-tab query targets.
- Saved page-tab list/default queries refetch inactive cache entries as well as active ones. A saved filter such as production complete plus fulfillment pending therefore updates its count after an order is fulfilled without a page reload.

## Validation

- Focused status-action, inventory-preflight, override rollback, and permission
  coverage passed 25 tests / 252 assertions. Focused Biome, `@gnd/sales` and
  `@gnd/api` typechecks, and `git diff --check` passed.
- The repository-wide suite completed with 2,200 passing, 1 skipped, and 25
  pre-existing/unrelated failures. The broad WWW typecheck remains red on its
  existing repository baseline; the live development page compiled and loaded
  the changed UI.
- Authenticated browser validation on order `08883LM` confirmed the two exact
  Status menu labels, the uppercase blocker presentation, and an enabled `Mark
  available and continue` action for both production completion and
  fulfillment. The continue button was not submitted during validation.

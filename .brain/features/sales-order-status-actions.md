# Sales Order Status Actions

## Status

Implemented on 2026-07-27 for the canonical Sales Orders table.

## Behavior

### One-click dependency-resolution errors (2026-08-30)

- `Receive, approve and continue` reports failures through the shared public
  error envelope instead of rendering raw exception text.
- The operator always receives a clear title, safe next-step copy, and a
  traceable error reference. The workflow owns this toast so the global
  mutation cache does not show a second generic error for the same failure.
- Sales Handoff source-repair imports are covered alongside the fulfillment
  resolver so a missing lifecycle-review export cannot silently take the API
  route down again.

### Inventory-attention backdrop dismissal (2026-08-29)

- The shared `Inventory and production need attention` dialog used by Sales
  Orders and Sales Production closes when its dimmed backdrop is clicked.
- Backdrop and controlled-open dismissal remain locked while the one-click
  inventory and production dependency resolver is running, preventing the
  in-flight action from being hidden or interrupted.
- The shared alert-dialog content accepts optional overlay props so backdrop
  behavior is explicitly enabled for this flow without changing every alert
  dialog in the application.

### Dedicated Mark as Fulfilled permission (updated 2026-08-24)

- Sales Orders fulfillment now uses the action-specific
  `viewMarkSalesOrderFulfilled` permission instead of borrowing order, pickup,
  delivery, packing, or inventory authority.
- The role and employee editors display this through the normal View column as
  `Mark Sales Order Fulfilled`, persist
  `view mark sales order fulfilled`, and leave Edit unavailable. Existing
  legacy direct grants remain valid and migrate on the next role/employee save.
- The canonical Sales status menu and the Sales Overview dispatch menu hide
  their fulfillment-completion action without the grant. Production completed
  and workflow cancellation retain their independent permission rules.
- Fulfillment preflight, ordinary continuation, fulfillment-only dispatch
  resolution, protected task start, and the terminal `update-sales-control`
  job all repeat the dedicated check using the authenticated actor.
- The fulfillment-only dispatch resolver reuses the newest active dispatch or
  serializably creates one queued dispatch. General dispatch creation remains
  restricted to dispatch managers.
- Receiving inbound items and approving production blockers remain additive
  manager operations; the dedicated fulfillment permission alone cannot
  perform them.

### Safe layered cancellation (2026-08-06)

- Status-menu cancellation opens a single-order, lazy-loaded review dialog. It
  no longer calls the legacy dispatch cancellation mutation or Trigger
  submission-deletion task directly.
- `Cancel Fulfillment` permits only queued, packing, missing-item, or packed
  dispatches without completion evidence. It cancels all reversible active
  dispatches, changes packed rows to `unpacked`, preserves packing history and
  delivery timestamps, and blocks unknown, in-progress, in-transit, completed,
  delivered, or proof-bearing dispatches.
- `Cancel Production` removes only active submissions tagged
  `sales_mark_as_completed`, before fulfillment begins. Manual/legacy
  submissions and shared reviews remain; pending unpaid payroll is soft
  deleted, later payroll blocks, exclusively automatic approved reviews become
  `CANCELLED`, and active readiness overrides are revoked.
- Automatic payment review is reverted only while its review method/action is
  still untouched and the cancelled layer is no longer justified.
- Inbound status, received quantities, stock, stock movements, inventory logs,
  and manual availability evidence are always preserved and displayed in the
  preview.
- The command requires a reason, revision, and idempotent request id; it
  rechecks eligibility inside a serializable transaction and atomically writes
  domain changes, rebuilt sales control, Sales History, and the cancellation
  ledger.
- Cancelled dispatch controls no longer project the parent order as terminal
  `Cancelled`. An explicitly cancelled sales order remains terminal.
- Ready-to-fulfill rows expose guarded production review when legacy production
  projections lag. `Cancel Fulfillment` is exposed only after the lifecycle
  shows that fulfillment has started; production completion alone never implies
  a reversible dispatch. The server preview remains the execution authority.

- The Sales Orders `Status` cell is a keyboard-accessible dropdown trigger styled with the shared ghost button variant while retaining the lifecycle status tone.
- The inline Status dropdown has no redundant `Mark as` label. Its first two
  actions are `Production completed` and `Fulfilled`.
- The current lifecycle controls rollback availability:
  - `Cancel Production` is available after production is complete and before fulfillment begins.
  - `Cancel Fulfillment` is available once fulfillment has started.
- Production completion and cancellation run as monitored sales-control tasks. A visible toast confirms that the background update started; terminal task effects publish `sales.production.changed`, refresh the affected queries, and show a visible success toast.
- Fulfillment completion publishes the existing fulfillment event; fulfillment cancellation uses the registered dispatch mutation event.
- Automatic production completion tags only the submissions it creates; `Cancel Production` soft-deletes those tagged submissions and preserves earlier manual production records. Orders with only legacy/manual completion records return an explicit unavailable error instead of reporting a no-op success.
- Fulfillment never completes a zero-item dispatch. Existing packed rows are
  preserved, and a dispatch must contain an active packed item before it can be
  marked complete. Automatic completion submissions attached to a pending
  `NOT_CONFIGURED` review are released only when their current sales control is
  explicitly non-production; genuine produceable pending reviews continue to
  block direct fulfillment tasks until the one-click dependency resolver has
  approved them.
- `Cancel Fulfillment` cancels every non-cancelled dispatch attached to the order in one transaction and resets the sale once. Every dispatch is constrained to that parent sale and the transaction rejects if the requested set does not match, preventing cross-order or partial cancellation.
- Dispatch cancellation notifications are emitted after commit and are non-fatal: notification delivery failures are logged without turning a committed status change into a false UI error.
- Sales menu portal interactions stop at the menu content boundary so selecting an inline status action does not open the underlying order row.
- When either action has configured inventory or a pending production material
  review, `Inventory needs attention` presents blocker rows in uppercase plus a
  complete automation summary. `Receive, approve and continue` receives every
  remaining item on linked active inbound shipments through the canonical stock
  service, resolves tracked needs, approves every pending review including
  genuine production, applies payment-review/payroll approval effects, records
  an audited override for residual non-stock checks, and only then starts the
  selected production-completion or fulfillment task.
- Fulfillment preflight also projects pending produceable work that pack-all
  would otherwise submit after the preview. The confirmation shows the number
  and quantity of production submissions it will prepare, creates them with
  automatic-completion provenance, approves any resulting review, and only then
  starts dispatch completion. Direct jobs retain the pending-review guard.
- When the resulting review is `NOT_CONFIGURED` and contains no physical
  component IDs, the confirmed resolver records a configuration exception with
  no stock change and runs the normal review approval side effects. Other review
  reasons cannot use that exception.
- Status safety reads bypass the dashboard's normal query stale window, and one
  status action remains locked from preflight through task acceptance. A retry
  therefore sees newly created reviews and dispatches instead of creating a
  duplicate empty dispatch from cached data.
- Preflight displays affected orders, inbound shipment and remaining quantity,
  production-review count, residual component checks, and the final production
  or dispatch action. For Fulfilled, `viewMarkSalesOrderFulfilled` authorizes
  every scoped resolver substep without additional Orders, Inbound Order, or
  Production grants. Production completed still requires `editOrders`,
  `editInboundOrder`, and `editProduction` together.
- The `Inbound` status cell uses the same non-button, button-variant visual treatment and retains the inbound status tone. Existing manual-inbound and inventory-inbound click behavior remains unchanged.

## 2026-08-26 One-click fulfillment retry hardening

- Automatic `sales_mark_as_completed` submissions may intentionally retain an
  unassigned production assignment when a privileged status-completion flow is
  submitting all remaining work. Material-review scope validation now accepts
  that exact provenance when the current null owner still matches the recorded
  null owner; ordinary unassigned submissions remain stale and cancelled.
- Automatic completion idempotency keys include a stable item-scope fingerprint
  and the latest material-review ID. Concurrent retries share one key, while a
  retry after a cancelled or rejected review creates a new review instead of
  replaying the closed key.
- Authenticated Chrome verification fulfilled local order `09454DB`. The
  dependency resolver approved the replacement unconfigured-material review,
  queued `update-sales-control`, and the Sales Orders row refreshed to
  `Fulfilled` after the local jobs worker completed the run.
- The status menu now awaits each monitored `update-sales-control` task-start
  promise before completing its production or fulfillment handoff. This keeps
  the component mounted long enough to register the run, surface start failure,
  and retain the status-action lock until Trigger accepts the task.
- Authenticated Chrome verification on `09406DB` reproduced dependency
  resolution and dispatch creation without a registered terminal task before
  the fix. After hot reload, the same flow showed `Sales status update started`,
  registered a successful `update-sales-control` run, completed dispatch `4515`,
  and refreshed the Sales Orders row to `Fulfilled`.

## 2026-08-29 Shared batch eligibility

- The Sales Orders and admin Sales Production batch bars use the same
  `SalesMenu.MarkAs` workflow. Production row actions also use that canonical
  workflow instead of the retired direct batch hook.
- Each selected order carries its current lifecycle evidence into the shared
  action. `Production completed` removes orders that are already production
  complete or fulfilled; `Fulfilled` removes orders that are already fulfilled.
- The eligible subset alone reaches inventory preflight, one-click dependency
  resolution, fulfillment-dispatch creation, and monitored sales-control task
  dispatch. Unknown candidates remain eligible so older callers retain their
  server-authoritative behavior.
- A mixed batch reports the number skipped and continues with eligible orders.
  An all-skipped batch closes as a no-op. It does not open per-order warning
  gates or resubmit terminal orders.
- Production Completed now queues one durable parent run, consistent with bulk
  Fulfilled, rather than triggering and monitoring one top-level run per order.
  The parent performs a server-side lifecycle recheck and reports `succeeded`,
  `already_completed`, `awaiting_review`, and `failed` outcomes. Canonical child
  updates retain sales-control authorization, special-order enforcement,
  inventory lifecycle sync, and seven-day idempotency.

## 2026-08-29 Canonical terminal-order filtering

- Status dependency preflight and one-click resolution now reload canonical
  delivery evidence before inventory, inbound, or production-review work.
  Orders already fulfilled are excluded from `Production completed` and
  `Fulfilled`; lifecycle states already past production are excluded from
  `Production completed`.
- This server-side subset is authoritative even when a browser selection is
  stale. The durable production-completion parent independently applies the
  same delivery-aware lifecycle projection and reports terminal candidates as
  already completed instead of starting child work again.
- The correction prevents one legacy order whose production statistics lag its
  completed delivery from aborting every eligible order in the batch.
- Authenticated Production QA resolved the formerly failing 40-row selection
  in one monitored run and refreshed Past Due from 1,058 to 1,018.

## Saved Query Counts

- Production, fulfillment, dispatch, and other registered Sales Orders domain events include the saved page-tab query targets.
- Saved page-tab list/default queries refetch inactive cache entries as well as active ones. A saved filter such as production complete plus fulfillment pending therefore updates its count after an order is fulfilled without a page reload.

## Validation

- 2026-08-27 production diagnosis on `09382LM` confirmed one completed
  production row, fulfillment pending at zero percent, and no active dispatch.
  The status-menu regression now excludes `Cancel Fulfillment` from
  `ready_to_fulfill` while retaining it for fulfillment-queued, packing, packed,
  in-transit, and fulfilled lifecycle states. Focused status/cancellation and
  status-feedback coverage passed 28 tests / 59 assertions; the exact mismatch
  harness, targeted Biome, and whitespace checks passed. Dashboard typecheck
  remains red on unrelated repository-wide baseline diagnostics.

- 2026-08-26 one-click fulfillment review/retry coverage passed 48 tests / 145
  assertions across status resolution, material-review decisions, and
  transactional sales-control tasks. The Sales package typecheck remains red
  only on the existing inbound-demand nullability and sales-control assignment
  ID diagnostics.

- 2026-08-07 fulfillment-created-review regression coverage passed 38 tests /
  117 assertions; Sales and API typechecks passed. Read-only live preflight on
  `09231LM` exposed its existing review and 13 units, while untouched `09228DB`
  projected four not-yet-created production submissions / five units and
  stopped before task or dispatch creation. The broad dashboard typecheck
  completed with its existing repository-wide errors and no captured diagnostic
  in the changed runtime file; the dev orders page returned HTTP 200.

- 2026-08-06 layered-cancellation coverage passed 53 focused tests / 115
  assertions, targeted Biome, and whitespace validation. `@gnd/sales` and
  `@gnd/api` typechecks passed for the cancellation slice, then a final shared
  worktree rerun was blocked by concurrent unrelated `sales-fulfillment-plan`
  stock-allocation typing changes. The broad dashboard typecheck remains red
  on its existing repository baseline; no changed cancellation runtime file is
  reported by the filtered diagnostic pass.
- Authenticated local browser QA verified delivered blocker evidence on
  `09166LRG`, queued fulfillment review/reason gating on `09163DB`, and
  automatic production review/reason gating on `09160LM`. No cancellation was
  submitted during browser QA and no console errors were recorded.

- 2026-08-06 focused dependency, inventory preflight, production decision,
  manual fulfillment, and sales-control coverage passed 40 tests / 126
  assertions; `@gnd/sales` typecheck and targeted Biome passed.
- Authenticated local browser validation on `09166LRG` showed the exact preview:
  inbound `119` with 162 remaining, one review covering five submissions, 32
  residual checks, then packing/dispatch completion. Confirmation completed
  inbound `119` at 100% with four received items, approved review `#4`, completed
  dispatch `4399` with five packed items, and refreshed the list to `Received` /
  `Fulfilled`.

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

## 2026-08-29 Bulk Fulfilled execution boundary

- `Fulfilled` now has one observable `bulk-mark-sales-fulfilled` parent for up
  to 40 unique positive Sales ids. Actor identity is stamped by the dashboard
  server action and the worker rechecks `viewMarkSalesOrderFulfilled`.
- Each ready order is delegated to the canonical `update-sales-control` child
  task with a seven-day request/order idempotency key. Failures are isolated by
  order and returned in an aggregate result rather than hidden behind browser
  fan-out.
- Terminal success invalidates Sales Orders and Fulfillment projections before
  selection is released. The task output also carries the exact canonical
  Backlog count to close client query-order races.

## 2026-09-01 Fulfillment dependency consistency and inline failure feedback

- One-click production review decisions validate the logical submitted quantity.
  Handle-aware rows use `lhQty + rhQty` when either handle count is present, so
  a legacy negative aggregate `qty` does not cause a newly generated submission
  to be cancelled as stale.
- Production projections and packing eligibility now count a submission only
  when its `salesOrderId` matches the order being calculated. An assignment
  linked to an older submission from another order cannot inflate production
  completion or become a dispatch deliverable for its current order.
- Automatic fulfillment can detach non-production submissions from a pending
  `NOT_CONFIGURED` material review. If that leaves the review empty, the same
  transaction cancels it with an explicit resolution so the packing guard does
  not block on an orphaned review.
- A failed `Receive, approve and continue` attempt remains inside the dependency
  modal and renders the safe classified title, message, and reference. The
  modal explicitly says whether the fulfillment or production-completion job
  did not start; the existing toast remains secondary feedback.
- Authenticated local verification on order `09543PC` identified assignments
  created on September 1 that referenced submissions created August 28-29 for
  `09239PC` and `23-0508-0014`. The exact legacy rebinding path is not proven by
  available audit history. The repair ignored those cross-order submissions,
  created the two units genuinely missing for `09543PC`, approved review `539`,
  completed delivery `4659`, and persisted dispatch completion at 39/39.
- Focused validation passed 63 tests / 190 assertions and the `@gnd/sales`
  typecheck passed. The broad dashboard typecheck remains red on its existing
  repository-wide baseline; it reports no diagnostic in the changed Sales menu.

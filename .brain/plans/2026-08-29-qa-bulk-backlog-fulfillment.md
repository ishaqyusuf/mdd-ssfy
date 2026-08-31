# Bulk Backlog Fulfillment QA and Hardening Plan

## Status

Completed on the verified local database on 2026-08-29. The approved 50-order
batch and five separately identified live-invalidation canaries completed; no
production or preview environment was touched.

## Objective

Prove that selecting the first 50 historical Backlog orders and choosing
`Mark as -> Fulfilled` completes every eligible order through a production-safe
background batch, refreshes Fulfillment counts and rows, records traceable
activity, and presents the same Fulfilled lifecycle state on Sales Orders when
filtered to the selected orders' creation-date range.

## Current-path finding

- Backlog passes the 50 selected sales ids into the canonical Sales `Mark as`
  menu.
- The menu performs one inventory preflight for the selection, but fulfillment
  then loops in the browser. For every order it calls
  `ensureSalesOrderFulfillmentDispatch` and separately triggers one
  `update-sales-control` Trigger.dev run.
- Each child job has a 120-second limit and queue concurrency 10, but the batch
  itself has no single durable run, aggregate outcome, or idempotent batch
  boundary. The browser must successfully complete up to 100 sequential request
  round trips for 50 orders.
- The UI already invalidates Sales Orders plus the dispatch list, backlog,
  summary, detail, overview, exceptions, and driver-workload queries. The QA
  must prove those invalidations happen after terminal batch completion, not
  merely after the child runs are accepted.

## Assumptions

- The active environment must resolve to the local database. Any hosted or
  production fingerprint is an immediate stop.
- The first loaded Backlog page contains the intended 50 historical records.
- `viewMarkSalesOrderFulfilled` and the existing special-order/inventory guards
  remain authoritative; the QA will not bypass them silently.
- A successful batch may contain explicit `already_fulfilled` idempotent skips,
  but unexplained skips or failures are not acceptance.

## Execution plan

### 1. Establish the controlled runtime

1. Inspect the existing dashboard/jobs processes and Portless ownership without
   stopping or reconfiguring the shared proxy.
2. Start `bun run dev --filter dashboard jobs` in a Codex-managed PTY so its
   output remains observable throughout the run.
3. If the user's existing process owns the fixed dashboard/jobs ports, do not
   kill it. Either attach to the existing observable output or pause for
   permission to release the conflicting process.
4. Confirm from startup output that dashboard and jobs are using the local
   database profile. Record the QA start timestamp and clear only the browser's
   current-page error/log view, not application data.

### 2. Capture the immutable pre-mutation evidence set

1. Hard-refresh Backlog and restore `Created` ascending so the oldest records
   are first.
2. Select the first loaded page only and confirm exactly 50 selected rows.
3. Record a privacy-bounded manifest containing `salesId`, order number,
   created date, current lifecycle, and current dispatch/backlog projection for
   all 50. Do not persist customer phone/address data.
4. Record the initial Backlog analytics count, visible row count, earliest and
   latest selected creation dates, and the first/last order numbers.
5. Run a read-only local database check for those exact ids to identify deleted,
   already-fulfilled, special-order, pending-review, or existing-dispatch cases
   before any writes.

### 3. Replace browser fan-out with one durable batch boundary

1. Add a capped batch-fulfillment payload for 1-50 unique positive sales ids,
   actor metadata resolved on the server, and a stable request/idempotency key.
2. Add one Trigger.dev batch task, rather than 50 browser-triggered tasks. The
   task will process each order independently through the existing
   `markAsCompletedTask` authority; it will not duplicate packing or fulfillment
   business logic.
3. Resolve or create each fulfillment dispatch inside the background task with
   idempotent lookup and bounded Serializable retry. Do not wrap all 50 orders
   in one database transaction.
4. Use bounded concurrency/chunks to avoid connection spikes and lock pressure.
   Configure a job duration appropriate for 50 historical orders while keeping
   each order's transaction short.
5. Return an aggregate result with per-order outcomes: succeeded, already
   fulfilled, inventory/special-order blocked, and failed with safe error text.
6. Make task retries replay-safe: an already-completed order/dispatch must be a
   successful idempotent outcome, not a second packing/activity/notification
   write.
7. Change the Backlog/Sales menu to trigger and monitor this single batch run.
   Clear selection after acceptance, show progress/result counts, and invalidate
   the canonical Sales and Fulfillment query families only after the batch
   reaches a terminal result (with a final invalidation for partial failure too).

### 4. Validate the batch contract before touching the 50 records

1. Add focused tests for payload caps, deduplication, permission/auth stamping,
   idempotent replay, existing active dispatch reuse, already-fulfilled skips,
   one-order failure isolation, and aggregate result counts.
2. Add a query-invalidation contract proving completion refreshes
   `sales.getOrders`, Sales summaries, dispatch list/index/backlog,
   `workspaceSummary`, detail/overview, exceptions, and driver workload.
3. Run only the focused Sales, Jobs, API, and dashboard tests plus scoped format
   and type checks for changed files. Existing unrelated baseline failures must
   be separated from regressions introduced here.
4. Gate the live mutation on zero relevant failures.

### 5. Run the 50-order local QA batch

1. Hard-refresh Backlog, reselect the exact manifest ids, and confirm the UI
   still reports 50 selected.
2. Choose `Mark as -> Fulfilled` once. If inventory preflight blocks the batch,
   capture blocker counts/reasons. Do not blanket-override unexpected inventory
   or special-order restrictions; fix a legacy-compatibility defect only when
   the persisted evidence proves that is the intended behavior.
3. Confirm exactly one batch run is accepted and visible in the task monitor.
4. Follow dashboard and jobs logs until terminal completion. Track per-order
   starts/completions, retries, transaction conflicts, timeouts, notification
   failures, and unhandled exceptions.
5. If any order fails, preserve the successful results, diagnose and fix the
   root cause, then retry only failed/idempotently incomplete ids through the
   same batch boundary.

### 6. Verify Fulfillment invalidation and activity

1. Without manually reloading first, confirm completed orders disappear from
   Backlog and the table refills from the next cursor page.
2. Confirm the Backlog analytics count decreases by the number of orders that
   transitioned out of Backlog; compare exact before/after values rather than
   assuming `-50` when there are legitimate idempotent skips.
3. Open All and verify each successful manifest order projects `Fulfilled` with
   consistent packed totals and a completed dispatch.
4. Sample activity on the first, middle, and last orders, plus every retried or
   exceptional order. Confirm actor, timestamp, fulfillment/dispatch event, and
   absence of duplicate activity from retries.
5. Run a read-only database reconciliation for all 50 ids: canonical lifecycle,
   completed delivery, packed controls/items, active/deleted dispatch shape, and
   duplicate-dispatch count.

### 7. Cross-check the Sales Orders page

1. Navigate to `/sales-book/orders` and apply the creation-date range captured
   from the manifest using the existing `dateRange` filter.
2. Filter or search by the exact selected order numbers/ids within that range;
   do not treat other orders sharing those dates as evidence.
3. Verify all successful manifest orders show `Fulfilled` in the list and in
   Sales Overview. Compare the exact success/idempotent/failure sets from the
   batch result.
4. Confirm Sales summary counts and saved-tab counts refresh without a manual
   page reload; then perform one hard reload to prove the persisted state is
   identical to the client-refreshed state.

### 8. Production-runtime readiness review

1. Confirm the browser/API request only enqueues one bounded job and returns
   well below the deployment request limit; no Vercel request waits for 50
   fulfillment transactions.
2. Report observed batch duration, slowest order, transaction retry count,
   concurrency, database errors, and job memory/runtime headroom.
3. Confirm job duration and retry policy cover the observed worst case with a
   documented safety margin, while idempotency prevents duplicate writes.
4. Confirm partial failures remain visible and retryable by exact ids and are
   never presented as a full success.

### 9. Closeout evidence

1. Produce a QA matrix containing all 50 order numbers and their before state,
   batch outcome, Fulfillment result, Sales Orders result, and activity result.
2. Record issues found, fixes applied, focused test output, runtime timings, and
   remaining production risks.
3. Update the Sales Dispatch/API/Jobs Brain contracts and progress log for any
   implemented behavior changes. Database/migration docs change only if the
   approved fix truly changes schema.

## Acceptance criteria

- One user action creates one durable, observable batch run for exactly the 50
  deduplicated ids.
- Every eligible order ends Fulfilled; legitimate skips and failures are
  explicitly enumerated.
- Backlog rows and analytics refresh after terminal completion without manual
  reload and reconcile exactly with the batch result.
- Sales Orders shows the same Fulfilled state for every successful id in the
  selected created-date range, before and after hard reload.
- No duplicate dispatch, packing, activity, or notification writes occur on
  retry.
- No relevant dashboard/jobs error, request timeout, job timeout, deadlock, or
  silent partial failure remains.
- The production web request performs enqueue-only work; long-running work is
  contained within the bounded background job.

## Approval boundary

Approval authorizes the local code changes, local dashboard/jobs startup, and
the described 50-order mutation against the verified local database only. It
does not authorize any production/preview mutation, blanket inventory override,
stopping the user's existing process, or deployment.

## Completion evidence

- The original 50-order selection produced one durable
  `bulk-mark-sales-fulfilled` parent run (`run_06g4pc7urgb7odev1goojn2l01`),
  which completed successfully in approximately 2.2 seconds.
- All 50 orders project Fulfilled, have one completed delivery with packed
  lines, and have a `Sales Dispatch Completed` activity. Reconciliation found
  no active leftovers or duplicate non-cancelled dispatches.
- Backlog moved from 4,612 to 4,562 for the approved batch. The exact 50 were
  absent after refresh and all 50 projected Fulfilled through the canonical
  Sales Orders lifecycle; browser samples included the first, middle,
  production-null, production-started, and last records.
- A terminal invalidation race was found: the row query refreshed before the
  analytics summary. The parent result now returns the canonical final Backlog
  count and the persistent task watcher applies that exact value after query
  invalidation. Final canary `23-1101-628` proved 4,558 to 4,557 live, with the
  row and selection bar clearing without reload; local database count was
  exactly 4,557.
- Focused coverage passed 42 tests / 104 assertions and scoped Biome plus
  `git diff --check` passed. Package typechecks remain red only on documented
  repository baselines outside this slice.
- Full evidence is recorded in
  `.brain/reports/2026-08-29-bulk-backlog-fulfillment-qa.md`.

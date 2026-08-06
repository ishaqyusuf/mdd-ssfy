# Mark As Completed Double Production Submit

## Status

Fixed on 2026-08-06 after follow-up production-shaped regressions exposed an
empty-submission path and an empty-dispatch false completion.

## Symptom

The `update-sales-control` job failed during `markAsCompletedTask` with
`Unable to complete, nothing to submit!`. The stack ended at the
`submitAllTask` call inside `packDispatchItemTask`. The failure recurred on
2026-08-06 after the initial duplicate-submit fix because the order could
legitimately have no pending production while still having produced
deliverables ready to pack.

## Root Cause

Two related assumptions caused the incident:

1. `markAsCompletedTask` originally submitted pending production before calling
   `packDispatchItemTask` with `packMode: "all"`, even though pack-all owns the
   auto-assign, production-submit, and packing sequence. Removing that duplicate
   call fixed the first observed state.
2. Pack-all still called the strict direct-submit path unconditionally. A valid
   completion can enter pack-all after production was submitted previously, so
   the production plan is empty while existing deliverables remain packable.
   The shared submit routine treated that workflow no-op as a command error and
   prevented packing and dispatch completion.
3. Fulfillment completion passed `replaceExisting: true`, so an existing packed
   dispatch could be unpacked before completion. It also completed the dispatch
   when packing created no rows. Orders with submissions awaiting material
   review therefore accumulated completed zero-item dispatches while the list
   correctly remained `Ready to fulfill` because empty dispatches are excluded
   from lifecycle status.

## Fix And Prevention

- Removed the redundant outer `submitAllTask` call from
  `markAsCompletedTask`.
- Added an explicit internal empty-submission policy to `submitAllTask`.
  Pack-all/pack-available use `skip`, allowing them to continue with existing
  deliverables when no production remains; direct production submission keeps
  the default strict error.
- Added regressions for both completion states: pending production is submitted
  exactly once, and already-produced deliverables complete without another
  submission. A separate assertion locks the strict direct-submit behavior.
- Fulfillment completion now preserves existing packed rows. If packing creates
  no row, it confirms that the selected dispatch already has an active packed
  item before completing it. Zero-item dispatches are rejected with a specific
  pending-material-review error when applicable, so protected unapproved
  production quantity cannot produce a false fulfillment.
- Automatic `sales_mark_as_completed` submissions for explicitly
  non-production controls can inherit a pending `NOT_CONFIGURED` review from
  the broad production-completion path. Pack-all now releases only those exact
  non-production submissions from the review before packing, records an audit
  history row, and leaves genuine produceable pending reviews protected.

## Validation

- The follow-up minimized repro failed twice with the exact reported
  `submitAllTask -> packDispatchItemTask -> markAsCompletedTask` stack before
  the fix and passed afterward.
- The focused sales-control transaction suite passed with 20 tests / 71
  assertions after adding empty-dispatch and non-production-release regressions.
- `@gnd/sales` and `@gnd/jobs` typechecks passed.
- `git diff --check` passed. The full-file Biome check remains noisy from the
  transaction fixture's existing explicit-`any` diagnostics.
- Authenticated dev browser verification marked the first ten visible orders
  production-complete, including already-ready and awaiting-production states.
  Inventory preflight overrides were applied where the UI required them; all
  ten finished at `Ready to fulfill`, and the reported empty-submission error
  did not recur.
- Trigger production jobs version `20260806.5` deployed successfully with 41
  detected tasks. The jobs build config now declares Prisma extension
  `mode: "legacy"`, as required by Trigger 4.5.9.
- Authenticated dev reproduction on `09168PC` confirmed four completed legacy
  dispatches with zero items and one pending production material review. A full
  page reload remained `Ready to fulfill`, proving the state was not a stale UI
  cache. After the local fix, the same Fulfilled action created dispatch `4404`
  with one packed item, detached only automatic non-production submission
  `12388` from review, and the refreshed list showed `Fulfilled`.
- Local first-ten proof fulfilled `09168PC`, `09167DB`, `09165AD`, and
  `09162AD`. The other six correctly remained blocked with genuine pending
  material reviews. Trigger version `20260806.6` was not deployed: the first
  remote image attempt ended on a builder connection reset, and its retry was
  stopped before completion at the user's request to validate local dev first.
- Follow-up order `09166LRG` proved that preserving genuine pending reviews was
  correct for direct tasks but incomplete for the explicit one-click operator
  workflow. ADR-048 now governs that path: it receives linked inbound, approves
  all genuine production reviews, audits residual non-stock checks, and then
  starts packing. Local proof completed inbound `119` (four items, 162 good,
  100%), approved review `#4`, packed five dispatch items, and changed the
  rendered lifecycle from `Ready to fulfill` to `Fulfilled` without a build or
  deployment.

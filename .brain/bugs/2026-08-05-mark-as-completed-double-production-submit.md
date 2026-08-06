# Mark As Completed Double Production Submit

## Status

Fixed on 2026-08-06 after a follow-up production-shaped regression exposed a
second empty-submission path.

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

## Validation

- The follow-up minimized repro failed twice with the exact reported
  `submitAllTask -> packDispatchItemTask -> markAsCompletedTask` stack before
  the fix and passed afterward.
- The focused sales-control transaction suite passed with 18 tests / 63
  assertions.
- `@gnd/sales` and `@gnd/jobs` typechecks passed.
- `git diff --check` passed. The full-file Biome check remains noisy from the
  transaction fixture's existing explicit-`any` diagnostics.
- Authenticated dev browser verification marked the first ten visible orders
  production-complete, including already-ready and awaiting-production states.
  Inventory preflight overrides were applied where the UI required them; all
  ten finished at `Ready to fulfill`, and the reported empty-submission error
  did not recur.

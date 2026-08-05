# Mark As Completed Double Production Submit

## Status

Fixed on 2026-08-05.

## Symptom

The `update-sales-control` job failed during `markAsCompletedTask` with
`Unable to complete, nothing to submit!`. The stack ended at the
`submitAllTask` call inside `packDispatchItemTask`.

## Root Cause

`markAsCompletedTask` submitted all pending production work and then called
`packDispatchItemTask` with `packMode: "all"`. Pack-all already owns the full
auto-assign, production-submit, and packing sequence, so it submitted the same
scope again. The first call consumed the pending scope; the second correctly
found nothing and threw an error that was incorrect for the enclosing completion
workflow.

## Fix And Prevention

- Removed the redundant outer `submitAllTask` call from
  `markAsCompletedTask`.
- Kept the strict empty-scope error for direct production submission commands.
- Added a regression fixture that reproduces the original submit -> pack-all ->
  empty second-submit sequence and proves completion submits production once,
  packs once, and writes the completion note once.

## Validation

- The minimized repro failed twice with the exact production stack before the
  fix and passed afterward.
- Focused sales-control coverage passed with 28 tests / 99 assertions.
- `@gnd/sales` typecheck passed.

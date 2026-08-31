# Bulk Backlog Fulfillment QA Report

Date: 2026-08-29
Environment: local only (`gndprodesk.localhost`, local database profile)
Parent run: `run_06g4pc7urgb7odev1goojn2l01`

## Outcome

- Approved batch: 50 selected, 50 succeeded, 0 failed, 0 active leftovers.
- Observed parent duration: approximately 2.2 seconds.
- Backlog for the approved batch: 4,612 before, 4,562 after.
- Integrity: 50 completed non-cancelled dispatches, every dispatch has packed
  lines, 50 `Sales Dispatch Completed` activities, and no duplicate
  non-cancelled dispatches for the selected orders.
- Canonical Sales Orders lifecycle: 50 of 50 Fulfilled.
- The request path enqueues one parent; it does not wait for 50 database
  transactions. The parent has a 900-second maximum, queue concurrency 2, and
  delegates canonical 120-second child updates with queue concurrency 10.
- Each dispatch resolution uses a short per-order serializable transaction with
  bounded retry. There is no 50-order transaction.

## Privacy-bounded 50-order matrix

Every row below had the same verified result: parent outcome `succeeded`, one
completed delivery, packed delivery lines present, canonical Sales state
`Fulfilled`, completion activity present, and no duplicate active dispatch.

| # | Sales id | Order | Result |
|---:|---:|---|---|
| 1 | 70 | 23-0508-0014 | Fulfilled / packed / activity |
| 2 | 272 | 23-0712-0192 | Fulfilled / packed / activity |
| 3 | 297 | 23-0721-0216 | Fulfilled / packed / activity |
| 4 | 342 | 23-0804-0342 | Fulfilled / packed / activity |
| 5 | 357 | 23-0810-357 | Fulfilled / packed / activity |
| 6 | 414 | 23-0828-414 | Fulfilled / packed / activity |
| 7 | 424 | 23-0905-424 | Fulfilled / packed / activity |
| 8 | 447 | 23-0911-447 | Fulfilled / packed / activity |
| 9 | 474 | 23-0918-474 | Fulfilled / packed / activity |
| 10 | 481 | 23-0921-481 | Fulfilled / packed / activity |
| 11 | 496 | 23-0925-496 | Fulfilled / packed / activity |
| 12 | 497 | 23-0926-497 | Fulfilled / packed / activity |
| 13 | 502 | 23-0926-502 | Fulfilled / packed / activity |
| 14 | 503 | 23-0926-503 | Fulfilled / packed / activity |
| 15 | 508 | 23-0926-508 | Fulfilled / packed / activity |
| 16 | 511 | 23-0927-511 | Fulfilled / packed / activity |
| 17 | 529 | 23-1003-528 | Fulfilled / packed / activity |
| 18 | 531 | 23-1004-531 | Fulfilled / packed / activity |
| 19 | 538 | 23-1006-538 | Fulfilled / packed / activity |
| 20 | 540 | 23-1006-540 | Fulfilled / packed / activity |
| 21 | 541 | 23-1006-541 | Fulfilled / packed / activity |
| 22 | 542 | 23-1006-542 | Fulfilled / packed / activity |
| 23 | 564 | 23-1011-564 | Fulfilled / packed / activity |
| 24 | 567 | 23-1011-567 | Fulfilled / packed / activity |
| 25 | 571 | 23-1013-571 | Fulfilled / packed / activity |
| 26 | 580 | 23-1018-580 | Fulfilled / packed / activity |
| 27 | 585 | 23-1018-585 | Fulfilled / packed / activity |
| 28 | 586 | 23-1019-586 | Fulfilled / packed / activity |
| 29 | 587 | 23-1019-587 | Fulfilled / packed / activity |
| 30 | 590 | 23-1020-590 | Fulfilled / packed / activity |
| 31 | 594 | 23-1020-594 | Fulfilled / packed / activity |
| 32 | 595 | 23-1020-595 | Fulfilled / packed / activity |
| 33 | 597 | 23-1020-597 | Fulfilled / packed / activity |
| 34 | 598 | 23-1023-598 | Fulfilled / packed / activity |
| 35 | 599 | 23-1023-599 | Fulfilled / packed / activity |
| 36 | 600 | 23-1023-600 | Fulfilled / packed / activity |
| 37 | 602 | 23-1023-602 | Fulfilled / packed / activity |
| 38 | 603 | 23-1023-603 | Fulfilled / packed / activity |
| 39 | 605 | 23-1023-605 | Fulfilled / packed / activity |
| 40 | 607 | 23-1024-607 | Fulfilled / packed / activity |
| 41 | 610 | 23-1024-610 | Fulfilled / packed / activity |
| 42 | 614 | 23-1025-614 | Fulfilled / packed / activity |
| 43 | 615 | 23-1026-615 | Fulfilled / packed / activity |
| 44 | 616 | 23-1026-616 | Fulfilled / packed / activity |
| 45 | 617 | 23-1027-617 | Fulfilled / packed / activity |
| 46 | 618 | 23-1030-618 | Fulfilled / packed / activity |
| 47 | 620 | 23-1030-620 | Fulfilled / packed / activity |
| 48 | 621 | 23-1030-621 | Fulfilled / packed / activity |
| 49 | 622 | 23-1031-622 | Fulfilled / packed / activity |
| 50 | 623 | 23-1031-623 | Fulfilled / packed / activity |

Production-state edge samples were retained rather than normalized: id 585 had
no production status and id 595 had `Started`; both completed through the same
canonical fulfillment boundary and project Fulfilled.

## Sales Orders cross-check

- Creation-date range used: 2023-05-08 through 2023-11-01 (inclusive end used
  to cover local-time rendering of the final October records).
- Browser samples `23-0508-0014`, `23-1018-585`, `23-1020-595`, and
  `23-1031-623` displayed Fulfilled.
- Database canonical lifecycle projection confirmed all 50, not only samples.

## Live invalidation defect and canaries

The approved batch proved persistence and list invalidation, but the workspace
summary could finish an older refetch after the Backlog list and stay one
transition behind. Five additional, separately identified local canaries were
used while diagnosing and closing that race: `23-1101-624`, `23-1101-625`,
`23-1101-626`, `23-1101-627`, and `23-1101-628`.

The durable fix returns the authoritative final `backlogCount` from the parent
and applies it after terminal query invalidation. The final canary started at
4,558 and, without reload, removed its row, cleared the selection bar, and
updated both Backlog analytics surfaces to 4,557. A read-only database check
also returned 4,557; dispatch 4655 was completed with seven item rows.

## Validation

- Focused tests: 42 passed, 0 failed, 104 assertions.
- Scoped Biome: passed.
- `git diff --check`: passed.
- `@gnd/sales` typecheck: blocked only by existing inbound-demand nullability
  and sales-control assignment-id errors.
- `@gnd/jobs` typecheck: blocked only by the same existing errors plus the
  existing `@gnd/email` React JSX-runtime diagnostics.
- Live cmux dashboard pane compiled successfully and continued returning HTTP
  200 responses. The jobs worker accepted and completed the parent/children.

Observed unrelated local warnings: Redis cache operations were skipped because
the optional local cache was not connected; Node reported an invalid
`--localstorage-file` path; a scheduled Sales Handoff reconciliation reported
149 of 200 failures. These were not caused by this batch and were not changed.

No database schema, migration, relationship, production, preview, or deployment
change was made.

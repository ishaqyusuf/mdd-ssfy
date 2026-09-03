# Task: Sales Reporting Consistency Fixes

## Status
Done

## Priority
High

## Created Date
2026-09-03

## Last Updated
2026-09-03

## Global Ticket
- Ticket Position: 1/1

## Source Context
Implement the approved Sales reporting consistency plan: canonical lifecycle
statuses in order workbooks, shared relative-date normalization in Sales
Finance, a fixed 2016 Sales Dashboard all-time boundary, and dual booked versus
tax-recognized totals in the Sales Tax workbook.

## Implementation Progress
- Completion: 100%
- Current Checklist: Complete
- Blockers: None

## Implementation Checklist
- [x] Add focused failing regression coverage for the four approved behaviors.
- [x] Export canonical Sales Pipeline lifecycle labels in order-based workbooks.
- [x] Normalize Sales Finance date presets before constructing API inputs.
- [x] Anchor the Sales Dashboard All Time period at January 1, 2016.
- [x] Add dashboard booked sales alongside tax-recognized totals.
- [x] Run focused validation and resolve regressions.
- [x] Update Brain feature, API contract, task, and progress documentation.
- [x] Complete code review, scoped commit, and final verification.

## Validation Evidence
- Confirmed before implementation that `from: "last 6 months"` fails the
  Sales Finance schema's date-only validation.
- Focused red run: 12 tests passed, 5 failed, and one missing-export error;
  each failure maps directly to an approved reporting behavior.
- Canonical workbook contract: 6 tests pass with Lifecycle Status labels.
- Sales Finance normalization: 2 tests pass; singular/plural six-month presets
  produce schema-valid date-only API inputs.
- All Time remains anchored to `2016-01-01` under a future-year regression.
- Tax workbooks expose Dashboard Booked Sales alongside immutable
  tax-recognized totals and remain downloadable with zero recognized rows.
- Canonical status loading is verified in 250-row batches and the API report
  adapter ignores contradictory legacy status text.
- Combined focused validation passes 66 tests with 383 assertions across the
  Sales, API, Dashboard, Finance migration-parity, workbook, and shared
  date-filter seams. Scoped `git diff --check` passes.
- Parallel code review identified shared-boundary placement, cross-app test
  coupling, duplicate lookup, acceptance-coverage, and tax-entry wording gaps;
  all findings were corrected before the scoped commit.
- The shared Sales package now owns the `2016-01-01` business-data boundary;
  API-schema compatibility tests remain inside the API package, and every
  canonical headline label is exercised across each order-source workbook.
- Implementation commit: `e0092cad3` (`fix: align sales reporting contracts`).

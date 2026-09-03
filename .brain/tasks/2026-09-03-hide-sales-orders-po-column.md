# Task: Hide Sales Orders P.O. Column

## Status
Done

## Priority
Medium

## Created Date
2026-09-03

## Last Updated
2026-09-03

## Global Ticket
- Ticket Position: 1/1

## Source Context
Remove the standalone P.O. column from the shared active/bin Sales Orders table and render a compact actual-value P.O. badge beside the order number only when a meaningful P.O. exists. Preserve P.O. search, filters, exports, detail/edit, and document behavior.

## Implementation Progress
- Completion: 100%
- Current Checklist: 5/5 — Complete
- Blockers: None

## Implementation Checklist
- [x] Add focused failing presentation and saved-layout tests.
- [x] Remove the standalone column and add the conditional accessible P.O. badge.
- [x] Run focused tests, the Sales Orders table suite, and Dashboard typecheck.
- [x] Complete desktop/mobile browser verification and final code review.
- [x] Synchronize Brain documentation and commit the scoped change.

## Validation Evidence
- Red/green P.O. badge seam established; focused badge and table-settings tests pass 5/5 with 17 assertions.
- The full Sales Orders table folder plus table-settings regression passes 20/20 with 56 assertions.
- Scoped Biome check passes after correcting one test-file wrapping issue.
- Dashboard typecheck was rerun with the declared `@gnd/dashboard` package name and an 8 GB heap; it remains red on the documented broad pre-existing baseline outside the touched files.
- Authenticated browser QA verified the active table at 1280x720 and 390x844, including a real `10491-2` P.O. badge (45.6 px, capped at 88 px), accessible label and tooltip, retained Inbound header, and no document overflow.
- Authenticated browser QA verified the shared Bin table at 390x844 with no P.O. header, retained Inbound header, and no document overflow.
- Final standards/spec review found and fixed intrinsic-width clipping for long flex content; the repeated focused suite, Biome, and diff-integrity checks are clean.

## Documentation Impact
- Updated `.brain/features/sales-orders-v2.md`, `.brain/progress.md`, and the task ledgers.
- No API, permission, database schema, migration, relationship, or ADR update is required because all underlying P.O. contracts and persistence remain unchanged.

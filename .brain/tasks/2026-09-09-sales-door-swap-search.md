# Task: Sales door swap and search

## Status
Done

## Priority
Medium

## Created Date
2026-09-09

## Last Updated
2026-09-09

## Global Ticket
- Ticket Position: 1/1

## Source Context
Fix Swap Door failing to open when the sales form contains more than one item. Add search to the swap modal.

## Implementation Progress
- Completion: 100%
- Current Checklist: 4/4 — Update Brain and commit
- Blockers: None

## Implementation Checklist
- [x] Diagnose multi-item opening and establish regression coverage
- [x] Fix opening and add searchable door candidates
- [x] Run focused/full relevant tests, typechecking, and code review
- [x] Update Brain and commit on the current branch

## Validation Evidence
- Clean checkout on master before work.

- Browser reproduction: fourth Swap Door on six-item 09623PC returned zero dialogs. Using this real UI reproduction plus existing workflow tests; no new TDD seam was pre-agreed.
- Fix activates the clicked line before opening, ensuring modal and candidate queries share its route context in both panels. Search uses case-insensitive title/label/UID matching.

- Focused tests: 28 pass / 101 assertions. Full relevant workflow UI suite: 220 pass / 782 assertions across 36 files.
- Sales package typecheck attempted: existing src/copy-sales.ts:521 nullable string TS2322 blocks a clean result; touched files have no reported errors.
- Browser acceptance on local 09623PC: fourth-item modal now opens with Bifold source; mixed-case padded MADISON search returns one candidate; unmatched search shows empty guidance; Cancel then first-item swap resets search and shows Garage source with autofocus. No replacement selected or order saved.
- Brain impact: feature and task/status documentation only; no API/schema/ADR required for this UI correction.

- Code review: Standards — no violations, only optional minor repetition observations; Spec — no findings. Keyboard Escape dismissal verified.

- Implementation committed on master: 77f0a8da6. No order data changes or deployment.

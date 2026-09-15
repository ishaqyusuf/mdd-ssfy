# Task: Template 2 Totals-Only Sales Printing

## Status
Complete

## Priority
Medium

## Created Date
2026-09-15

## Last Updated
2026-09-15

## Global Ticket
- Ticket Position: 1/1

## Source Context
Implement the approved Template 2-only Sales print variant that removes item-level Rate and Total columns while preserving document identity, header Balance Due, and the complete footer pricing summary. Quote Print/PDF menus expose Detailed and Totals only; order Print adds Order (Totals only) while existing actions remain.

## Implementation Progress
- Completion: 100%
- Current Checklist: 6/6 — Implementation, focused validation, review, and documentation complete
- Blockers: None

## Implementation Checklist
- [x] Add the pricing-display contract and focused composition coverage
- [x] Propagate the variant through cache, access, preview, download, and snapshot paths
- [x] Add the approved shared Sales menu options and labels
- [x] Run focused Sales print and menu tests plus scoped integrity checks
- [x] Update Brain feature/API/progress documentation and complete code review
- [x] Commit the completed implementation on the current branch

## Validation Evidence
- Red/green composition seam: the new totals-only test first failed with Rate/Total columns still present, then passed after the shared contract and composition behavior were added.
- `bun test packages/sales/src/print/get-print-data.test.ts`: 14 passed, 0 failed, 93 assertions.
- Focused composition/menu/cache/service/continuation/HTML/PDF matrix: 75 passed, 0 failed, 288 assertions.
- Access resolution with configured test secret: 8 passed, 0 failed, 28 assertions.
- Scoped `git diff --check`: passed.
- Final specification review found no unresolved implementation gaps. The remaining reviewer note concerns pre-existing snapshot-locator branch duplication and does not affect this feature's behavior.

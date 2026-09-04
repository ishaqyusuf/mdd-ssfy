# Task: Production Item Collapse Toggle

## Status
Done

## Priority
Medium

## Created Date
2026-09-04

## Last Updated
2026-09-04

## Global Ticket
- Ticket Position: 1/1

## Source Context
Allow a Production item that is already expanded to collapse when the user
clicks the item again. The same toggle behavior must apply to the item title and
the accordion chevron while preserving URL-backed selection for open items.

## Implementation Progress
- Completion: 100%
- Current Checklist: Complete
- Blockers: None

## Implementation Checklist
- [x] Define the expansion-policy regression
- [x] Implement collapse behavior for the active item
- [x] Run focused validation and browser verification
- [x] Review and commit the scoped change

## Validation Evidence
- Existing `singleOpen` behavior always rewrites the active item into
  `prod-item-view`, and the V2 accordion ignores its empty close value. Together
  these make the first click expand but prevent the second click from collapsing.
- Red/green policy regression passes with 5 tests and 6 assertions. The next
  expansion state now clears both the controlled accordion value and
  `prod-item-view` when the active item is selected again.
- Focused validation passes 14 tests with 10 assertions across expansion policy,
  assignment ledger, and item auto-scroll; scoped Biome checks pass.
- Authenticated browser verification on order `09551PC` confirms the first item
  click expands and writes `prod-item-view`, while the second click collapses
  the item and removes the URL parameter. The visible accordion chevron also
  collapses the active item and clears the parameter.
- Code review identified that Radix's single accordion needed its explicit
  `collapsible` contract. The prop and a source-level regression assertion were
  added before completion.
- Dashboard typecheck was attempted but exhausted Node's default 4 GB heap
  without producing a TypeScript diagnostic.

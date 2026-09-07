# Task: Add Sales Form Step List V2

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
Version the shared Sales Form workflow step list. Preserve the current pill-based UI as V1, add a V2 matching the approved GStack Calm Split hierarchy (`value / value / value` with only the active step highlighted), and opt only the Dashboard New Sales Form into V2. Do not change any other Sales Form layout or behavior.

Design reference: `/Users/M1PRO/.gstack/projects/gnd/designs/invoice-editor-options-20260825/option-a-desktop.png`.

## Implementation Progress
- Completion: 100%
- Current Checklist: 6/6 — Complete
- Blockers: None

## Implementation Checklist
- [x] Inspect the current shared step-list contract, consumers, design artifact, and closest Midday composition pattern
- [x] Extract a versioned shared step-list component while preserving V1
- [x] Implement the slash-separated V2 hierarchy and responsive/accessibility behavior
- [x] Opt only the Dashboard New Sales Form into V2
- [x] Add focused regression coverage and run package/type/style validation
- [x] Run final conformance/code review and document the feature outcome

## Validation Evidence
- Current rendering seam: `WorkflowLineList` -> `InvoiceItemCard` in `@gnd/sales`.
- Dashboard New Sales Form consumers: the package workflow
  (`DashboardSalesFormWorkflowPanel` -> `SalesFormEnginePanel`) and fallback
  `ItemWorkflowPanel` both explicitly select V2.
- Dealership and basic workflow consumers will retain the default V1 contract.
- Formal TDD was not selected because no test seam was pre-agreed with the user; focused public-render regression coverage will validate the existing `WorkflowLineList` seam after implementation.
- Focused workflow rendering passes 4 tests / 35 assertions, including default
  V1 preservation and V2 hierarchy, separator spacing, flush header placement,
  12px uppercase typography, active state, and multi-line wrapping without
  horizontal overflow.
- `@gnd/sales` TypeScript validation and scoped Biome checks pass. Dashboard's
  default broad typecheck exhausted the Node 4 GB heap; a 6 GB retry completed
  and reproduced the repository's broad pre-existing TypeScript baseline. The
  touched legacy fallback file retains four pre-existing Biome findings.
- Authenticated local browser QA confirms the Dashboard New Sales Form renders
  `Garage Door / SC Molded / Height / ...` with only the current step softly
  highlighted and no visible scrollbar.
- Follow-up pixel review against `option-a-desktop.png` removed the extra top
  margin, aligned the 43px strip directly beneath the item header, added reliable
  8px spacing around `/`, and matched normal/bold hierarchy weights.
- A second typography pass increased V2 from 11px to 12px and applied uppercase
  presentation to every step label without changing accessible names.
- A responsive follow-up replaced the V2 minimum-content horizontal scroller
  with `flex-wrap`. Complete separator/step units now move to the next line and
  the hierarchy strip grows vertically instead of clipping or scrolling left.
- No database, migration, API, auth, permission, pricing, or save-contract
  changes were required.

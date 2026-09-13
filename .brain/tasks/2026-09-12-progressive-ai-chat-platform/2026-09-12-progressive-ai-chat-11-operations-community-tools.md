# Task: Progressive AI Chat T11 — Add production, inventory, fulfillment, and Community reads

## Status
Done

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 11/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
Broaden the typed domain catalog across GND operations. Depends on T05, T08, T10, and T17.

## Implementation Progress
- Completion: 100%
- Current Checklist: 7/7 complete
- Blockers: None for implementation. T17 remains the pilot activation gate.

## Implementation Checklist
- [x] Add worker/manager-scoped production assignment and schedule tools.
- [x] Add inventory availability, demand, allocation, inbound, and material-blocker tools using canonical quantities.
- [x] Add fulfillment/packing/dispatch overview and exception tools using canonical projections.
- [x] Add Community project, unit, job, task, invoice, and document summaries through existing scope gates.
- [x] Enforce restricted-user field rules, including install-cost exclusions in every aggregate and artifact.
- [x] Add paginated result cards, source links, related-tool hints, and domain deep links.
- [x] Verify worker assignment isolation, manager scope, CommunityUnit restrictions, join correctness, and stale data.

## Validation Evidence
- Added nine `assistant-catalog-v3` read tools covering inventory, Production,
  fulfillment, and Community projects/units with canonical scoped query helpers.
- Focused Assistant regression passes: 129 tests, 522 assertions, 0 failures
  across 24 files. DB package typecheck and targeted Biome pass.
- API typecheck reaches only unrelated existing Sales Request telemetry and
  `packages/sales/src/copy-sales.ts:521` diagnostics. Dashboard typecheck reaches
  unrelated existing workspace diagnostics with none in the touched Assistant files.
- Database integration execution is environmentally blocked because the configured
  local MySQL service at `127.0.0.1:3307` is offline; query boundaries are covered by
  focused tests.
- Independent specification and engineering reviews found no remaining actionable
  issues after corrections for canonical quantities, active-row semantics, scope
  isolation, Community field restrictions, pagination, sources, and revisions.
- The 24-case frozen selector benchmark scored semantic top-3 54.2% versus
  deterministic top-3 66.7%; semantic embeddings remain optional.

# Task: Progressive AI Chat T15 — Add favorites, reusable actions, and preferences

## Status
Done

## Priority
Medium

## Created Date
2026-09-13

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 15/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
GND extension requested by the user. Depends on T02, T05, T06, and T17.

## Implementation Progress
- Completion: 100%
- Current Checklist: 8/8 — reusable actions
- Blockers: None. Write/send recipe execution remains subject to the T17 approval executor, while every run already creates a fresh durable proposal.

## Implementation Checklist
- [x] Persist scoped presentation preferences and explicit removable personal memory.
- [x] Suggest saving a successful action only after a durable verified outcome.
- [x] Distinguish prompt shortcuts from versioned deterministic recipes with typed parameters and output bindings.
- [x] Store tool IDs/versions, effect levels, compatibility revision, display order, and optimistic version checks.
- [x] Add favorite menu, parameter entry, append-to-chat/run, reorder, rename, edit, duplicate, remove, and last-run status.
- [x] Execute safe reads/drafts automatically and create a fresh approval proposal for every write/send run.
- [x] Detect retired/incompatible tools and present a bounded repair preview without executing generated code or SQL.
- [x] Test relative dates, revoked permissions, record reauthorization, recipe tampering, and cross-user isolation.

## Validation Evidence
- Added actor-and-scope-owned preference, explicit memory, and saved-action tables with an additive migration. Local development received only this isolated migration after Prisma generation; preview and production were unchanged.
- Prompt shortcuts append and run through the normal chat. Deterministic recipes retain server-derived tool identity/effect/revision, validate typed inputs and output bindings, reauthorize current grants, resolve relative dates in the actor timezone, and run current read/draft tools.
- Every write/send recipe run creates a new expiring action proposal and one-time approval token; a saved action never carries approval forward.
- Favorites support create/save-from-outcome, parameter entry, run, rename/edit, duplicate, reorder, soft removal, compatibility repair preview, and last-run status. Preferences and explicit personal memory affect the trusted prompt boundary without treating memory text as instructions.
- Full Assistant API regression: 151 tests, 772 assertions, zero failures. Focused formatting and diff checks pass. Independent specification and standards reviews report no P1/P2 findings. API typechecking reaches only the existing nullable-string error in `packages/sales/src/copy-sales.ts:521`; dashboard typechecking exceeded the existing 4 GB Node heap without reporting a changed-path diagnostic in the earlier filtered run.

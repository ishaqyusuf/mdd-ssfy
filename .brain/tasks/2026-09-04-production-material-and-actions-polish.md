# Task: Production Material And Actions Polish

## Status
Done

## Priority
High

## Created Date
2026-09-04

## Last Updated
2026-09-04

## Global Ticket
- Ticket Position: 1/1

## Source Context
[Implementation plan](../plans/2026-09-04-sales-overview-production-material-and-actions-polish.md)

Scope clarification on 2026-09-04: each item must show only the exact compact
material status badge. Do not append configuration guidance, Inventory actions,
or coverage text to the item badge.

## Implementation Progress
- Completion: 100%
- Current Checklist: Complete
- Blockers: None

## Implementation Checklist
- [x] Audit current behavior, overlapping edits, and test seams
- [x] Correct item-level material applicability in the shared Sales domain
- [x] Replace duplicated material detail cards with one exact status badge
- [x] Hide Details when only structural item metadata remains
- [x] Add safe pending and confirmation states to bulk Production actions
- [x] Default Assign All to the order Production due date with visible override context
- [x] Refresh all Production state immediately after task completion
- [x] Add and run focused regression coverage
- [x] Complete UI verification and Brain documentation impact updates
- [x] Review and commit the scoped implementation

## Validation Evidence
- Confirmed the service false positive originates in `buildProductionItemMaterialStatus`, which treats production capability as material applicability.
- Confirmed the door has canonical tracked material evidence but the current UI expands the technical conflict ahead of its coverage fact.
- Confirmed the bulk menu drops its order scope during completion invalidation and exposes no task-running state or delete confirmation.
- Agreed seams from the approved plan: shared material-status builder, material-notice presentation, meaningful-details selector, bulk-action model/date helper, and scoped query-event refresh.
- Red/green material regression: `bun test packages/sales/src/production-v2/application/production-materials.test.ts packages/sales/src/item-material-status.test.ts` — 23 pass, 0 fail.
- Compact notice regression: 6 tests pass with no evidence hash or duplicated expanded card; worker-only administrative states are suppressed.
- Production item presentation regression: 8 tests pass; structural Item Type/House Package Tool metadata no longer creates an otherwise empty Details section, while Hand/Width/Height remain visible.
- User clarification supersedes the richer notice treatment: remove coverage copy and Inventory actions, leaving only one compact material badge.
- Clarified badge regression: 6 tests pass; item rows append no guidance, Inventory action, evidence hash, or coverage copy.
- Bulk action model/layout/query-event regression: 10 tests pass for action-specific feedback, explicit delete confirmation, due-date defaulting, duplicate-click busy state, scoped invalidation, and awaited overview refresh.
- Scoped Biome lint is clean for the new/modified logic; the legacy Production menu retains its pre-existing whole-file formatter mismatch.
- Final focused run: 58 tests, 255 assertions, 0 failures across the shared domain, badges, Details, bulk action, due-date, query-event, assignment-refresh, and material-review seams.
- Final standards and specification review reported no remaining findings after correcting full-item material lookup, meaningful door configuration, menu lifetime, and nested refresh-failure handling.
- Authenticated read-only UI verification on order `09556LM`: service shows one `NO MATERIAL NEEDED` badge with no Details section; the door shows one `INVENTORY SETUP MISMATCH` badge; bulk counts remain correct; Delete Assignments opens a quantity-two confirmation and Cancel performs no mutation.
- Brain impact recorded in `features/sales-production-workspace.md`, the source plan, this task, and `progress.md`. No schema, migration, permission, or public API-contract documentation changed.

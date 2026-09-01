# Brain Fix Handoff: Fulfillment cancellation provenance wording

## Status

Ready

## Source Review

`.brain/reviews/2026-09-01-status-only-fulfillment-completion-review.md`

## Original Handoff

`.brain/handoffs/ready/2026-09-01-status-only-fulfillment-completion-handoff.md`

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-status-only-fulfillment-completion.json`

## Goal

Keep the Status-only Fulfillment cancellation label and confirmation copy
explicitly administrative even after canonical lifecycle evidence adds its own
cancellation action.

## Fix Items

1. Rewrite an existing `cancel_fulfillment` menu action when the active
   Fulfillment record is Status-only, including the exact server-owned disabled
   state.
2. Make the shared confirmation description milestone-specific and clarify
   that Status-only skips operational records.
3. Add regressions for the canonical-evidence/base-cancellation case and copy.

## Context To Read First

- `.brain/reviews/2026-09-01-status-only-fulfillment-completion-review.md`
- `.brain/handoffs/ready/2026-09-01-status-only-fulfillment-completion-handoff.md`
- `apps/dashboard/src/components/sales-completion-presentation.ts`
- `apps/dashboard/src/components/sales-production-completion-dialogs.tsx`
- `apps/dashboard/src/components/sales-completion-presentation.test.ts`

## Acceptance Criteria

- Existing and synthesized Status-only cancellation actions both say `Cancel
  Fulfillment status only` and obey edit/server locks.
- Fulfillment confirmation copy contains no incorrect Production milestone
  wording and does not imply that the administrative ledger record is skipped.

## Do Not Change

- Do not broaden domain or API behavior.
- Do not move the linked task to done.

## Required Checks

- Focused presentation/dialog tests.
- Scoped Biome and `git diff --check`.

## Brain Update Contract

- Add the fix result to `.brain/progress.md` and original handoff completion
  notes. Keep Ticket 04 in progress until re-review.

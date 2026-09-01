# Brain Fix Handoff: Make Canonical Fulfillment Evidence-bound

## Status

Complete

## Source Review

`.brain/reviews/2026-09-01-status-only-production-completion-review.md`

## Original Handoff

`.brain/handoffs/completed/2026-09-01-status-only-production-completion-handoff.md`

## Source Plan

`.brain/plans/2026-09-01-feature-status-only-sales-completion.md`

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-09-01-gnd-status-only-production-completion.json`

## Goal

Make the completion projection honor the approved canonical Fulfilled boundary
without broadening Ticket 03.

## Fix Items

1. Resolve canonical fulfillment only from a completed active dispatch whose
   persisted completion proof is completed; rely on the canonical dispatch
   completion transaction as the inventory/dispatch commit boundary.
2. Derive operational Production completion without allowing raw order or
   fulfillment compatibility strings to manufacture Production evidence.
3. Add direct regression tests proving a legacy terminal order string is not
   canonical, incomplete/uploading proof is not canonical, and completed
   dispatch proof is canonical.

## Context To Read First

- `.brain/reviews/2026-09-01-status-only-production-completion-review.md`
- `.brain/decisions/ADR-081-administrative-sales-completion-authority.md`
- `.scratch/status-only-sales-completion/spec.md`
- `packages/sales/src/sales-completion.ts`
- `apps/api/src/db/queries/dispatch-proof-completion.ts`

## Acceptance Criteria

- Raw `SalesOrders.status`, `SalesOrders.prodStatus`, `SalesStat`, or numeric
  progress cannot make `canonicalFulfilled` true without completed dispatch
  proof/commit evidence.
- A completed active dispatch with persisted completed proof makes
  `canonicalFulfilled` true and retains operational precedence.
- Existing Ticket 03 checks and new negative/positive evidence tests pass.

## Do Not Change

- Do not implement Status-only Fulfillment or Full-workflow record writers.
- Do not mutate existing dispatch, inventory, proof, or lifecycle data.
- Do not broaden permissions or rewrite unrelated code.

## Required Checks

- Focused Sales completion tests including canonical-evidence regressions.
- `bun --filter @gnd/sales typecheck`.
- Focused Biome and `git diff --check`.

## Brain Update Contract

- Update `.brain/progress.md` with fix completion notes.
- Update affected Brain docs only if final behavior differs from their existing
  approved wording.
- Keep the feature stack in `.brain/tasks/in-progress.md`.

## Completion Notes

- Changed files: `packages/sales/src/sales-completion.ts` now uses completed
  dispatch proof/commit evidence for canonical Fulfilled and derives Production
  independently while requiring every item-bearing split dispatch to satisfy
  the evidence boundary; `packages/sales/src/sales-completion.test.ts` adds five
  direct negative/positive regressions.
- Checks run: 17 Sales completion tests / 46 assertions;
  `bun --filter @gnd/sales typecheck`; focused Biome; `git diff --check`.
- Brain docs updated: `.brain/progress.md`. Existing feature/API/database docs
  already state the evidence-bound contract and required no behavior rewrite.
- Unresolved issues: none in the requested fix.

# Plan: Sales Quantity Decision Gating

## Type
Bug Fix

## Status
Done

## Created Date
2026-08-19

## Last Updated
2026-08-24

## Recommended Codex Agent
- Agent: `gpt-5.6-terra`
- Reason: The adjustment architecture already exists; this is a focused affected-line correlation and save-path regression fix.

## Goal Or Problem
Show inbound disposition only when a reduced sales line actually affects mutable open inbound quantity. When a quantity edit needs no inbound, refund/wallet, or other explicit decision, save through the normal path immediately without opening Sales Change Review.

## Current Context
- `analyzeSalesFormChange()` already derives review reasons from changed-line commitments and allows a partially paid reduction to save directly when it only lowers amount due.
- `buildNewSalesFormAdjustmentPreview()` currently computes inbound disposition as “any reduced line” plus “any changed line has inbound.” In a mixed edit, inbound on an increased or unrelated changed line can incorrectly trigger Cancel/Keep Warehouse for a different reduction.
- The form opens review based on local `requiresSalesRepApproval`; direct saves and autosave are already intended for changes with no review reasons.

## Proposed Approach
Create one package-owned affected-commitment resolver that correlates each changed line, direction, and mutable open inbound quantity. Use the same result for local review reasons, API preview flags, acknowledgement, and apply input so UI and server cannot disagree. Preserve the existing settlement rule: only an overpayment/wallet outcome needs payment resolution; merely having a payment does not automatically require a decision.

## Implementation Steps
1. Add a decision matrix covering unchanged lines, increases, reductions, mixed edits, inbound on another line, fully received/closed/cancelled inbound, allocations, production/fulfillment evidence, no payment, partial payment that only reduces amount due, and overpayment that creates wallet credit.
2. Extend the adjustment domain result to expose affected reduced commitments (or equivalent typed facts), matched by stable line UID with sales-item ID fallback.
3. Require inbound disposition only when the same reduced line has positive mutable/unreceived open inbound quantity that the reduction can affect. Do not count inbound on increased, unchanged, or unrelated changed lines.
4. Derive operational acknowledgement from commitments actually affected by the proposed change, preserving irreversible production/fulfillment evidence without using unrelated order totals.
5. Reuse the shared decision result in `new-sales-form-adjustments.ts`; remove the separate broad `analysis.lines.some(reduction) && changedCommitments.some(inbound)` rule.
6. Keep the normal save/autosave path active when `reviewReasons` is empty. Add a component/integration regression proving no review sheet/preview mutation is invoked and save completes directly.
7. When review is required, show only applicable controls: inbound disposition for affected open inbound, wallet outcome for true overpayment, and acknowledgement for affected operational evidence. Server preconditions must match the visible controls exactly.
8. Validate apply/retry behavior for both inbound dispositions and confirm no unrelated demand or shipment row changes.

## Affected Files Or Areas
- `packages/sales/src/adjustment-system/domain/change-analysis.ts`
- `packages/sales/src/adjustment-system/domain/change-analysis.test.ts`
- `apps/api/src/db/queries/new-sales-form-adjustments.ts`
- Add focused API preview/create tests beside the adjustment query.
- `apps/dashboard/src/components/forms/new-sales-form/new-sales-form.tsx`
- `apps/dashboard/src/components/forms/new-sales-form/sections/sales-change-review-sheet.tsx`
- `apps/dashboard/src/components/forms/new-sales-form/sections/sales-change-review-sheet.test.ts`
- `packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts` and its tests only if the typed affected snapshot contract changes.

## Acceptance Criteria
- Reducing line A does not show inbound choices because line B has inbound.
- A mixed edit does not show inbound choices when only an increased line has inbound.
- Reducing a line with mutable open inbound shows exactly Cancel Open Inbound and Keep In Warehouse.
- Fully received, closed, or cancelled inbound does not create a meaningless disposition choice, while preserved evidence remains auditable.
- No payment and no affected commitments saves directly.
- A partial payment that remains below the revised total saves directly and recalculates amount due.
- A reduction that creates overpayment/wallet credit still requires the existing reviewed settlement path.
- Server preconditions never require a choice the UI did not show.

## Test Plan
- `bun test packages/sales/src/adjustment-system/domain/change-analysis.test.ts`
- Focused API adjustment preview/create tests.
- `bun test apps/dashboard/src/components/forms/new-sales-form/sections/sales-change-review-sheet.test.ts`
- Focused apply/recovery tests in `packages/jobs/src/tasks/sales/`.
- `bun run --filter @gnd/sales typecheck`
- `bun run --filter @gnd/api typecheck`
- `bun run --filter @gnd/dashboard typecheck`
- Authenticated browser matrix for direct save, both inbound dispositions, and wallet-credit review.

## Brain Update Requirements
- Update `.brain/features/in-form-sales-order-adjustments.md` and `.brain/features/inbound-sales-adjustment-reconciliation.md` after implementation.
- Update `.brain/api/contracts.md` only if preview/create shapes change.
- Update `.brain/progress.md`; add an ADR only if the adjustment ownership boundary changes.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Report changed files, the decision matrix covered, checks run, browser evidence, Brain docs updated, unresolved issues, and skipped criteria.

## Risks / Edge Cases
- UID-only matching can fail on older rows; retain the existing sales-item ID fallback.
- “Inbound exists” is not the same as “open quantity can be disposed”; status and received quantity matter.
- Local and server analysis must remain identical to avoid a hidden precondition failure.

## Open Questions
None.

## 2026-08-24 Correction

The original implementation correlated demand to the same reduced line but did
not distinguish automatically projected, unassigned demand from an actual
inbound shipment. That missed case kept the disposition prompt visible before
an inbound was created. The shared rule now additionally requires an active
`inboundShipmentItemId` link, with focused regression coverage for both the
unassigned direct-save case and the linked-shipment review case.

## Linked Task
- Task Title: Fix Sales Quantity Decision Gating
- Task File: `.brain/tasks/backlog.md`

# Brain Handoff: Mobile Moulding Multi Select Parity

## Status
Ready

## Source Plan
brain/plans/2026-06-18-ux-ui-mobile-moulding-parity.md

## Task
- Task Title: Mobile Moulding Multi Select Parity
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: Moulding selection and grouped-row editing are mobile interaction and UX parity work.

## Goal
Make mobile moulding selection work as a multi-select step with floating proceed, then align grouped moulding row editing with website new-sales-form behavior while preserving `line.meta.mouldingRows` and shared package contracts.

## Review Unit
- Type: task
- Linked Tasks: Mobile Moulding Multi Select Parity
- Grouping Reason: None
- Depends On Queue Items: None
- Approval Boundary: Approve only after every linked task in this review unit is implemented, reviewed, landed, and validated.

## Context To Read First
- brain/plans/2026-06-18-ux-ui-mobile-moulding-parity.md
- brain/features/mobile-invoice-form.md
- brain/api/contracts.md
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/steps/moulding
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- packages/sales/src/sales-form/ui/workflow/workflow-moulding-actions.ts
- packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts
- packages/sales/src/sales-form/domain/grouping.ts

## Implementation Instructions
1. Fix moulding component selection so it behaves as multi-select like door where required.
2. Show centered floating `Proceed` when at least one moulding is selected.
3. Proceed should advance to the next workflow step.
4. Ensure selected mouldings hydrate from existing `line.meta.mouldingRows` when reopening/editing.
5. Verify or implement row editing for qty, add-on, custom/override price, estimate, total, remove, and edit.
6. Persist canonical grouped metadata in `line.meta.mouldingRows`.
7. Preserve legacy identity fields where present: `salesItemId`, `hptId`, `groupUid`, `uid`, and `primaryGroupItem`.
8. Keep moulding UI flat and mobile-native.

## Acceptance Criteria
- Moulding component selection supports multi-select.
- Selecting one or more mouldings shows floating centered `Proceed`.
- Proceed advances to the next step.
- Mobile moulding rows match website behavior for qty, pricing, totals, remove/edit, and metadata persistence.
- Reopening an existing moulding line restores selected rows.
- Save payload preserves `line.meta.mouldingRows` and grouped row identity.
- Moulding logic remains modular and does not turn the workflow selector into a monolith.

## Files Or Areas Likely Involved
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/steps/moulding/*
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- packages/sales/src/sales-form/ui/workflow/workflow-moulding-actions.ts
- packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts
- packages/sales/src/sales-form/domain/grouping.ts only if shared contract gaps are found

## Do Not Change
- Do not invent missing grouped row identity fields.
- Do not change production eligibility semantics for moulding rows.
- Do not run UI/browser automation or start a dev server unless explicitly requested by the user.
- Do not broaden into custom, door/HPT, or shelf parity; those have separate handoffs.
- Do not move linked tasks to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- Manual QA by the user in the already-running app.
- Targeted scans for `mouldingRows` handling.
- Scoped `git diff --check` on touched files.
- Focused helper tests if grouped row patch logic changes.

## Queue Item
/Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-moulding-parity.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/mobile-invoice-form.md`: update moulding behavior.
- `brain/api/contracts.md`: update only if grouped moulding contract changes.
- `brain/tasks/in-progress.md`: keep the linked task in progress.

Do not move linked tasks to `done`. `brain-review-handoff` owns final approval for the review unit.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:

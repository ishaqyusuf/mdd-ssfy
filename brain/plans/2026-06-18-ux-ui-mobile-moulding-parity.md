# Plan: Mobile Moulding Multi Select Parity

## Type
UX/UI

## Status
In Progress

## Created Date
2026-06-18

## Last Updated
2026-06-18

## Intake
- Intake File: brain/intake/2026-06-18-mobile-sales-form-website-parity.md
- Intake Item: Moulding multi-select and grouped line-item parity with website new sales form.

## Goal Or Problem
Mobile moulding selection is not selecting correctly as a multi-select step, and its grouped line-item behavior must match the website new sales form with a clean mobile-native editor.

## Current Context
- The shared contract for grouped moulding rows is documented in `brain/api/contracts.md`: rows live in `line.meta.mouldingRows`, preserve legacy identity where known, and API save expands rows back into legacy sibling sales items and `HousePackageTools`.
- Mobile feature doc says moulding rows currently support description, qty, add-on, custom price, estimate, and total.
- Shared package helpers include moulding selection, row patch, grouped line, and total logic under `packages/sales/src/sales-form`.
- Mobile moulding UI lives under `apps/expo-app/src/features/sales/invoice-form/steps/moulding`.

## Proposed Approach
Repair moulding multi-select in the workflow selector, then align mobile grouped row editing with website semantics through shared package helpers. Keep selection UI, row editor UI, and patch helpers separate.

## Implementation Steps
- Fix moulding component selection so it behaves as multi-select like door where required.
- Show centered floating `Proceed` when at least one moulding is selected.
- Proceed should advance to the next workflow step.
- Ensure selected mouldings hydrate from existing `line.meta.mouldingRows` when reopening/editing.
- Implement or verify row editing for qty, add-on, custom/override price, estimate, total, remove, and edit.
- Ensure row updates persist canonical grouped metadata in `line.meta.mouldingRows`.
- Preserve legacy identity fields where present: `salesItemId`, `hptId`, `groupUid`, `uid`, and `primaryGroupItem`.
- Keep moulding UI flat and mobile-native.

## Affected Files Or Areas
- `apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx`
- `apps/expo-app/src/features/sales/invoice-form/steps/moulding/*`
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts`
- `packages/sales/src/sales-form/ui/workflow/workflow-moulding-actions.ts`
- `packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts`
- `packages/sales/src/sales-form/domain/grouping.ts` only if shared contract gaps are found

## Acceptance Criteria
- Moulding component selection supports multi-select.
- Selecting one or more mouldings shows floating centered `Proceed`.
- Proceed advances to the next step.
- Mobile moulding rows match website behavior for qty, pricing, totals, remove/edit, and metadata persistence.
- Reopening an existing moulding line restores selected rows.
- Save payload preserves `line.meta.mouldingRows` and grouped row identity.
- Moulding logic remains modular and does not turn the workflow selector into a monolith.

## Test Plan
- Manual QA only for UI behavior in the running app, per user request.
- Recommended static checks after implementation: targeted scans for `mouldingRows` handling and scoped `git diff --check` on touched files.
- Add focused package/helper tests if grouped row patch logic changes.

## Brain Update Requirements
- Update `brain/features/mobile-invoice-form.md`.
- Update `brain/progress.md`.
- Update `brain/api/contracts.md` only if grouped moulding contract changes.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Moulding can be represented by both selected step state and grouped metadata; updates must keep both in sync.
- Existing rows may lack some legacy identity fields; preserve what exists and avoid inventing identity.
- Moulding rows are production-ineligible per inventory-backed fulfillment notes; do not alter that behavior.

## Open Questions
- None.

## Linked Task
- Task Title: Mobile Moulding Multi Select Parity
- Task File: brain/tasks/backlog.md

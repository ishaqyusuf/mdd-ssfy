# Brain Handoff: Mobile Custom Component Parity

## Status
Ready

## Source Plan
brain/plans/2026-06-18-ux-ui-mobile-custom-component-parity.md

## Task
- Task Title: Mobile Custom Component Parity
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: Mobile bottom-sheet animation, custom component search/create UX, and parity-sensitive workflow selection.

## Goal
Implement mobile custom component parity with the website new sales form: centered floating Custom button, fullscreen-to-compressed morphable sheet, search/create/select/update behavior, canonical inventory/Dyke persistence, selected custom component first in the custom step, and automatic workflow advancement.

## Review Unit
- Type: task
- Linked Tasks: Mobile Custom Component Parity
- Grouping Reason: None
- Depends On Queue Items: None
- Approval Boundary: Approve only after every linked task in this review unit is implemented, reviewed, landed, and validated.

## Context To Read First
- brain/plans/2026-06-18-ux-ui-mobile-custom-component-parity.md
- brain/features/mobile-invoice-form.md
- brain/features/inventory-backed-sales-fulfillment.md
- brain/api/endpoints.md
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/api/use-invoice-workflow-step-components.ts
- apps/expo-app/src/features/sales/invoice-form/types.ts
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- apps/www/src/components/forms/sales-form/custom-component.tsx
- apps/www/src/components/forms/sales-form/custom-component-combobox.tsx

## Implementation Instructions
1. Add a focused mobile custom-component module; keep search, save/update, sheet state, and selection actions outside large screen components.
2. Add a centered floating `Custom` button using the shared floating-action placement from the foundation slice.
3. Show the custom button only for steps that support custom components, matching website behavior.
4. Implement a morphable bottom sheet that opens fullscreen.
5. Fullscreen state must show a top input labeled `Custom Component Title`, search existing custom components as the user types, render scrollable/virtualized results, and keep a fixed full-width bottom `Proceed`.
6. Selecting a result proceeds immediately; pressing `Proceed` uses the typed text.
7. Smoothly collapse to compressed mode showing `Title & Cost`.
8. Compressed mode must show `Cancel` and `Proceed`.
9. Final `Proceed` saves or updates the custom component through the canonical inventory/Dyke API, selects it into the active step, and advances to the next step.
10. Pin the selected/current custom component as the first component item when the active step is custom.

## Acceptance Criteria
- Floating `Custom` button is centered, above footer actions, and aligned with item/proceed FAB positioning.
- Sheet opens fullscreen with `Custom Component Title` input.
- Typing searches and lists existing custom components.
- Selecting a search result proceeds.
- Pressing `Proceed` uses typed text.
- Sheet transitions smoothly to compressed `Title & Cost`.
- Compressed mode supports `Cancel` and `Proceed`.
- Final proceed saves/updates the custom component, selects it, and advances the workflow.
- Custom component is shown as the first item on custom steps.
- Website custom-component semantics are preserved, including custom-only filtering and selected custom hydration.

## Files Or Areas Likely Involved
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/api/use-invoice-workflow-step-components.ts
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- apps/expo-app/src/features/sales/invoice-form/custom-component/*
- apps/expo-app/src/features/sales/invoice-form/components or shared sheet/floating-action modules
- packages/inventory or mobile API adapters only if required to expose existing mutation cleanly

## Do Not Change
- Do not reimplement custom persistence locally when the inventory/Dyke API can be reused.
- Do not run UI/browser automation or start a dev server unless explicitly requested by the user.
- Do not broaden into door/HPT, moulding, or shelf parity; those have separate handoffs.
- Do not move linked tasks to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- Manual QA by the user in the already-running app.
- Targeted scans for custom component API usage and selected-custom-first behavior.
- Scoped `git diff --check` on touched files.
- Focused pure-helper tests only if new helper behavior is non-trivial.

## Queue Item
/Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-custom-component-parity.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/mobile-invoice-form.md`: update custom component behavior.
- `brain/api/endpoints.md`: update only if API routes changed.
- `brain/api/contracts.md`: update only if request/response shapes changed.
- `brain/tasks/in-progress.md`: keep the linked task in progress.

Do not move linked tasks to `done`. `brain-review-handoff` owns final approval for the review unit.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:

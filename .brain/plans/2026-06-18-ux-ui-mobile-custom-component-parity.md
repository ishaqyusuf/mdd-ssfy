# Plan: Mobile Custom Component Parity

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
- Intake Item: Mobile custom component search/create/update/select flow matching website behavior.

## Goal Or Problem
Mobile custom component behavior must match the website new sales form: a floating custom button opens a morphable sheet, users can search or create a custom component by title, select existing results, set title and cost, save/update through the canonical inventory/Dyke API, select the component, and proceed to the next workflow step.

## Current Context
- Website custom component behavior uses inventory/Dyke custom component APIs documented in `brain/api/endpoints.md`.
- `inventories.upsertDykeCustomStepComponent` is the canonical mutation for step-scoped custom component create/update in new flows.
- Existing feature notes in `brain/features/inventory-backed-sales-fulfillment.md` describe custom component behavior: custom-only suggestions, hidden archived custom components, selected custom pinned first, edited price persistence on Proceed, and selected-step snapshot hydration.
- Mobile workflow component picking lives in `apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx`.
- Mobile selectable items already support `source?: "custom"` and custom metadata in `apps/expo-app/src/features/sales/invoice-form/types.ts`.

## Proposed Approach
Create a bounded mobile custom-component module with a reusable morphable sheet primitive. Keep search, typed title state, compressed title/cost state, save/update, and step selection in hooks/actions outside visual rows. Reuse existing sales/inventory contracts instead of creating an app-local persistence path.

## Implementation Steps
- Add a floating centered `Custom` button using the shared floating-action placement from the foundation plan.
- Show the custom button only when the active step supports custom components, matching website rules.
- Add a morphable bottom sheet that opens fullscreen.
- Fullscreen state must show a top input labeled `Custom Component Title`, search existing custom components as the user types, show scrollable results, and keep a fixed full-width `Proceed` button at the bottom.
- Selecting a result proceeds the same as pressing `Proceed` with that title.
- Pressing `Proceed` in fullscreen uses the typed text as the candidate custom component title.
- Smoothly collapse to compressed mode showing `Title & Cost`.
- Compressed mode must show bottom buttons `Cancel` and `Proceed`.
- Final `Proceed` must save or update the custom component, persist cost changes when needed, select it into the active step, and move to the next step.
- Pin the selected/current custom component as the first component item when the active step is custom.
- Keep archived custom components hidden from new selection while preserving selected older references.
- Use virtualized result lists and avoid controlled TextInput lag where possible.

## Affected Files Or Areas
- `apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx`
- `apps/expo-app/src/features/sales/invoice-form/api/use-invoice-workflow-step-components.ts` or adjacent API hooks
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts`
- New `apps/expo-app/src/features/sales/invoice-form/custom-component/*` module
- New or existing shared `morphable-sheet` / `floating-actions` module under invoice form components
- `packages/inventory` / mobile API adapters only if required to expose existing mutation cleanly

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

## Test Plan
- Manual QA only for UI behavior in the running app, per user request.
- Recommended static checks after implementation: targeted scans for custom component API usage and scoped `git diff --check` on touched files.
- Focused package-level tests may be added only for pure helper logic if new helper behavior is non-trivial.

## Brain Update Requirements
- Update `brain/features/mobile-invoice-form.md`.
- Update `brain/progress.md`.
- Update `brain/api/endpoints.md` only if mobile introduces a new or changed API route/adapter contract.

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
- The mobile API layer may not currently expose the exact inventory mutation used by website.
- Sheet animation should stay isolated and must not entangle business logic with animation state.
- Typed title and selected result paths must converge so duplicate behavior does not drift.

## Open Questions
- None.

## Linked Task
- Task Title: Mobile Custom Component Parity
- Task File: brain/tasks/backlog.md

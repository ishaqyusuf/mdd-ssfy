# Plan: Mobile Template Interaction Architecture

## Type
UX/UI

## Status
Proposed

## Created Date
2026-06-23

## Last Updated
2026-06-23

## Intake
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Intake Item: Shared architecture, folder structure, all-template search/filter/detail/tab infrastructure.

## Goal Or Problem
The three mobile design-system templates currently render static sample screens. Build the shared preview architecture needed for complete interactive templates: active bottom tabs, header search state, reusable floating rounded filter bottom sheet, record selection, and detail-tab scaffolding.

## Current Context
- Existing preview feature: `apps/expo-app/src/features/design-system-preview`.
- Existing routes: `apps/expo-app/src/app/design-system-preview`.
- Existing preview plan: `brain/plans/2026-06-15-mobile-design-system-template-previews.md`.
- Existing mobile design docs: `apps/expo-app/DESIGN.md` and `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
- `PreviewShell` currently owns a static search row and static bottom navigation.
- `PreviewRecordCard` is pressable but has no selection or navigation behavior.
- The attached bottom-sheet sample shows a dimmed backdrop, a floating rounded sheet, a grabber, generous white surface, and clear close/action affordances.

## Standard Architecture
- Keep the implementation preview-local under `apps/expo-app/src/features/design-system-preview`.
- Keep route files under `apps/expo-app/src/app/design-system-preview` as tiny screen wrappers.
- Keep screens mostly compositional; extract reusable interaction primitives into `components/`, `hooks/`, and `utils/`.
- Use static sample data only; do not add tRPC calls or mutations.
- Use the app's existing `Modal` / `useModal` bottom-sheet wrapper and Gorhom sheet primitives where possible.
- Mount only the active template tab and active detail tab content.
- Use pure helper tests for filtering and tab/selection behavior where feasible.
- Do not mix NativeWind `className` and React Native `style` on the same native element.

## Folder Structure
Target additions:

```text
apps/expo-app/src/features/design-system-preview/
  components/
    preview-bottom-filter-sheet.tsx
    preview-detail-tabs.tsx
    preview-search-header.tsx
    preview-tab-content.tsx
  data/
    template-tabs.ts
  hooks/
    use-preview-filters.ts
    use-preview-selection.ts
    use-preview-tabs.ts
  utils/
    preview-filtering.ts
    preview-record-copy.ts
```

Existing files to update:

```text
apps/expo-app/src/features/design-system-preview/components/preview-shell.tsx
apps/expo-app/src/features/design-system-preview/components/preview-card.tsx
apps/expo-app/src/features/design-system-preview/data/sample-data.ts
apps/expo-app/src/features/design-system-preview/DESIGN.md
apps/expo-app/DESIGN.md
```

## Proposed Approach
Refactor `PreviewShell` so search text, filter-button press, active bottom tab, and bottom navigation selection are controlled by template screens. Add a reusable filter bottom sheet that visually matches the sample: dim backdrop, detached rounded sheet, top grabber, compact filter chips, reset/apply/close actions, and safe-area-aware bottom spacing. Add tab and selection helpers that each template can consume without duplicating state logic.

## Implementation Steps
- Add a shared preview tab model for Ops Console, Field Flow, and Sales Ledger bottom tabs.
- Refactor `PreviewBottomNav` to accept `active` and `onSelect` for actual tab switching.
- Refactor `PreviewShell` to accept `searchValue`, `onSearchChange`, `onFilterPress`, and customizable search placeholder.
- Replace static search text with a native text input styled to the active template header.
- Add `PreviewBottomFilterSheet` using the existing mobile modal/bottom-sheet primitive.
- Make the filter sheet support status filters, date/window filters, owner/type filters, reset, apply, and close.
- Add pure filtering utilities that search title, subtitle, id, metadata labels, and amount.
- Add selection helpers for selected record/route/order and dismissal.
- Add reusable detail tab components with active tab state and horizontal tab controls.
- Update docs with the new interactive architecture and folder structure.

## Affected Files Or Areas
- `apps/expo-app/src/features/design-system-preview/components/preview-shell.tsx`
- `apps/expo-app/src/features/design-system-preview/components/preview-card.tsx`
- `apps/expo-app/src/features/design-system-preview/components/preview-bottom-filter-sheet.tsx`
- `apps/expo-app/src/features/design-system-preview/components/preview-detail-tabs.tsx`
- `apps/expo-app/src/features/design-system-preview/data/sample-data.ts`
- `apps/expo-app/src/features/design-system-preview/data/template-tabs.ts`
- `apps/expo-app/src/features/design-system-preview/hooks/`
- `apps/expo-app/src/features/design-system-preview/utils/`
- `apps/expo-app/src/features/design-system-preview/DESIGN.md`
- `apps/expo-app/DESIGN.md`

## Acceptance Criteria
- Search input in the shared shell accepts text and filters records for all templates.
- Filter icon opens a floating rounded bottom sheet with dim backdrop, grabber, close behavior, reset/apply actions, and template-aware styling.
- Bottom tabs are interactive and switch visible content.
- Detail tab scaffold can render multiple tabs for selected records without remounting unrelated template screens.
- Shared helpers avoid duplicate search/filter/tab logic in each template screen.
- Existing static preview routes still load from Settings in development builds.

## Test Plan
- Add or update focused helper tests for search/filter matching and active tab selection if the local test harness supports these feature tests.
- Run a focused Expo TypeScript or syntax check for touched preview files.
- Run `git diff --check`.
- Manual Expo smoke: open Settings -> Design System Previews -> all three templates; verify search, filter sheet, bottom tab switching, and detail tab scaffold.

## Brain Update Requirements
- Update `apps/expo-app/DESIGN.md`.
- Update `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
- Update `brain/progress.md`.
- No API or database docs expected.

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
- Bottom-sheet styling must remain native-safe and not rely on web-only CSS.
- Header search must avoid keyboard/status-bar overlap on small Android devices.
- Filter state should not leak across templates unless explicitly intended.

## Open Questions
- None

## Linked Task
- Task Title: Mobile Template Interaction Architecture
- Task File: brain/tasks/roadmap.md

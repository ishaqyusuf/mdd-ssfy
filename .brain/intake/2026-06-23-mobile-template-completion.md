# Brain Intake: Mobile Template Completion

## Status
Proposed

## Created Date
2026-06-23

## Last Updated
2026-06-23

## Raw Input
Finish implementation of all mobile design templates: Ops Console, Field Flow, and Sales Ledger. Include all tabs from each template. Field Flow must support search, Continue Route, clicking a job to open an overview, and all overview tabs. Ops Console must support search, clicking work items, all tabs, and a search filter that opens a nice floating rounded bottom sheet like the attached sample. Include the same search/filter treatment and complete interactions for the other templates. Include standard architecture and folder structure in the intake.

## Standard Architecture
- Keep the work inside the existing Expo preview boundary unless a later approval explicitly promotes a template into production: `apps/expo-app/src/features/design-system-preview` plus tiny route wrappers in `apps/expo-app/src/app/design-system-preview`.
- Preserve the existing Turborepo and Expo Router layout. Screens should stay thin; reusable preview behavior should live in feature-local components, hooks, state helpers, and data modules.
- Follow the repository mobile rule from `brain/engineering/coding-standards.md`: Expo components must not mix NativeWind `className` and React Native `style` on the same element.
- Reuse existing native primitives where practical: `Pressable`, `Icon`, `Modal` / `useModal`, `BottomSheetView`, `BottomSheetScrollView`, and theme/color helpers.
- Keep preview interactions static and deterministic: no live API calls, no mutations, and no production dashboard behavior changes.
- Use summary-first mobile architecture from `brain/system/architecture-guide.md`: render the template shell and active tab first, then show detail tabs only after a record/route/order is opened.
- Mount only the active tab/detail tab content. Do not eagerly render every tab tree if the implementation grows.
- Use feature-local pure helpers for filtering, tab state, and selected-record lookup so lower-level tests can cover behavior without device automation.
- Update `apps/expo-app/DESIGN.md`, `apps/expo-app/src/features/design-system-preview/DESIGN.md`, and `brain/progress.md` after implementation.

## Folder Structure
Recommended target structure:

```text
apps/expo-app/src/features/design-system-preview/
  components/
    preview-bottom-filter-sheet.tsx
    preview-card.tsx
    preview-detail-tabs.tsx
    preview-metric.tsx
    preview-search-header.tsx
    preview-shell.tsx
    preview-status.tsx
    preview-tab-content.tsx
  data/
    sample-data.ts
    template-tabs.ts
  design-systems/
    template-a-ops-console.ts
    template-b-field-flow.ts
    template-c-sales-ledger.ts
    types.ts
  hooks/
    use-preview-filters.ts
    use-preview-selection.ts
    use-preview-tabs.ts
  screens/
    design-system-index-screen.tsx
    template-a-screen.tsx
    template-b-screen.tsx
    template-c-screen.tsx
  utils/
    preview-filtering.ts
    preview-record-copy.ts
```

Route wrappers stay in:

```text
apps/expo-app/src/app/design-system-preview/
  _layout.tsx
  index.tsx
  template-a.tsx
  template-b.tsx
  template-c.tsx
```

## Generated Plans
- [ ] Mobile Template Interaction Architecture - `brain/plans/2026-06-23-ux-ui-mobile-template-interaction-architecture.md` - Status: Proposed
- [ ] Mobile Field Flow Complete Tabs And Route Overview - `brain/plans/2026-06-23-ux-ui-mobile-field-flow-tabs-route-overview.md` - Status: Proposed
- [ ] Mobile Ops Console Complete Tabs Search And Work Overview - `brain/plans/2026-06-23-ux-ui-mobile-ops-console-tabs-search-work-overview.md` - Status: Proposed
- [ ] Mobile Sales Ledger Complete Tabs Search And Order Overview - `brain/plans/2026-06-23-ux-ui-mobile-sales-ledger-tabs-search-order-overview.md` - Status: Proposed

## Recommended Execution Order
1. Mobile Template Interaction Architecture - establish shared tab/search/filter/detail primitives and folder structure before template-specific work.
2. Mobile Field Flow Complete Tabs And Route Overview - highest number of explicit requested interactions: search, Continue Route, job click, overview tabs.
3. Mobile Ops Console Complete Tabs Search And Work Overview - reuse architecture for operational tabs, search, work item click-through, and bottom filter sheet.
4. Mobile Sales Ledger Complete Tabs Search And Order Overview - complete the remaining template using the shared shell and ledger-specific detail tabs.

## Agent Recommendations
- Mobile Template Interaction Architecture: open-code - focused Expo UI architecture and testable helper extraction.
- Mobile Field Flow Complete Tabs And Route Overview: open-code - mobile interaction work with static sample data and route overview states.
- Mobile Ops Console Complete Tabs Search And Work Overview: open-code - mobile UI state and reusable filter sheet integration.
- Mobile Sales Ledger Complete Tabs Search And Order Overview: open-code - mobile sales preview completion with ledger-specific static data.

## Merged Items
- "all tabs from each templates", "and all others", and per-template click/search/filter requirements were split into one shared architecture plan plus one plan for each template.
- Search filter bottom sheet behavior is shared across all templates instead of being implemented separately in each screen.

## Duplicate Or Existing Items
- Existing implemented preview foundation: `brain/plans/2026-06-15-mobile-design-system-template-previews.md`.
- Existing design docs: `apps/expo-app/DESIGN.md` and `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
- This intake extends the existing preview implementation; it does not replace the already implemented static preview foundation.

## Needs Clarification
- Confirm later whether completed templates should remain development-only previews or whether one selected direction should be promoted into production mobile screens. These plans assume development-only preview completion.

## Skipped Items
- Production migration of dispatch, jobs, sales dashboard, orders list, or invoice form shells is skipped for this intake because the current Brain decision says no template has been selected yet.

## Approval Notes
- None

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

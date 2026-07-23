# Plan: Mobile Field Flow Complete Tabs And Route Overview

## Type
UX/UI

## Status
Completed

## Created Date
2026-06-23

## Last Updated
2026-07-23

## Completion
- Completed Home, Route, Pack, Proof, and Me workspaces with distinct records.
- Added Continue Route behavior, assignment/route-window/work-type filters, and
  Overview, Stops, Items, Proof, and Activity detail tabs.
- All behavior remains static, development-only preview state.

## Intake
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Intake Item: Field Flow search, Continue Route, job click, overview, all tabs.

## Goal Or Problem
Complete the Field Flow template so it behaves like a full clickable mobile field-worker preview instead of a static screen.

## Current Context
- Field Flow lives in `apps/expo-app/src/features/design-system-preview/screens/template-b-screen.tsx`.
- Current bottom nav labels are Home, Route, Pack, Proof, and Me.
- Current screen has a static active route card, Continue Route button, metrics, filters, and three task records.
- Existing recommendation says Field Flow is best for drivers, installers, warehouse packing, dispatch detail, and job completion workflows.

## Standard Architecture
- Reuse the shared interaction primitives from `brain/plans/2026-06-23-ux-ui-mobile-template-interaction-architecture.md`.
- Keep route wrappers unchanged; implement state inside the preview feature.
- Use static sample route/job data only.
- Keep the active route summary visible quickly, with deeper overview tabs shown only after Continue Route or job selection.
- Keep tap targets larger than Ops Console.

## Folder Structure
Expected Field Flow files:

```text
apps/expo-app/src/features/design-system-preview/screens/template-b-screen.tsx
apps/expo-app/src/features/design-system-preview/data/sample-data.ts
apps/expo-app/src/features/design-system-preview/data/template-tabs.ts
apps/expo-app/src/features/design-system-preview/components/preview-detail-tabs.tsx
apps/expo-app/src/features/design-system-preview/components/preview-bottom-filter-sheet.tsx
apps/expo-app/src/features/design-system-preview/utils/preview-filtering.ts
```

## Proposed Approach
Add real tab switching for Home, Route, Pack, Proof, and Me. Add searchable/filterable field records. Make Continue Route open a route overview state. Make any job/task card open an overview detail view with tabs. Use Field Flow-specific content for route stops, packing tasks, proof/photos, checklist, notes, and activity.

## Implementation Steps
- Define Field Flow tab content for Home, Route, Pack, Proof, and Me.
- Wire bottom navigation to switch among Field Flow tabs.
- Add search over route, job, packing, proof, and profile/sample activity records.
- Use the shared floating rounded filter sheet for Field Flow status, route window, and assignment filters.
- Make Continue Route open an active route overview.
- Make field job/task cards open an overview surface for the selected job.
- Add overview tabs for selected route/job: Overview, Stops, Items, Proof, Activity.
- Ensure each overview tab has realistic static sample content and empty states where appropriate.
- Add a close/back affordance from detail overview back to the active Field Flow tab.
- Preserve the Field Flow visual direction: thumb-first controls, active work card, pill filters, and strong bottom action.

## Affected Files Or Areas
- `apps/expo-app/src/features/design-system-preview/screens/template-b-screen.tsx`
- `apps/expo-app/src/features/design-system-preview/data/sample-data.ts`
- `apps/expo-app/src/features/design-system-preview/data/template-tabs.ts`
- Shared preview interaction files from the architecture plan
- `apps/expo-app/src/features/design-system-preview/DESIGN.md`

## Acceptance Criteria
- Home, Route, Pack, Proof, and Me tabs all switch to distinct Field Flow content.
- Search filters visible Field Flow records by title, id, subtitle, metadata, and action.
- Filter icon opens the shared floating rounded bottom sheet and applies Field Flow filters.
- Continue Route opens an active route overview.
- Tapping a job/task opens an overview for that selected record.
- Overview tabs render Overview, Stops, Items, Proof, and Activity content.
- Detail overview can be closed/backed out without losing the selected bottom tab.
- No live API calls or mutations are introduced.

## Test Plan
- Focused helper tests for Field Flow filter/search data if added.
- Focused syntax/type check for touched Expo preview files.
- `git diff --check`.
- Manual Expo smoke through `/design-system-preview/template-b`: search, filter sheet, each bottom tab, Continue Route, card tap, overview tab switching.

## Brain Update Requirements
- Update `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
- Update `apps/expo-app/DESIGN.md` if Field Flow behavior changes the documented preview capabilities.
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
- The detail overview should not visually fight the existing floating bottom nav.
- Search keyboard and filter sheet must not cover critical bottom actions on small screens.

## Open Questions
- None

## Linked Task
- Task Title: Mobile Field Flow Complete Tabs And Route Overview
- Task File: brain/tasks/roadmap.md

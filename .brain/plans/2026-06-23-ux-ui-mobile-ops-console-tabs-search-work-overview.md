# Plan: Mobile Ops Console Complete Tabs Search And Work Overview

## Type
UX/UI

## Status
Completed

## Created Date
2026-06-23

## Last Updated
2026-07-23

## Completion
- Completed Home, Inbox, Sales, Calendar, and More workspaces with distinct
  operational records.
- Added priority/owner/due-window/work-type filters and Overview, Timeline,
  Checklist, Notes, and Actions detail tabs.
- All behavior remains static, development-only preview state.

## Intake
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Intake Item: Ops Console search, click work, all tabs, floating rounded search filter bottom sheet.

## Goal Or Problem
Complete the Ops Console template so it behaves like a full clickable operational command-center preview with working search, filters, bottom tabs, and work-item details.

## Current Context
- Ops Console lives in `apps/expo-app/src/features/design-system-preview/screens/template-a-screen.tsx`.
- Current bottom nav labels are Home, Inbox, Sales, Calendar, and More.
- Current screen has static metrics and ten work queue records.
- Existing recommendation says Ops Console is the likely overall mobile shell direction.

## Standard Architecture
- Reuse shared search/filter/tab/detail architecture from the architecture plan.
- Keep the template preview-local and development-only.
- Keep operational content dense and quick to scan.
- Use static data slices to represent jobs, inbox alerts, sales records, calendar work, and admin/more actions.

## Folder Structure
Expected Ops Console files:

```text
apps/expo-app/src/features/design-system-preview/screens/template-a-screen.tsx
apps/expo-app/src/features/design-system-preview/data/sample-data.ts
apps/expo-app/src/features/design-system-preview/data/template-tabs.ts
apps/expo-app/src/features/design-system-preview/components/preview-detail-tabs.tsx
apps/expo-app/src/features/design-system-preview/components/preview-bottom-filter-sheet.tsx
apps/expo-app/src/features/design-system-preview/utils/preview-filtering.ts
```

## Proposed Approach
Turn the Ops Console bottom nav into actual tabs and provide sample content for each tab. Search and filter should narrow work queue records and tab-specific lists. Tapping any work item opens a work overview with tabs for operational context, timeline, checklist, documents/notes, and actions.

## Implementation Steps
- Define Ops Console tab content for Home, Inbox, Sales, Calendar, and More.
- Wire bottom navigation to switch visible content.
- Add search over Ops work records and active tab data.
- Add filter bottom sheet with status, priority, owner, due window, and work type options.
- Make work queue/list cards open a selected work overview.
- Add overview tabs: Overview, Timeline, Checklist, Notes, Actions.
- Include realistic static state for pending, ready, blocked, and complete records.
- Add empty states for filtered tabs.
- Preserve compact operational styling: dark header chrome, metadata rows, status chips, and dense cards.

## Affected Files Or Areas
- `apps/expo-app/src/features/design-system-preview/screens/template-a-screen.tsx`
- `apps/expo-app/src/features/design-system-preview/data/sample-data.ts`
- `apps/expo-app/src/features/design-system-preview/data/template-tabs.ts`
- Shared preview interaction files from the architecture plan
- `apps/expo-app/src/features/design-system-preview/DESIGN.md`

## Acceptance Criteria
- Home, Inbox, Sales, Calendar, and More tabs all switch to distinct Ops Console content.
- Search filters visible Ops records by id, title, subtitle, metadata, amount, and status copy.
- Filter icon opens the shared floating rounded bottom sheet styled like the attached sample.
- Filter selections apply to Ops records and can be reset.
- Tapping a work item opens a work overview.
- Work overview tabs render Overview, Timeline, Checklist, Notes, and Actions content.
- Detail overview can close/back to the current Ops tab.
- No live API calls or mutations are introduced.

## Test Plan
- Focused helper tests for Ops Console search/filter behavior if added.
- Focused syntax/type check for touched Expo preview files.
- `git diff --check`.
- Manual Expo smoke through `/design-system-preview/template-a`: search, filter sheet, each bottom tab, work item tap, overview tab switching.

## Brain Update Requirements
- Update `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
- Update `apps/expo-app/DESIGN.md` if Ops Console behavior changes the documented preview capabilities.
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
- Dense content can become cramped on small screens; text must truncate or wrap cleanly.
- Filter sheet should feel detached/floating without breaking Gorhom bottom-sheet gestures.

## Open Questions
- None

## Linked Task
- Task Title: Mobile Ops Console Complete Tabs Search And Work Overview
- Task File: brain/tasks/roadmap.md

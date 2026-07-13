# Plan: Mobile Sales Form Foundation And Customer Flow

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
- Intake Item: Sales dashboard start flow, customer selector recents, component row cleanup, and floating-action architecture.

## Goal Or Problem
Mobile sales users need the dashboard `New Invoice` action to choose Sales or Quote, the invoice form customer selector to default to recent customers for the selected sales type, component lists to stop showing UID subtitles, and shared floating-action placement to support later custom/proceed buttons without blocking footer actions.

## Current Context
- Mobile sales dashboard lives under `apps/expo-app/src/features/sales/components/sales-dashboard-screen.tsx`.
- Mobile invoice form lives under `apps/expo-app/src/features/sales/invoice-form`.
- Current `New Invoice` navigates directly to `/(sales)/invoices/new`.
- Customer selector route exists at `apps/expo-app/src/app/(sales)/invoices/customer-selector.tsx`.
- Customer/product/workflow search helpers live in `apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts`.
- Component picking currently runs through `apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx`.
- `brain/features/mobile-invoice-form.md` describes the current mobile invoice form architecture and should remain the feature doc.

## Proposed Approach
Create a small foundation slice that introduces the sales-type start sheet, passes the selected type through the existing invoice form route/store, adds a bounded recent-customer mode to the customer selector, removes visible UID subtitles from component rows, and introduces a shared floating-action layout primitive/hook used by later slices.

Keep screen components thin: the dashboard composes the type chooser, the customer screen composes a customer-list module, and workflow rows remain presentational.

## Implementation Steps
- Add a dedicated sales type chooser bottom sheet/module for `Sales | Quote` from the mobile sales dashboard.
- Route selected `Sales` to type `order` and selected `Quote` to type `quote`.
- Ensure the selected type reaches invoice form initialization, labels, save/create actions, and customer selector state.
- Add a bounded recent-customer query/mode that returns 10 recent customers based on selected type: orders/invoices for sales and quotes for quote mode.
- Keep search behavior as an explicit override of recent mode.
- Use `FlatList`/virtualized list patterns for customer rows.
- Remove the visible UID subtitle from workflow/component rows without removing UID identity from state.
- Add a shared floating-action placement component or helper for bottom-centered custom/proceed/FAB actions above the invoice footer and safe area.
- Keep the foundation module boundaries explicit; do not expand `invoice-form-screen.tsx` or `workflow-step-selector.tsx` with large inline business logic.

## Affected Files Or Areas
- `apps/expo-app/src/features/sales/components/sales-dashboard-screen.tsx`
- `apps/expo-app/src/app/(sales)/invoices/new.tsx`
- `apps/expo-app/src/app/(sales)/invoices/customer-selector.tsx`
- `apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts`
- `apps/expo-app/src/features/sales/invoice-form/components/invoice-form-screen.tsx`
- `apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx`
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts`
- `apps/expo-app/src/features/sales/invoice-form/components` or new focused feature folders for customer/floating actions
- API/customer query surface if current mobile API lacks recent-by-type support

## Acceptance Criteria
- Tapping `New Invoice` opens a bottom sheet with `Sales` and `Quote`.
- Choosing `Sales` opens the mobile form in order/invoice mode; choosing `Quote` opens quote mode.
- Customer selector defaults to 10 recent customers for the selected type.
- Customer search replaces recent mode and still selects a customer correctly.
- Component rows no longer display UID as a subtitle.
- Floating action layout is reusable by later custom and proceed buttons and sits above footer actions.
- Main screen files remain composition-focused; new logic is split into bounded helpers/components.

## Test Plan
- Manual QA only for UI behavior in the running app, per user request.
- Recommended static checks after implementation: targeted `rg` scans for removed UID subtitle labels and scoped `git diff --check` on touched files.
- Do not run dev server, broad typecheck, build, or UI/browser automation unless the user explicitly asks.

## Brain Update Requirements
- Update `brain/features/mobile-invoice-form.md` with the new dashboard/customer/floating-action behavior.
- Update `brain/progress.md`.
- Update API docs only if a new or changed customer recent-by-type contract is introduced.

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
- Existing mobile route params may not currently preserve type across customer selector navigation.
- Current customer search API may not expose recent order-vs-quote semantics; if so, add the narrowest API contract and document it.
- Floating action safe-area placement must account for keyboard and footer actions.

## Open Questions
- None.

## Linked Task
- Task Title: Mobile Sales Form Foundation And Customer Flow
- Task File: brain/tasks/backlog.md

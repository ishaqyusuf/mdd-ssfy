# Brain Handoff: Mobile Sales Form Foundation And Customer Flow

## Status
Ready

## Source Plan
brain/plans/2026-06-18-ux-ui-mobile-sales-form-foundation-customer-flow.md

## Task
- Task Title: Mobile Sales Form Foundation And Customer Flow
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: Mobile Expo UX flow work with bottom sheets, route state, customer list behavior, and visual placement.

## Goal
Implement the mobile sales form foundation slice: `New Invoice` opens a Sales/Quote chooser, selected type reaches the invoice/customer flow, customer selector defaults to 10 recent customers by selected type, component rows stop displaying UID subtitles, and shared floating-action placement is ready for later custom/proceed buttons.

## Review Unit
- Type: task
- Linked Tasks: Mobile Sales Form Foundation And Customer Flow
- Grouping Reason: None
- Depends On Queue Items: None
- Approval Boundary: Approve only after every linked task in this review unit is implemented, reviewed, landed, and validated.

## Context To Read First
- brain/plans/2026-06-18-ux-ui-mobile-sales-form-foundation-customer-flow.md
- brain/features/mobile-invoice-form.md
- brain/api/contracts.md
- apps/expo-app/src/features/sales/components/sales-dashboard-screen.tsx
- apps/expo-app/src/features/sales/invoice-form/components/invoice-form-screen.tsx
- apps/expo-app/src/app/(sales)/invoices/customer-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts

## Implementation Instructions
1. Add a bounded Sales/Quote chooser bottom sheet for the mobile sales dashboard `New Invoice` action.
2. Route `Sales` to order/invoice mode and `Quote` to quote mode, preserving the selected type through invoice form initialization and customer selector navigation.
3. Add or wire a bounded recent-customer mode that returns 10 customers based on selected type: recent orders/invoices for Sales, recent quotes for Quote.
4. Keep search as an explicit override of the recent list.
5. Remove the visible UID subtitle from component/workflow rows without removing UID identity from state.
6. Add a reusable floating-action placement helper/component for bottom-centered actions above footer actions and safe-area inset.
7. Keep screen files composition-focused; move new logic into focused modules/hooks/helpers instead of broad inline blocks.

## Acceptance Criteria
- Tapping `New Invoice` opens a bottom sheet with `Sales` and `Quote`.
- Choosing `Sales` opens the mobile form in order/invoice mode; choosing `Quote` opens quote mode.
- Customer selector defaults to 10 recent customers for the selected type.
- Customer search replaces recent mode and still selects a customer correctly.
- Component rows no longer display UID as a subtitle.
- Floating action layout is reusable by later custom and proceed buttons and sits above footer actions.
- Main screen files remain composition-focused; new logic is split into bounded helpers/components.

## Files Or Areas Likely Involved
- apps/expo-app/src/features/sales/components/sales-dashboard-screen.tsx
- apps/expo-app/src/app/(sales)/invoices/new.tsx
- apps/expo-app/src/app/(sales)/invoices/customer-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts
- apps/expo-app/src/features/sales/invoice-form/components/invoice-form-screen.tsx
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- apps/expo-app/src/features/sales/invoice-form/components or new focused feature folders
- API/customer query surface only if current mobile API lacks recent-by-type support

## Do Not Change
- Do not run UI/browser automation or start a dev server unless explicitly requested by the user.
- Do not broaden into custom component, door/HPT, moulding, or shelf parity; those have separate handoffs.
- Do not move linked tasks to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- Manual QA by the user in the already-running app for the new flow.
- Targeted `rg` scan for removed UID subtitle labels.
- Scoped `git diff --check` on touched files.
- Do not run broad typecheck, build, dev server, or UI tests unless explicitly requested.

## Queue Item
/Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-sales-form-foundation-customer-flow.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/mobile-invoice-form.md`: update dashboard/customer/floating-action behavior.
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

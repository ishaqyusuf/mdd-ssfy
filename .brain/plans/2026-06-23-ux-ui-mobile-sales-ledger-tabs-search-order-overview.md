# Plan: Mobile Sales Ledger Complete Tabs Search And Order Overview

## Type
UX/UI

## Status
Completed

## Created Date
2026-06-23

## Last Updated
2026-07-23

## Completion
- Completed Home, Sales, Money, Ship, and More workspaces with distinct ledger
  records.
- Added document/payment/delivery/date filters and Overview, Items, Payments,
  Fulfillment, and Activity detail tabs with payment and fulfillment kept
  separate.
- All behavior remains static, development-only preview state.

## Intake
- Intake File: brain/intake/2026-06-23-mobile-template-completion.md
- Intake Item: Complete all other template interactions, including Sales Ledger tabs, search/filter, and detail overview.

## Goal Or Problem
Complete the Sales Ledger template so it behaves like a clickable sales/order-management preview with all tabs, search/filter, and order detail tabs.

## Current Context
- Sales Ledger lives in `apps/expo-app/src/features/design-system-preview/screens/template-c-screen.tsx`.
- Current bottom nav labels are Home, Sales, Money, Ship, and More.
- Current screen has static sales metrics, invoice snapshot rows, and recent order cards.
- Existing recommendation says Sales Ledger should inform invoice and sales order surfaces.

## Standard Architecture
- Reuse shared search/filter/tab/detail architecture from the architecture plan.
- Keep Sales Ledger as static preview data only.
- Preserve ledger-specific density: tabular numbers, financial status hierarchy, and restrained color.
- Keep app logic preview-local until a template is selected for production adoption.

## Folder Structure
Expected Sales Ledger files:

```text
apps/expo-app/src/features/design-system-preview/screens/template-c-screen.tsx
apps/expo-app/src/features/design-system-preview/data/sample-data.ts
apps/expo-app/src/features/design-system-preview/data/template-tabs.ts
apps/expo-app/src/features/design-system-preview/components/preview-detail-tabs.tsx
apps/expo-app/src/features/design-system-preview/components/preview-bottom-filter-sheet.tsx
apps/expo-app/src/features/design-system-preview/utils/preview-filtering.ts
```

## Proposed Approach
Turn Sales Ledger bottom navigation into actual tabs. Add searchable/filterable sales/order data. Tapping an order, quote, payment, or shipment item opens a ledger detail overview with tabs for overview, line items, payments, fulfillment, and activity.

## Implementation Steps
- Define Sales Ledger tab content for Home, Sales, Money, Ship, and More.
- Wire bottom navigation to switch visible content.
- Add search over orders, quotes, payments, customer names, statuses, ids, and amounts.
- Add filter bottom sheet with status, document type, payment state, delivery state, and date window options.
- Make ledger/order cards open a selected order overview.
- Add detail tabs: Overview, Items, Payments, Fulfillment, Activity.
- Include ledger-style static rows for totals, paid, due, production, delivery, and next action.
- Add empty states for filtered tabs.
- Preserve tabular numeric alignment and lower-radius ledger styling.

## Affected Files Or Areas
- `apps/expo-app/src/features/design-system-preview/screens/template-c-screen.tsx`
- `apps/expo-app/src/features/design-system-preview/data/sample-data.ts`
- `apps/expo-app/src/features/design-system-preview/data/template-tabs.ts`
- Shared preview interaction files from the architecture plan
- `apps/expo-app/src/features/design-system-preview/DESIGN.md`

## Acceptance Criteria
- Home, Sales, Money, Ship, and More tabs all switch to distinct Sales Ledger content.
- Search filters visible ledger records by customer, id, amount, status, subtitle, and metadata.
- Filter icon opens the shared floating rounded bottom sheet and applies ledger filters.
- Tapping a ledger/order item opens an order overview.
- Order overview tabs render Overview, Items, Payments, Fulfillment, and Activity content.
- Detail overview can close/back to the current Sales Ledger tab.
- No live API calls or mutations are introduced.

## Test Plan
- Focused helper tests for Sales Ledger search/filter behavior if added.
- Focused syntax/type check for touched Expo preview files.
- `git diff --check`.
- Manual Expo smoke through `/design-system-preview/template-c`: search, filter sheet, each bottom tab, order tap, overview tab switching.

## Brain Update Requirements
- Update `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
- Update `apps/expo-app/DESIGN.md` if Sales Ledger behavior changes the documented preview capabilities.
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
- Amount/status search should be simple and predictable for static sample data.
- Financial values should remain visually aligned across light/dark modes and small screens.

## Open Questions
- None

## Linked Task
- Task Title: Mobile Sales Ledger Complete Tabs Search And Order Overview
- Task File: brain/tasks/roadmap.md

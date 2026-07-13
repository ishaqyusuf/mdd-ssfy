# Brain Handoff: Mobile Shelf Items Parity

## Status
Ready

## Source Plan
brain/plans/2026-06-18-ux-ui-mobile-shelf-items-parity.md

## Task
- Task Title: Mobile Shelf Items Parity
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: Shelf category/product search, section/row editing, and flat mobile parity are UI-heavy Expo work.

## Goal
Bring the mobile shelf items step to website new-sales-form parity: category/product browsing, bounded search, sections, rows, qty/pricing/totals, add/edit/remove behavior, and canonical `shelfItems` payloads in a clean mobile-native interface.

## Review Unit
- Type: task
- Linked Tasks: Mobile Shelf Items Parity
- Grouping Reason: None
- Depends On Queue Items: None
- Approval Boundary: Approve only after every linked task in this review unit is implemented, reviewed, landed, and validated.

## Context To Read First
- brain/plans/2026-06-18-ux-ui-mobile-shelf-items-parity.md
- brain/features/mobile-invoice-form.md
- brain/api/contracts.md
- apps/expo-app/src/features/sales/invoice-form/steps/shelf-items
- apps/expo-app/src/features/sales/invoice-form/components/line-item-card.tsx
- apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.ts
- packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts

## Implementation Instructions
1. Audit website shelf controls against the current mobile shelf editor.
2. Ensure category browsing and product search are available where website supports them.
3. Support sections and multiple rows where website supports them.
4. Support product, qty, unit price/cost, total, remove, and edit behavior.
5. Preserve custom shelf rows where supported by current mobile architecture.
6. Ensure shelf rows update line quantity/price/description and invoice summary consistently.
7. Use virtualized/bounded product lists for search results.
8. Keep shelf UI flat and avoid nested card/table layouts.

## Acceptance Criteria
- Mobile shelf items include website-supported category/product selection.
- Product search works and uses bounded/virtualized result rendering.
- Sections and rows can be added/edited/removed where supported.
- Rows support qty, unit price/cost, total, and product/custom values.
- Shelf totals feed invoice summary correctly.
- Save payload preserves canonical `shelfItems` data.
- Shelf UI remains flat, clean, and easy to navigate.

## Files Or Areas Likely Involved
- apps/expo-app/src/features/sales/invoice-form/steps/shelf-items/*
- apps/expo-app/src/features/sales/invoice-form/components/line-item-card.tsx
- apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.ts
- packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts

## Do Not Change
- Do not broaden into custom, door/HPT, or moulding parity; those have separate handoffs.
- Do not run UI/browser automation or start a dev server unless explicitly requested by the user.
- Do not render unbounded product result sets through `ScrollView`.
- Do not move linked tasks to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- Manual QA by the user in the already-running app.
- Targeted scans for `shelfItems` handling.
- Scoped `git diff --check` on touched files.
- Focused helper tests only if shelf patch logic changes.

## Queue Item
/Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-shelf-items-parity.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/mobile-invoice-form.md`: update shelf items behavior.
- `brain/api/contracts.md`: update only if shelf payload contracts change.
- `brain/tasks/in-progress.md`: keep the linked task in progress.

Do not move linked tasks to `done`. `brain-review-handoff` owns final approval for the review unit.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:

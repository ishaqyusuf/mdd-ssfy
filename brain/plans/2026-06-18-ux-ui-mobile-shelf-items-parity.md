# Plan: Mobile Shelf Items Parity

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
- Intake Item: Shelf items step parity with website new sales form.

## Goal Or Problem
The mobile shelf items step must include all website new-sales-form shelf features in a flat, clean, mobile-native UX while preserving canonical shelf row payloads and invoice totals.

## Current Context
- Mobile shelf editor lives under `apps/expo-app/src/features/sales/invoice-form/steps/shelf-items`.
- Mobile feature doc says shelf items support section/row management, product search chips, custom rows, qty, unit price, and total updates.
- Website new-sales-form shelf behavior includes categories, products, sections, row editing, totals, and category/product visibility rules.
- Shared package helpers include shelf section patch derivation and line total helpers.

## Proposed Approach
Audit website shelf behavior against the current mobile shelf editor, fill missing category/product/section/row behavior, and keep product search virtualized/bounded. Reuse shared shelf patch helpers so create/edit/update saves remain canonical.

## Implementation Steps
- Audit website shelf controls and compare to current mobile `ShelfRowsEditor`.
- Ensure category browsing and product search are available where website supports them.
- Support sections and multiple rows where website supports them.
- Support product, qty, unit price/cost, total, remove, and edit behavior.
- Preserve custom shelf rows where supported by current mobile architecture.
- Ensure shelf rows update line quantity/price/description and invoice summary consistently.
- Use virtualized/bounded product lists for search results.
- Keep shelf UI flat and avoid nested card/table layouts.

## Affected Files Or Areas
- `apps/expo-app/src/features/sales/invoice-form/steps/shelf-items/*`
- `apps/expo-app/src/features/sales/invoice-form/components/line-item-card.tsx`
- `apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-search.ts`
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts`
- `packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.ts`
- `packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts`

## Acceptance Criteria
- Mobile shelf items include website-supported category/product selection.
- Product search works and uses bounded/virtualized result rendering.
- Sections and rows can be added/edited/removed where supported.
- Rows support qty, unit price/cost, total, and product/custom values.
- Shelf totals feed invoice summary correctly.
- Save payload preserves canonical `shelfItems` data.
- Shelf UI remains flat, clean, and easy to navigate.

## Test Plan
- Manual QA only for UI behavior in the running app, per user request.
- Recommended static checks after implementation: targeted scans for `shelfItems` handling and scoped `git diff --check` on touched files.
- Add focused pure-helper tests only if shelf patch logic changes.

## Brain Update Requirements
- Update `brain/features/mobile-invoice-form.md`.
- Update `brain/progress.md`.
- Update `brain/api/contracts.md` only if shelf payload contracts change.

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
- Product/category visibility may differ for internal vs dealership contexts; preserve existing API constraints.
- Shelf row totals can drift if line-level and row-level totals are not updated together.
- Large product result sets must not be rendered through unbounded `ScrollView`.

## Open Questions
- None.

## Linked Task
- Task Title: Mobile Shelf Items Parity
- Task File: brain/tasks/backlog.md

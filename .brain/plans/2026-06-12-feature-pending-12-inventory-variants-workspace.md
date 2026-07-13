# Plan: Inventory Pending 12 - Inventory Variants Workspace

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Build a real inventory variants workspace instead of redirecting `/inventory/variants`.

## Current Context
Inventory item and stock pages exist, but variants need a dedicated operational workspace for searching, filtering, price/stock/supplier review, and direct editing entry points.

## Proposed Approach
Create a variants table/workspace with filters for item, category, stock mode, supplier, status, and low stock. Pricing sync/drift state remains a later enhancement tied to the broader drift/reporting work.

## Implementation Steps
- Add `/inventory/variants` route or equivalent workspace.
- Add variants query with item/category/supplier/stock/pricing fields.
- Add filters and search.
- Add actions for price edit, supplier variant edit, stock detail, and item dashboard.
- Wire navigation from item dashboard and inventory lists.

## Affected Files Or Areas
- `/inventory/variants`
- `packages/inventory/src/inventory.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- inventory UI routing/navigation

## Acceptance Criteria
- `/inventory/variants` no longer redirects away from a missing workspace.
- Operators can search/filter variants across items.
- Variant rows expose useful price, stock, supplier, and status context.
- Actions deep-link to item dashboard and edit flows.

## Test Plan
- Query tests for filters/search.
- Browser/manual workspace validation.
- Navigation regression from inventory item dashboard.

## Risks / Edge Cases
- Variant table can become large and needs pagination.
- Supplier and stock joins can make queries expensive.
- Editing from table must preserve existing form behavior.

## Open Questions
- Resolved for this slice: first release columns show item, category, status, stock mode, stock quantity/value, cost, price, preferred/default supplier, supplier count, stock-row count, low-stock alert, and variant attributes.

## Linked Task
- Task Title: Inventory Pending 12 - Inventory Variants Workspace
- Task File: brain/tasks/roadmap.md

## Completion Report
- Changed files: `packages/inventory/src/inventory.ts`, `packages/inventory/src/inventory-item-dashboard.test.ts`, `apps/api/src/trpc/routers/inventories.route.ts`, `apps/www/src/app/(sidebar)/inventory/variants/page.tsx`, `apps/www/src/components/inventory/inventory-variants-workspace-page.tsx`, and `apps/www/src/components/inventory/inventory-item-dashboard-page.tsx`.
- Replaced the `/inventory/variants` redirect with a real workspace backed by `inventories.inventoryVariantsWorkspace`.
- Added search and filters for item id, category id, supplier id, status, stock mode, and low stock, with rows exposing price, stock, supplier, status, and attribute context.
- Added row actions for item dashboard, item edit flow, and stock operations; item dashboard links can prefill the variants workspace by `inventoryId`.
- Checks run: `bun test packages/inventory/src/inventory-item-dashboard.test.ts`; import smoke for the inventories router, item dashboard component, and variants workspace component.
- Deferred: browser/manual validation remains part of Pending 15; pricing drift state remains tied to reconciliation/drift work.

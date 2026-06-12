# Plan: Inventory Pending 12 - Inventory Variants Workspace

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Build a real inventory variants workspace instead of redirecting `/inventory/variants`.

## Current Context
Inventory item and stock pages exist, but variants need a dedicated operational workspace for searching, filtering, price/stock/supplier review, and direct editing entry points.

## Proposed Approach
Create a variants table/workspace with filters for item, category, stock mode, supplier, status, low stock, and pricing sync/drift state.

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
- TODO: Which variant columns are mandatory for first release?

## Linked Task
- Task Title: Inventory Pending 12 - Inventory Variants Workspace
- Task File: brain/tasks/roadmap.md

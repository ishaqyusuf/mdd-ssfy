# Plan: Inventory Pending 11 - Inventory Item Dashboard

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

## Goal Or Problem
Build an inventory item dashboard with variants, stock, movement history, inbound demand, allocations, sales, and quotes.

## Current Context
Inventory management pages exist, but item-level operational dashboard depth is missing. Operators need a single item view rather than only list/edit surfaces.

## Proposed Approach
Add an item dashboard route or full-screen sheet backed by an item overview query that prioritizes inventory-backed references and uses legacy mapping only as fallback.

## Implementation Steps
- Define route/sheet entry from inventory item view action.
- Add item overview query with summary, variants, stock, movement history, inbound, allocations, related sales, and related quotes.
- Add UI tabs/sections for scan-friendly operations.
- Link to variant edit, stock adjustment, inbound, allocation, sales, and quote details.
- Keep edit form separate from dashboard viewing.

## Affected Files Or Areas
- `/inventory`
- TODO: `/inventory/[id]` or item dashboard route
- `packages/inventory/src/inventory.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- related sales/quotes query areas

## Acceptance Criteria
- Item dashboard opens from inventory item view action.
- Dashboard shows variants, stock, movements, inbound, allocations, sales, and quotes.
- Related sales/quotes use inventory `LineItem` references first.
- Dashboard loads without forcing edit mode.

## Test Plan
- Query tests for dashboard data shape.
- UI/browser validation for tabs/sections.
- Regression check for item edit form still working.

## Risks / Edge Cases
- Dashboard query can become heavy without pagination.
- Related legacy sales/quotes may need fallback mapping.
- Movement history may need filtering by variant/location.

## Open Questions
- TODO: Should dashboard be route, sheet, or both?

## Linked Task
- Task Title: Inventory Pending 11 - Inventory Item Dashboard
- Task File: brain/tasks/roadmap.md

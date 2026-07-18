# Plan: Inventory Pending 11 - Inventory Item Dashboard

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

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
- `/inventory/[id]`
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
- Resolved for this slice: dashboard is a dedicated `/inventory/[id]` route. A sheet can be added later if operators need faster table-side peeking.

## Linked Task
- Task Title: Inventory Pending 11 - Inventory Item Dashboard
- Task File: brain/tasks/roadmap.md

## Completion Report
- Changed files: `packages/inventory/src/inventory.ts`, `packages/inventory/src/inventory-item-dashboard.test.ts`, `apps/api/src/trpc/routers/inventories.route.ts`, `apps/www/src/app/(sidebar)/inventory/[id]/page.tsx`, `apps/www/src/components/inventory/inventory-item-dashboard-page.tsx`, and `apps/www/src/components/tables/inventory-products/columns.tsx`.
- Implemented a bounded item dashboard query with variants, stock rows, stock movement history, inbound demand, allocations, and related sales/quotes from inventory `LineItem` references.
- Added `/inventory/[id]` and wired the existing inventory item eye action to open it without forcing edit mode.
- Checks run: `bun test packages/inventory/src/inventory-item-dashboard.test.ts`; import smoke for `apps/api/src/trpc/routers/inventories.route.ts` and `apps/www/src/components/inventory/inventory-item-dashboard-page.tsx`.
- Deferred: browser/manual validation remains part of Pending 15.

## 2026-07-17 Table Standard Follow-Up
- `/inventory/[id]` now uses domain-local `components/tables-2/inventory-item-dashboard/*` sections for variants, stock, movement history, inbound demand, allocations, and related sales/quotes.
- The route now follows the restarted Sales Orders shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and initial table settings for each dashboard section.
- The dashboard still uses the existing `inventories.inventoryItemDashboard` data contract and keeps item summary metrics, top-sales analytics, and operational navigation unchanged.
- Validation passed with focused migration parity tests, the full restarted `components/tables-2` suite, targeted Biome, static scans for removed hand-mapped sections/manual fetch paths, route smoke returning `200`, `git diff --check`, and a clean `components/tables-2/core` diff.

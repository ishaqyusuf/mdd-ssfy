# Plan: Inventory Pending 13 - Top Sales Analytics By Inventory Item Variant

## Type
Feature

## Status
Done

## Created Date
2026-06-12

## Last Updated
2026-06-15

## Goal Or Problem
Add top-sales analytics by inventory item and variant.

## Current Context
Inventory pages exist, and product metrics fields exist, but inventory item/variant top-sales analytics tied to inventory-backed sales projections are still missing.

## Proposed Approach
Build analytics from inventory-backed `LineItem` / `LineItemComponents` first, with clear fallback or exclusions for legacy-only sales where inventory mapping is unavailable.

## Implementation Steps
- Define metrics: ordered qty, shipped qty, revenue, cost value, gross margin where reliable.
- Add aggregation query by inventory item and variant.
- Add time/category/supplier filters where useful.
- Surface analytics in item dashboard and inventory management pages.
- Document exclusions for unmapped legacy rows.

## Affected Files Or Areas
- `packages/inventory/src/inventory.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- inventory dashboard/item dashboard UI

## Acceptance Criteria
- Top inventory items can be ranked by ordered qty and shipped qty.
- Variant-level ranking exists where variant mapping is reliable.
- Revenue/cost metrics are labeled with reliability caveats.
- Analytics reconcile to inventory-backed sales projections.

## Test Plan
- Unit tests for aggregation logic.
- Fixture tests for item and variant ranking.
- Browser/manual check on dashboard surfaces.

## Risks / Edge Cases
- Legacy sales without inventory mapping can skew analytics.
- Revenue/cost metrics may be unreliable for some pricing modes.
- Variant attribution may be ambiguous for older sales.

## Open Questions
- Resolved for this slice: default window is the last 90 days.

## Linked Task
- Task Title: Inventory Pending 13 - Top Sales Analytics By Inventory Item Variant
- Task File: brain/tasks/roadmap.md

## Completion Report
- Changed files: `packages/inventory/src/inventory.ts`, `packages/inventory/src/inventory-item-dashboard.test.ts`, `apps/api/src/trpc/routers/inventories.route.ts`, `apps/www/src/components/inventory/inventory-top-sales-analytics.tsx`, `apps/www/src/app/(sidebar)/inventory/page.tsx`, and `apps/www/src/components/inventory/inventory-item-dashboard-page.tsx`.
- Added `inventoryTopSalesAnalytics(...)` and `buildInventoryTopSalesAnalytics(...)` to aggregate inventory-backed ordered quantity from `LineItem` and shipped quantity from consumed `StockAllocation` rows.
- Added protected tRPC route `inventories.inventoryTopSalesAnalytics`.
- Surfaced analytics on `/inventory` and `/inventory/[id]`, including item and variant rankings by ordered and shipped quantity plus revenue/cost reliability counts.
- Caveats are explicit in the UI and API docs: legacy-only unmapped sales are excluded, shipped quantity is allocation-consumption based, and revenue/cost use persisted line/pricing snapshots.
- Checks run: `bun test packages/inventory/src/inventory-item-dashboard.test.ts`; import smoke for inventories router, analytics component, item dashboard component, and variants workspace component.
- Deferred: browser/manual validation remains part of Pending 15.

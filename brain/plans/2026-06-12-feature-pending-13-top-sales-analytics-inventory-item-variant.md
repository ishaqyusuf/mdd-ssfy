# Plan: Inventory Pending 13 - Top Sales Analytics By Inventory Item Variant

## Type
Feature

## Status
Proposed

## Created Date
2026-06-12

## Last Updated
2026-06-12

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
- `packages/sales/src/sales-inventory-overview.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- `packages/inventory/src/inventory.ts`
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
- TODO: Which time window should be default?

## Linked Task
- Task Title: Inventory Pending 13 - Top Sales Analytics By Inventory Item Variant
- Task File: brain/tasks/roadmap.md

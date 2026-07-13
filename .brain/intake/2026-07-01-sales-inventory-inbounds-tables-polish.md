# Brain Intake: Sales Inventory Inbounds And Table Polish

## Status
Partially Complete

## Created Date
2026-07-01

## Last Updated
2026-07-02

## Raw Input
User reported a batch of inventory, inbound, order repair, and table UI issues. Key requests: non-stock / zero-stock inventory rows should display a non-editable inbound status such as Not Applicable instead of editable Available; changing an inventory item from non-stock to track should not retroactively affect orders already past production or fulfillment, but should prompt repair for not-yet-production orders whose previously available inbound state now has pending stock; inbound creation and Mark all available controls are disabled incorrectly; inbound status clicks should open the sales overview Inventory tab with `inventorySegment=inbounds`; the Inbounds segment should show needed stock and create actions even when no inbound is linked or some required stock still needs inbound; order updates need an inventory stock repair flow for removed items with existing inbound; inbound count is `0` until the Inbounds tab is clicked; the Inventory tab's side inbound list should become collapsible rows like `/sales-book/inbounds`; `/sales-book/inbounds` needs standard search, new table core list-mode support, analytics cards, and inbound-management links should route there; several community and sales-book table pages need compact spacing/height; community projects and project-units need table-system migration; table action menus/icons should be standardized to the project-units style.

## Generated Plans
- [x] Sales Inventory Non-Stock Status And Tracking Change Repair - `brain/plans/2026-07-01-feature-sales-inventory-non-stock-status-tracking-repair.md` - Status: Done
- [ ] Sales Order Inventory Repair On Order Updates - `brain/plans/2026-07-01-feature-sales-order-inventory-repair-on-updates.md` - Status: Proposed
- [ ] Sales Overview Inventory Inbounds UX And Action Gating - `brain/plans/2026-07-01-bug-fix-sales-overview-inventory-inbounds-ux-action-gating.md` - Status: Proposed
- [ ] Sales Book Inbounds Workspace Table Core Upgrade - `brain/plans/2026-07-01-ux-ui-sales-book-inbounds-table-core-upgrade.md` - Status: Proposed
- [ ] Community Table Density And Viewport Polish - `brain/plans/2026-07-01-ux-ui-community-table-density-viewport-polish.md` - Status: Proposed
- [ ] Community Projects Table Migration And Action Menu Standardization - `brain/plans/2026-07-01-ux-ui-community-projects-table-action-standardization.md` - Status: Proposed

## Recommended Execution Order
1. Sales Inventory Non-Stock Status And Tracking Change Repair - establishes the domain policy for non-stock display and stock-mode transitions before UI repair prompts rely on it.
2. Sales Order Inventory Repair On Order Updates - protects existing inbound/demand records when order contents change.
3. Sales Overview Inventory Inbounds UX And Action Gating - fixes the operator-facing Inventory tab flows on top of the domain repair rules.
4. Sales Book Inbounds Workspace Table Core Upgrade - aligns the broader inbound management workspace and link targets after the sales overview routing behavior is clear.
5. Community Projects Table Migration And Action Menu Standardization - updates remaining community table architecture and action menu baseline.
6. Community Table Density And Viewport Polish - applies compact spacing and scroll-height polish across already-migrated pages after table/action patterns settle.

## Agent Recommendations
- Sales Inventory Non-Stock Status And Tracking Change Repair: open-code - correctness-sensitive inventory policy, lifecycle gates, repair classification, and audit behavior belong close to package/API contracts.
- Sales Order Inventory Repair On Order Updates: open-code - stale inbound/demand cleanup and resolution workflows should be implemented with guarded writes and tests.
- Sales Overview Inventory Inbounds UX And Action Gating: open-code - this is a focused UI/API bug-fix slice in the existing sales overview component.
- Sales Book Inbounds Workspace Table Core Upgrade: antigravity - list-mode table UX, analytics cards, and collapsible detail behavior benefit from visual iteration against the existing workspace.
- Community Table Density And Viewport Polish: antigravity - viewport and spacing tuning should be validated visually across desktop/mobile.
- Community Projects Table Migration And Action Menu Standardization: open-code - route/table migration, imports, and shared action-menu standardization need careful codebase alignment.

## Merged Items
- The requested non-stock/zero-stock inbound status, future stock-mode transition rule, and stock-change repair modal were merged into the Sales Inventory Non-Stock Status And Tracking Change Repair plan because they share the same inventory policy boundary.
- The disabled Create inbound button, disabled Mark all available action, inbound status click-through, missing-stock CTA, inbound count bug, and collapsible Inbounds segment redesign were merged into the Sales Overview Inventory Inbounds UX And Action Gating plan because they all affect the same sales overview Inventory tab workflow.
- The `/sales-book/inbounds` search, new table core list mode, analytics cards, and inbound-management link redirect were merged into one Sales Book Inbounds Workspace Table Core Upgrade plan.
- The community/customer-services, builders, templates, invoices, productions spacing/height issues were merged into one density polish plan because they share viewport and table-shell acceptance criteria.
- The community/projects and community/project-units table migration work was merged with table action-menu standardization because project-units is the requested action-menu baseline.

## Duplicate Or Existing Items
- Inventory-owned inbound status semantics already exist in `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`; new work must extend that policy rather than creating sales-local status rules.
- `brain/plans/2026-06-29-sales-inventory-inbound-status-guardrails.md` already covers inventory-created inbound ownership, direct status-edit blocking, inbound status click-through, and Mark As preflight. The new plans capture reported unfinished or broken behavior, especially non-stock/track transitions, count/loading issues, and UI action gating.
- `brain/intake/2026-06-22-sales-overview-inventory-workflows.md` and `brain/plans/2026-06-22-feature-sales-overview-inventory-inbound-creator.md` already cover the broad inbound creator concept. The new sales overview plan is a bug/polish follow-up for the current implementation.
- `brain/plans/2026-06-16-orders-v2-table-standard-migration.md` already tracks the tables-2 migration, including completed `/sales-book/inbound-management`, community builders, templates, customer-services, and unit-invoices slices. The new table plans cover `/sales-book/inbounds`, remaining community projects/project-units work, compact viewport polish, and action-menu standardization.

## Needs Clarification
- Resolved: the exact order lifecycle boundary for "passed production" now uses the shared sales order lifecycle predicate; `ready_to_fulfill`, fulfillment-stage, fulfilled, and cancelled orders are skipped/read-only.
- Resolved: non-stock and zero-required inventory display is a derived `Not Applicable` / `N/A` label, not a persisted inbound status.

## Skipped Items
- No handoffs or queue items were created because this was an intake request only.
- No code, browser checks, dev servers, builds, or typechecks were run.

## Approval Notes
- None.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

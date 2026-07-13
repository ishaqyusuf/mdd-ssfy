# Brain Intake: Inventory Cutover Pending Scope

## Status
Proposed

## Created Date
2026-06-15

## Last Updated
2026-06-15

## Raw Input
User requested a detailed plan for remaining inventory migration work: inventory-to-Dyke create/update, inventory variant price update sync to Dyke, production assignment updating inventory lines, production fulfillment updating inventory equivalent as fulfilled, inventory-backed print that is 100% compatible with Dyke print organization, dispatch system inventory mode for assign/pack/fulfill, inventory management page updates including dashboard/top sales/track stock/low-stock/item dashboard/variants/sales/quotes, and an answer for what is missing.

## Generated Plans
- [ ] Inventory Pending 16 - Inventory Operations Dashboard Stock Controls - `brain/plans/2026-06-15-feature-inventory-operations-dashboard-stock-controls.md` - Status: Proposed
- [ ] Inventory Pending 17 - Inventory Cutover Gap Audit Execution Matrix - `brain/plans/2026-06-15-investigation-inventory-cutover-gap-audit.md` - Status: Proposed

## Recommended Execution Order
1. Inventory Pending 17 - Inventory Cutover Gap Audit Execution Matrix - confirms exact current-state gaps and prevents duplicate implementation across existing pending plans.
2. Inventory Pending 16 - Inventory Operations Dashboard Stock Controls - adds missing dashboard/track-stock/low-stock operational controls that complement existing item dashboard, variants workspace, and top-sales plans.

## Agent Recommendations
- Inventory Pending 17 - Inventory Cutover Gap Audit Execution Matrix: antigravity - best fit for cross-plan audit, current-state reconciliation, and execution sequencing.
- Inventory Pending 16 - Inventory Operations Dashboard Stock Controls: open-code - implementation-focused inventory UI/API slice with clear file boundaries.

## Merged Items
- Inventory management dashboard, track stock level option, and low stock alert were merged into Inventory Pending 16 because they share the inventory operations/dashboard surface and stock-control acceptance criteria.
- "What are we missing?" was converted into Inventory Pending 17 because it should be an explicit audit/matrix, not scattered across implementation plans.

## Duplicate Or Existing Items
- Inventory to Dyke create/update matches the existing Pending 01 inventory-to-Dyke sync handoff and completed review trail: `brain/handoffs/inventory-to-dyke-sync-handoff.md`, `brain/handoffs/completed/2026-06-12-inventory-to-dyke-sync-pending-01-fix-2.md`, and `brain/features/inventory-backed-sales-fulfillment.md`.
- Inventory variant price update sync to Dyke matches `brain/plans/2026-06-12-feature-pending-02-inventory-variant-supplier-price-sync-to-dyke.md`.
- Order item production assigned updates inventory lines and order production fulfilled updates inventory equivalent as fulfilled match `brain/plans/2026-06-12-feature-pending-03-production-assignment-completion-inventory-lifecycle-bridge.md`.
- Dispatch system inventory mode assign/pack/fulfill matches `brain/plans/2026-06-12-feature-pending-04-inventory-mode-dispatch-assign-pack-fulfill.md`.
- Print from inventory feature and Dyke print parity match `brain/plans/2026-06-12-feature-pending-06-inventory-print-parity-dyke-golden-packets.md`.
- View inventory item dashboard, variants workspace, sales/quotes tabs, and top-sales analytics overlap with `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md`, `brain/plans/2026-06-12-feature-pending-12-inventory-variants-workspace.md`, and `brain/plans/2026-06-12-feature-pending-13-top-sales-analytics-inventory-item-variant.md`.

## Needs Clarification
- Should inventory-to-Dyke sync remain considered complete from Pending 01, or should a new follow-up plan be created for operator UI around sync/drift/audit?
- Should "track stock level option" be enabled per inventory item, per variant, or both for first release?
- Should low-stock alerts use static thresholds only first, or include supplier lead-time and open inbound demand in the first release?

## Skipped Items
- No handoffs or queue items were created because this is brain-intake only.
- No new plans were created for items that already had matching Brain plans or handoffs.

## Approval Notes
- None.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

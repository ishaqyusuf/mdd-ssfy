# Inventory Cutover Gap Audit

## Status
Done

## Created Date
2026-06-15

## Last Updated
2026-06-15

## Scope
This audit maps the active inventory migration request to current code evidence, Brain evidence, implementation status, verification status, and recommended next action.

Requested capabilities:
- inventory-to-Dyke create/update
- inventory variant price update sync to Dyke
- production assignment updates inventory lines
- production fulfillment updates inventory equivalent as fulfilled
- inventory-backed print with Dyke-compatible organization/output
- dispatch inventory mode: assign, pack, fulfill
- inventory management pages: dashboard, top sales, track stock option, low-stock alert, item dashboard, variants, sales, quotes
- missing gaps and execution order

## Summary
The inventory cutover is not complete. Foundations are substantial: sales inventory line sync, inventory-to-Dyke job plumbing, fulfillment/backorder projections, production plan UI, inbound receiving, stock operations, inventory print route, and sync monitor exist. The remaining work is mostly around hard cutover behavior: pricing sync correctness, production/dispatch lifecycle bridges, print parity proof, item/variant dashboards, reconciliation, audit/idempotency, and browser validation.

Recommended next approval/build order:
1. Pending 02 - Inventory Variant Supplier Price Sync To Dyke
2. Pending 03 - Production Assignment Completion Inventory Lifecycle Bridge
3. Pending 08 - Production Readiness Gates
4. Pending 04 - Inventory Mode Dispatch Assign Pack Fulfill
5. Pending 05 - Shipment Record Decision
6. Pending 06 - Inventory Print Parity Dyke Golden Packets
7. Pending 16 - Inventory Operations Dashboard Stock Controls
8. Pending 11, 12, 13 - Item dashboard, variants workspace, top-sales analytics
9. Pending 10 and 14 - Receive/allocation guardrails and stock audit verification
10. Pending 07 and 15 - Reconciliation jobs and browser validation

## Capability Matrix

| Capability | Current Status | Code Evidence | Brain Evidence | Verification Status | Next Action |
|---|---|---|---|---|---|
| Inventory to Dyke create/update/delete/archive | Partially Implemented | `packages/jobs/src/tasks/inventory/sync-inventory-to-dyke.ts`; `packages/inventory/src/application/sync/inventory-to-dyke-sync-job.ts`; `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`; `apps/api/src/trpc/routers/inventories.route.ts` exposes compare/sync/update paths | Pending 01 handoff/review trail; `brain/features/inventory-backed-sales-fulfillment.md` Phase B | Focused sync tests exist in `packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts`; broader runtime/operator verification still missing | Treat Pending 01 implementation as foundation; add operator audit/reconciliation through Pending 07 if needed |
| Inventory variant price update sync to Dyke | Partially Implemented | `updateVariantCost`, `saveVariantForm`, and `saveSupplierVariantForm` queue `sync-inventory-to-dyke`; `DykePricingSystem` update details live in sync service | `brain/plans/2026-06-12-feature-pending-02-inventory-variant-supplier-price-sync-to-dyke.md` | Queue tests exist; pricing mapping and supplier-specific skip/create behavior still need direct proof | Approve/build Pending 02 next |
| Sales inventory line sync for legacy/new/copy sales | Implemented, needs wider runtime proof | `packages/sales/src/sync-sales-inventory-line-items.ts`; `packages/sales/src/sales-inventory-sync-job.ts`; `packages/jobs/src/tasks/sales/sync-sales-inventory-line-items.ts`; `packages/jobs/src/tasks/sales/backfill-sales-inventory-line-items.ts`; sync monitor in `packages/sales/src/sales-inventory-sync-monitor.ts` | `brain/features/inventory-backed-sales-fulfillment.md` core units and progress notes | Focused tests exist for sync planning, job queueing, and monitor; broad real-data backfill still needs validation | Keep as foundation; use monitor/backfill before cutover |
| Production assignment updates inventory lines | Missing / Planned | `packages/jobs/src/tasks/sales/update-sales-control.ts` calls sales-control tasks; no clear inventory lifecycle bridge call found in production assignment paths | `brain/plans/2026-06-12-feature-pending-03-production-assignment-completion-inventory-lifecycle-bridge.md` | No bridge tests found | Approve/build Pending 03 |
| Production fulfilled updates inventory equivalent as fulfilled | Missing / Planned | `prodCompleted` and `updateSubmissions` live in sales-control paths; current inventory component `fulfilled` is stock/inbound fulfillment, not production completion | Pending 03 and Pending 08 | No production-completion-to-inventory proof found | Build Pending 03, then Pending 08 readiness gates |
| Production readiness gates | Planned | `salesProductionPlan` API/UI exists; production start guards were not found as enforced shared guard | `brain/plans/2026-06-12-feature-pending-08-production-readiness-gates.md` | No guard tests found | Build after Pending 03 |
| Backorder queue and partial shipment | Partially Implemented | `packages/sales/src/sales-fulfillment-plan.ts` has `shipAvailableSalesInventory`, `allocateReceivedInboundToBackorders`, `SalesBackorderQueue`; UI at `apps/www/src/components/inventory/inventory-backorder-queue-page.tsx`; API procedures in `inventories.route.ts` | Pending 09 and Pending 10 | Focused fulfillment tests exist; hold-until-complete and idempotency guardrails remain planned | Build Pending 09 and 10 after core dispatch/production bridge |
| Dispatch inventory mode assign/pack/fulfill | Partially Implemented | Legacy dispatch/packing uses `OrderDelivery` / `OrderItemDelivery`; `shipAvailableSalesInventory` creates inventory partial shipments and consumes allocations; no full inventory-mode assign/pack/fulfill workflow found | `brain/plans/2026-06-12-feature-pending-04-inventory-mode-dispatch-assign-pack-fulfill.md`; Pending 05 shipment decision | Existing dispatch browser surfaces exist, but inventory-mode flow lacks proof | Decide shipment source in Pending 05, then build Pending 04 |
| Shipment record source of truth | Planned | Partial inventory shipment currently writes `OrderDelivery` / `OrderItemDelivery` with `inventory_partial_shipment` metadata; no `SalesShipment` / `SalesShipmentLine` models found | `brain/plans/2026-06-12-feature-pending-05-shipment-record-decision.md` | No ADR/decision found | Approve Pending 05 before expanding dispatch reporting |
| Inventory print route/data composer | Partially Implemented | `packages/sales/src/print/inventory-print-data.ts`; `apps/api/src/trpc/routers/print.route.ts` has `salesInventoryV2`; `/p/sales-inventory-v2` viewer files; inventory print links in backorder/production/overview UI | `brain/plans/2026-06-12-feature-pending-06-inventory-print-parity-dyke-golden-packets.md` | Focused print data/request tests exist; Dyke-compatible golden packet proof missing | Build Pending 06 |
| Inventory dashboard / stock alert | Partially Implemented | `/inventory` renders `InventorySummaryWidgets` and `InventoryStockAlertWidget`; `lowStockSummary` exists and uses monitored inventory variants with `lowStockAlert`; `/inventory/stocks` supports manual adjustments | Pending 16 | Widget exists; operational dashboard controls, track-stock UX, drilldowns, and richer summary still missing | Build Pending 16 |
| Track stock option | Partially Implemented | `Inventory.stockMode` and `InventoryVariant.lowStockAlert` are used by low-stock summary; stock operation UI exists | Pending 16 | No dedicated operator control/audit matrix found | Include in Pending 16 |
| Inventory item dashboard | Planned | No dedicated `/inventory/[id]` or item dashboard component found by targeted search | `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md` | Missing | Build Pending 11 after dashboard controls |
| Variants workspace | Planned | No dedicated variants workspace found by targeted search | `brain/plans/2026-06-12-feature-pending-12-inventory-variants-workspace.md` | Missing | Build Pending 12 after item dashboard contract |
| Top sales by inventory item/variant | Planned | No top-sales aggregation query/surface found by targeted search | `brain/plans/2026-06-12-feature-pending-13-top-sales-analytics-inventory-item-variant.md` | Missing | Build Pending 13 after item/variant query contracts |
| Sales/quotes related inventory tabs | Planned | Inventory-backed `LineItem` references exist; item-dashboard related sales/quotes tabs are not built | Pending 11 and 13 | Missing | Include in Pending 11 |
| Stock audit coverage | Partially Implemented | `packages/inventory/src/application/stock/stock-adjustment.ts`; `InventoryStock`, `StockMovement`, `InventoryLog`; inbound receiving writes stock/movement paths | `brain/plans/2026-06-12-feature-pending-14-stock-audit-verification.md` | Adjustment tests exist, but all mutation paths are not proven in one audit matrix | Build Pending 14 |
| Receive/auto-release idempotency | Partially Implemented | `receiveInboundShipment` and `allocateReceivedInboundToBackorders` exist; auto-allocation job exists | `brain/plans/2026-06-12-feature-pending-10-repeat-receive-allocation-auto-release-guardrails.md` | Retry/idempotency proof missing | Build Pending 10 before broad inbound auto-release cutover |
| Reconciliation jobs | Planned / Partial foundations | Drift report exists for Dyke/inventory; sales sync monitor exists; no full multi-domain reconciliation job matrix found | `brain/plans/2026-06-12-feature-pending-07-inventory-reconciliation-jobs.md` | Missing for sales-control/inventory, stock/allocation, and print parity domains | Build Pending 07 after lifecycle/dispatch foundations |
| Browser validation | Planned | Multiple UI routes exist, including `/inventory/backorders`, `/inventory/production-plan`, `/inventory/stocks`, `/p/sales-inventory-v2`; no current Brain evidence matrix for browser proof found | `brain/plans/2026-06-12-feature-pending-15-inventory-browser-validation.md` | Missing | Run Pending 15 after major implementation slices land |

## Missing Or Needs Clarification
- Whether Pending 01 inventory-to-Dyke sync should be considered complete enough for cutover, or whether a separate operator-facing sync audit UI should be created.
- Whether stock tracking should be configured at inventory item level, variant level, or both.
- Whether low-stock alerts should immediately account for supplier lead time, open inbound demand, and reserved allocations.
- Whether `OrderDelivery` / `OrderItemDelivery` are formally canonical shipment records or whether new `SalesShipment` models are needed.
- Whether production completion should persist separate production lifecycle quantities on inventory lines/components or remain derived from sales-control submissions.
- Which role/environment is canonical for browser validation evidence.

## Plan Recommendations
- Approve Pending 02, 03, 04, 05, 06, 08, 10, 14, 16, and 15 as-is or after small wording refinements. These have clear boundaries and acceptance criteria.
- Keep Pending 07 after Pending 02/03/04/06/10/14 foundations, because reconciliation should encode final invariants, not temporary ones.
- Keep Pending 11/12/13 together as the inventory management expansion track after Pending 16 defines the dashboard/control layer.
- Do not create new duplicate plans for inventory-to-Dyke create/update, variant price sync, production bridge, dispatch inventory mode, print parity, item dashboard, variants workspace, or top-sales analytics; existing plans already cover them.

## Files Inspected
- `brain/features/inventory-backed-sales-fulfillment.md`
- `brain/plans/2026-06-12-feature-pending-02-inventory-variant-supplier-price-sync-to-dyke.md`
- `brain/plans/2026-06-12-feature-pending-03-production-assignment-completion-inventory-lifecycle-bridge.md`
- `brain/plans/2026-06-12-feature-pending-04-inventory-mode-dispatch-assign-pack-fulfill.md`
- `brain/plans/2026-06-12-feature-pending-05-shipment-record-decision.md`
- `brain/plans/2026-06-12-feature-pending-06-inventory-print-parity-dyke-golden-packets.md`
- `brain/plans/2026-06-12-feature-pending-07-inventory-reconciliation-jobs.md`
- `brain/plans/2026-06-12-feature-pending-08-production-readiness-gates.md`
- `brain/plans/2026-06-12-feature-pending-09-hold-until-complete-partial-shipment-screen.md`
- `brain/plans/2026-06-12-feature-pending-10-repeat-receive-allocation-auto-release-guardrails.md`
- `brain/plans/2026-06-12-feature-pending-14-stock-audit-verification.md`
- `brain/plans/2026-06-12-feature-pending-15-inventory-browser-validation.md`
- `brain/plans/2026-06-15-feature-inventory-operations-dashboard-stock-controls.md`
- `packages/jobs/src/tasks/inventory/sync-inventory-to-dyke.ts`
- `packages/inventory/src/application/sync/inventory-to-dyke-sync-job.ts`
- `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- `packages/inventory/src/inventory.ts`
- `packages/sales/src/sync-sales-inventory-line-items.ts`
- `packages/sales/src/sales-fulfillment-plan.ts`
- `packages/sales/src/print/inventory-print-data.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `apps/api/src/trpc/routers/print.route.ts`
- `apps/www/src/app/(sidebar)/inventory/page.tsx`
- `apps/www/src/components/widgets/inventory-stock-alert-widget.tsx`
- `apps/www/src/components/inventory/inventory-stock-operations-page.tsx`

## Validation
- Read-only audit; no builds, typechecks, dev servers, browser tests, or curl checks were run.
- Scoped `git diff --check` should be run after this report and Brain status updates.

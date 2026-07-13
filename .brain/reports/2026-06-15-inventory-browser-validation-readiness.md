# Inventory Browser Validation Readiness

## Status
Ready For Browser Validation

## Date
2026-06-15

## Scope
Pending 15 requires browser/operator validation for inventory-backed operational surfaces before cutover:
- `/inventory`
- `/inventory/allocations`
- `/inventory/inbounds`
- `/inventory/production-plan`
- `/inventory/backorders`
- `/inventory/partial-shipments`
- `/inventory/stocks`
- `/inventory/dispatch-mode`
- `/p/sales-inventory-v2`

## Current Constraint
Live browser validation was not run in this pass because the active `fast-bun-monorepo-command-discipline` rule forbids dev servers, browser tests, local browser QA, and curl checks by default unless the user explicitly approves that validation step.

## Evidence Worksheet
Record the browser validation results in `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`.

## Static Evidence Matrix

| Surface | Current Evidence | Browser Validation Needed |
| --- | --- | --- |
| `/inventory` operations dashboard | `InventoryOperationsDashboard` calls `inventories.inventoryOperationsSummary`; route mounts dashboard, summary widgets, top-sales analytics, and inventory table; sidebar exposes Inventory for Super Admins. | Confirm cards render with real data; links navigate to variants, stock ops, dispatch mode, inbound, allocations, backorders, production plan, and item dashboards. |
| `/inventory/allocations` | Route mounts `InventoryAllocationReviewPage`; API exposes pending allocation review and approve/reject/bulk approval procedures; sidebar exposes Allocations for Super Admins. | Approve, reject, and bulk approve realistic pending allocations; verify skipped/empty states. |
| `/inventory/inbounds` | Route mounts `InboundReceivingPage`; API exposes inbound queue, shipments, receiving, issues, reorder suggestions, and extraction routes; sidebar exposes Inbounds for Super Admins. | Create shipment from demand, receive partial/full stock, report/resolve issue, verify no duplicate receive on retry. |
| `/inventory/production-plan` | Route mounts `InventoryProductionPlanPage`; API exposes `salesProductionPlan`; print links use inventory print request builder; sidebar exposes Production Plan for Super Admins. | Filter blocked/ready rows, open production packet print, confirm readiness blockers match sale state. |
| `/inventory/backorders` | Route mounts `InventoryBackorderQueuePage`; queue supports allocate-received and ship-available actions; inventory print link exists; sidebar exposes Backorders for Super Admins. | Release received inbound to backorders, ship available quantity, print backorder packet, verify remaining qty. |
| `/inventory/partial-shipments` | Route mounts `InventoryPartialShipmentPage`; queue supports hold-until-complete and ship-available actions; sidebar exposes Partial Shipments for Super Admins. | Toggle hold, attempt partial shipment, verify held lines skip and ready lines ship. |
| `/inventory/stocks` | Route mounts `InventoryStockOperationsPage`; API exposes stock adjustment and `stockAuditVerificationReport`; sidebar exposes Stock Movements for Super Admins. | Add stock, remove stock, return, consume/release corrections, verify audit evidence updates. |
| `/inventory/dispatch-mode` | Route mounts `InventoryDispatchModePage`; UI calls `assignInventoryDispatchAllocations`, `packInventoryDispatchAllocations`, `fulfillInventoryDispatch`, and `releaseInventoryDispatchAllocations`; sidebar exposes Dispatch Mode for Super Admins. | Run assign -> pack -> fulfill on an available line; verify consumed allocations and legacy delivery rows; run release on a reserved/picked line. |
| `/p/sales-inventory-v2` | Public route mounts `SalesInventoryPrintViewerPage`; API exposes `print.salesInventoryV2`; data/golden tests cover inventory packet rows; request tests cover the separate inventory print viewer URL contract. | Render invoice/production/pick/packing/backorder/customer-remaining packets and compare visually with Dyke/v2 template expectations. |

## Fixture Scenarios Needed
Detailed fixture setup plan: `brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md`.

1. Available sale line with approved inventory allocations.
2. Sale line with held-until-complete enabled and only partial stock available.
3. Sale line blocked by one missing required component with open inbound demand.
4. Backordered sale line with received inbound stock ready for auto-allocation.
5. Stockable inventory variant below low-stock threshold and one at zero stock.
6. Inventory print sale with production BOM, pick list, packing list, backorder, and remaining-summary modes.

## Validation Commands Or Actions Requiring Approval
1. Start the web app in the user's preferred local mode, for example `bun run dev --filter www` or the active workspace command.
2. Open the routes listed in scope with an authenticated session.
3. Capture screenshots or concise notes for each matrix row.
4. Run only focused tests for any issues found and update Brain with pass/fail evidence.

## Browser QA Execution Checklist

### Preflight
1. Confirm the browser session is authenticated as a Super Admin or equivalent inventory operator role.
2. Confirm the target environment is local/dev or an approved staging environment; do not mutate production data for shipment, receive, stock adjustment, or fulfillment checks.
3. Record the validation date, environment, user role, app URL, and sale/order IDs before changing any inventory state.
4. Use a sale with inventory-backed `LineItem` and `LineItemComponents` data, not only legacy Dyke component data.
5. Use one fixture sale for blocked/awaiting-inbound behavior and one fixture sale for available-stock dispatch/partial-shipment behavior when possible, so repeated actions do not hide state transitions.

### Route And Navigation Smoke
1. From the sidebar Inventory section, open `/inventory` and confirm the operations dashboard, top-sales summary, and inventory table render without blocking the page.
2. From dashboard/sidebar links, open `/inventory/variants`, `/inventory/allocations`, `/inventory/inbounds`, `/inventory/production-plan`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/stocks`, and `/inventory/dispatch-mode`.
3. Open an inventory item dashboard from an item row and confirm variants, stock, movement history, inbound demand, allocations, sales, and quotes sections are reachable.
4. Open `/p/sales-inventory-v2?ids=<saleId>&mode=production&preview=false` with a known inventory-backed sale and confirm the route renders inside the print viewer.

### Allocation Review
1. Find a sale line with pending inventory allocation review.
2. Approve one allocation and confirm it moves from `pending_review` to the next expected reserved/approved state.
3. Reject or release one safe fixture allocation and confirm it does not remain counted as available for dispatch.
4. Run bulk approval by sale, supplier, category, or production batch if data exists, and record skipped rows separately from successful rows.

### Inbound Receiving
1. Find a line blocked by an open `InboundDemand`.
2. Create or open an inbound shipment for the demand.
3. Receive a partial quantity and confirm stock, received quantity, and line readiness move only by the received delta.
4. Retry the same receive action and confirm no duplicate stock movement is created.
5. Receive the remaining quantity and confirm affected backorder/awaiting-inbound rows become ready for allocation or production.

### Production Plan
1. Filter production plan rows by blocked/awaiting-inbound and ready states.
2. Confirm blockers name the missing component or unresolved allocation state.
3. Confirm ready rows align with `ready_for_production` or fulfilled summary readiness.
4. Open the production packet print link and confirm the printed data uses inventory-backed BOM/pick details while preserving the current sales print template structure.

### Backorder And Partial Shipment
1. Open `/inventory/backorders` for a sale with `remainingQty > 0` and unavailable quantity.
2. Use allocate-received on a received inbound fixture and confirm remaining/backordered quantity decreases.
3. Use ship-available for a partially available line and confirm shipped/remaining quantities update.
4. Open `/inventory/partial-shipments`, enable hold-until-complete on one line, and confirm ship-available skips the held line until full remaining quantity is available.
5. Disable hold or use a separate ready line and confirm a partial shipment can be created only for available quantity.

### Stock Operations
1. Add stock to a stockable variant and confirm `InventoryStock.qty` and recent audit evidence update.
2. Remove stock with a reason code and confirm movement/audit evidence records the reason.
3. Record return, correction, consume, and release actions when fixtures allow it; otherwise record the missing fixture as a validation gap.
4. Confirm low-stock and out-of-stock dashboard cards reflect the changed stock state after refresh.

### Dispatch Mode
1. Open `/inventory/dispatch-mode` for a line with available approved allocation.
2. Run assign and confirm allocation state moves to reserved.
3. Run pack and confirm reserved allocations move to picked.
4. Run fulfill and confirm only picked allocations are consumed.
5. Confirm a legacy delivery/order item delivery record is created with inventory dispatch metadata.
6. Run release on a safe reserved or picked fixture and confirm stock/allocation state returns to an unfulfilled/released state without consuming inventory.

### Inventory Print Parity
1. Render inventory print modes for invoice, production BOM, pick list, packing list, backorder summary, and customer remaining summary.
2. Compare layout, section grouping, line ordering, totals, and template chrome against the current Dyke/v2 sales print expectations.
3. Confirm inventory print has its own route and data compose path and does not modify the existing sales print route.
4. Record any visual/template mismatch as a follow-up with the print mode, sale ID, and screenshot path.

### Evidence Format
For each checklist row, capture:
- Route or action name.
- Sale/order/inventory IDs used.
- Starting state and ending state.
- Result: pass, fail, blocked, or not applicable.
- Screenshot path or concise observation.
- Any follow-up issue, owner, and suggested fix plan.

### Stop Conditions
1. Stop if the session points at production or an unapproved environment for mutating workflow checks.
2. Stop if a fixture sale cannot be restored or safely reused after shipment/fulfillment.
3. Stop if receiving, dispatch, or stock adjustment produces duplicate movements; record the sale/variant IDs and create a focused fix plan before continuing.
4. Stop if print route renders legacy Dyke-only data instead of inventory-composed data for an inventory-backed sale.

## Current Findings
- The command/API foundation for inventory dispatch mode existed, but no dedicated UI caller was found during static audit.
- Added `/inventory/dispatch-mode` so assign, pack, fulfill, and release can be validated from the inventory workspace.
- Added the Dispatch Mode sidebar link for Super Admins so browser validation can start from normal inventory navigation.
- Added sidebar links for `/inventory/variants` and `/inventory/partial-shipments`, then expanded sidebar coverage to assert all authenticated inventory validation routes are accessible to Super Admins.
- Added static route-file coverage for the Pending 15 matrix, including the public `/p/sales-inventory-v2` print route.
- Focused non-browser validation passed for sales fulfillment planning, dispatch allocation transition rules, backorder queues, partial shipment planning, production plan grouping, inventory operations summary, item dashboard summary, top-sales analytics, and variants workspace rows.
- Focused inventory print tests passed for production BOM, pick list, packing list, backorder summary, customer remaining summary, and the separate `/p/sales-inventory-v2` request URL.
- Import smoke passed for the inventories router, inventory dispatch-mode component, and operations dashboard component.
- Import smoke passed for importable inventory print surfaces: `print.route.ts`, `rendered-inventory-pdf-print-viewer.tsx`, and `inventory-print-request.ts`.
- Directly importing `SalesInventoryPrintViewerPage` outside Next hit the expected `server-only` boundary from the app tRPC server helper, so route/browser proof still belongs to the approved browser validation pass.
- No live browser evidence exists yet for Pending 15.

## Non-Browser Checks Run
- `bun test packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts`
  - Result: 24 tests passed, 68 assertions.
- `bun test apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts`
  - Result: 29 tests passed, 89 assertions.
- `bun test packages/sales/src/print/inventory-print-data.test.ts apps/www/src/modules/sales-print/application/inventory-print-request.test.ts apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts`
  - Result: 36 tests passed, 105 assertions.
- `bun test packages/sales/src/print/inventory-print-data.test.ts apps/www/src/modules/sales-print/application/inventory-print-request.test.ts apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts`
  - Result after route-file matrix coverage: 37 tests passed, 115 assertions.
- `bun -e 'await import("./apps/www/src/components/inventory/inventory-dispatch-mode-page.tsx"); await import("./apps/www/src/components/inventory/inventory-operations-dashboard.tsx"); await import("./apps/api/src/trpc/routers/inventories.route.ts"); console.log("inventory browser-readiness imports ok")'`
  - Result: passed.
- `bun -e 'await import("./apps/www/src/components/sidebar-links.ts"); await import("./apps/www/src/components/inventory/inventory-dispatch-mode-page.tsx"); await import("./apps/api/src/trpc/routers/inventories.route.ts"); console.log("inventory nav readiness imports ok")'`
  - Result: passed.
- `bun -e 'await import("./apps/www/src/components/sidebar-links.ts"); await import("./apps/www/src/components/inventory/inventory-dispatch-mode-page.tsx"); await import("./apps/api/src/trpc/routers/inventories.route.ts"); console.log("inventory route readiness imports ok")'`
  - Result: passed.
- `bun -e 'await import("./apps/api/src/trpc/routers/print.route.ts"); await import("./apps/www/src/components/rendered-inventory-pdf-print-viewer.tsx"); await import("./apps/www/src/modules/sales-print/application/inventory-print-request.ts"); console.log("inventory print importable surfaces ok")'`
  - Result: passed.
- `bun -e 'await import("./apps/www/src/components/sidebar-links.ts"); await import("./apps/api/src/trpc/routers/print.route.ts"); await import("./apps/api/src/trpc/routers/inventories.route.ts"); console.log("inventory matrix import surfaces ok")'`
  - Result: passed.
- Attempted import smoke for `SalesInventoryPrintViewerPage`
  - Result: blocked outside Next by expected `server-only` package boundary.
- Scoped `git diff --check` for the dispatch-mode UI, operations dashboard link, route, and Brain docs.
  - Result: passed.
- Trailing-whitespace scan for new dispatch-mode and readiness-report files.
  - Result: no matches.

## Next Step
Get explicit approval to run browser/local dev validation, then execute the matrix above and either mark Pending 15 done with screenshots/evidence notes or create focused fix plans for any failures.

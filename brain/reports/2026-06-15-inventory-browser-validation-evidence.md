# Inventory Browser Validation Evidence

## Status
Partially Run - Route Smoke Mostly Passed, Workflow Fixtures Missing

## Date
2026-06-15

## Purpose
Capture the live browser/operator evidence required to complete Inventory Pending 15.

Readiness runbook: `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`

## Run Context
- Environment: local dev
- App URL: `http://localhost:3000`
- Validator: Codex in-app browser
- Role: `Pablo Cruz` / Super Admin via Dev Quick Login
- Browser/session: Codex in-app browser, explicit viewport `1440x1000`
- Data source: current local database
- Started at: 2026-06-15 live browser pass
- Completed at: partial pass only; workflow mutation fixtures are still incomplete

## Fixture Records

| Fixture | Required Shape | Sale/Order/Inventory IDs | Status |
| --- | --- | --- | --- |
| Available dispatch sale | Inventory-backed sale line with approved allocation and available stock | Not found in visible dispatch queue; `/inventory/dispatch-mode` reported `LINES 0`, `AVAILABLE 0`, `REMAINING 0`. | Blocked |
| Held partial shipment sale | Inventory-backed sale line with partial stock and hold-until-complete available | Not found; `/inventory/partial-shipments` reported `OPEN LINES 0`, `AVAILABLE NOW 0`, `HELD LINES 0`. | Blocked |
| Awaiting inbound sale | Inventory-backed sale line blocked by one missing required component | `08077PC` showed blocked/shortage component rows in production and backorder queues, but inbound qty was `0`. | Partial |
| Received inbound backorder | Backordered sale line with inbound stock received and ready to allocate | Not found; backorder queue showed `INBOUND / RECEIVED 0 / 0`. | Blocked |
| Low stock variant | Stockable variant below low-stock threshold | Not found; operations dashboard reported `Low Stock 0`. | Blocked |
| Zero stock variant | Stockable variant at zero stock | Variants and stock dashboard showed stock quantities at `0`, but visible rows were unmonitored/draft and stock ops audit fixtures were empty. | Partial |
| Inventory print sale | Sale with BOM, pick, packing, backorder, and remaining-summary data | `08499LM` used for route-level PDF render proof at `/p/sales-inventory-v2?ids=08499LM&mode=production&preview=false`. | Pass |

## Route Smoke Evidence

| Route | Expected Evidence | Result | Screenshot Or Note | Follow-Up |
| --- | --- | --- | --- | --- |
| `/inventory` | Operations dashboard, top-sales summary, and inventory table render | Pass | Rendered `Operations Dashboard`, tracked/untracked/low/out-of-stock/open inbound/pending allocation/backordered/production blocker cards, top-sales analytics, inventory table rows, and route links. | None |
| `/inventory/variants` | Variants workspace renders and links to item/edit/stock views | Pass | Rendered `Inventory Variants`, `50 visible variants`, filters, stock totals, and `Dashboard` / `Edit` / `Stock` row actions. | None |
| `/inventory/allocations` | Allocation review queue renders with pending/skipped/empty state | Pass - Empty Data | Rendered `Allocation Review`, `Approve Visible`, `PENDING 0`, `VISIBLE SUGGESTIONS 0`, and manual approval safety gate. | Need fixture with pending allocation suggestions for action proof. |
| `/inventory/inbounds` | Inbound queue and shipment/receiving controls render | Pass - Empty Data | Rendered `Inbound Shipments`, shipment queue, receiving tray, `New Inbound`, `Create From Demand`, reorder suggestions, and activity sections; counts were `0`. | Need inbound demand/shipment fixture for receive proof. |
| `/inventory/production-plan` | Blocked and ready production rows render with blockers | Pass | Rendered `Production Plan`, filters, `BLOCKED LINES 18`, `COMPONENTS 102`, `INBOUND / SHORT 0 / 125`, supplier load, stock status, and per-component shortage rows for order `08077PC`. | None |
| `/inventory/backorders` | Backorder queue renders remaining/backordered quantities | Pass | Rendered `Backorder Queue`, `QUEUE LINES 18`, `REMAINING QTY 234`, `BACKORDERED QTY 55`, backordered lines for order `08077PC`, and `Ship Available` buttons. | Ship action blocked because sampled rows had available qty `0`. |
| `/inventory/partial-shipments` | Hold and ship-available controls render | Pass - Empty Data | Rendered `Partial Shipments`, filters, and summary cards, but `OPEN LINES 0`, `AVAILABLE NOW 0`, `HELD LINES 0`, `REMAINING 0`. | Need available/held partial shipment fixture for action proof. |
| `/inventory/stocks` | Stock operations and audit evidence render | Pass - Empty Audit | Rendered `Stock Operations`, manual adjustment form, `Post Adjustment`, and audit verification matrix for stock in/out/return/correction/consume/release; all recent audit counts were `0`. | Need safe stock fixture before mutating physical stock. |
| `/inventory/dispatch-mode` | Assign, pack, fulfill, and release controls render | Pass - Empty Data | Rendered `Inventory Dispatch Mode`, partial shipment/backorder links, filters, and empty state; `LINES 0`, `AVAILABLE 0`, `REMAINING 0`, `BACKORDERED 0`, `HELD 0`. | Need approved available allocation fixture for assign/pack/fulfill/release proof. |
| `/p/sales-inventory-v2` | Inventory print viewer renders from inventory-composed data | Pass After Fix | Initial browser run exposed SSR error from `PDFViewer` being rendered on the server. Added client-only dynamic wrapper. Re-test rendered one blob-backed PDF iframe for `ids=08499LM&mode=production&preview=false`. | Visually compare packet content once richer inventory print fixture is available. |

## Workflow Evidence

| Workflow | Required Proof | Result | Starting State | Ending State | Screenshot Or Note | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| Allocation approve | Pending allocation moves to approved/reserved path | Blocked | `PENDING 0` | No mutation run | No pending allocation fixture. | Seed or identify sale with pending allocation suggestions. |
| Allocation reject/release | Rejected/released allocation is not dispatchable | Blocked | `VISIBLE SUGGESTIONS 0` | No mutation run | No rejectable allocation fixture. | Seed or identify pending allocation fixture. |
| Bulk allocation approval | Bulk action reports successful and skipped rows separately | Blocked | `PENDING 0` | No mutation run | `Approve Visible` rendered, but no rows. | Seed or identify pending allocation fixture. |
| Inbound partial receive | Stock and received quantity move only by new delta | Blocked | `TOTAL INBOUNDS 0`; suggestions `0` | No mutation run | No inbound shipment/demand fixture. | Seed inbound demand/shipment. |
| Inbound receive retry | Repeating same receive does not duplicate stock movement | Blocked | No shipment rows | No mutation run | No inbound receipt fixture. | Seed inbound shipment with receive line. |
| Inbound final receive | Awaiting/backorder rows become allocation or production ready | Blocked | Backorder inbound/received `0 / 0` | No mutation run | No received inbound fixture. | Seed received inbound backorder fixture. |
| Production blocked filter | Missing component/allocation blocker is visible and accurate | Pass | `BLOCKED LINES 18`, `COMPONENTS 102`, shortage rows for `08077PC` | Blocked rows visible | Browser showed component shortage blockers with need/allocated/review/inbound/short counts. | None |
| Production ready filter | Ready rows match `ready_for_production` or fulfilled readiness | Partial | Filter buttons rendered | Not clicked/mutated | Route renders readiness filters; current sampled data emphasized blocked rows. | Use ready fixture for deeper filter proof. |
| Backorder allocate received | Received inbound stock reduces backordered quantity | Blocked | `INBOUND / RECEIVED 0 / 0` | No mutation run | No received inbound fixture. | Seed received inbound demand. |
| Backorder ship available | Available quantity ships without over-shipping remaining qty | Blocked | Sampled backorder rows available `0` | No mutation run | `Ship Available` buttons rendered but sampled rows were unavailable. | Seed available partial stock/backorder fixture. |
| Hold until complete | Held partial line is skipped until full remaining qty is available | Blocked | Partial shipments `HELD LINES 0` | No mutation run | No held partial shipment fixture. | Seed held partial shipment fixture. |
| Stock add/remove | `InventoryStock.qty` and audit evidence update with reason | Not Run | Stock form rendered; audit rows `0` | No mutation run | Avoided physical stock mutation without explicit safe variant fixture. | Pick or seed safe local variant/stock row. |
| Stock return/correction | Return/correction movement is recorded with reason | Not Run | Audit matrix rendered | No mutation run | Avoided physical stock mutation without safe fixture. | Pick or seed safe local variant/stock row. |
| Dispatch assign | Approved allocation moves to reserved | Blocked | Dispatch `LINES 0` | No mutation run | No available approved allocation fixture. | Seed or identify dispatchable allocation. |
| Dispatch pack | Reserved allocation moves to picked | Blocked | Dispatch `AVAILABLE 0` | No mutation run | No reserved allocation fixture. | Seed or identify dispatchable allocation. |
| Dispatch fulfill | Picked allocation is consumed and delivery metadata is written | Blocked | Dispatch empty state | No mutation run | No picked allocation fixture. | Seed or identify dispatchable allocation. |
| Dispatch release | Reserved/picked allocation releases without consuming inventory | Blocked | Dispatch empty state | No mutation run | No reserved/picked allocation fixture. | Seed or identify release-safe allocation. |

## Print Evidence

| Print Mode | Required Proof | Result | Sale IDs | Screenshot Or Note | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| Invoice | Existing template chrome and totals render from inventory data | Not Run | TODO | TODO | Need visual mode-specific fixture pass. |
| Production BOM | BOM rows come from inventory line/component data | Pass - Route Render | `08499LM` | `production` mode route rendered one blob-backed PDF iframe after client-only wrapper fix. | Need visual packet content comparison. |
| Pick list | Pick quantities reflect inventory allocation state | Covered By Unit Test | Fixture tests | Focused print tests passed for order-packing mode. | Browser visual check still needed. |
| Packing list | Packing rows reflect shipment/available inventory quantities | Covered By Unit Test | Fixture tests | Focused print tests passed for packing-slip mode. | Browser visual check still needed. |
| Backorder summary | Backordered and inbound quantities are visible | Covered By Unit Test | Fixture tests | Focused print tests passed for backorder packet. | Browser visual check still needed. |
| Customer remaining summary | Remaining quantity summary matches partial shipment state | Covered By Unit Test | Fixture tests | Focused print tests passed for customer remaining summary. | Browser visual check still needed. |

## Completion Decision
- Pending 15 completion status: Partially Run, not complete
- Critical failures: Initial `/p/sales-inventory-v2` browser run exposed an SSR crash because `PDFViewer` rendered on the server. Fixed by wrapping the inventory PDF viewer in a client-only dynamic component, then re-tested the route and confirmed a blob-backed PDF iframe renders.
- Non-blocking follow-ups: Route smoke passes for inventory dashboard, variants, allocations, inbounds, production plan, backorders, partial shipments, stock operations, dispatch mode, and inventory print route. Several mutation workflows are still data-blocked because current local fixtures have no pending allocations, inbounds, partial shipment lines, dispatch lines, or safe stock-audit rows.
- Recommended next action: seed or identify a controlled validation fixture set for pending allocations, inbound receiving, dispatchable allocations, held partial shipments, and safe stock adjustments; then run the mutating workflow checks and visual print packet comparisons before marking Pending 15 done.

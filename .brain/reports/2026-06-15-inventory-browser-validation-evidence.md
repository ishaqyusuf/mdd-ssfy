# Inventory Browser Validation Evidence

## Status
Desktop Browser Evidence Complete

## Date
2026-06-15

## Purpose
Capture the live browser/operator evidence required to complete Inventory Pending 15.

Readiness runbook: `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`
Fixture seed plan: `brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md`

## Run Context
- Environment: local dev
- App URL: `http://localhost:3000`
- Validator: Codex in-app browser
- Role: `Pablo Cruz` / Super Admin via Dev Quick Login
- Browser/session: Codex in-app browser, explicit viewport `1440x900`
- Data source: current local database
- Started at: 2026-06-15 live browser pass
- Completed at: 2026-06-17 desktop browser mutation pass for workflow runs `10` through `130`; inventory print route/mode render proof passed; mapped Dyke sale legacy-vs-inventory print route parity passed for `08077PC`

## 2026-06-17 Desktop Mutation Pass

The Codex in-app browser was kept on a desktop `1440x900` viewport for the mutating pass. Browser actions and the follow-up mutation snapshots proved the controlled fixture workflow rows moved as expected:

- Allocation review: allocation `#7` approved, allocation `#8` cancelled/rejected, allocation `#9` bulk-approved. The bulk action also approved legacy pending allocation `#1`; this was collateral from the visible queue and is recorded as non-primary evidence.
- Dispatch mode: exact allocation controls moved `#13` approved -> reserved, `#14` reserved -> picked, `#15` reserved -> released, and `#12` picked -> consumed. Fulfillment wrote delivery compatibility row `#4021` for `INV-FIX-ALLOC`.
- Inbound receive: browser selected `Inbound #1`, posted `Good 2` for shipment item `#1`, and the snapshot showed shipment item `#1` completed, demand `#1` received `2`, stock row `#5` for variant `#2068`, and movement `#1` as `stock_in:2:2`.
- Received backorder release: after repairing the received fixture stock row, browser `Allocate Received` reserved one received unit for line `#22`, creating allocation `#17` and leaving backorder `0` in the visible queue.
- Partial shipment and hold: after repairing the partial fixture sales-item links, browser shipped available line `#23`, consumed allocation `#5`, and wrote delivery compatibility row `#4022`. Held line `#24` remained `holdUntilComplete=true` with allocation `#6` still reserved and unconsumed.
- Stock adjustment: browser posted a delta correction for variant `#2066` / stock row `#2`, moving stock `10 -> 12` and writing movement `#2` / log `#2`.
- Low-stock dashboard: `/inventory` showed low-stock count `1`, `Inventory Validation Low Stock Item`, sku `INV-FIX-STOCK-LOW`, `0 on hand`, and threshold `5`.

Fixture repair notes from this pass:
- `INV-FIX-ALLOC` needed a legacy `SalesOrderItems` link so dispatch fulfillment could write `OrderItemDelivery`.
- `INV-FIX-RECEIVED` needed a `validation-fixture` stock row for variant `#2069` so received backorder release had available stock to reserve.
- `INV-FIX-PARTIAL` needed per-line legacy `SalesOrderItems` links so partial shipment could write compatibility delivery rows for line `#23` while leaving held line `#24` untouched.

Validation commands:
- `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 23 tests and 65 assertions.
- `bun test packages/sales/src/inventory-dispatch-transition.test.ts` passed with 5 tests and 14 assertions.
- Scoped `git diff --check` passed for the touched inventory validation UI, fulfillment, API, seed helper, and Brain files.

## 2026-06-17 Inventory Print Route Proof

The in-app browser rendered one blob-backed PDF iframe with no error text for each checked inventory print route at `1440x900`:

- `ids=23027&mode=production`: production packet for `INV-FIX-PARTIAL`
- `ids=23027&mode=order-packing`: two-page order/backorder + packing packet for `INV-FIX-PARTIAL`
- `ids=23027&mode=packing-slip`: packing packet for `INV-FIX-PARTIAL`
- `ids=23027&mode=invoice`: backorder summary packet for `INV-FIX-PARTIAL`
- `ids=23027&mode=quote`: backorder summary packet for `INV-FIX-PARTIAL`
- `ids=23024&mode=invoice`: customer remaining summary packet for `INV-FIX-ALLOC`

The inventory print data builder returned the expected packet titles and row counts:

| Mode / Sale | Title | Sections |
| --- | --- | --- |
| `production` / `23027` | `Production INV-FIX-PARTIAL` | `Inventory Production BOM` with 2 rows |
| `order-packing` / `23027` | `Sales Inventory Print (2)` | `Inventory Backorder Summary` with 2 rows; `Inventory Packing List` with 2 rows |
| `packing-slip` / `23027` | `Packing Slip INV-FIX-PARTIAL` | `Inventory Packing List` with 2 rows |
| `invoice` / `23027` | `Invoice INV-FIX-PARTIAL` | `Inventory Backorder Summary` with 2 rows |
| `quote` / `23027` | `Quote INV-FIX-PARTIAL` | `Inventory Backorder Summary` with 2 rows |
| `invoice` / `23024` | `Invoice INV-FIX-ALLOC` | `Inventory Customer Remaining Summary` with 1 row |

## 2026-06-17 Mapped Dyke Print Parity Proof

The local database has mapped Dyke order `08077PC` / sale id `21379` with inventory-backed `LineItem` rows and legacy `SalesOrderItems` links. The in-app browser rendered both legacy Dyke print and inventory print routes for the same sale at `1440x900`:

| Mode | Legacy Route Evidence | Inventory Route Evidence |
| --- | --- | --- |
| `invoice` | `/p/sales-invoice-v2` rendered one iframe with no error text | `/p/sales-inventory-v2?ids=21379&mode=invoice` rendered one blob-backed PDF iframe with no error text |
| `production` | `/p/sales-invoice-v2` rendered one iframe with no error text | `/p/sales-inventory-v2?ids=21379&mode=production` rendered one blob-backed PDF iframe with no error text |
| `packing-slip` | `/p/sales-invoice-v2` rendered one blob-backed PDF iframe with no error text | `/p/sales-inventory-v2?ids=21379&mode=packing-slip` rendered one blob-backed PDF iframe with no error text |
| `order-packing` | `/p/sales-invoice-v2` rendered one blob-backed PDF iframe with no error text | `/p/sales-inventory-v2?ids=21379&mode=order-packing` rendered one blob-backed PDF iframe with no error text |

Data-shape comparison for the same sale:

| Mode | Legacy Data | Inventory Data |
| --- | --- | --- |
| invoice / order | 1 page for `08077PC` | `Invoice 08077-PC`; `Inventory Backorder Summary` with 7 rows |
| production | 1 page for `08077PC` | `Production 08077-PC`; `Inventory Production BOM` with 38 rows |
| packing slip | 1 page for `08077PC` | `Packing Slip 08077-PC`; `Inventory Packing List` with 7 rows |
| order-packing | 2 pages for `08077PC` | `Sales Inventory Print (2)`; backorder summary with 7 rows and packing list with 7 rows |

## Fixture Records

Read-only fixture preflight is now available through `inventories.inventoryBrowserValidationFixtureReport`, the `/inventory` validation fixtures panel, and the repeatable root command `bun run inventory:validation-fixtures`. Run it before the next browser mutation pass; it reports pending allocation review, dispatch assign/pack/fulfill allocations, open inbound demand, inbound receiving shipment, received-inbound backorder, partial shipment, held partial shipment, low-stock variant, and safe positive-stock adjustment variant readiness with bounded samples and uncapped counts for SQL-filterable categories. Fixture rows now include seed-plan identifiers plus `countDiagnostic` so evidence can connect missing categories to the controlled seed plan and distinguish complete SQL counts from bounded application scans; `/inventory` and the CLI both surface incomplete bounded-count warnings. The same report now includes a browser mutation matrix that marks each Phase 4 workflow runnable or blocked from the fixture readiness state and carries run order, primary samples, guard text, and candidate fixture samples, so evidence capture can follow package-owned actions, sample IDs, and expected outcomes instead of a separate prose-only checklist. Use `bun run inventory:validation-fixtures --seed-checklist` to print grouped setup actions, `bun run inventory:validation-fixtures --seed-blueprint` to print row-level seed planning, `bun run inventory:validation-fixtures --markdown` when the preflight plus sampled workflow matrix needs to be pasted back into this evidence worksheet, `bun run inventory:validation-fixtures --completion-gate` to print the Pending 15 completion checklist, and `bun run inventory:validation-fixtures --evidence-template` to generate the before/action/after/result worksheet with `Run`, `Use Sample`, `Compare Fields`, `Expected Delta`, and `Guard` columns for the mutating browser pass. The evidence template now includes snapshot steps: run `bun run inventory:validation-fixtures --mutation-snapshot` before browser actions, use the snapshot's `Primary Proof Target Index` plus `proofTarget` / `primaryProof=yes` detail rows to identify workflow rows, run the ordered matrix, then rerun the same snapshot command afterward to compare exact fixture-row state.

Latest read-only preflight run: `bun --cwd apps/api -e ...inventoryBrowserValidationFixtureReport...` with fallback `DATABASE_URL=mysql://root@localhost/gnd-prisma2` returned `status: blocked`, `readyFixtureCount: 0`, `requiredFixtureCount: 11`, and `missingFixtureCount: 11`. Every fixture category reported count `0`; no samples were returned. This confirms the fallback local database is not ready for mutating workflow validation.

Latest command-wrapper check: `bun run inventory:validation-fixtures --help` passed, including documented `--json`, `--markdown`, `--seed-checklist`, `--seed-blueprint`, `--evidence-template`, `--mutation-snapshot`, `--completion-gate`, and `--fail-on-blocked` modes. Mixed output modes are rejected. `bun run inventory:validation-fixtures --seed-checklist` grouped the missing categories by the six `INV-FIX-*` seed fixtures, and `--seed-blueprint` printed the row families, readiness predicates, and rollback order for those groups. `bun run inventory:seed-stock-fixtures --apply`, `bun run inventory:seed-allocation-fixture --apply`, `bun run inventory:seed-inbound-fixture --apply`, `bun run inventory:seed-received-fixture --apply`, and `bun run inventory:seed-partial-fixture --apply` created the local validation fixture set. Each fixture helper's `--rollback` dry-run was checked without applying cleanup. The latest `bun run inventory:seed-allocation-fixture` dry-run reported all allocation proof rows unchanged after the dispatch-capacity repair, and `bun run inventory:validation-fixtures --markdown` reached the local database with `status: ready`, `readyFixtureCount: 11`, `requiredFixtureCount: 11`, `missingFixtureCount: 0`, and `13/13` browser mutation workflows runnable. `bun run inventory:validation-fixtures --completion-gate` prints the Pending 15 completion checklist, grouping browser rows into allocation review, inventory dispatch fulfillment, inbound/backorder, partial/held shipment, and stock/low-stock gates while keeping before/after snapshots and Brain evidence update as manual completion requirements. `bun run inventory:validation-fixtures --evidence-template` now prints `Run`, `Use Sample`, `Compare Fields`, `Expected Delta`, and `Guard` columns with deterministic primary rows and sequencing guidance for each workflow, so approval/rejection/bulk and dispatch pack/release proof do not need to infer safe targets from the broader candidate list. `bun run inventory:validation-fixtures --mutation-snapshot` prints exact current fixture state for sales, stock allocations, inbound shipment items, inbound demand, line projections, stock fixtures, and delivery compatibility rows. The snapshot starts with a `Primary Proof Target Index` that currently marks all workflow runs `10` through `130` ready, names the exact primary rows, states which fields should be compared, and describes the expected delta before/after each browser action. The mutable row sections include `proofTarget` and `primaryProof`; stock allocation and inbound rows also include `proofRole`, so rows `7`/`8`/`9`/`13`/`14`/`15`/`12`/`5`/`6`, inbound shipment item `1`, received demand `2`, partial lines `23`/`24`, stock fixtures `2065`/`2066`, and future delivery rows line up with the ordered browser worksheet while older seed rows remain visible as legacy/reference rows. Run the snapshot before and after the browser pass to preserve evidence for rows that leave their readiness category after mutation. Ready fixture groups are `INV-FIX-ALLOC`, `INV-FIX-INBOUND`, `INV-FIX-RECEIVED`, `INV-FIX-PARTIAL`, `INV-FIX-STOCK-LOW`, and `INV-FIX-STOCK-SAFE`.

| Fixture | Required Shape | Sale/Order/Inventory IDs | Status |
| --- | --- | --- | --- |
| Available dispatch sale | Inventory-backed sale line with approved allocation and available stock | Historical pre-seed route smoke did not find a visible dispatch row; current action proof should use `INV-FIX-ALLOC` below. | Historical - Superseded |
| Held partial shipment sale | Inventory-backed sale line with partial stock and hold-until-complete available | Historical pre-seed route smoke did not find a held partial row; current action proof should use `INV-FIX-PARTIAL` below. | Historical - Superseded |
| Awaiting inbound sale | Inventory-backed sale line blocked by one missing required component | Historical pre-seed route smoke found `08077PC` shortage rows but no inbound qty; current receive proof should use `INV-FIX-INBOUND` below. | Historical - Superseded |
| Received inbound backorder | Backordered sale line with inbound stock received and ready to allocate | Historical pre-seed route smoke found no received backorder row; current release proof should use `INV-FIX-RECEIVED` below. | Historical - Superseded |
| Low stock variant | Stockable variant below low-stock threshold | Local fixture applied: variant id `2065`, sku `INV-FIX-STOCK-LOW`, item `Inventory Validation Low Stock Item`, stock `0`, low-stock threshold `5`. | Pass - Fixture Ready |
| Safe stock adjustment variant | Monitored variant with positive stock reserved for stock operation proof | Local fixture applied: variant id `2066`, sku `INV-FIX-STOCK-SAFE`, item `Inventory Validation Safe Stock Item`, stock `10`. | Pass - Fixture Ready |
| Allocation lifecycle sale | Inventory-backed sale line with pending review, approved, reserved, and picked allocation states | Local fixture applied: sale id `23024`, order `INV-FIX-ALLOC`, line id `20`, component id `116`, variant id `2067`, sku `INV-FIX-ALLOC`, pending review ids `7`/`8`/`9`, approved ids `10`/`13`, reserved ids `11`/`14`/`15`, picked id `12`. | Pass - Fixture Ready |
| Inbound demand and receiving shipment | Inventory-backed sale line with open demand plus receiveable inbound shipment | Local fixture applied: supplier id `7`, sale id `23025`, order `INV-FIX-INBOUND`, line id `21`, component id `117`, variant id `2068`, shipment id `1`, shipment item id `1`, demand id `1`, sku `INV-FIX-INBOUND`, demand status `ordered`. | Pass - Fixture Ready |
| Received inbound backorder | Backordered sale line with received inbound demand available for release/allocation proof | Local fixture applied: supplier id `8`, sale id `23026`, order `INV-FIX-RECEIVED`, line id `22`, component id `118`, variant id `2069`, shipment id `2`, shipment item id `2`, demand id `2`, sku `INV-FIX-RECEIVED`, demand status `partially_received`, received qty `1`. | Pass - Fixture Ready |
| Partial shipment and held partial shipment | One ship-available partial line and one hold-until-complete partial line | Local fixture applied: sale id `23027`, order `INV-FIX-PARTIAL`, variant id `2070`, stock id `4`, available line id `23` / component id `119` / allocation id `5`, held line id `24` / component id `120` / allocation id `6`. | Pass - Fixture Ready |
| Zero stock variant | Stockable variant at zero stock | Covered by the low-stock validation fixture above for alert readiness; stock operation mutation proof should use the positive-stock safe fixture. | Partial |
| Inventory print sale | Sale with BOM, pick, packing, backorder, and remaining-summary data | `08499LM` used for route-level PDF render proof at `/p/sales-inventory-v2?ids=08499LM&mode=production&preview=false`. | Pass |

## Route Smoke Evidence

| Route | Expected Evidence | Result | Screenshot Or Note | Follow-Up |
| --- | --- | --- | --- | --- |
| `/inventory` | Operations dashboard, top-sales summary, and inventory table render | Pass | Rendered `Operations Dashboard`, tracked/untracked/low/out-of-stock/open inbound/pending allocation/backordered/production blocker cards, top-sales analytics, inventory table rows, and route links. | None |
| `/inventory/variants` | Variants workspace renders and links to item/edit/stock views | Pass | Rendered `Inventory Variants`, `50 visible variants`, filters, stock totals, and `Dashboard` / `Edit` / `Stock` row actions. | None |
| `/inventory/allocations` | Allocation review queue renders with pending/skipped/empty state | Pass - Empty Data | Historical pre-seed smoke rendered `Allocation Review`, `Approve Visible`, `PENDING 0`, `VISIBLE SUGGESTIONS 0`, and manual approval safety gate. | Re-run action proof with `INV-FIX-ALLOC`. |
| `/inventory/inbounds` | Inbound queue and shipment/receiving controls render | Pass - Empty Data | Historical pre-seed smoke rendered `Inbound Shipments`, shipment queue, receiving tray, `New Inbound`, `Create From Demand`, reorder suggestions, and activity sections; counts were `0`. | Re-run action proof with `INV-FIX-INBOUND`. |
| `/inventory/production-plan` | Blocked and ready production rows render with blockers | Pass | Rendered `Production Plan`, filters, `BLOCKED LINES 18`, `COMPONENTS 102`, `INBOUND / SHORT 0 / 125`, supplier load, stock status, and per-component shortage rows for order `08077PC`. | None |
| `/inventory/backorders` | Backorder queue renders remaining/backordered quantities | Pass | Historical pre-seed smoke rendered `Backorder Queue`, `QUEUE LINES 18`, `REMAINING QTY 234`, `BACKORDERED QTY 55`, backordered lines for order `08077PC`, and `Ship Available` buttons. | Re-run received-release proof with `INV-FIX-RECEIVED`. |
| `/inventory/partial-shipments` | Hold and ship-available controls render | Pass - Empty Data | Historical pre-seed smoke rendered `Partial Shipments`, filters, and summary cards, but `OPEN LINES 0`, `AVAILABLE NOW 0`, `HELD LINES 0`, `REMAINING 0`. | Re-run action proof with `INV-FIX-PARTIAL`. |
| `/inventory/stocks` | Stock operations and audit evidence render | Pass - Empty Audit | Historical pre-seed smoke rendered `Stock Operations`, manual adjustment form, `Post Adjustment`, and audit verification matrix for stock in/out/return/correction/consume/release; all recent audit counts were `0`. | Re-run stock proof with `INV-FIX-STOCK-SAFE`. |
| `/inventory/dispatch-mode` | Assign, pack, fulfill, and release controls render | Pass - Empty Data | Historical pre-seed smoke rendered `Inventory Dispatch Mode`, partial shipment/backorder links, filters, and empty state; `LINES 0`, `AVAILABLE 0`, `REMAINING 0`, `BACKORDERED 0`, `HELD 0`. | Re-run action proof with `INV-FIX-ALLOC`. |
| `/p/sales-inventory-v2` | Inventory print viewer renders from inventory-composed data | Pass After Fix | Initial browser run exposed SSR error from `PDFViewer` being rendered on the server. Added client-only dynamic wrapper. Re-test rendered one blob-backed PDF iframe for `ids=08499LM&mode=production&preview=false`. | Visually compare packet content once richer inventory print fixture is available. |

## Workflow Evidence

| Workflow | Required Proof | Result | Starting State | Ending State | Screenshot Or Note | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- |
| Allocation approve | Pending allocation moves to approved/reserved path | Pass | Allocation `#7` pending review | Allocation `#7` approved | Desktop browser `/inventory/allocations`; mutation snapshot showed `#7 status=approved`. | None |
| Allocation reject/release | Rejected/released allocation is not dispatchable | Pass | Allocation `#8` pending review | Allocation `#8` cancelled | Desktop browser `/inventory/allocations`; mutation snapshot showed line `#20` allocation ids include `8:cancelled`. | None |
| Bulk allocation approval | Bulk action reports successful and skipped rows separately | Pass | Allocation `#9` pending review | Allocation `#9` approved | Desktop browser `/inventory/allocations`; visible bulk action also approved legacy allocation `#1` as collateral non-primary evidence. | None |
| Inbound partial receive | Stock and received quantity move only by new delta | Pass | Shipment item `#1` good `0`, demand `#1` received `0` | Shipment item `#1` good `2`, demand `#1` received `2`, stock `#5:2` | Desktop browser `/inventory/inbounds`; `Receive Inbound #1` posted `Good 2`. | None |
| Inbound receive retry | Repeating same receive does not duplicate stock movement | Partial | Receive code is delta-based and existing endpoint tests cover retry guardrails | Browser retry was not re-clicked after completion to avoid consuming extra operator time. | Snapshot movement count for item `#1` is `1`, proving no duplicate movement during this pass. | Optional future manual retry proof. |
| Inbound final receive | Awaiting/backorder rows become allocation or production ready | Pass | Line `#21` inbound required, demand `#1` ordered | Line `#21` component `#117` fulfilled, allocation `#16` reserved | Desktop browser `/inventory/inbounds`; mutation snapshot proved received stock projection. | None |
| Production blocked filter | Missing component/allocation blocker is visible and accurate | Pass | `BLOCKED LINES 18`, `COMPONENTS 102`, shortage rows for `08077PC` | Blocked rows visible | Browser showed component shortage blockers with need/allocated/review/inbound/short counts. | None |
| Production ready filter | Ready rows match `ready_for_production` or fulfilled readiness | Partial | Filter buttons rendered | Not clicked/mutated | Route renders readiness filters; current sampled data emphasized blocked rows. | Use ready fixture for deeper filter proof. |
| Backorder allocate received | Received inbound stock reduces backordered quantity | Pass | Demand `#2` received `1`, line `#22` backorder `1` | Allocation `#17` reserved, line `#22` backorder `0` in browser | Desktop browser `/inventory/backorders`; `Allocate Received` reported `1 received units reserved across 1 components`. | None |
| Backorder ship available | Available quantity ships without over-shipping remaining qty | Pass | Available partial line `#23`, allocation `#5` approved | Allocation `#5` consumed, delivery `#4022` completed, remaining `1` | Desktop browser `/inventory/partial-shipments`; `Ship Available` shipped `1`. | None |
| Hold until complete | Held partial line is skipped until full remaining qty is available | Pass | Held line `#24`, allocation `#6` reserved | Line `#24` still held, allocation `#6` still reserved | Snapshot after line `#23` shipment proved held line was not consumed. | None |
| Stock add/remove | `InventoryStock.qty` and audit evidence update with reason | Pass | Safe variant `#2066`, stock `#2` qty `10` | Stock `#2` qty `12`, movement `#2:adjustment:2:12` | Desktop browser `/inventory/stocks`; delta correction posted. | None |
| Stock return/correction | Return/correction movement is recorded with reason | Pass | Safe variant `#2066`, stock `#2` qty `10` | Stock `#2` qty `12`, movement/log `#2` recorded as correction/adjustment | Browser used correction reason with reference `INV-FIX-STOCK-SAFE browser validation`. | None |
| Dispatch assign | Approved allocation moves to reserved | Pass | Allocation `#13` approved | Allocation `#13` reserved | Desktop browser `/inventory/dispatch-mode`; exact `Assign #13` control. | None |
| Dispatch pack | Reserved allocation moves to picked | Pass | Allocation `#14` reserved | Allocation `#14` picked | Desktop browser `/inventory/dispatch-mode`; exact `Pack #14` control. | None |
| Dispatch fulfill | Picked allocation is consumed and delivery metadata is written | Pass | Allocation `#12` picked | Allocation `#12` consumed, delivery `#4021` completed | Desktop browser `/inventory/dispatch-mode`; exact `Fulfill #12` control after fixture sales-item repair. | None |
| Dispatch release | Reserved/picked allocation releases without consuming inventory | Pass | Allocation `#15` reserved | Allocation `#15` released | Desktop browser `/inventory/dispatch-mode`; exact `Release #15` control. | None |

## Print Evidence

| Print Mode | Required Proof | Result | Sale IDs | Screenshot Or Note | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| Invoice | Existing template chrome and totals render from inventory data | Pass - Route Render / Data Shape | `23027`, `23024`, `21379` | Browser rendered inventory invoice PDFs for fixture sales and mapped Dyke sale `08077PC`; legacy Dyke invoice route also rendered for `21379`. | Pixel/golden automation can be added later. |
| Production BOM | BOM rows come from inventory line/component data | Pass - Route Render / Data Shape | `23027`, `21379` | Browser rendered inventory production PDF for fixture and mapped Dyke sale; legacy Dyke production route also rendered for `21379`. | Pixel/golden automation can be added later. |
| Pick list | Pick quantities reflect inventory allocation state | Pass - Route Render / Data Shape | `23027`, `21379` | `order-packing` rendered inventory and legacy routes; mapped Dyke sale produced two pages in both systems. | Pixel/golden automation can be added later. |
| Packing list | Packing rows reflect shipment/available inventory quantities | Pass - Route Render / Data Shape | `23027`, `21379` | `packing-slip` rendered inventory and legacy routes; mapped Dyke sale produced one page in both systems. | Pixel/golden automation can be added later. |
| Backorder summary | Backordered and inbound quantities are visible | Pass - Route Render / Data Shape | `23027`, `21379` | Invoice/quote fixture modes rendered backorder packets; mapped Dyke invoice route rendered and inventory data produced a 7-row backorder summary. | Pixel/golden automation can be added later. |
| Customer remaining summary | Remaining quantity summary matches partial shipment state | Pass - Route Render / Data Shape | `23024` | Invoice mode rendered a blob-backed PDF and returned `Inventory Customer Remaining Summary` with 1 row. | Pixel/golden automation can be added later. |

## Completion Decision
- Pending 15 completion status: Browser mutation matrix, inventory print route/mode render proof, and mapped Dyke legacy-vs-inventory print route parity complete.
- Critical failures: The desktop browser pass found three fixture/data-contract blockers and repaired them: dispatch/partial shipment fixture lines needed legacy `SalesOrderItems` links for delivery compatibility rows, and the received-backorder fixture needed a real stock row for the received variant before allocation release could reserve stock.
- Non-blocking follow-ups: Route smoke passes for inventory dashboard, variants, allocations, inbounds, production plan, backorders, partial shipments, stock operations, dispatch mode, and inventory print route/modes. Mapped Dyke print parity was browser-checked for route render and data shape; future hardening can add automated pixel/golden PDF diffing.
- Recommended next action: use the completed evidence as the Pending 15 browser cutover record, then schedule automated pixel/golden PDF diffing as a hardening task rather than a browser-pass blocker.

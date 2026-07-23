# Inventory-Backed Sales Fulfillment

## Goal
Use inventory as the operational truth for sales fulfillment while legacy sales continues to work during migration.

The long-term source of truth for overview, print, production, deployment, fulfillment, and reporting should be inventory-backed projections, not cloned or forked sales records.

## Core Rule
- Do not clone a sale to represent backorder.
- Split fulfillment state at the sale line and component level.
- A line can only move forward when all required fulfillment units are available for that step.
- If one required component is missing, the line remains blocked even when other components are available.

## Core Units
- [x] `LineItem` is the inventory-backed sale line.
- [x] `LineItemComponents` is the BOM / production component demand row.
- [x] `InventoryStock` remains the physical/current stock source.
- [x] `StockAllocation` tracks reserved, picked, consumed, and released inventory.
- [x] `InboundDemand` tracks unavailable quantity expected through supplier/receiving.
- [x] `InboundShipment` / `InboundShipmentItem` support the receiving workflow.
- [x] `SalesFulfillmentPlan` exists as a projection over ordered, allocated, picked, shipped, remaining, backordered, inbound, and received quantities.
- [x] `OrderDelivery` / `OrderItemDelivery` are the canonical shipment records for the current inventory cutover phase; see `brain/decisions/ADR-008-inventory-shipment-record-source.md`.
- [x] Inventory owns inbound demand status semantics for order prompt projection and selected line-demand prompt scope; see `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
- [x] `inventories.inventoryBrowserValidationFixtureReport` provides a read-only cutover preflight for browser mutation proof, checking whether the local data set has the required allocation, inbound receiving, dispatch, partial shipment, low-stock, and stock-adjustment fixture categories before mutating workflow validation is rerun. `/inventory` surfaces this through `InventoryValidationFixturePanel` beside the operations dashboard, and the root `bun run inventory:validation-fixtures` command exposes the same report for repeatable CLI evidence, including `--json` for machine-readable payloads, `--markdown` for paste-ready Brain evidence snapshots with workflow samples, `--seed-checklist` for grouped setup actions, `--seed-blueprint` for row-level seed planning, `--evidence-template` for a paste-ready browser mutation worksheet, `--mutation-snapshot` for exact fixture-row before/after state capture, and `--completion-gate` for the Pending 15 cutover checklist. The mutation snapshot now starts with a `Primary Proof Target Index` for run-order rows `10` through `130`, including exact primary row ids, compare fields, and expected deltas for each workflow, then labels stock allocations, inbound shipment items, inbound demands, line projections, stock fixture rows, and delivery compatibility rows with `proofTarget` and `primaryProof`; allocation and inbound rows also include `proofRole`. This lets legacy seed rows, alternate/recovery candidates, direct browser targets, and rows expected to change after mutation be compared cleanly before and after browser validation. Fixture rows include seed-plan identifiers plus `countDiagnostic` metadata so exact SQL-count categories and bounded application-scan categories are distinguishable; the panel and CLI both call out incomplete bounded-count categories. The report now also returns a package-owned browser mutation matrix with runnable/blocked workflow status, deterministic run order, primary action samples, operator guards, candidate fixture samples, operator actions, and expected evidence for allocation approval/rejection/bulk approval, dispatch assign/pack/fulfill/release, inbound receive, received-backorder release, partial ship/hold, stock adjustment, and low-stock dashboard proof. The completion gate groups those rows into allocation review, inventory dispatch fulfillment, inbound/backorder, partial/held shipment, and stock/low-stock coverage, while keeping before/after snapshots and Brain evidence update as explicit manual completion gates. Pending allocation review readiness now requires three pending-review candidates so approve, reject, and bulk-approve proof can each point at a distinct primary sample; dispatch assign/pack readiness also requires spare approved/reserved capacity so dispatch proof does not reuse partial or held proof rows, and pack/release get separate primary samples plus guard text. Ship-available partial readiness now excludes `holdUntilComplete` rows so held-line proof stays separate from ship-available proof. The safe stock-adjustment fixture now requires a monitored non-custom variant with positive stock, avoiding a false-ready state from zero-stock monitored variants. The stock-only fixture groups can be dry-run with `bun run inventory:seed-stock-fixtures` and applied only with an explicit `--apply`; allocation, inbound, received-backorder, and partial-shipment fixture groups can be dry-run/applied with `bun run inventory:seed-allocation-fixture`, `bun run inventory:seed-inbound-fixture`, `bun run inventory:seed-received-fixture`, and `bun run inventory:seed-partial-fixture`. Partial shipment readiness now requires active allocated quantity to be greater than zero and less than ordered line quantity, avoiding false partial-shipment readiness from complete dispatch allocation fixtures. The local fixture preflight is now expected to be `11/11` ready after repairing older `INV-FIX-ALLOC` seeds with the updated allocation helper.

## Sales Overview Inventory UI
- The Sales Overview General tab now includes an admin-only, order-only
  `Production Preflight` card. Its stock/inbound check consumes the existing
  inventory readiness summary, while supplier readiness uses active
  inventory-variant supplier count/name/price evidence returned on overview
  rows. The card is read-only and routes review work into the existing Details
  or Inventory tab; it does not release production or mutate inventory.
- Sales overview side sheets show the order inbound prompt/status in the sheet header and Order Details section for orders, reusing the same `AVAILABLE` / `ORDERED` / `PENDING ORDER` badge semantics as the sales orders table; quotes hide the order-only inbound status.
- The sales overview Inventory tab renders the merged component list as a compact inventory workbench, with Needs/Not Needed filters, visible row counts, and pending/shortage summary badges.
- The Inventory tab segment order is `Needs | Inbounds | Not Needed`, keeping required production inventory first, linked inbound shipments second, and unneeded/untracked/component rows last. The URL segment values remain `stock`, `inbounds`, and `non_stock` for compatibility.
- The merged component list uses shadcn `Item` primitives instead of a table. Each item shows the uppercase component name, category/step subtitle plus the human-readable variant name when available, Needed/Not needed tags, compact quantity/on-hand/allocation/pending metrics, and cost/sales pricing pills in a vertically scroll-friendly layout. Door width/height variants normalize to the standard Dyke size display, such as `2-8 x 8-0`, even when the stored inventory variant UID is the imported `w2_8-h8_0` shape. Raw variant UIDs remain internal identity data and are not used as item subtitle text.
- Row configuration is exposed through a compact dot-icon dropdown on each item, titled by component name, with a single category-level Needed/Not needed setting and an Open inventory item footer link when an inventory record exists. `Needed` maps the category to inventory plus monitored tracking so all items from that category enter the Needs workflow; `Not needed` maps the category to component/unmonitored behavior so those rows stay out of stock workflows. The previous horizontal table grid and wheel-bridge behavior are no longer part of this surface.
- Non-stock, not-inventory, untracked, and zero-required rows expose a derived inbound requirement display of `Not Applicable` / `N/A`. This is not persisted to `SalesOrders.inventoryStatus`, does not create or cancel `InboundDemand`, and disables direct inbound-status editing for that row because `AVAILABLE` is reserved for physically available or explicitly resolved stock.
- When a category stock mode changes from untracked to tracked, `inventories.updateCategoryStockMode` returns `becameTracked` metadata and the sales overview Inventory row action runs a bounded read-only repair preview. The preview lists not-yet-production/in-production orders with pending quantity for the category and skips orders at `ready_to_fulfill`, fulfillment-stage, fulfilled, or cancelled lifecycle states. The modal gives review actions for the current order's Stock/Inbounds segments but does not silently apply repair writes.
- The stock-scoped Create inbound form uses orderable shortage quantity, not raw pending quantity. Orderable quantity excludes already-linked open inbound demand while still allowing unlinked pending demand to be attached. This keeps the card-level Pending metric as the true shortage while preventing duplicate inbound creation for stock that is already on an inbound shipment.
- The Inventory tab `INBOUNDS` segment lists inbound shipments linked to the opened sale through stock demand rows. Selecting an inbound shows its stock lines, ordered/received demand progress, status controls, and receive-stock action without leaving the sales overview. The linked-inbound shipment query is loaded only when the `Inbounds` segment is active, while inactive segment badges use the already-loaded overview row signal as a lightweight hint. The segment also supports query-backed `inventoryInboundId` selection so single-linked inbound clicks and newly created inbound shipments land directly on the relevant inbound while multi-inbound links still show the full linked list.
- Fulfilled orders with no previous inventory-backed rows now render a read-only informational Inventory tab instead of self-syncing. `inventories.salesInventoryOverview` returns `setupMode=completed_readonly` from order lifecycle plus delivery/stat completion signals, and the shared tab shows compact status metrics, an explanatory alert, and read-only history notes while hiding Create inbound, Mark all available, and manual Sync actions.
- Fulfilled or cancelled orders now resolve read-only inventory operation capabilities even when inventory rows already exist. Existing rows remain inspectable, but Create inbound, manual inventory sync, allocation, mark-available, and tracking configuration are blocked by the shared sales inventory operation policy and reinforced server-side before inbound demand can be created. The Sales Overview Inventory tab also applies that read-only policy to linked inbound history: receive-stock and inbound status controls are disabled with a lock alert, and stock/non-stock row menus show the lock reason while disabling configuration and allocation actions.
- Creating inventory-backed inbound from sales demand updates the affected `SalesOrders.inventoryStatus` values to `ORDERED` in the same transaction as selected demand preparation, inbound shipment creation, and demand linking, keeping the legacy sales inbound badge aligned with inventory-created inbound work. New inbound shipment quantity, status sync, and activity order references are derived only from active unassigned demand rows whose link writes confirm the expected `qtyReceived` baseline, and the final item quantity commit plus zero-link empty item/shipment cleanup are guarded through the parent inbound so concurrent receive, close, cancel, or delete changes are not overwritten. Retrying or racing already-linked demand cannot duplicate, inflate, or mislabel inbound work.
- Once an order has non-cancelled inventory demand linked to an active inbound shipment item, manual order-level inbound status updates through `notes.saveInboundNote` are rejected. Status changes must happen from the inventory inbound surface so the legacy order prompt does not diverge from inventory-owned inbound state; cancelled or deleted shipment links no longer keep the order locked in inventory-owned inbound mode.
- `sales.getSaleOverview` now exposes `inventoryInboundOwnership` for order views. When linked inventory inbound exists, the shared sales overview header, legacy sales overview header, and overview/general inbound status detail rows route operators to the Inventory tab's `Inbounds` segment instead of presenting the order-level prompt as an editable status surface.
- `sales.getOrders` and `sales.inboundIndex` also expose `inventoryInboundOwnership`, including compact linked inbound shipment status summaries. Only active, non-deleted, non-cancelled inbound shipments count as inventory-owned inbound status. The canonical sales orders table now opens the manual inbound status modal only for orders without inventory-owned inbound; inventory-owned rows show the linked inbound shipment status such as `In progress`, `Received`, or a multi-inbound count and open the sales overview Inventory tab's `Inbounds` segment. The inbound-management action and status column use the same rule, routing inventory-owned rows to the Inventory/Inbounds workspace instead of the old preview-plus-manual-update flow. Badge titles distinguish `Inventory inbound status` from `Manual order status`.
- `inventories.salesInventoryInboundStatusBackfillPreview` is a bounded read-only Phase 8 repair/monitoring preview for active inventory-owned inbound orders whose legacy `SalesOrders.inventoryStatus` is null or not `ORDERED`. It returns samples, linked inbound ownership summaries, `sampledMismatchCount`, global `totalMismatchCount`, cursor metadata, and `hasMore` so an operator can review stale legacy prompt rows before running the explicit repair path.
- `bun run inventory:reconciliation-evidence` is the read-only Phase 8 reconciliation evidence command. It runs the sales inventory sync monitor with embedded reconciliation, the inventory reconciliation report, stale-line cleanup in dry-run mode, componentless-line classification, missing-sales scope classification, and shipment/allocation blocker classification, then prints Markdown or JSON for Brain evidence including exact componentless-sales/stale-line repair candidate ids plus missing-sales and shipment/allocation buckets. It also emits a read-only reviewed `repairPlan` with existing guarded repair entrypoint payloads for stale-line cleanup review, explicit componentless-sales re-sync only when re-sync can plausibly regenerate components, materializable active/order missing-sales backfill, mapping-blocked and non-active missing-sales product-scope decision context, zero-component componentless review, shipment/allocation review, and post-repair evidence rerun. The HPT zero-component blocker (`house_package_doors_missing_component_mapping_fields=86`) was resolved by HPT root-product fallback for child door rows, inch-dimension Dyke variant normalization, quantity derivation from line totals, and a reviewed repair apply. Eleven further reviewed materializable active/order backfill batches created `1323` additional inventory sale lines after dry-run review. A 2026-07-23 read-only local refresh no longer reproduces the cleaner July 1 checkpoint: it reports `21745` missing sales, `50` stale lines, `5` componentless lines, `281` reconciliation drifts, `14` skipped comparisons, `hasMore=true`, and next cursor `200`, tracked in `brain/reports/2026-07-01-inventory-reconciliation-evidence.md`. Repairs are stopped by user request; do not continue repair dry-runs or applies unless repairs are explicitly resumed.
- `bun run inventory:reconciliation-repair` is the dry-run-first companion for the Phase 8 evidence command. By default it mutates nothing, reports stale cleanup and componentless sales sync candidates, and excludes missing-sales backfill. Missing-sales backfill is only included with `--include-missing-backfill`; reviewed explicit missing-sales batches can be supplied with `--missing-sales-order-ids <csv>` so active/order candidates do not require a broad cursor sweep. Repair output reports material-applied, no-op, and mapping-blocked counts so an exception-free sync that writes no inventory lines is not mistaken for completed repair. All mutations require both `--apply` and `--confirm-review`.
- Inventory reconciliation derives component fulfillment with the same suggested-allocation semantics as sales inventory sync: `pending_review` stock allocations count as suggested coverage, while only approved/reserved/picked/consumed allocations count as committed allocation. This prevents allocation-review rows from appearing as component-fulfillment drift just because approval is still pending.
- Sales inventory sync stale-component and stale-line cleanup deletes child allocation/demand residue with guarded component or parent identity plus `deletedAt not null`, rather than exact timestamp equality. This preserves the confirmed-write cleanup rule while avoiding MySQL timestamp precision mismatches that can leave required relation children behind and block component deletion.
- Order-update inventory repair now protects non-mutable residue during sales inventory sync. Unreceived, unlinked `pending`/`ordered` inbound demand and `pending_review`/`approved`/`reserved` allocations remain auto-cleanable; shipment-linked or received demand and `picked`/`consumed` allocations are retained for explicit review, and stale component deletion is skipped while protected residue remains. The policy is covered by focused sales-package tests.
- The guarded order-update repair preview/apply panel is shared by the saved-order configurator and the Sales Overview Inventory tab, so reopened orders and alternate save paths expose the same safe-row selection, protected-row review, inbound deep link, and audited apply flow. Authenticated browser proof remains open because the local headless browser did not retain the Quick Login auth cookie.
- `inventories.repairSalesInventoryInboundStatusBackfill` is the explicit Phase 8 repair path for reviewed preview samples. It defaults to dry-run, accepts only explicit sales order ids, revalidates active inventory-owned inbound ownership, stale legacy status, and the exact reviewed legacy `SalesOrders.inventoryStatus` baseline before applying. It updates matched orders to `ORDERED` and writes `SalesHistory` audit rows only for rows confirmed by that guarded write, classifying stale apply attempts as `changed_before_apply`, and returns `status`, classified skipped-id reasons, plus post-run remaining mismatch candidates so apply evidence can show whether any requested rows stayed stale.
- Sales inventory repair and backfill entry points now require positive integer identities. `inventories.syncSalesInventoryOverview`, `inventories.repairSalesInventorySync`, and `inventories.resolveSalesInventoryLegacyStatusSetup` reject non-integer or non-positive `salesOrderId` values at the tRPC boundary, while `sync-sales-inventory-line-items` and `backfill-sales-inventory-line-items` Trigger payload schemas enforce the same rule for single-order and explicit backfill ids. Explicit backfill id batches are capped at 200 and the backfill job reads the full explicit id set instead of truncating targeted repair by `batchSize`; cursor-based backfills keep using bounded batch size. `inventories.cleanupStaleSalesInventoryLineItems` rejects an explicit empty `lineItemIds` list plus non-positive or decimal line ids/limits before stale repair scanning, preventing an intended targeted cleanup from widening into the default repair scan. Backfill cursor and batch size inputs are integer-guarded as well, preventing repair jobs from running against decimal, negative, or empty explicit order-id payloads.
- Active orders with a manual `SalesOrders.inventoryStatus` but no inventory-backed rows return `setupMode=legacy_status_locked`. The Inventory tab no longer auto-syncs those records; it shows a locked review state so an operator must use `Reset status and configure` or `Override and configure` before first-time inventory setup. Reset clears the manual order inbound prompt, while override preserves it, but both actions revalidate the exact reviewed manual status inside the transaction before writing `SalesHistory` or running the same single-sale inventory sync.
- Shared web `SalesMenu.MarkAs` production-complete and fulfilled actions now call `inventories.salesInventoryMarkAsPreflight` before starting the existing `update-sales-control` tasks. Orders without inventory-backed rows continue through the legacy Mark As path; configured orders with required components still awaiting inbound or allocation are blocked behind a shadcn alert dialog that summarizes blocked orders, pending quantity, open inbound quantity, and sample component blockers. Production-complete still uses `inventories.resolveSalesInventoryMarkAsAvailabilityForContinue` only when every blocker is safe to resolve by cancelling unlinked mutable inbound demand; shipment-linked, partially received, or allocation-required blockers stay paused for Inventory tab review. Fulfilled uses the transitional `inventories.resolveSalesInventoryMarkAsAutoForContinue` shortcut for active non-terminal orders: pending stock allocation suggestions are approved, remaining monitored-stock shortages create and link inbound demand/inbound shipments grouped by preferred supplier, inventory default supplier, or fallback `Auto-created inbound`, affected orders are set to `ORDERED` or `AVAILABLE`, and the existing Mark As Fulfilled task continues even if the normal preflight still reports awaiting inbound. Both continue paths write order-scoped `SalesHistory` audit rows; stale preview demand that cannot be changed during apply does not receive availability resolution evidence.
- Mark As inventory preflight and continue routes now share a positive-integer batch guard for `salesOrderIds`, rejecting empty, zero, negative, or decimal order-id batches before production-complete or fulfilled inventory checks can run.
- Legacy and new sales-form save actions no longer ask the old "Is all product in stock?" prompt before saving. Explicit order saves persist the order first, then open a standalone inventory configuration modal that reuses the same sales overview Inventory workbench by saved `salesOrderId`; Save & Close and Save & New wait until that modal closes before continuing navigation. Quotes do not open the inventory configurator.
- `/sales-book/inbounds` is the general Sales Book inbound workspace. It now uses the restarted `tables-2/sales-inbounds` table for the primary shipment queue, with compact rows, sticky Inbound/Actions columns, table-owned scroll, persisted sizing/order/visibility/dividers, search/status filtering, compact analytics, supplier/reference, linked order/customer context, counts, dates, and progress. Selecting a row or Review keeps the existing selected-inbound detail panel below the table with linked orders, stock lines, status update controls, receive-stock, and the same shared timeline-style activity history used by the jobs overview.
- Inbound lifecycle activity is notification-backed through the standard `inventory_inbound_activity` channel. Creating, receiving, extraction events, demand assignment, and status updates write timeline activity through the notification handler itself; new events carry a lifecycle id, and the channel supports recipientless timeline rows when no users are subscribed.
- Creating/assigning inbound demand now rejects invalid ids before package planning: supplier, inbound, demand, and line-item component ids must be positive integers, assignment must include at least one demand id, and selected component quantities must be positive. Assigning demand to existing inbound shipments requires a non-deleted, non-terminal target inbound shipment and rejects fulfilled/cancelled parent sales before assignment. It uses the same active unassigned-demand and confirmed-link rule as create-inbound, and the API mutation runs the package assignment in one transaction so demand links and shipment item quantity updates do not split. Existing inbound item quantities are incremented atomically only by confirmed linked demand quantity from rows whose link writes confirm the expected `qtyReceived` baseline, and the final item quantity commit plus newly-created empty item cleanup are guarded through the parent inbound so concurrent receive, close, cancel, or delete changes are not overwritten. Retrying or concurrently claimed demand cannot inflate shipment item quantities, and a request that links zero rows after guarded revalidation fails instead of recording a no-op assignment.
- Inbound shipment status changes commit through a guarded lifecycle write that requires the shipment to still be non-deleted and at the status observed before the mutation. Cancelling an inventory inbound shipment releases only unreceived active demand rows still linked to that cancelled parent inbound back to unassigned `pending` demand, then recomputes affected line-item component demand state only for rows confirmed released by guarded writes while the component row remains active. Received or partially received demand is not auto-cancelled by the status change.
- Receiving an inventory inbound shipment is delta-based from persisted item good/issue quantities and runs in one API transaction before any received-backorder allocation job is queued. The receive route rejects invalid shipment/item ids and negative receipt quantities before the transaction starts. Closed, cancelled, or deleted shipments are not receivable, and the final shipment status commit is guarded so a concurrent terminal status change cannot be overwritten. New receipt deltas are capped at the planned inbound item quantity while preserving already-persisted received totals, and stock/movement/demand writes only run after a guarded shipment-item receipt update confirms the item row still has the expected good/issue baseline. Existing stock rows are incremented atomically only when the active stock row identity still matches, and stock movement evidence uses the re-read post-increment quantity. Demand receipt updates are also baseline/status guarded; stale skipped demand rows do not consume the new received quantity, and only confirmed demand receipt rows drive active-component recompute evidence. Duplicate receives preserve the original completed timestamp, do not duplicate stock movements or issue rows, do not rewrite item quantity/unit-price fields when there is no new receipt delta, and keep `issue_open` status when open item issues already exist. When a caller supplies an explicit item list, only those shipment items are received; duplicate item ids and stale item ids not on the shipment are rejected. Omitting `items` entirely preserves the legacy receive-all behavior.
- Received-backorder allocation now skips inactive line-item component rows before stock lookup, stock allocation creation, or component recompute. Active partially covered received demand reserves only the uncovered quantity and recomputes through the guarded component fulfillment path.
- Ship-available partial shipment now writes inventory truth before legacy delivery compatibility rows. `shipAvailableSalesInventory` requires positive-integer order/line ids at the tRPC boundary, consumes the planned component allocations through guarded status/quantity writes first, rejects stale or concurrently claimed allocation consumption, and only then creates completed `OrderDelivery` / `OrderItemDelivery` rows. The result keeps sale-line shipped quantity and component-allocation consumed quantity separate but reconciled through the fulfillment plan, preventing delivery rows from claiming stock that was not actually consumed.
- Inventory dispatch release transitions skip already-consumed allocations instead of reviving or releasing them. Assign, pack, release, ship-available, and dispatch fulfillment require positive-integer route ids before planning, then recompute affected component fulfillment through active-row guarded writes after confirmed allocation transitions only.
- Planned guardrail hardening is tracked in `brain/plans/2026-06-29-sales-inventory-inbound-status-guardrails.md`: inventory-created inbound should update `SalesOrders.inventoryStatus`, direct manual inbound-status edits should defer to inventory inbound status once linked inbound exists, legacy/manual inbound status should block first-time Inventory tab setup until reset/override, and Mark As production/fulfilled actions should prompt before proceeding when configured inventory still has unresolved inbound or unavailable stock.

## Follow-Up Review: 2026-06-12

### Requested Capability Status
- Sales-form custom component selection now shows only components explicitly marked custom, keeps archived custom components hidden from new dropdown choices while preserving older sales references, uses unique option identity so duplicate custom names select the correct price row, carries the selected option price into the selected step, normalizes typed/create/select labels to uppercase with alphabetically sorted suggestions plus a compact right-aligned cost field, opens as an anchored inline alert panel above the footer `Custom` button without resizing the footer, persists selected custom metadata, sends `meta.custom` on custom upsert, and pins the selected custom component first in the list with a custom avatar and destructive border treatment. `Proceed` now automatically persists edited custom prices when needed, selects with the submitted price immediately instead of waiting on a refreshed component payload, updates the loaded selection source before saving the step, and reopening the `Custom` form on an already selected custom component hydrates the current title and price from the selected step snapshot.
- 2026-06-18 legacy sales-form hotfix: the custom-component `Proceed` path now uses the submitted mutation price as the immediate selection cost for existing custom components whose cost was edited, calculates sales price from that cost through the active sales profile multiplier, then refreshes the component list afterward. Legacy flat-rate custom totals now use the calculated sales price while retaining the entered value as base/cost. This preserves the prior "pick existing without editing" behavior while preventing a just-updated custom price from being overwritten by stale refreshed component/pricing data during selection.
- Inventory to Dyke create/update: partially in place. `dykeUpdateFromInventory(...)` can update existing Dyke category/product title/image by UID, and `inventories.dykeUpdateFromInventory` exposes it. Missing: first-class create semantics, variant/pricing sync, delete/archive behavior, idempotent job wrapper, drift report, and operator UI.
- Inventory variant price update sync to Dyke: missing. `updateVariantCost(...)` updates inventory variant pricing/history only; it does not write equivalent `DykePricingSystem` rows.
- Order item production assigned updates inventory lines: missing. `update-sales-control` handles `createAssignments` and sends production assignment notifications, but does not update inventory line/component lifecycle fields.
- Order production fulfilled updates inventory equivalent as fulfilled: missing. Production submissions update legacy/control `prodCompleted`; inventory component `fulfilled` currently means stock/inbound fulfillment, not production completion.
- Print from inventory feature: partially in place. `/p/sales-inventory-v2`, `print.salesInventoryV2`, and `packages/sales/src/print/inventory-print-data.ts` render from inventory `LineItem` / `LineItemComponents` through the v2 PDF template. Missing: 100% Dyke-print compatibility proof, organized parity with the Dyke print composer structure, and completion of all packet types.
- Dispatch system inventory mode: partially in place. Existing dispatch and packing flow uses `update-sales-control`, and `shipAvailableSalesInventory(...)` can create partial shipments and consume allocations. Missing: inventory-native assign/pack/fulfill mode that drives `StockAllocation` reserved -> picked -> consumed while writing legacy `OrderDelivery` compatibility records.
- Inventory management pages: partially in place. Existing pages cover dashboard, products, components, categories, imports, inbounds, allocations, backorders, production plan, suppliers, stock operations, review, and shipping configuration. `/inventory/allocations` now uses the restarted `tables-2/inventory-allocations` table with compact rows, sticky Select + Inventory columns, tailored allocation widths, persisted table settings, row-level Approve/Reject, Approve Visible, and selected-row Approve selected while reusing the existing allocation review query and mutations. `/inventory/inbounds` now uses the restarted `tables-2/inventory-inbounds` table for the primary shipment queue with compact rows, sticky Inbound + Actions columns, tailored receiving/order/count/date/progress widths, persisted table settings, and existing selected-inbound review behavior while reusing the inbound shipment query and existing receiving workspace queries/mutations. `/inventory/backorders` now uses the restarted `tables-2/inventory-backorders` table with compact rows, sticky Order + Actions columns, tailored fulfillment/backorder/blocker widths, persisted table settings, existing row overview navigation, and the existing Ship action while reusing the sales backorder queue query and ship-available mutation. `/inventory/partial-shipments` now uses the restarted `tables-2/inventory-partial-shipments` table with compact rows, sticky Order + Actions columns, tailored fulfillment/holdback/blocker widths, persisted table settings, hold/unhold switch behavior, existing row overview navigation, and the existing Ship Available action while reusing the sales partial shipment queue query and mutations. `/inventory/production-plan` now uses the restarted `tables-2/inventory-production-plan` table with compact rows, sticky Component + Actions columns, tailored component/order/readiness/stock/supplier/coverage widths, persisted table settings, existing readiness filters, supplier/status summaries, row overview navigation, and the existing print-production action while reusing the sales production plan query. `/inventory/review` now uses the restarted `tables-2/inventory-kind-review` table with compact rows, sticky Item + Actions columns, tailored product-kind review widths, persisted table settings, table-owned infinite scroll, existing summary cards, and the existing product-kind backfill action while reusing the inventory product-kind review query. `/inventory/[id]` now uses restarted `tables-2/inventory-item-dashboard` sections for variants, stock, movement history, inbound demand, allocations, and related sales/quotes while preserving the existing item dashboard query and top-sales analytics. Existing stock-mode and low-stock alert support are in place. Remaining item-level gaps are deeper shipment/dispatch timeline views and broader operator/browser validation.
- `/inventory/dispatch-mode` now uses the restarted `tables-2/inventory-dispatch-mode` table with compact rows, sticky Order + Actions columns, tailored dispatch/quantity/allocation widths, persisted table settings, whole-line assign/pack/fulfill/release actions, and allocation-specific actions in the row menu while reusing the existing partial-shipment queue plus dispatch transition mutations.

### What Is Missing Now
1. Full inventory-to-Dyke sync for create/update/delete/archive, not only title/image update by UID.
2. Inventory variant price and supplier-variant price propagation back into Dyke pricing rows.
3. Bidirectional Dyke/inventory drift report covering structure, variants, pricing, supplier pricing, stock-mode eligibility, and stale/deleted rows.
4. Inventory lifecycle bridge from `update-sales-control` production assignment events into inventory line projections.
5. Inventory lifecycle bridge from production completion events into inventory line/component production fulfillment projection.
6. Dispatch inventory mode that reserves, picks, packs, fulfills, and consumes inventory allocations while preserving legacy dispatch compatibility.
7. Explicit shipment-record decision: either add `SalesShipment` / `SalesShipmentLine` or document `OrderDelivery` / `OrderItemDelivery` as canonical shipment records.
8. Inventory print parity pass against Dyke print output with fixture/golden coverage for invoice, quote, production, packing, BOM, backorder, and customer remaining-summary packets.
9. Reconciliation monitor/job coverage for inventory-backed sales drift. Dry-run sales reconciliation now exists; browser alerting, print visual parity automation, and production-grade migration gates remain pending.

## Detailed Execution Plan

### Phase A: Contract And Source-Of-Truth Decisions
1. Confirm inventory is the write source for inventory-created/edited items, while Dyke remains supported as a compatibility projection during migration.
2. Define the compatibility mapping:
   - `InventoryCategory.uid` -> `DykeSteps.uid`
   - `Inventory.uid` / `sourceComponentUid` -> `DykeStepProducts.uid`
   - `InventoryVariant` attributes -> Dyke price/variant keys
   - `InventoryVariantPricing` / `SupplierVariant` -> `DykePricingSystem`
3. Decide conflict rules:
   - inventory-origin edits push to Dyke
   - Dyke-origin edits pull to inventory through existing `sync-dyke-step-to-inventory`
   - drift reports surface conflicts instead of silently overwriting when both sides changed
4. Decide shipment records:
   - recommended: keep `OrderDelivery` / `OrderItemDelivery` as legacy-compatible shipment records for now, but add an ADR if they remain canonical
   - only add `SalesShipment` / `SalesShipmentLine` if reporting/audit needs cannot be met by the existing delivery tables
5. Validation:
   - add contract tests for mapping and conflict decisions before write-path changes
   - update Brain/ADR if canonical shipment decision is made

### Phase B: Inventory To Dyke Sync
Detailed implementation handoff: `brain/handoffs/inventory-to-dyke-sync-handoff.md`.

1. Extend `dykeUpdateFromInventory(...)` into a full package service:
   - create missing Dyke step/product rows when inventory rows have no Dyke equivalent
   - update category title/status and product name/image/status
   - map variant attributes to Dyke pricing/variant keys
   - soft-delete/archive Dyke equivalents when inventory is archived, with an escape hatch for legacy-only Dyke records
2. Add a Trigger job, `sync-inventory-to-dyke`, with idempotent payloads:
   - `inventoryCategoryId`
   - `inventoryId`
   - `inventoryVariantId`
   - `source: inventory-form | variant-price | supplier-variant | repair`
3. Queue the job from inventory write paths:
   - `saveInventoryCategoryForm`
   - `saveInventory`
   - `saveVariantForm`
   - `updateVariantCost`
   - `saveSupplierVariantForm` where Dyke supplier pricing should mirror
4. Extend drift reporting:
   - missing Dyke row
   - missing inventory row
   - title/image/status mismatch
   - variant key mismatch
   - cost/sales/supplier price mismatch
   - stale/deleted row mismatch
5. Validation:
   - unit tests for create/update/delete/archive mapping
   - focused integration test with one door/HPT variant set
   - repair job dry-run mode before mutation mode

### Phase C: Inventory Variant Price Sync To Dyke
1. Trace existing price identity:
   - inventory variant `uid`
   - variant attributes
   - inventory `sourceStepUid` / `sourceComponentUid`
   - supplier UID and `SupplierVariant`
   - current Dyke `DykePricingSystem` rows
2. Build `syncInventoryVariantPriceToDyke(...)`:
   - update existing Dyke price rows when a stable mapping exists
   - create missing Dyke price rows only when mapping is unambiguous
   - record skipped rows with reason when mapping is ambiguous
3. Wire it from:
   - `updateVariantCost`
   - `saveVariantForm`
   - `saveSupplierVariantForm`
4. Add UI feedback in the inventory variant pricing form:
   - synced
   - skipped
   - failed
   - drift detected
5. Validation:
   - price sync tests for generic variant price
   - supplier-specific variant price
   - delete/clear price
   - ambiguous mapping skip

### Phase D: Production Assignment And Fulfillment Inventory Bridge
1. Add a package-level bridge service, for example `applySalesControlInventoryLifecycle(...)`, called from `update-sales-control` after successful command execution.
2. On `createAssignments`:
   - ensure `syncSalesInventoryLineItems` has run for the sale
   - map current order item/control UID to `LineItem.salesItemId`
   - derive assigned production quantity per inventory line/component
   - expose assigned production qty in the inventory fulfillment/production projection
3. On `submitAll` / `updateSubmissions` / production completion:
   - map submitted production qty back to inventory lines
   - mark line production readiness/fulfillment in projection without confusing it with physical stock fulfillment
   - if durable schema is needed, add explicit production fields rather than overloading `LineItemComponents.status`
4. Recommended modeling:
   - keep `LineItemComponents.status` for stock/inbound state
   - derive or add separate production fields for `productionAssignedQty`, `productionFulfilledQty`, and `productionStatus`
5. Validation:
   - assignment creates/updates inventory projection without duplicating sales lines
   - partial production completion keeps remaining qty open
   - full production completion marks inventory production equivalent fulfilled
   - legacy sales production views remain unchanged

### Phase E: Dispatch System Inventory Mode
1. Add an inventory-mode dispatch plan backed by `SalesFulfillmentPlan`:
   - assign: reserve/approve available allocations for the dispatch batch
   - pack: move selected allocations to `picked`
   - fulfill: move picked allocations to `consumed`
   - release/cancel: move held allocations to `released`
2. Keep legacy compatibility writes:
   - continue creating/updating `OrderDelivery`
   - continue creating/updating `OrderItemDelivery`
   - keep `update-sales-control` stats in sync
3. Add UI mode gates:
   - existing dispatch mode remains legacy/control driven
   - inventory mode only appears when all target lines have inventory-backed projections
   - partial shipment and hold-until-complete become explicit options
4. Add reconciliation:
   - `OrderItemDelivery` packed/completed qty vs `StockAllocation.picked/consumed`
   - `SalesFulfillmentPlan.shippedQty` vs completed delivery qty
5. Validation:
   - assign-only does not reduce physical stock
   - pack marks allocations picked
   - fulfill consumes allocations and updates shipped/remaining/backorder projections
   - cancel/release restores availability

### Phase F: Inventory Print Parity
1. Reorganize inventory print code to mirror the Dyke/v2 print composer layout:
   - query
   - page builder
   - mode-specific sections
   - line/component row composers
   - parity helpers
2. Complete packet modes:
   - BOM
   - pick list
   - packing list
   - production packet
   - backorder packet
   - customer remaining quantity summary
3. Build parity fixtures:
   - simple door order
   - HPT package
   - shelf line
   - moulding/service mixed order
   - partial shipment/backorder
   - inbound-blocked line
4. Golden checks:
   - line order
   - quantities
   - descriptions
   - variant/supplier labels
   - prices hidden/shown per mode
   - dealer branding behavior
5. Cutover:
   - keep legacy Dyke print available as fallback until fixture parity passes
   - switch production/backorder/packing inventory surfaces to inventory print by default first
   - later switch general sales print once compatibility is proven

### Phase G: Inventory Management Dashboard Expansion
1. Add an item dashboard route/sheet:
   - `/inventory/[id]` or a full-screen mode from the current product sheet
   - wire the existing eye action to open it
2. Add item dashboard query:
   - product summary
   - variants
   - stock by variant/location/supplier
   - stock movements
   - low-stock thresholds
   - inbound demand
   - allocations
   - related sales/orders
   - related quotes
   - top-sales metrics
3. Add variants workspace instead of redirecting `/inventory/variants`:
   - searchable variant table
   - filters for stock mode, low stock, supplier, status, category, item
   - direct price/stock/supplier editing entry points
4. Add analytics:
   - top inventory items by ordered qty
   - top inventory items by shipped qty
   - top inventory items by revenue/cost value where pricing is reliable
   - dead/slow-moving stock
5. Validation:
   - item dashboard loads without opening edit form
   - related sales/quotes use inventory `LineItem` references first and legacy/Dyke mapping only as fallback
   - top-sales numbers reconcile with sales inventory projections

### Phase H: Automation, Reconciliation, And Migration Gates
1. Add reconciliation jobs:
   - inventory -> Dyke drift
   - Dyke -> inventory drift
   - sales-control -> inventory lifecycle drift
   - stock/allocation drift
   - print projection parity drift
2. Add monitor widgets/run status:
   - last run
   - synced
   - skipped
   - failed
   - next cursor
   - repair action
3. Add migration gates:
   - inventory print default gate
   - inventory dispatch mode gate
   - production readiness gate
   - inventory overview/reporting source gate
4. Validation:
   - dry-run reconciliation before mutating repair
   - browser checks for inventory dashboard, variants workspace, print, dispatch mode, production assignment, and production completion
   - focused unit/integration tests for every bridge service

## Phase Status

## Cutover Gap Audit: 2026-06-15

Current cutover gap matrix: `brain/reports/2026-06-15-inventory-cutover-gap-audit.md`.

Summary: foundations exist for sales inventory sync, inventory-to-Dyke job plumbing, variant/supplier price sync back to Dyke, sales-control production lifecycle projection, production readiness gating, inventory dispatch mode commands, canonical shipment-record decision, fulfillment/backorder projections, production plan UI, inbound receiving, stock operations, inventory operations dashboard, inventory print route, and sync monitoring. Remaining cutover work is now primarily browser/manual validation plus final migration gates.

### Phase 1: Sync Foundation
Status: Mostly done.

- [x] Active Dyke custom component create/update paths now go through `@gnd/inventory` services.
- [x] Dyke component pricing updates route through inventory-domain pricing services.
- [x] Legacy and new sales forms share a custom-component browse/create flow backed by `inventories.upsertDykeCustomStepComponent`; existing step-scoped custom components can be selected to fill cost price, edited prices persist automatically on `Proceed` when the entered price differs from the saved option, new custom components are refreshed and selected after proceed, and selected custom components remain visible even while unselected custom components stay hidden by default. Existing component metadata is preserved during price/name updates. Custom components can be hidden from future selection through `inventories.archiveDykeCustomStepComponent`, which stores `meta.deletedAt` on the Dyke component instead of physically setting the model `deletedAt` column so older sales/print references keep resolving.
- [x] Targeted Dyke step sync is queued through `sync-dyke-step-to-inventory`.
- [x] Sales inventory sync has one shared job entrypoint, `sync-sales-inventory-line-items`.
- [x] Shared sync queue preserves source labels for `new-form`, `old-form`, `copy-sales`, `manual`, and `repair`.
- [x] New sales form saves queue sales inventory sync.
- [x] Legacy sales form saves queue sales inventory sync.
- [x] Save-path guard coverage verifies new-form draft/final saves and successful legacy saves keep queueing the shared inventory sync job.
- [x] Copy sales queues the same inventory sync job with `source: "copy-sales"`.
- [x] Repair flows queue the same inventory sync job with `source: "repair"`.
- [x] Sales inventory sync removes stale components from still-active lines only through exact pre-read component identity guards, matching component id, parent line id, sub-component id, and inventory variant id before child allocation/demand cleanup or component removal runs.
- [x] Sales inventory sync removes stale inventory lines for removed sales items only after a guarded soft-delete confirms the stale line is still tied to the same sale and stale sales item id; allocation, inbound-demand, and component cleanup runs only under those confirmed-cleaned lines, and `deletedCount` reports the confirmed line writes.
- [x] Received-backorder allocation retry inputs are integer-safe at the shared Trigger/API schema boundary: optional sales order, line-item component, and inventory variant filters must be positive integers, and retry scan limits must be integer-bounded before received demand is queried.
- [x] Inventory variant and supplier variant price changes sync back to `DykePricingSystem` through `sync-inventory-to-dyke` with preserved-key guardrails for supplier pricing.
- [x] Structural Dyke/inventory drift reporting exists through `dykeInventoryDriftReport`.
- [x] Sales inventory sync monitor reports coverage, synced count, skipped count, failed-risk count, stale inventory sale-line count, stale allocation/demand residue counts, bounded review/stale samples, and next backfill cursor.
- [x] Sales inventory sync monitor can optionally include a bounded dry-run inventory reconciliation summary, adding shipment/allocation, component-fulfillment, and missing-component drift into the same review-risk score when callers request the deeper Phase 5 cutover gate.
- [x] Sales inventory sync monitor keeps the cutover status in `needs_review` when optional reconciliation is clean but partial, preventing a bounded cursor run from being mistaken for full sync proof.
- [x] Sales inventory sync monitor also treats skipped reconciliation comparisons as `needs_review` and includes them in review-risk count through `skippedComparisonCount`, so rows that could not compare shipment/allocation or component-fulfillment state cannot pass the cutover gate just because drift is zero.
- [x] Raw inventory reconciliation reports and queued reconciliation Trigger outputs expose shared `synced` / `needs_review` / `partial` status plus total `skippedComparisonCount`, so one-off reconciliation runs and monitor summaries use the same status and skipped-proof evidence.
- [x] Raw inventory reconciliation reports and queued reconciliation Trigger outputs now share integer-safe dry-run inputs: optional `salesOrderId` is positive-integer only, `cursorId` is non-negative-integer only, and `limit` / `sampleLimit` are integer-bounded. The sales inventory sync monitor also integer-guards its reconciliation sampling inputs before embedding reconciliation evidence into the review-risk gate.
- [x] Inventory import control center requests that bounded reconciliation summary and surfaces it as both a monitor stat and a system check, so operators can see whether the visible sales sync coverage is clean, partial, or carrying reconciliation drift.
- [x] Inventory import control center's Review Risk stat now names componentless sales, stale inventory lines, reconciliation drift, and skipped reconciliation comparisons, matching the package-owned `failedRiskCount` composition.
- [x] Inventory import control center also promotes stale allocation/demand residue into the system checks list, so active `StockAllocation` and `InboundDemand` rows attached to stale inventory sale lines are visible as a cleanup gate instead of only appearing in the Review Risk stat subtitle.
- [x] Inventory import control center can queue the existing `run-inventory-reconciliation-report` Trigger task from the sales sync monitor section, starting from the current reconciliation cursor when the bounded summary is partial.
- [x] Inventory import control center shows reconciliation coverage domain cards when the bounded summary is available, separating sales sync, shipment/allocation, and component-fulfillment checked, drift, skipped, severity, and sample totals so clean-but-partial or skipped comparisons are visible.
- [x] Stale inventory sale-line cleanup exists as a dry-run-default inventory route and a bounded visible-samples action in the import control center; the monitor now shows how many allocation and inbound demand rows are attached to stale sale lines before cleanup runs. Apply cleanup now soft-deletes only line items still confirmed stale, then releases allocations, cancels inbound demand, and removes components only under those confirmed-cleaned parent rows so stale pre-read lines restored before apply do not lose child inventory data.
- [x] The import control center now exposes protected source-aware stale-import review. The inventoryImportSourceReview endpoint classifies imported rows outside the active settings scope or with incomplete/orphaned labels as standard archive candidates, custom review, or operationally protected; positive stock, active sales references, allocations, inbound demand, and storefront publication prevent archive recommendations. The surface links each candidate to the inventory item and offers a confirmation-gated, dry-run-by-default archive action that revalidates the bounded standard candidates, soft-archives confirmed inventory rows, and queues the existing inventory-to-Dyke projection sync; custom/protected/stale rows remain skipped evidence.
- [x] Every source-review row also has an explicit retain/move control. Operators choose an active same-kind target category plus standard operational or custom-exception visibility. Apply exact-baseline guards the reviewed source/category state, clears unproven legacy source UIDs instead of fabricating a new import mapping, commits actor-attributed `Event` before/after evidence with the move, and queues inventory-to-Dyke projection after commit. A progressive batch control accepts up to 12 visible same-kind rows while the server contract remains capped at 25 unique inputs; each row keeps an independent guarded transaction and ordered result. Each projection dispatch persists a bounded `TaskRunDiagnostic`; failed queue attempts remain visible in the control center and a Super Admin can claim/retry each failure exactly once, producing a new actor/run-linked diagnostic without reopening the committed move.
- [x] Retained-item projection history reports bounded queued, failed, succeeded, and retryable counts. The import control center promotes retryable projection attempts into System Checks and summary badges, so a failed post-commit dispatch is visible without opening the attempt rows.
- [x] Stale imported category cleanup is a separate protected, dry-run-first gate. A category becomes ready only after every live child inventory row has been dispositioned; blocked categories report remaining standard/custom counts. Apply re-resolves the active settings route graph and the no-live-child relation in the transaction, soft-archives only confirmed empty stale categories, queues category-level Dyke projection, and removes archived categories from later stale-scope counts.
- [x] Full inventory update, system-check, and refresh dispatch persists authenticated operator, scope, strategy, compare/reset intent, and Trigger run identity through bounded `TaskRunDiagnostic` history. The import control center shows the latest eight runs, polls while a run is active, and finalizes terminal status from the monitored Trigger run without allowing diagnostic-write failure to hide a successfully queued import.
- [x] Backfill job returns processed, succeeded, failed, next cursor, and has-more state.
- [x] Generic and supplier variant price drift reporting now follows the inventory-to-Dyke pricing mapping rules.
- [ ] Remaining dormant Dyke admin/use-case helpers still need migration behind the inventory domain.
- [x] Delete/archive event behavior for Dyke definitions now follows an explicit source-review policy for stale imported inventory: only reviewed, unused, standard rows may be soft-archived, and the existing inventory-to-Dyke sync projects the archive to Dyke definitions. Custom and operationally referenced rows require explicit follow-up.

### Phase 2: Inventory Sale Projection
Status: Done for core projection.

- [x] Sale lines are projected as inventory-backed fulfillment lines.
- [x] Components are treated as the BOM.
- [x] Projection calculates `orderedQty`.
- [x] Projection calculates `allocatedQty`.
- [x] Projection calculates `pickedQty`.
- [x] Projection calculates `shippedQty`.
- [x] Projection calculates `remainingQty`.
- [x] Projection calculates `backorderedQty`.
- [x] Projection calculates `inboundQty`.
- [x] Projection calculates `receivedQty`.
- [x] Projection supports sale states: `not_fulfilled`, `partially_fulfilled`, `awaiting_inbound`, `backordered`, `ready_to_ship_remaining`, and `fulfilled`.

### Phase 3: Allocation
Status: Mostly done.

- [x] Sales inventory sync creates stock allocation suggestions from available stock.
- [x] Unavailable monitored stock creates `InboundDemand`.
- [x] Allocation states exist: `pending_review`, `approved`, `reserved`, `picked`, `consumed`, `released`, and `cancelled`.
- [x] Pending allocations are not treated as committed stock until approved.
- [x] Allocation review queue exists at `/inventory/allocations`.
- [x] Allocation review queue renders through `components/tables-2/inventory-allocations/*` with compact Sales Orders-style table-owned scroll, DnD, resize, sticky columns, persisted settings, row actions, and selected-row bulk approval.
- [x] Bulk allocation approval exists through `approveBulkStockAllocation`.
- [x] Sales inventory health widget is backed by `salesInventoryOverview`.
- [x] Allocation review approve/reject/bulk-approve mutations are retry-safe for already transitioned rows: route schemas reject invalid allocation ids and non-positive approval override quantities before planning, only active `pending_review` allocations mutate, retries return skipped evidence instead of reviving or recounting rows, and the allocation review UI toast copy surfaces skipped rows to operators. The API allocation review mutations also resolve parent-sale lifecycle before writes and reject fulfilled/cancelled parent sales, so terminal orders remain read-only before stock allocation updates or component recomputes run.
- [x] Received-inbound backorder release has focused package proof that retries do not duplicate allocations: already covered received demand is skipped with `alreadyCoveredDemandCount`, inactive component rows are skipped before allocation creation, and partially covered demand reserves only the remaining uncovered quantity before recomputing component fulfillment.
- [ ] Browser validation and operator flow proof are still pending for the allocation review screen.
- [ ] Broader repeated allocation guardrails still need browser/operator proof across allocation review and dispatch-mode reruns.

### Phase 4: Production Planning
Status: Projection, board, lifecycle bridge, and readiness enforcement done; operator validation pending.

- [x] Production plan groups by sale.
- [x] Production plan groups by sales item.
- [x] Production plan groups by component.
- [x] Production plan groups by supplier.
- [x] Production plan groups by stock status.
- [x] Component readiness supports `ready_for_production` and `fulfilled`.
- [x] Line readiness is derived from required component readiness.
- [x] Production shortage / blocker surface exists at `/inventory/production-plan`.
- [x] Sales-control production assignment/submission actions update `LineItem.meta.production` with assigned, fulfilled, remaining, and production status projection.
- [x] Canonical `update-sales-control` production mutations use the package-owned `shouldSyncInventoryProductionLifecycleForSalesControl` decision to refresh inventory production lifecycle for assignment, submit-all, submission update/delete, assignment delete, and mark-complete actions while leaving dispatch-only mutations out of production lifecycle refresh. Production lifecycle projection writes use an active-row guarded line-item update and count only confirmed updated rows.
- [x] Existing production assignment/start actions are hard-gated by inventory readiness for inventory-backed required components.
- [ ] Sale-level production-ready transitions need final wiring into the broader sales production workflow.
- [ ] Browser/operator validation for blocked and allowed production assignment remains pending.

### Phase 5: Await Inbound
Status: Mostly done; receive retry guardrails added.

- [x] Unavailable component quantity remains in `InboundDemand`.
- [x] Lines surface as `awaiting_inbound` when required components have open inbound demand.
- [x] Inbound statuses exist: `pending`, `ordered`, `partially_received`, `received`, and `cancelled`.
- [x] Production/backorder projections expose blocked, partially received, and ready-after-receive style states.
- [x] Receiving workspace exists at `/inventory/inbounds`.
- [x] Re-running receive uses persisted inbound item good/issue totals and applies only newly received deltas.
- [x] Manual inbound issue report/resolve routes reject invalid ids and unsafe issue quantities before issue rows are created or updated: inbound issue ids and shipment-item ids must be positive integers, reported issue quantity must be positive, and resolved quantity cannot be negative.
- [ ] Purchasing/order lifecycle depth beyond inbound shipment creation is still pending.
- [ ] Replacement inbound behavior for damaged/missing/incorrect received items is still undecided.

### Phase 6: Backorder and Partial Shipment
Status: Core flow done; shipment source of truth decided; hold-until-complete command guard and workspace added.

- [x] Available quantity can be allocated, picked/packed, shipped, and consumed without cloning the sale.
- [x] Remaining quantity stays on the original sale line projection.
- [x] Backordered quantity is computed at fulfillment/component level.
- [x] Backorder demand can create/update `InboundDemand`.
- [x] Received inbound stock can auto-allocate to backordered components through `allocate-received-inbound-to-backorders`.
- [x] Sale/line can move to `ready_to_ship_remaining` when remaining stock becomes available.
- [x] Backorder queue exists at `/inventory/backorders`.
- [x] `OrderDelivery` / `OrderItemDelivery` are the canonical shipment records for partial shipment and inventory dispatch mode.
- [x] Shipment planning uses required components as the gating set; optional component shortages do not block required-component shipment.
- [x] Line-level `holdUntilComplete` metadata prevents accidental partial shipment until all remaining quantity is available.
- [x] Dedicated partial shipment workspace exists at `/inventory/partial-shipments`.
- [ ] Final shipment completion needs reconciliation between completed `OrderItemDelivery` quantities and consumed `StockAllocation` quantities.

### Phase 7: Fulfillment
Status: Command/API foundation mostly done; dedicated UI validation pending.

- [x] Inventory moves through allocation statuses including `reserved`, `picked`, and `consumed`.
- [x] Partial shipment command exists as `shipAvailableSalesInventory`.
- [x] Inventory dispatch mode supports assign, pack, fulfill, and release allocation transitions, with status-guarded assign/pack/release updates that report concurrently claimed rows as skipped instead of overwriting them; release skips already-consumed allocations and recomputes only confirmed touched components.
- [x] Inventory dispatch fulfillment consumes only `picked` allocations, with status-and-quantity-guarded consumption so concurrent claims or stale partial split quantities cannot be counted as shipped.
- [x] Inventory dispatch fulfillment writes legacy `OrderDelivery` / `OrderItemDelivery` compatibility rows only after picked allocation consumption succeeds, and the dispatch-mode UI explains concurrent-claim failures as refresh/retry work instead of a generic error.
- [x] Dedicated inventory dispatch-mode workspace exists at `/inventory/dispatch-mode` for assign, pack, fulfill, and release actions.
- [x] Backorder queue includes a "Ship Available" action.
- [x] Line/component status is recomputed after fulfillment movement.
- [x] Remaining quantity summary exists in backorder queue projections.
- [x] Auto-release after inbound receiving is queued from receiving workflow.
- [x] "Hold until complete" option is implemented at inventory line level.
- [x] Dedicated partial shipment screen beyond the backorder queue is implemented.
- [x] Inventory dispatch-mode browser route smoke passed at `/inventory/dispatch-mode`.
- [ ] Inventory dispatch assign/pack/fulfill/release action proof still needs an approved allocation fixture with available stock.

### Phase 8: Stock Operations
Status: Mostly done.

- [x] Receiving posts good stock into `InventoryStock`.
- [x] Receiving records issue quantity separately from good quantity.
- [x] Manual stock adjustments exist through `adjustInventoryStock`.
- [x] Stock movement/audit rows are written for receiving and adjustment flows.
- [x] Repeat receive does not duplicate stock or stock movements when the same received totals are submitted again.
- [x] `InventoryStock.qty` remains the physical/current stock source.
- [x] Audit-log coverage is explicitly verified for stock in, stock out, return, correction, consume, and release through `stockAuditVerificationReport`.
- [x] `/inventory/stocks` renders the audit verification matrix through `tables-2/inventory-stock-audit` with compact sticky Category columns and refreshes audit counts after manual stock adjustments.
- [x] Operations dashboard summarizes tracked/untracked stock, low-stock, out-of-stock, open inbound, pending allocations, backordered lines, and production blockers from inventory-backed data.
- [ ] Operator-facing reason-code taxonomy still needs review and polish.

### Phase 9: Print and UI
Status: Print data/golden packet coverage mostly done; visual/browser proof pending.

- [x] Inventory-backed print data exists for sales print modes.
- [x] Inventory print uses the exact current v2 print template page input shape.
- [x] Inventory print packet data/golden tests cover production BOM, pick list, packing list, backorder summary, and customer remaining summary.
- [x] Backorder queue UI exists.
- [x] Production shortage / production plan UI exists.
- [x] Inbound receiving queue exists.
- [x] Inbound receiving now shows order-prompt vs line-demand reconciliation, and `ORDERED` / `PENDING ORDER` prompts update existing open `InboundDemand` row statuses.
- [x] Allocation review UI exists.
- [x] Sale inventory health widget exists.
- [x] Dedicated partial shipment screen exists at `/inventory/partial-shipments`.
- [x] Item-level inventory dashboard exists at `/inventory/[id]` with variants, stock, movement history, inbound demand, allocations, and related sales/quotes backed by inventory `LineItem` references.
- [x] Variants workspace exists at `/inventory/variants` with search/filter controls, summary cards, and a restarted compact `tables-2/inventory-variants` list for price, stock, supplier, status, low-stock, dashboard, edit, and stock-operation actions.
- [x] Top-sales analytics exist for inventory items and variants, ranking ordered quantity from inventory-backed `LineItem` rows and shipped quantity from consumed `StockAllocation` rows while de-duplicating sale counts across ordered lines and consumed allocations.
- [x] Inventory operations dashboard exists on `/inventory` with stock-health cards, alert rows, and drilldowns to item dashboards, variants, stock operations, inbound, allocations, backorders, and production plan.
- [x] Inventory dispatch-mode UI exists at `/inventory/dispatch-mode`.
- [x] Packing-list warehouse UI exists at `/sales/packing-list` with current/completed/admin-cancelled tabs, compact restarted `tables-2/packing-list` rows, sticky Order/Actions columns, tailored packing-list widths, packing-slip open behavior, and existing admin status actions.
- [x] Inventory print route browser smoke passed after wrapping the PDF viewer in a client-only dynamic component; `/p/sales-inventory-v2?ids=08499LM&mode=production&preview=false` renders a blob-backed PDF iframe.
- [x] Desktop browser mutation proof for the local validation matrix passed on `1440x900`: allocation approve/reject/bulk, dispatch assign/pack/fulfill/release, inbound receive, received-backorder release, partial ship, held-line skip, stock adjustment, and low-stock dashboard signal. Evidence lives in `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`.
- [x] Inventory print route/mode render proof passed on `1440x900` for production, order-packing, packing-slip, invoice, quote, backorder summary, and customer remaining summary packets, with blob-backed PDF iframes plus print-data section/row evidence.
- [x] Mapped Dyke legacy-vs-inventory print route parity passed for order `08077PC` / sale `21379` on invoice, production, packing-slip, and order-packing modes. Future hardening can add automated pixel/golden PDF diffing, but the desktop browser cutover proof is complete.

### Phase 10: Automation and Hardening
Status: Partially done; dry-run reconciliation and receive/allocation retry guardrails exist.

- [x] Sales inventory sync is automated through Trigger jobs.
- [x] Allocation shortage creates inbound demand.
- [x] Receiving can queue backorder allocation release.
- [x] Legacy sales can continue while inventory-backed flows mature.
- [x] Dry-run sales inventory reconciliation report exists for missing component rows, completed shipment vs consumed allocation drift, and component allocation/inbound fulfillment status drift.
- [x] `run-inventory-reconciliation-report` Trigger job supports bounded cursor runs, samples, severity, skipped counts, skipped reasons, and no mutation by default.
- [x] Existing Dyke/inventory structural and pricing drift remains exposed through `dykeInventoryDriftReport`.
- [x] Backorder auto-release reports skipped and already-covered demands on retries instead of duplicating allocations.
- [ ] Drift repair and migration gates need production-grade runbooks and alerts.
- [ ] Print projection parity automation beyond golden data tests still needs mode-by-mode browser/PDF visual validation before broad cutover.
- [ ] Cutover of overview, print, production, deployment, fulfillment, and reporting to inventory projections remains pending.

## Pending Work
1. Browser-validate the save-time inbound prompt through `/inventory/inbounds`, including `ORDERED`, `PENDING ORDER`, and `AVAILABLE` mismatch scenarios against real sales fixtures.
2. Migrate remaining dormant Dyke admin/use-case helpers into `@gnd/inventory`.
3. Extend the source-review archive policy to any future non-imported/manual
   Dyke definitions only after an explicit ownership decision.
4. Decide whether inbound issue replacements create linked follow-up inbounds automatically.
5. Add drift alerts, automated pixel/golden PDF diffing, and production-grade reconciliation runbooks.
6. Create migration gates and runbooks for switching overview, print, production, deployment, fulfillment, and reporting to inventory projections.
7. Item-level dashboard, related sales/quotes sections, variants workspace, top-sales analytics, and operations dashboard now exist; remaining UI work is validation plus later analytics polish.

## 2026-06-22 Sales Overview Inventory Tab Start
- `inventories.salesInventoryOverview` now returns grouped sales-overview inventory rows in addition to the existing summary and line-item payload.
- Groups are keyed to invoice items and use the invoice item description when present, falling back to line descriptions or `Invoice Item N`.
- Rows expose component name, step/category name, required quantity, physical in-stock quantity summed from active `InventoryStock` rows, allocated quantity, pending quantity, open inbound quantity, cost, status, tracking policy, inventory ids, variant SKU, and action eligibility.
- The shared sales overview system and the legacy sales overview sheet both register an order-only `Inventory` tab with a `New` badge.
- The first UI slice is read-oriented: stock links open the inventory item dashboard, while allocation, category-policy, and inbound actions are visible as disabled affordances pending the dedicated approved mutation plans.
- If the Inventory tab opens on an order with no inventory-backed rows yet, the tab now shows a synchronizing state, runs the single-order sales inventory sync, and refreshes the overview automatically. If sync still cannot produce rows, the tab leaves a manual `Sync with inventory` retry action.
- Follow-up repair: sales inventory sync now uses valid stock-allocation statuses when reconciling suggested allocation rows, aggregates repeated HPT door rows for the same Dyke product, multiplies selected Dyke form-step components by total door quantity, uses HPT/product quantity for moulding rows without door children, and repairs placeholder inventory names when a later Dyke value is more descriptive.
- Legacy sales overview cold reload now renders the Inventory tab from the live sale overview context so the numeric sale id is available after `getSaleOverview` finishes.
- The Inventory tab now renders a merged component table from top-level overview `rows[]` instead of invoice-item sections. Matching components are merged across the order, demand quantities are summed, and physical stock is shown once for the inventory item/variant.
- The merged component workbench now defaults to `Needs` and uses `Needs | Inbounds | Not Needed` segmented navigation. `Needs` means the row is tracked and neither the step/category nor actual inventory item is marked `component`; `Not Needed` means tracking is off or the product kind is not inventory; `Inbounds` is reserved for order-linked inbound shipment/demand history. Component/item names remain uppercase for scanability.
- The component list is intentionally unframed under the segmented controls: no enclosing card/header around the row list, just compact shadcn item rows with badge-pill metrics.
- The On hand metric is quantity-only, and the Action column exposes an `Edit` dropdown for row configuration. The dropdown now shows the row category name and only `Needed` / `Not needed`, replacing the previous separate category-kind, component-kind, and stock-tracking controls.
- Needed actions are scoped to `Needs` rows only. `Create inbound` appears only inside the `Needs` view, opens an inline smart form with supplier combobox allow-create, shadcn calendar date picker, PO/reference, checked shortage rows, and per-row qty steppers with plus/minus controls. The submitted qty controls how much pending demand is prepared and linked to the inbound; smaller requested quantities split existing unlinked pending demand rows so the unselected remainder stays pending. Bulk `Allocate available stocks` was removed from the overview; allocation now appears only in a row action menu for rows with pending stock allocation ids and approves those ids through the existing stock-allocation approval flow.
- Sales inventory sync ensures missing component categories, inventory items, and variants are created by source UID during sync. Component rows now snapshot inventory variant pricing into `LinePricing`, preserving unit and total cost/sales values from inventory variant pricing or preferred supplier-variant pricing when available.
- Sales inventory sync now resolves component variant UID from selected Dyke pricing/dependency metadata before falling back to the component UID. It reads selected component `dependenciesUid`, dependency metadata, and `priceStepDeps` pricing keys, normalizes Dyke door-size keys such as `2-4 x 8-0` to the imported variant UID shape `w2_4-h8_0`, and keeps same-component rows separate when their dependency variants differ.
- Component pricing snapshots now merge inventory pricing with sales-form fallback pricing. Inventory variant or supplier pricing remains the preferred cost/sales source; missing fields fall back to selected component `basePrice` / `price`, HPT door `unitPrice` / `lineTotal`, saved shelf row `basePrice` / `salesPrice` / `unitPrice`, and no-door moulding HPT `meta.priceTags.moulding` cost/sales values. When only one side of cost/sales is available, sync reads the order customer profile coefficient and completes the missing side where safe: cost -> sales uses `cost / coefficient`, and sales -> cost uses `sales * coefficient` only when a valid coefficient exists. The sales overview Inventory table displays both Cost and Sales columns.
- `LinePricing` price fields are decimal-capable so these snapshots preserve cents instead of truncating to whole dollars; projection money totals round to two decimals before returning to the UI.
- Sales overview inventory rows now expose `variantUid`; the Inventory tab shows the raw SKU/variant value only when the current visible table has multiple priced rows with the same component name and different variants. Single-variant rows and zero-price/no-price rows hide the variant subtitle to reduce noise.
- Sales overview Inventory/Inbounds now uses the guarded availability resolver for `Mark all available`, with capability/pending-quantity gating and a review redirect when shipment-linked work cannot be changed safely. The Inbounds badge reads from a lightweight linked-shipment count before the detail list opens, and empty inbound states expose Check stock/Create inbound actions for remaining tracked demand. Linked shipments render as collapsible rows with status, receiving, item, demand, and read-only lock details.
- Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-inventory-overview.test.ts apps/www/src/hooks/sales-overview-open-params.test.ts` passed with 22 tests and 40 assertions. In-app browser validation passed on `/sales-book/orders?sales-overview-id=08578AD&sales-type=order&mode=sales&salesTab=inventory`, confirming the old sheet shows Inventory `New`, renders Dyke production detail values as inventory components, and shows a single merged inventory component table after cold reload.
- Follow-up validation for dependency-variant mapping: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-inventory-overview.test.ts` passed with 22 tests and 41 assertions, and direct module import passed.
- Follow-up validation for Cost/Sales display: reran sync for order `08578AD` / sales id `23301`; 5 line items updated, 0 warnings, and every merged row had at least cost or sales price after fallback pricing. Focused tests passed with 22 tests and 43 assertions.
- 2026-06-23 follow-up: moulding/shelf fallback pricing now covers saved HPT moulding price tags and shelf row metadata/prices. Rerunning sync for order `08568PC` populated moulding `LinePricing` snapshots for WM886 (`unitCostPrice 1.85`, `unitSalesPrice 2.46`), 55fsQ/SHIMS (`unitCostPrice 4.27` derived from sales and profile coefficient, `unitSalesPrice 5.69`), Flat Board 1x4 (`8.5` / `11.3`), and Flat Board 1x6 (`10.4` / `13.83`). Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 19 tests and 43 assertions; scoped `git diff --check` passed for the sync file and focused test.

## 2026-06-16 Produceable Semantics Update
- Inventory sales-line sync now normalizes Dyke production eligibility onto `LineItem.meta.production.produceable` and `LineItem.meta.inventorySync.productionProduceable`.
- Produceable service rows are production eligible; non-produceable service rows and moulding rows are production ineligible.
- Explicit `produceable: false` metadata overrides legacy/Dyke production truthiness when deriving inventory production eligibility.
- Persisted mixed grouped metadata rows are covered at package level: HPT metadata remains produceable and still extracts HPT/door candidates, service metadata stays produceable when `dykeProduction` is true, and moulding metadata remains non-produceable even when legacy Dyke production flags are truthy.
- Production lifecycle updates preserve the existing production eligibility flag while refreshing assigned/fulfilled/remaining/status values.
- Production plan/readiness projections ignore inventory-backed lines marked non-produceable, while leaving their inventory components available for fulfillment/backorder analytics.
- Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-fulfillment-plan.test.ts` passed with 29 tests and 74 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 12 tests and 25 assertions after adding explicit non-produceable metadata precedence and persisted mixed grouped metadata coverage; `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 22 tests and 63 assertions after adding non-produceable fulfillment queue coverage; `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 5 tests and 10 assertions after adding production lifecycle metadata preservation coverage.

## 2026-06-16 Legacy Production Bypass Update
- Direct legacy production assignment/submission/delete/mark-complete paths now call `syncInventoryProductionLifecycleForSale` after their existing sales-control/stat reset mutation.
- Covered paths include standalone production assignment actions, clean-code production data-access helpers, mirrored `app-deps` helpers, batch assignment, old mark-complete actions, sales-progress fallback deletion, and the older production item action helpers.
- The canonical `update-sales-control` task still owns the modern task path; package-level sales-control tasks were not changed to avoid double-syncing modern flows.
- Sales overview Mark As actions now render the shared `SalesMenu.MarkAs` component in both the legacy overview sheet action bar and the newer sales overview system quick actions, so production-complete and fulfillment-complete run through the same `update-sales-control` job-backed path used by the orders table.
- Validation: `bun test apps/www/src/actions/production-control-reset.test.ts` passed with 2 tests and 42 assertions; focused sales inventory/fulfillment tests still passed with 29 tests and 74 assertions; `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 5 tests and 10 assertions.

## 2026-06-16 Inbound Prompt Reconciliation Update
- `notes.saveInboundNote` now applies `ORDERED` and `PENDING ORDER` prompts only to existing unassigned, unreceived open inventory `InboundDemand` rows for the same sale.
- Manual order prompt demand updates are limited to unassigned open demand with `qtyReceived=0` and do not downgrade shipment-linked, partially received, or received demand.
- `syncSalesInventoryLineItems` now reads the sale's order-level inbound status and uses the shared inventory demand-status resolver when creating/updating `InboundDemand`, covering the async timing case where the invoice prompt saves before inventory demand rows exist.
- Sales inventory sync, inbound queue, reorder suggestions, reconciliation, and inbound assignment flows now use the inventory-owned `ACTIVE_INBOUND_DEMAND_STATUSES` policy for active demand reads, so previously cancelled/deleted demand history is not counted or revived into the active projection.
- Order prompt mutation and the shared `canOrderInboundPromptMutateDemand` helper use the separate inventory-owned `ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES` policy plus unassigned and unreceived demand guards, keeping prompt-side updates limited to `pending` / `ordered` demand that is not already owned by an inbound shipment item and has no received quantity. The manual inbound-status modal passes `qtyReceived` and `inboundShipmentItemId` into the helper, so already-received or shipment-linked demand is disabled before submit instead of only being rejected by the server mutation.
- Added ADR-009 to document inventory as the owner of inbound demand status semantics and sales as a consumer of that policy.
- `AVAILABLE` prompts intentionally do not cancel shortage demand; these disagreements surface in the inbound reconciliation report instead of hiding real stock gaps.
- Added `inventories.inboundStatusDemandReconciliation`, a bounded query comparing `SalesOrders.inventoryStatus` with open line-level demand.
- `/inventory/inbounds` now shows a compact reconciliation panel for orders with prompt/demand mismatches, extracted as a dedicated widget component to keep the workspace page composition-oriented.
- Validation: `bun test packages/inventory/src/application/inbound/inbound-demand.test.ts` passed with 14 tests and 31 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 10 tests and 20 assertions.

## Order-update repair preview and apply (2026-07-22)

- Saved orders now open a guarded repair panel in the inventory configurator
  when stale demand/allocation residue remains after an order update.
- The preview keeps exact reviewed baselines and distinguishes safe unlinked,
  unreceived demand and mutable allocations from linked/received/picked/consumed
  rows that require operator review. Review rows can deep-link to the canonical
  Sales Book Inbounds workspace.
- Applying selected rows revalidates ownership and all baselines in one
  transaction, soft-cancels/releases only mutable rows, recomputes affected
  component demand state, invalidates the inventory workspace queries, and
  writes an order-scoped audit history record.
- Focused API query coverage passes 2 tests / 10 assertions; API and WWW
  typechecks pass. Authenticated browser proof for an actual stale order and
  review-required inbound remains open.

## Evidence Pointers
- Sync foundation: `packages/sales/src/sync-sales-inventory-line-items.ts`, `packages/sales/src/sales-inventory-sync-job.ts`, `packages/jobs/src/tasks/sales/backfill-sales-inventory-line-items.ts`
- Projection and fulfillment: `packages/sales/src/sales-fulfillment-plan.ts`
- Sales inventory overview: `packages/sales/src/sales-inventory-overview.ts`
- Sync monitor: `packages/sales/src/sales-inventory-sync-monitor.ts`
- Inbound receiving: `packages/inventory/src/application/inbound/inbound-demand.ts`
- Allocation review: `packages/inventory/src/inventory.ts`
- API surface: `apps/api/src/trpc/routers/inventories.route.ts`
- UIs: `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/production-plan`
- Inventory -> Dyke partial helper: `packages/inventory/src/application/sync/dyke-update-from-inventory.ts`
- Inventory variant pricing: `packages/inventory/src/inventory.ts`
- Inventory print: `packages/sales/src/print/inventory-print-data.ts`, `/p/sales-inventory-v2`, `print.salesInventoryV2`
- Inventory reconciliation: `packages/sales/src/inventory-reconciliation-report.ts`, `packages/jobs/src/tasks/inventory/run-inventory-reconciliation-report.ts`, `inventories.inventoryReconciliationReport`
- Production/dispatch command chain: `packages/jobs/src/tasks/sales/update-sales-control.ts`, `packages/sales/src/sales-control/actions.ts`
- Inventory item dashboard: `packages/inventory/src/inventory.ts`, `inventories.inventoryItemDashboard`, `/inventory/[id]`
- Inventory variants workspace: `packages/inventory/src/inventory.ts`, `inventories.inventoryVariantsWorkspace`, `/inventory/variants`
- Inventory top-sales analytics: `packages/inventory/src/inventory.ts`, `inventories.inventoryTopSalesAnalytics`, `/inventory`, `/inventory/[id]`
- Inventory stock audit verification: `packages/inventory/src/application/stock/stock-adjustment.ts`, `inventories.stockAuditVerificationReport`, `/inventory/stocks`
- Inventory operations dashboard: `packages/inventory/src/inventory.ts`, `inventories.inventoryOperationsSummary`, `/inventory`
- Inventory dispatch mode UI: `apps/www/src/components/inventory/inventory-dispatch-mode-page.tsx`, `inventories.assignInventoryDispatchAllocations`, `inventories.packInventoryDispatchAllocations`, `inventories.fulfillInventoryDispatch`, `inventories.releaseInventoryDispatchAllocations`, `/inventory/dispatch-mode`
- Inventory pages: `/inventory`, `/inventory/[id]`, `/inventory/variants`, `/inventory/stocks`, `/inventory/allocations`, `/inventory/inbounds`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/dispatch-mode`, `/inventory/production-plan`, `/inventory/suppliers`, `/inventory/review`

Last updated: 2026-06-23

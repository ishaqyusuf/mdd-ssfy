# Done

## Purpose
Tracks notable completed work snapshots. Use `brain/progress.md` for the detailed chronological log.

## Recent Highlights
- [x] Mobile Invoice Save Stuck: completed `brain/plans/2026-06-23-bug-fix-mobile-invoice-save-stuck.md` by adding a bounded mobile save await path, driving the saving overlay from store `saveStatus`, and returning hung invoice/quote saves to a retryable error state (2026-06-23).
- [x] Completed Inventory Pending 16 operations dashboard stock controls with tracked/untracked stock cards, low/out-of-stock alerts, inbound demand, pending allocation, backorder, production blocker metrics, and drilldowns from `/inventory` (2026-06-15).
- [x] Completed Inventory Pending 14 stock audit verification with an audit matrix/report for stock in/out, return, correction, consume, and release plus stock operations UI evidence and focused tests (2026-06-15).
- [x] Completed Inventory Pending 13 top-sales analytics by adding inventory-backed item/variant rankings for ordered quantity, shipped/consumed allocation quantity, revenue, cost, and margin with reliability counts on `/inventory` and `/inventory/[id]` (2026-06-15).
- [x] Completed Inventory Pending 12 variants workspace by replacing the `/inventory/variants` redirect with a searchable/filterable variants page showing item, category, status, stock, pricing, supplier, low-stock, dashboard, edit, and stock-operation context (2026-06-15).
- [x] Completed Inventory Pending 11 item dashboard with `/inventory/[id]`, a bounded item overview API, variants/stock/movements/inbound/allocations/sales/quotes sections, and the inventory table eye action linked to the dashboard (2026-06-15).
- [x] Completed Inventory Pending 10 repeat receive / auto-release guardrails, making inbound receive delta-based and surfacing duplicate/skipped counts for receive and backorder allocation retries (2026-06-15).
- [x] Completed Inventory Pending 09 hold-until-complete and partial-shipment workspace slice, including line-level hold metadata, guarded ship-available behavior, dedicated `/inventory/partial-shipments` route, and focused fulfillment tests (2026-06-15).
- [x] Completed Inventory Pending 07 reconciliation job foundation with a dry-run sales inventory drift report, bounded cursor support, skipped reasons, Trigger task, and protected inventory API access (2026-06-15).
- [x] Completed Inventory Pending 06 print parity data/golden slice with production BOM, pick list, packing list, backorder summary, and customer remaining summary packets using the existing v2 template input contract (2026-06-15).
- [x] Completed Inventory Pending 05 shipment-record decision: `OrderDelivery` / `OrderItemDelivery` are canonical shipment records for the current inventory cutover phase; ADR-008 documents the policy (2026-06-15).
- [x] Completed Inventory Pending 04 inventory dispatch mode command/API slice for assign, pack, fulfill, and release allocation transitions while preserving legacy dispatch compatibility rows (2026-06-15).
- [x] Completed Inventory Pending 08 production readiness gates, blocking production assignment/start unless inventory-backed required components are ready or fulfilled (2026-06-15).
- [x] Completed Inventory Pending 03 production lifecycle bridge, updating inventory-backed line projections from sales-control assignment/submission events while keeping stock fulfillment state separate (2026-06-15).
- [x] Completed Inventory Pending 02 variant/supplier price sync to Dyke, including generic cost-price projection, preserved supplier pricing-key creation guardrails, supplier ambiguity skips, drift-report alignment, and focused sync tests (2026-06-15).
- [x] Completed Inventory Pending 17 cutover gap audit matrix, mapping inventory-to-Dyke, price sync, production, dispatch, print, dashboard, audit, reconciliation, and browser-validation capabilities to current code/Brain evidence (2026-06-15).
- [x] Initialized the original Brain system for the repository on 2026-03-08.
- [x] Published ADRs for payment/resolution boundaries, shared document platform, and the sales overview system architecture.
- [x] Started the shared document-platform foundation and the sales overview system redesign foundation.
- [x] Landed recent payment-system reliability fixes and client-safe schema extraction work captured in `brain/progress.md`.
- [x] Implemented sales PDF print enhancements to surface door thumbnails and preserve moulding detail visibility in invoice output (2026-03-18).
- [x] Rebuilt the sales production admin/worker workspace around shared dashboard UI, due-today/tomorrow alerts, and compact due-date filtering (2026-03-26).
- [x] Refined the sales production worker dashboard v2 with row-injected item detail, simplified worker progress status, compact handle-aware submission controls, worker-only item visibility, and scope-aware completion filtering for past-due/pending queues (2026-04-02).
- [x] Restored missing worker notification delivery for production assignments in the v2 `update-sales-control` path (2026-04-03).
- [x] Added the restricted `CommunityUnit` permission slice for community projects/units/templates, narrowed the units grid to `Project` / `Builder` / `Model` / `Lot` / `Block`, and blocked install-cost UI/API access for that permission path (2026-04-17).
- [x] Fixed the sales dashboard chart-date regression by normalizing dashboard date params as explicit `yyyy-MM-dd` calendar days on the API and client, preserving same-day revenue buckets and date picker labels; validation: `bun test apps/api/src/db/queries/sales-dashboard.test.ts` passed (2026-06-09).

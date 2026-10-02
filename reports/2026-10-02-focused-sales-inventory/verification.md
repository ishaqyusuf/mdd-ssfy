# Focused Sales Overview Inventory — local verification

October 2, 2026. Owner selected recommended workshop Direction 01 and requested Midday migration guidance. Implementation mode completed in the existing dirty workspace, preserving concurrent unrelated changes. App: https://gndprodesk.localhost/sales-book/orders?sales-overview-id=09945PC&sales-type=order&mode=sales&salesTab=inventory.

## Result

Needs is a compact image-first list with exact product/size, remaining need, free stock and simple status. Warehouse has its own view and location filter. Click a need for its contextual secondary sheet, Apply available, then order only its remaining shortage. Adjust stock reuses the standalone form/provider in the same secondary system, with exact product/variant locked. Pending inbound remains still needed/on the way and blocks duplicate purchases or warehouse overcoverage. Back/Escape returns to the previous context and restores row focus on wide and narrow screens.

The confusing duplicate warning came from comparing UID globally. Imported door size keys are scoped to the parent product: variants 11/28 belong to inventories 53/54, and hinge variants 1973/2007 belong to 575/579. Matching size/dependency keys across those parents are legitimate. The query now compares within the parent only; genuine within-parent duplicates retain one concise review warning. Stock unit confirmation remains a separate actionable safety gate. Counts and identities were not merged.

## Midday references and conformance

Canonical reference: `/Users/M1PRO/Documents/code/_kitchen_sink/midday`. Required invoices files inspected: route `[locale]/(app)/(sidebar)/invoices/page.tsx`; components `invoice-header.tsx`, `open-invoice-sheet.tsx`, `invoice-search-filter.tsx`, `sheets/invoice-sheet.tsx`, `invoice-sheet-header.tsx`, `invoice-content.tsx`, `invoice/form-context.tsx`; hooks `use-invoice-params.ts`, `use-invoice-filter-params.ts`; table `invoices/data-table.tsx`, `columns.tsx`, `table-header.tsx`, `actions-menu.tsx`, `bottom-bar.tsx`, `skeleton.tsx`, `empty-states.tsx`. Supporting customer sheet/edit/content and query/schema patterns were inspected. GND sheet-v2 is the authority for domain-specific secondary panes.

| Contract area | Finished adaptation |
| --- | --- |
| Filesystem | Thin `inventory-need-pane`, separate `inventory-need-sheet-header` and `need-content`; shared stock provider/form inside `inventory-adjustment-pane`; focused workspace/image/pane context under sales-inventory. |
| Route/composition | Existing Sales Book hydration, overview controller/header and operational gates retained. Inventory tab composes active subviews only. |
| Header/open controls | Compact subview navigation. Whole need row opens contextual sheet; Warehouse Adjust targets exact variant/bucket. No repeated price/cost/readiness panels. |
| Sheet ownership | Overview owns transient nested intents; order switch discards them; Back/Escape unwinds adjustment/inbound first. Wide side-by-side; narrow secondary replaces primary; stable trigger token restores focus after remount. |
| Reusable form | Same standalone stock form/provider/mutation; exact variant immutable, location explicit, expected quantity/audit/assigned-stock protections intact. |
| URL state | `inventorySegment=warehouse` and `inventoryLocation` persist Warehouse view/filter. Returning to Needs clears location; clear-filter empty state is present. |
| Data | Bounded exact variant balance schema/query in Inventory package; gallery fallback; committed availability per real bucket. Sales owns positive selected component schema and selection-bound plan/application/replay. API authenticates and orchestrates. |
| Mutation/refresh | Apply only clicked need under canonical revision and locks. Existing shortage command uses exact selected rows. Stock/inbounds/plans/overview/orders refresh after writes. Pending inbound excluded from repeat coverage. |
| States | Loading skeletons; retryable plan/balance/supplier errors; finite-list empties and filter clear; fallback images; history/quote/terminal/read-only gates remain. |
| Omitted global table features | Pagination, virtualization, sticky/reorderable/resizable columns, global search, column visibility and bulk bottom bar omitted because this is a finite saved-order material list with individual reviewed actions. Existing global Inventory workspaces retain their table patterns. |

No unexplained contract mismatch remains. The source/API implementation is local; no deployment or schema/migration change was requested. Broad compile diagnostics below remain a workspace limitation.

## Live acceptance

Isolated local sale `FOCUS-QA-1790931903420` (33348), new parent inventories 1683/1684, exact variants 3581/3582, stock rows 973/974. Existing catalog images were referenced; no original physical quantities were changed. Commercial quantities 5/4 with two pieces per selected unit produced required 10/8 and available 10/6.

1. Applying satin reserves 10, reduces its need/free stock to zero, and leaves matte need 8/free 6 unchanged.
2. Applying matte reserves 6, leaves exactly 2 still needed/free 0.
3. The shortage form orders 2. One inbound 1266/item and one linked two-piece demand exist. Still needed stays 2, with on the way 2; no second purchase/application button offered.
4. A count below six assigned pieces is blocked with an inline explanation. A +2 physical adjustment saves to eight physical/six reserved/two free; it does not allocate to the sale and pending inbound remains protected.
5. Warehouse and Workshop filter show the correct bucket; segment/location URL state works. Contextual product picker is disabled. Back/Escape retains the overview and returns focus to the selected row.
6. Desktop side-by-side and 390×844 replacement sheets pass; document width equals viewport width (390), images render, no horizontal overflow.
7. Canonical retry of the first selected revision returns replayed=true/appliedQty=10 without new allocation. Changed-scope retry and foreign component selection are rejected. [Database proof](database-proof.json).

The minimal isolated fixture lacked an order-list projection and displayed Updating… in its header; this is fixture setup, not a new production loading state. HMR interrupted the automatic pane return during inbound creation, so its final persisted result was checked by reopening the need. The normal Back/Escape return was independently verified. The original invoice 09945PC/sale33347 and inbound1263 stayed unchanged. The disposable sale/catalog/stocks/demands/inbound were soft archived and allocations released; audits retained. [Cleanup proof](fixture-cleanup.json).

## Validation

- `bun test packages/inventory/src/application/stock/stock-operation-queries.test.ts packages/sales/src/sales-form-stock-selection.test.ts packages/sales/src/sales-form-stock-preview.test.ts packages/inventory/src/application/stock/stock-operations.test.ts apps/dashboard/src/components/sales-overview-system/lib/inventory-inbounds-utils.test.ts apps/api/src/trpc/routers/inventory-fulfillment-permissions.test.ts packages/ui/src/components/custom/sheet-v2-layout.test.ts`: **51 pass, 143 assertions**, covering identity scope, per-bucket commitments, physical floor, selection parser, piece conversion, shared budgets, permissions and layered dismissal. [Log](checks/focused-tests.log).
- `GND_STOCK_INTEGRATION=1 bun --env-file=.env --env-file=.env.local test packages/sales/src/sales-form-stock.integration.test.ts`: **1 pass, 62 assertions**, local guarded serializable application, selection/ownership/replay and preservation checks. [Log](checks/integration.log).
- `bunx biome check` on the 13 focused new/domain files plus stock provider/form and segment hook: pass; one provider formatting correction applied. Scoped `git diff --check`: pass. [Focused log](checks/focused-lint.log).
- `bun run typecheck`: existing `packages/utils/src/envs.test.ts` imports missing `bun:test.afterEach`; run stops there. [Log](checks/root-typecheck.log).
- `NODE_OPTIONS=--max-old-space-size=8192 bun run --filter @gnd/dashboard typecheck`: completes with existing Assistant/dispatch/DB/test diagnostics, no diagnostics in the new focused components or changed stock-plan/balance logic. Existing `inventories.route.ts` diagnostics remain in unrelated delivery-mode/backorder query schemas. Ordinary run exhausted its default heap before the larger run. [Log](checks/dashboard-typecheck.log).
- `bun run --filter @gnd/inventory typecheck`: existing DB/test diagnostics; final output has no changed stock-query diagnostics. [Log](checks/inventory-typecheck.log).

The active dashboard compiled and browser acceptance passed through the unchanged shared HTTPS proxy. No full build success is claimed while broad typecheck errors remain.

## Brain impact

Updated `.brain/features/inventory-stock-system.md`, `.brain/api/contracts.md`, `.brain/api/endpoints.md`, `.brain/api/permissions.md`, `.brain/decisions/2026-10-02-focused-sales-inventory.md`, `.brain/plans/2026-10-02-sales-inventory-workshop.md`, `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, and `.brain/progress.md`. No database documentation change required: this task adds read/scoping/UI contracts without schema or migration edits.

## Step screenshots

[Open the complete screenshot gallery](screenshots.html). Images below include the existing invoice and disposable acceptance flow before cleanup; the final original-invoice screenshot is captured after cleanup.

1. [Existing invoice: contextual stock adjustment](screenshots/01-contextual-adjustment.jpg)
2. [Existing invoice: pending inbound stays still needed/on the way](screenshots/02-existing-inbound-coverage.jpg)
3. [Original invoice: focused image list](screenshots/03-focused-needs.jpg)
4. [Isolated acceptance: satin need 10/free 10; matte need 8/free 6](screenshots/04-before-application.jpg)
5. [Review satin: apply 10](screenshots/05-full-coverage-review.jpg)
6. [Satin covered; matte unchanged](screenshots/06-full-coverage-applied.jpg)
7. [Review matte: apply 6 of 8](screenshots/07-partial-coverage-review.jpg)
8. [Matte retains need 2](screenshots/08-partial-coverage-applied.jpg)
9. [Order only the remaining 2 pieces](screenshots/09-shortage-inbound-form.jpg)
10. [Inbound created: still needed 2/on the way 2](screenshots/10-shortage-inbound-created.jpg)
11. [Count below 6 assigned pieces: inline reason and disabled submit](screenshots/11-count-below-assigned-blocked.jpg)
12. [Positive physical adjustment saved without allocating it](screenshots/12-positive-adjustment-saved.jpg)
13. [Separate order-specific Warehouse view](screenshots/13-warehouse-tab.jpg)
14. [Warehouse filter with URL state](screenshots/14-warehouse-location-filter.jpg)
15. [390px focused list](screenshots/15-mobile-needs.jpg)
16. [390px need secondary sheet](screenshots/16-mobile-need-detail.jpg)
17. [390px reused adjustment form; target locked](screenshots/17-mobile-adjustment.jpg)
18. [Final original invoice inventory](screenshots/18-final-focused-inventory.jpg)

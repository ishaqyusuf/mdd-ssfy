# Contractor Payouts Table

## Status
Validated restarted Sales Orders parity migration slices, latest 2026-07-17.

The `/contractors/jobs/payments` payout history surface now renders through `apps/www/src/components/tables-2/contractor-payouts/*` while preserving the existing `jobs.contractorPayouts` query, filter params, payout search metadata, detail links, and selected payout print-report workflow.

The `/contractors/jobs/payment-dashboard` recent payments panel now renders through `apps/www/src/components/tables-2/payment-dashboard-recent-payments/*`, and the same dashboard's Ready for payout contractor queue now renders through `apps/www/src/components/tables-2/payment-dashboard-contractors/*`, while preserving the existing `jobs.paymentDashboard` query and the finance dashboard cards/checklist.

The `/contractors/jobs/payment-portal` payable jobs workspace now renders its selected-contractor job list through `apps/www/src/components/tables-2/payment-portal-jobs/*` while preserving the existing `jobs.paymentDashboard`, `jobs.paymentPortal`, `jobs.jobReview`, `jobs.createPaymentPortal`, job overview, print-selected, and payout summary flows.

The `/contractors/jobs/payments/[paymentId]` payout detail page now renders its Included jobs section through `apps/www/src/components/tables-2/contractor-payout-overview-jobs/*` while preserving the existing `jobs.contractorPayoutOverview` query, payout cancel/reverse actions, print report action, summary cards, adjustments, and activity history.

## Behavior
- The route follows the restarted Sales Orders shell pattern with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("contractor-payouts")`.
- The payment history card owns the table boundary with `ErrorBoundary`, `Suspense`, and `ContractorPayoutsSkeleton`.
- The table consumes `tables-2/core` directly: `VirtualRow`, table-owned `useScrollHeader(parentRef)`, `useTableDnd`, `DndContext`, `SortableContext`, `DraggableHeader`, `ResizeHandle`, sticky columns, persisted sizing/order/visibility/dividers, infinite scroll, selection, and the header-offset spacer.
- `TABLE_CONFIGS["contractor-payouts"]` owns compact padding, 64px rows, sticky select/payout columns, non-reorderable select/payout/actions columns, and sort field mapping for `date`, `paidTo`, `authorizedBy`, and `amount`.
- Columns are content-tailored: Payout, Paid To, Authorized By, Jobs, Amount, and Actions.
- Selected rows expose a Sales Orders-style floating bottom bar with Print Report and Deselect all.
- `ContractorPayoutsHeader` keeps the existing search/filter adapter and adds the column visibility/divider control.
- The payment dashboard route now uses `ScrollableContent`, `batchPrefetch`, `getInitialTableSettings("payment-dashboard-contractors")`, and `getInitialTableSettings("payment-dashboard-recent-payments")` instead of manual `getQueryClient().fetchQuery`.
- The Ready for payout contractor queue consumes `tables-2/core` directly with compact 56px rows, sticky Contractor/Actions columns, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, persisted visibility/sizing/order/dividers, row-click payment-portal navigation, and the header-offset spacer.
- Contractor queue columns are content-tailored for the dashboard card: Contractor, Insurance, Jobs, Recent Project, Total Pay, and Actions.
- The recent payments dashboard table consumes `tables-2/core` directly with compact 56px rows, sticky Payout/Actions columns, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, persisted visibility/sizing/order/dividers, row-click payout overview navigation, and the header-offset spacer.
- Recent payment columns are content-tailored for the small dashboard card: Payout, Paid To, Jobs, Method, Paid By, Amount, and Actions.
- The payment portal route now uses `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("payment-portal-jobs")` instead of manual `getQueryClient().fetchQuery`.
- The payment portal jobs table is controlled by the parent portal state for row selection and payout totals, while the table owns compact 64px rows, sticky Select/Job/Actions columns, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, persisted visibility/sizing/order/dividers, row-click job overview opening, and action cells for mark submitted / approve / reject.
- Payment portal job columns are content-tailored: Select, Job, Details, Project / Unit, Status, Payment, Amount, and Actions.
- The payout detail route now owns the restarted shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("contractor-payout-overview-jobs")`; `PaymentOverviewPage` stays as the client content owner instead of nesting its own `PageShell`.
- The Included jobs table consumes `tables-2/core` directly with compact 64px rows, sticky Job column, table-owned scroll, `VirtualRow`, DnD, draggable headers, resize handles, horizontal pagination, persisted visibility/sizing/order/dividers, and the header-offset spacer.
- Payout detail included-job columns are content-tailored for the overview card: Job, Location, Status, Amount, and Created.

## Constraints Preserved
- No custom shared page-header abstraction is used.
- `apps/www/src/components/tables-2/core/*` remains unchanged.
- The existing payout API/query/filter contracts are reused.
- Old payout table imports are not used by the route or payment history view.
- The old `apps/www/src/components/tables/contractor-payouts/*` files were removed on 2026-07-17 after import scans confirmed there were no live source consumers outside Brain notes and negative audit assertions.
- The dashboard Ready for payout panel no longer hand-maps `contractors` into bordered cards.
- The dashboard recent payments panel no longer hand-maps `recentPayments` into bordered cards.
- The payment portal main payable jobs panel no longer hand-maps `jobs` into bordered cards.
- The payout detail Included jobs panel no longer hand-maps `data.jobs` into bordered cards.

## Validation
- `bun test apps/www/src/components/tables-2/contractor-payouts/migration-parity.test.ts apps/www/src/components/page-sticky-header.test.ts` passed with 7 tests / 38 assertions.
- Full restarted parity suite passed with 62 tests / 526 assertions.
- Targeted Biome passed for the route, payment history view, header, table files, table settings/config, and audit tests.
- Filtered `@gnd/www` typecheck reported no touched-file diagnostics; broad typecheck still inherits unrelated baseline errors.
- Static scans found no live legacy contractor-payout table, `@gnd/ui/data-table`, `PageStickyHeader`, `getQueryClient`, or `fetchInfiniteQuery` imports in the route/view/table.
- `git diff --check` passed.
- HEAD smoke for `/contractors/jobs/payments` returned `200`.
- 2026-07-17 dashboard slice:
  - Focused payment-dashboard recent-payments/page audit tests passed with 7 tests / 35 assertions.
  - Full restarted parity suite passed with 127 tests / 1205 assertions.
  - Targeted Biome passed for the dashboard route, payment dashboard components, new table module, table settings/config, and audit tests.
  - Static scans found no live `recentPayments.map`, legacy `components/tables/skeleton`, `getQueryClient`, `fetchQuery`, or `PageStickyHeader` usage in the dashboard route/surface/table; the only matches are negative test assertions.
  - Filtered `@gnd/www` typecheck grep reported no diagnostics for the dashboard/table registry/audit files while broad typecheck remains blocked by unrelated baseline errors.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` stayed unchanged.
  - Runtime curl smoke for `/contractors/jobs/payment-dashboard` timed out after 30s with no bytes from the local dev server, so authenticated visual/browser proof remains outstanding for this slice.
- 2026-07-17 dashboard contractor queue follow-up:
  - Focused payment-dashboard parity tests passed with 4 tests / 58 assertions.
  - Full restarted parity suite passed with 195 tests / 1970 assertions.
  - Targeted Biome passed for the dashboard route, payment dashboard components, new contractor queue table module, table settings/config, and audit tests.
  - Static scans found no live `contractors.map` or `recentPayments.map` in the payment dashboard page; the remaining `contractors.map` matches are in the separate payment portal page and remain a future slice candidate.
  - Filtered `@gnd/www` typecheck grep reported no diagnostics for the dashboard/table registry/audit files while broad typecheck remains blocked by unrelated baseline errors.
  - HTTPS and HTTP route smokes for `/contractors/jobs/payment-dashboard` returned `200`.
  - `git diff --check` passed and `apps/www/src/components/tables-2/core` stayed unchanged.
  - Browser DOM inspection was blocked because bundled Playwright Chromium was not installed and local Chrome aborted in the current sandbox, so scroll proof is source-level table-owned scroll parity plus route smoke.
- 2026-07-17 payment portal jobs slice:
  - Focused payment-portal jobs parity tests passed with 4 tests / 40 assertions.
  - Full restarted parity suite passed with 200 tests / 2019 assertions.
  - Targeted Biome passed for the payment portal route, portal component, new jobs table module, table settings/config, and audit tests.
  - Static scans found no live `jobs.map`, `JobListItem`, `EmptyPortalState`, manual `getQueryClient` / `fetchQuery`, old skeleton, or raw `@gnd/ui/table` usage in the portal route/surface.
  - Filtered `@gnd/www` typecheck grep reported no diagnostics for the payment-portal/table registry/audit files while broad typecheck remains blocked by unrelated baseline errors.
  - HTTPS and HTTP route smokes for `/contractors/jobs/payment-portal` returned `200`.
  - `components/tables-2/core` stayed unchanged.
- 2026-07-17 payout detail included-jobs slice:
  - Focused contractor payout parity tests passed with 6 tests / 70 assertions.
  - Full restarted parity suite passed with 212 tests / 2169 assertions.
  - Targeted Biome passed for the payout detail route, payment overview components, included-jobs table module, table settings/config, and audit tests.
  - Static scans found no live `data.jobs.map`, manual `getQueryClient` / `fetchQuery`, legacy table imports, or `@gnd/ui/data-table` usage in the payout detail route/content surface; expected raw table primitives remain isolated inside `components/tables-2/contractor-payout-overview-jobs`.
  - Filtered `@gnd/www` typecheck grep reported no diagnostics for the payout detail/table registry/audit files while broad typecheck remains blocked by unrelated baseline errors.
  - HTTPS route smoke for `/contractors/jobs/payments/2653` returned `200`.
  - `git diff --check` passed and `components/tables-2/core` stayed unchanged.

# Plan: Sales Book Inbounds Workspace Table Core Upgrade

## Type
UX/UI

## Status
Partially Implemented; URL/canonical-route slice complete, authenticated browser validation remains pending

## Created Date
2026-07-01

## Last Updated
2026-07-17

## Intake
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Intake Item: Upgrade `/sales-book/inbounds` with standard search, new table core list mode, analytics cards, and route inbound-management links there.

## Goal Or Problem
`/sales-book/inbounds` should feel like the standard Sales Book table workspaces while preserving the collapsible inbound detail experience. The current workspace uses local search/filter state and custom list rendering; the user wants the same search input component used by Sales Book orders and other table pages, support from the new table core including list mode, analytics cards like community/customer-services, and inbound-management links should open `/sales-book/inbounds`.

## Current Context
- `apps/www/src/components/sales-inbounds-workspace.tsx` is the current `/sales-book/inbounds` implementation.
- `brain/features/inventory-backed-sales-fulfillment.md` says `/sales-book/inbounds` uses flattened shadcn collapsible rows, search/status filtering, compact analytics, linked order/customer context, status controls, receive-stock, and timeline history.
- `/sales-book/inbound-management` is already migrated to `components/tables-2/inbound-management/*`, but the requested destination is now `/sales-book/inbounds`.
- `brain/plans/2026-06-16-orders-v2-table-standard-migration.md` established the table migration rules: preserve existing queries/filters, avoid route forks, and avoid unnecessary core churn.

## Proposed Approach
Introduce list-mode support in the table core only if the existing core does not already support it, then migrate `/sales-book/inbounds` to a standard table/list shell: shared search input/filter behavior, compact analytics cards, list rows rendered as collapsible inbound summaries, and expanded detail content. Retarget inbound-management links/actions to `/sales-book/inbounds` where that is the canonical operational workspace.

## Implementation Steps
- Compare Sales Book orders search/header implementation with `SalesInboundsWorkspace`.
- Decide whether `/sales-book/inbounds` should use URL-backed query params for `q`, status, selected inbound id, and pagination/list state.
- Reuse existing `inventories.inboundShipments` and `inventories.inboundShipmentDetail` where possible; add a bounded summary/analytics query only if needed.
- Add list-mode support to `components/tables-2/core` only if it can be generic and does not destabilize table mode.
- Render inbound rows as collapsible list items using table-core list mode:
  - trigger summary: inbound id, supplier/reference, status, linked order/customer, item count, ordered/received progress.
  - expanded content: stock lines, linked orders, status controls, receive-stock, documents, and timeline.
- Replace local search input with the same standard search input component/pattern used by `/sales-book/orders`.
- Add analytics cards similar in density to `community/customer-services`: total, active/in-progress, issue/open, completed/closed, pending quantity or received progress.
- Update `apps/www/src/components/sidebar-links.ts`, sales tabs, and inbound-management row actions/links so inbound management opens `/sales-book/inbounds` where appropriate.
- Preserve selected inbound deep links and browser back/forward behavior.

## Affected Files Or Areas
- `apps/www/src/app/(sidebar)/(sales)/sales-book/inbounds/page.tsx`
- `apps/www/src/components/sales-inbounds-workspace.tsx`
- `apps/www/src/components/tables-2/core/*`
- `apps/www/src/components/tables-2/inbound-management/*`
- `apps/www/src/components/inbound-header.tsx`
- `apps/www/src/components/inbound-search-filter.tsx`
- `apps/www/src/components/sidebar-links.ts`
- `apps/www/src/components/sales-tabs.tsx`
- `packages/sales` / `packages/inventory` inbound query areas if analytics require API changes
- `brain/features/sales-inbound-management-table.md`
- `brain/features/inventory-backed-sales-fulfillment.md`

## Acceptance Criteria
- `/sales-book/inbounds` uses the same standard search input pattern as Sales Book orders.
- The table core supports the required list-mode behavior without breaking existing table pages.
- Inbound rows remain collapsible and expose all current detail/status/receive/timeline information.
- Analytics cards summarize inbound workload in a compact, useful way.
- Inbound management links open `/sales-book/inbounds` instead of the older inbound-management route where the user expects operational management.
- Desktop and mobile browser smoke show no document-level horizontal overflow and usable list scrolling.

## Test Plan
- Focused Biome/import checks for touched inbounds workspace, table core/list mode, and link files.
- Focused typecheck grep for touched files or `bun run typecheck` if core table types change.
- Browser verification for `/sales-book/inbounds`, search, status filter, selected inbound expansion, receive/status actions locked as appropriate, and mobile layout.

## Brain Update Requirements
- Update `brain/features/inventory-backed-sales-fulfillment.md`.
- Update `brain/features/sales-inbound-management-table.md` if canonical route/link behavior changes.
- Update `brain/progress.md`.
- Update `brain/api/contracts.md` / `brain/api/endpoints.md` only if queries or DTOs change.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Table core changes can affect many pages; keep list-mode additive and covered by smoke checks.
- Expanded inbound details can be heavy; avoid loading all details/timelines for every row at once.
- Link redirects should preserve existing users who still navigate to `/sales-book/inbound-management`.

## Open Questions
- TODO: Decide whether `/sales-book/inbound-management` should remain as a compatibility route, redirect, or separate legacy table after `/sales-book/inbounds` becomes canonical.

## Linked Task
- Task Title: Sales Book Inbounds Workspace Table Core Upgrade
- Task File: brain/tasks/roadmap.md

## 2026-07-17 Implementation Note
- `/sales-book/inbounds` now uses `components/tables-2/sales-inbounds/*` for the primary inbound shipment queue, without modifying `components/tables-2/core`.
- The route uses the restarted table shell with `PageShell`, `HydrateClient`, `ScrollableContent`, `batchPrefetch`, and `getInitialTableSettings("sales-inbounds")`.
- The old hand-mapped collapsible shipment queue was removed from `SalesInboundsWorkspace`; selected shipment detail/status/receive/timeline content now renders below the table.
- Compact analytics, local search/status filtering, existing inbound shipment/detail/activity queries, status update, and receive-stock mutations were preserved.
- Deferred from the initial migration slice: authenticated browser-driven mobile/desktop interaction proof beyond route smoke.
- Validation: focused Sales Book Inbounds parity test passed with 3 tests / 40 assertions; full restarted `tables-2` suite passed with 216 tests / 2249 assertions; targeted Biome passed; static runtime scans were clean; filtered WWW typecheck grep found no touched-file diagnostics; HTTPS route smoke returned `200`; `git diff --check` passed; `components/tables-2/core` diff stayed clean.

## 2026-07-22 URL and Canonical Route Slice
- `/sales-book/inbounds` now uses the standard `SearchFilterTRPC` search control and URL-backed `q`, `status`, and `inboundId` state for search, status filtering, selected shipment deep links, and back/forward restoration.
- Active sidebar links and inventory-owned `/sales-book/inbound-management` row actions now target `/sales-book/inbounds`, carrying `inboundId` when a single shipment is known; the legacy route remains available as a compatibility view.
- Focused Sales Book Inbounds parity and sidebar tests passed with 13 tests / 83 assertions; targeted Biome, WWW typecheck, and `git diff --check` passed.
- Deferred: authenticated browser proof for deep-link selection, back/forward behavior, and the retargeted action.

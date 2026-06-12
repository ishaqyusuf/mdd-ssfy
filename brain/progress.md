# Progress

> Structured Brain task tracking now lives under `brain/tasks/`. This file remains the chronological session log and historical execution record.

## 2026-06-12

- Added a lower-model-ready implementation handoff for the first pending inventory task: full inventory-to-Dyke create/update/delete/archive sync.
  - saved the handoff at `brain/handoffs/inventory-to-dyke-sync-handoff.md` and linked it from `brain/features/inventory-backed-sales-fulfillment.md`
  - included current-state findings, strict guard rails, non-goals, implementation sequence, validation gates, known traps, source-file references, and completion criteria for DeepSeek/Gemini-style execution

- Reviewed the requested inventory follow-up scope against existing code and expanded `brain/features/inventory-backed-sales-fulfillment.md` with a non-duplicative detailed execution plan.
  - already in place: Dyke-to-inventory sync/import, partial inventory-to-Dyke title/image helper, inventory sales projection, allocation/inbound/backorder foundations, inventory print route/query/viewer, stock mode, low-stock alert, and stock operations pages
  - still missing: full inventory-to-Dyke create/update/delete/archive sync, inventory variant price sync back to Dyke, production assignment/completion inventory lifecycle bridge, inventory-mode dispatch assign/pack/fulfill, Dyke-print parity proof for inventory print, item-level inventory dashboard, variants workspace, related sales/quotes tabs, and top-sales analytics
  - cleaned stale backlog wording so already-started inventory/Dyke foundation work is not repeated as untouched backlog; the remaining backlog now points to the dashboard/analytics expansion that is still genuinely missing

- Captured the inventory-backed sales fulfillment master model in `brain/features/inventory-backed-sales-fulfillment.md`.
  - marked implemented foundations across sales inventory sync, Dyke/inventory structural sync, sync/backfill monitoring, fulfillment projection, allocation review, inbound receiving, production planning, backorder queue, ship-available partial shipment, stock operations, and inventory-backed print data
  - called out the remaining gaps: explicit `SalesShipment` / `SalesShipmentLine` decision or implementation, hold-until-complete, dedicated partial shipment screen, production readiness gating, pricing drift reporting, repeat-receive/allocation guardrails, audit verification, print packet completion, reconciliation jobs, browser validation, and final source-of-truth cutover gates
  - updated `brain/tasks/in-progress.md` and `brain/tasks/roadmap.md` so the active inventory workstream points at the new master model

## 2026-05-31

- Continued the `apps/www` page-loading/navigation performance pass against the Midday-style route-hydration target.
  - removed the root `<StaticTrpc />` mount from `apps/www/src/app/layout.tsx`; active app/components/hooks now use route-local `useTRPC()` + `useQueryClient()` invalidation instead of a global static tRPC singleton
  - migrated the remaining active static invalidation consumers in builder/install-cost params, employee/sales-order/contractor-job tables, notification channel surfaces, delete button, sales overview dispatch menu, and employee form modal
  - changed global search loading so the search modal chunk is gated behind `meta+k`/open state instead of loading after every protected navigation
  - gated the protected global modal and sheet registries behind lightweight query-param watchers, so closed modals/sheets no longer import their large registries after every normal page navigation
  - hydrated the client auth session from the protected server layout and removed the redundant protected `ClientAuthGuard` wrapper, avoiding the extra `/api/auth-session` fetch and client path/search/session guard work on protected page load
  - removed Redux and the unused command palette provider from the active root provider stack; legacy Redux selectors now subscribe directly to the existing store only when legacy surfaces import them
  - removed the blocking protected-layout Prisma lookup for page tab defaults entirely; sidebar tab defaults now load from the existing client `pageTabs.defaults` query after session hydration instead of delaying first paint
  - removed the unused viewer-shell provider from the active root provider stack; the active print service no longer calls `openViewerShell`, so normal routes no longer mount that event listener/context
  - fixed focused type fallout from the static cleanup in checkout, notification-channel table, rendered PDF viewer, employee form modal, and contractor job actions
  - validation note: focused `@gnd/www` typecheck grep for the touched navigation/static-removal/auth-gating/provider/sidebar files completed with no matching errors; `git diff --check` passed; static scans show no active root `StaticTrpc`/`ClientAuthGuard`/`react-redux`/`CommandProvider`/`ViewerShellProvider` mount, no protected-layout `pageTabIndex` Prisma lookup, modal/sheet registries are conditional, and no active `page.tsx`/`layout.tsx` fire-and-forget prefetches under `(sidebar)`. Full `@gnd/www` typecheck still fails on the existing wider baseline (404 matching TS errors in the captured log, none in the touched navigation/auth-gating/provider/sidebar files). A production build attempt reached `Creating an optimized production build ...` and stopped making progress in local dev conditions; no stale build process remains. Browser automation via Puppeteer was blocked by macOS sandbox crashpad permissions, and gstack browse was unstable after startup, so browser navigation proof remains outstanding.

## 2026-05-28

- Implemented dealership-level defaults for tax group, sales profile, and fulfillment mode.
  - dealer company settings now saves/loads `DealerAuth.meta.defaultTaxCode`, `defaultCustomerProfileId`, and `defaultFulfillmentMode`, with dealer-scoped profile validation and tax-code validation
  - dealer customer schemas/forms now include `taxCode`, prefill new customers from dealership defaults, preserve saved customer values on edit, and persist/clear customer tax through active `CustomerTaxProfiles`
  - dealer quote creation now falls back from blank customer tax/profile/fulfillment to dealership defaults while preserving explicit quote or customer choices, including scoped profile resolution for saves
  - validation note: focused dealer settings/customer tests passed, focused dealer portal sales-form tests passed, dealership typecheck passed, and `git diff --check` passed

## 2026-05-26

- Implemented cached shelf product search for the shared new sales form workflow.
  - added a lightweight shelf product index endpoint and full product-detail endpoint for `www`, plus dealer-protected equivalents that preserve dealer shelf visibility filtering
  - added a pure package search library for local shelf product matching/ranking, so shelf search no longer needs a server round trip on every keystroke when the host provides the cached index
  - updated the shared shelf inline editor to fetch full product detail only after selection before patching the row, with row-level loading/error handling
  - wired `www` and dealership workflow data sources to cache the index and detail lookups through TanStack Query
  - validation note: focused shelf search/API tests passed, `@gnd/dealership` typecheck passed, and `bun run test:new-sales-form-migration` passed with the existing tolerated unrelated `www` typecheck baseline

## 2026-05-25

- Implemented dealer dual pricing tier support and dealer-facing margin visibility.
  - sales-book dealer admin now creates a default dealer pricing tier during onboarding and exposes dealer tier management for `CustomerTypes.salesPercentage`
  - dealer quote save now falls back to the dealer default/first tier or blocks with a clear missing-tier error instead of silently pricing at `0%`
  - dealership quote composer now defaults profile selection consistently and adds a right-panel Show Margin toggle with GND subtotal, dealer subtotal, gross profit, margin percent, and markup percent
  - validation note: focused dealer pricing/DPP/composer tests passed; `@gnd/dealership` typecheck passed; full `@gnd/api`/`@gnd/www` typechecks still fail on unrelated existing baseline errors, with filtered output clean for touched dealer-pricing files
- Added a reusable dealership customer overview workspace with full-page and tabbed side-sheet surfaces.
- Added dealer-scoped customer overview data and customer-scoped quote/order history filtering.
- Added focused dealer query tests for customer overview ownership/counts and customer sales-list filtering.

## 2026-05-24

- Narrowed the Brain standing skill rules for `apps/www`, `apps/dealership`, and shared sales React UI to `vercel-react-best-practices` plus `agency-engineering` with the Frontend Developer specialist by default.

## 2026-05-23

- Documented the missing dealership quote-to-order approval product plan in `brain/features/dealership-quote-to-order-approval.md`, covering dealer quote-only creation, order request submission, sales rep notifications, first-approver order assignment, already-worked states, manual delivery-cost review, dealer payment-link handoff, invoice modes, dealer sales/quotes tabs, query filters, sales-header pending request indicator, dashboard analytics, and validation gates.
- Updated Brain active tracking so the dealership quote-to-order approval workflow appears in `brain/tasks/in-progress.md` and `brain/plans/ongoing.md` as a planned addendum to the Dealership Program.
- Updated the Next.js required-skill Brain docs; the standing skill rules were later narrowed to `vercel-react-best-practices` and `agency-engineering` for `apps/www`, `apps/dealership`, and shared sales UI work.
- Implemented the first dealership quote-to-order approval support slice: Dealer Sales / Dealer Quotes tabs now show dashboard-backed count badges, orders/quotes pages prefetch those counts, dealer list filters support delivery option, dealer sales profile, and payment state, and orders also support invoice status. Added dealer list filter regression coverage and kept dealership typecheck green.
- Added a durable Brain rule for Next.js work in `apps/www`, `apps/dealership`, and shared React UI consumed by either app.
  - required future agents to load and apply the repository's React/Next.js UI skill set before implementing or reviewing those surfaces
  - defaulted `agency-engineering` to the Frontend Developer specialist unless a task clearly routes elsewhere
  - called out dealership quote/new-sales-form UI migration and shared `@gnd/sales/sales-form` package UI as explicit scope
  - added a pointer from the Brain entry point to the standing AI/skill requirement docs
- Added `brain/new-sales-form-completion-roadmap.md` with the full 30-phase remaining roadmap for shared package cutover readiness. Browser QA phases are intentionally last, and the execution rule is to keep `bun run test:new-sales-form-migration` green after each implementation slice and stop on failed gates.
- Completed completion-roadmap Phase 1 supplier management slot implementation. `SalesFormWorkflowPanel` now supports a host-owned Door supplier panel tab, and `WwwSalesFormWorkflowPanel` wires the existing `DoorSupplierManager` with supplier save/delete/select behavior while package code owns only the shell/context. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 2 app-specific calculator slots. The package default moulding editor now calls `dataSource.renderMouldingCalculator` when supplied, and `www` provides the existing `MouldingCalculator` through its workflow data source wrapper. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 3 package UI parity pass. The shared Door supplier manager and House Package Tool panel now use package design-system primitives, semantic colors, `Badge` status chips, and gap-based layout so dealership defaults are closer to the real form engine without app-owned styling. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 4 package type hardening. Added package-owned workflow route/HPT/line record types, exported them through the workflow barrel, tightened the workflow data-source contract away from `Record<string, any>`, and removed high-risk casts from shared row patch helpers and workflow panel reads. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 5 dealer-protected reference endpoint review. Dealer workflow references now omit internal settings metadata, dealer workflow components are sanitized to the render/pricing fields needed by the package, and dealership component lookup accepts only the step id/title inputs used by the quote form. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 6 package contract review. Removed the unused door-size editor slot from the public workflow surface, exported workflow route data types through the contracts entry point, and documented supplier/calculator/dealer endpoint ownership in the package README. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 7 pricing parity audit. Dealer quote pricing now falls back from missing/zero unit prices to effective `lineTotal / qty`, which keeps Door/HPT, shelf, moulding, and service package lines from underpricing when their workflow patches update totals but not unit prices. Added dealer pricing coverage across flat and workflow-authored line families. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 8 taxability and production flag audit. Dealer quote item persistence now derives aggregate tax/production flags from line metadata and service rows, storing `meta.tax` and `dykeProduction` alongside the workflow payload so saved dealership quotes keep production/tax signals. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 9 save/reopen/convert audit. Added dealer document reopen coverage to ensure saved package `newSalesForm.lineItems` payloads win over reconstructed legacy item rows, and strengthened quote-to-order conversion coverage so existing dealer metadata is preserved while conversion fields are stamped. Gate: `bun run test:new-sales-form-migration` passed.
- Completed completion-roadmap Phase 10 persistence regression expansion. The focused migration harness now runs workflow moulding actions, workflow selection/redirect actions, and step-family reopen tests in addition to supplier, door-size, shelf, moulding, service, sync, and total regressions. Gate: `bun run test:new-sales-form-migration` passed with 69 package workflow tests and 15 dealer tests.
- Completed completion-roadmap Phase 11 print/PDF impact audit. Invoice print data now falls back to package-authored shelf and HPT payloads stored in item metadata when legacy relational child rows are absent, and the migration harness now includes invoice print regressions. Gate: `bun run test:new-sales-form-migration` passed with 71 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 12 inventory sync impact audit. Inventory sync now extracts package-authored form step, shelf, HPT, and door component candidates from `SalesOrderItems.meta` when relational workflow children are absent, while preserving relational rows as the preferred source. Gate: `bun run test:new-sales-form-migration` passed with 73 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 13 error/loading/empty-state review. The shared package query contract now carries error/fetch state, workflow route/root/step failures render retryable package-owned notices, empty line-item state is explicit, and stale component data remains visible during hard query failures. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 14 accessibility review. The shared workflow controls now expose accessible labels for icon menus, item titles, service/moulding row fields, supplier selection, HPT door tabs, and step chips, while form-surface actions use explicit button types and selected/current state where appropriate. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 15 mobile/responsive review. The shared package toolbar, component cards, supplier manager, HPT tabs/table, moulding table, root picker, and invoice item title layout now use mobile-safe wrapping, truncation, scroll constraints, and stable radius/width choices ahead of final browser QA. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 16 performance/render review. The package workflow panel now reuses active selected-step maps across root/current/door component derivations, memoizes configured root component ids, and the dealership composer memoizes the dealer pricing snapshot so unrelated query/mutation renders do not recompute the full pricing model. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 17 `www` admin capability audit. The internal package-panel wrapper now resolves workflow settings capabilities from the host auth role and only wires supplier management, component editing, section overrides, redirects, and door-size variant settings for admin/super-admin roles, while leaving normal line-level selection removal available. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 18 dealership capability/security audit. The dealership quote surface now treats pricing edit permission as unavailable, keeps the mobile footer dealer-specific with Save/Update quote labels, and sends computed dealer line totals in save payloads so package-authored lines persist dealer-appropriate totals instead of stale `qty * unitPrice` fallbacks. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 19 feature flag/cutover strategy. `www` now has an explicit `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT` default flag plus URL/localStorage overrides for package-vs-legacy workflow panel testing, and Brain now records cutover owners, gates, and rollback criteria. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 20 dealership rollback plan. Brain now documents the honest dealership rollback path: revert the dealership deployment/branch to the last known-good pre-package composer while preserving package metadata readers and validating existing/new dealer quotes after rollback. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 21 `www` rollback plan. Brain now documents the internal rollback controls for returning to `ItemWorkflowPanel`: env default `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT=legacy`, URL/localStorage overrides, dev toggle behavior, and validation steps. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 22 legacy duplication removal plan. Brain now identifies the `www` legacy workflow code and rollback toggle as post-cutover deletion candidates only after browser QA and rollback signoff, while preserving package metadata readers, print/PDF fallbacks, and inventory sync fallbacks. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 23 dealership cutover readiness. Brain now records dealership non-browser readiness signals, required migration gate evidence, remaining browser QA blockers, and the linked dealership rollback plan. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 24 `www` internal cutover readiness. Brain now records `www` package-panel readiness behind the cutover flag, host-owned admin/calculator/supplier surfaces, required migration gates, browser blockers, and the linked `www` rollback plan. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 25 docs and Brain finalization. The package README now links the cutover/rollback runbooks and `brain/new-sales-form-phase0-task-map.md` now points to the completion roadmap, current phase state, gate rule, and browser-proof deferral. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.
- Completed completion-roadmap Phase 26 final migration gate stabilization. The migration harness now prints the tolerated `www` baseline-error rule when no watched migration files are mentioned, and Brain has a dedicated gate runbook documenting command scope, watched areas, and stop conditions. Gate: `bun run test:new-sales-form-migration` passed with 76 package tests and 15 dealer tests.

## 2026-05-13

- Implemented new sales form grouped moulding/service edit-save parity with the old sales form relational shape.
  - added shared grouping domain helpers in `packages/sales/src/sales-form/domain/grouping.ts` for grouped-line detection, legacy sibling collapse, and grouped projection expansion for legacy save
  - moved legacy grouped collapse behavior out of the API query path and into the shared sales-form domain so it can be tested directly
  - updated `getNewSalesForm` hydration so legacy `multiDykeUid` sibling groups reopen as one grouped UI parent with row-level `mouldingRows` / `serviceRows`, preserving row identity, HPT identity, tax/production flags, and moulding selected-component metadata
  - updated `saveNewSalesFormInternal` so grouped service/moulding lines expand back into one `SalesOrderItems` row per row projection, preserve existing `salesItemId` / `hptId`, revive edited rows by clearing `deletedAt`, create rows only for newly added grouped rows, and leave removed siblings soft-deleted
  - updated grouped moulding save to write one `HousePackageTools` row per moulding row with row-level product ids and `priceTags.moulding` pricing metadata
  - preserved row identity through service/moulding workflow calculators so UI edits do not drop persistence ids
  - added regression coverage for grouped collapse/expand, grouped service save, grouped moulding + HPT save, ID preservation, soft-delete semantics, and grouped step-family rendering
  - validation note:
    - `bun test packages/sales/src/sales-form/domain` passes
    - `bun test apps/api/src/db/queries/new-sales-form.multi-line.test.ts` passes
    - `bun test apps/api/src/db/queries/new-sales-form.test.ts` passes
    - `bun test apps/www/src/components/forms/new-sales-form/sections/item-workflow/step-family.test.ts` passes
    - `git diff --check` passes

## 2026-04-27

- Consolidated sales print/PDF orchestration behind a shared application service and route builder so sales CTAs stop duplicating print mode, token, and viewer-opening logic.
  - added `apps/www/src/modules/sales-print/application/sales-print-service.ts` as the source of truth for print mode normalization, access resolution dedupe, preview URL preparation, print viewer URL building, download orchestration, and pending print window lifecycle
  - converted `apps/www/src/lib/quick-print.ts` into a compatibility shim over that service instead of a second orchestration layer
  - migrated key CTA surfaces and helpers including `sales-menu`, `sales-menu-print`, sales print utils, sales preview preparation, dispatch packing previews, payment-triggered printing, quote acceptance, and sales form print buttons onto the shared service
  - extracted a shared sales print viewer page component used by both `/p/sales-invoice` and `/p/sales-invoice-v2` so the public print routes no longer duplicate their prefetch/render shell
  - added `apps/www/src/modules/sales-print/application/sales-print-service.test.ts` to cover canonical mode mapping, shared route building, and concurrent access-resolution dedupe
  - added `brain/decisions/ADR-007-sales-print-single-source-of-truth.md` to record the new architectural boundary
  - validation note:
    - `bun test apps/www/src/modules/sales-print/application/sales-print-service.test.ts` passes
    - `bun run --filter @gnd/www typecheck` still fails because of existing unrelated errors across the workspace, and filtered output also shows long-standing type issues in several touched legacy sales files

## 2026-04-22

- Fixed legacy sales invoice printing so persisted garage/HPT items still render when the order item exists but its nested door rows were not saved.
  - updated `packages/sales/src/sales-template/invoice-print-data.ts` to emit a fallback printable row for door-type items whose `housePackageTool` exists without any `doors`, preserving the saved item description, swing, qty, and pricing instead of dropping the line from the printout
  - added `packages/sales/src/sales-template/invoice-print-data.test.ts` to lock the regression with `02988PC`-style garage data
  - validation note:
    - `bun test packages/sales/src/sales-template/invoice-print-data.test.ts` passes
    - `bun test packages/sales/src/print/get-print-data.test.ts` passes

- Fixed new sales form door/HPT reopen hydration when persisted house-package rows referenced a door component that no longer existed in the Door step's selected metadata.
  - updated `packages/sales/src/sales-form/domain/selectors.ts` so `getSelectedDoorComponentsForLine(...)` can backfill selected door components from `selectedProdUids` and persisted `housePackageTool.doors[*].stepProductId` when the currently available door candidates are known
  - updated `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` so HPT sync/render and door-swap flows pass current visible door candidates into that selector, restoring the missing selected-door tab on reopened sales
  - added regression coverage in `packages/sales/src/sales-form/domain/selectors.test.ts` for the reopen case where Door options are visible but one selected door only survives in persisted HPT rows
  - validation note:
    - `bun test packages/sales/src/sales-form/domain/selectors.test.ts` passes
    - `bun test packages/sales/src/sales-form/domain/mutation-engine.test.ts` passes

- Added shared dev-only sales form version switching across the sales overview and sales list action menus.
  - created `apps/www/src/components/sales-form-version-menu-items.tsx` so the `v1`/`v2` form links and `v2` overview links are driven from one reusable menu block
  - updated `apps/www/src/components/sheets/sales-overview-sheet/general-action-bar.tsx` so the overview actions dropdown now exposes the dev-only form-version chooser while preserving the existing default edit button
  - updated `apps/www/src/components/tables/sales-orders/columns.tsx` and `apps/www/src/components/tables/sales-quotes/columns.tsx` so order/quote action menus now expose shared dev-only `Open with v1` / `Open with v2` entries instead of duplicating per-table wiring
  - validation note:
    - `bunx biome check apps/www/src/components/sales-form-version-menu-items.tsx apps/www/src/components/tables/sales-quotes/columns.tsx apps/www/src/components/sheets/sales-overview-sheet/general-action-bar.tsx` passes
    - `bunx biome check --write` on the touched file set still reports pre-existing `noExplicitAny` lint debt in `apps/www/src/components/tables/sales-orders/columns.tsx`; no new lint errors remained in the newly added shared menu slice

## 2026-04-21

- Added the first mobile packing-list integration to the Expo driver/dispatch app on top of the existing pickup packing contracts.
  - added a dedicated `/(drivers)/warehouse-packing` route in `apps/expo-app` and a new `PackingListScreen` powered by `dispatch.packingList`
  - added `usePackingList()` in the Expo dispatch feature so mobile now consumes the canonical packing queue contract instead of deriving packing work from the assigned-dispatch list
  - separated the warehouse packer entry from the driver dashboard by removing the driver-home shortcut and exposing the workspace from Settings as `Warehouse Packing`
  - reused the existing dispatch detail runtime as the item-level packing execution surface and added a warehouse-packing entry mode with a summary card for packed vs remaining work
  - extended mobile dispatch packing/status invalidation so `dispatch.packingList`, `dispatch.assignedDispatch`, and `dispatch.dispatchOverviewV2` all refresh after packing and dispatch status mutations
  - validation note:
    - `bunx biome format --write` ran for the touched Expo mobile dispatch files
    - `bunx biome check` on the touched file set still reports pre-existing lint debt in the long-lived dispatch detail files, especially `noExplicitAny` / import-order issues that were already present in that slice
    - `bunx tsc -p apps/expo-app/tsconfig.json --noEmit` still fails because of broad pre-existing workspace TypeScript issues across `apps/api` and `packages/sales`; no feature-specific regression signal was isolated from that baseline noise in-session

## 2026-04-17

- Reworked public quote acceptance to preserve the original quote and create a payable order through the existing send-to-invoice copy path.
  - updated `apps/api/src/db/queries/checkout.ts` so `acceptQuote` now reuses `copySales(... as: "order")` semantics instead of converting the quote row in place
  - persisted quote-acceptance metadata on both the original quote and the created order so repeat visits can resolve the accepted order without creating duplicates
  - updated `initializeQuoteAcceptance` to hydrate accepted-order state from the stored accepted order id and generate payment tokens from that created order
  - updated `apps/www/src/components/quote-acceptance-page.tsx` to store the accepted order id in `nuqs` query state and keep the public page anchored to the new order after acceptance/refresh
  - triggered the shared `simple_sales_document_email` notification flow after first-time acceptance so customers receive the new order/invoice email automatically
  - validation note:
    - `bunx biome format --write` ran for the touched checkout and quote-acceptance files
    - `bunx biome check` passes for the touched files
    - filtered API typecheck still reports existing baseline errors inside `apps/api/src/db/queries/checkout.ts` and broader workspace noise unrelated to this acceptance-flow slice, so no clean repo-wide TypeScript pass was available in-session

## 2026-04-16

- Started the new sales form resilience slice so the next parity pass reduces silent draft loss instead of only documenting it.
  - defaulted `apps/www/src/components/forms/new-sales-form/store.ts` autosave back to `true` for newly hydrated sessions
  - updated `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx` to persist local recovery snapshots on `pagehide` / `beforeunload`, not just the debounced timer path
  - added a risky-leave warning for same-tab navigation when the draft is dirty and autosave is off or the form is already in `error` / `stale` state
  - kept the existing recovery banner flow, but dismissal now confirms the user is intentionally keeping the latest server version instead of silently clearing the snapshot
  - added a narrow capability guard in `apps/api/src/db/queries/new-sales-form.ts` so `saveDraftNewSalesForm` only runs inventory-line sync when the DB client exposes the full sync surface, which restores lightweight query-test compatibility without changing production behavior
  - validation note:
    - targeted `bunx biome format --write` was run for the touched new-sales-form files
    - targeted `bunx biome check` passes for the touched `new-sales-form` web files and Brain docs
    - `bun test apps/api/src/db/queries/new-sales-form.test.ts` passes (`4 pass, 0 fail`)
    - `bun test apps/api/src/db/queries/new-sales-form.multi-line.test.ts` passes (`1 pass, 0 fail`)

- Added organized per-tab versioning to the v2 sales overview system and shipped a redesigned overview/general tab as the default `v2` experience.
  - added `apps/www/src/components/sales-overview-system/tab-versions.tsx` as the version resolver layer so tabs can switch between versions without changing the provider, shells, or access policy
  - introduced version-folder ownership for all current tabs:
    - `tabs/overview/v1.tsx`
    - `tabs/overview/v2.tsx`
    - `tabs/finance/v1.tsx`
    - `tabs/production/v1.tsx`
    - `tabs/dispatch/v1.tsx`
    - `tabs/packing/v1.tsx`
    - `tabs/transactions/v1.tsx`
    - `tabs/details/v1.tsx`
  - updated `apps/www/src/components/sales-overview-system/tab-registry.tsx` so content now resolves through the version registry while preserving the existing role-based visibility and quote gating
  - added reusable overview-v2 section components in `apps/www/src/components/sales-overview-system/sections/overview/overview-v2-sections.tsx`
  - rebuilt the overview tab as `tabs/overview/v2.tsx` with a clearer summary hero, health-status cards, better customer/order grouping, and separate address and invoice-breakdown sections
  - left the previous overview implementation available as `overview/v1` for low-risk fallback and future comparison
  - validation note:
    - targeted `bunx biome check` passes for the touched `sales-overview-system` files
    - workspace `apps/www` typecheck was started, but it did not finish within the quick validation window, so no clean full-slice TypeScript result was available in-session

## 2026-04-15

- Moved the sales-book accounting workspace into the sidebar-owned route tree and rebuilt the accounting + resolution pages around the current table/page standard.
  - added canonical sidebar route ownership for `/sales-book/accounting` and `/sales-book/accounting/resolution-center` under `apps/www/src/app/(sidebar)/(sales)/sales-book/...` and removed the duplicate clean-code route ownership for those URLs
  - extracted shared server page modules in `apps/www/src/components/sales-book/accounting-page.tsx` and `apps/www/src/components/sales-book/resolution-center-page.tsx` so both pages now stay thin, prefetch only the primary infinite table query, and stop blocking first paint on filter-list fetches
  - kept the newer `@gnd/ui/data-table` provider as the canonical table path and added standard empty/no-results behavior to the resolution-center table so it matches the accounting table flow
  - redirected legacy `/sales-book/reports` traffic into `/sales-book/accounting` and updated dashboard deep links that previously targeted the reports alias
  - follow-up optimization: rewrote `apps/api/src/db/queries/sales-resolution.ts` so the main resolution table no longer materializes the full candidate order set before paginating; it now scans DB-ordered chunks, classifies only enough rows to fill the requested page, and moves the full unresolved-count scan into a separate summary query consumed independently by the UI badge
  - follow-up optimization: trimmed `apps/api/src/db/queries/sales-accounting.ts` so the accounting list query stops selecting unused wallet/square/id fields and limits transaction history to the latest reason row needed by the table
  - validation note:
    - targeted `bunx biome check` passes for the new sidebar routes, shared page modules, resolution-center table, and updated leaderboard link
    - workspace-wide `bun run --filter @gnd/www typecheck` did not complete within the quick validation window, so only targeted lint/format validation was completed in this session

- Extended the sales activity chat to support mixed image/PDF attachments and clearer drag-and-drop uploads.
  - widened the shared web chat attachment mode in `apps/www/src/components/chat/chat.tsx` so attachment-enabled chats can accept both images and PDFs, render file chips for non-image uploads, and present a visible dashed dropzone in the composer
  - updated `apps/www/src/components/chat/activity-history.tsx` so sales activity timeline entries render PDFs/files as linked document cards instead of assuming every attachment is an image thumbnail
  - updated `apps/www/src/components/chat/chats/sales-overview-inbox.tsx` so the sales activity/inbound composer now allows mixed attachments on the `sales_info` and `inventory_inbound` channels
  - updated `apps/www/src/components/file-upload.tsx` and `apps/www/src/components/chat/README.md` to document and support chat-specific drag/drop copy for mixed uploads
  - validation note:
    - targeted `bunx biome check` is the intended validation step for the touched chat/upload files

- Reworked the pickup packing funnel onto the active sidebar + `/p/sales-invoice-v2` flow.
  - `Send for Pickup` now creates or reuses a pickup delivery in `queue` and records packing-workflow membership on the `sales-packing-list` notification channel
  - the canonical warehouse route now lives at `apps/www/src/app/(sidebar)/sales/packing-list/page.tsx`
  - the packing-list UI now has `Current`, `Completed`, and admin-only `Cancelled` tabs, backed by `dispatch.packingList({ tab })`
  - `Current` is driven by queued pickup deliveries, while `Completed` and `Cancelled` are scoped by `sales-packing-list` notification membership and current dispatch status
  - admin users can manage packing-list items directly from the card menu, including `Mark Completed`, `Cancel`, and move-back-to-queue actions
  - packing print now opens through `/p/sales-invoice-v2` in `packing-slip` mode instead of the deprecated `/printer/sales` flow
  - signing now lives on the v2 print surface only: the floating sign form records `Packed By`, `Received By`, customer signature, packs all items into the delivery, refreshes the page, and renders the saved signature through note-tag-backed print data
  - validation note:
    - targeted Biome checks pass for the new sidebar packing page, `packing-slip-sign-fab`, `/p` print viewer wiring, and updated PDF packing-slip blocks
    - broader API/package lint still reports pre-existing `any` usage and notification-service issues outside the new packing slice, so workspace-wide type/lint output is not yet a clean regression signal

## 2026-04-14

- Refactored the v2 sales overview system toward a cleaner feature-core contract and cheaper overview loading.
  - replaced the old `sales.getSaleOverview` implementation that routed through the broader sales list query with a dedicated overview query path in `apps/api/src/db/queries/sales.ts`
  - narrowed the route contract in `apps/api/src/trpc/routers/sales.route.ts` to a dedicated `getSaleOverviewSchema` so the overview surface no longer pays list-query composition cost just to open one order
  - reshaped `apps/www/src/components/sales-overview-system/provider.tsx` into an explicit `state / actions / meta` context contract and moved tab changes onto provider actions instead of leaking raw query-state wiring through the surface shells
  - added shared section primitives for cards, section labels, empty states, and progress bars so the overview, finance, production, dispatch, and details tabs reuse the same composition building blocks instead of duplicating local UI helpers
  - validation note:
    - `bunx biome check` passes for the touched `sales-overview-system` web files
    - `bunx tsc -p apps/api/tsconfig.json --noEmit --pretty false` still reports broad pre-existing repo errors outside this slice, so API typecheck could not be used as a clean regression signal for this change alone

- Cleaned up the legacy `sales-overview-sheet` orchestration layer so the old sheet is more maintainable while it still exists as a compatibility surface.
  - extracted legacy sheet mode resolution, tab registration, and active-tab fallback into dedicated `controller.tsx` and `types.ts`
  - extracted the header/tab chrome and panel rendering into `layout.tsx`, leaving `index.tsx` focused on sheet mounting and query-state updates
  - removed the overview-provider debug log and clarified provider state naming in `context.tsx` by using `query` consistently instead of the older ambiguous `ctx` field
  - tightened a few legacy rough edges in `production-tab.tsx` and `dispatch-tab.tsx` while touching the architecture: removed empty prop patterns, replaced loose equality checks, improved clickable item accessibility, and dropped a couple of `any` casts
  - validation note:
    - `bunx biome check` passes for the touched `sales-overview-sheet` files

- Added a dedicated `Inbound` tab to the legacy sales overview sheet.
  - extended the legacy sheet tab contract and query-state parsing to recognize `inbound`
  - updated `SalesOverviewInbox` with an `inbound` variant so the activity timeline can be filtered down to inbound-only channels while the composer stays focused on `inventory_inbound`
  - registered the new tab in the legacy sheet controller so it shows inbound-related notification activity plus the chat input for updates
  - validation note:
    - `bunx biome check` passes for the touched inbox, hook, and legacy-sheet controller files

- Wired the `sales_production_all_completed` notification channel end-to-end so production completion can dispatch through its own channel reliably.
  - added schema/tag definitions and notification job support in `packages/notifications/src/schemas.ts`
  - added runtime handler implementation in `packages/notifications/src/types/sales-production-all-completed.ts`
  - registered the channel in `packages/notifications/src/index.ts` and `packages/notifications/src/notification-center.ts`
  - updated the sales order production-complete trigger in `apps/www/src/components/tables/sales-orders/columns.tsx` to send `sales_production_all_completed`

- Added a manual `inventory_inbound` sales-overview chat channel with image attachment support in the shared web chat library.
  - added `inventory_inbound` to `packages/notifications/src/channels.ts` and introduced a dedicated handler in `packages/notifications/src/types/inventory-inbound.ts`
  - extended the shared web `Chat` component in `apps/www/src/components/chat/chat.tsx` with attachment props/state:
    - `attachmentName`
    - `attachmentType`
    - `multiAttachmentSupport`
    - optional channel/path gating for attachment-enabled flows
  - reused the shared blob uploader in `apps/www/src/components/file-upload.tsx` so chat flows can enforce image-only uploads while preserving the existing default uploader behavior elsewhere
  - updated `apps/www/src/components/chat/chats/sales-overview-inbox.tsx` so sales overview chat now offers both `sales_info` and `inventory_inbound`, with image attachments enabled only for the inbound channel
  - updated `apps/www/src/components/chat/activity-history.tsx` so activity timeline rows render image attachments stored on the `attachment` tag
  - documented the attachment-enabled chat usage in `apps/www/src/components/chat/README.md`
  - validation note:
    - `bunx biome check` passes for the touched chat/notification files
    - workspace `@gnd/www` and `@gnd/notifications` typechecks still fail due unrelated pre-existing repo errors outside this slice

## 2026-04-13

- Added category-level stock mode so inventory behavior can be defaulted from the category instead of only per-product.
  - extended `InventoryCategory` in both Prisma schemas with `stockMode`
  - extended `packages/inventory/src/schema.ts` and `packages/inventory/src/inventory.ts` so category forms now save/load `stockMode` and category queries expose it to the web app
  - updated the inventory category form to let admins choose a default stock mode per category
  - updated the inventory product form so, when creating/editing a non-component product, selecting a category now applies that category’s stock-mode default to `product.stockMonitor`
  - this lets categories like `Door` centrally default to monitored stock behavior instead of relying on product-by-product toggles
  - validation note:
    - `bun run db:generate` succeeds
    - `bun run --filter @gnd/inventory typecheck` passes

- Reworked supplier management into a shared compact inventory-domain workspace and threaded supplier choice into variant filtering.
  - supplier filter options from `inventoryVariantStockForm(...)` are now exposed into the inventory variant pills whenever supplier-variant rows exist, and the client-side filter matcher in `apps/www/src/components/forms/inventory-products/context.tsx` treats `Supplier` as a first-class exact-match filter against `supplierVariants`
  - replaced the old raw supplier field-array editor in `apps/www/src/components/forms/inventory-products/inventory-suppliers-section.tsx` with the shared `apps/www/src/components/inventory/inventory-suppliers-manager.tsx` flow: compact item rows, search + add, inline `Create new "Supplier"` action, Dyke sync, and per-supplier `Default / Edit / Delete` actions
  - added a dedicated `/inventory/suppliers` page via `apps/www/src/app/(sidebar)/inventory/suppliers/page.tsx` and `apps/www/src/components/inventory/inventory-suppliers-page.tsx`, plus the new sidebar link in `apps/www/src/components/sidebar/links.ts`
  - added `Inventory.defaultSupplierId` wiring through the inventory form/query/save path and used it as the default supplier when creating new variant supplier-pricing rows
  - validation note:
    - `bun run db:generate` succeeds
    - `bun run --filter @gnd/inventory typecheck` passes

- Converted inventory kind review from a full dataset load into a paged infinite workflow.
  - added `inventoryProductKindReviewSchema` in `packages/inventory/src/schema.ts` so the review endpoint now accepts the shared pagination contract
  - updated `packages/inventory/src/inventory.ts` so `inventoryProductKindReview(...)` uses `composeQueryData(...)` for paged row loading, returns summary counts separately, and computes page-level pricing heuristics from a lightweight priced-ID lookup instead of hydrating every nested variant/pricing row
  - updated `apps/api/src/trpc/routers/inventories.route.ts` so `inventories.inventoryProductKindReview` now accepts the paged input
  - updated `apps/www/src/components/inventory/inventory-kind-review-page.tsx` to use `infiniteQueryOptions(...)`, auto-load more on scroll, and keep the summary cards driven by the first page’s summary block
  - validation note:
    - `bun run --filter @gnd/inventory typecheck` passes

- Constrained inventory form variant filters to the inventory's configured subcategory values instead of exposing every category value.
  - updated `packages/inventory/src/inventory.ts` so `inventoryVariantStockForm(...)` now loads the inventory's active `inventoryItemSubCategories` and trims category attribute values to the explicitly configured inventory IDs for matching attribute labels before generating variant combinations and filter params
  - tightened `apps/www/src/components/forms/inventory-products/context.tsx` so variant attribute filter matching now uses exact equality instead of substring matching
  - this means if an inventory configures a subcategory such as `Item Type` with only `INTERIOR PRE-HUNG` and `DOOR SLABS ONLY`, the form filter for `Item Type` now only offers those values
  - validation note:
    - `bun run --filter @gnd/inventory typecheck` passes

- Reused door size variation rules from Dyke step meta inside the inventory form so width options and visible variants narrow to the same relevant combinations used in sales.
  - updated `packages/inventory/src/inventory.ts` so `inventoryVariantStockForm(...)` now loads the source Dyke step meta from `Inventory.sourceStepUid`, returns `doorSizeVariation`, and preserves imported value-source metadata (`sourceStepUid`, `sourceComponentUid`) in filter options
  - updated `apps/www/src/components/forms/inventory-products/context.tsx` so the inventory variant filters build a selected-step map from filter choices, compute allowed width values from `doorSizeVariation`, auto-clear invalid width selections when controlling filters change, and hide non-matching width variants/options from the inventory form
  - this keeps door inventories aligned with the sales/storefront rule system instead of exposing impossible width combinations after import
  - validation note:
    - `bun run --filter @gnd/inventory typecheck` passes

- Canonicalized Dyke door supplier pricing into inventory-native supplier records instead of relying on legacy pricing buckets.
  - updated `packages/inventory/src/application/jobs/run-full-import.ts` and `packages/inventory/src/application/import/inventory-import-service.ts` so inventory import now auto-runs `syncInventorySuppliersFromDyke(...)` before importing categories/steps
  - extended both inventory import strategies to parse supplier-specific Dyke pricing keys and upsert canonical `SupplierVariant` rows through shared helpers in `packages/inventory/src/application/suppliers/suppliers.ts`
  - added size/pricing-key metadata to imported supplier-variant rows so supplier pricing can be matched more safely for door size selections
  - removed supplier dep-key bucket fallback from the sales pricing resolver in `packages/sales/src/sales-form/domain/workflow-calculators.ts`; supplier-specific door/HPT pricing is now expected to come from `SupplierVariant`
  - added `inventories.inventorySupplierDykeReview` and surfaced a Dyke supplier matching review panel in `apps/www/src/components/forms/inventory-products/inventory-suppliers-section.tsx` so UID/name mismatches are visible in the inventory UI
  - validation note:
    - `bun run --filter @gnd/inventory typecheck` passes
    - `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` passes
    - next practical verification is a browser/import rerun with real door data to confirm `SupplierVariant` rows are being populated and unmatched Dyke suppliers are correctly surfaced

- Tightened sales-to-inventory fulfillment so only monitored inventory participates in stock allocation and inbound shortage generation.
  - updated `packages/sales/src/sync-sales-inventory-line-items.ts` so `syncComponentFulfillment(...)` first checks the parent inventory `stockMode` through the variant
  - if `stockMode !== "monitored"`, the sync now releases any existing `StockAllocation`, cancels any existing `InboundDemand`, and keeps the demand row out of the inbound workflow
  - if `stockMode === "monitored"`, allocation and shortage behavior continues as before: allocate from stock first, then create `InboundDemand` for the shortage
  - this aligns `/inventory/inbounds` with stock-tracked items only instead of all demand rows

- Extended the inventory import pipeline to preserve Dyke custom components without polluting the default inventory workspace.
  - added import-source labeling on `Inventory` with `sourceStepUid`, `sourceComponentUid`, and `sourceCustom` in the DB and jobs Prisma schemas
  - updated both optimized and handcrafted importers to persist those source labels when creating imported inventory rows
  - added `backfillInventoryImportSources()` and exposed it through `inventories.backfillInventoryImportSources` so existing imported rows can be labeled retroactively
  - updated inventory list filtering to exclude `sourceCustom = true` by default while keeping a `Show Custom` toggle in the inventory header
  - added a `Custom` badge in the inventory products table so imported custom rows remain visible and explainable when intentionally included
  - extended the imports control center and scope breakdown so they now show standard-vs-custom Dyke product counts and imported standard-vs-custom row counts per step, plus a stale-custom-import signal
  - tightened default operational boundaries so low-stock alerts, storefront product search, and inbound extraction matching now exclude `sourceCustom = true` by default alongside the existing `productKind = inventory` rules
  - validation note:
    - `bun run db:generate` succeeds after the schema change
    - `bun run --filter @gnd/inventory typecheck` passes after the backfill helper/type cleanup

- Split inventory categories and component categories into an explicit category-kind boundary instead of keeping one mixed category source.
  - added `InventoryCategory.productKind` in the Prisma schemas so category kind no longer has to be inferred from related products
  - extended category list/query contracts so both `inventoryCategories` and `getInventoryCategories` can filter by `productKind`
  - updated inventory product forms to request category lists by the active product kind
  - updated sub-component and sub-category selectors so they explicitly request `component` or `inventory` categories as appropriate
  - updated the categories workspace to default to inventory categories and added inventory/component category switching through the existing category page flow
  - validation note:
    - `bun run db:generate` succeeds after the schema change
    - `bun run --filter @gnd/inventory typecheck` passes

- Replaced the placeholder low-stock widget on the inventory page with a real inventory-domain alert feed.
  - implemented `lowStockSummary()` in `packages/inventory/src/inventory.ts`
  - exposed the feed through `inventories.lowStockSummary` in `apps/api/src/trpc/routers/inventories.route.ts`
  - rewired `apps/www/src/components/widgets/inventory-stock-alert-widget.tsx` off the unrelated sales-dashboard KPI query and onto the new inventory query
  - the widget now shows actual monitored inventory variants whose stock is at or below their `lowStockAlert` threshold, plus an internal loading skeleton and empty state

- Strengthened the Brain architecture rules so Midday is now treated as the primary reference for page architecture, loading strategy, and code organization rather than just a loose inspiration.
  - updated `brain/engineering/ai-rules.md` to explicitly require studying the real local Midday repo before building/refactoring page/workspace architecture
  - updated `brain/engineering/coding-standards.md` to make Midday-style structure part of codebase organization rules, not just loading/performance guidance
  - updated `brain/AI_WORKFLOW.md` so AI contributors use Midday as an architecture teacher for thin routes, focused sections, and deferred detail loading
  - added a dedicated `Midday-First Reference Rule` section to `brain/system/architecture-guide.md`
  - this is intended to keep future page work faster on first paint and better organized at the file/module level
## 2026-04-11

- Started consolidating legacy Dyke authoring logic into the inventory domain instead of leaving business writes in `apps/www`.
  - added inventory-domain services for Dyke component save/update and pricing update:
    - `packages/inventory/src/application/definitions/dyke-step-components.ts`
    - `packages/inventory/src/application/pricing/update-dyke-component-pricing.ts`
  - exposed those through `inventories` tRPC with:
    - `saveDykeStepComponent`
    - `updateDykeComponentPricing`
    - `dykeInventoryDriftReport`
    - `repairSalesInventorySync`
  - added a dedicated async job/task contract for targeted Dyke step sync:
    - task name `sync-dyke-step-to-inventory`
    - task file `packages/jobs/src/tasks/inventory/sync-dyke-step-to-inventory.ts`
  - switched the active legacy custom-component form away from `next-safe-action` server actions and onto the new inventories tRPC mutations so the active write path now goes through `@gnd/inventory`
  - added a first structural drift report for Dyke component UIDs missing inventory or variant rows so migration gaps are visible instead of implicit
  - validation note:
    - targeted package/workspace typechecks were run after the migration slice; any failures should be interpreted against existing workspace noise first, because this repo already contains unrelated pre-existing type errors in some packages
    - the active custom-component flow should now be browser-checked once to confirm save + price update + targeted sync all behave cleanly end to end

- Added the first inventory-native supplier layer for door pricing migration.
  - extended inventory schema direction to use:
    - `Supplier` as the vendor entity with legacy Dyke supplier UID bridge
    - `SupplierVariant` as the per-variant supplier pricing/procurement record
  - added inventory-domain supplier utilities in `packages/inventory/src/application/suppliers/suppliers.ts`
    - legacy door supplier pricing key builder
    - Dyke `"Supplier"` step sync into inventory suppliers by UID/name
  - extended inventory save/load/query surfaces so inventory forms now include:
    - managed supplier list
    - per-variant supplier pricing rows
  - extended inventories tRPC with supplier-focused endpoints:
    - `inventorySuppliers`
    - `syncInventorySuppliersFromDyke`
    - `saveInventorySupplier`
    - `supplierVariantsByInventory`
    - `saveSupplierVariantForm`
  - updated the inventory form UI to include:
    - supplier management section in the main inventory form
    - supplier pricing editor inside each variant pricing tab
  - validation note:
    - `bun run db:generate` succeeds after the supplier schema changes
    - `bun run --filter @gnd/inventory typecheck` passes
    - focused API grep for the touched supplier slice comes back clean; full web workspace type health still contains broader unrelated noise

- Wired sales door pricing into the new supplier domain without breaking legacy supplier-key behavior.
  - extended `packages/sales/src/sales-form/domain/workflow-calculators.ts` so:
    - `resolvePricingBucketUnitPrice(...)` now prefers an exact `SupplierVariant` match by legacy supplier UID before consulting legacy pricing buckets
    - `resolveDoorTierPricing(...)` now prefers an exact `SupplierVariant` match by supplier UID, derives sales price from supplier cost when needed, and still preserves the old "no generic size fallback when a supplier was explicitly chosen" behavior
  - extended component snapshots in the active sales form and shared sales-domain mutation/selectors so `supplierVariants`, `inventoryId`, and `inventoryVariantId` survive route selection and repricing flows
  - updated the active new-sales-form door pricing call sites so live repricing paths pass `supplierVariants` into the shared resolver
  - fixed the inventory form package-resolution regression by switching the client form context to `@gnd/inventory/schema` and adding `@gnd/inventory` to `apps/www/package.json`
  - validation note:
    - `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` passes with new supplier-variant coverage
    - focused `@gnd/www` / `@gnd/sales` grep checks were started for the touched files; they produced no immediate hits for the import-resolution issue before the long-running workspace typecheck noise kicked in

- Added the first real inventory/component separation in the inventory domain.
  - extended `Inventory` with a `productKind` field (`inventory` vs `component`) in both Prisma schemas
  - extended inventory package schemas and save/load/list logic so:
    - product forms persist `product.productKind`
    - inventory list queries can filter by `productKind`
    - component saves force stock mode back to `unmonitored`
  - updated both handcrafted and optimized Dyke importers so new imported rows default to:
    - `inventory` when the Dyke step product has meaningful price data
    - `component` when it is an unpriced dependency/configuration item
  - added `backfillInventoryProductKinds()` and exposed it through inventories tRPC so existing mixed data can be reclassified with the rule:
    - meaningful price present => `inventory`
    - otherwise => `component`
  - updated the inventory UI to support the split:
    - inventory/components toggle in the header
    - backfill action button in the header
    - new product defaulting from the active tab
    - inventory form `Product Type` selector
    - component mode hides variant/pricing and supplier sections plus stock monitoring controls
    - inventory table now shows the current product kind badge
  - validation note:
    - follow-up verification is Prisma generation plus focused inventory/web typecheck on the touched files; full repo type health still includes unrelated pre-existing noise

- Tightened the inventory/component split into an operational admin workflow instead of just a schema label.
  - storefront search now hard-filters to `productKind = inventory`
  - inbound extraction matching now only suggests real inventory items, excluding `component` rows from receiving
  - main `/inventory` page now defaults to sellable inventory, and a dedicated `/inventory/components` page was added for component-only review
  - added `/inventory/review` with a mismatch report that compares current `productKind` to the pricing-based suggested kind, plus a one-click backfill action
  - added the new `Components` and `Kind Review` links to the dev-only inventory sidebar module
  - validation note:
    - focused `@gnd/inventory` typecheck passes
    - focused greps for the touched `@gnd/api` files returned no hits after the community type-import cleanup
    - the web-focused grep stayed quiet for the touched inventory files, but full `@gnd/www` typecheck remains a noisy workspace-wide signal outside this slice

- Reworked the inventory imports page away from per-category actions into a control-center workspace.
  - replaced the old imports page shell with `InventoryImportControlCenter`
  - added global actions for:
    - `Update Inventory`
    - `System Check`
    - `Full Refresh`
    - `Reset Only`
  - surfaced live import analytics from the existing import dataset plus system checks from product-kind review and import coverage
  - kept the old category import table only as a lower read-only “Legacy Breakdown” diagnostic section
  - removed per-row import actions from the legacy import table so the primary workflow is no longer category-by-category
  - added a visible in-product fixed note on the imports control center so operators can see that the optimized importer’s duplicate-creation paths were hardened for repeat runs
  - moved `Update Inventory` / `System Check` / `Full Refresh` off the synchronous tRPC loop and onto the existing Trigger full-import jobs; the imports page now queues the run, tracks job status, and refreshes analytics after completion instead of blocking the request for the whole import
  - validation note:
    - focused import-area checks were started for the touched web/api files, but the workspace typecheck remains long-running/noisy; no targeted regression surfaced before wrap-up

- Moved inventory import scope off “all Dyke steps” and onto the active sales-settings route graph.
  - added `resolveActiveInventoryImportScope()` in `packages/inventory/src/application/import/resolve-active-inventory-import-scope.ts`
  - the resolver now reads `sales-settings`, reconstructs the configured route graph, identifies the active root step, and expands the import universe by dependency closure:
    - route-sequence steps
    - redirect steps
    - variation-linked steps
    - price-system linked steps
    - dependency-token owner steps
    - Width/Height support steps when active dependencies require them
  - extended inventory import schemas with `scope: "active" | "all"` and made `active` the default for both analytics and full import runs
  - updated `runFullInventoryImport()` so full import uses only active-scope step ids unless an explicit `all` scope is requested
  - updated `inventoryImport()` analytics to report:
    - in-scope rows
    - dependency-only rows
    - excluded Dyke steps
    - stale imported categories that are no longer in active scope
  - updated `inventoryUpdateFromDyke()` so targeted syncs now skip out-of-scope steps instead of re-importing dead Dyke areas back into inventory
  - updated the imports control center and lower breakdown table so the UI can switch between `Active Scope` and `All Dyke`, with active scope as the primary workflow
  - validation note:
    - `bun run --filter @gnd/inventory typecheck` passes after the scope-resolver/import-run changes
    - the broader `@gnd/www` workspace typecheck was still running under existing repo-wide noise when this slice wrapped, so browser verification on `/inventory/imports` is still recommended

- Simplified the shared inventory workspace layout so only the main inventory screen behaves like a dashboard.
  - removed the old shared `InventoryTabs` bar from the inventory layout and deleted the component entirely
  - stopped injecting the generic inventory summary widgets and stock-alert widget from `apps/www/src/app/(sidebar)/inventory/layout.tsx`
  - moved `InventorySummaryWidgets` and `InventoryStockAlertWidget` onto the main `/inventory` page so analytics stay on the primary inventory screen only
  - left inventory subpages like components, imports, inbounds, and review as focused workspaces without inheriting the generic dashboard shell
  - validation note:
    - searched the web app for leftover `InventoryTabs` references and confirmed the shared tab component is no longer used

- Moved inventory out of the sales route-group boundary and into its own App Router domain.
  - relocated the full inventory page tree from `apps/www/src/app/(sidebar)/(sales)/inventory` to `apps/www/src/app/(sidebar)/inventory`
  - preserved all public `/inventory/...` URLs because Next route groups do not affect the URL path
  - confirmed there was no `(sales)`-specific layout wrapping inventory, so the move did not drop any route-group providers
  - this makes the codebase reflect the product direction more accurately: inventory is now its own workspace instead of a sales-owned subtree

- Started the inventory demand/allocation groundwork so sales-driven inventory sync can move toward the canonical stock and inbound system instead of a parallel supply layer.
  - added deterministic sales-to-inventory sync foundations in `packages/sales/src/sync-sales-inventory-line-items.ts` so sales items can resolve inventory-backed parent `LineItem` rows and component demand from Dyke step selections, shelf items, HPT products, and HPT door products using stable source UIDs
  - added old-form background task triggering and new-form inline sync wiring so both sales save paths now feed the same shared inventory sync entrypoint
  - updated `packages/db/src/schema/inventory.prisma` and `packages/jobs/src/schema.prisma` to model inventory demand fulfillment in three layers:
    - `LineItemComponents` remains the demand row and now carries `qtyAllocated`, `qtyInbound`, `qtyReceived`, and `status`
    - new `StockAllocation` model tracks stock-side assignment / reservation against a line-item component
    - new `InboundDemand` model tracks shortage/replenishment and links forward to `InboundShipmentItem`
  - documented the active workstream in `brain/tasks/in-progress.md` so the next major slice can focus on stock availability checks, shortage creation, and receiving-posting against `InboundShipmentItem` plus `StockMovement`
  - validation note:
    - `packages/jobs/src/schema.prisma` validates successfully with Prisma using a dummy `DATABASE_URL`
    - the standalone `packages/db/src/schema/inventory.prisma` fragment cannot be validated in isolation because it references composed cross-domain models; the full composed DB schema already has unrelated pre-existing validation issues outside this inventory slice

- Extended the sales inventory sync so component demand now splits into stock allocation and inbound shortage.
  - `packages/sales/src/sync-sales-inventory-line-items.ts` now checks `InventoryStock` for the component variant, allocates available quantity into `StockAllocation`, and creates `InboundDemand` only for the remaining shortage
  - component sync now updates `LineItemComponents.qtyAllocated`, `qtyInbound`, `qtyReceived`, and `status` after each upsert so the demand row reflects whether it is fully allocated, partially allocated, or still waiting on inbound
  - stale sales component cleanup now also releases/cancels related `StockAllocation` and `InboundDemand` rows before deleting obsolete component demand
  - validation note:
    - focused `@gnd/sales` typecheck grep for `sync-sales-inventory-line-items.ts` is clean after the new fulfillment logic
    - the main DB Prisma generation path works when run through `packages/db` Prisma config or the root workspace command `bun run db:generate`; updated the root script to use `bun run --filter @gnd/db db:generate` instead of the Turbo interactive task wrapper
    - after regenerating the Prisma client, removed the temporary `any` delegate fallbacks from the sync service so `StockAllocation` and `InboundDemand` writes are back on the typed Prisma surface

- Added the first inventory-native inbound bridge so replenishment demand can flow into receiving and stock posting without a parallel side system.
  - added `packages/inventory/src/application/inbound/inbound-demand.ts` with `createInboundShipmentFromDemands(...)` to group shortage rows into `InboundShipment` + `InboundShipmentItem` records and link `InboundDemand` rows forward to the created inbound items
  - added `receiveInboundShipment(...)` to post received quantities into `InventoryStock`, create `StockMovement` audit rows, update linked `InboundDemand.qtyReceived/status`, and recompute parent `LineItemComponents` demand progress
  - exported the new inbound helpers from `@gnd/inventory` so API and job layers can build receiving tray workflows on top of the shared service instead of inventing another receipt path
  - validation note:
    - next check is focused type validation on the new inbound helper surface; full package-wide type health is still expected to show unrelated pre-existing issues outside this slice

- Added the first API layer on top of the inbound bridge so the web app can start building a receiving tray against the shared inventory workflow.
  - extended `apps/api/src/trpc/routers/inventories.route.ts` with:
    - `inboundDemandQueue`
    - `inboundShipmentDetail`
    - `createInboundShipmentFromDemands`
    - `receiveInboundShipment`
  - added shared inventory-side query helpers in `packages/inventory/src/application/inbound/inbound-demand.ts` so the API router stays thin and consumes the same package-level primitives that jobs and future receiving flows can reuse
  - exported the inbound module through `packages/inventory/src/application/inbound/index.ts`, `packages/inventory/src/index.ts`, and `packages/inventory/package.json`
  - validation note:
    - focused `@gnd/inventory` and `apps/api` typecheck greps for the new inbound helpers and router procedures are clean
    - `apps/api` still contains unrelated pre-existing type errors outside these new receiving endpoints

- Implemented the first end-to-end receiving workspace for inventory inbounds.
  - extended the inventory schema with `InboundShipmentExtraction` and `InboundShipmentExtractionLine` so AI receipt parsing has a durable review/match surface tied to existing `InboundShipment`
  - reused the shared `StoredDocument` platform for inbound receipt snaps under owner type `inventory_inbound_shipment` and kind `inbound_receipt` instead of creating another file table
  - added `apps/api/src/db/queries/inbound-receiving.ts` to handle:
    - blank inbound creation
    - supplier listing
    - receipt document upload
    - AI extraction requests
    - extraction-to-inbound-item application
    - demand assignment to existing inbound shipments
    - inbound activity history queries
  - extended `inventories.route.ts` again with shipment list, supplier list, receipt upload, extraction, extraction review, assignment, and activity procedures
  - added an inventory inbound notification channel (`inventory_inbound_activity`) in `packages/notifications` so receipt upload / extraction / assignment / receiving can flow through the existing activity + notification pipeline
  - replaced the placeholder `/inventory/inbounds` page with a functional receiving workspace in `apps/www/src/components/inventory/inbound-receiving-page.tsx`
    - shortage demand tray
    - inbound shipment list
    - receipt document upload
    - AI extraction review/apply
    - linked-order assignment
    - receive/post to stock
    - inbound activity timeline
  - validation note:
    - `bun run db:generate` succeeds after the new extraction models were added
    - focused `@gnd/inventory`, `@gnd/notifications`, and `@gnd/api` greps for the new inbound slice are clean
    - `apps/www` full workspace typecheck remains slower/noisier; no focused inbound-specific grep hits were surfaced in the final web pass before timeout

- Added manual stock-allocation approval and inbound issue resolution on top of the inventory demand pipeline.
  - extended the inventory/job Prisma schemas so:
    - `StockAllocationStatus` now includes `pending_review`, `approved`, and `cancelled`
    - `InboundStatus` now includes `issue_open` and `closed`
    - `InboundShipmentItem` stores `qtyGood` and `qtyIssue`
    - `InboundShipmentItemIssue` tracks discrepancy rows with issue type, resolution type, reported qty, resolved qty, and status
  - updated `packages/sales/src/sync-sales-inventory-line-items.ts` so stock-monitored fulfillment now creates suggested `StockAllocation` rows as `pending_review` instead of silently committing all reservations, while approved allocations remain the only committed stock signal
  - added allocation review helpers and tRPC endpoints:
    - `pendingAllocations`
    - `approveStockAllocation`
    - `rejectStockAllocation`
    - `approveBulkStockAllocation`
  - added `/inventory/allocations` with an infinite review queue and per-row/bulk approve/reject controls
  - updated `packages/inventory/src/application/inbound/inbound-demand.ts` so receiving can accept `qtyGood`, `qtyIssue`, issue type, and issue notes; only good qty posts to stock while issue qty creates `InboundShipmentItemIssue`
  - extended `/inventory/inbounds` to capture issue qty/details during receiving and resolve existing issue rows inline with replacement/return/credit/write-off style resolution choices
  - validation note:
    - `bun run db:generate` succeeds
    - `bun run --filter @gnd/inventory typecheck` passes
    - broader `@gnd/api` and `@gnd/www` workspace typechecks still contain heavy unrelated pre-existing noise, so browser validation is still needed for the new allocation/inbound screens

## 2026-04-10

- Migrated the web app off `components/_v1/icons` onto `@gnd/ui/icons`.
  - added the legacy branding/logo icons and the missing `documents` alias directly to `packages/ui/src/components/icons.tsx`
  - replaced `apps/www` imports that referenced `_v1/icons` with `@gnd/ui/icons`
  - converted `apps/www/src/components/_v1/icons.tsx` into a thin compatibility re-export so any stragglers still resolve to the shared UI icon registry

- Moved notification channel built-in sync out of the read query and into an explicit mutation.
  - `packages/notifications/src/channels-query.ts` now loads channels without creating/restoring built-in rows during page fetch
  - the list response now exposes `meta.staticUpdateChecker` so the UI can tell when built-in channels are out of sync
  - added a new `notes.syncNotificationChannels` mutation in `apps/api` to create or restore built-in channels on demand
  - updated the v2 settings UI to show an `Update Channels` button whenever the query reports missing built-in definitions

- Rebuilt notification channels as a new v2 settings page at `/settings/notification-channels/v2`.
  - replaced the old suspense-heavy notification-channels entrypoint with a redirect to the new v2 route
  - added a simpler client-driven master-detail UI that uses plain tRPC queries with explicit loading states instead of the previous infinite-table loader
  - wired role assignment, delivery-method toggles, and manual subscriber add/remove into the new screen
  - updated the sidebar settings link to open the new v2 page directly
  - validation note: focused `biome check` passes for the new web route and component files; `apps/api/src/db/queries/note.ts` and `apps/api/src/trpc/routers/notes.route.ts` still carry unrelated pre-existing lint issues outside this rebuild

- Fixed the web notification-channels query contract so the settings page can resolve its shared infinite-table loader reliably.
  - updated `packages/notifications/src/channels-query.ts` to return paginated `{ data, meta }` responses via `composeQueryData`, matching the table/query expectations used across the web app
  - added support for the `q` search parameter in notification-channel filtering so the page search box and route input stay aligned
  - preserved the built-in channel auto-restore/create behavior before the paginated fetch runs
  - validation note: `bunx biome check packages/notifications/src/channels-query.ts` passes; workspace `@gnd/api` and `@gnd/notifications` typechecks still fail due to unrelated pre-existing errors in other files

## 2026-04-08

- Reduced Trigger startup cost for the duplicated sales email tasks.
  - extracted the sales email payload schema into a small task-local module and re-exported it from `@gnd/jobs/schema` so callers keep the same public import surface
  - replaced the duplicated `send-sales-email` and `sales-rep-payment-received-notification` task bodies with one shared factory in `packages/jobs`
  - moved DB, resend, email-template, `qs`, and env URL loading behind the task `run()` path so Trigger can register the tasks without eagerly loading the heavier runtime stack
  - renamed the sales-rep task export to `salesRepPaymentReceivedNotification` so the file no longer exports a second misleading `sendSalesEmail` symbol

- Added a background unit-invoice duplicate sweeper.
  - unit-invoice modal open now silently triggers a background task that checks invoice-task duplicates without blocking the modal load
  - the invoice form still dedupes tasks in-memory immediately, but duplicate cleanup now also happens server-side without waiting for a user save
  - sweeper progress is tracked in its own `unit-invoice-sweeper-settings` row with `lastStartedAt`, `lastCompletedAt`, `running`, and a compact last-run summary
  - changed-unit detection uses the last completed sweep timestamp against `home.createdAt`, `homeTask.createdAt`, and `homeTask.updatedAt`
  - when duplicate rows are removed, the kept task now preserves or restores `builderTaskId` by promoting it from duplicates first and then resolving it from the builder task catalog if needed

- Added the Community Invoice Task Detail PDF report.
  - introduced a second invoice report type, `Task-Level Invoice Detail Report`, in the shared unit-invoice report dropdown
  - added a dedicated public print route at `/p/community-invoice/task-detail-report`
  - built the backend report query on `HomeTasks` so the report is task-grain, grouped by project, and units sort by `lot` then `block`
  - derived `Cost` and `Tax` from invoice task finance fields using `amountDue` and `taxCost`, while preserving negative paid values in open-balance math
  - added compact summary grids for overall, project, and unit totals to reduce print whitespace and keep the PDF more corporate/space-efficient
  - standardized community invoice report launching so aging and task-detail share the same tokenized print flow and no-filter confirmation pattern

## 2026-04-07

- Added contractor payout reversal validation, notifications, and activity history.
  - cancelled payouts can now be reversed only when every stored payout job still exists, remains unpaid, matches the stored contractor, keeps the same amount, and sums back to the stored payout subtotal
  - failed reversal attempts now stop with `Payout can not be reversed.` and emit a `payout_issues` activity/notification trail for the affected contractor payout
  - successful cancellation and reversal actions now emit dedicated `payout_cancelled` and `payout_reversed` notification channels alongside tagged payout notes
  - payout overview page and modal now swap between cancel and reverse actions based on current payout state and show an activity history timeline keyed by `paymentId`

- Added retained contractor payout cancellation with job reversion.
  - payout creation now stores per-job payment snapshots in `JobPayments.meta` so history and print views can survive later cancellation
  - cancelling a payout now keeps the payment record, stamps cancellation metadata in `meta`, detaches linked jobs, and restores each job back to its pre-payment unpaid status
  - contractor payout history, overview, and print views now continue to show cancelled payouts with original job details sourced from the stored snapshot
  - added cancel actions to the payout overview page and modal, plus cancelled badges in the payout history list

- Added contractor payroll PDF generation in the payment portal.
  - introduced a dedicated `payroll-report` jobs print context in the shared token and backend print-data contract
  - moved `Generate Payroll Report` to the top of the payment portal and changed it from a contractor-specific print to a full unpaid-jobs payroll report
  - payroll reports now generate an overall first page for all unpaid jobs, followed by contractor breakdown pages with job rows and status-based totals
  - reused the existing tokenized `p/jobs` print route while making payroll reports server-authoritative through an all-unpaid report scope on the backend
  - updated the shared jobs PDF template to render a dedicated payroll layout instead of reusing the selected-jobs print framing

- Expanded payment portal payouts to allow selected unpaid jobs even when they are not yet approved.
  - payment portal lists now keep unpaid `Assigned` and `Started` jobs visible instead of hiding them from the default all-jobs view
  - payout summary now shows warning rows grouped by status when selected jobs will be auto-approved during payment, with one-click removal per warning group
  - payment creation now accepts all unpaid selected jobs, records which ones were auto-approved in payment metadata, and still marks the final paid jobs with updated payment linkage and paid status

- Reorganized the jobs PDF package into a feature-based domain layout.
  - split the old monolithic jobs PDF document into `jobs/shared`, `jobs/selection`, and `jobs/payroll`
  - kept `JobsPdfDocument` as a thin dispatcher so callers still use one stable entry point while each feature owns its own PDF implementation
  - moved shared job-pdf types, fonts, formatters, styles, and primitives into dedicated shared modules for cleaner future extension

## 2026-04-03

- Updated job overview and jobs list metadata/action visibility.
  - added `jobType` (`V1` / `V2`) to the shared jobs payload and surfaced it in the jobs list and job overview header
  - added builder-task name display to both the jobs list and the job overview details panel
  - restored the overview submit action for submittable jobs, including `Started` and `Assigned` states, and let admin open the submit/edit flow from overview as well

- Added a shared selected-jobs print flow for contractor operations.
  - created a tokenized public print page for selected jobs at `p/jobs`
  - added a shared jobs print data contract and reusable print helper so both the contractor jobs table and payment portal use the same print path
  - added `Print Selected` to contractor-jobs batch actions
  - added `Print Selected` to the payment portal selection controls
  - kept the print payload server-authoritative by sending only selected job ids and rebuilding the printable list on the backend
  - standardized the jobs print output onto the same PDF viewer flow used by sales print by adding a dedicated jobs PDF document under `packages/pdf`
  - the jobs PDF now follows the sales-style document framing and promotes contractor identity into the header when all selected jobs belong to one contractor

- Fixed slow loading in the new jobs modal project/unit flow.
  - stopped the modal from mounting every job-form step at once and now render only the active step panel
  - replaced generic fuzzy `useSearch()` usage in the project and unit steps with lightweight explicit field filtering
  - added query cache time for project/unit selectors so reopening the steps reuses recent data
  - trimmed the unit-step stats payload to fetch only what the selector card actually renders
  - root cause was eager hidden-tab mounting plus heavier-than-needed search and unit stats work during modal open

- Optimized the legacy customer overview sheet open path in `apps/www`.
  - stopped eagerly mounting every customer overview tab panel on sheet open
  - switched the default `general` tab away from the broad `getCustomerGeneralInfoAction` fan-out and onto `customer.getCustomerOverviewV2`
  - reduced first-open work to overview data only: wallet, summary counts, pending slices, and recent sales
  - moved transactions out of the default open payload so they now load only when the transactions tab is opened
  - extended the shared customer overview query payload with `poNo` so recent-sales previews can stay lean without falling back to older loaders
- Updated Brain performance guidance to reinforce faster page and sheet loading patterns.
  - mount only the active tab in tabbed workspaces
  - prefer one slim overview query for first paint
  - defer transactions, history, and full tables until the user opens that panel

## 2026-04-02

- Refined the production worker dashboard v2 interaction model in `apps/www/src/components/production-v2/shared.tsx`.
  - worker order cards now replace admin-style assignment/status emphasis with a simple completion summary badge such as `2/5 completed`
  - item-card chevrons are now aligned at the top-right of the card header area
  - production items now render in a row-aware grid, switching to `lg:grid-cols-2` when there are more than 2 items
  - clicking a production item now opens the full detail panel immediately after that card row instead of nesting the details inside the card itself
  - worker submission entry now uses compact button groups with handle toggles, quantity presets, and combobox fallback for larger available quantities
  - worker expanded orders now render only production items assigned to the logged-in worker, with an extra client-side visibility guard in the shared grid
  - v2 production list completion now uses scope-aware semantics: worker mode uses only that worker's related assignments, while admin mode requires submitted production qty to cover the full production qty before an order is treated as completed or excluded from past-due/pending queues
  - restored production assignment notifications in the v2 `update-sales-control` flow by emitting a targeted `sales_production_assigned` notification after assignment creation

## 2026-03-29

## 2026-04-01

- Added a canonical architecture handbook at `brain/system/architecture-guide.md`.
  - grounded the guide in the current GND monorepo structure and the local Midday reference project at `/Users/M1PRO/Documents/code/_kitchen_sink/midday`
  - documented repository principles for package boundaries, thin app surfaces, Midday-style page composition, performance expectations, and feature delivery rules
  - updated compatibility/index docs so `brain/architecture.md`, `brain/system/architecture.md`, `brain/engineering/repo-structure.md`, and `brain/engineering/coding-standards.md` now point to the new canonical guide

- Started the Sales Orders V2 rebuild under `/sales-book/orders/v2`.
  - Added dedicated backend contracts in `apps/api`:
    - `sales.getOrdersV2`
    - `sales.getOrdersV2Summary`
    - `filters.salesOrdersV2`
  - Added the supporting feature doc at `brain/features/sales-orders-v2.md`.
  - Built the first web v2 slice in `apps/www` with:
    - `use-sales-orders-v2-filter-params`
    - `sales-orders-v2-header`
    - `sales-orders-v2-summary-widgets`
    - `components/tables/sales-orders-v2/*`
    - route `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/v2/page.tsx`
  - Added a sidebar sub-link for `Orders V2` under the Sales module.
  - Kept the v2 route intentionally separate from the legacy `/sales-book/orders` page so we can harden the new contract and UI before any cutover.
  - Simplified the Orders V2 table into an invoice-style list:
    - columns now focus on invoice id, customer, date, amount, status, and actions
    - added a reusable unified `smartStatus` derived from sales, production, and fulfillment state
    - row click now opens the existing sales sheet like the legacy table
    - row hover now reveals a detail hover card for richer order context without widening the table

- Switched the new sales customer v2 experience off app-local server actions and onto customer tRPC queries.
  - Added `customer.getCustomerDirectoryV2Summary` and `customer.getCustomerOverviewV2` in `apps/api`.
  - Added the supporting Zod schemas in `apps/api/src/schemas/customer.ts`.
  - Moved the customer-v2 directory page and overview content in `apps/www` to consume those route contracts directly with TanStack query hooks.
  - Kept the UI payload normalized around `customer`, `addresses`, `walletBalance`, `general`, and `salesWorkspace` so the page and side sheet can share one reusable content tree.

- Rebuilt `/community/unit-productions` off the legacy v1 server-action shell and onto the newer community table architecture:
  - added a real `community.getUnitProductions` tRPC query in `apps/api`
  - added `community.getUnitProductionSummary` for top-of-page production summary widgets
  - added `filters.unitProduction` for builder, project, task, status, and due-date filtering
- Replaced the old route page with a hydrated App Router implementation using:
  - `PageTitle`
  - `UnitProductionsHeader`
  - `UnitProductionSummaryWidgets`
  - `components/tables/unit-productions/*`
- Added a dedicated mobile card renderer for unit productions so the route now has a modern mobile presentation instead of relying on the older v1 shell.
- Kept the existing unit production action flow available in the rebuilt table and updated the action path to refresh `/community/unit-productions` after production status changes.

- Updated production dashboard v2 submission handling for worker and admin detail views:
  - worker item detail no longer shows or exposes delete-submission actions
  - split item detail into `Assignments` and `Submissions` tabs
  - submission tab now renders assignment-grouped submission history with confirm-delete actions for admin
  - worker submission entry now uses inline qty inputs, including handle-aware `LH` / `RH` entry when assignments are sided
  - assignments/submissions status copy now shows progress like `Submissions 0/1` when the assignment has a bounded submission limit
  - when an assignment is fully submitted, the inline form is hidden and replaced with `All submissions completed`

- Fixed a Sales PDF v2 generic line-item print collapse:
  - replaced the sparse legacy-uid row reconstruction in `composeLineItemSections` with a stable sorted row list
  - generic line items now print all rows even when legacy metadata reuses the same `uid`
  - added a focused regression test covering multiple generic line items with colliding legacy uid metadata

## 2026-03-30

- Added notification delivery for unit-production action flows:
  - introduced `community_unit_production_started`, `community_unit_production_stopped`, `community_unit_production_completed`, and `community_unit_production_batch_updated`
  - wired single-row and batch production server actions to emit notifications after successful mutations
  - added notification-center click handlers that deep-link back into `/community/unit-productions`
  - extended `community.getUnitProductions` with `ids` filtering so notification clicks can open one or many attributed tasks directly

## 2026-03-28

- Updated the shared web data-table mobile presentation path to support headerless and borderless mobile rendering.
- Applied the new mobile presentation mode to the sales orders table so mobile cards:
  - hide the table header
  - remove table/body/row borders from the shared table shell
  - remove local divider borders inside the sales-order mobile item card
- Preserved existing desktop table behavior by scoping the new presentation options to mobile mode and opting in from the sales-orders table only.

## 2026-03-26

- Started the production `v2` rebuild in parallel with the earlier shared-shell production workspace:
  - new worker route: `/production/dashboard/v2`
  - new admin route: `/sales-book/productions/v2`
- Added a dedicated `packages/sales/src/production-v2/*` module boundary for the new production experience:
  - `contracts.ts`
  - `application/get-production-list-v2.ts`
  - `application/get-production-dashboard-v2.ts`
  - `application/get-production-order-detail-v2.ts`
- Added new sales tRPC entry points that delegate into the package-layer v2 services:
  - `sales.productionsV2`
  - `sales.productionDashboardV2`
  - `sales.productionOrderDetailV2`
- Built the first web `v2` UI slice in `apps/www/src/components/production-v2/shared.tsx`:
  - dedicated worker/admin page shells
  - local-state filtering instead of shared production filter-param hooks
  - clickable due-date calendar
  - `Completed` label support
  - inline collapsible production order detail replacing the modal interaction in v2
  - inline note activity panel per expanded order
- Added `v2` sidebar sublinks for both worker and admin production destinations.
- Switched v2 production notes to the newer inbox/chat note system:
  - order notes use the `sales_info` notification channel
  - production item notes use the `sales_item_info` notification channel
  - added normalized `noteContext` to the v2 order-detail payload so the UI no longer rebuilds note identity inline
- Left submission and quick-assign mutations as the next implementation slice; the current `v2` build establishes the page architecture and inline interaction model first.

- Rebuilt the sales production workspace across admin and worker entry points:
  - `sales-book/productions`
  - `sales-book/production-tasks`
  - `/production/dashboard`
- Added a shared `ProductionWorkspace` UI shell with:
  - summary cards for active queue, past due, due today, and due tomorrow
  - due-today and due-tomorrow alert sections
  - compact due-date calendar strip for exact-date queue filtering
  - shared table/list reuse instead of maintaining separate production shells
- Extended the sales production query contract with:
  - `show = due-today | due-tomorrow | past-due`
  - `productionDueDate` for exact due-date filtering
- Added `sales.productionDashboard` in the sales tRPC router to support production summary counts, alert buckets, and compact calendar data for the new workspace.
- Updated production-role sidebar navigation to point to the dedicated worker dashboard route instead of the older sales-book task page label.

## 2026-03-24

- Reduced frequent auth auto-logouts across shared and web auth flows:
  - stopped deleting all existing `Session` rows during login
  - increased backing session expiry from 1 hour to 7 days
  - added rolling session-expiry refresh when an active session is close to expiring
  - aligned NextAuth JWT/session max-age to the same 7-day window
- Recorded the auth-session logout failure mode in `brain/bugs/auth-session-auto-logout.md`.

## 2026-03-23

- Improved notification activity note readability across web and Expo timelines, resolved note author display to fall back to authoritative employee/customer names when note contact rows are stale, and added a `deletable` marker to notification channel list items.
- Added an HRM insurance document approval queue at `/hrm/document-approvals`.
- Registered a new `reviewEmployeeDocument` permission in the shared auth constants, role-form permission sync, and super-admin default permission grant.
- Added a Super Admin HRM sidebar link for `Document Approvals`.

- Switched the main browser-facing local `dev` scripts to `portless` with fixed child ports in the `4000-4999` range:
  - `apps/www` -> `4000`
  - `apps/site` -> `4100`
  - `apps/gnd-backlog` -> `4200`
- Updated local env defaults for web surfaces so `NEXT_PUBLIC_APP_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_ROOT_DOMAIN`, and related PDF/runtime URLs align with the new fixed child ports instead of the previous `3000/3500` assumptions.
- Added `PORTLESS_APP_PORT` plus `EXPO_PUBLIC_PORTLESS_APP_PORT` to the Expo app env and refactored `apps/expo-app/src/lib/base-url.ts` to use the shared port contract instead of hardcoding `3000`, keeping preview builds on `EXPO_PUBLIC_BASE_URL`.

## 2026-03-19

- Implemented the missing mobile renderer for the community-projects table with a dedicated card layout showing project title, builder, ref/date, unit count, supervisor, inline addon control, and a direct action to open the project units view.
- Implemented the missing mobile renderer for the project-units table with a dedicated card layout showing lot/model identity, template version, project/builder context, production status, installation submission count, and quick actions for opening the template or unit.
- Added an `Open Job` action beside `Notify Contractor` in the v2 install-cost request flow when the matching job-task request has configured qty, reusing the existing job-overview modal entry via `openJobId`.
- Fixed missing community tabs by moving `CommunityTabs` to the parent `/community` layout so it appears on non-`(main)` pages too, while keeping the final tab set aligned to the original seven sections: Projects, Units, Productions, Invoices, Templates, Builders, and Install Cost Rate.
- Redesigned the community section tabs in `apps/www`:
  - replaced the plain tab strip with a gradient card-style navigator on desktop
  - refreshed the mobile dropdown trigger/menu to match the new visual system
  - simplified the final nav copy so tabs render with titles only
- Updated community templates install-cost CTA in the current sidebar table:
  - removed the visible `v1` action
  - `v2` now renders as a single estimated-cost button with green intensity based on builder-task configuration coverage
  - added a tooltip summary showing configured tasks, total qty, and total estimated install cost
- Updated `getCommunityTemplates` to return a compact `installCostV2Summary` payload so the table can render install-cost progress without extra per-row queries.
- Added install-cost to builder-form handoff for community template configuration in `apps/www`.
- `ModelInstallCostModal` and `InstallCostSidebar` now detect when the v2 install-cost editor opens without any model-cost history and show a warning with an `Open Builder Form` action.
- Extended builder modal query params with a `returnToInstallCost` payload so closing the builder form restores the previous install-cost modal/sidebar payload, including job-form return context when present.

## 2026-03-18

- Completed full v2 sales overview feature build — fully independent of legacy sheet.
- Fixed render bug: `SalesOverviewHeader` in `layout.tsx` referenced undefined `activeTab`; added it as a required prop and threaded it from both shells.
- Extended `SalesOverviewTabId` union and `SALES_OVERVIEW_TAB_ORDER` to include `packing` and `transactions`.
- Updated both v2 query hooks (`use-sales-overview-v2-page-query.ts` and `use-sales-overview-v2-sheet-query.ts`) to enumerate all 7 tabs.
- Built `sections/quick-actions-bar.tsx`: fully v2-native action bar (Preview, Edit, SalesMenu with all sub-actions) sourced from `SalesMenu`, `SendSalesReminder`, `useSalesPreview`, `useBatchSales` — zero imports from legacy sheet.
- Rebuilt all tabs with a fresh, compact design (accent-bordered stat pills, icon section labels, tight data rows, colored progress bars, status dots):
  - `overview-tab.tsx`: hero stat strip + customer/order/payment/production/delivery/address/invoice blocks
  - `finance-tab.tsx`: payment progress bar, collect-payment widget (SalesPaymentProcessor), invoice rows, cost line breakdown
  - `production-tab.tsx`: summary stat pills + per-item progress cards with status badges
  - `dispatch-tab.tsx`: overall dispatch progress + per-delivery cards with status, mode, driver, due date
  - `details-tab.tsx`: identifiers, classification, dates/terms, raw status JSON snapshot
  - `packing-tab.tsx` (new): delegates to `DispatchPackingOverview` with v2 `overviewId` + `dispatchId`
  - `transactions-tab.tsx` (new): delegates to `TransactionsTab` with v2 `overviewId`
- Updated `tab-registry.tsx` to register all 7 tabs with access rules (`salesAdmin`/`production`/`dispatch`) and `hideForQuote` filtering.
- Confirmed `SalesOverviewSystemSheet` is already mounted in `global-sheets.tsx` alongside the legacy sheet.
- Legacy `sales-overview-sheet` remains the active production path; v2 activates on `overviewSheetId` query param.
## 2026-03-18 (session 4)

- **Started Employee Management V2** (`brain/features/employee-management-v2.md`):
  - Created standalone feature folder at `apps/www/src/features/employee-management/`.
  - Created `types.ts` with `EmployeeOverview`, `EmployeeRecord`, `SalesAnalytics`, `ContractorAnalytics`, `ProductionAnalytics`.
  - Created shared components: `overview-stat-card.tsx`, `employee-info-header.tsx`.
  - Created analytics components: `sales-analytics.tsx`, `contractor-analytics.tsx`, `production-analytics.tsx`.
  - Created records components: `employee-records-tab.tsx`, `record-upload-form.tsx`, `record-approval-actions.tsx`.
  - Created `employee-list-page.tsx` (stat bar + existing table) and `employee-overview-page.tsx` (tabs: analytics + records).
  - Created placeholder hook `use-employee-overview.ts` (wires to tRPC when `employees.route.ts` is implemented).
  - Added route `apps/www/src/app/(sidebar)/hrm/employees/v2/page.tsx`.
  - Registered "Employees - v2" sub-link in sidebar HRM module as Super Admin only.
  - **Remaining phases**: DB schema migration, `employees.route.ts` API layer, `[employeeId]` route, insurance gate, expo mirror.

- **Started feature**: Employee Management V2 (`brain/features/employee-management-v2.md`) — initial scaffolding implemented in session 4 (see above).

## 2026-03-17 (session 3)

- **Planned feature**: Sales invoice print should display door images, mouldings, and shelf items when available.

## 2026-03-18 (session 2)

- Finalized Sales PDF V2 redesign plan with swappable multi-template architecture (`brain/features/sales-pdf-system.md`).
  - Data layer in `packages/sales/src/print/` — typed `PrintPage` contract, isolated Prisma query, compose functions.
  - Template registry in `packages/pdf/src/sales/` — each template folder implements `SalesTemplateRenderer`, selected by `templateId`.
  - Classic template first; new templates = new folder + registry entry.
  - 6 execution phases: types → compose → entry → tRPC → template → client wiring.
- Created `packages/sales/src/print/types.ts` — full typed contracts: `PrintPage`, `PrintSection` (discriminated union: door/moulding/service/shelf/line-item), `PrintModeConfig`, `FooterData`, `CompanyAddress`.
- Created `packages/sales/src/print/index.ts` — barrel export for all types.
- Added `./print` and `./print/types` exports to `@gnd/sales` package.json.
- Built `packages/pdf/src/sales-v2/` — complete template system:
  - `document.tsx` — `SalesPdfDocument` wrapper with font registration + template selection.
  - `registry.tsx` — `SalesTemplateConfig` (showImages toggle), `SalesTemplateRenderer` interface, `getTemplate()`.
  - `shared/watermark-page.tsx` — shared watermarked page wrapper.
  - `shared/utils.ts` — `resolveImageSrc`, `colWidth`, `sumColSpans` utilities.
  - `templates/template-1/blocks/` — 8 isolated block components: header, door, moulding, service, shelf, line-item, footer, signature.
  - `templates/template-1/modes/` — 4 mode composers: invoice, quote, production, packing-slip. Each composes blocks differently per mode.
  - `templates/template-1/index.tsx` — routes to mode composer based on `page.config.mode`.
  - All image blocks support `showImages` toggle from `SalesTemplateConfig`.
- **cn syntax rewrite (complete)**: All 11 sales-v2 files now use:
  - Import: `import { cn } from "../../../../utils/tw"` (relative path to `packages/pdf/src/utils/tw.ts`)
  - Syntax: `cn(`\`class1 class2\``)` (template literal inside parens)
  - Spread: `{...cn(`\`class1\``), extra: val}`
  - Dynamic: `cn(`\`text-sm ${condition ? "font-bold" : ""}\``)`
  - Files fixed: moulding-block, service-block, shelf-block, line-item-block, footer-block, signature-block, watermark-page, invoice, quote, production, packing-slip (+ header-block, door-block done earlier).
- Phases 1 (types) and 5 (template) are complete. Remaining: phases 2-4 (compose functions, getPrintData, tRPC) and phase 6 (client wiring).

## 2026-03-18

- Implemented sales PDF print data/render updates for invoice output fidelity:
  - Added door image field selection in `SalesIncludeAll` so print composition can access step-product, door, and product image values.
  - Updated legacy print composition to keep moulding entries visible in door-detail metadata (no longer filtering out `Moulding`).
  - Added optional `image` payload on door table cells in `print-legacy-format` for `Door` cells.
  - Updated PDF renderer to resolve relative image paths using `baseUrl` and render door thumbnails inline with door row values.
  - Kept shelf-item rendering path intact via existing `orderedPrinting` + `SalesPrintShelfItems` flow.

## 2026-03-17 (session 2)

- Fixed PrismaClient bundled-in-browser error on resolution center page.
  - Root cause: `resolution-dialog.tsx` ("use client") imported `resolvePaymentSchema` from `@api/db/queries/wallet`, which chains to `@gnd/sales/payment-system` → `@gnd/db` → PrismaClient.
  - Fix: moved `resolvePaymentSchema` + `ResolvePayment` type into `packages/sales/src/schema.ts` (client-safe). `wallet.ts` now re-exports from there. `resolution-dialog.tsx` imports from `@sales/schema`.
- Fixed `payments is not defined` bug in `apps/api/src/db/queries/sales-resolution.ts` line 198 (`payments.length` → `ls.payments.length`).
- Added customer-email guard to payment notifications menu (`sales-payment-notifications-menu.tsx`): disables SubTrigger and shows tooltip "Customer email not available!" when `sale.email` is missing.
- Fixed checkout v2 duplicate customerTransaction bug:
  - Client: added `if (isVerifying) return` guard + `isVerifying` dep to auto-retry useEffect in `square-token-checkout-v2.tsx` — prevents concurrent verification calls.
  - Server: upgraded `db.$transaction` in `verifyPayment` (`apps/api/src/db/queries/checkout.ts`) to `Serializable` isolation. Concurrent transaction conflict (P2034) is caught and returned as `COMPLETED`.
- Created `CLAUDE.md` at project root with brain folder read/update protocol.

## 2026-03-17

- Started the first implementation slice of the sales overview system redesign.
- Added a new shared feature path at `apps/www/src/components/sales-overview-system/*` with:
  - controller utilities for canonical tab/audience resolution
  - root provider
  - registry-driven tabs
  - shared layout
  - sheet shell
  - page shell
- Restored `apps/www/src/components/sheets/sales-overview-sheet/index.tsx` as the active legacy runtime after deciding the old system must remain fully functional while the new system is built separately.
- Kept the new `sales-overview-system` scaffold disconnected from the legacy sheet flow so future work can proceed without changing current behavior.
- Added a dedicated build route for the new system at `apps/www/src/app/(sidebar)/(sales)/sales-book/orders/overview-v2/page.tsx`.
- Added a separate v2 sheet component at `apps/www/src/components/sheets/sales-overview-system-sheet/index.tsx` and mounted it in `global-sheets` with its own query contract.
- Split new-system activation into two separate URL contracts:
  - `sales-overview-v2-*` for the page route
  - `sales-overview-v2-sheet-*` for the v2 sheet
- Reworked the v2 overview away from the legacy overview internals:
  - direct provider query against `trpc.sales.getSaleOverview`
  - dedicated v2 tab model (`overview`, `finance`, `production`, `dispatch`, `details`)
  - new information-first UI with summary cards, customer/order blocks, finance context, and operational status panels
- Matched the v2 access rules to the real runtime views:
  - sales-admin sees all tabs
  - production-only users see only the production tab, with assigned-item filtering
  - dispatch-only users see only the dispatch overview
- Renamed the v2 query params to camelCase for both page and sheet contracts.
- Published ADR `brain/decisions/ADR-003-sales-overview-system-architecture.md` to lock the new architecture direction before deeper tab migration work.

- Added a dedicated Brain architecture plan for the sales overview redesign in `brain/sales-overview-system-architecture-plan.md`.
- Captured the target direction for the new sales overview system:
  - headless feature core
  - canonical `surface/audience/tab` state model
  - registry-driven tabs
  - reusable overview sections
  - thin sheet/page shells
- Added a tracked NEXT task to execute the sales overview system reset while preserving the current sheet entry as a compatibility wrapper during migration.
- Added a tracked NEXT Brain task for table sorting and arrangement so shared table header behavior, query sync, and column-order UX can be cleaned up before table-specific fixes branch further.

## 2026-03-17

- Started the shared document-platform foundation so file-backed features can converge on one storage/metadata contract instead of route-local or UI-local upload logic.
- Added schema foundations for:
  - `StoredDocument`
  - `SalesDocumentSnapshot`
- Added a new Prisma migration scaffold at `packages/db/src/schema/migrations/20260317154500_document_platform_foundation/migration.sql`.
- Extended `packages/documents` with:
  - stored-document contracts
  - owner-folder/path helpers
  - registry helpers for uploaded/current/failed/deleted document state transitions
- Added initial sales PDF-domain scaffolding in `packages/sales/src/pdf-system/*` for:
  - document-type/status/reason contracts
  - invalidation flow
  - current-document resolution
- Published ADR `brain/decisions/ADR-002-shared-document-platform.md` to lock the new shared document pattern before caller migration begins.

## 2026-03-16

- Added a separated sales payment-notifications feature path without reusing the legacy payment-link menu action:
  - new direct `Payment Notifications` submenu component in `apps/www/src/components/sales-payment-notifications-menu.tsx`
  - preset sends for `25%`, `50%`, `75%`, `full`
  - compact inline `custom` amount prompt
  - direct delivery through the `simple_sales_email_reminder` notification channel
- Expanded reminder-token compatibility for new pay-plan behavior:
  - added `payPlan` and `preferredAmount` to sales payment tokens
  - kept legacy `percentage` support, including `100`, for backward compatibility
  - added shared reminder pay-plan resolution helpers and regression tests in `packages/sales/src/utils/reminder-pay-plan*.ts`
- Updated reminder email generation paths to use 7-day reminder expiry consistently and route new reminder payment links to the standalone checkout v2 route.
- Updated `apps/www/src/components/send-sales-reminder.tsx` to support `25%`, `50%`, `75%`, `full`, and `custom` reminder amounts without changing the legacy payment-link menu action.
- Updated `apps/www/src/components/square-token-checkout-v2.tsx` so checkout v2 can label and explain legacy percentage tokens plus new `full` and `custom` reminder payment requests.
- Added a standalone public checkout v2 route at `apps/www/src/app/(payment)/checkout/[token]/v2` that preserves the legacy `/checkout/[token]` experience while reusing the new payment-system-backed tRPC checkout flow.
- Added dedicated v2 payment UI components in `apps/www/src/components/square-token-checkout-v2*.tsx` with:
  - order-level preview
  - explicit invalid/expired/processing/paid/failed states
  - Square checkout launch via `checkout.createSalesCheckoutLink`
  - post-redirect verification via `checkout.verifyPayment`
- Started the sales accounting source-of-truth migration foundation.
- Added canonical schema foundations for payment and resolution streams in `packages/db/src/schema/sales.payment-system.prisma`:
  - `PaymentLedgerEntry`
  - `PaymentAllocation`
  - `PaymentProjection`
  - `ResolutionCase`
  - `ResolutionFinding`
  - `ResolutionAction`
  - `ResolutionRun`
- Introduced new shared sales package boundaries:
  - `packages/sales/src/payment-system/*`
  - `packages/sales/src/resolution-system/*`
- Added initial canonical payment projection helpers and regression tests for due/overpayment calculations.
- Added shared resolution conflict classification helpers and regression tests for:
  - overpayment
  - duplicate payments
  - stale due amount drift
- Refactored `apps/api/src/db/queries/sales-resolution.ts` to consume shared package helpers instead of duplicating payment-conflict logic inline.
- Extracted the current compatibility payment write bundle into `packages/sales/src/payment-system/application/record-legacy-sales-payment.ts`.
- Rewired `packages/sales/src/wallet.ts` wallet-payment application and `apps/api/src/db/queries/checkout.ts` checkout settlement to use the shared payment-system writer for:
  - `customerTransaction` creation
  - `salesPayments` creation
  - order due recalculation
- Extended the shared payment-system writer to support attaching payments to an already-created `customerTransaction`, matching the existing manual payment batching flow.
- Rewired `apps/www/src/app/(v1)/(loggedIn)/sales/_actions/sales-payment.ts` `applyPaymentAction` to use the shared payment-system writer while preserving commission creation on top of the shared payment write result.
- Added shared payment-system repair helpers for legacy payment deletion and balance recomputation:
  - `deleteLegacySalesPayment`
  - `repairLegacySalesPaymentBalance`
- Rewired `apps/www/src/app/(v1)/(loggedIn)/sales/_actions/sales-payment.ts` `deleteSalesPayment` and `fixSalesPaymentAction` to consume those shared helpers instead of mutating legacy payment state directly.
- Added shared payment-system and resolution-system helpers for refund/cancel workflows:
  - `cancelLegacyCustomerTransaction`
  - `appendLegacyRefundSalesPayment`
  - `createLegacyWalletRefundTransaction`
  - `createLegacySalesResolution`
- Rewired `apps/api/src/db/queries/wallet.ts` refund/cancel flow to use the shared helpers for transaction cancellation, refund sales-payment append, wallet refund credit creation, due repair, and resolution logging.
- Added shared checkout-oriented payment-system helpers for:
  - checkout token resolution
  - pending checkout creation
  - square-order linkage
  - checkout settlement application
- Rewired `apps/api/src/db/queries/checkout.ts` so the remaining checkout flow now consumes shared payment-system services, not just the final payment-write step.
- Added a guarded canonical mirror layer in `packages/sales/src/payment-system/infrastructure/canonical-mirror.ts` that dual-writes ledger/projection/resolution records when the canonical tables are present.
- Hooked the shared payment-system and resolution-system services into that mirror layer so centralized legacy writes can now populate:
  - `PaymentLedgerEntry`
  - `PaymentAllocation`
  - `PaymentProjection`
  - `ResolutionCase`
  - `ResolutionFinding`
  - `ResolutionAction`
- Added migration scaffold `packages/db/src/schema/migrations/20260316143000_payment_system_foundation/migration.sql` for the canonical payment/resolution tables.
- Added reconciliation reporting support:
  - shared report builder in `packages/sales/src/resolution-system/reports/payment-reconciliation-report.ts`
  - root runner script `scripts/payment-system-reconciliation-report.mjs`
  - root command `bun run payment:reconciliation-report -- --limit <n> [--json]`
- Added a package-level payment notification-event contract in `packages/sales/src/payment-system/contracts/payment-events.ts` so shared payment flows can emit standardized notification events without hard-coding `NotificationService` in domain/application code.
- Updated checkout settlement to consume the shared payment notification event contract, and extended manual/refund payment writers to return package-owned notification events for future delivery adapters.
- Added centralized payment notification dispatch in `packages/notifications/src/payment-system.ts` and new notification channels/templates for:
  - `sales_payment_recorded`
  - `sales_payment_refunded`
- Rewired checkout, manual payment, refund, and legacy finalize-checkout flows to use the centralized payment notification dispatcher instead of sending payment notifications inline.
- Attempted to apply the payment-system migration and run the reconciliation report in the current environment, but both are currently blocked by local DB connectivity to `localhost:3306`.
- Created ADR `brain/decisions/ADR-001-payment-and-resolution-boundaries.md` to lock the new module boundaries before broader cutover work.

## 2026-03-14

- Archived the former component-local new-sales-form handoff plan into Brain:
  - moved `apps/www/src/components/forms/new-sales-form/plan.md` to `brain/new-sales-form-master-plan-archive.md`.
- Removed the duplicate non-Brain copy so `brain/` remains the single durable documentation home for new-sales-form planning/handoff context.
- Captured a new field-reported `new-sales-form` parity gap batch and updated Brain execution docs/tasks accordingly:
  - component edit parity
  - component image attachment
  - redirect route list accuracy
  - inline door base-cost edit parity
  - calculated sales-cost display vs raw base cost
  - HPT `Add Size` failure
  - HPT add-door option parity
  - moulding calculator outside-click close parity
- Expanded the active Phase 0 repro matrix from 15 to 23 tracked rows in `brain/new-sales-form-phase0-repro-matrix.md`.
- Updated `brain/new-sales-form-missing-features-execution-plan.md` and `brain/tasks.md` so these user-reported gaps are now part of the formal execution order.
- Started the first `new-sales-form` implementation batch for the newly reported parity gaps:
  - persisted richer multi-select component metadata (`pricing`, `redirectUid`, `sectionOverride`) in shared sales-form mutation domain so downstream HPT flows keep size-bucket context.
  - added an HPT `Add Door Option` action that jumps back to the `Door` step for adding another selected door path.
  - upgraded door size `B` control from passive capture to an editable base-cost prompt that preserves row surcharge math.
  - added image upload support to the new component edit dialog and persisted edited component image state back into line-step metadata.
  - fixed component edit redirect options to derive from the actual edited step rather than whichever step is currently active.
  - preserved richer component metadata in the step-level `Select All` action so downstream pricing/redirect behavior keeps the same component snapshot shape as other selection paths.
  - normalized moulding multi-select removal to preserve the same richer component snapshot shape (`pricing`, redirect, overrides) instead of collapsing metadata on re-save.
  - normalized shared sales-form domain selectors/mutation snapshots so selected component payloads consistently preserve `pricing`, `redirectUid`, and `sectionOverride` across fallback and multi-select paths.
  - tightened quick component price edit defaults to prefer resolved sales cost only, avoiding silent fallback to base cost in the prompt path.
- Continued parity hardening for the same batch:
  - changed shared HPT pricing-bucket resolution to preserve explicit zero-valued bucket prices instead of silently falling back to base/sales defaults.
  - rewired the door size modal to prefer resolved sales pricing with finite-number fallbacks instead of truthy `||` chains, while preserving per-row `baseUnitPrice` metadata.
  - tightened component-edit and quick-price-override flows to preserve existing `basePrice` values instead of replacing them whenever the stored base was `0`.
  - normalized the HPT estimate breakdown base-unit fallback to use preserved row base-cost metadata before deriving from final unit price minus surcharge.
  - fixed moulding selection summary sync so newly selected mouldings with default `qty: 1` immediately persist `mouldingRows`, `qty`, `unitPrice`, and `lineTotal` without requiring a manual qty edit first.
- Completed redirect-list parity hardening by moving redirect-route derivation into shared sales-form domain logic and restoring old-form semantics:
  - redirect options now come from the full ordered step list, matching legacy `settings.getRedirectableRoutes()` behavior instead of excluding the current step.
  - rewired both the component card action menu and component edit dialog to consume the shared helper.
- Reworked the new door size select modal toward old-form parity:
  - reduced modal footprint and rebuilt the body around a compact legacy-style size/price/qty selector with responsive mobile cards and desktop table layout.
  - removed the separate `Base` / `Del` columns and replaced them with a cleaner click-to-edit base-price popover while keeping the `Doors` / `Total` footer summary.
  - added in-modal supplier selection tied to the existing door-step supplier mutation path.
  - applied profile-aware sales pricing when deriving door-size row prices so the modal uses customer-profile-adjusted door pricing instead of raw bucket price.
- Corrected door tier-pricing parity after re-reading the legacy sales-book flow:
  - restored the old rule that size/supplier pricing buckets are treated as base tier price first (`priceVariants[size].price` / supplier-size dependency), then converted to sales price with the current sales multiplier.
  - aligned both the door size modal and HPT add-size path to use that same legacy tier-pricing derivation.
  - corrected profile-based sales adjustment helper to use the legacy multiplier semantics (`1 / coefficient`) instead of multiplying base price directly by the coefficient.
  - normalized the door pricing multiplier path to 2 decimal places so the new flow matches old-form money math instead of carrying extra precision into final sales price.
- Defaulted new-sales customer profile selection to Tier 1:
  - when the form has no selected customer profile yet, the invoice overview now auto-selects `Tier 1` first, then any explicit default-marked profile, then the first available profile.
- Continued money-math normalization to enforce 2dp consistently:
  - store-level line item recalculation now rounds `qty * unitPrice` to 2 decimals before persisting `lineTotal`, preventing raw float drift during manual line edits.
- Focused gate after this batch:
  - `bun test packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` => `23 pass, 0 fail`.
  - `bun test packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` => `36 pass, 0 fail`.
  - `bun test packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` => `37 pass, 0 fail`.

## 2026-03-12

- Completed full-system legacy sales-form audit across UI, state, pricing, and save pipeline.
- Logged prioritized risk map and remediation path:
  - `P0`: transactional save safety and server-trusted monetary totals.
  - `P1`: pricing writeback/taxable consistency/subtotal rendering/state mutation risks.
  - `P2`: selection counter bug, auto-scroll jank, type drift/dead code, and save-side effect ordering.
- Published phased hardening execution plan:
  - `brain/sales-form-system-hardening-plan.md`.
- Reprioritized active backlog to start legacy sales-form hardening Phase 0/1 immediately in `brain/tasks.md`.
- Added formal decision to track this as a dedicated stream in `brain/decisions.md`.
- Started dispatch-control stabilization Phase 0 (repro and baseline evidence lock).
- Added dedicated repro matrix and scope lock doc:
  - `brain/dispatch-control-phase0-repro-matrix.md`.
- Added evidence workspace template for fixture-by-issue capture:
  - `ai/dispatch-control-evidence/README.md`.
- Added evidence scaffold folders for `F1..F4` x `issue-1..issue-6` plus tracker file:
  - `ai/dispatch-control-evidence/STATUS.md`.
- Added user-reported priority dispatch IDs to active Phase 0 baseline:
  - `3419`, `3420` for packing metrics mismatch (`available/listed/pending`).
- Attempted live fixture pull for `3419/3420` via Prisma to populate evidence snapshots; blocked by DB connectivity (`localhost:3306` unreachable in current runtime).
- Captured initial static baseline findings to guide Phase 1 implementation:
  - web mark-fulfilled path has non-awaited pack-then-submit sequence risk in `apps/www/src/components/tables/sales-orders/columns.tsx`.
  - legacy server action `apps/www/src/actions/sales-mark-as-completed.ts` bypasses control-command flow via direct `qtyControl`/`orderDelivery` updates.
  - dispatch progress consumers mix order-level and dispatch-level control fields (web and mobile list paths), which can produce mismatched progress numbers.

## 2026-03-11

- Started Sales Control V2 dispatch overview read migration:
- added `CONTROL_OVERVIEW_READ_V2` feature flag (defaults to `CONTROL_READ_V2`) in control application flags.
- wired `apps/api` `getDispatchOverview` to use projected V2 control for order/dispatch summary fields with legacy projection fallback when overview flag is disabled.
- added dispatch-overview parity warning channel: `[control-read-parity][dispatch-overview] mismatches`.
- updated parity-report tooling (`scripts/sales-control-parity-report.mjs`) to summarize dispatch-overview parity events.
- updated operations and rollout runbooks with new overview-read flag and parity key.
- fixed Expo dispatch packing/reset reliability by switching mobile packing actions to `useTaskTrigger.startAndWait(...)` (wait for real task completion instead of enqueue-only responses).
- hardened mobile dispatch task author identity payloads by normalizing `authorId` to numeric before sending trigger payloads.
- updated dispatch detail UI to disable/update-guard packing actions when dispatch status is not editable, preventing false “not working” interactions.

## 2026-03-08

- Initialized `/brain` project management system.
- Captured baseline architecture, roadmap, and task backlog.
- Established disciplined NOW/NEXT/LATER structure with NOW capped to 3 tasks.
- Added feature-focused Expo jobs-flow task plan (notifications, installer config deep-link, settings, submission notifications, gesture fix, role/status action matrix).
- Added Expo sales and dispatch module task plan (delivery form + API + notification, infinite sales list, quotes feature, packing update submit flow).
- Added web sales form backlog task for Google autocomplete address integration.
- Reprioritized NOW tasks to include immediate testing of sales customer reminder email schedule.
- Reprioritized NOW to include urgent Square payment system fix and online sales payment gateway notification work.
- Added sales inventory system backlog tasks covering Dyke sync, inventory CRUD, and pricing management.

## 2026-03-09

- Started Sales Control V2 execution from step 1 (architecture freeze).
- Recorded authority decision: `qtyControl` is the sole source of truth for sales/dispatch metrics and filtering.
- Recorded module boundary and orchestration rule for existing sales-control tasks.
- Added dedicated implementation checklist: `brain/sales-control-v2-execution-checklist.md`.
- Completed Sales Control V2 step 2 module scaffolding in `packages/sales/src/control/*` (domain, application, infrastructure, projections, contracts) with package exports wired.
- Completed Sales Control V2 step 3 command mapping by introducing canonical legacy-action -> control-command map and wiring update/reset job entrypoints to use mapping resolvers.
- Completed deep legacy-vs-new sales form parity audit focused on costing/settings/step engines and documented findings in `brain/new-sales-form-parity-audit.md`.
- Confirmed parity status is not yet 100%: structural persistence is strong, but costing and route/override semantics still require closure.
- Added dedicated NEXT backlog items for new-sales-form parity closure across Schema -> API -> UI -> Validation.
- Completed Sales Control V2 step 4 hardening: moved control rebuild into mutation transactions, added packing idempotency guard against duplicate retriggers, and added single-action invariant validation for update-sales-control payloads.
- Completed Sales Control V2 step 5 read-path refactor: added list wrappers on `ControlReadService`, stripped full-stat leakage from projected responses, and fixed dispatch `pendingPacking` to dispatch-scoped listed-minus-packed metrics.
- Completed Sales Control V2 step 6 API integration: dispatch list now consumes projected dispatch control with legacy `statistic` compatibility mapping, and sales order lists are enriched via projected sales control wrapper.
- Added explicit parity execution matrix at `brain/new-sales-form-parity-test-matrix.md` covering costing/settings/step-class behaviors with PASS/PARTIAL/FAIL status.
- Started new-sales-form costing parity foundation in shared package: introduced canonical calculator `packages/sales/src/new-sales-form-costing.ts` with strategy support (`current` and `legacy`) and initial unit tests.
- Wired new-sales-form API and web mapper summaries to shared costing foundation to prevent API/UI calculation drift.
- Created explicit package migration roadmap for full sales-form extraction: `brain/new-sales-form-packages-migration-plan.md`.
- Started Phase 1 extraction into structured package module `packages/sales/src/sales-form/*` (contracts/domain/application) and switched consumers to `@gnd/sales/sales-form`.
- Started Phase 2 extraction: moved step-engine primitives (title normalization, variation visibility filtering, dependency pricing resolver, route-title mapping helpers) into `packages/sales/src/sales-form/domain/step-engine.ts`.
- Rewired new-sales-form workflow UI to consume shared step-engine helpers from `@gnd/sales/sales-form` instead of local duplicate implementations.
- Added dedicated step-engine unit coverage (`packages/sales/src/sales-form/domain/step-engine.test.ts`) and verified parity-focused API tests remain green.
- Continued Phase 2 extraction by moving route progression/recursion primitives into shared domain module `packages/sales/src/sales-form/domain/route-engine.ts` (seed step, configured route series, merge with existing, recursive next-step traversal).
- Rewired `item-workflow-panel` route progression to consume shared `route-engine` functions from `@gnd/sales/sales-form`.
- Added route-engine unit coverage (`packages/sales/src/sales-form/domain/route-engine.test.ts`) and re-validated package + API parity tests.
- Continued Phase 2 extraction by moving step mutation primitives into shared domain module `packages/sales/src/sales-form/domain/mutation-engine.ts` (selected UID parsing, compact labels, single-select mutation, multi-select mutation).
- Rewired `item-workflow-panel` selection update path to consume shared mutation functions from `@gnd/sales/sales-form`.
- Added mutation-engine unit coverage (`packages/sales/src/sales-form/domain/mutation-engine.test.ts`) and re-validated package + API parity tests.
- Continued Phase 2 extraction by moving grouped workflow calculators into shared domain module `packages/sales/src/sales-form/domain/workflow-calculators.ts`:
- route config merge (`noHandle`/`hasSwing` overrides), door size-key parsing, door row summaries, service row normalization/summary, moulding row derivation/summary.
- Rewired `item-workflow-panel` to consume shared grouped-calculator functions for HPT/service/moulding math.
- Added workflow-calculator unit coverage (`packages/sales/src/sales-form/domain/workflow-calculators.test.ts`) and re-validated package + API parity tests.
- Added explicit parity tracking + migration-plan gate for customer/profile-change sales-cost recalculation behavior (legacy `salesProfileChanged` semantics vs current coefficient-ratio repricing).
- Completed Sales Control V2 step 7 repair/backfill layer: implemented super-admin-gated rebuild, drift reconciliation, and historical backfill batching in `ControlRepairService`, and routed `reset-sales-control` through this repair service.
- Completed Sales Control V2 step 8 (partial): moved key sales/dispatch status filters to `qtyControl` predicates and added `QtyControl` indexes for type/percentage/total filter paths. Query-plan validation remains pending.
- Started Step 9 frontend alignment by updating dispatch list progress UI to consume projected `control` fields first with legacy `statistic` fallback for migration safety.
- Continued Step 9 frontend alignment by removing legacy `statistic` fallback from dispatch list progress rendering; dispatch list now reads projected `control` quantities only.

## 2026-03-10

- Completed Sales Control V2 step 9 payload normalization: introduced canonical `packItems.packingLines` flow in web packing submit and auto-pack task generation while keeping backend fallback compatibility for legacy `packingList` callers.
- Hardened packing idempotency path for mixed/duplicate lines in a single request by updating in-request packed accumulation as rows are staged.
- Updated packing-request notification counting to support `packingLines` payloads (unique sales-item count) and preserve legacy `packingList` fallback.
- Started Sales Control V2 step 10 testing with targeted packing regression coverage in `packages/sales/src/sales-control/actions.pack-dispatch.test.ts` (canonical payload, legacy fallback, already-packed idempotency, duplicate-line idempotency); executed with `bun test` and all tests passed.
- Added Sales Control V2 domain unit tests for qty normalization/arithmetic and invariants in `packages/sales/src/control/domain/qty-and-invariants.test.ts`.
- Added Sales Control V2 projection contract tests in `packages/sales/src/control/projections/list-projections.test.ts` to enforce field-filtered payload output for sales and dispatch list control projections.
- Applied a type-safety cast fix in `packages/sales/src/control/application/control-read-service.ts` for generic row narrowing, then ran focused test suite (`bun test`) covering packing/idempotency + domain + projection tests (13 passing).
- Added `buildAutoPackingLines` helper in `packages/sales/src/sales-control/tasks.ts` and regression test `packages/sales/src/sales-control/tasks.pack-lines.test.ts` to ensure auto-pack includes both production and non-production deliverables (while still excluding zero-qty and missing item rows).
- Added qtyControl filter correctness tests in `packages/sales/src/utils/where-queries.control-filters.test.ts` for production-completed, dispatch-backorder, and default-search filter composition.
- Re-ran focused control/packing/filter test suites with `bun test` and confirmed all passing (17 tests, 0 failures).
- Added rollout flag module `packages/sales/src/control/application/feature-flags.ts` with `control_write_v2`, `control_read_v2`, and `control_filter_v2` parsing plus unit coverage (`feature-flags.test.ts`).
- Wired write-path flag behavior in `packages/jobs/src/tasks/sales/update-sales-control.ts`: V2 mode enforces strict single-action resolver, compatibility mode falls back to first-match legacy action resolution.
- Wired read-path flag behavior in API sales/dispatch list queries with V2 (`withSalesListControl`/`withDispatchListControl`) and legacy (`withSalesControl`/`withDispatchControl`) fallback branches.
- Added optional parity window logging via `CONTROL_READ_PARITY` in API sales/dispatch list queries to compare V2 projected control values against legacy statistics and emit mismatch summaries.
- Wired filter flag behavior in `packages/sales/src/utils/where-queries.ts`, including legacy `salesStat` fallback predicates for key production/dispatch status filters when `control_filter_v2` is disabled.
- Added focused filter-flag mode test (`where-queries.control-filters.test.ts`) and re-ran focused control test suite (`bun test`) with all passing (21 tests, 0 failures).
- Fixed `packDispatchItemTask` to return transaction response and revalidated related packing tests (5 passing).
- Attempted live query-plan validation probe via Prisma raw SQL; blocked by DB connectivity (`localhost:3306` unreachable in local runtime).
- Added operator runbook for production-like query plan validation: `brain/sales-control-v2-query-plan-validation.md`.
- Added transactional integration tests with module-mocked dependencies in `packages/sales/src/sales-control/tasks.transaction.test.ts` covering same-transaction reset behavior for clear-packings/cancel-dispatch/pack-dispatch and no-reset-on-failure behavior.
- Added rollout execution guide `brain/sales-control-v2-rollout-runbook.md` documenting phased env flag cutover (`CONTROL_WRITE_V2`, `CONTROL_READ_V2`, `CONTROL_FILTER_V2`, `CONTROL_READ_PARITY`) with rollback controls.
- Published operations/repair runbook `brain/sales-control-v2-operations-runbook.md` covering normal task contracts, canonical packing payload, admin-only rebuild flows, reconciliation usage, and incident response controls.
- Reduced `update-sales-control` job entrypoint to a thinner command router by extracting static action map and resolution helper (`resolveActionHandler`) with write-flag based compatibility routing.
- Added parity log summarizer CLI: `scripts/sales-control-parity-report.mjs` with root command `bun run control:parity-report -- --file <api-log-file>` (validated against sample log input).
- Completed new-sales-form Phase 2 extraction gate by moving selector/parsing helpers into shared domain module `packages/sales/src/sales-form/domain/selectors.ts` and rewiring `item-workflow-panel` to consume canonical selectors.
- Added selector unit coverage (`packages/sales/src/sales-form/domain/selectors.test.ts`) and re-validated package + API parity suites (all passing).
- Started and completed Phase 3A profile-change recost extraction by introducing canonical domain engine `packages/sales/src/sales-form/domain/profile-repricing.ts` and rewiring `new-sales-form/mappers.ts` to consume shared repricing logic.
- Added profile-repricing parity-focused tests (`packages/sales/src/sales-form/domain/profile-repricing.test.ts`) covering base-price-first repricing, ratio fallback, and grouped shelf/door total recomputation.
- Executed Phase gate tests after Phase 3A extraction:
- `bun test` on sales-form domain suites + costing suite: 26 pass, 0 fail.
- `bun test` on API new-sales-form parity suites: 3 pass, 0 fail.
- Continued Phase 3 closure with SettingsClass-aligned route fallback semantics in `packages/sales/src/sales-form/domain/route-engine.ts`:
- when current step has no direct route map entry, engine now scans prior steps for fallback route resolution before custom-title fallback.
- Added dedicated fallback regression in `packages/sales/src/sales-form/domain/route-engine.test.ts`.
- Strengthened route override precedence validation (`base -> component -> step`) in `packages/sales/src/sales-form/domain/workflow-calculators.test.ts`.
- Re-ran Phase gate suites post-change:
- `bun test` sales-form domain + costing suites: 28 pass, 0 fail.
- `bun test` API new-sales-form parity suites: 3 pass, 0 fail.
- Continued StepHelperClass pricing parity hardening:
- updated `resolveComponentPriceByDeps` to accept explicit step-level `priceStepDeps` (matching legacy step-form dependency source) and to support pricing buckets with separate `salesPrice`/`basePrice` fields.
- rewired `item-workflow-panel` component price resolution to pass current-step dependency metadata into shared package resolver.
- added step-engine regressions for explicit step dependency pricing and split sales/base bucket parsing.
- Re-ran Phase gate suites after pricing hardening:
- `bun test` sales-form domain + costing suites: 30 pass, 0 fail.
- `bun test` API new-sales-form parity suites: 3 pass, 0 fail.
- Continued CostingClass parity closure across package/API/UI:
- upgraded shared costing engine to tax-scope extras by `type`/`taxxable` (taxable vs non-taxable custom/delivery handling) and aligned legacy credit-card surcharge base to exclude `FlatLabor` from surcharge computation.
- switched API `new-sales-form` recalc/save summary path to `strategy: "legacy"` and passed payment method + extra-cost taxability through summary calculation.
- added optional `paymentMethod` to new-sales-form meta schema/contracts and wired payment-method persistence in API query mapping.
- rewired web summary computation to use legacy strategy and pass `form.paymentMethod`; added payment-method selector to invoice overview panel.
- extended recalculate schema payload to support payment method, extra-cost taxability, and richer line-item tax context.
- added costing regressions for non-taxable custom costs and flat-labor surcharge exclusion in `packages/sales/src/new-sales-form-costing.test.ts`.
- Re-ran Phase gate suites post-costing changes:
- `bun test` sales-form domain + costing suites: 32 pass, 0 fail.
- `bun test` API new-sales-form parity suites: 3 pass, 0 fail.
- Added legacy-style derived labor support in shared costing engine (`housePackageTool.doors[].meta.unitLabor * laborQty/totalQty`) and made derived labor override manual labor amount when present (matching legacy auto-labor intent).
- Added regression for grouped-door labor derivation in `packages/sales/src/new-sales-form-costing.test.ts`.
- Re-ran Phase gate suites after labor derivation changes:
- `bun test` sales-form domain + costing suites: 33 pass, 0 fail.
- `bun test` API new-sales-form parity suites: 3 pass, 0 fail.
- Continued multi-select parity hardening in step engine by teaching `buildSelectedByStepUid` to fall back to `meta.selectedProdUids[0]` when `prodUid` is absent.
- Added multi-select mapping regression in `packages/sales/src/sales-form/domain/step-engine.test.ts`.
- Re-ran gate tests after multi-select mapping update:
- `bun test` (`step-engine.test.ts` + `new-sales-form-costing.test.ts`): 13 pass, 0 fail.
- `bun test` API new-sales-form parity suites: 3 pass, 0 fail.
- Continued profile-reprice parity hardening with explicit legacy `priceData.baseUnitCost` support tests for grouped shelf/door rows in `packages/sales/src/sales-form/domain/profile-repricing.test.ts`.
- Re-ran focused gate tests (`profile-repricing` + API parity): 7 pass, 0 fail.
- Continued StepHelperClass dependency price-model parity closure by expanding shared resolver fallback semantics:
- added exact + permutation key matching and best-match scored fallback when exact dependency key is absent.
- added targeted regressions for dependency key-order mismatch and fuzzy best-match pricing-key resolution in `packages/sales/src/sales-form/domain/step-engine.test.ts`.
- Re-ran focused gate tests (`step-engine` + costing + profile-repricing + API parity): all passing (19 package tests + 3 API tests, 0 failures).
- Continued grouped HPT parity hardening by introducing canonical pricing-bucket resolution helper (`resolvePricingBucketUnitPrice`) that supports `price`/`salesPrice`/`salesUnitCost`/`basePrice`/`baseUnitCost` bucket fields.
- Rewired HPT size-row add flow in `item-workflow-panel` to consume shared bucket resolver instead of local `priceBucket.price`-only parsing.
- Added workflow-calculator regression for supplier-size bucket unit pricing and re-ran focused phase gates (`workflow-calculators` + `step-engine` + API parity): 18 pass, 0 fail.
- Continued HPT route-config parity by making `summarizeDoors` config-aware (`noHandle`) so total quantity and line totals use `totalQty` (and reset LH/RH) when no-handle routing is active.
- Rewired HPT panel summary/apply paths to pass `noHandle` into shared `summarizeDoors`.
- Added regression coverage for no-handle door summarization and re-ran focused phase gates (`workflow-calculators` + `step-engine` + API parity): 19 pass, 0 fail.
- Continued HPT parity by adding `hasSwing` behavior to shared door summarization (clear persisted swing value when swing is disabled by route config), and rewired panel summary/apply paths to pass both `noHandle` + `hasSwing`.
- Added regression coverage for has-swing disabled behavior and re-ran focused gates (`workflow-calculators` + API parity): 12 pass, 0 fail.
- Continued grouped workflow normalization by adding canonical `summarizeShelfRows` to package domain and rewiring shelf row edits in `item-workflow-panel` to persist via shared qty/unit/total rollups.
- Removed stale moulding fallback behavior by making moulding persistence write canonical zero totals/qty when rows collapse to empty (instead of retaining prior line totals).
- Added shelf summarization regression in package domain tests and re-ran focused phase gates (`workflow-calculators` + costing + API parity): 20 pass, 0 fail.
- Ran targeted compile filter check for `item-workflow-panel.tsx` via `tsc | rg item-workflow-panel.tsx`; no file-specific compile errors surfaced.
- Continued multi-select visibility parity by adding full selected-UID stacks (`buildSelectedProdUidsByStepUid`) and updating `isComponentVisibleByRules` to evaluate rules against all selected UIDs for a step.
- Rewired `item-workflow-panel` component visibility filtering to pass both single and multi selected maps into shared visibility resolver.
- Added step-engine regressions for selected-UID stack building and multi-select visibility matching; re-ran focused gates (`step-engine` + `workflow-calculators` + API parity): 23 pass, 0 fail.
- Added deterministic hidden-step route recursion regression in `route-engine` (auto-advance across no-component intermediary steps), confirming recursive next-step traversal behavior remains parity-safe.
- Continued service grouped normalization by allowing full remove-to-zero row state in service panel and adding zero-state service summary regression in package domain tests.
- Re-ran focused gates (`route-engine` + `step-engine` + `workflow-calculators` + API parity): 29 pass, 0 fail.
- Closed additional costing parity coverage for service taxability and explicit line taxability overrides:
- added regressions for service `meta.taxxable=true` inclusion in taxable base and explicit `line.taxxable=false` exclusion behavior in legacy strategy.
- Re-ran focused gates (`costing` + `route/step/workflow` + API parity): 38 pass, 0 fail.
- Continued dependency parity for multi-select flows by extending shared dependency pricing resolver to evaluate cartesian UID combinations (from multi-select steps) before fallback matching.
- Rewired `item-workflow-panel` pricing resolution to pass full `selectedProdUidsByStepUid` map into the shared resolver.
- Added step-engine regression for multi-select dependency-combination pricing and re-ran focused gates (`step-engine` + `workflow-calculators` + API parity): 25 pass, 0 fail.
- Continued grouped service parity by propagating service-row taxability aggregation into line meta (`meta.taxxable = any(serviceRows.taxxable)`), ensuring costing tax-scope inputs are kept aligned with grouped service rows.
- Added service taxability regressions in workflow-calculators tests and re-ran focused gates (`workflow-calculators` + costing + step-engine + API parity): 34 pass, 0 fail.
- Promoted hidden/auto-step recursion parity status after consolidated recursion coverage (single-candidate + hidden/no-component traversal) and executed a full package/API checkpoint gate:
- `bun test` across sales-form domain/costing suites + API parity suites: 51 pass, 0 fail.
- Continued settings-route parity by extending `getRouteConfigForLine` override merging to include persisted prior-step overrides (in sequence) before current component/current-step overrides.
- Added regression coverage for prior-step override merge precedence and re-ran focused gates (`workflow-calculators` + `step-engine` + `route-engine` + API parity): 31 pass, 0 fail.
- Extended variation-visibility parity coverage with multi-select `isNot` rule assertions and re-validated step-engine + API parity suites (15 pass, 0 fail).
- Promoted dependency-pricing and variation-visibility parity rows after expanded multi-select rule/dependency coverage.
- Executed full checkpoint gate after matrix promotions:
- `bun test` across sales-form domain/costing suites + API parity suites: 53 pass, 0 fail.
- Promoted additional matrix rows to PASS backed by existing shared-domain logic + tests + latest full gate:
- route config override merge (row 12), HPT supplier-size pricing (row 17), and HPT no-handle/has-swing controls (row 18).
- Extended API multi-line parity fixture assertions to validate grouped service row payload persistence (including `serviceRows` + `taxxable`) and shelf/service rollup values.
- Promoted grouped service and shelf parity rows to PASS (rows 20 and 21) based on canonical shared summarizers + UI wiring + API round-trip assertions.
- Executed full checkpoint gate after grouped service/shelf promotions:
- `bun test` across sales-form domain/costing suites + API parity suites: 53 pass, 0 fail.
- Extended API multi-line parity fixture with explicit moulding grouped-row persistence assertions (`meta.mouldingRows`, line qty/unit/total) and promoted moulding grouped parity row to PASS (row 19).
- Re-ran focused gate (`new-sales-form` API parity + workflow calculators): 15 pass, 0 fail.
- Extended API parity coverage for `paymentMethod` round-trip + surcharge effect (`grandTotal > subTotal` under credit card flow), and promoted costing surcharge/tax-handling rows to PASS (rows 6 and 7).
- Re-ran focused gate (`new-sales-form` API parity + costing suite): 12 pass, 0 fail.
- Promoted route fallback scan and multi-select persistence rows to PASS (rows 10 and 16) based on shared-domain regressions and latest gate results.
- Executed full checkpoint gate after these promotions:
- `bun test` across sales-form domain/costing suites + API parity suites: 53 pass, 0 fail.
- Expanded derived-labor engine coverage from door-only to grouped service/moulding/shelf metadata paths and added corresponding regressions in costing suite.
- Promoted labor-derived costing parity row to PASS (row 5) after focused gate (`costing` + API parity): 13 pass, 0 fail.
- Closed profile-change repricing parity by prioritizing selected-component recomposition in canonical profile repricing (base-price-first with grouped bucket support, ratio fallback).
- Promoted customer/profile-change repricing row to PASS (row 8) after focused gate (`profile-repricing` + costing + API parity): 17 pass, 0 fail.
- Executed final full checkpoint gate after all parity-row promotions:
- `bun test` across sales-form domain/costing suites + API parity suites: 54 pass, 0 fail.
- Parity matrix now has no remaining PARTIAL/FAIL/TODO rows for the scoped old-vs-new comparison set.
- Added production cutover handoff document with pre-prod risk checks, staged rollout plan, monitoring signals, and rollback playbook:
- `brain/new-sales-form-production-cutover-handoff.md`.
- Re-opened new-sales-form parity closure based on current user-reported field gaps (despite prior matrix PASS state) and treated those reports as authoritative for execution sequencing.
- Produced explicit execution documentation for missing-feature closure with phase gates and old-vs-new anchors:
- `brain/new-sales-form-missing-features-execution-plan.md`.
- Updated backlog priority to make new-sales-form parity closure the active NOW stream with strict phase progression (complete test gate before moving to next phase).
- Started Phase 0 execution artifacts:
- added deterministic reproduction matrix with 15 user-reported feature rows, old/new anchors, manual scripts, evidence paths, and automation targets in `brain/new-sales-form-phase0-repro-matrix.md`.
- established evidence workspace at `brain/new-sales-form-parity-evidence/README.md` for feature-by-feature proof capture before fixes.
- Captured initial code-level evidence and marked six rows as `Fail (Code Confirmed)`:
- quick base-price update in size/qty modal, HPT estimate breakdown click, step floating bar parity, component action menu parity, component top-left indicators parity, and save-history sidebar parity.
- Extended code-level evidence capture to state resilience, shelf parity depth, and service toggles:
- marked `state loss` and `service production toggle` as `Fail (Code Confirmed)`, and `shelf parity` as `Partial (Code Confirmed)` in Phase 0 matrix.
- Continued new-sales-form parity implementation batch in workflow UI/domain:
- implemented service `produceable` toggle parity and line-level meta aggregation (`taxxable` + `produceable`).
- added quick base-price capture in door size/qty modal (`meta.baseUnitPrice` fallback path).
- added HPT estimate clickable breakdown surface and shared-door surcharge contribution wiring.
- implemented floating step action bar parity (tabs/select-all/pricing/component/refresh/enable-custom).
- implemented component card parity actions (edit/select/redirect/delete) and top-left metadata indicators.
- implemented history sidebar tab in new form summary and wired save-trigger history events via `create-sales-history`.
- hardened customer profile reprice effect to detect profile-id changes in addition to coefficient changes.
- enabled autosave by default and added local recovery snapshot/restore flow (`localStorage`) for refresh/idle data-loss mitigation.
- Re-ran scoped phase gates after this batch:
- `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/new-sales-form-costing.test.ts` (34 pass, 0 fail).
- `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts` (3 pass, 0 fail).
- focused `tsc` filter on touched new-sales-form files (`new-sales-form.tsx`, `store.ts`, `local-recovery.ts`) reported no file-specific errors after patch.
- Updated Phase 0 reproduction matrix triage from `Fail` to `Partial (Implemented, Runtime Repro Pending)` for rows now code-complete: quick base price, HPT breakdown, moulding default qty, state resilience, service toggles, floating bar, component menu, component indicators, save-history sidebar.
- Closed supplier-pricing gap in door size/qty modal by switching row derivation to shared `resolvePricingBucketUnitPrice(...)` (supports supplier bucket variants beyond `price`), and promoted matrix row to `Partial (Implemented, Runtime Repro Pending)`.
- Re-ran scoped gates after supplier patch:
- `bun test` (sales-form domain + costing): 34 pass, 0 fail.
- `bun test` (API new-sales-form parity): 3 pass, 0 fail.
- focused `tsc` filter on touched files (`new-sales-form.tsx`, `store.ts`, `local-recovery.ts`, `workflow-modals.tsx`) had no file-specific hits.
- Fixed door-estimate component-cost composition mismatch by extracting shared surcharge helpers and applying them in both HPT panel update path and door size modal apply path.
- Updated parity evidence + matrix triage for profile repricing and component-cost-in-door-estimate to `Partial (Implemented, Runtime Repro Pending)`.
- Re-ran scoped gates after surcharge-path patch:
- `bun test` (sales-form domain + costing): 34 pass, 0 fail.
- `bun test` (API new-sales-form parity): 3 pass, 0 fail.
- focused `tsc` filter on touched new-sales-form files (including `item-workflow-panel.tsx`) returned no file-specific hits.
- Identified and fixed tax-rate resolution blocker causing tax to remain zero in new form:
- `customers.getTaxProfiles` now includes `percentage` in TRPC response payload so `invoice-overview-panel` can map `taxCode -> taxRate` correctly.
- Updated tax-calculation evidence and promoted matrix row to `Partial (Implemented, Runtime Repro Pending)`.
- Re-ran scoped gates after tax payload patch:
- `bun test` (sales-form domain + costing): 34 pass, 0 fail.
- `bun test` (API new-sales-form parity): 3 pass, 0 fail.
- focused `apps/api` typecheck filter for `customer.route.ts` had no file-specific hits.
- Improved shelf workflow parity in active new-form panel by adding per-row `categoryId` and `productId` inputs alongside description/qty/unit/total fields, reducing shelf persistence loss for rows that require category linkage.
- Updated shelf parity evidence to reflect current `Partial` state (data capture improved; hierarchical category/product picker parity still pending).
- Re-ran scoped gates after shelf UI patch:
- `bun test` (sales-form domain + costing): 34 pass, 0 fail.
- `bun test` (API new-sales-form parity): 3 pass, 0 fail.
- focused `tsc` filter on touched new-sales-form files returned no file-specific hits.
- Extended new-sales-form shelf parity with dedicated shelf data APIs and picker wiring:
- added `newSalesForm.getShelfCategories` and `newSalesForm.getShelfProducts` backend procedures and schema contracts.
- wired new frontend hooks and integrated shelf category/product dropdowns in workflow panel with product auto-fill (description + unit price).
- updated shelf parity row triage to `Partial (Implemented, Runtime Repro Pending)` with remaining gap scoped to nested-category workflow depth.
- Re-ran scoped gates after shelf API/picker patch:
- `bun test` (sales-form domain + costing): 34 pass, 0 fail.
- `bun test` (API new-sales-form parity): 3 pass, 0 fail.
- focused `tsc` filters on touched `apps/www` and `apps/api` files returned no file-specific hits.
- Extended shelf parity depth further by adding parent/child/product row flow in new shelf editor (`Parent -> Category -> Product`) with persisted parent selection in row meta and product-driven autofill behavior.
- Added regression coverage for new shelf lookup queries:
- `new-sales-form.test.ts` now verifies `getNewSalesFormShelfCategories` and `getNewSalesFormShelfProducts` behavior (including deleted filtering and empty category input).
- Added runtime execution gate checklist:
- `brain/new-sales-form-runtime-parity-gate.md` (batch order, evidence rule, and scoped gate commands for PASS promotion).
- Resolved a task-scoped type gate failure in the updated API test file (strict undefined narrowing), then re-ran gates.
- Latest scoped gates:
- `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts` => 4 pass, 0 fail.
- `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/new-sales-form-costing.test.ts` => 34 pass, 0 fail.
- focused `tsc` filters on touched `apps/www` and `apps/api` files show no matching file-specific errors.
- Fixed reported step-reset regression in new form selection flow:
- hydration in `new-sales-form.tsx` now keys by incoming load payload identity and no longer re-hydrates on local version churn, preventing first-step selection from snapping back after auto-open next-step transitions.
- Fixed moulding-line parity regression:
- expanded moulding item-type alias handling (`moulding/mouldings/molding/moldings`) in shared selectors.
- updated new moulding line-item table to include per-row calculator icon action (old-form style) using `MouldingCalculator`.
- Re-ran scoped gates post-fix:
- `bun test` sales-form domain + costing suites: 39 pass, 0 fail.
- `bun test` API new-sales-form parity suites: 4 pass, 0 fail.
- focused `tsc` grep on touched new-sales-form files returned no file-specific hits.
# 2026-03-15 - New Sales Form door supplier parity

- Studied legacy door supplier pricing flow in the old sales form and confirmed the authoritative dependency key remains `"<size> & <supplierUid>"` when a supplier is selected.
- Patched the new sales form so changing the Door-step supplier now immediately reprices persisted `housePackageTool.doors` rows from the supplier-aware pricing buckets instead of waiting for a modal re-apply.
- This keeps HPT/package totals, stored door rows, and the door size modal aligned to the same supplier-linked price model.
- Tightened door size pricing to match the legacy modal's strict supplier lookup: when a supplier is selected and a `size & supplierUid` bucket is missing, the new form now treats that row as missing pricing instead of falling back to generic/component pricing.
- Added an `Add Price` state in the new door size modal for missing supplier-size buckets, and repriced persisted/HPT door rows to `0` with a `priceMissing` marker until a base price is entered.
- Started the next door/HPT parity batch:
  - door modal size candidates now merge pricing keys, persisted rows, and legacy-style `doorSizeVariation` width rules from the active line so missing sizes like `1-10 x 6-8` can appear even when no pricing bucket exists yet.
  - door modal size rows are now sorted ascending and display both inch and foot-inch formats like the old form.
  - qty inputs in the door modal and HPT rows now render blank by default instead of `0`.
  - added a `Line Total` column to the door size modal desktop table.
  - added legacy-style `Remove Selection` and `Next Step` actions to the door modal footer without removing the current actions.
  - mirrored the door price popover editor into HPT rows so missing-price and base-price update behavior matches the door size modal.
  - upgraded grouped-door math so `addon` increases calculated line total and `customPrice` overrides it, enabling old-form-style HPT estimate breakdown editing.
  - extended HPT estimate breakdown to show priced step contributors plus editable `Addon Price` and `Custom Price`.
- Started redirect route-behavior parity hardening:
  - added shared `rebuildStepsFromSelection(...)` in the sales-form route engine so selecting a redirecting component now rebuilds the line tail from the current step instead of only appending forward.
  - added regressions covering both redirect pruning (`No Casing` -> skip `Casing`) and restoration when the component changes back.
  - rewired new-form single-select and multi-select progression paths to use the rebuilt-tail helper, aligning closer to legacy `updateNextStepSequence()` semantics.
- Continued component-pricing parity hardening:
  - changed shared dependency price resolution to prefer pricing-bucket matches over stale direct component `salesPrice` / `basePrice` fields when dependency pricing applies.
  - added a regression proving dependency pricing wins even when direct component price fields are populated.
  - rewired new-form visible component/root component card pricing to consume the shared resolved dependency/base price instead of short-circuiting back to raw component fields.
- 2026-03-16: Fixed redirect restore contract so skipped steps remain in-place as disabled pills and restore cleanly when redirect is removed. Added a new `Door Size Variant` control to the new Door step controls menu and implemented a redesigned variant editor modal that writes `meta.doorSizeVariation` in the old-form shape (`rules[]` + `widthList[]`). The existing `deriveDoorSizeCandidates(...)` path now responds to those saved variants immediately for both the door size modal and HPT size menus. Focused gate: `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `47 pass, 0 fail`.
- 2026-03-16: Moved `deriveDoorSizeCandidates(...)` into shared sales-form domain code and added regression coverage for old-form variant filtering semantics: matching `doorSizeVariation` groups add widths for the active height, persisted HPT rows stay included, and non-matching variants are ignored. Focused gate: `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `49 pass, 0 fail`.
- 2026-03-16: Finished the Door Size Variant hydration/persistence path so existing configured variants no longer rely on an in-line copy to appear in the new modal. `getNewSalesFormStepRouting(...)` now includes `dykeSteps.meta`, route-step seeding/merge preserves configured step meta in shared `route-engine`, `deriveDoorSizeCandidates(...)` can fall back to route-step `doorSizeVariation`, and the new form now persists variant edits through `sales.updateStepMeta` before refetching route data. Added regressions for configured step-meta preservation and route-meta variant fallback. Focused gate: `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `51 pass, 0 fail`.
- 2026-03-16: Tightened Door Size Variant filtering to match the old form exactly. When `doorSizeVariation` is configured, the shared `deriveDoorSizeCandidates(...)` helper now treats matching variant widths for the active height as the canonical visible size list instead of unioning pricing keys or persisted rows into the chooser. The door size modal now follows that stricter list too, so pricing buckets only price valid variant sizes rather than adding extra options. Added regressions covering canonical variant-only lists, route-meta fallback, and pricing-key fallback only when no variant config exists. Focused gate: `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `53 pass, 0 fail`.
- 2026-03-16: Closed another HPT/door parity batch. Added an automatic grouped-door sync in the new form so HPT package totals now pick up component surcharge pricing immediately instead of waiting for the first qty edit, changed the door base-price popover to show door sales price rather than the final surcharged unit, and implemented an HPT `Swap Door` flow that replaces the active door component while preserving size/qty rows and repricing them against the new door. Focused gate: `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `53 pass, 0 fail`.
- 2026-03-16: Expanded the new sales-form settings modal with a tabbed admin surface: `Invoice Steps | Settings`. The new `Settings` tab now edits default `ccc`, default tax, and default customer profile inside the shared `sales-settings` payload, while preserving the existing route editor under `Invoice Steps`. The step-routing query now also returns `settingsMeta` so the modal can prefill these defaults from the current settings record. Focused gate: `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `53 pass, 0 fail`.
- 2026-03-16: Restored old-form credit-card surcharge and tax-summary parity in the new sales form. The shared legacy costing engine now accepts a settings-driven `cccPercentage` instead of a hardcoded `3%`, with a `3.5%` fallback matching the old form. `bootstrap/get/recalculate/saveDraft/saveFinal` now all derive the surcharge percent from `sales-settings`, expose it on the form record, and persist summary `ccc` alongside the existing tax/discount/labor totals. The invoice overview panel now shows explicit `Tax Amount` and `CCC (x%)` rows, and store-level `setMeta(...)` recalc now updates summary totals immediately when payment method changes. Focused gate: `bun test packages/sales/src/new-sales-form-costing.test.ts packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `64 pass, 0 fail`.
- 2026-03-16: Started Shelf Items parity implementation in the new sales form. Added shared shelf-section adapters in `packages/sales/src/sales-form/domain/workflow-calculators.ts` so flat persisted `shelfItems` rows can now be grouped into old-form-style sections, preserve `basePrice` / calculated `salesPrice` / `customPrice` metadata, and flatten back into the existing save shape without a schema rewrite. Rebuilt the new-form shelf panel in `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx` around sectioned parent/category/product selection, per-product price editing, add-product/add-section actions, and section subtotal rollups while still persisting through the current flat `shelfItems` row model. Focused gates: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`; `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts` -> `55 pass, 0 fail`. Whole-app `bun x tsc -p apps/www/tsconfig.json --noEmit --pretty false` still reports many pre-existing repository errors outside this shelf work; no surfaced failure referenced the touched shelf files.
- 2026-03-16: Continued shelf parity toward the old UI contract. Shelf sections now preserve a full `categoryIds` chain instead of only parent + child, and the new shelf panel now uses old-form-style combobox inputs: badge-based multi-level category drilling plus searchable product combobox selection. Product options now resolve from all descendant leaf categories under the currently selected category path, matching the old shelf behavior more closely than the earlier 2-level select approximation. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`. A touched-file-only `tsc` grep against `item-workflow-panel.tsx` / `workflow-calculators.ts` is still inconclusive because the broader app compile remains dominated by unrelated repository type errors.
- 2026-03-16: Fixed the first multi-level shelf regression in the new combobox path. The badge-based shelf category input was incorrectly treating `Combobox` multiple-mode `onValueChange` as a single value, which broke second-level selection. The handler now consumes the full returned selection array, matching the old shelf input contract. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`.
- 2026-03-16: Tightened the new shelf product row to match old-form behavior more closely. Removed the extra freeform description input, widened the product column, and fixed shelf pricing writeback so product selection plus base/custom price edits now update the persisted row pricing fields (`basePrice`, `salesPrice`, `customPrice`, `unitPrice`) instead of only nested metadata. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`.
- 2026-03-16: Restored old-form shelf entry behavior so a shelf line auto-seeds with one section/product slot immediately instead of requiring a manual `Add Section` click before the shelf UI becomes usable. Implemented as a self-sync effect in the new shelf workflow panel using the shared section flatten/summary helpers. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`.
- 2026-03-16: Continued shelf parity polish in the new form. Shelf product options now include image/icon + price details from the shelf-product query, the shelf price button now reads from the effective row pricing state instead of only nested meta fallbacks, and clearing a category path/section with selected products now shows an old-form-style destructive warning before resetting the section. Also tightened shelf product selection so line totals initialize from the resolved product price immediately instead of waiting for a later edit. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`.
- 2026-03-16: Hardened shelf product selection/writeback again after runtime feedback that price/total were still not appearing on first select. The new shelf row now computes one resolved base/sales/custom/unit snapshot at selection time, persists that full pricing set back onto the row/meta, and restores the shelf price button fallback so the cell never renders blank while values are resolving. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`.
- 2026-03-16: Added a dedicated shelf sync path in the new workflow panel so shelf line-level `qty`, `unitPrice`, and `lineTotal` are re-derived from `shelfItems` whenever shelf rows change, mirroring the existing grouped door/moulding sync pattern. This is meant to keep invoice summary totals in lockstep with the visible shelf rows instead of relying only on the section editor patch path. Focused gate: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `23 pass, 0 fail`.
- 2026-03-16: Hardened invoice summary rendering/sync for the remaining shelf parity bug. The invoice overview panel now derives a live summary from the current `record.lineItems` + extra costs + payment method each render and syncs it back into store when drift is detected, matching the old form's “recalculate totals from current form state” behavior more closely than relying on a previously stored summary snapshot. Focused gate: `bun test packages/sales/src/new-sales-form-costing.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `34 pass, 0 fail`.
- 2026-03-16: Patched the shared sales-form costing engine so shelf lines use their `shelfItems` row totals as the authoritative invoice-summary input when present, matching the old form's `shelfItems.subTotal -> calculateTotalPrice()` contract instead of relying solely on `line.lineTotal`. Added regression coverage proving a shelf line with stale `lineTotal: 0` still contributes correctly to subtotal, tax, and grand total. Focused gate: `bun test packages/sales/src/new-sales-form-costing.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `35 pass, 0 fail`.
- 2026-03-17: Extended the separated sales payment-notification flow with a true `flexible` reminder option. Reminder tokens can now carry `payPlan: "flexible"` without a fixed amount, the new `Payment Notifications` sales-menu submenu exposes that option alongside preset/full/custom sends, and checkout v2 now prompts the customer for an amount before creating the Square link. The checkout API validates the entered amount against the current outstanding balance, and the reminder pay-plan helper/test suite now covers the new label/amount semantics. Focused gate: `bun test packages/sales/src/utils/reminder-pay-plan.test.ts` -> `6 pass, 0 fail`.
- 2026-03-19: Implemented the legacy `Section Setting Override` path more completely in the new sales form. Selecting a component now persists its `redirectUid` and `sectionOverride` onto the active step metadata in the shared mutation engine, matching the old-form pattern where effective section overrides live on the selected step state instead of only the visible component catalog. The new form component menu now exposes a dedicated `Section Setting Override` action, opening the override UI directly from the card menu while keeping the richer general `Edit` path intact. Also tightened grouped-door/HPT runtime behavior so the active selected door component can override stale prior-step route config when `noHandle` / `hasSwing` differ, bringing door modal + HPT behavior closer to the legacy override contract. Focused gates: `bun test packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts` -> `28 pass, 0 fail`; `bun test packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/new-sales-form-costing.test.ts` -> `69 pass, 0 fail`.
- 2026-03-19: Updated new-sales-form customer lookup to follow the old sales-form search pattern more closely. The new customer search now uses a richer backend payload that includes customer profile/tax/address context instead of the old thin `id/name/phone/email` result, and the invoice overview search results now prioritize useful selection metadata: business-account badge, phone number, and tier/profile label. Selecting a customer now also carries profile/tax/address defaults forward immediately, closer to the legacy picker behavior instead of clearing them and waiting for a later resolve pass.
- 2026-03-22: Tightened new-sales-form redirect-menu parity against the old sales form. The shared `getRedirectableRoutes(...)` helper now dedupes repeated redirect choices by canonical step title after preserving first-in-order canonical entries, which fixes the current new-form issue where route-derived step payloads could surface duplicate repeated titles in the component redirect list. Focused gate: `bun test packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/new-sales-form-costing.test.ts` -> `70 pass, 0 fail`.
- 2026-03-22: Closed the main new-sales-form submit parity gaps against the old save flow. The API save transaction now generates legacy-style sales numbers via `generateSalesSlug(...)`, syncs relational `SalesTaxes` rows from the canonical legacy summary (`taxCode`, `taxableSubTotal`, `taxTotal`), and returns `isNew` so frontend save exits can mirror old created-vs-updated side effects. The new form frontend now routes draft save, final save, save-close, and save-new through one post-save handler that always triggers `create-sales-history`, refreshes order stats for orders via `resetSalesStatAction`, and dispatches `salesCreated`/`salesUpdated` events like the old form. Focused gates: `bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts` -> `5 pass, 0 fail`; `bun test packages/sales/src/new-sales-form-costing.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/domain/route-engine.test.ts packages/sales/src/sales-form/domain/step-engine.test.ts packages/sales/src/sales-form/domain/mutation-engine.test.ts packages/sales/src/sales-form/domain/selectors.test.ts` -> `70 pass, 0 fail`.

## 2026-03-18

- Built full admin dispatch dashboard at `/sales-book/dispatch-admin` (Super Admin + editDelivery gated).
- Added `getDispatchSummary()` API query returning status-grouped counts (queue/in progress/packed/completed/cancelled/missing items), total, overdue dispatches, and per-driver active workload.
- Exposed `dispatch.dispatchSummary` tRPC procedure for the new dashboard query.
- Created `dispatch-admin/dispatch-summary-cards.tsx`: 7 clickable KPI cards with click-to-filter behavior (Total, Queued, In Progress, Packed, Completed, Cancelled, Overdue).
- Created `dispatch-admin/driver-workload-card.tsx`: sidebar card showing active dispatch count per driver, sorted by workload, with badge colors (red ≥5, secondary ≥3, outline otherwise).
- Created `dispatch-admin/admin-dispatch-header.tsx`: enhanced header with tab filter, search filter, Refresh button, and inline Duplicate Sweeper dialog accessible to Super Admins.
- Added "Admin Dashboard" sidebar link under Dispatch group (Super Admin only).

## 2026-03-18

- **Dispatch Admin Dashboard - Major Feature Expansion**
  - New backend procedures: `bulkAssignDriver`, `bulkCancel`, `exportDispatches`, `getDeleted`, `restore`
  - New DB query functions: `bulkAssignDispatchDriver`, `bulkCancelDispatches`, `exportDispatches`, `getDeletedDispatches`, `restoreDispatch`
  - New schemas in `apps/api/src/schemas/sales.ts`: `bulkAssignDriverSchema`, `bulkCancelDispatchSchema`, `exportDispatchesSchema`
  - New components in `apps/www/src/components/dispatch-admin/`:
    - `dispatch-auto-refresh.tsx` — polling toggle (off/15s/30s/1m/5m) with instant refresh
    - `dispatch-export-button.tsx` — CSV export of current filtered dispatches
    - `dispatch-calendar-view.tsx` — 7-day calendar view with week navigation + unscheduled list
    - `dispatch-overdue-banner.tsx` — overdue alert banner with View Pending + Escalate actions
    - `dispatch-deleted-panel.tsx` — view and restore soft-deleted dispatches (dialog)
  - Updated `batch-actions.tsx` — fully implemented bulk assign driver (with driver dropdown) and bulk cancel
  - Updated `driver-workload-card.tsx` — click driver to filter table, progress bars, clear filter button
  - Updated `admin-dispatch-header.tsx` — view toggle (table/calendar), auto-refresh, export, deleted dispatches button
  - Updated `use-dispatch-filter-params.ts` — added `view` param (table | calendar)
  - Updated `page.tsx` — conditional calendar/table layout, overdue banner, new components integrated
  - All new files pass TypeScript checks with no new errors

## 2026-03-20

- **Mobile Column Support for Data Tables**
  - Added `mobileColumn` exports and `ItemCard` components to 14 table columns.tsx files
  - Files modified: customers, employee-profiles, employees, inbound-managment, inventory-categories, inventory-import, inventory-products, roles, sales-accounting, sales-accounting-conflicts, sales-orders, sales-quotes, site-actions, sales-production
  - Replaced broken commented-out mobileColumn in sales-production with proper implementation using correct production Item type properties
  - Added `interface ItemProps { item: Item }` where not already present
  - Each ItemCard renders key data in a mobile-friendly card layout using existing imported components

## 2026-03-23

- Updated the sales orders mark-fulfilled flow so the modal now lets users choose `pickup` or `delivery` before completion.
- The selected method now syncs into the sales order delivery option, new dispatch creation, and existing dispatch mode updates while preserving driver assignment and pack-all behavior.
- Validation note: `bun x tsc -p apps/www/tsconfig.json --noEmit --pretty false` still fails because of broad pre-existing repository type errors; a targeted grep of that output reported no `sales-orders/columns.tsx` or `sales-orders/fulfillment-complete-modal.tsx` errors from this change.
- Fixed the `/sales-book/orders` false-empty state by treating auth-derived filter resolution as loading instead of an empty result. The orders table now waits for `useAuth()` to settle before deciding between `NoResults` and `EmptyState`, which avoids intermittent blank/empty renders for users whose `showing` filter is permission-driven.
- Changed the default sales orders query to show incomplete orders only. With no explicit filters applied, the backend now includes orders that are still unpaid (`amountDue > 0`), production-incomplete (`prodCompleted < 100` or missing completion stats), or fulfillment-incomplete (`dispatchCompleted < 100` or pending/missing dispatch completion). Focused gate: `bun test packages/sales/src/utils/where-queries.control-filters.test.ts` -> `4 pass, 0 fail`.
- Switched the system-wide default sales print entry points to the v2 template. The legacy quote-print helper now routes through `quickPrint(..., v2: true)`, the legacy `/p/sales-invoice` public preview page now renders `PrintSalesV2` with the `salesV2` query, and the old `/api/pdf/download` endpoint now proxies the v2 printer output instead of composing the legacy PDF template directly. Focused gate: `bunx biome check apps/www/src/utils/sales-invoice.ts apps/www/src/app/(public)/p/sales-invoice/page.tsx apps/www/src/app/api/pdf/download/route.ts` -> pass.
- Added optional amount masking to the shared `SummaryCard` and enabled it for the sales-rep `Total Sales` card so the amount is hidden by default and can be toggled visible on click. Focused gate: `bunx biome check apps/www/src/components/summary-card.tsx apps/www/src/components/sales-rep-summary-cards.tsx` -> pass.

## 2026-03-24

- Rebuilt `/community/unit-invoices` on the modern data-table stack. The page now prefetches a dedicated `community.getUnitInvoices` infinite query, uses the latest search/filter system, supports sorting, and renders a new desktop/mobile table instead of the legacy `_v1` shell.
- Added a dedicated unit-invoice API surface in `apps/api/src/db/queries/unit-invoices.ts` and `community.route.ts` for list, form, save, and delete operations so the table and modal share the same tRPC source of truth.
- Replaced the legacy invoice editor with a query-param-driven `CustomModal` flow (`use-unit-invoice-params`, `unit-invoice-modal.tsx`, `unit-invoice-form.tsx`) modeled after the newer model-cost/install-cost modal architecture, including summary cards, editable invoice rows, add-task support, and footer actions.
- Validation note: full app/API typechecks still report broad pre-existing repository errors, but targeted greps of `bunx tsc -p apps/api/tsconfig.json --noEmit --pretty false` and `bunx tsc -p apps/www/tsconfig.json --noEmit --pretty false` reported no `unit-invoices` or `unit-invoice` file errors after the migration fixes.
- Fixed a save regression in the new unit invoice modal where configured task dues were being zeroed on submit. Root cause was disabled form fields dropping out of the payload; the form now keeps those values as read-only inputs and the save mutation now preserves configured due/task values if a sparse payload reaches the API.

## 2026-03-30

- Added a new contractor payments page at `/contractors/jobs/payments` backed by `jobs.contractorPayouts`, showing payout amount, date, authorized by, paid to, and number of jobs in a modern desktop/mobile data table.
- Added payout overview support through `jobs.contractorPayoutOverview` and a `CustomModal` detail view so finance can inspect a payout batch, included jobs, adjustments, and payout metadata without leaving the page.
- Extended the existing payment dashboard with new CTAs to `View payouts`, made recent payment cards deep-link into the payout overview modal, and added the new payments page to the HRM payment sidebar submenu.
- Validation note: targeted greps of `bunx tsc -p apps/api/tsconfig.json --noEmit --pretty false` and `bunx tsc -p apps/www/tsconfig.json --noEmit --pretty false` reported no matching errors for the new contractor payout files or touched payment dashboard files.
- Fixed production dashboard v2 worker/admin queue filtering so the assigned queue now uses the full pending assigned set instead of only `due today` and `past due`, worker scope only shows orders/items assigned to the logged-in worker, and the inline item cards now show only assigned and production progress without fulfillment progress.
- Fixed production dashboard v2 worker actions so `Submit Assignment` and worker submission deletes are no longer hard-disabled in the inline detail view, and worker-triggered submission payloads now scope to the current worker’s assignments to avoid crossing into other workers’ pending work.
- Refactored the sales-order pending query logic inside `packages/sales/src/utils/where-queries.ts` so dispatch-pending, production-pending, and default pending-sales behavior now come from shared named builders instead of ad-hoc inline objects. This removes the buggy delivery-row branch from dispatch pending and restores default search to the intended `dispatch pending OR production pending OR amount due` behavior.
- Added a focused regression for pending dispatch filtering in `packages/sales/src/utils/where-queries.control-filters.test.ts` and kept the existing default-search coverage. Focused gate: `bun test packages/sales/src/utils/where-queries.control-filters.test.ts` -> `5 pass, 0 fail`.
- Fixed the sales-book default order list to filter incomplete orders using the same visible production/fulfillment statuses shown in the table, instead of relying only on raw stat predicates that could disagree with the UI. The new helper lives in `packages/sales/src/utils/default-search-order-filter.ts`, and `apps/api/src/db/queries/sales.ts` now applies it for default-search order reads when control read v2 is enabled.
- Added focused scenario coverage for the visible-status default-search filter in `packages/sales/src/utils/default-search-order-filter.test.ts`, including paid+completed exclusion and paid+pending production/fulfillment inclusion cases matching the reported order examples. Focused gate: `bun test packages/sales/src/utils/default-search-order-filter.test.ts packages/sales/src/utils/where-queries.control-filters.test.ts` -> `10 pass, 0 fail`.
- Reverted the expensive post-fetch default-search order filtering path and standardized sales querying back onto a single stats-based predicate strategy. `apps/api/src/db/queries/sales.ts` now relies on the normal paginated DB query again, while `packages/sales/src/utils/where-queries.ts` uses `stat` rows only for production/dispatch/default pending filters instead of mixing in `qtyControl` logic.
- Updated the focused sales-query regression to assert the new stats-only behavior, including default-search pending, dispatch pending, and completed/backorder branches. Focused gate: `bun test packages/sales/src/utils/where-queries.control-filters.test.ts` -> `5 pass, 0 fail`.
- Fixed the sales `invoice=paid` filter to mean fully paid only by matching `amountDue: 0` in `packages/sales/src/utils/where-queries.ts`. Focused gate: `bun test packages/sales/src/utils/where-queries.control-filters.test.ts` -> `6 pass, 0 fail`.
- Fixed the shared search-filter UI so active filter pills render correctly for single-value filters, the clear-all action appears reliably, and the internal `hasFilter` state updates when filters change. Touched files: `packages/ui/src/components/custom/search-filter/index.tsx`, `packages/ui/src/components/custom/search-filter/filter-list.tsx`, and `packages/ui/src/hooks/use-search-filter.ts`.

## 2026-03-31

- Extended the old sales-form door swap modal to support the new cross-catalog swap flow:
  - swap list now renders all door components from the Door step instead of only the currently visible subset
  - out-of-configuration doors are marked with a hidden-state icon on the card
  - selecting an out-of-configuration door now opens a second internal resolution view that surfaces the controlling visibility options and preselects the first available choice for each rule step
  - proceeding from that resolution view applies the chosen visibility-driving step selections, then swaps the selected door while preserving existing HPT door size and qty rows through the existing grouped-door update path
  - in-configuration doors now swap directly without reopening the size modal
- Tightened the old-form swap flow after runtime feedback:
  - removed the force-select restore path that was incorrectly selecting every generated size on the swapped door
  - added a settings-driven sequence tree-shake pass after visibility changes and swap completion so root/item-type changes trim the invoice item steps back to the configured route shape before totals are recalculated
- Added two old-form HPT swap refinements:
  - out-of-configuration door picks now skip the visibility-resolution view entirely when there is only one configuration set and every rule has at most one possible option, auto-applying those selections before the swap
  - HPT door side panel now exposes `Swap Item Type (n)` when the selected door is valid under multiple item types, and the action rebuilds the item through the selected item-type route while restoring only the previously selected door sizes and qty rows
- Fixed a critical old-form item-type swap regression:
  - the preserved-door restore path now always resolves and writes through the real `Door` step for the invoice item instead of accidentally writing the swapped door component onto the `Item Type` step when the caller originated from item-type swap
- Improved old-form item-type swap continuity:
  - common downstream steps now snapshot their selected component before item-type change and restore that selection after the rebuilt route is applied whenever the same step still exists and the prior component is still valid for that step
- Added an old-form post-swap missing-step completion flow:
  - after route-changing swaps or item updates, the form now checks for unresolved non-door steps and opens a guided modal instead of leaving the item in a half-configured state
  - the modal copies the current item step selections, shows segmented clickable progress for every non-door step, provides searchable component selection for the active step, and applies the staged selections back to the item only when `Done` is clicked

- Added project-overview document uploads on `/community/projects/[slug]` using a new reusable `DocumentUploader` component that supports multi-file selection, configurable accepted types/description text, optional upload notes, and an `onUploaded` callback flow.
- Added `community.uploadCommunityProjectDocuments` on the API side to upload multiple files through the shared document service, register canonical `StoredDocument` rows for `community_project` owners, and keep multiple uploaded files under one batch by storing `documentIds` arrays instead of a single `documentId`.
- Added the `community_documents` notification channel and activity type so project document uploads can fan out through the shared notification system, including project context, uploader name, note text, and linked `documentIds`.
- Updated notification activity fetching to batch-collect both legacy `documentId` tags and new `documentIds` arrays, fetch matching `StoredDocument` rows once, and append normalized document payloads back onto each activity for rendering.
- Extended the project overview query/widget to show a project document upload area, recent uploaded documents, and recent document activity with linked attachments, and updated notification-center items so document-linked notifications now render note text plus attached document chips.
- Validation note: a repo-wide `bunx tsc --noEmit` still exits with unrelated pre-existing workspace errors, but targeted greps of that output reported no matching errors for the touched community/project-overview and notifications files.
- Moved client-consumed community Zod schemas out of `apps/api/src/db/queries/community.ts` into the client-safe shared module `apps/api/src/schemas/community.ts`, and updated the community install-cost/model-cost forms plus the community router to import from the safe schema module instead of the server query file.
- Refactored the project overview operational tabs to reuse the canonical Units, Production, Invoices, and Jobs data tables with project-scoped `defaultFilters` instead of bespoke card lists, and added embedded table mode support so the overview keeps the shared row/mobile behavior without standalone batch actions or full-page empty-state chrome.
- Extended the shared jobs query contract with `projectId` / `projectSlug` filtering so the project overview can scope the main contractor jobs table directly to the active project using the same query path as the jobs page.
- Added explicit `projectTabColumns` exports to the shared Units, Production, Invoices, and Jobs column modules so the project overview tabs can use purpose-built embedded columns without changing the main standalone page layouts.
- Moved the project documents area into the same overview tab system as the operational data tabs, and wrapped each embedded data-table tab in `Suspense` with a lightweight per-tab fallback shell.
- Renamed the overview documents tab to `Project Timeline` and redesigned it around an activity-history feed that renders attached documents in a compact grid, including image thumbnails for image files and document cards with file names for non-image uploads.

## 2026-04-07

- Fixed the assign-job contractor picker and job re-assignment contractor picker so they now request a larger contractor result set from `hrm.getEmployees` and use explicit client-side filtering on contractor name, email, role, and username instead of the generic fuzzy `useSearch` helper.
- This resolves the regression where not all contractors were shown in the select-contractor step and typing in the contractor search field could trigger an application error.
- Added a proxy-level redirect engine for page migrations in `apps/www`, with a dedicated routing registry under `src/lib/routing/redirect-engine.ts` instead of embedding redirect semantics in sidebar links.
- The redirect engine now supports exact, dynamic `:param`, and prefix rules with deterministic precedence, preserves query strings by default, and normalizes login `return_to` paths through the same canonicalization flow used by the proxy.
- Wired the active `apps/www/src/proxy.ts` to resolve legacy paths before auth/access checks, starting with `/sales-book/production-tasks -> /production/dashboard`, and added focused tests for exact, pattern, prefix, and canonical-path behavior.
- Switched the in-app sales preview modal bridge to the new print template pipeline: `useSalesPreview` now creates signed sales print tokens, `SalesPreview` now renders the shared `PrintSalesV2`/`SalesPdfDocument` viewer, and preview launchers now pass canonical sales IDs instead of legacy order-number slugs.
- Kept the old `app-deps/(v2)/printer/sales/sales-print-display.tsx` stack isolated as legacy-only; preview accuracy now comes from the same `print.salesV2 -> getPrintData -> SalesPdfDocument` pipeline used by the public invoice preview and v2 print/download flow.
- Optimized the v2 sales print pipeline by making the print include mode-aware: invoice/quote keep financial relations, packing modes load delivery packing relations, and production mode skips both, instead of always loading the heaviest print shape.
- Removed an extra `salesOrders.findFirst` from the `print.salesV2` TRPC route by returning `firstOrderId` from `getPrintData`, so company-address resolution now reuses the already-fetched print dataset.
- Added a focused regression in `packages/sales/src/print/query.test.ts` to lock in the lighter include behavior across production, invoice, and order-packing modes.
- Added dashboard click-through navigation for sales insights: revenue bars now open `/sales-book/reports` for the clicked day, sales-rep leaderboard rows open `/sales-book/reports?salesRepId=&from=&to=` for a fixed last-30-days window, and top product rows now open `/sales-book/top-selling-products/[id]`.
- Added a new `/sales-book/reports` page that reuses the sales-accounting reporting surface, plus `/sales-book/top-selling-products` and `/sales-book/top-selling-products/[id]` routes that reuse the existing product-report grid under sales-book URLs.
- Extended the product-report payload to return product ids and support `productId` filtering, and extended sales-accounting query params to accept `from` / `to` aliases so dashboard deep links can land directly on filtered reports.
- Analyzed and fixed slow rendering on the community install-costs page and the community template v1 editor. Root causes were a heavier-than-needed legacy template payload, eager loading of autocomplete suggestions, all v1 tab sections mounting at once, and field components subscribing with `form.watch()` across the large template form.
- Reduced the legacy template query payload in `community.route.ts`, made install-costs fetch legacy v1 rates only when no modern rates exist, added query caching for install-cost rate reads, and memoized the install-cost rate context so the list page does less work on open/edit.
- Optimized the v1 editor by prefetching only the legacy template record, lazy-loading/caching design suggestions, switching field subscriptions from `form.watch()` to `useWatch()`, rendering only the active tab section, and only mounting the install-cost side-panel providers when the panel is actually open.
- Validation note: targeted `bunx tsc --noEmit` greps reported no matching errors for the touched community route, install-cost hook, and community-template-v1 files after the performance fixes.
- Fixed `/hrm/contractors/jobs` search and filters by implementing real `q`, `contractor`, and `project` handling in `apps/api/src/db/queries/jobs.ts`. Root cause was a broken `q` branch that emitted `OR: []` plus frontend-exposed `contractor` / `project` params that had no backend where-clause support.
- Expanded `jobFilters()` in `apps/api/src/db/queries/filters.ts` so the contractor jobs header now receives real filter options for contractor, project, and custom-job scope instead of only a bare search input.
- Validation note: targeted `bunx tsc --noEmit` greps reported no matching errors for the touched jobs query, filters query, and contractor jobs page/header files.
- Optimized `/community/unit-invoices` list loading by slimming the main invoice table payload in `apps/api/src/db/queries/unit-invoices.ts`. Root cause was the list query selecting full invoice task rows for every unit even though the page only needed invoice totals, production status, and task count.
- The unit-invoice list now fetches only the task fields needed to derive production status and totals, plus an explicit task count via `_count.tasks`; the mobile card now reads that count directly instead of relying on full task arrays in the table response.
- Validation note: targeted `bunx tsc --noEmit` greps reported no matching errors for the touched unit-invoice query and table files after the performance change.
- Optimized `/community/unit-productions` by replacing the summary widget query's full-row scan with count-based queries in `apps/api/src/db/queries/unit-productions.ts`, keeping the same status buckets without loading every matching task plus relations just to compute cards.
- Removed the blocking server prefetch for `getUnitProductionSummary` from the unit-productions page so initial render no longer waits on a second production-wide aggregate query before showing the page shell and table.
- Added a dedicated community unit-invoice reporting architecture with a separate API query module, shared report definitions, report query-state hook, and modal host so future invoice reports can plug into the same system cleanly instead of being embedded in the base invoice table flow.
- Implemented the first report, `Invoice Aging Report`, exposed from the `Report` dropdown in the unit-invoices header and rendered in a reusable report modal with aging summary cards and a unit-level aging table based on invoice created dates and open balance.
- Moved the invoice aging report onto a dedicated printable PDF route at `/p/community-invoice/ageing-report`, backed by a tokenized print query and a dedicated PDF document so invoice reports can follow the same durable print architecture as jobs and payout reports.
- Upgraded contractor payout history onto the standard filter architecture with shared query params and a dedicated filter route, adding date-range, contractor, and approved-by filters instead of the old custom search-only header.
- Added reusable contractor payout report printing across the payouts list and payout overview/detail screens using shared selection batch actions, a tokenized public print route, and a dedicated payout PDF document so future payout/payment reports can extend the same print stack.
- Fixed the shared `transformFilterDateToQuery` utility to recognize plural presets like `last 6 months` and to return `null` safely for invalid free-form date strings instead of throwing `Invalid time value` during invoice/report filtering.
- Added an `Edit Model Cost` CTA to the community unit-invoice modal, wired through the shared community model-cost modal params so invoice can hand off to model-cost editing and return when the user is done.
- Extended the unit-invoice form payload with the template pivot's current model-cost id and added a shared `returnToUnitInvoice` modal payload path so saving or deleting from the model-cost editor can invalidate invoice queries and reopen the originating invoice modal.
- Added data-driven "apply first row to all" checkboxes to the community unit-invoice desktop table headers for `Check` and `Check Date`, so users can propagate the first task's payment reference values across all tasks without manually repeating them.
- Switched the canonical auth redirect target in `apps/www` to `/login/v2`: the proxy login redirect, NextAuth auth pages, client auth-provider guest redirects, signout callbacks, and the redirect engine now all route legacy `/login` traffic into the v2 login page while preserving `return_to` query strings.
- Added `Edit` and `Delete` actions to the community templates table, wired `Edit` into the existing template modal flow, and added a guarded soft-delete mutation that hides deleted templates from the main list.
- Template deletion now blocks when a community template still has linked units, while the edit form now returns `oldModelName` and correctly propagates model-name renames to matching homes instead of leaving linked unit names stale.
- Tightened template form cache refresh by invalidating the community templates list and template form queries after save/delete so the templates page reflects changes immediately.
- Added a `Copy Design` flow to the community template v1 editor header. It opens a searchable modal of other templates showing model name, configured design count, project, and builder, and importing a result replaces the current in-memory v1 design form so the user can review and save it explicitly.
- Extended `getCommunityTemplates` with a reusable `templateSummary.configuredCount` payload so template selection UIs can show design completeness without recalculating it on the client.
- Enhanced the community template v1 autocomplete inputs with inline command actions for `Fill input with "..."` and `Clear input`, using a small shared `ComboboxDropdown` action slot so autocomplete fields can expose contextual actions without forking the base combobox behavior elsewhere.
- Added a community template v1 history feature backed by the existing `CommunityTemplateHistory` table. Each legacy template save now records a snapshot row with the current slug, author, and copied `design` meta, and the v1 editor header now exposes a `History` action that opens a right-side sheet.
- Added a dedicated `getCommunityTemplateHistory` query that returns history rows with save date, author name, and computed configured-design count so the v1 history sheet can show compact template version summaries without loading full snapshots into the UI.
- Hardened the optimized inventory importer to be properly re-runnable on more than just category creation: it now preloads existing `InventoryItemSubCategory` links and `InventoryImage` links, dedupes category-variant attributes against both DB and in-flight rows, skips duplicate same-run variant attribute parts, and avoids re-creating subcategory/image relationships on repeated imports.
- 2026-04-14: Old sales form saves now run `syncSalesInventoryLineItems` on the server save path immediately after persistence instead of relying on a client-triggered background task. This keeps `lineItems`, `lineItemComponents`, stock allocations, and inbound demand in sync when an existing sales form is edited. Files: `apps/www/src/app/(clean-code)/(sales)/_common/data-access/save-sales/index.dta.ts`, `apps/www/src/components/forms/sales-form/sales-form-save.tsx`.
- 2026-04-16: Added a signed dispatch PDF artifact flow for packing slips. `sales_dispatch_completed` now carries `salesId` plus attachment tags, the notification worker can trigger a new `attach-signed-dispatch-pdf` job after signed completion, the job renders the v2 packing-slip PDF server-side, uploads it through the document/Vercel Blob stack, registers it as a stored document, and appends the uploaded pathname to the completion activity's `attachment` tags. Also added a direct `apps/www` download route for `sales-v2` PDFs and extracted shared `getPrintDocumentData` / `renderSalesPdfBuffer` helpers so print, download, and background artifact generation all use the same v2 pipeline. Files: `packages/jobs/src/tasks/sales/attach-signed-dispatch-pdf.ts`, `packages/jobs/src/tasks/notifications/notifications.ts`, `packages/notifications/src/{activities.ts,index.ts,schemas.ts,types/sales-dispatch-completed.ts}`, `packages/sales/src/print/{index.ts,get-print-document-data.ts}`, `packages/pdf/src/sales-v2/{index.ts,render.tsx}`, `apps/api/src/trpc/routers/print.route.ts`, `apps/www/src/app/api/download/sales-v2/route.ts`, `apps/api/src/db/queries/dispatch.ts`.
- 2026-04-17: Optimized the `/product-report` backend query in `apps/api/src/db/queries/product-report.ts` by slimming `stepForms` to the fields actually used for totals, applying the active date/order filters directly to the selected rows, and extending date-range filtering to `salesDoors`. This reduces relation payload size and removes a major source of slow report loads while keeping the existing API shape unchanged.
- 2026-05-15: Added manual order-level inbound status tracking. `SalesOrders.inventoryStatus` now stores `AVAILABLE`, `ORDERED`, or `PENDING ORDER`; order saves prompt for the status, the Orders table shows a color-coded Inbound badge with warning row emphasis for `PENDING ORDER`, and `notes.saveInboundNote` updates the order while writing `inventory_inbound` order notes. `PENDING ORDER` also creates unread note recipients for inbound-channel subscribers. This is intentionally order-level only and does not create item-level inbound demands or purchase orders.
- 2026-05-15: Added the manual inbound update action to sales overview surfaces. Both the legacy sales overview action bar and the newer sales overview system quick actions now open the shared inbound status modal for orders, and the overview API returns the current `inboundStatus` so the modal is prefilled.
- 2026-05-20: Completed Phase 0/1 low-risk new sales form migration fixes. Dealer customer profile pricing is documented and validated as `salesPercentage`-based, dealer quote line totals are read-only derived dealer-facing totals, saves persist base `qty * unitPrice`, `www` load errors now render retry UI before skeleton fallback, and shared header actions now require real handlers before rendering. Automated regression passes: dealer/query/API set (21 tests, 140 assertions), shared sales domain/workflow set (99 tests, 286 assertions), and `@gnd/dealership` typecheck. Browser proof is still blocked by local auth/session redirects on both `www` and dealership plus a `www` tRPC runtime parse error in the unauthenticated shell.
- 2026-05-20: Pended the new sales form Phase 0 browser/runtime proof as an environmental gate instead of blocking implementation. Next phase work should continue with `NSF-P1-003` through `NSF-P1-006`: `www` customer/profile/tax recalc, Door/HPT pricing, shelf rollups, and moulding/service taxability. Resume `NSF-QA-002`/`NSF-QA-003` once local authenticated `www` and dealership sessions are available.
- 2026-05-20: Completed `NSF-P1-005` package proof for new-sales-form shelf pricing and section rollups. Hardened `normalizeShelfProductRow` so profile repricing only derives from explicit base metadata and legacy stored shelf rows without base metadata keep their current unit/sales price during sync/reopen. Added shelf calculator and workflow sync regressions for legacy rows, base-metadata profile repricing, and parent line qty/unit/total updates. Gates: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts` -> 38 pass / 115 assertions; `bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow` -> 110 pass / 334 assertions. Browser save/reopen proof remains pended behind the local auth/session gate.
- 2026-05-20: Completed `NSF-P1-006` package proof for moulding/service pricing and taxability. Fixed grouped moulding display totals to include shared non-moulding component price from the line workflow steps when deriving totals from persisted `meta.mouldingRows`. Added regressions for fresh/reselected moulding qty defaulting to 1, moulding shared component/addon/custom pricing and parent rollups, multi-row service tax/production flag aggregation, and grouped service display totals. Gates: `bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts packages/sales/src/sales-form/ui/workflow/workflow-line-totals.test.ts packages/sales/src/sales-form/ui/workflow/workflow-moulding-actions.test.ts` -> 42 pass / 121 assertions; `bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow` -> 116 pass / 356 assertions. Browser calculator/toggle proof remains pended behind the local auth/session gate.
- 2026-05-20: Completed the non-browser `NSF-P2-002` Phase 2 persistence/recovery proof while keeping autosave explicit opt-in/off by default. Local recovery snapshot creation/parsing is extracted into pure helpers and covered by app-level tests for storage key scoping, versioned parsing, invalid/stale rejection, and recoverable-content fingerprinting. Added state lifecycle coverage for hydrated autosave opt-in defaults, save error retention, edit-after-error reset, successful save cleanup, and local draft restoration preserving editor preferences. Extended API save/reopen assertions for customer profile id, tax code/rate/total, relational tax rows, and amount due. Gates: focused recovery/state tests -> 13 pass / 53 assertions; shared sales package -> 120 pass / 378 assertions; API save/reopen -> 12 pass / 114 assertions; app recovery unit -> 4 pass / 11 assertions. Browser refresh/network proof remains pended behind the local auth/session gate.
- 2026-05-20: Completed the first Phase 3 shared composer extraction. Added `packages/sales/src/sales-form/composer` with `composeSalesFormRecord`, `composeSalesFormSavePayload`, and `composeSalesFormPricingSnapshot`, including explicit coefficient and percentage pricing adapters. Rewired `www` new-sales-form save payload creation through the composer and dealership quote client display pricing through the percentage adapter while preserving dealer `salesPercentage` as dealer-only. Server-side dealer quote persistence remains local for now to avoid a `@gnd/db` -> `@gnd/sales` package dependency cycle. Gates: composer + dual-pricing focused tests -> 6 pass / 29 assertions; shared sales domain/state/workflow/composer -> 123 pass / 394 assertions; API save/reopen -> 12 pass / 114 assertions; `@gnd/dealership` typecheck -> pass; `git diff --check` -> pass.
- 2026-05-20: Completed `NSF-P1-003` code hardening for the `www` customer/profile/tax recalc chain. Added shared `setSalesFormCustomerProfileMeta(...)` so profile id/payment term changes, profile repricing, and summary recompute happen atomically; wired invoice overview customer resolution, manual profile selection, and default-profile selection through it. Focused proof: 23 tests / 88 assertions. Broader proof: sales-form domain/state/workflow 104 tests / 306 assertions, API new-sales-form 12 tests / 108 assertions, and `@gnd/dealership` typecheck pass. Browser proof remains pended behind local auth/session gates.
- 2026-05-20: Strengthened and marked `NSF-P1-004` Door/HPT pricing proof implemented at package level. Added workflow-door-action tests for supplier changes repricing persisted HPT rows with supplier variant cost, active profile multiplier, and shared component surcharge, plus missing supplier pricing zero/flag behavior. Focused proof: 37 tests / 109 assertions. Broader sales-form domain/state/workflow proof: 106 tests / 318 assertions. Browser proof remains pended behind local auth/session gates.
- 2026-05-22: Started the dealership quote UI migration off the flat line-item table and onto shared sales-form package UI. Added `SalesFormBasicWorkflowPanel` in `packages/sales/src/sales-form/ui/basic-workflow-panel.tsx`, built on the existing package workflow line list/invoice item card primitives, and swapped the dealership quote main panel to use it while preserving read-only dealer-facing totals from the percentage pricing adapter. This is the first UI extraction step toward a fully packaged workflow panel; the deeper Door/HPT/Shelf/Moulding/Service composed `ItemWorkflowPanel` still remains in `apps/www` for follow-up extraction. Gates: `bun test packages/sales/src/sales-form/ui/workflow/workflow-line-totals.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts` -> 11 pass / 36 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-22: Added the first package-level full workflow adapter boundary. Introduced `SalesFormWorkflowDataSource` / `SalesFormWorkflowActions` contracts and `SalesFormWorkflowPanel` under `packages/sales/src/sales-form/ui/workflow`, using app-supplied query hooks for route/component data instead of importing app tRPC into `@gnd/sales`. Dealership now exposes a dealer-auth `workflowReference` endpoint, mounts the package workflow panel in the quote composer, and preserves workflow payload (`formSteps`, `shelfItems`, `housePackageTool`, line `meta`) through client state, save schema, DB normalization, and saved quote metadata. The dealership page still keeps the basic flat pricing editor beside the package workflow panel while the remaining HPT/Shelf/Moulding/Service app-only controls are migrated into the adapter contract. Gates: `bun test packages/sales/src/sales-form/ui/workflow/workflow-line-totals.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts packages/db/src/queries/dealers.test.ts` -> 23 pass / 73 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-22: Removed the temporary side-by-side dealership quote fallback editor. `SalesFormWorkflowPanel` now supports host-provided workflow surface slots, add-line actions, built-in flat line editing, and pricing display controls, so dealership quotes render through one package workflow surface while keeping dealer-facing totals read-only and percentage-priced. The adapter contract now has explicit slots for HPT, shelf, moulding, service, and door-size surfaces; `www` still needs the final host-slot implementation before replacing its app-local `ItemWorkflowPanel`. Gates: dealer workflow/package tests -> 23 pass / 73 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-22: Advanced the package workflow surface toward full engine extraction. `SalesFormWorkflowPanel` now dispatches HPT, shelf, moulding, and service step families through host slots, while package-owned context/patch helpers preserve the canonical persisted shape. Moulding and service now also have package default editors, reducing the remaining host-only burden to the heavier HPT/shelf/modal surfaces. Gates: dealer workflow/package tests -> 23 pass / 73 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-22: Added a package-owned default shelf editor path to `SalesFormWorkflowPanel`. The panel now consumes host-supplied shelf category/product queries, renders category/product/qty rows through shared package UI, and persists via `buildWorkflowShelfSectionsPatch`. Dealership now exposes dealer-auth shelf reference endpoints and feeds them through the workflow data adapter, so shelf steps no longer require `www`-only protected routes. Remaining host-only workflow work is concentrated around HPT/door modals and privileged component edit/upload flows. Gates: dealer workflow/package tests -> 23 pass / 73 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-22: Wired the package-owned default HPT review/edit surface into `SalesFormWorkflowPanel`. Saved door rows now render through the shared `HousePackageToolPanel`, recover persisted door identifiers when component snapshots are incomplete, and persist LH/RH/swing/unit price edits through `buildWorkflowDoorRowsPatch` without requiring a dealership host slot. Door component cards also now select through the package workflow path when no host door-size modal is installed, unblocking dealership door selection. Advanced door size configuration, swapping, deletion, and supplier-specific modal flows remain host-slot work for the full `www` parity migration. Gates: dealer workflow/package tests -> 23 pass / 73 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-23: Expanded the package-owned Door/HPT defaults in `SalesFormWorkflowPanel`. The shared panel now loads Door-step components separately while HPT is active, honors route-level `noHandle` / `hasSwing` config, adds HPT size rows from package door-size candidate/pricing calculators, mounts `DoorSizeQtyDialog` for Door cards and HPT Configure Sizes, supports package-default HPT door deletion, and mounts `DoorSwapDialog` backed by `swapWorkflowDoorComponent`. The workflow data-source contract now also supports door suppliers; dealership feeds the public sales supplier reference query into the package panel, and supplier changes flow through `updateWorkflowDoorSupplier` so persisted HPT rows reprice through shared package logic. Gates: dealer workflow/package tests including door actions -> 29 pass / 96 assertions; `bun run --filter @gnd/dealership typecheck` -> pass.
- 2026-05-23: Added the repeatable new sales form migration harness at `bun run test:new-sales-form-migration`. It runs the focused shared sales workflow/domain/composer tests, dealer persistence tests, and dealership typecheck in one command. Also tightened package component action gating so `SalesFormWorkflowPanel` only renders admin actions (pricing, component edit, redirect, delete, custom component, door-size-variant authoring) when a host supplies real handlers, keeping dealership quote UI from showing dead controls while preserving `www` host-slot room. Gates: migration harness -> 71 pass / 232 assertions plus `@gnd/dealership` typecheck; targeted `@gnd/sales typecheck` grep reports no errors for touched workflow contract/component files, while full `@gnd/sales` and `@gnd/www` typechecks remain blocked by unrelated pre-existing repo errors.
- 2026-05-23: Added the internal `www` workflow data-source adapter for the shared `SalesFormWorkflowPanel` and documented the package contract in `packages/sales/src/sales-form/README.md`. This gives the `www` migration a concrete adapter boundary using the existing new-sales-form query hooks while keeping the old `ItemWorkflowPanel` in place until admin host slots are explicitly wired. A targeted `@gnd/www typecheck` grep reports no errors for the new adapter or touched package workflow files; full `@gnd/www` typecheck remains blocked by unrelated pre-existing workspace errors.
- 2026-05-23: Added the first internal `www` wrapper for the shared package workflow panel. `WwwSalesFormWorkflowPanel` reads the new-sales-form Zustand store, uses `useWwwSalesFormWorkflowData`, passes editable pricing, and writes active item changes back through `setEditor`. `new-sales-form.tsx` now has a dev-only "Package workflow panel" toggle that keeps the legacy `ItemWorkflowPanel` as the default while allowing side-by-side runtime comparison of the package panel without dropping old admin-only controls. Gates: migration harness passing; targeted `@gnd/www typecheck` grep reports no errors for the new wrapper/toggle/adapter or touched package workflow files.
- 2026-05-23: Closed the first review findings from the package workflow migration. Dealership workflow component and supplier references now route through dealer-protected `dealerPortal` endpoints instead of public `sales` procedures, the package shelf fallback received an initial design-system cleanup using semantic UI primitives/tokens, and `bun run test:new-sales-form-migration` now includes a watched-file `www` package-panel typecheck signal. Gates: migration harness -> 71 pass / 232 assertions plus `@gnd/dealership` typecheck; full `@gnd/www` typecheck still reports unrelated baseline errors, but the harness confirmed no watched migration files were mentioned.
- 2026-05-23: Added the first `www` admin host-action slot bridge for the shared `SalesFormWorkflowPanel`. The package workflow contract now exposes `slots.componentActions` and redirect-option hooks so host apps can wire privileged component behavior without moving app-owned dialogs or uploads into `@gnd/sales`. `WwwSalesFormWorkflowPanel` now supplies component pricing/edit, image upload, section override, redirect set/clear, and selected-component deletion through the existing shared component-edit dialog/actions while keeping the package panel as the shell. Gates: migration harness -> 71 pass / 232 assertions plus `@gnd/dealership` typecheck; full `@gnd/www` typecheck still reports unrelated baseline errors, but the watched migration files were not mentioned.
- 2026-05-23: Extended the `www` host-action bridge with door-size variant authoring. The package panel now exposes the Door Size Variant toolbar action through `slots.componentActions.onOpenDoorSizeVariant`, and `WwwSalesFormWorkflowPanel` mounts the existing `DoorSizeVariantDialog`, persists step meta through `sales.updateStepMeta`, and mirrors the updated `doorSizeVariation` metadata into the current line steps. Gates: migration harness -> 71 pass / 232 assertions plus `@gnd/dealership` typecheck; full `@gnd/www` typecheck still reports unrelated baseline errors, but watched migration files were not mentioned.
- 2026-05-23: Started Phase 27 dealership browser QA. The browser gate found a Turbopack JSX compile failure in the package workflow panel root notice slot; fixed it by lifting the notice JSX into a local variable and reran `bun run test:new-sales-form-migration` successfully: 76 sales package tests / 246 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output. After restarting dealership dev, `/quotes/new` correctly redirects to `/login`; Puppeteer captured the rendered dealer login page. Authenticated create/edit/save/reopen/convert browser QA is blocked because local MySQL is unavailable at `localhost:3306`, so dealer auth records/sessions cannot be loaded. Evidence and unblock steps are documented in `brain/new-sales-form-phase27-browser-qa.md`.
- 2026-05-23: Completed sales form UI parity Phases 1-2. Added a region-by-region source-of-truth map for the intact `www` `ItemWorkflowPanel` in `brain/dealership-www-sales-form-ui-region-map.md`, then moved workflow capability profiles into `@gnd/sales` via `createSalesFormWorkflowCapabilities`, `createInternalSalesFormWorkflowCapabilities`, and `createDealerSalesFormWorkflowCapabilities`. `www` now derives workflow admin gates from the shared package helper, and dealership consumes the dealer-safe capability profile for line-pricing editability. Gate: `bun run test:new-sales-form-migration` passed with 79 package tests / 250 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 3 by adding the package-level `SalesFormEnginePanel` API. The engine wraps the current workflow panel but centralizes workflow capability filtering for privileged slots and host data-source hooks, so both `www` package path and dealership now converge through the same shared engine boundary. Added engine gating tests for admin/dealer slot filtering and moulding calculator gating. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Advanced sales form UI parity Phases 4-5 and part of Phase 14. Confirmed the package line-list/card shell is the shared `WorkflowLineList`/`InvoiceItemCard` path, aligned the package root picker with the intact `www` `WorkflowComponentPreview` + `WorkflowComponentToolbar` composition, and removed the dealership-only native customer/profile/tax block from the main workflow surface. Dealership now uses a customer selector dialog patterned after `www` and renders customer/profile/tax controls in the summary/sidebar with the shared `SalesFormCustomerOverviewCard`. Also fixed the package root options trigger to avoid nested `<button>` markup. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 6. The shared package workflow now owns the moulding step selection popover behavior via `useMouldingWorkflow`, so dealership and `www` package paths share the same single/multi-select card action surface and quantity confirmation flow. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 15. `SalesFormEnginePanel` now passes the shared capability matrix into the package workflow, and dealer-safe capabilities make flat unit price, HPT door base price/addon/custom price, door-size dialog price edits, moulding addon/custom price, and service unit price read-only without forking the dealership UI. `www` internal/admin paths keep editable pricing through internal capabilities. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 17 markup cleanup. `TextWithTooltip` now renders a `span` in its non-tooltip state, fixing the known invalid `<div>` inside paragraph composition used by dealership table descriptions while preserving truncation/tooltip behavior. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 7 Door/HPT composition. The package HPT path now matches the intact `www` route-config behavior for swing columns: missing `hasSwing` hides swing instead of showing it by default, so dealership does not render an extra HPT column compared with `www`. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 8 shelf composition. The package shelf panel now matches the `www` section shell more closely: section clear confirmation, selected-product-safe category clearing, product clear handling, desktop row headers, `www` shelf section styling, and the internal shelf price popover are package-owned. Dealer capabilities keep shelf prices read-only while preserving the shared layout. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 270 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 9 moulding/service composition. Moulding and service editors are package-owned in the shared engine path, moulding calculator remains a host render hook, and dealership price-sensitive moulding/service fields are read-only through workflow capabilities instead of dealer-only UI forks. Gate covered by the latest `bun run test:new-sales-form-migration` pass.
- 2026-05-23: Completed sales form UI parity Phase 10 host-only slot gating and advanced Phase 20 regression coverage. `SalesFormEnginePanel` now removes redirect option providers when redirect management is disabled, matching the existing action-slot gating for supplier management, component editing, section overrides, redirect persistence, custom components, and selected-component deletion. Added package regression assertions for redirect provider filtering. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 272 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phase 19 type hardening. Removed the practical `record as any` cast from the `www` package workflow wrapper so `SalesFormEnginePanel` consumes the real `NewSalesFormLineItem` record contract. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 272 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phases 11, 13, 16, and 20. `www` and dealership now mount `SalesFormEnginePanel`; dealership main composition is an adapter for data/pricing/actions/capabilities only; dealer-safe data source filtering removes supplier-management hooks when supplier management is disabled; and package regression coverage now asserts privileged slot/data-source filtering. Gate: `bun run test:new-sales-form-migration` passed with 82 package tests / 274 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output.
- 2026-05-23: Completed sales form UI parity Phases 14 and 18. Dealership no longer renders bespoke customer/profile/tax controls in the workflow main panel; customer selection/profile/tax now live in the dealer summary/sidebar with shared sales-form overview primitives and a `www`-pattern customer selector dialog. The package workflow also now uses shadcn/Dialog/Label/Menu/Button primitives for the extracted shelf confirmation and price surfaces instead of a simplified fallback look.
- 2026-05-23: Completed the current non-browser implementation set for dealership/`www` sales-form UI parity. The shared `SalesFormEnginePanel` is the common package boundary, `www` and dealership both route through capability profiles, and dealer mode now hides or read-only gates pricing/admin internals including HPT base cost/surcharge rows and service tax/production controls. Final gate: `bun run test:new-sales-form-migration` passed with 82 sales package tests / 274 assertions, 15 dealer tests / 49 assertions, `@gnd/dealership` typecheck pass, and no watched migration files in tolerated `www` baseline output. End-stage browser parity remains blocked by authentication: `www` package routes redirect to `/login/v2` with TRPC `UNAUTHORIZED`, and dealership `/quotes/new` redirects to `/login`; Brain phase plan now keeps phases 12 and 21-28 open until authenticated fixtures are available.
- 2026-05-22: Added a persistent `apps/www` background task monitor for Trigger.dev jobs using a persisted Zustand store. `useTaskTrigger` now registers returned run ids, access tokens, user ownership, inferred task labels, and lightweight metadata into `useTaskMonitorStore`; the global task notification surface rehydrates across navigation/reload, resumes realtime run monitoring, shows a bottom-right running/failed task count FAB, expands into task details, supports run-id copy, marks stale running jobs as failed, auto-removes completed jobs, and keeps failed jobs visible until dismissed. `silent` toast behavior is now decoupled from monitor visibility via `monitor: true` for user-triggered silent jobs. Documentation lives in `brain/features/background-task-monitor.md`. Validation note: full `@gnd/www` typecheck remains blocked by unrelated pre-existing errors, but a filtered typecheck grep reported no errors for the touched task-monitor/task-notification/use-task-trigger files.
- 2026-05-25: Corrected dealer dual pricing to use the linked dealer customer's primary customer profile coefficient instead of dealer-owned `%` tiers. Both client and server quote pricing now follow old sales form coefficient math (`base price / coefficient`), Sales Book Dealers no longer creates/edits dealer pricing tiers, and the dealership quote margin toggle shows GND subtotal, dealer subtotal, gross profit, margin %, and dealer coefficient. Gates: focused dealer pricing/DPP/composer/API tests passed with 32 tests / 106 assertions; `@gnd/dealership` typecheck passed; `git diff --check` passed; filtered `@gnd/api` and `@gnd/www` typecheck greps reported no touched-file errors.
- 2026-05-30: Implemented a first `apps/www` page-loading performance pass from the Midday comparison. Added Next `optimizePackageImports`, disabled auth session focus refetch, converted global modal/sheet bodies and search/unit-invoice modal content to on-demand dynamic imports, and replaced first-visible fire-and-forget route prefetches with awaited server hydration across sales orders/quotes/reports/dispatch, community projects/unit-productions/customer-services, HRM employees, contractor/inventory pages, and sales accounting. Validation: targeted Prettier check passed for touched files; repo-wide `@gnd/www` typecheck was attempted but stayed silent for several minutes and was stopped, matching the known slow/baseline `www` gate.
- 2026-05-30: Added the second `apps/www` performance pass for remaining large active-route surfaces. Production v2 admin/worker boards, contractor payment dashboard/portal, packing list, and new sales form create/edit routes now enter through small lazy route wrappers instead of importing the full client implementations from the page module; packing list also server-hydrates the first visible tab. The payment portal job overview modal now loads only when its URL state is open. Validation: targeted Prettier check passed; full `@gnd/www` typecheck remains blocked by existing baseline errors, while a filtered typecheck grep reported no errors for the touched performance files after fixing a local payment-portal type guard.
- 2026-05-30: Continued the active-route `apps/www` performance pass. `sales-book/dispatch-task` now awaits the assigned dispatch table and driver list on the server before hydrating the driver table. Contractor `jobs-dashboard/jobs-list` now uses the server session to hydrate the worker jobs table instead of waiting for the client session before fetching. Active Shelf Items and Inventory Kind Review pages now server-hydrate their first visible datasets and load their client managers through small lazy wrappers. Validation: targeted Prettier check passed; filtered `@gnd/www` typecheck grep reported no errors for the newly touched continuation files. Full `@gnd/www` typecheck is still red on unrelated baseline errors, so browser/build performance proof remains required before claiming Midday-level completion.
- 2026-05-30: Added another `apps/www` route/detail and layout performance pass. Employee detail, community project detail, community unit detail, and Site Actions now await first-visible route data instead of using fire-and-forget `batchPrefetch`; community project detail also uses the correct nested `overview.project.title` shape. The protected sidebar no longer refetches page-tab defaults on mount/focus when server-provided defaults are already hydrated, while explicit invalidation can still refresh them. Worker dashboard and worker payments routes now lazy-load their Recharts-heavy client dashboards behind small route wrappers. Validation: targeted Prettier check passed; filtered `@gnd/www` typecheck grep reported no errors for these newly touched files after the project title fix. Full `@gnd/www` typecheck and browser/build performance proof remain open because the workspace still has unrelated baseline TypeScript errors.
- 2026-05-30: Reduced remaining shared `apps/www` provider startup tax. The command palette implementation is now dynamically imported from its provider instead of being bundled into the root provider module, the viewer shell only loads its dialog/content implementation once a viewer is actually opened, and the legacy modal provider dynamically imports its dialog/sheet shell only while a modal is shown. Validation: targeted Prettier check passed; filtered `@gnd/www` typecheck grep reported no errors for the touched provider files. Full `@gnd/www` typecheck and browser/build performance proof remain open on unrelated baseline issues, so this is still implementation progress rather than final Midday-level proof.
- 2026-05-30: Tightened the shared `apps/www` provider pass further. `CommandProvider` no longer imports `react-hook-form` or mounts the command palette on every page; it now keeps a tiny page-action registry/listener and loads the command dialog chunk only after the keyboard shortcut opens it. `TaskNotificationProvider` now mounts the notification UI only when persisted/running tasks exist, and the old clean-code layout now uses the lazy global sheets/modals/task providers instead of importing those implementations directly. Validation: targeted Prettier check passed; filtered `@gnd/www` typecheck grep reported no errors for the touched provider/layout files. Full `@gnd/www` typecheck and browser/build performance proof are still blocked by unrelated baseline issues.
- 2026-05-30: Reduced shared table first-mount runtime for active `apps/www` pages. The duplicated `useTableScroll` hook in `apps/www` and `@gnd/ui` no longer imports `react-hotkeys-hook` for every table, skips header-cell width measurement when the table does not overflow, and reuses one column-position pass for scroll button state instead of measuring twice on mount. Validation: targeted Prettier check passed for both hook files, and a standalone TypeScript check with the `apps/www` TypeScript runtime passed for the hook files. The filtered full `@gnd/www` typecheck was manually stopped after the underlying `tsc` process ran for several minutes with no filtered output; browser/build performance proof remains required before calling the Midday comparison 100% complete.
- 2026-05-30: Removed the remaining active-sidebar page-level fire-and-forget prefetches. `/sales-dashboard` now awaits only KPI data for first paint and leaves the already-dynamic chart/widget sections to load after the shell instead of racing server `batchPrefetch`. `/community/customer-services` now hydrates the visible work-order summary queries with awaited `fetchQuery` calls instead of fire-and-forget `prefetchQuery`. `/inventory/stocks` no longer renders an empty Suspense shell and redirects to the working inventory route. Validation: targeted Prettier check passed for the touched route files; active sidebar `page.tsx` scan now has no `batchPrefetch` / `prefetchQuery` / `prefetchInfiniteQuery` matches. Standalone TypeScript check passed for the new stocks redirect page, but full `@gnd/www` typecheck and browser/build benchmark proof remain open.
- 2026-05-30: Closed another `apps/www` active-route hydration/prerender gap. Sidebar pages that call `getQueryClient` now all render a `HydrateClient`, so server-fetched table/summary data can reach first client render instead of being discarded before client queries mount. Sidebar pages with protected server tRPC/query-client usage now all declare `export const dynamic = "force-dynamic"`. `/inventory/variants` matched the old empty-shell pattern and now redirects to `/inventory`. Validation: targeted Prettier check passed for the touched sales/inventory route files; scans for `getQueryClient` without `HydrateClient`, protected server-query pages without `force-dynamic`, empty Suspense shells, and sidebar page-level fire-and-forget prefetches all returned no matches. A filtered `@gnd/www` typecheck first caught two touched-file issues, which were fixed; the rerun stayed silent for the touched-file filter while the underlying full `tsc` continued through the known slow/baseline workspace and was manually stopped after about a minute. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Tightened the `/community/customer-services` active first-view client path. The visible work-order summary cards, customer-service table employee metadata query, and table work-order mutations now use route-local `useTRPC()` / `useQueryClient()` instead of importing `static-trpc`, aligning the client side with the server-hydrated route query paths and reducing singleton startup coupling on that page. Validation: targeted Prettier check passed for the touched customer-service and work-order summary files; a static scan for `static-trpc`, `_trpc`, and `_qc` across the touched first-view surface returned no matches; filtered `@gnd/www` typecheck grep for the touched files returned no errors. Full typecheck/build/browser benchmark proof remains open before claiming Midday-level completion.
- 2026-05-31: Reduced another active first-view table query cost on `/hrm/employees/v2`. The Employees table Office column no longer creates an `orgs.getOrganizationProfile` query observer in every visible row or imports `static-trpc`; the page now server-hydrates the organization profile query once, and the table fetches/reads it once at table level before passing orgs through table metadata. Validation: targeted Prettier check passed for employee/customer-service table files and work-order summary cards; static scan for `static-trpc`, `_trpc`, and `_qc` across the touched first-view table surfaces returned no matches; filtered `@gnd/www` typecheck grep for the touched files returned no errors. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Removed the remaining `static-trpc` import from the `/community/customer-services` visible header/filter path. `CustomerServiceHeader` now uses route-local `useTRPC()` for the customer-service filter route, so the customer-services page header, summary cards, and table path all avoid the singleton helper. Validation: targeted Prettier check passed for the customer-services page/header/table/summary files; a static scan for `static-trpc`, `_trpc`, and `_qc` across that visible surface returned no matches; filtered `@gnd/www` typecheck grep for the touched customer-services files returned no errors. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Removed the `static-trpc` singleton from the active `/community/project-units` table action path. Project-unit row delete/version actions now use route-local `useTRPC()` plus `useQueryClient()` invalidation, keeping the server-hydrated page/table/header path off the shared static helper. Validation: a static scan for `static-trpc`, `_trpc`, and `_qc` across the project-units page/header/table surface returned no matches; filtered `@gnd/www` typecheck grep for the touched project-units paths returned no errors before the underlying full workspace `tsc` was stopped after staying silent for those paths. The file has existing formatter drift, so Prettier `--check` would reformat unrelated indentation and was not used as a clean gate. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Tightened the `/community/builders` high-traffic route follow-up. The page already server-hydrates builder filters and the first table page, and the builder modal is lazy-opened; the remaining opened-form/action path now uses route-local `useTRPC()` plus `useQueryClient()` instead of the global `static-trpc` singleton for builder form invalidation. Validation: a static scan for `static-trpc`, `_trpc`, and `_qc` across the builders page/header/table/modal/form surface returned no matches; filtered `@gnd/www` typecheck grep for the touched builder files returned no errors before the underlying full workspace `tsc` was stopped after staying silent for those paths. Prettier `--check` still reports existing formatter drift in the builder form files, so no format-only churn was applied. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Tightened the `/community/templates` high-traffic route follow-up. The page already server-hydrates template filters and the first table page, and the template modal is lazy-opened; the modal's root form/schema/reorder shell now uses route-local `useTRPC()` instead of the global `static-trpc` singleton for schema-block reads and sort mutations. Validation: a static scan for `static-trpc`, `_trpc`, and `_qc` across the templates page/header/table/modal and touched root form shell returned no matches; filtered `@gnd/www` typecheck grep for the touched template files returned no errors before the underlying full workspace `tsc` was stopped after staying silent for those paths. Deeper template editor subcomponents still contain singleton paths and should be handled in later open-state-only cleanup passes. Prettier `--check` still reports existing formatter drift in these form files, so no format-only churn was applied. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Completed the follow-up cleanup for the remaining `/community/templates` open-state editor subcomponents under `components/forms/community-template`. Add/edit input, model input, listing/config/analytics tabs, block config, new block, and form header now use route-local `useTRPC()` / `useQueryClient()` instead of `static-trpc` for their queries, mutations, and invalidations. Validation: `rg "static-trpc|_trpc|_qc|_invalidate" apps/www/src/components/forms/community-template -g '*.tsx'` returned no matches; filtered `@gnd/www` typecheck grep for the touched template-editor files returned no errors before the underlying full workspace `tsc` was stopped after staying silent for those paths. Prettier `--check` still reports existing formatter drift in these form files, so no format-only churn was applied. Full typecheck/build/browser benchmark proof remains open.
- 2026-05-31: Tightened the `/site-actions` active table path after its route-level server hydration pass. The Site Actions data table now uses route-local `useTRPC()` instead of importing the global `static-trpc` singleton for its first-visible table query, keeping the hydrated page/table path aligned with the Midday-style route query-client pattern. Validation: `rg "static-trpc|_trpc|_qc|_invalidate" apps/www/src/app/\(sidebar\)/site-actions/page.tsx apps/www/src/components/tables/site-actions` returned no matches; the filtered `@gnd/www` typecheck grep for the site-actions paths stayed silent before the underlying full workspace `tsc` was stopped/expired through the known slow baseline. Prettier `--check` still reports existing formatter drift in the data-table file, so no format-only churn was applied. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Converted the active `/settings/notification-channels/v2` route from client-cold first load to server-hydrated first view. The page now declares `force-dynamic`, awaits the initial notification-channel list, roles, employees, and first selected channel detail on the server, then wraps the v2 client surface in `HydrateClient`. Validation: the active v2 page/component static scan for `static-trpc`, `_trpc`, `_qc`, and `_invalidate` returned no matches; filtered `@gnd/www` typecheck grep for the notification-channel paths stayed silent for 45 seconds before the underlying full workspace `tsc` was manually stopped; targeted Prettier check passed for the touched route. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Converted the active Super Admin `/task-events` dashboard and detail routes from client-cold first load to server-hydrated first view. The list page now awaits `taskEvents.list`, and detail pages await the event config, history, list invalidation target, and sales-order filter metadata when the event uses the sales filter system. Both pages declare `force-dynamic` and hydrate their client islands. The dashboard/detail components now use route-local `useTRPC()` instead of the global `static-trpc` singleton for queries, mutations, invalidations, run-status polling, and sales filter metadata. Validation: `rg "_trpc|static-trpc|_qc|_invalidate" apps/www/src/app/\(sidebar\)/task-events` returned no matches; filtered `@gnd/www` typecheck grep for task-event paths stayed silent for 45 seconds before the underlying full workspace `tsc` was manually stopped. Prettier was not used as the final gate because it reformats these legacy files wholesale; the final diff was restored to a tight, style-preserving patch. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Tightened the high-priority `/sales-form/create-order` customer bootstrap path. `SalesCustomerInput` now uses route-local `useTRPC()` for the selected-customer read and debounced customer lookup instead of importing `static-trpc`, reducing singleton coupling inside the already lazy-loaded sales form island. Validation: static scan for `static-trpc`, `_trpc`, `_qc`, and `_invalidate` across `sales-customer-input`, `sales-meta-form`, and `new-sales-form` returned no matches; filtered `@gnd/www` typecheck grep for the sales-customer/new-sales-form paths stayed silent for 45 seconds before the underlying full workspace `tsc` was manually stopped. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Removed the remaining `static-trpc` dependency from the customer-service work-order form interaction path. The form already used route-local `useTRPC()` for its reads/mutation; its save invalidation now also uses the local `trpc.customerService.getCustomerServices.infiniteQueryKey()` instead of `_trpc`. Validation: static scan for `static-trpc`, `_trpc`, `_qc`, and `_invalidate` in `work-order-form.tsx` returned no matches; filtered `@gnd/www` typecheck grep for the work-order/customer-service paths stayed silent for 45 seconds before the underlying full workspace `tsc` was manually stopped. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Removed the `static-trpc` singleton from the `/community/install-costs` editor surface. Legacy install-cost import and install-cost row save now use route-local `useTRPC()` plus `useQueryClient()` invalidation, matching the page's existing server-hydrated first-view query. Validation: `rg "static-trpc|_trpc|_qc|_invalidate" apps/www/src/components/community-install-costs apps/www/src/app/\(sidebar\)/community/\(main\)/install-costs -g '*.tsx'` returned no matches; filtered `@gnd/www` typecheck grep for install-cost paths completed with no touched-file output. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Removed `static-trpc` from the sales payment/reminder interaction path. `SalesPaymentNotificationsMenu`, `SendSalesReminder`, the sales overview payment-link action, and the sales payment processor now use route-local `useTRPC()` / `useQueryClient()` for order reads and payment invalidation; the customer overview pay-portal tab also dropped an unused singleton import. Validation: a static scan for `static-trpc`, `_trpc`, `_qc`, and `_invalidate` across the touched payment/reminder files returned no matches. The first filtered typecheck caught legacy `unknown` output assumptions after moving to typed local tRPC; those were fixed with narrow `RouterOutputs["sales"]["getOrders"]` aliases, and the rerun stayed silent for the touched-file filter for about 70 seconds before the known slow full `tsc` was stopped. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Removed `static-trpc` from the new-job modal workflow. Project, task, unit, contractor, and final form steps now use route-local `useTRPC()` for their project/unit/task/employee lookups, and adjacent form submit/missing-config typing was tightened where the local tRPC pass exposed loose `unknown` defaults. Validation: `rg "static-trpc|_trpc|_qc|_invalidate" apps/www/src/components/modals/new-job -g '*.tsx'` returned no matches; filtered `@gnd/www` typecheck grep for `modals/new-job` and the touched step components completed with no touched-file output. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Removed `static-trpc` from the model install-cost modal and two related active interaction paths. Model install-cost reorder/update/delete/add/create flows now use route-local `useTRPC()` plus `useQueryClient()`, the create-community-project modal uses local `useTRPC()` for its opened form query, and sales-accounting export uses local `useTRPC()` for its disabled export query. Also corrected `SortableDragHandle` typing in `@gnd/ui` so button variant/size props are represented correctly instead of surfacing as touched-file errors. Validation: static scan for `static-trpc`, `_trpc`, `_qc`, and `_invalidate` across the touched model install-cost modal, create-project modal, and sales-accounting export files returned no matches; filtered `@gnd/www` typecheck grep for those files plus `SortableDragHandle` completed with no touched-file output after fixing the sales-accounting filter payload type. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Removed `static-trpc` from the organization switcher/settings component. The organization profile read and create invalidation now use route-local `useTRPC()` plus `useQueryClient()`, and stale disabled delete/switch mutation calls were removed because those routes are not present on the typed org router. Validation: static scan for `static-trpc`, `_trpc`, `_qc`, and `_invalidate` in `organization.tsx` returned no matches; filtered `@gnd/www` typecheck grep for the organization component completed with no touched-file output after removing the dead mutation references. Full typecheck/build/browser benchmark proof remains open before this can be called 100% complete.
- 2026-05-31: Continued the `apps/www` page-loading/navigation pass on the remaining active routes. `/contractors/jobs/payments` no longer blocks the route response on `jobs.paymentDashboard`; the visible payout table and filters are still server-hydrated while dashboard metrics can resolve through the existing client skeleton state. Legacy `/hrm/employees` now server-hydrates `orgs.getOrganizationProfile` alongside filters and employee rows, matching `/hrm/employees/v2` and avoiding a cold first-paint organization metadata query. `/sales-book/dealers` now server-hydrates sales profiles with the dealer list, and the add-dealer customer-candidate search is disabled until the dialog opens. Also tightened a touched dealer mutation variable guard exposed by TypeScript. Validation: `git diff --check` passed; filtered `@gnd/www` typecheck grep for the touched payments, employees, dealers, dashboard/profile, and candidate-query paths completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced more cross-navigation client/background query pressure in `apps/www`. Added `useIdleQueryEnabled` for low-priority post-paint queries. The global header `SalesRepRequestBadge` now waits for idle time, requires seeded `editOrders` permission, disables focus refetch, and uses a short stale window before requesting dealer-order request counts, avoiding an unconditional count query after every protected navigation. `/contractors/jobs/payments` still server-hydrates the payout table/filter path, but its secondary `paymentDashboard` aggregate now starts after idle instead of competing with first paint. `SavePageTabButton` now skips `pageTabs.list` until there is an active filter query worth saving. The task-event detail route now starts `taskEvents.list` in parallel with the event lookup, reducing an avoidable server waterfall. Validation: `git diff --check` passed; filtered `@gnd/www` typecheck grep for the touched idle hook, sales request badge, payment history, task-event route, page-tabs save button, and related query names completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Tightened the remaining always-mounted protected header costs. Notification feed queries now accept explicit enable flags: the header bell waits until idle/open before loading the notification account and inbox feed, and the archive feed waits until the popover is open on the archive tab. The notification popover is now controlled so this gating follows real open state. `UserNav` now receives the already-computed `linkModules` from `Header` instead of recomputing the sidebar link tree with another `useLinks()` call, and its dropdown content no longer uses `forceMount`, so the account/navigation menu body mounts only when opened. Validation: `git diff --check` passed; exact-path filtered `@gnd/www` typecheck grep for the notification center/hooks, header, user nav, and idle hook completed with no matching touched-file errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Removed two more client-cold first-view fetches from active navigation routes. `/sales-book/dispatch`, `/sales-book/dispatch/v2`, and `/sales-book/dispatch-admin` now hydrate the driver employee list in parallel with their visible dispatch table/summary data, so `sales-dispatch` table assignment controls and batch actions read cached driver data instead of issuing a separate client request after mount. `/contractors/jobs/payment-portal` now resolves the requested or first contractor from the hydrated payment dashboard data and server-hydrates the matching initial `paymentPortal` result, avoiding the previous client-only portal jobs fetch after the selected contractor effect runs. Validation: `git diff --check` passed; exact-path filtered `@gnd/www` typecheck greps for the touched dispatch routes/table paths and payment-portal route completed with no matching touched-file errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/inventory` first-navigation blocking work. The route now hydrates only the immediately visible inventory products table instead of awaiting low-stock plus four summary-card queries before render. Inventory summary cards and the low-stock alert now use idle-enabled client queries with focus refetch disabled and short stale windows, so dashboard widgets no longer compete with the first table paint. Also corrected the Low Stock summary card to request `stock_level` instead of `inventory_value`. Validation: `git diff --check` passed; full `@gnd/www` typecheck still fails on existing baseline errors, but the exact touched-file typecheck grep for the inventory route/widgets/cards completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/inventory/imports` navigation blocking while preserving the first visible table. The imports route now server-hydrates only the active import rows needed by the control center/table; the total-products, category-count, and kind-classification review widgets wait for idle client queries with focus refetch disabled and short stale windows. The control center shows pending/checking states for deferred classification data instead of reporting a false healthy state before the idle query resolves. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the imports route no longer has server-side summary/review queries; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after tightening mutation input and kind-review summary typing. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/hrm/contractors/jobs` navigation blocking. The route now server-hydrates only the job filters and first jobs table page; `jobs.getKpis` moved out of the server `Promise.all` and into the existing KPI widget skeleton path, gated by idle time with focus refetch disabled and a short stale window. This keeps the admin jobs table/header responsive first while aggregate cards resolve after the page is interactive. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the route no longer has server-side `getKpis`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Removed unused server work from `/inventory/components`. The components route no longer runs the old `batchPrefetch`/summary hydration path or awaits four inventory summary queries that are not rendered by the page; it now hydrates only the visible component products table and keeps the route `force-dynamic` with `HydrateClient`. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan found no `inventorySummary`, `InventorySummary`, or `Promise.all` in the route; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/community/unit-productions` navigation blocking. The route now server-hydrates only the visible unit-productions table page instead of awaiting `getUnitProductionSummary` alongside rows; the summary cards use their existing skeleton path and load after idle with focus refetch disabled and a short stale window. Also narrowed the unit-production `production` URL parser to the API enum so the client summary query is strongly typed. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the route no longer has server-side `getUnitProductionSummary` or `Promise.all`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after the parser tightening. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/community/customer-services` first-navigation blocking. The page still server-hydrates the visible customer-service table and Punchout employee metadata used by the table, but no longer awaits four `workOrder.getWorkOrderAnalytic` calls on the route. Work-order summary cards now use route-local `useTRPC()` plus idle-enabled `useQuery` with their existing skeleton UI, focus refetch disabled, and a short stale window. This also removes the remaining static-trpc/suspense query path from those summary cards. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the route no longer contains `getWorkOrderAnalytic`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/community/projects` first-navigation blocking. The route now server-hydrates only the immediately visible community projects table instead of awaiting `communityProjectsOverview` before render; `CommunityProjectsAnalyticsCards` now uses an idle-enabled client query with skeleton cards, focus refetch disabled, and a short stale window. Also tightened community project status and project-unit URL parsers to the router enum values, removed loose casts from project-unit analytics/table hydration, and corrected the reused project-units analytics inputs so navigation query params stay type-safe. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed after a sandbox manifest retry; static scan confirmed the projects route no longer contains server-side `communityProjectsOverview`, `Promise.all`, or `as any`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Trimmed worker jobs-dashboard navigation cost. `/jobs-dashboard` no longer server-prefetches `user.getProfile`, which was not consumed by the rendered worker overview, and the worker overview/payments analytics queries now keep hydrated data warm for a short window with focus refetch disabled. This preserves first-view analytics hydration while avoiding an unused server request and immediate repeat analytics pressure during tab focus/navigation. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after fixing a legacy `PaymentCard` icon type. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/sales-rep` tab/navigation work. The route no longer fire-and-forget prefetches recent orders or blocks every visit on `dealerOrderRequestCount`; it now parses the active tab, server-hydrates only that tab's first visible data (`recent-sales`, `recent-quotes`, or `requests`), and moves the request-count badge to the existing idle/permission-gated client query path. The recent sales table is now a dynamic island like the quote/commission/profile panels, reducing the initial page bundle for non-sales tabs. Also server-hydrated `/contractors/jobs/payments/[paymentId]` so payout details do not cold-load on the client after navigation, and kept hydrated payment dashboard/detail queries warm with focus refetch disabled. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after fixing local icon/data output types in the payment dashboard components. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/inventory/inbounds` client-cold navigation. The route now server-hydrates inbound suppliers, the shipment queue, demand queue, and the first visible inbound's detail/documents/extractions/activity data. The client initializes the selected inbound from hydrated shipments instead of waiting for a post-render effect before enabling detail queries, and inbound list/detail queries now disable focus refetch with a short stale window. Also corrected the active summary terminal-state check to use the current `InboundStatus` values (`completed`, `closed`, `cancelled`). Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Note: Prettier reformatted the legacy inbound component broadly, but the whitespace-insensitive diff is focused on hydration/query timing and the status comparison. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/sales-book/dispatch-admin` view-specific navigation blocking. The route no longer awaits `dispatch.dispatchSummary` before every admin dispatch render; summary cards, overdue banner, and workload sidebar now fetch through their Suspense boundaries with focus refetch disabled and a short stale window. Server prefetch is now split by active view: table view hydrates only dispatch table rows plus driver metadata, while calendar view hydrates only `exportDispatches` data and skips the table/driver queries entirely. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the route no longer has server-side `dispatchSummary`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced production v2 route startup cost for both `/production/dashboard/v2` and `/sales-book/productions/v2`. The routes no longer await `sales.productionDashboardV2` aggregates before rendering; they hydrate only the first visible `productionsV2` board page. The server prefetch now includes `size: 20` to match the client infinite-query key, so the first board page can hydrate instead of cold-refetching under a different key. Production dashboard, board, and employee-filter queries now disable focus refetch and use a short stale window. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed route-level `productionDashboardV2` prefetches were removed; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Note: Prettier reformatted the large legacy `production-v2/shared.tsx`; the whitespace-insensitive diff is focused on query timing and hydration-key alignment. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/community/project-units` first-navigation blocking. The route no longer server-fetches `communityProjectUnitsOverview` before rendering analytics cards; it now server-hydrates only the visible project-units table page, while analytics cards use idle-enabled client `useQuery` with skeleton metrics, focus refetch disabled, and a short stale window. The analytics query now also passes the full filter set (`template`, `invoice`, and `installCost` included) so deferred results match the current table scope. `ResponsiveMetric` now accepts a React node title so shared skeleton metric cards can render without fake text. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed no route-level `communityProjectUnitsOverview` prefetch remains; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/sales-book/customers/v2` and shared sidebar startup/navigation pressure. The customer directory route now server-hydrates only the immediately visible customer index table instead of also awaiting `customers.getCustomerDirectoryV2Summary`; summary cards defer to an idle client query with skeletons, focus refetch disabled, and a short stale window. The shared sidebar now keeps hydrated page-tab defaults instant when present but idle-gates the fallback `pageTabs.defaults` query, so sidebar bookkeeping no longer competes with the destination page's first visible data on cold protected-route navigation. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the customer route no longer contains `Promise.all` or `initialSummaryData`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/jobs-dashboard` and `/jobs-dashboard/payments` route and client startup cost. Both routes now render the lazy worker dashboard islands without awaiting `jobs.getJobAnalytics` and `jobs.earningAnalytics` on the server, so protected navigation is not blocked by dashboard aggregates. Worker overview/payment metrics now wait for idle client queries with skeleton states, focus refetch disabled, and a short stale window. The Recharts area/bar charts were moved into separate dynamic chart chunks that render only after analytics are ready, keeping the first dashboard island from pulling chart code into the initial navigation bundle. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the worker dashboard routes no longer contain server analytics fetches and the overview/payment shell files no longer import `recharts`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Tightened `/sales-dashboard` post-KPI navigation cost. The route still keeps KPI data as the first server-hydrated view, but `DashboardDeferredSections` now waits for idle time before mounting the chart and widget dynamic imports, showing existing skeletons in the meantime so those lower-priority chunks do not compete with the first dashboard paint. The chart date-range selector now dynamically imports the `@gnd/ui/calendar` implementation, so the initial selector/button chunk no longer eagerly carries the calendar until the popover content is opened. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the deferred dashboard sections are idle-gated and the calendar import is dynamic; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/community/unit-invoices` first-header bundle pressure. The page already server-hydrates the visible unit-invoices table and the unit-invoice modal content was already dynamic; the remaining eager cost was the header report path. `UnitInvoicesHeader` now keeps only the search filter and report trigger in the first chunk, while report definitions, all-invoices alert UI, `useQueryStates`, and report print/token helpers live in `UnitInvoicesReportMenu`, a dynamic component loaded only after the Report menu is first opened. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the header no longer imports report definitions, print helpers, alert dialog, or `useQueryStates`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced shared Midday search-filter bundle pressure across many table routes. `SearchFilterTRPC` no longer imports `@gnd/ui/calendar` eagerly for every page header; the date/date-range calendar is now a dynamic import with a lightweight skeleton, so pages such as builders, orders, quotes, product report, employees, jobs, productions, and community tables do not carry calendar code on first navigation unless a date filter submenu is rendered. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the calendar import is dynamic inside `search-filter-trpc`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/product-report` route navigation blocking. The route now server-hydrates only the visible product report grid and no longer awaits `filters.productReport` metadata before rendering. `ProductReportSearchFilter` now uses the shared `SearchFilterAdapter`, so filter options follow the lazy focus/open/active-filter behavior instead of fetching immediately on mount, while the existing table hydration still prevents a client-cold first grid load. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed the route no longer contains `Promise.all`, server-side `filters.productReport`, or `initialFilterList`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced `/sales-book/orders` and `/sales-book/quotes` route navigation blocking. Both routes now await only their visible first table page and no longer block on `filters.salesOrders` / `filters.salesQuotes` metadata before rendering. `OrderSearchFilter` and `SalesQuoteSearchFilter` now use the shared `SearchFilterAdapter`, preserving sales-manager-aware filter options while moving metadata fetches to the lazy focus/open/active-filter path. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scans confirmed no route-level sales filter metadata fetches or old eager search-filter queries remain in the touched files; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after making the existing sales filter input cast explicit at the query boundary. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Further narrowed the active performance pass to `/sales-book/orders` and `/sales-book/quotes` only. The orders export action no longer imports `xlsx`, `dayjs`, or report formatting helpers in the first orders header bundle; those modules are dynamically imported inside the export click handler after the export query is requested. This keeps normal orders navigation focused on the hydrated table/header path instead of shipping spreadsheet-generation code up front. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scans confirmed no top-level `xlsx`/`dayjs`/formatting imports remain in `sales-order-export`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after adding a narrow export-row type at the refetch mapping boundary. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced first-mount table action bundle cost for `/sales-book/orders` and `/sales-book/quotes`. The orders and quotes table islands no longer statically import their batch-action stacks during normal page navigation. Batch actions are now dynamic chunks gated behind `table.selectedRows.length`, so print/email/payment/delete action code is fetched only after the user selects rows instead of riding along with the initial hydrated table render. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed; static scan confirmed both table islands use dynamic batch actions and no longer have static `./batch-actions` imports; exact touched-file `@gnd/www` typecheck grep completed with no matching errors. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.
- 2026-05-31: Reduced quote row-action startup cost on `/sales-book/quotes`. The visible quote columns no longer import `SalesMenu`, `SalesOverviewVersionMenuItems`, or `useSalesPreview` at module load. Quote row menu actions now live in a dynamic `row-actions-menu` chunk that loads only after the row More button is opened, and quote preview preparation dynamically imports the sales print service only after the Preview button is clicked. Validation: `git diff --check` passed; targeted Prettier check with LF line endings passed after clearing the generated `.next` cache to recover local disk space; static scan confirmed the heavy quote menu/preview imports are no longer top-level in `sales-quotes/columns`; exact touched-file `@gnd/www` typecheck grep completed with no matching errors after widening the dynamic menu row prop boundary. Full build and live browser navigation benchmark proof remain open before this can be called 100% complete.

# Progress

> Structured Brain task tracking now lives under `brain/tasks/`. This file remains the chronological session log and historical execution record.

- Refined the sales overview action row controls.
  - Renamed the packing action from `Send for Packing` to `Pack` and added a tooltip explaining that it sends remaining order items to the packing queue.
  - Standardized the visible overview action-row buttons to the same height, flex width, minimum width, icon/text layout, and added a same-sized `More` menu trigger.
  - Removed the overview `Inbound` button and `Update Inbound` menu item from both the shared sales overview system and the legacy sheet action bar. The shared inbound status modal remains because inbound-management still depends on it.
  - Swapped the Preview icon from file-search to eye and moved the legacy general-tab priority dropdown onto the next line beneath the action row.
  - Updated docs: `brain/features/order-inbound-status.md` and `brain/progress.md`; no API/database docs were needed because this is a presentation/navigation-only change.
  - Validation: scoped `git diff --check` passed for the touched sales overview files; targeted search confirmed the old overview label and inbound action references were removed from the touched action-row components.

- Matched the `/sales-rep` tab selector to the sales overview/sales-book button-group navigation pattern.
  - Replaced the `TabsList`/`TabsTrigger` header with shared `ButtonGroup` + `Button` links using the same active styling pattern as `SalesTabs`.
  - Added URL-backed tab links for Requests, Recent Sales, Recent Quotes, and Commission while preserving `start`/`end` query params and the existing active-tab server hydration behavior.
  - Updated docs: `brain/features/sales-rep-dashboard.md` and `brain/progress.md`; no API/database docs were needed because this is a presentation/navigation-only change.
  - Validation: scoped `git diff --check` passed for the sales-rep route file. Broad build/typecheck/browser validation was not run under fast Bun monorepo command discipline.

- Renamed the production-to-local database sync command.
  - Replaced the root `db:sync:prod-to-local` script family with `db:sync`, `db:sync:dry-run`, and `db:sync:table`.
  - Renamed the package-level `sync:prod-to-local` script family to `db:sync`, `db:sync:dry-run`, and `db:sync:table`, and updated the script help text plus agent command guidance.
  - Updated docs: `brain/database/migrations.md` and `brain/progress.md`; no database schema, API contract, or migration behavior changed.
  - Validation: targeted script search confirmed no old sync command names remain in active `package.json` scripts; old names only remain in Brain history describing the rename. No sync command was executed because it can write local database data.

- Added a Receive Payment action to the sales overview Transactions tab.
  - Reused the existing `SalesPaymentProcessor` with the loaded sales overview context so unpaid orders can open the payment flow directly from transaction history.
  - The action is hidden for quotes and fully paid orders.
  - Moved the transaction list load from the web server action to `sales.getSaleTransactions` in the API tRPC router, and scoped multi-order payment rows to the opened order so unrelated order payments do not appear from a shared customer transaction.

- Implemented C.C.C-aware sales print footer handling for partial and mixed payments.
  - Added `packages/sales/src/print/compose/payment-footer-state.ts` to classify unpaid card estimates, unpaid non-card records, full single card payments, full single non-card payments, and partial/mixed payment records.
  - Updated print `composeFooter` so unpaid card-selected invoices split `Order Due Amount`, calculated `C.C.C`, and `Total Due With C.C.C`; partial/mixed invoices separate `Order Total`, `Paid Toward Order`, principal `Balance Due`, and recorded `Card Payment` / `C.C.C on Card Payment` / `Charged to Card` lines when exact per-payment C.C.C metadata is available.
  - Updated print `composeMeta` so header total/balance due follows the same state machine and partial/mixed balance due is not inflated by estimated C.C.C.
  - Extended the print financial include to load linked payment transaction and Square metadata for C.C.C extraction.
  - Updated sales overview invoice breakdown `costLines` and the overview Finance tab so overview sheet/preview/print labels are driven by the same payment-state semantics.
  - Added print-data regression tests for unpaid card estimate, fully paid single card payment, and partial card plus cash payment.
  - Updated docs: `brain/plans/2026-06-24-feature-sales-print-ccc-partial-payment-footer.md`, `brain/tasks/done.md`, `brain/tasks/roadmap.md`, `brain/features/sales-pdf-system.md`, `brain/api/contracts.md`, and `brain/progress.md`; no database docs were needed because there are no schema or migration changes.
  - Validation: scoped `git diff --check` passed. Focused unit tests were added but not run under fast Bun monorepo command discipline; recommended check is `bun test packages/sales/src/print/get-print-data.test.ts`.

- Cleaned up old sales print routes and legacy PDF logic after the v2 template-system cutover.
  - Normalized the remaining sales Share action and notification email PDF links onto `/api/download/sales-v2`.
  - Removed the old `SalesHelper` wrapper, retired `trpc.print.sales` and `trpc.sales.printInvoice`, deleted orphaned legacy sales print data/rendering modules, and removed the `@gnd/pdf/sales` export.
  - Kept `/api/download/sales` as a thin compatibility redirect to `/api/download/sales-v2` and left `/p/sales-invoice` as a v2 viewer compatibility shell for older links.
  - Updated docs: `brain/features/sales-pdf-system.md`, `brain/api/endpoints.md`, and `brain/progress.md`; no database docs were needed because there are no schema or migration changes.
  - Validation: focused `rg` checks showed no remaining active references to `SalesHelper`, `trpc.print.sales`, `sales.printInvoice`, `generateLegacyPrintData`, `getInvoicePrintData`, or `@gnd/pdf/sales`; broad typecheck/build/browser validation was not run under fast Bun command discipline.

- Moved the dedicated mobile invoice customer-selector search to a fixed bottom input.
  - Added an opt-in bottom search mode to `CustomerStep` using `react-native-keyboard-controller` `KeyboardStickyView`, preserving the virtualized `FlatList` and adding bottom padding so customer rows do not sit under the fixed input.
  - Wired the dedicated `CustomerSelectorScreen` to use the bottom search mode while leaving the inline initial customer step inside the invoice form on its existing header search layout.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation behavior only.
  - Validation: scoped `git diff --check` passed; focused Biome and Expo TypeScript checks were not clean because of pre-existing lint/type issues in the touched files and wider workspace, including `customer-skeleton-${index}` key lint, existing `invoice-form-screen.tsx` hook/`any` lint, and unresolved `@sales/*` typecheck paths.

- Made credit-card convenience charge a derived payable/display amount instead of an order-stored charge.
  - New sales-form save/update/delete paths now store base `SalesOrders.grandTotal` and `amountDue` without derived C.C.C while still returning hydrated display summaries with `summary.ccc` and C.C.C-inclusive `summary.grandTotal` when credit card is selected.
  - Legacy root order metadata no longer persists `ccc`; it keeps payment method and `ccc_percentage` for derivation.
  - Sales print/PDF data and legacy print footer now derive displayed invoice/due totals from the stored base amount plus the applicable payment-channel charge.
  - Updated docs: `brain/api/contracts.md`, `brain/features/mobile-invoice-form.md`, `brain/decisions/ADR-011-derived-ccc-payment-channel-charge.md`, and `brain/progress.md`; no database docs were needed because there are no schema or migration changes.
  - Validation: `bun test packages/sales/src/sales-form/application/legacy-metadata.test.ts packages/sales/src/sales-template/invoice-print-data.test.ts apps/api/src/db/queries/new-sales-form.test.ts` passed with 30 tests and 173 assertions.

- Extracted the mobile inline Sales/Quote chooser into a reusable component.
  - Added `FloatingFooterActionChooser` as a standalone native floating-footer action chooser that reuses the flat sales list-row style without Gorhom, portals, or the shared modal wrapper.
  - Reworked `NewSalesTypeSheet` into a thin adapter that supplies the New Invoice trigger, Sales/Quote options, and route action to the reusable chooser.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API or database docs were needed because this is mobile UI component structure only.
  - Validation: focused Biome check for the chooser and route helper files passed; focused new-sales route helper and invoice form store tests passed; scoped `git diff --check` passed; search confirms the chooser components do not import Gorhom or the shared modal wrapper.

- Restored the dedicated mobile customer-selector route for New Invoice after confirming the inline Sales/Quote chooser fixed the crash.
  - The New Invoice action still uses the inline Sales/Quote chooser with no bottom sheet or portal-backed modal.
  - Selecting Sales or Quote now routes to `/(sales)/invoices/customer-selector` with the selected type and `source=new`, restoring the customer-selector screen before entering the invoice form.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API or database docs were needed because this is mobile navigation behavior only.
  - Validation: focused new-sales route helper and invoice form store tests passed; scoped Biome check for the chooser/route helper files and scoped `git diff --check` passed; search confirms the chooser still does not import Gorhom or the shared modal wrapper.

- Removed the portal-backed bottom sheet from the mobile New Invoice Sales/Quote chooser.
  - Replaced the detached `@gorhom/bottom-sheet` modal with an inline expanded chooser under the New Invoice action.
  - Selecting Sales or Quote now resets/applies the form type and routes to the typed invoice form without dismissing a bottom sheet during navigation.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API or database docs were needed because this is mobile UI/navigation behavior only.
  - Validation: focused new-sales route helper and invoice form store tests passed; scoped Biome check for the chooser and scoped `git diff --check` passed; search confirms the chooser no longer imports Gorhom or the shared modal wrapper.

- Disabled Android edge-to-edge for the Expo app after the mobile invoice customer-selection crash continued inside `EdgeToEdgeReactViewGroup`.
  - Changed `apps/expo-app/app.config.ts` to set `android.edgeToEdgeEnabled` to `false`.
  - This is a native build setting, so the mitigation requires a fresh Android EAS/dev build and cannot be validated through only Metro reload or OTA update.
  - Updated docs: `brain/features/mobile-build-variants.md`, `brain/features/mobile-invoice-form.md`, and `brain/progress.md`; no API or database docs were needed because this is native mobile shell configuration only.
  - Validation: scoped Biome check for `apps/expo-app/app.config.ts` and scoped `git diff --check` passed.

- Restored the default mobile New Invoice customer selector.
  - Reverted the no-customer start path from the Sales/Quote chooser and removed the temporary `startWithoutCustomer` store action.
  - New invoice/quote creation again opens the typed invoice form with the inline `CustomerStep` first, then switches to the item workflow after selecting a customer; the selector still avoids the separate native stack route.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API or database docs were needed because this is mobile navigation/UI behavior only.
  - Validation: focused new-sales type route helper, invoice item helper, and invoice form store tests passed; scoped `git diff --check` passed.

- Fixed the Android crash when selecting a customer during new mobile invoice creation.
  - Changed the sales stack's customer-selector, sales-details, and door-size helper routes to use ordinary card presentation on Android while preserving native full-screen modal presentation on iOS.
  - Follow-up: the crash still reproduced, so the new Sales/Quote start flow now routes directly to the typed invoice form and renders `CustomerStep` inline until a customer is selected. This removes the separate customer-selector route replacement from the initial create path.
  - Follow-up: removed the exact `react-native-css` warning source by replacing `className="relative min-h-[640px]"` on the invoice item swipe/workflow wrapper with stable React Native `style={{ minHeight: 640, position: "relative" }}`, avoiding variable-set child remounts during the customer-to-items transition.
  - Follow-up: per request, the default create path now hides the customer selector completely. The Sales/Quote chooser calls a focused no-customer start action that seeds the first blank workflow line and opens the item workflow directly.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API or database docs were needed because this is mobile navigation presentation only.
  - Validation: focused new-sales type route helper, invoice item helper, and invoice form store tests passed; exact `min-h-[640px]` source no longer appears in the invoice item area; scoped `git diff --check` passed. Broad Biome check was not clean because of pre-existing lint warnings in the large invoice screen/items files.

- Added a dev-only new sales form save payload capture for debugging the mobile invoice timeout.
  - `newSalesForm.saveDraft` and `saveFinal` now capture the parsed API payload before the core save transaction when `NODE_ENV === "development"`.
  - Payloads are written under `debug/new-sales-form-save-payloads/YYYY-MM-DD/*.json` at the project root with summary metadata plus the full payload, and the folder ignores captured JSON files so customer/order data is not staged.
  - Capture failures are logged and do not fail invoice saves.
  - Updated docs: `brain/features/mobile-invoice-form.md`, `brain/api/contracts.md`, and `brain/progress.md`; no database docs were needed because there are no schema or migration changes.
  - Validation: `bun test apps/api/src/db/queries/new-sales-form-debug.test.ts`, scoped Biome check for the new helper/test, and scoped `git diff --check` passed.

- Created a focused Brain intake for the persistent mobile invoice save timeout using the working web new sales form as the control path.
  - Added `brain/intake/2026-06-24-mobile-invoice-save-web-control-diff.md`.
  - Added proposed plan `brain/plans/2026-06-24-bug-fix-mobile-invoice-save-web-control-diff.md`, narrowing the next slice to payload/transport/API-stage/post-save comparison instead of broad parity work.
  - Added the companion roadmap task `Mobile Invoice Save Web Control Diff`.
  - Documented existing related work: completed stuck-save UI recovery plan and the broader proposed web/mobile parity reliability plan.
  - This was a planning/documentation pass only; no app code or tests were changed/run.

- Created a full Brain gap plan for the still-persistent mobile invoice save timeout and web/mobile invoice form parity closure.
  - The plan identifies save reliability as Phase 0: trace mobile resolved API URL, request id, payload size, server ingress, schema/auth handling, core transaction stage timings, and bounded post-save timings before changing business behavior or extending the timeout.
  - Documented parity gaps across save orchestration, runtime target/connection handling, customer/address/profile/tax metadata, costing/tax/labor/CCC, workflow routing/component selection, Door/HPT, Moulding, Service, Shelf, quote/order saved-record actions, recovery/autosave/conflict handling, and test architecture.
  - Added the proposed roadmap task for `brain/plans/2026-06-23-bug-fix-mobile-invoice-web-parity-and-save-reliability-gap-closure.md` and linked the known gap from `brain/features/mobile-invoice-form.md`.
  - This was a planning/documentation pass only; no app code or tests were changed/run.

- Completed interactive architecture for mobile design-system preview templates.
  - Implemented shared hooks for tab navigation, global search, status filtering, and master-detail record selection.
  - Rewrote Template A (Ops Console), Template B (Field Flow), and Template C (Sales Ledger) to use the new interaction architecture.
  - Added bottom-sheet filter functionality, top-level tabs, and detail-view tabs for selected records across all three templates.
  - Follow-up fix: changed Template A, B, and C detail tab state to use the `usePreviewTabs` object return shape, fixing the Template A runtime crash from tuple destructuring a non-iterable hook result.
  - Updated docs: `apps/expo-app/src/features/design-system-preview/DESIGN.md`, `apps/expo-app/DESIGN.md`, and `brain/progress.md`.
  - Validation: focused Biome check passed for the preview tab hook and all three template screens; scoped `git diff --check` passed. No dev server, broad typecheck/build, or UI automation was run per fast-command-discipline request.


- Fixed the mobile invoice create/save UI getting stuck on `Saving invoice...` when the client-side save request does not settle.
  - Added a pure mobile save timeout helper around `newSalesForm.saveDraft` / `newSalesForm.saveFinal` calls.
  - Changed the Expo invoice form overlay/footer saving state to follow the invoice form store's `saveStatus` instead of React Query mutation pending state, allowing timeout failures to clear the blocking overlay.
  - Follow-up fix: bounded sales-document snapshot expiration as best-effort post-save work too, so slow document/cache invalidation cannot hold the mobile save response open until the client timeout.
  - Follow-up fix: routed Expo tRPC mutations through an unbatched `httpLink` while keeping queries batched, so invoice saves no longer share a batch response with unrelated slow queries.
  - Hung mobile saves now show a retryable footer error while successful saves still hydrate the server result and navigate to the saved edit route.
  - Updated docs: `brain/plans/2026-06-23-bug-fix-mobile-invoice-save-stuck.md`, `brain/tasks/done.md`, `brain/features/mobile-invoice-form.md`, `brain/api/contracts.md`, and `brain/progress.md`; no database docs were needed because there are no schema or migration changes.
  - Validation: focused mobile save timeout helper tests, invoice form store tests, and API bounded post-save tests passed; new helper files pass scoped Biome.

- Created Brain intake for mobile design-system template completion.
  - Split the request to finish Ops Console, Field Flow, and Sales Ledger into four proposed plans: shared interaction architecture/folder structure, Field Flow tabs and route overview, Ops Console tabs/search/work overview, and Sales Ledger tabs/search/order overview.
  - Included standard architecture guidance from the Expo preview boundary, Brain architecture guide, and mobile coding standards.
  - Added companion roadmap tasks for all four proposed plans.
  - Documented the existing implemented preview foundation as a duplicate/existing item and kept production migration out of scope until a template is selected.

- Created Brain intake for sales overview inventory workflows.
  - Split the requested sales-overview Inventory tab, line-level inventory status, smart inbound creation, stock allocation, category policy, and all-product-in-stock behavior into four proposed plans.
  - Added companion roadmap tasks for projection/API foundation, Inventory tab UI, stock allocation/availability actions, and smart inbound creator.
  - Documented duplicates against the existing inventory-backed fulfillment model, inventory item dashboard, and inventory-owned inbound demand status ADR.
  - Follow-up: approved all four generated plans and moved companion tasks from roadmap to backlog on 2026-06-22.
  - Added Brain engineering guidance that Prisma model/schema changes must be followed by `bun run db:migrate` and `bun run db:push`, and migration files should not be created manually.
  - Started implementation by extending `inventories.salesInventoryOverview` with grouped invoice-item inventory rows and adding an order-only `Inventory` tab with a `New` badge to both the shared sales overview system and the legacy sales overview sheet.
  - The first UI slice shows read-only inventory status plus disabled affordances for allocation, category-policy, and inbound actions; the approved allocation and inbound plans remain separate follow-up work.
  - Follow-up: empty Inventory tabs now self-sync a single order through `inventories.syncSalesInventoryOverview`, show `Synchronizing with inventory`, refresh the overview automatically, and retain a manual retry action if no rows can be produced.
  - Follow-up repair: comparing the opened old production tab for order `08578AD` exposed that inventory sync was dropping Dyke form-step components and collapsing repeated HPT door rows. The sync now uses valid stock-allocation statuses, aggregates repeated door products, scales door form-step components by total door count, preserves moulding item quantities, repairs placeholder inventory names from Dyke values, and the legacy sheet Inventory tab now reads the sale id from live context after cold reload.
  - Follow-up UI: the Inventory tab now renders one merged component table instead of invoice-item sections. Top-level overview `rows[]` merges matching inventory/category/variant rows across the order, sums demand quantities, and keeps physical stock from being multiplied by repeated sales-line demand.
  - Follow-up UI: added the `Trackable | No Trackable` button group before the merged table and renders component/item names in uppercase.
  - Follow-up UI: converted the main sales overview tab strip in both current and legacy overview layouts into an actual button group with uppercase tab titles while preserving the mobile dropdown behavior.
  - Follow-up UI: removed the top Inventory stat cards for unique components, in stock, allocated, and pending; moved the track/do-not-track pill into the Stock column as a clickable stock-setting dropdown labeled by step name.
  - Follow-up pricing: sales inventory sync already creates missing inventory categories, inventory items, and variants by source UID; component sync now also snapshots inventory variant/pricing data into component `LinePricing`, preserving unit and total cost/sales values for the overview projection when inventory pricing exists.
  - Follow-up Dyke pricing UID repair: sales inventory sync now resolves component `InventoryVariant.uid` from selected Dyke dependency/pricing metadata instead of always using the base component UID. It handles direct `dependenciesUid`, selected component metadata, `priceStepDeps` pricing-key reconstruction, supplier-size keys in the `size & supplier` shape, and Dyke door-size normalization to match imported inventory variants.
  - Validation follow-up: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-inventory-overview.test.ts` passed with 22 tests and 41 assertions, and direct module import passed.
  - Follow-up Cost/Sales display: Inventory tab rows now expose both Cost and Sales columns. Component `LinePricing` snapshots merge inventory variant/supplier pricing with sales-form fallback pricing from selected component `basePrice` / `price`, HPT door `unitPrice` / `lineTotal`, and sales item `rate` for no-door moulding rows. Reran sync for opened order `08578AD` / sales id `23301`; 5 line items updated, no warnings, and the overview projection now has no rows missing both cost and sales price.
  - Follow-up cents preservation: changed `LinePricing` price snapshot fields from integer to decimal-capable `Float?`, rounded stored/projection currency snapshots to two decimals, regenerated Prisma client, and reran opened order `08578AD`. Sample projection now preserves cents: `US15---Satin Nickel` cost `44.45` / sales `59.85`, casing sales `122.5`, and no row is missing both cost and sales.
  - Migration note: required `bun run db:migrate` and `bun run db:push` were run/attempted, but Turbo's non-terminal UI guard blocked the root scripts; package-level migrate reached Prisma and stopped on existing local drift requiring reset; package-level push reached production and stopped on an unrelated `DealerAuthAccount` data-loss warning. No reset and no `--accept-data-loss` were run; local validation used a narrow `LinePricing` column alter only.
  - Follow-up variant visibility: Inventory overview rows now include `variantUid`, and the Inventory tab subtitle displays the raw SKU/variant value only when visible rows contain the same component name with multiple priced variants. This keeps `BF H.C MADISON W/ T & H` visibly distinct as `w2_0-h6_8` vs `w2_6-h6_8` while hiding single-variant and zero-price option row noise.
  - Follow-up stock configuration: changed the merged Inventory tab filter from `Trackable | No Trackable` to `STOCK | NON STOCK`, where non-stock includes untracked rows and category/item product kind `component`. The Stock column is quantity-only again, and the Action column now has an `Edit` dropdown for step/category kind, actual component/item kind, and category stock tracking; new compact tRPC mutations update inventory/category product kind while category stock mode continues through the existing stock-mode mutation.
  - Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-inventory-overview.test.ts apps/www/src/hooks/sales-overview-open-params.test.ts` passed with 22 tests and 40 assertions; scoped `git diff --check` passed. In-app browser validation passed against the opened old sales overview sheet for `08578AD`, with Inventory showing a single merged table and production-equivalent Dyke form values.
  - Validation follow-up: `bun test packages/sales/src/sales-inventory-overview.test.ts packages/sales/src/sync-sales-inventory-line-items.test.ts apps/api/src/trpc/routers/inventories-route-import.test.ts` passed with 23 tests and 46 assertions after the stock-configuration change. Repo and package typechecks remain blocked by existing unrelated type debt, but filtered `@gnd/www` typecheck output no longer reports the inventory tab, router, or sales inventory overview files. In-app browser automation could not attach to the opened tab in this session.
  - Follow-up inbound form validation: in-app browser testing on opened order `08511DB` created inbound #3 for selected stock rows, then exposed that reopening Create inbound still offered raw pending quantities already covered by linked inbound demand. Sales inventory overview rows now project linked open inbound quantity, and the Create inbound form uses pending minus linked inbound as its orderable max. Retest showed only the remaining `/1` unit, submitted it as inbound #4, and the form closed with `INBOUNDS 3` plus Create inbound disabled once no uncovered stock quantity remained. Focused Biome check passed for the inventory tab and sales overview projection; `bun test packages/sales/src/sales-inventory-overview.test.ts` passed with 10 tests and 21 assertions.

- Converted the sales-book section tabs to a real button group.
  - Replaced `SalesTabs` rendering from `HeaderTab` links to grouped `Button` links inside `ButtonGroup`, preserving the existing page-tab portal, compact inline header rendering, active route highlighting, permissions, prefetching, and hide-on-scroll behavior for the orders table header.
  - Updated docs: `brain/features/sales-orders-v2.md` and `brain/progress.md`; no API or database docs were needed because this is sales-book navigation presentation only.
  - Validation: focused Biome check passed for `apps/www/src/components/sales-tabs.tsx`; `git diff --check` passed; filtered `@gnd/www` typecheck output reported no `sales-tabs` diagnostics while the full app typecheck remains blocked by existing unrelated baseline errors. In-app browser verification on the opened sales-book page confirmed two `Sales sections` navs now contain `data-slot="button-group"` with Orders active and Quotes/Production/Shelf Items as outline buttons.

- Made the sales overview Inventory tab table more compact.
  - Reduced the merged inventory component table header/body padding, grid gaps, row text size, status badge height, and row action button height so stock/non-stock review fits more lines inside the overview sheet without changing the inventory sync, pricing, stock, or edit contracts.
  - Follow-up: changed the merged component grid to use an orders-table-style horizontal scroll container with `overflow-auto`, `min-w-0`, and a wider fixed inner grid so all columns remain reachable inside the sales overview sheet.
  - Follow-up workbench pass: made the first component column sticky, added effective stock/non-stock row tags, shortened status labels with clearer semantic colors, added visible pending/shortage/shown summary badges, and simplified the row Edit popover into component-titled Step kind, Component kind, Stock tracking, and Open inventory item sections.
  - In-app browser fix: testing the opened `08568PC` Inventory tab showed the table card was expanding to the grid width, leaving `maxScrollLeft: 0`; constrained the card with inline-size containment and a fixed-width `1320px` grid so the table scrolls internally. Retest in the actual in-app tab showed `clientWidth: 716`, `scrollWidth: 1320`, `maxScrollLeft: 604`, sticky Component header pinned while scrolled, Action visible, and the Edit popover contents correct.
  - Follow-up sizing: set fixed grid tracks for the operational columns `Qty`, `Stock`, `Allocated`, `Pending`, `Cost`, `Sales`, and `Action`, removed the row-level Status column, and kept no-wrap tabular cells so quantities, prices, and row actions remain stable inside the horizontal workbench.
  - Follow-up scroll fix: changed the inventory table scroll region from full-axis overscroll containment to horizontal-only overscroll containment and added a vertical-wheel bridge so trackpad/wheel scrolling over the horizontal table moves the nearest vertical sales overview scroller.
  - Follow-up redesign: replaced the horizontal inventory component table with a shadcn `ItemGroup` list. Each component is now a compact item with uppercase identity, step/variant subtitle, inventory/component/tracking tags, composed Qty/Stock/Allocated/Pending and Cost/Sales metric blocks, and a dot-icon dropdown for the existing Step kind, Component kind, Stock tracking, and Open inventory item actions.
  - Follow-up variant display: sales inventory overview rows now expose a human-readable `variantName` composed from inventory variant attributes, description, or SKU, and item subtitles use that display name instead of raw variant UID. Valid zero-cost or single-row variant identities remain visible without leaking UID-shaped labels.
  - Follow-up door-size display: added a door variant display normalizer that converts width/height attribute values such as `2 x 8` plus `8 x 0`, or stored imported UIDs such as `w2_8-h8_0`, into standard Dyke size labels like `2-8 x 8-0`.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md` and `brain/progress.md`; no API or database docs were needed because this is presentation-only.

- Fixed mobile invoice save requests getting stuck on `Saving invoice...` when post-save Trigger queue work is unavailable or slow.
  - Kept the core new-sales-form save response contract intact while bounding the inventory sync and sales-document warmup queue calls as best-effort post-save tasks.
  - Preserved awaited sales-document snapshot expiration before returning save responses, so stored document freshness state is still updated synchronously.
  - Added a retryable mobile save error message path so failed invoice/quote saves show a footer error instead of silently falling back from the saving overlay.
  - Updated docs: `brain/features/mobile-invoice-form.md`, `brain/api/contracts.md`, and `brain/progress.md`; no database docs were needed because there are no schema or migration changes.
  - Validation: focused bounded post-save API tests passed; focused mobile invoice-form store tests passed; scoped `git diff --check` passed. Dev-server/mobile manual acceptance was not run in this implementation pass.

- Normalized local project dev ports into an explicit GND-owned `3000-3009` app range.
  - Replaced the root inline port-kill loop with a project-specific script that kills only named GND ports and leaves unrelated neighboring ports alone.
  - Moved Expo Metro to `3002`, `apps/web` to `3007`, site to `3008`, backlog to `3009`, and the shared `portless` proxy default to `3001` while preserving `www=3000`, email preview `3003`, API `3004`, `www:prod=3005`, and dealership `3006`.
  - Updated mobile/web/dealership runtime fallbacks and `brain/system/overview.md`; no API contract or database docs were needed because this is local development runtime configuration only.
  - Validation: targeted stale-port searches, kill-script smoke checks, and scoped `git diff --check` passed. Dev server runtime smoke was not run in this implementation pass.

- Added a structured loading skeleton to the mobile sales dashboard.
  - Replaced the centered pending spinner with a dashboard-shaped skeleton that mirrors stat cards, sales/quote actions, and recent-sales cards while the overview query loads.
  - Kept the skeleton in a dedicated mobile feature component so the route screen stays focused and the placeholder can reuse the app's native `Skeleton` primitive.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation behavior only.
  - Validation: scoped syntax parse for the changed sales dashboard TSX files passed; scoped `git diff --check` passed. No dev server, build, broad typecheck, or device automation was run.

## 2026-06-19

- Fixed actual React Native `className` + `style` conflicts in the Expo app.
  - Removed combined `className`/`style` usage from direct `react-native` primitives and `Animated.View` hits across mobile app screens, footers, chat swatches, progress bars, dispatch placeholders, login inputs, and invoice floating/item actions.
  - Left wrapper/custom component usages and example-only icon usages for a separate pass, matching the narrowed request to fix actual React Native components first.
  - Updated docs: `brain/progress.md`; no API/database/feature docs were needed because this is standards compliance and presentation refactoring only, with no contract, schema, or persisted behavior change.
  - Validation: import-aware direct React Native scanner reports `total=0`; broader scanner reports only deferred wrapper/example hits; scoped `git diff --check` passed. No dev server, broad typecheck/build, or UI automation was run.

- Added active-item header and swipe navigation to the mobile invoice form.
  - Changed the invoice form header to show the active item label (`Item x` fallback or the item description/name when set) as a chevron-down button that opens the existing invoice item bottom sheet.
  - Moved the left/right item chevrons into a fixed mid-screen overlay so they stay in place while the item body scrolls, and added horizontal swipe navigation with swipe-left moving to the next item and swipe-right moving to the previous item.
  - Added a focused swipe-direction helper and regression coverage for swipe direction, bounds, short swipes, vertical gestures, and single-item forms.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation/navigation behavior only.
  - Validation: focused item-navigation and item-sheet helper tests passed; scoped Biome check passed for the new helper files; scoped `git diff --check` passed. A broader Biome check across existing dirty invoice-form screen files still reports pre-existing lint/format issues unrelated to this slice.

- Implemented the mobile Quotes list screen using the Orders list feature set.
  - Added `/(sales)/quotes`, registered it in the mobile sales stack, and changed the Sales Dashboard Quotes tile from disabled `Coming soon` copy to a live route.
  - Extracted the mobile orders list/card behavior into shared sales-document list/card components, preserved the Orders wrapper and dispatch-search behavior, and added a Quotes wrapper backed by `sales.quotes` plus `filters.salesQuotes`.
  - Quote cards now show quote-specific status from invoice pending/total amounts and open the existing quote-aware invoice edit form only when a saved slug is present; slugless legacy quotes render as unavailable instead of navigating to a broken edit route.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this reuses existing tRPC contracts and makes no schema or contract changes.
  - Validation: focused new-sales-type and sales-document-list helper tests passed; scoped Biome check passed for the new/refactored list files; scoped `git diff --check` passed. No Expo dev server, broad typecheck, build, or device/browser automation was run.

- Made mobile sales chooser sheets compact and headerless.
  - Removed the title/header area from the `New Invoice` Sales/Quote chooser and let the bottom sheet dynamically size to its Sales, Quote, and Cancel rows.
  - Follow-up: wrapped the `New Invoice` chooser rows in `BottomSheetView` so Gorhom dynamic sizing can measure the content and present the sheet reliably.
  - Applied the same headerless content-sized bottom sheet behavior to the invoice item list modal opened from the invoice form footer CTA.
  - Added more inner spacing to both headerless sheet bodies so flat list rows do not hug the rounded sheet corners.
  - Added horizontal padding inside the shared flat list rows so each item's icon/text/chevron have their own inset instead of relying only on sheet padding.
  - Adapted the invoice item list modal to the same `BottomSheetView` measured body used by the `New Invoice` chooser so its row padding and content sizing match.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation behavior only.
  - Validation: focused sales-type option, item-sheet helper, and native UI-boundary tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run.

- Lowered and narrowed the mobile Door/Moulding Proceed action.
  - Changed the shared invoice floating-action offsets so overlay Proceed sits closer to the bottom, and inline Proceed moves farther down when the normal footer hides during scroll.
  - Added eased 240ms cubic animation to the shared floating action host and inline Proceed frame so bottom-position changes feel smoother.
  - Gave the workflow Proceed button an explicit 220-point pill width so it no longer renders as a full-width bottom bar.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation behavior only.
  - Validation: focused floating-action-layout test passed; scoped `git diff --check` passed; no dev server, build, broad typecheck, or UI automation was run.

- Flattened mobile sales chooser and item switcher modals.
  - Added a shared Expo sales click-list row and reused it in the `New Invoice` Sales/Quote chooser so Sales, Quote, and Cancel match the customer-selector flat divider-list style.
  - Updated the invoice item switcher opened from the invoice form footer route CTA to use the same flat row style for item selection, New item, and Cancel while preserving item summaries and selected state.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation behavior only.
  - Validation: focused sales-type option, item-sheet helper, and native UI-boundary tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run.

- Added keyboard-aware support for inline HPT size-card inputs.
  - Replaced the mobile invoice form shell's competing `KeyboardAvoidingView` plus plain form `ScrollView` with the existing `react-native-keyboard-controller` `KeyboardAwareScrollView` pattern.
  - Added a bottom keyboard offset so focused HPT size-card inputs such as LH/RH/Base/Add-on/Custom can scroll above the keyboard while preserving the existing invoice footer overlay.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile keyboard presentation behavior only.
  - Validation: scoped `git diff --check` passed; no dev server, build, broad typecheck, or UI automation was run per request.

- Changed mobile HPT Add Door to return to the Door step.
  - The House Package Tool `Add door` button now asks the workflow selector to activate the existing Door multi-select step instead of opening a separate HPT-local candidate strip.
  - Removed the HPT-local direct add-door option wiring while keeping active-door tabs, swap, remove, and selected-door Sizes behavior intact.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this changes mobile workflow presentation/navigation only.
  - Validation: scoped `git diff --check` passed; no dev server, build, broad typecheck, or UI automation was run per request.

- Removed the mobile House Package Tool Add Size card.
  - Removed the quick Add Size chip card and its editor/workflow props from the mobile HPT step, leaving the selected-door `Sizes` control as the size configuration path.
  - Updated the empty HPT copy to point users to the selected-door Sizes action instead of another Add Size card.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this removes mobile presentation controls without changing persisted payload shape.
  - Validation: scoped `git diff --check` passed; no dev server, build, broad typecheck, or UI automation was run per request.

- Stabilized mobile invoice form bottom scroll padding while footer actions hide/show.
  - Kept the invoice form scroll container on a stable 25-point bottom padding, with the active item section retaining its own stable reserve, instead of collapsing the reserve when footer actions hide during scroll.
  - This preserves the footer slide/fade behavior while avoiding content-height changes that can flicker component grids during scrolling.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile presentation behavior only.
  - Validation: scoped `git diff --check` passed; no dev server, build, broad typecheck, or UI automation was run per request.

- Rendered the functional mobile House Package Tool editor inside the active workflow step.
  - Added a focused `HousePackageToolWorkflowStep` wrapper that reuses the existing mobile HPT editor and shared sales-form helpers for selected doors, size rows, supplier-aware sizing, add/swap/remove door, add size, row pricing, and door-size picker updates.
  - Replaced the inline workflow selector's HPT notice-only body with the functional editor while preserving the existing step pills and non-HPT component-grid flow.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this wires existing mobile/shared HPT behavior into the active step without changing payload contracts.
  - Validation: focused HPT row helper and workflow proceed/rendering tests passed; scoped `git diff --check` passed; no dev server, build, broad typecheck, or UI automation was run per request.

- Fixed local `apps/www` proxy auth-session self-fetch resolution.
  - Moved the proxy's auth-session URL decision into a focused helper and made all local dev hosts, including plain `http://localhost`, `.localhost`, `.test`, and IPv6 loopback forms, resolve to `http://127.0.0.1:<app-port>/api/auth-session`.
  - This avoids local auth checks going through `localhost`/`::1` during cold route compilation or portless proxying while preserving non-local origins and the existing auth snapshot payload.
  - Follow-up: added a one-time retry for transient local socket-close failures such as `UND_ERR_SOCKET` so a cold internal `/api/auth-session` connection close does not immediately log a proxy auth failure.
  - Updated docs: `brain/api/permissions.md` and `brain/progress.md`; no database docs were needed because this is auth proxy URL resolution only.
  - Validation: focused proxy auth-session URL/fetch tests passed; scoped `git diff --check` passed; no dev server, build, browser, or broad typecheck was run.

- Added thresholded mobile workflow component search.
  - Workflow steps now show a native search input below the step pills only when the component grid has more than 12 results.
  - The search filters the already-resolved component picker data in place while keeping selected-state and inline Moulding Proceed visibility based on the unfiltered base list.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client presentation/filtering behavior only.
  - Validation: focused workflow rendering tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Stabilized the mobile Moulding grid against remaining column flicker.
  - Memoized component grid image rendering, memoized image source objects, and disabled Android image fade so store updates from selection do not visually reload unchanged moulding images.
  - Made inline Moulding bottom Proceed spacing stable for the whole Moulding step instead of toggling padding when selected state changes, avoiding another grid-height recalculation during selection.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile rendering behavior only.
  - Validation: focused workflow rendering/proceed, line-workflow, and shared moulding/selection tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Added an inline Moulding Proceed fallback inside the mobile item workflow.
  - Manual testing showed selected Moulding cards and qty controls were visible while the screen-level floating Proceed button still did not appear in the inline invoice item flow.
  - Added a picker-local bottom Proceed button for inline Moulding that keys off the same visible selected-card state as the checkmarks, adds bottom padding, and calls the existing `handleProceed` next-step path.
  - Kept overlay workflow selectors on the screen-level floating action host to avoid changing the full-screen selector behavior.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client workflow presentation only.
  - Validation: focused workflow rendering/proceed, line-workflow, and shared moulding/selection tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened the mobile Moulding multi-select Proceed button visibility.
  - Added selected component snapshot and selected moulding-count fallbacks to the workflow Proceed selected-count helper, so Moulding can show the centered floating `Proceed` button even when derived rows have not caught up.
  - Added a small visual lift to the centered Proceed button so it reads as a floating footer action when it appears.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client workflow visibility only.
  - Validation: focused workflow rendering/proceed, line-workflow, and shared moulding/selection tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Removed the mobile Moulding grid's unchecked quantity-control reservation.
  - Reworked selected moulding quantity controls from a hidden reserved footer into a selected-only overlay on the component image, so unchecked cards keep the same measured height and no longer show blank bottom space.
  - Kept quantity changes routed through the shared moulding row patch path while avoiding FlatList row-height changes that can cause scroll flicker.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client rendering behavior only.
  - Validation: focused workflow rendering/proceed, line-workflow, and shared moulding/selection tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Refined the mobile invoice item switcher sheet.
  - Changed the footer item-switcher icon to a right-aligned breadcrumb/route button beside the Create/Save action.
  - Added pure invoice item sheet helpers for item-count-based snap points, compact `Item 01` row labels, and quantity/line-count/total subtitles.
  - Updated the sheet footer to use a concise `+ New` action.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client sheet presentation only.
  - Validation: focused item-sheet, item-section, workflow, floating-layout, and shared moulding/selection tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Replaced the mobile invoice item FAB with a footer item-switcher icon and restored targeted workflow behavior.
  - Moved the invoice item sheet opener out of the floating-action lane and into an optional footer breadcrumb/list icon button beside the Create/Save action, while keeping item-sheet state owned by `ItemsStep`.
  - Protected the root `Item Type` step from grouped-row editor substitution, so choosing Moulding no longer causes the first step pill to render moulding line-item data instead of the component grid.
  - Added Door/Moulding selected-row fallbacks for centered floating `Proceed` visibility, including saved Door size rows and selected Moulding rows when step metadata lags.
  - Restored Moulding selected-card qty controls with a reserved-height control area to avoid first-selection scroll flicker.
  - Moved Door Size footer actions onto `KeyboardStickyView` with extra list padding so OK/Next stack above the keyboard.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client workflow UI behavior over the existing payload shape.
  - Validation: focused mobile workflow, floating-layout, line-workflow, and shared moulding/selection tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Fixed new-sales-form grouped service/moulding multi-line save identity.
  - Ran the focused API save/hydrate tests after the mobile grouped-row work and found multi-line grouped save regressions in the test harness and API save identity rules.
  - Added missing `dykeSalesDoors.create` / `update` coverage to the multi-line API test fixture so the current per-door save path is exercised.
  - Changed `saveNewSalesFormInternal` so grouped service/moulding rows only update existing `SalesOrderItems` when the row itself carries `salesItemId`; newly added grouped rows now create new legacy siblings instead of overwriting the grouped parent line id.
  - Applied the same row-level identity rule to grouped moulding `HousePackageTools`: rows with `hptId` update/revive existing HPT rows, while newly added moulding rows create new HPT siblings instead of reusing the parent HPT id.
  - Updated docs: `brain/api/contracts.md` and `brain/progress.md`; no database schema docs were needed because this preserves the existing relational shape and fixes save identity behavior.
  - Validation: focused API new-sales-form/dealer tests passed, related grouped-row shared/mobile tests passed, and scoped checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Fixed the mobile Door/Moulding multi-select Proceed regression and first-Moulding selection flicker.
  - Audited the workflow selector after manual testing showed the centered floating `Proceed` stayed hidden and the Moulding grid flickered on first selection.
  - Changed the mobile selector to treat the active `Moulding` step by step title instead of requiring the whole line to already be classified as a moulding item.
  - Added selected-count fallbacks from visible selected component state and selected `meta.mouldingRows`, so the Proceed footer can appear while step metadata catches up after Door/Moulding selection.
  - Removed inline quantity controls from selected moulding grid cards, keeping card heights stable during selection; moulding quantities remain editable in the moulding line-item editor.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client workflow UI behavior over the existing payload shape.
  - Validation: focused mobile workflow proceed visibility test passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile item-selector row subtitles against workflow UID copy.
  - Audited the mobile item selector after the component-list UID cleanup and found the workflow root row subtitle was still inline in the component, relying on upstream category normalization.
  - Extracted item selector row subtitle copy into a pure helper and made workflow rows fall back to `Components` if a uid-like category ever reaches the UI.
  - Added focused coverage preserving ordinary shelf SKU/category subtitles while suppressing uid-like workflow subtitles.
  - Tightened the mobile UI-boundary test to assert its scan root covers the Expo `src/app` and `src/features` trees, so the guard continues to protect all mobile source from `@gnd/ui` imports.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this changes mobile display copy only.
  - Validation: focused item selector copy tests, line item display tests, native sales-form-core boundary test, and mobile UI-boundary test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Tightened mobile Door/HPT route flags to explicit booleans.
  - Audited the native Door/HPT route flag helper against the requirement that `noHandle` and `hasSwing` should be enabled only when route config explicitly sets them true.
  - Found the helper used truthiness, so stringy metadata such as `"true"` or numeric `1` could incorrectly enable no-handle or swing UI if it reached the mobile path.
  - Changed the helper to require literal boolean `true` for both flags and added focused coverage for string/numeric values staying disabled.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this narrows mobile interpretation of existing route metadata without changing persisted shape.
  - Validation: focused line-workflow helper test, native sales-form-core boundary test, and mobile UI-boundary test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Removed leftover mobile shelf section-clear UI.
  - Rechecked the simplified shelf picker against the clarified flow: plus `Shelf item`, fullscreen recent/search list, select returns to the shelf step, and edit/delete stay inside the search dialog.
  - Found an unused `ShelfDestructiveConfirmation` component from the older clear-category/clear-section/remove-section shelf flow; no current mobile shelf code imported it.
  - Deleted the unused component so the Expo shelf implementation keeps only the simplified picker/list/edit/delete architecture requested for mobile.
  - Updated docs: `brain/progress.md`; no API/database docs were needed because this removes unused mobile UI code without changing payloads or contracts.
  - Validation: targeted search confirmed the old shelf destructive-action strings are gone; focused shelf product option tests, native sales-form-core boundary test, and mobile UI-boundary test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Added shared coverage for Moulding multi-select proceed behavior.
  - Audited the native-safe sales-form-core boundary and mobile-visible workflow copy paths after the original Android bundling failure and UID-copy cleanup requirements.
  - Confirmed the mobile core barrel remains direct-to-pure-helper only and current boundary tests pass without pulling `@gnd/ui` or TSX modules into Expo.
  - Added a focused shared workflow regression proving selected Moulding multi-select steps use the same `proceedWorkflowMultiSelectStep` path as Door and advance to the line-item step.
  - Updated docs: `brain/progress.md`; no API/database docs were needed because this pins existing workflow behavior without changing contracts or schema.
  - Validation: focused workflow selection action tests, mobile workflow proceed visibility tests, native sales-form-core boundary test, and mobile UI-boundary test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Pinned the mobile customer selector recent/search query contract.
  - Audited the typed customer selector path after the Sales/Quote handoff to verify that the default mobile list requests recent customers by the selected sales form type.
  - Found the behavior was implemented inline in the hook, while the API already had coverage for unique recent customers ordered by selected order/quote usage.
  - Extracted the mobile customer search request shape into a focused helper so blank screens always request `recent: true`, the selected type, and `limit: 10`, while typed search sends trimmed text with `recent: false`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this preserves the existing `newSalesForm.searchCustomers` contract.
  - Validation: focused customer search options test, native sales-form-core boundary test, and mobile UI-boundary test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened direct moulding row edits against zero quantities.
  - Audited the mobile moulding component grid, selected-card quantity controls, shared moulding selection helper, mobile row editor, and website workflow panel against the website-equivalent multi-select rule.
  - Confirmed selection-time quantities already clamp blank/zero values through the shared `saveWorkflowMouldingSelectionWithQty` helper, but direct row edits from the line-item editor use `buildWorkflowMouldingRowsPatch` and could persist a selected row with quantity zero until the next rederive.
  - Changed the shared moulding row summarizer to persist at least quantity 1 for every selected moulding row, so mobile and website row-edit paths follow the same selected-row minimum quantity rule.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because the persisted `meta.mouldingRows` shape is unchanged.
  - Validation: focused workflow row-patch test, native sales-form-core boundary test, and mobile UI-boundary test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Centralized the simplified mobile shelf picker search request contract.
  - Audited the Expo/web-UI package boundary and the simplified shelf picker against the clarified mobile-only shelf flow.
  - Confirmed Expo source and the mobile-facing `sales-form-core` barrel remain guarded against `@gnd/ui`, and the shelf picker already uses a fullscreen modal with category subtitles plus edit/delete actions.
  - Extracted the shelf picker search input shape into a focused helper so blank picker search is pinned to top-10 recent shelf products with no selected-product padding, while typed search stays a larger explicit search.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because the API contract and persisted `shelfItems` shape are unchanged.
  - Validation: focused shelf option tests, mobile native UI boundary test, and `sales-form-core` native-safety test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Added focused coverage for the mobile New Invoice Sales/Quote handoff.
  - Audited the sales dashboard `New Invoice` sheet and typed customer-selector routes against the requested Sales/Quote chooser flow.
  - Found the behavior was implemented in the sheet but the Sales -> `order`, Quote -> `quote`, `source=new` customer-selector handoff contract lived inline in the component.
  - Extracted the sales type options and typed customer-selector route builder into a small pure helper, then covered both Sales and Quote mappings with a focused Bun test.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile client routing and test coverage only.
  - Validation: focused new-sales-type options test passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile HPT created-size row metadata against UID-like door titles.
  - Audited custom components, customer recents, Door-size proceed, floating actions, UID-safe component copy, and HPT row grouping against the active mobile sales-form requirements.
  - Found the HPT quick available-size helper already stored a UID-safe human component title, but the generic created-size helper still persisted raw `component.title` into row metadata.
  - Reused the same HPT component-title normalization for created size rows so imported/custom door components with UID-like titles store human value/title copy before save/reopen.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because the persisted payload shape is unchanged.
  - Validation: focused HPT row helper tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened the simplified mobile shelf recent picker against hidden-product under-fill.
  - Audited the mobile shelf picker and API source after the clarified simple flow; the UI already keeps blank picker results recent/search-only, with edit/delete actions and selected-row category subtitles.
  - Found the backend recent-shelf helper could still stop after a fixed overfetch page of hidden/archived products, leaving the blank search under-filled even when older visible shelf usage existed.
  - Changed the helper to scan recent shelf usage in batches, preserve recency order, filter visible shelf products per batch, and stop only when the requested limit is filled or usage is exhausted.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract/database docs were needed because the existing `newSalesForm.searchShelfProducts` response contract is unchanged.
  - Validation: exact hidden-product regression passed; the full `new-sales-form.test.ts` file and the broader shelf-name filter still hit existing unrelated grand-total assertions where `grandTotal` equals `subTotal`. No dev server, broad typecheck/build, or UI automation was run per request.

- Hardened the product report query to live step components and sales-count sorting.
  - Audited `/product-report` and `/sales-book/top-selling-products` after irrelevant products appeared in the report.
  - Found `sales.getProductReport` started from broad `DykeStepProducts` rows and only filtered by any historical relation usage, so disabled/deleted step components and quote/deleted-order usage could leak into the report; computed sorting also used units before sales count.
  - Added shared order-scoped relation filters for priced step forms, sales doors, and house-package moulding records; constrained report products to enabled step components under live steps, including archived custom-component metadata; removed zero-sale rows; and sorted rows by computed sales usage count before units/name/id tie-breakers.
  - Updated docs: `brain/features/sales-product-report-table.md`, `brain/api/contracts.md`, and `brain/progress.md`; no database docs were needed because no schema or migration changed.
  - Validation: focused Biome check passed for `apps/api/src/db/queries/product-report.ts`; scoped `git diff --check` passed for the touched query file. No dev server, browser smoke, broad typecheck, or build was run.

- Hardened mobile workflow step pill labels for reopened JSON selection metadata.
  - Audited line-card and workflow-selector selected-step labels against the UID-visible-copy requirement.
  - Found the line card used the shared UID-safe selection label, but the workflow selector pills only used that safe selected-label path when `step.value` was present; reopened records with JSON `selectedComponents` but no stored `value` could show the generic step title instead of the selected component label.
  - Extracted native step-pill label resolution into a pure helper that uses shared workflow selection state, preserving existing uppercase component-label styling while showing safe selected labels for JSON metadata.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile display-label behavior only.
  - Validation: focused workflow-step pill label test, shared workflow-records tests, native sales-form-core boundary test, and mobile UI-boundary test passed; targeted search confirmed the selector no longer gates pill labels on `step.value`; no dev server, broad typecheck/build, or UI automation was run per request.

- Centralized mobile sales form route type parsing and tightened customer-selector reset timing.
  - Audited the new/edit/customer-selector invoice routes against the Sales/Quote handoff and recent-customer requirements.
  - Found each route owned its own `type` param normalization, and the initial `source=new` customer-selector reset ran in a normal effect, leaving a narrow chance for stale selected-customer state to paint on direct/deep entry before reset.
  - Added a small native route-param helper with focused coverage, routed the new/edit/customer-selector routes through it, and moved the initial customer-selector reset/type handoff to a layout effect so the store is reset and typed before the selector paints.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile route/handoff behavior only.
  - Validation: focused route-param helper test plus native sales-form-core and mobile UI-boundary tests passed; targeted search confirmed the duplicate route-local normalizers were removed; no dev server, broad typecheck/build, or UI automation was run per request.

- Added regression coverage for mobile Door/Moulding multi-select Proceed visibility.
  - Audited the current mobile workflow selector against the requirement that Door and Moulding multi-select steps show a centered floating `Proceed` once at least one item is selected and that the action advances the workflow.
  - Confirmed the existing handler uses the shared `proceedWorkflowMultiSelectStep` path; extracted the visibility and bulk-select eligibility predicates into a tiny native helper so Door and Moulding proceed behavior is explicit and test-backed.
  - Added focused coverage for Door, Moulding, generic multi-select, and zero-selection states while preserving the existing floating lane and shared proceed action behavior.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile workflow UI guard coverage only.
  - Validation: focused workflow-proceed visibility test, shared workflow-selection action tests, native sales-form-core boundary test, and mobile UI-boundary test passed; targeted search confirmed the old inline proceed predicates were removed; no dev server, broad typecheck/build, or UI automation was run per request.

- Cleaned up remaining quote/invoice visible labels in mobile.
  - Audited the mobile details/read-only screen, workflow notices, recovery banner, item selector, and item sheet after the sales type selector and quote-aware save/customer copy were already in place.
  - Found the screen title and reference row still used hardcoded sales wording, so quote records could show `Sales details` / `Sales #`; workflow notices also referred to the `invoice line item`, recovered quote drafts could say `invoice changes`, and sparse item sections could fall back to `Invoice item`.
  - Added a small native document-label helper under `invoice-form/lib` with focused coverage and routed the shell fallback title, details heading/reference label, workflow notice copy, recovery message, item selector action, item sheet labels, and sparse item fallback title through it, keeping quote screens on `Quote details` / `Quote #` / `quote line item` / `quote changes` / `Quote item` and order screens on invoice wording.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile display copy only.
  - Validation: focused sales-document label test plus native sales-form-core and mobile UI-boundary tests passed; exact-string search found no remaining `Sales details` / `Sales #` labels in the mobile invoice-form path and no `invoice line item` / recovered invoice message / `Invoice item(s)` outside the invoice-mode label regression; no dev server, broad typecheck/build, or UI automation was run per request.

- Normalized sparse mobile custom component fallback titles.
  - Audited the mobile custom component option helper after the search/details/save path had been hardened.
  - Found sparse custom option rows with no title/name fell back to `Custom component`, while real custom titles are normalized to uppercase like the website.
  - Changed the fallback option label to `CUSTOM COMPONENT` and added a focused helper regression so sparse custom options keep the same title normalization contract as typed and saved custom components.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile option display/select normalization only.
  - Validation: focused custom-component option tests plus native sales-form-core and mobile UI-boundary tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Guarded mobile HPT against removing the final selected door option.
  - Audited active-door removal in the mobile House Package Tool section after confirming Door/Moulding multi-select requires at least one selected item.
  - Found the mobile HPT editor exposed the active-door trash action even when only one door option remained selected, allowing the line to drop into a no-selected-door state while still sitting inside HPT.
  - Added a small native helper to allow HPT door-option removal only when the editor is enabled, a removal handler exists, and more than one door option remains selected; wired the active-door trash button through that helper.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile editor guard behavior over existing shared HPT actions.
  - Validation: focused HPT row helper tests plus native sales-form-core and mobile UI-boundary tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile workflow selection and Door/HPT display labels against UID-like copy.
  - Audited the Door Size picker, HPT group helpers, active-door chips, and workflow step pills after the component-card UID cleanup.
  - Found the Door Size picker header still used raw `component.title`, HPT row grouping stored/rendered raw selected door titles, and the shared `workflowStepSelectionLabel` helper could fall back to component UID, `prodUid`, or UID-like `value` as visible copy.
  - Routed the Door Size picker through the mobile UID-safe selectable-title helper, made HPT group labels and quick available-size row `componentTitle` metadata prefer human component value/title copy, and hardened the shared workflow selection-label helper to skip UID-like copy before falling back to readable step titles or neutral selection text.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this changes visible labels and stored HPT display metadata without changing persistence contracts or schema.
  - Validation: focused shared workflow-records, workflow selectable copy, HPT row grouping, native sales-form-core boundary, and mobile UI-boundary tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Routed mobile HPT add/swap door chip labels through UID-safe copy.
  - Audited visible HPT door option labels after the general component UID cleanup.
  - Found the HPT add-door and swap-door chips still used raw component titles, so sparse component records with UID-like titles could leak workflow slugs into mobile UI.
  - Reused the existing mobile workflow selectable copy helper for those chip titles, keeping identity/routing fields unchanged while filtering visible copy.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this changes mobile display copy only.
  - Validation: focused workflow selectable copy, HPT row grouping, native sales-form-core boundary, and mobile UI-boundary tests passed; a direct Bun TSX import check was attempted but blocked by React Native's Flow syntax in `react-native/index.js`, so it was not used as proof.

- Hardened the mobile custom component save handler.
  - Audited the custom component details path after aligning Proceed enablement with unchanged existing custom selection.
  - Found the visible disabled state guarded invalid create/update cases, but the `saveCustomComponent` handler itself could still be invoked programmatically with an unsaveable details state.
  - Added an early handler guard so invalid custom create/update states cannot call `inventories.upsertDykeCustomStepComponent`, while unchanged existing options still select locally through the website-equivalent path.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this narrows a mobile client mutation path without changing contracts or schema.
  - Validation: focused custom-component option tests and native mobile/web-UI boundary tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile workflow line titles against UID-like visible copy.
  - Audited the mobile invoice workflow card/review display after the UID subtitle cleanup.
  - Found review rows and workflow line cards could still render raw `item.title`, which can be UID-like on sparse or hydrated workflow records.
  - Added a shared mobile line-item display title helper beside the existing subtitle helper and routed both line cards and review item rows through it, preserving ordinary product titles while falling back to safe workflow description/category copy.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is mobile display-copy cleanup only.
  - Validation: focused line-item display tests passed, plus native sales-form-core boundary and mobile UI-boundary tests; no dev server, broad typecheck/build, or UI automation was run per request.

- Tightened the mobile HPT swing-field route flag.
  - Audited the full-screen Door Size picker and mobile HPT row editor after aligning route flag semantics with the website panel.
  - Found the HPT row editor still rendered Swing when `hasSwing` was omitted because it only hid the field for explicit `false`.
  - Changed the editor to show Swing only for explicit true, and routed the door-size picker registration through the same mobile door-route flag helper.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this changes mobile UI interpretation of existing route metadata only.
  - Validation: focused line-workflow helper, HPT row grouping, native sales-form-core boundary, and mobile UI-boundary tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Aligned mobile Door/HPT route flags with website HPT semantics.
  - Audited the mobile House Package Tool editor and door-size apply path against the website new-sales-form HPT panel.
  - Found mobile treated missing `hasSwing` config as enabled, while the website renders and patches swing only when `hasSwing` is explicitly true.
  - Added a native helper for mobile door route flags and routed HPT row patches, HPT editor props, and door-size apply patches through it so missing route config no longer renders or persists swing values.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this keeps existing payload shape while aligning mobile flag interpretation.
  - Validation: focused line-workflow helper, floating-action layout, native sales-form-core boundary, and mobile UI-boundary tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Made the mobile invoice item FAB lane explicit.
  - Audited the shared floating invoice action host against the requested item FAB/custom/proceed alignment above the footer.
  - Confirmed the item FAB, custom action, and workflow Proceed already share the centered screen-level host; added a named item-FAB offset helper so the item switcher no longer depends on an unnamed secondary-lane literal.
  - Updated the focused floating-action layout regression to pin the item FAB to the secondary centered lane while custom/proceed stacking remains unchanged.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API/database docs were needed because this is a mobile layout contract cleanup only.
  - Validation: focused floating-action layout, native sales-form-core boundary, and mobile UI-boundary tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Polished simplified mobile shelf edit return behavior.
  - Audited the fullscreen shelf picker against the clarified mobile shelf flow: add shelf item, recent/search list, edit/delete actions, edit save returning to the search dialog, and selected row category subtitles.
  - Found edit save returned to the product list while preserving the old search text, which could hide the just-renamed product and make the return feel broken.
  - Cleared the shelf picker search query after a successful product edit so the modal returns to the simple recent/list view.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this changes mobile modal state only.
  - Validation: focused shelf product option tests passed, native mobile/web-UI boundary tests passed, and no dev server, broad typecheck/build, or UI automation was run per request.

- Aligned mobile custom component Proceed enablement with the save/select path.
  - Audited the custom component sheet against the requested search-to-compressed-details flow and the website-equivalent unchanged-existing-option behavior.
  - Found the details Proceed button required a valid step id even when the selected custom option was unchanged, although that path only selects the existing option and does not need a backend upsert.
  - Added a pure enablement helper so unchanged existing options can proceed without step id, while new or price-changed customs still require step id before save/update.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this changes mobile button enablement only.
  - Validation: focused custom-component option tests passed, native mobile/web-UI boundary tests passed, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile workflow component card copy against UID-like titles.
  - Audited the mobile workflow component grid and component mappers against the requirement that component lists must not show UID subtitles or UID-like fallback copy.
  - Found the component card and two mobile mappers still used raw `title || value` copy, so a UID-like title could render even though selectable-row copy was already protected.
  - Routed component mapping and grid titles through the existing UID-safe workflow selectable copy helper and added a focused mapper regression.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this changes display-copy fallback only.
  - Validation: focused workflow selectable copy and line-workflow helper tests passed; native mobile/web-UI boundary tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Consolidated mobile invoice edge metadata parsing on the shared parser.
  - Audited remaining Expo invoice custom-component, line-workflow, shelf subtitle, HPT grouping, default-profile, and seeded shelf-row helpers after the shared-core parser export.
  - Removed duplicated local JSON parser implementations and object-only reads at those edges, routing them through `readSalesFormObjectMetadata` from the native-safe sales-form core barrel.
  - Kept the mobile UI native-owned and avoided `@gnd/ui`; this is parser plumbing only, with no payload shape change.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client parsing of existing metadata fields without changing payload shape.
  - Validation: focused custom-component option, line-workflow helper, and shelf product option tests passed; native mobile/web-UI boundary tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile invoice store metadata parsing.
  - Audited Expo invoice store line merge/update helpers because mobile shelf and grouped service edits rely on them after reopen.
  - Found source-line matching and taxable propagation still read line metadata as object-only.
  - Moved those reads through the shared sales-form metadata parser so JSON-string metadata keeps native line merging and grouped service row updates aligned with shared-core save behavior.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens mobile parsing of existing metadata fields without changing payload shape.
  - Validation: native mobile/web-UI boundary tests passed, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared record normalization and grouped-line metadata parsing.
  - Audited shared normalization/grouping after mobile-native metadata parsing so mobile create/edit hydration stays on the same core logic path as the website new-sales-form.
  - Found HPT route-config normalization and grouped service/moulding legacy helpers still had object-only metadata reads for some line, row, and step metadata.
  - Moved those reads through object-or-JSON metadata parsing so no-handle HPT hydration, grouped service flags, grouped-row expansion, HPT price tags, and selected moulding step snapshots survive reopened stringified metadata.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused record-normalization and grouping tests passed, native mobile/web-UI boundary tests passed, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile-native invoice metadata parsing at display/editor edges.
  - Audited Expo invoice item grouping, line-card subtitles, door-size patch merges, and HPT row displays after the shared-core metadata parser pass.
  - Found several mobile-native surfaces still reading or spreading line/row metadata as object-only even though reopened records can carry JSON-string metadata.
  - Exported the shared metadata parser from the native-safe sales-form core barrel and wired the mobile-native call sites through it without importing `@gnd/ui`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client parsing of existing metadata fields without changing payload shape.
  - Validation: focused line-item display tests passed, native mobile/web-UI boundary tests passed, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared workflow selection action metadata parsing for mobile edit/reopen parity.
  - Audited workflow selection actions because mobile component selection, multi-select Proceed, Select All, and redirect updates depend on these shared website-equivalent routing helpers.
  - Found selected component, redirect, and select-all patch paths still read or spread step metadata as object-only.
  - Moved those reads and merges to the shared sales-form metadata parser so JSON-string step metadata keeps selection/proceed/redirect updates on the shared routing path without spreading string keys.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow-selection action tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched workflow-selection files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared workflow record metadata parsing for mobile edit/reopen parity.
  - Audited workflow record helpers because mobile selected-card state, selection labels, and component override maps depend on them.
  - Found selection checks, selection labels, and component override map fallbacks still read selected UID/component and redirect/section metadata as object-only.
  - Moved those reads to the shared sales-form metadata parser so JSON-string step metadata keeps selected state and override hydration aligned with reopened records.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow-record tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched workflow-record files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared shelf row helper metadata parsing for mobile edit/reopen parity.
  - Audited shelf price and product-row helpers because mobile shelf row editing uses them while still writing canonical shared `shelfItems`.
  - Found shelf display pricing, custom price edits, custom-price clearing, product clearing, and product selection patching still read or spread row metadata as object-only.
  - Moved those reads and merges to the shared sales-form metadata parser so JSON-string shelf row metadata preserves price/category fields without spreading string metadata keys.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused shelf helper and shelf row product tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched shelf helper files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared workflow component edit metadata parsing for mobile edit/reopen parity.
  - Audited workflow component edit helpers because mobile consumes them through the native-safe sales-form core barrel for component price, image, redirect, and section override edits.
  - Found edit-state creation, save patches, and quick price overrides still read and spread selected component metadata as object-only.
  - Moved those reads to the shared sales-form metadata parser so JSON-string selected-component snapshots can be edited without spreading string metadata keys.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow component edit action tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched component edit files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared workflow calculator metadata parsing for mobile edit/reopen parity.
  - Audited workflow calculators because mobile shelf sections, door-size candidates, and HPT door summaries rely on them through the native-safe sales-form core boundary.
  - Found shelf row pricing/category metadata, door-size variation metadata, and HPT door summary metadata still had object-only reads even though the module already had access to the shared parser.
  - Moved those reads to the shared sales-form metadata parser so reopened JSON-string records keep shelf pricing/category identity, door-size variation rules, and HPT summary surcharge/flat-rate values.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow-calculator tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched workflow-calculator files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened selected Door/Moulding selector metadata parsing for mobile edit/reopen parity.
  - Audited selected component selector helpers because mobile HPT, moulding rows, line totals, and workflow sync depend on their restored selected snapshots.
  - Found selector fallbacks and persisted moulding rows still read some metadata fields through object-only access and used a local parser instead of the shared sales-form parser.
  - Moved selector metadata reads to the shared parser so outer/nested step metadata, fallback component fields, and persisted moulding rows are restored from object or JSON-string metadata.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused selector tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched selector files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared moulding action metadata parsing for mobile edit/reopen parity.
  - Audited moulding save/remove actions because mobile moulding multi-select and row quantity edits route through shared sales-form core helpers.
  - Found the helper still used a local metadata parser and still spread raw line/step metadata in selection patches, which could leak string-character keys or miss persisted moulding rows when metadata was stringified.
  - Moved the helper to the shared sales-form metadata parser for object or JSON-string line/step metadata while preserving the website-equivalent grouped-row patch shape.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow moulding action tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched moulding action files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened sales-form costing metadata parsing for mobile invoice/quote total parity.
  - Audited summary costing because mobile save/review totals are computed from shared sales-form summary logic.
  - Found service taxability, derived service/moulding labor rows, fallback labor rates, and shelf row price fallbacks still read line/row metadata as object-only.
  - Moved those reads to the shared sales-form metadata parser so JSON-string grouped-row metadata contributes to totals, labor, and taxability without changing payload shape.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused costing tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched costing files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened customer-profile repricing metadata parsing for mobile edit/reopen parity.
  - Audited profile repricing because mobile customer/profile initialization routes through shared record normalization and `repriceSalesFormLineItemsByProfile`.
  - Found workflow selected components, shelf rows, HPT door rows, and stored door route config still depended on object-only metadata when recalculating prices for a profile coefficient change.
  - Moved those reads and metadata spreads to the shared sales-form metadata parser so JSON-string metadata remains usable without changing the canonical payload shape or website-equivalent pricing rules.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused profile-repricing tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched profile-repricing files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared Door/HPT action metadata parsing for mobile edit/reopen parity.
  - Audited the shared door action helper because mobile HPT add/swap/remove and supplier changes call it through the native-safe sales-form core barrel.
  - Found supplier updates, selected-door swaps, HPT add/remove, and selection summarization still read or spread step metadata as object-only.
  - Moved those reads to the shared sales-form metadata parser so JSON-string selected-component snapshots keep driving Door/HPT actions without duplicating selected doors or spreading string metadata keys.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow door action tests passed, focused door utility tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched door action/utility files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared door-size utility metadata parsing for mobile edit/reopen parity.
  - Audited the shared door utility layer because mobile Door and HPT size editing depends on it for website-equivalent price availability, selected component identity, supplier metadata, row normalization, and supplier repricing.
  - Found several helpers still read row/step metadata as object-only, which could lose configured base pricing, selected custom/imported door identity, supplier info, or missing-price state after reopening stringified saved metadata.
  - Moved those reads to the shared sales-form metadata parser while preserving the existing new-sales-form pricing and payload shape.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused door utility tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched door utility files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened HPT compatibility metadata parsing for mobile edit/reopen parity.
  - Audited the shared HPT compatibility layer because mobile HPT rows rely on it for website-equivalent pricing, legacy row hydration, normalization, and totals.
  - Found flat-rate, door sales-unit, surcharge, add-on, custom override, and hydration paths still read several step/row metadata values as object-only.
  - Moved those reads to the shared sales-form metadata parser so HPT compatibility logic accepts object or JSON-string metadata while keeping the canonical payload shape and new-sales-form pricing semantics unchanged.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused HPT compatibility tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched HPT compatibility files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened route rebuild metadata handling for mobile edit/reopen parity.
  - Audited the shared route engine because mobile workflow selection and custom/HPT progression depend on `rebuildStepsFromSelection` and `resolveConfiguredRouteStepsForLine`.
  - Found route seeding, configured-step merging, selected root resolution, redirect disable/restore, and custom next-step fallback still read several metadata values as object-only.
  - Moved those reads to the shared sales-form metadata parser so route rebuilds preserve configured route metadata, selected root snapshots, image metadata, redirect-disabled state, and line `doorType` fallback from object or JSON-string metadata.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused route-engine tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched route-engine files; no dev server, broad typecheck/build, or UI automation was run per request.

- Centralized shared sales-form workflow metadata parsing.
  - Followed up on the repeated object-or-JSON metadata hardening in the mobile invoice parity path.
  - Added a small shared `readSalesFormObjectMetadata` helper under the sales-form domain layer and migrated the recently touched shared workflow modules away from local parser copies.
  - Kept the parser in `@gnd/sales` shared core so Expo continues to consume native-safe business logic without importing web UI code.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is internal shared-core architecture cleanup.
  - Validation: focused metadata, mutation-engine, step-engine, workflow-calculators, workflow-selection, and workflow-visible-components tests passed; native mobile/web-UI boundary tests passed; scoped `git diff --check` passed for touched shared workflow files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared workflow step metadata maps for mobile reopen parity.
  - Scanned mobile invoice-form and shared sales-form helpers for remaining object-only workflow metadata reads that affect component visibility, routing, or pricing.
  - Found the shared step engine still read `selectedProdUids`, `redirectDisabled`, and component `priceStepDeps` from object metadata only, which could hide selected custom components, mis-evaluate multi-select visibility rules, or skip dependency pricing after JSON-string hydration.
  - Updated the shared step engine to parse object or JSON-string metadata for those maps, keeping `resolveWorkflowVisibleComponents` and workflow step navigation aligned with reopened mobile form state while preserving the website's core logic path.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens shared-core parsing of existing metadata fields without changing payload shape.
  - Validation: focused step-engine tests passed, focused workflow-visible-components tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched step-engine files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile HPT route-config metadata handling.
  - Audited the door/moulding floating Proceed path and confirmed the current mobile selector already shows Proceed only when a multi-select picker has at least one selected component, using `proceedWorkflowMultiSelectStep` and the shared floating-action lanes.
  - Found a smaller HPT reopen gap: selected-door helpers and route-config resolution still read some step/line metadata as object-only, so JSON-string metadata could drop selected door snapshots or no-handle/swing section overrides.
  - Updated the shared `getRouteConfigForLine` resolver and the mobile line workflow helper to parse object or JSON-string metadata before applying stored route config, selected components, and section overrides.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client/shared-core parsing of existing metadata without changing payload shape.
  - Validation: focused workflow-calculators route tests passed, focused mobile line-workflow helper tests passed, native mobile/web-UI boundary tests passed, and scoped `git diff --check` passed for touched HPT helper files; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened shared custom-component metadata handling for mobile workflow selection.
  - Audited the mobile custom-component flow against the website new-sales-form custom component path and the shared sales-form selection helpers.
  - Found shared workflow selection still treated component `_metaData` as object-only in several core snapshots, so JSON-string custom metadata could lose the custom marker or spread string characters into persisted selected-component metadata.
  - Updated the shared mutation engine, workflow selection snapshot helper, and visible-component filter to parse object or JSON-string metadata before checking/persisting `custom`, keeping mobile custom selections hidden from normal lists unless selected and preserving selected-custom-first behavior.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client/shared-core parsing of existing metadata without changing payload shape.
  - Validation: focused mutation-engine, workflow-selection, workflow-visible-components, and mobile custom-component option tests passed; native mobile/web-UI boundary tests passed; scoped `git diff --check` passed for touched shared workflow files; no dev server, broad typecheck/build, or UI automation was run per request.

## 2026-06-18

- Hardened the mobile invoice floating-action lane contract.
  - Audited item FAB, workflow Proceed, and Custom action placement against the requested shared centered floating behavior above the footer.
  - Added a pure floating-action layout module for primary/secondary/tertiary/overlay-proceed offsets, moved the item FAB and workflow Proceed/Custom call sites to the shared helpers, and added focused tests pinning the stacked lane spacing.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile layout plumbing only.
  - Validation: focused floating-action layout/registry tests passed, native mobile/web-UI boundary test passed, scoped `git diff --check` passed for touched files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened sparse customer display in the mobile invoice flow.
  - Audited the type-aware recent-customer selector path and found the query/type handoff was already correct, but sparse customer rows could still render dangling contact separators or blank billing copy in selector/review/details UI.
  - Added a small native mobile customer-display helper, wired it into the customer selector, review step, and read-only details screen, and covered sparse contact/address fallback behavior with focused tests.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile display-copy normalization only.
  - Validation: focused customer-display tests passed, native mobile/web-UI boundary test passed, scoped `git diff --check` passed for touched files, and a targeted scan found no remaining dangling `contact - phone` render pattern in invoice-form components; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened the new-sales-form shelf API test harness.
  - Found the API mock had drifted into split `dykeSalesShelfItem` definitions, leaving root recent shelf reads and transaction shelf writes at risk of masking each other.
  - Extracted one local shelf-row finder for the test harness, wired it through both the root DB mock and transaction mock, and kept transactional `updateMany` / `createMany` available for save-path tests.
  - Updated docs: `brain/progress.md`; no feature/API contract docs changed because this is validation harness cleanup only.
  - Validation: focused recent shelf search test passed, focused repeated shelf-save test passed, and scoped `git diff --check` passed for the touched API test file; one broader save/hydrate test still hits the existing unrelated tax-summary assertion where `grandTotal` equals `subTotal`.

- Hardened the mobile shelf recent-products source.
  - Found `newSalesForm.searchShelfProducts` overfetched recent shelf usage rows but sliced to the requested limit before filtering archived/hidden products, which could under-fill the simplified mobile picker's blank search even when older visible recent shelf items existed.
  - Changed the recent helper to preserve the overfetched unique ID order through visibility filtering and slice after hidden products are skipped; blank search still returns recent used products only and does not fill with unused active shelf products.
  - Updated docs: `brain/features/mobile-invoice-form.md`, `brain/api/endpoints.md`, and `brain/progress.md`; no API contract shape changed.
  - Validation: focused `new-sales-form` shelf recent/edit/delete test passed and scoped `git diff --check` passed for the touched API files; no dev server, broad typecheck/build, or UI automation was run per request.

- Added inline confirmation to simplified mobile shelf product delete.
  - Reviewed the simplified shelf picker against the clarified mobile shelf contract.
  - Kept the fullscreen search/edit/select flow unchanged, but changed the search-result delete icon to open an inline confirmation before calling `newSalesForm.deleteShelfProduct`; the existing parent delete callback still clears matching selected shelf rows after the soft delete.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this only adds a native confirmation before the existing delete mutation.
  - Validation: focused shelf helper/option tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched file, and no dev server, broad typecheck/build, or UI automation was run per request.

- Added website-equivalent custom component archive action to mobile.
  - Compared the website custom component combobox option-management behavior with the mobile custom sheet.
  - Added a trash action and inline confirmation to mobile custom search results, wired to `inventories.archiveDykeCustomStepComponent`, and refreshed the step component source after archive so mobile follows the same existing inventory mutation contract as the website.
  - Kept the action inside the native mobile sheet UI; no web UI package was imported.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because mobile now consumes the existing archive mutation.
  - Validation: focused custom-component option tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Aligned mobile saved-custom selection with the website workflow path.
  - Compared the website new-sales-form custom-component submit flow against mobile `CustomComponentSheet` save/select wiring.
  - Updated mobile saved-custom selection to pass `selectedOverride: true` into the shared `saveWorkflowSelectedComponent` helper, matching the website path so saved/selected custom components are always selected instead of being treated like an ordinary toggle on multi-select-capable steps.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this changes only the mobile caller's intent flag into the existing shared workflow selection helper.
  - Validation: focused shared workflow selection/mutation tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched file, and no dev server, broad typecheck/build, or UI automation was run per request.

- Aligned mobile custom-component price-change detection with website logic.
  - Compared the mobile custom-component save/select flow against the website new-sales-form custom component combobox and shared workflow selection helper.
  - Updated mobile `customComponentPriceChanged` to match the website's null-vs-zero semantics, so explicitly setting an unpriced custom component to `0` or clearing a `0` price is treated as a changed price and routes through the existing upsert path.
  - Confirmed mobile custom selection continues to use the shared `saveWorkflowSelectedComponent` helper after save/select, preserving website workflow mutation behavior while keeping the UI native.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this aligns client-side decision logic with the existing website mutation contract.
  - Validation: focused custom-component option tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile workflow selectable copy against UID-like values.
  - Updated the mobile workflow selectable display helper so component rows ignore UID-like `value` fallbacks when `title` is absent or also UID-like.
  - Item/component search rows now fall back to neutral `Component` / `Workflow component` copy unless the API row provides a human title or value.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile display-copy normalization only.
  - Validation: focused workflow selectable copy tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile line-card subtitles against UID-like workflow copy.
  - Updated the mobile invoice line-item display helper so workflow rows suppress UID-like fallback strings such as `workflow-*`, `*-uid`, and component/source UID markers even when they do not exactly match the stored identity fields.
  - Preserved normal product SKU display for non-workflow items and kept human category copy as the preferred workflow fallback.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile display-copy filtering only.
  - Validation: focused line-item display tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened the mobile new-sales customer-selector entry.
  - Updated the Expo customer-selector route so `source=new` resets the in-memory sales form before reapplying the selected `order`/`quote` type.
  - This keeps direct/deep initial customer-selection paths aligned with the dashboard `New Invoice` sheet behavior and prevents stale customer or line-item state from surviving into a new invoice/quote.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this only tightens route/store initialization.
  - Validation: native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched route and docs, and no dev server, broad typecheck/build, or UI automation was run per request.

- Aligned mobile custom-component title normalization with the website.
  - Updated mobile custom-component helpers to normalize option, match, and selected component titles to uppercase, matching the website combobox behavior.
  - Updated the mobile custom sheet save path to send normalized titles to `inventories.upsertDykeCustomStepComponent` and clear the selected existing option when the compressed title edit no longer matches it, preventing accidental existing-custom updates when the user intends a new title.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this aligns client-side normalization with the existing website flow.
  - Validation: focused custom-component option tests passed, native mobile/web-UI boundary tests passed, scoped `git diff --check` passed for the touched custom files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile moulding/service grouped rows for JSON line metadata.
  - Updated shared workflow record readers so stored `meta.mouldingRows` and `meta.serviceRows` are read from object metadata or JSON-string line metadata.
  - Updated moulding/service row patch builders to merge parsed line metadata before writing grouped rows, avoiding accidental string-character metadata keys when a hydrated line carries stringified metadata.
  - Mirrored the metadata reader in shared record normalization so create/edit/update hydration recalculates grouped moulding and service totals from stringified metadata instead of stale line totals.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens parsing of existing metadata fields without changing payload shape.
  - Validation: focused workflow row-patch and record-normalization tests passed, scoped `git diff --check` passed for the touched grouped-row files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile HPT row grouping for JSON row metadata.
  - Updated the mobile House Package Tool row grouping helper to read component UID/title metadata from either object metadata or JSON-string row metadata.
  - This keeps reopened imported/custom door size rows attached to their selected door group instead of falling back into the manual group when persisted row metadata is stringified.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens parsing of existing row metadata without changing payload shape.
  - Validation: focused HPT row grouping tests passed, scoped `git diff --check` passed for the touched HPT files, and no dev server, broad typecheck/build, or UI automation was run per request.

- Tightened the simplified mobile shelf picker result source.
  - Updated the mobile line-item shelf picker wiring so its fullscreen search modal is fed only by `searchShelfProducts` recent/search results and no longer merges already-selected shelf product detail rows into the picker list.
  - This keeps blank search aligned with the requested top-10 recent shelf items behavior while selected items remain displayed in the shelf step UI with category-tree subtitles.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because mobile now passes an empty selected-id list to the existing search endpoint for this picker.
  - Validation: focused shelf helper/option tests passed, scoped `git diff --check` passed for the touched mobile line-card file, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened selected custom-component merging across split metadata shapes.
  - Updated the mobile custom-component option helper to merge selected custom UID/component arrays from all available active-step metadata records instead of stopping at the first array it sees.
  - This prevents an empty outer form-step `selectedProdUids` or `selectedComponents` array from masking nested route-step selected custom snapshots, preserving selected-custom-first ordering and visible selected custom hydration.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens parsing of existing metadata fields without changing payload shape.
  - Validation: focused custom component option tests passed, changed custom option files passed a Bun transpile check, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile door/HPT reopen selection for nested route metadata.
  - Updated the shared sales-form selector so `getSelectedDoorComponentsForLine` reads selected door snapshots from both outer form-step metadata and nested route-step metadata, including JSON-string metadata shapes.
  - This keeps reopened mobile door/HPT lines from losing richer selected door data such as pricing, supplier variants, redirect metadata, and section overrides when hydration carries selection under `step.meta`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens parsing of existing metadata fields without changing payload shape.
  - Validation: focused selector and HPT row grouping tests passed, changed selector files passed a Bun transpile check, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile shelf selected-row category subtitles for hydrated metadata.
  - Updated the shelf category-path display helper so selected shelf rows read category metadata from object metadata or JSON-string metadata.
  - This keeps the simplified mobile shelf picker showing category-tree subtitles after hydration/edit reopen instead of falling back to `Uncategorized` when row metadata arrives stringified.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens display parsing of existing row metadata without changing payload shape.
  - Validation: focused shelf product option tests passed, changed shelf option files passed a Bun transpile check, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile moulding reopen selection for nested route metadata.
  - Updated the shared sales-form selector so `getSelectedMouldingComponentsForLine` reads selected component snapshots from both outer form-step metadata and nested route-step metadata, including JSON-string metadata shapes.
  - This keeps reopened mobile moulding lines from losing richer selected component data when hydration carries selection under `step.meta` instead of the outer form-step `meta`, while still backfilling from persisted `line.meta.mouldingRows`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client/domain parsing of existing metadata fields without changing payload shape.
  - Validation: focused selector and workflow row-patch tests passed, changed selector files passed a Bun transpile check, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile HPT door grouping for uid-only selected doors.
  - Found `buildDoorGroups` attached persisted size rows to selected door groups only by numeric `stepProductId`, so hydrated rows for selected doors identified by `meta.componentUid` could split into a manual group.
  - Updated the HPT row grouping helper to fall back to stored component UID metadata and added focused coverage for uid-only selected doors.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this preserves existing row metadata semantics without changing payload shape.
  - Validation: focused HPT row grouping tests passed, changed HPT row files passed a Bun transpile check, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile moulding removal for nested route metadata.
  - Updated the shared moulding removal helper to reconcile selected UID/component snapshots from both outer form-step metadata and nested route-step metadata, including JSON-string metadata shapes.
  - This keeps row removal, selected moulding summaries, and persisted `meta.mouldingRows` synchronized after mobile edit/hydration paths that carry selection snapshots under `step.meta`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client parsing of existing metadata fields without changing payload shape.
  - Validation: focused moulding action and moulding calculator tests passed, changed moulding action files passed a Bun transpile check, and no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened HPT custom-price edits to recalculate immediately.
  - Found the shared door custom-price helper preserved override metadata but did not update the row final unit and line total at the edit point, leaving mobile HPT row totals/breakdowns able to lag until a later grouped-row normalization.
  - Updated `patchDoorRowCustomPrice` to use the canonical HPT unit-price breakdown, applying custom price as the immediate final unit and restoring calculated automatic pricing when the custom price is cleared.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is shared row-edit behavior within the existing HPT payload shape.
  - Validation: focused door price update and mobile HPT row grouping tests passed, changed door-price files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened selected custom-component display for nested route metadata.
  - Extended the mobile custom option helper so selected custom snapshots and selected custom UID ordering are read from either active form-step metadata or nested route-step metadata, including JSON-string metadata shapes.
  - This keeps selected custom components pinned first even when the route/component API hydrates selected state through `step.meta` instead of the outer form-step `meta`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens client parsing of existing metadata shapes.
  - Validation: focused custom-component option and floating-action registry tests passed, changed custom option files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Fixed the mobile door-size `Next step` advance path.
  - Found the door-size route applied the selected door rows through the multi-select save helper, but that helper intentionally leaves ordinary multi-select interactions on the current step.
  - Changed the mobile door-size `advance` path to run the shared multi-select proceed action after applying the door rows, so `Next step` moves the workflow past Door while `OK` still only applies the size rows.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile workflow state behavior only.
  - Validation: focused workflow selection and row-patch tests passed, the mobile workflow selector passed a Bun TSX transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Tightened the simplified mobile shelf picker contract.
  - Changed blank `newSalesForm.searchShelfProducts` results to return only recently used shelf products instead of filling sparse usage with unused active products.
  - Kept typed shelf search and selected-product hydration as the paths for finding non-recent shelf products.
  - Updated docs: `brain/features/mobile-invoice-form.md`, `brain/api/endpoints.md`, and `brain/progress.md`.
  - Validation: focused shelf product API tests passed, shelf subtitle/native-boundary guards passed, changed API files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request. The full `new-sales-form.test.ts` file still has two unrelated tax-summary assertion failures in existing non-shelf tests.

- Aligned typed custom-component proceed with list selection.
  - Added a pure exact-title matcher for custom options and wired the fullscreen search `Proceed` path through it.
  - Typing an existing custom component title and tapping `Proceed` now collapses into `Title & Cost` using the existing option and stored price, matching the behavior of tapping the search result and avoiding duplicate custom creation.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this changes mobile selection behavior before the existing save/upsert call.
  - Validation: focused custom-component option tests passed, touched custom component files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile custom-component metadata shape handling.
  - Custom option detection, archived filtering, and selected-custom snapshot merging now accept both object metadata and JSON-string metadata, matching the shapes mobile can receive from API/hydration boundaries.
  - Added focused coverage for stringified `_metaData` custom/deleted flags and stringified step metadata containing selected custom snapshots.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this broadens mobile parsing of existing metadata fields.
  - Validation: focused custom-component option tests passed and touched custom option files passed a Bun transpile check; no dev server, broad typecheck/build, or UI automation was run per request.

- Unified selected-custom-first ordering with custom metadata parsing.
  - Moved the selected-custom-first ordering helper into the pure custom options module so selected-custom merging, option detection, archived filtering, and grid ordering share the same object/JSON-string metadata handling.
  - Kept the sheet as a UI shell that re-exports the pure helper for existing imports, and made its save-response metadata reader JSON-string tolerant.
  - Added focused coverage proving selected custom components are pinned first when `selectedProdUids` and custom metadata arrive as JSON strings.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile metadata parsing and ordering behavior only.
  - Validation: focused custom-component option tests passed and touched custom files passed a Bun transpile check; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile line-card subtitles against hydrated workflow UID metadata.
  - Added a pure line-item display helper so ordinary product SKUs remain visible while workflow line subtitles avoid `workflowComponentUid`, `sourceUid`, and line identity values.
  - Updated the mobile line-item card to use the helper instead of rendering `meta.sku` directly.
  - Added focused regression coverage for ordinary product SKUs, hydrated workflow UID suppression, and sparse workflow fallback copy.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile display mapping only.
  - Validation: focused line-item display tests passed, touched line-card files passed a Bun transpile check, targeted direct-subtitle scan returned no matches, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Stabilized the mobile custom-component sheet snap configuration.
  - Replaced the inline `["42%", "100%"]` snap-point array with a module-level constant so the shared bottom-sheet Modal does not receive a new snap-point reference while users type/search.
  - This keeps the requested fullscreen search to compressed `Title & Cost` morphing flow less fragile without changing the UI contract.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile presentation plumbing only.
  - Validation: focused custom sheet transpile check passed, targeted snap-point scan confirmed the stable constant is used, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened the mobile invoice floating-action host against stale callbacks.
  - Extracted the host update decision into a pure registry helper and changed registration to refresh when the rendered action node changes, even if the lane/offset refresh key is unchanged.
  - Preserved the no-op update guard for unchanged node plus unchanged refresh key, so item FAB/custom/proceed lanes do not churn unnecessarily.
  - Added focused regression coverage for unchanged actions, same-key node updates, and changed refresh keys.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile UI state plumbing only.
  - Validation: focused floating-action registry tests passed, touched floating-action files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Enforced the moulding final-row removal invariant in shared workflow logic.
  - Changed `removeWorkflowMouldingSelection` to return `null` when a removal would clear the final persisted moulding row, matching the website/mobile line-editor UX.
  - Made mobile workflow toggling, mobile line-item removal, and the website line-item panel no-op when the shared helper rejects the removal.
  - Added focused regression coverage for the final-row guard while preserving multi-row removal behavior.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this tightens shared workflow behavior without changing payload shape.
  - Validation: focused moulding action tests passed, touched moulding caller files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Removed a remaining workflow UID display fallback from the mobile item selector search path.
  - Added a pure workflow selectable-copy helper so workflow search rows use component titles or neutral copy for display title/SKU fields instead of component UID strings.
  - Kept workflow identity in `componentUid` / `workflowComponentUid` fields for routing and persistence.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile display mapping only.
  - Validation: focused workflow selectable-copy tests passed, touched search files passed a Bun transpile check, targeted UID-display fallback scan returned no matches in the mobile invoice-form area, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Kept the mobile shelf-items picker intentionally simple.
  - Removed obsolete mobile category-bucketing/search helper code and tests left over from the previous complex shelf flow.
  - Retained focused helper coverage only for the category-tree subtitles shown in the fullscreen shelf search list and selected shelf rows.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because search/recent/edit/delete behavior and canonical `shelfItems` persistence are unchanged.
  - Validation: focused shelf subtitle helper tests passed, touched shelf files passed a Bun transpile check, obsolete helper names were scanned out of the mobile invoice-form shelf path, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Clarified mobile door-size fullscreen action semantics.
  - Added optional action copy/secondary-action controls to the native door-size picker state and screen.
  - Kept the main workflow door-size flow as `Next step` plus `OK`, where `Next step` applies the selected rows and advances the workflow.
  - Changed the HPT line-item size editor to show a single `Apply` action because that reuse path edits current HPT rows and does not advance the workflow selector.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this is mobile UI state only.
  - Validation: touched door-size files passed a Bun transpile check, focused workflow selection/native-boundary tests passed, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Hardened mobile House Package Tool add-door focus behavior.
  - Kept the newly selected add-door group pending until the parent line-item patch rehydrates `selectedDoors`, preventing the active chip from snapping back to the previous door before the new group exists.
  - Added focused mobile HPT grouping coverage for selected doors with no size rows, persisted size-row grouping, and manual legacy rows.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because the existing `formSteps` and `housePackageTool.doors` payload shape is unchanged.
  - Validation: focused mobile HPT row-group tests passed, touched HPT files passed a Bun transpile check, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Tightened mobile House Package Tool quick-size row parity.
  - Moved quick available-size row construction into the HPT row helper and kept website-equivalent tier pricing while adding the same component uid/title metadata used by full HPT picker rows.
  - Updated the line-item card to call the helper instead of constructing HPT quick rows inline.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because the canonical `housePackageTool.doors` shape is unchanged.
  - Validation: focused mobile HPT row tests passed and touched HPT files passed a Bun transpile check; no dev server, broad typecheck/build, or UI automation was run per request.

- Tightened shared door-size derivation metadata parity.
  - Updated `deriveDoorSizeRows` so main door-size picker rows carry component uid/title metadata for both configured-size and fallback rows, matching custom/HPT row creation paths and improving saved-row grouping/display after hydration.
  - Added focused door utility coverage for metadata on configured zero-dollar rows and fallback rows.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because this preserves extra row metadata inside the existing `housePackageTool.doors` JSON shape.
  - Validation: focused door utility tests passed and touched door utility files passed a Bun transpile check; no dev server, broad typecheck/build, or UI automation was run per request.

- Added mobile House Package Tool add-door support.
  - Added shared `addWorkflowHptDoorOption`, exported it through the mobile-safe sales-form core, and covered that it adds a Door multi-select option without mutating configured HPT size rows, quantities, or totals.
  - Added a flat mobile HPT `Add door` control that opens available door options, adds the selected door to the HPT door groups, and leaves size/quantity configuration to the existing door-size controls.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because the existing `formSteps` and `housePackageTool.doors` payload shape is unchanged.
  - Validation: focused workflow door action tests passed, changed HPT/mobile files passed a Bun transpile check, and the sales-form-core native-safety guard still passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Simplified the mobile shelf-items step around the requested full-screen shelf item picker.
  - Replaced the category/section-heavy mobile shelf editor with a `Shelf item` action that opens a fullscreen search modal, shows 10 recent used shelf products on blank search, supports typed search, returns selected items to a clean row list with category-tree subtitles, and keeps row qty/price/remove controls in the shelf step.
  - Added edit/delete actions to mobile shelf search results; edit saves shelf product name/price and returns to the search list, while delete soft-deletes the shelf product and clears matching selected rows.
  - Changed `newSalesForm.searchShelfProducts` blank-query behavior to use recent saved shelf line usage, added route-local `newSalesForm.updateShelfProduct` and `newSalesForm.deleteShelfProduct`, and documented the API surface.
  - Updated docs: `brain/features/mobile-invoice-form.md`, `brain/api/endpoints.md`, and `brain/progress.md`.
  - Validation: focused shelf product helper tests passed, the targeted recent/edit/delete API test passed, changed files passed a Bun transpile check, and the native UI boundary test still passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Added an Expo-source guard so the mobile app cannot import the web UI package directly.
  - Added `apps/expo-app/src/features/sales/invoice-form/native-ui-boundary.test.ts`, which walks `apps/expo-app/src` and fails if source files reference `@gnd/ui` or `packages/ui`.
  - Updated ADR-010 and the mobile invoice-form feature doc to document that Expo may share pure `@gnd/sales/sales-form-core` helpers, but not website UI.
  - Validation: the focused native UI boundary test passed and the targeted `rg` source scan found no current Expo/web-UI imports; no dev server, broad typecheck/build, or UI automation was run per request.

- Added an executable native-safety guard for the mobile sales-form core boundary.
  - Added `packages/sales/src/sales-form-core.native-safety.test.ts`, which recursively walks relative imports/exports from `sales-form-core.ts` and fails if the mobile-facing barrel reaches TSX modules or `@gnd/ui`.
  - Updated `brain/features/mobile-invoice-form.md` and `brain/progress.md` to document the test-backed native-safe boundary.
  - Validation: the native-safety guard passed, and the `sales-form-core` Bun import smoke check still passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Fixed the mobile Android bundle regression caused by a web UI import crossing into Expo.
  - The Android bundle failed because `@gnd/sales/sales-form-core` exported shelf helpers from `sales-form/ui/workflow/shelf-inputs.tsx`, which imports `@gnd/ui/combobox` and `@gnd/ui/icons`.
  - Added native-safe pure `shelf-helpers.ts`, repointed the mobile-facing core barrel to it, and kept `shelf-inputs.tsx` as a web UI component that imports/re-exports those pure helpers for website compatibility.
  - Added ADR-010 to document that mobile may consume `sales-form-core` only when it stays free of web UI and `@gnd/ui` imports.
  - Updated docs: `brain/features/mobile-invoice-form.md`, `brain/progress.md`, and `brain/decisions/ADR-010-mobile-sales-form-core-native-safe.md`.
  - Validation: `sales-form-core` Bun import smoke check passed, focused shelf helper tests passed, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile moulding website-parity audit without marking the Brain-goal queue complete.
  - Found website moulding rows expose a per-row LF/piece-length/waste calculator while mobile only supported direct quantity entry; mobile custom price also could not return to a true blank/Auto value, and it allowed removal of the final moulding row unlike web.
  - Added package-owned piece-length detection and moulding quantity calculation, a modular mobile per-row calculator with piece-length choices, total LF, waste, pieces, cost preview, Cancel/Apply, a reusable nullable mobile number field, and website-equivalent final-row removal protection.
  - Calculator Apply updates only row quantity through the existing `buildWorkflowMouldingRowsPatch` path, preserving grouped metadata and legacy identity behavior.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because `line.meta.mouldingRows` is unchanged.
  - Validation: focused moulding calculator Bun tests passed (3 tests), targeted calculator/export wiring scans passed, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile House Package Tool website-parity audit without marking the Brain-goal queue complete.
  - Found mobile HPT rows omitted the website estimate breakdown, base cost, component surcharge, calculated/custom final-unit context, and priced workflow-step contributions; mobile also edited computed unit price directly and allowed quantity on rows with missing supplier pricing.
  - Extracted the web base-price updater into a native-safe pure workflow helper with a compatibility re-export, added a dedicated mobile HPT pricing/breakdown component, aligned size/quantity/base/add-on/custom controls with website semantics, and surfaced missing-price guidance.
  - Added a shared custom-price patch helper so clearing an override removes both row and legacy metadata on web and mobile, then added focused pricing regression coverage.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because the canonical HPT payload shape is unchanged.
  - Validation: focused `door-price-update` Bun tests passed (2 tests), targeted HPT export/action scans passed, and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile shelf-items destructive-action parity audit without marking the Brain-goal queue complete.
  - Compared the mobile shelf editor with the website `DefaultShelfPanel` and found mobile removed populated categories/sections immediately and lacked the website's whole-section Clear action.
  - Added a shelf-only inline confirmation component, guarded populated category/section clears, added Clear section reset-to-one-blank-row behavior, and guarded section removal while keeping persistence in the existing line-item workflow boundary.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract update was needed because the canonical `shelfItems` payload is unchanged.
  - Validation: targeted shelf action contract scans and scoped `git diff --check` checks passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile fresh-create item-state audit without marking the Brain-goal queue complete.
  - Found create/reset/bootstrap state and `ItemsStep` still automatically seeded a mock workflow `New Line`, making the existing empty-state Add item/FAB workflow unreachable on a fresh invoice.
  - Changed fresh create/reset state to keep an empty line-item list, preserved empty create bootstrap records despite the shared hydrator's generic-line fallback, and removed the `ItemsStep` auto-add effect. The explicit Add item action still creates the workflow template, and shared save validation already rejects saving without a line item.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: scoped Bun build check passed for the invoice-form store and ItemsStep, targeted symbol checks confirmed the automatic fallback path was removed, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile New Invoice fresh-state audit without marking the Brain-goal queue complete.
  - Found the direct Sales/Quote-to-customer-selector handoff still reused whatever invoice form state was in memory until a later form bootstrap/hydration occurred.
  - Changed the Sales/Quote choice to reset the in-memory form and immediately apply the selected sales type before opening the typed customer selector, preventing stale customer/items from appearing as selected in the new-flow selector.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: scoped Bun build check passed for the Sales/Quote sheet and invoice-form store, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile floating-action footer-safety audit without marking the Brain-goal queue complete.
  - Found the shared floating lanes sat close enough to the fixed Save Draft/Create footer that validation text could reduce clearance and risk overlap.
  - Raised the shared invoice floating offsets while preserving the same centered x-axis and 64px vertical spacing for Proceed, item FAB, and Custom actions.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: scoped Bun build check passed for the floating host and its item/custom/workflow callers, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile New Invoice customer-handoff audit without marking the Brain-goal queue complete.
  - Found the Sales/Quote sheet still routed to `/invoices/new` first and relied on the form screen to redirect to the initial customer selector, even though the customer selector route already has `source=new` handoff behavior.
  - Changed the dashboard `New Invoice` Sales/Quote choice to open the typed customer selector directly, avoiding an intermediate create-form bootstrap before customer selection.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: scoped Bun build check passed for the Sales/Quote sheet and related customer/new invoice routes, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile workflow UID-visibility audit without marking the Brain-goal queue complete.
  - Found sparse workflow/custom/HPT component data could still fall back to UID text for visible titles even after the requested UID subtitle cleanup.
  - Replaced those visible title fallbacks with neutral labels (`Component`, `Door`, `Custom component`) while preserving UID fields for keys, identity, routing, and saved payloads.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: targeted search found no remaining `title || uid` / `componentLabel(...uid)` visible fallback patterns under the mobile invoice-form area, custom-component helper tests passed, edited modules passed a scoped Bun build check with React Native internals externalized, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile moulding row-editor parity audit without marking the Brain-goal queue complete.
  - Compared mobile moulding rows to the website `MouldingLineItemsEditor` and found mobile lacked row thumbnails and the aggregate total qty/amount surface.
  - Added compact moulding row thumbnails with the same Cloudinary path resolution pattern used by mobile workflow components, plus a total qty/amount summary card above the rows.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited moulding editor TSX passed a scoped Bun build check with React Native internals externalized, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile House Package Tool website-parity audit without marking the Brain-goal queue complete.
  - Found the website HPT panel exposes remaining priced size options for the active door, while mobile only reopened the full size configurator or added a blank manual row.
  - Exported `deriveDoorSizeCandidates` and `resolveDoorTierPricing` through the mobile-facing sales-form core barrel, added available-size chips to the mobile HPT editor, and wired those chips to create the same priced row metadata used by the website (`baseUnitPrice`, `doorSalesUnitPrice`, `sharedDoorSurcharge`, `priceMissing`).
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited HPT/mobile parent/shared barrel modules passed scoped Bun build checks with React Native internals externalized where needed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile moulding selection parity audit without marking the Brain-goal queue complete.
  - Found the mobile moulding component grid could toggle multiple selections, but unlike the website moulding popover it silently added new moulding rows at quantity `1` and only allowed quantity edits later in the line-item section.
  - Added selected-card quantity controls to the mobile moulding selection grid and routed changes through the shared `saveWorkflowMouldingSelectionWithQty` path so selection, stored moulding rows, and line totals remain synchronized.
  - Added focused shared coverage proving an already-selected moulding can update quantity without being deselected.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused moulding action tests passed, edited workflow selector TSX passed a scoped Bun build check with React Native internals externalized, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile shelf-items website-parity audit without marking the Brain-goal queue complete.
  - Found the mobile shelf row editor treated direct unit edits as custom prices but did not expose website-equivalent base/sales pricing context or a way to clear the custom override back to calculated sales pricing.
  - Added a shared `clearShelfRowCustomPrice` workflow helper with focused tests, exported shelf price helpers through the mobile-facing sales-form core barrel, and updated mobile shelf rows to show base/sales pricing plus a reset-to-sales action when a custom override is present.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused shelf row product tests passed, edited shared/mobile modules passed scoped Bun build checks with React Native internals externalized, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile customer-selection bootstrap audit without marking the Brain-goal queue complete.
  - Found the invoice form store still initialized and reset create-mode forms with the first mock customer, which could make a new invoice look customer-selected before the customer selector or bootstrap handoff completed.
  - Changed create/reset state to start with no selected customer while preserving explicit customer selection, selected-customer bootstrap hydration, recovery payloads, and saved-record hydration.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited invoice-form store passed a pure Bun transpile check; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile custom-component visibility parity audit without marking the Brain-goal queue complete.
  - Found a newly saved custom component could be selected into active-step metadata before the component query refetch made it part of the visible component list.
  - Added a focused helper that merges selected custom snapshots into the mobile component grid, preserving selected-custom-first display while keeping unselected custom components hidden.
  - Added focused helper coverage for selected custom snapshot insertion and duplicate avoidance.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused custom-component helper tests passed, edited custom/workflow TSX files passed a pure Bun TS/TSX transpile check, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile quote/invoice wording parity audit without marking the Brain-goal queue complete.
  - Found quote mode still showed invoice-only copy in the details editor and read-only details sheet (`Invoice date`, `invoice memo`).
  - Made those labels quote-aware while preserving invoice wording for order mode.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited details TSX files passed a pure Bun TSX transpile check and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile House Package Tool parity audit without marking the Brain-goal queue complete.
  - Compared the mobile HPT row editor to the website HPT panel and found mobile had add-on/custom price controls and totals but no direct unit-price edit field.
  - Added a compact Unit field to mobile HPT rows so unit price changes flow through the existing shared door-row patch/totals path.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited HPT editor TSX passed a pure Bun TSX transpile check and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile component-list UID cleanup without marking the Brain-goal queue complete.
  - Found workflow-root rows in the mobile item selector still used the component UID as the visible subtitle via the mapped `sku` field.
  - Changed item selector row rendering so workflow components show their category instead of UID text, while ordinary shelf/product rows continue to show SKU/category details.
  - Changed newly added workflow lines to use the component title for visible description/SKU copy while keeping `workflowComponentUid` as the identity field.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited item selector and mock-data TS/TSX files passed a pure Bun transpile check and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile shelf-items parity audit without marking the Brain-goal queue complete.
  - Found the mobile shelf helper supported global typed product search before category selection, but the line-card data loader only fetched category-scoped products, leaving the no-category search path without results.
  - Added a shelf product search query for typed mobile shelf searches, merged those rows with category-scoped and selected-product rows, and wired the loading state into the shelf editor.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited line-card TSX passed a pure Bun TSX transpile check, focused shelf option tests passed, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile sales dashboard invoice-entry parity audit without marking the Brain-goal queue complete.
  - Found the `New Invoice` Sales/Quote chooser still gated behind `auth.isAdmin` on the mobile sales dashboard, which made the requested dashboard entry unavailable to non-admin sales users.
  - Removed the admin gate from the `New Invoice` sheet card while leaving the separate dispatch FAB admin-only.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited dashboard TSX passed a pure Bun TSX transpile check and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile recent-customer parity audit without marking the Brain-goal queue complete.
  - Hardened the recent-customer API path used by the mobile invoice customer selector so it overfetches grouped quote/order customer references before hydrating customers, then slices back to the requested limit.
  - This prevents stale or missing customer references from under-filling the default 10-customer list while preserving sales-type-specific quote/order recency ordering.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: targeted recent-customer API regression tests passed and scoped `git diff --check` passed for the touched API files; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the dealership quote-to-order and dealer-program implementation pass.
  - Added a dealer-owned payment-link mutation and wired approved dealer orders to open checkout links from the orders table and the new order overview payment tab.
  - Replaced the placeholder dealership dashboard with dealer-scoped metrics for quotes, pending requests, orders, unpaid balance, paid revenue, dealer earnings, dealer-facing taxes, customers, and recent request/order activity.
  - Added a dealer order overview page with limited progress, payment status, payment-link generation, and dealer/customer print actions.
  - Hardened internal dealer-request approval so delivery/ship requests require reviewed delivery cost, the first approving rep is stamped as owner, delivery cost is persisted, and approval metadata is recorded.
  - Updated docs: `brain/features/dealership-quote-to-order-approval.md`, `brain/api/endpoints.md`, and `brain/progress.md`.
  - Validation: scoped diff audit and scoped `git diff --check` only; no browser test, dev server, broad typecheck, or build was run per request.

- Continued the dealership completion pass for payment emails, logo upload, and analytics.
  - Added checkout-token payment URLs to dealer approval emails so approved orders can be paid from the email as well as the dealer order page.
  - Added bounded image upload in dealer settings by reading image files as data URLs and allowing those values through the dealer settings schema; existing PDF image resolution already supports data URLs.
  - Mounted OpenPanel in the dealership app through `@gnd/events` and added a dealer progress tracker for dashboard, quote, order, customer, and settings navigation.
  - Updated docs: `brain/features/dealership-quote-to-order-approval.md`, `brain/api/endpoints.md`, and `brain/progress.md`.
  - Validation: scoped diff audit, scoped `git diff --check`, trailing-whitespace scan, and targeted symbol scans passed; no browser test, dev server, broad typecheck, or build was run per request.

- Continued the mobile workflow floating-action parity audit without marking the Brain-goal queue complete.
  - Found that the inline multi-select selected-count footer strip still registered through the screen-level floating host at `bottom: 0`, which could overlap the Save Draft/Create footer after the floating-action host hardening.
  - Restricted that bottom-zero selected-count strip to overlay workflow selector mode only; inline door/moulding multi-select now keeps only the centered floating `Proceed` and custom actions in the footer-safe lane above the invoice footer.
  - Updated docs: `brain/progress.md`.
  - Validation: edited workflow selector TSX passed a pure Bun TSX transpile check, focused custom-component/shelf/barrel/shared workflow tests passed, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile shelf-items parity audit without marking the Brain-goal queue complete.
  - Compared mobile shelf product picking against the website inline shelf editor and found mobile only showed product chips after a category path was selected, while the website product combobox also supports search-result driven selection.
  - Changed mobile shelf product option resolution so typed product search can show de-duped global results before a category is selected, while the unsearched default state remains category-guided.
  - Updated the shelf row UI copy and empty state so users can discover either path: select a category or search for a product.
  - Added focused mobile shelf coverage for global product search without a selected category.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: shelf helper tests passed, edited shelf TS/TSX files passed a pure Bun TSX transpile check, focused custom-component/shelf/barrel/shared workflow tests passed, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile custom-component selection parity audit without marking the Brain-goal queue complete.
  - Compared mobile final `Proceed` behavior against the website custom component flow and found mobile still upserted existing selected custom options even when the title/cost were unchanged.
  - Added pure helper coverage for custom option price-change detection and mapping an existing custom option into a selected workflow component with profile-adjusted sales price.
  - Changed the mobile custom sheet so an unchanged existing custom option selects and advances immediately without a backend update, while title/cost changes and new custom entries still save/update through `inventories.upsertDykeCustomStepComponent`.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: custom-component helper tests passed, edited custom-component TSX/TS files passed a pure Bun TSX transpile check, focused custom-component/shelf/barrel/shared workflow tests passed, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile floating-action parity audit without marking the Brain-goal queue complete.
  - Reworked the shared mobile invoice floating-action helper around a local screen-level host in the invoice form shell, so the invoice item FAB, custom button, and multi-select proceed actions render outside the scroll view and stay footer-safe on both iOS and Android.
  - Tightened floating-action registration to track only supported view props and a stable refresh key, avoiding host state churn from unstable rest-prop/children objects while preserving the existing caller API used by the item FAB, custom button, and proceed actions.
  - Added workflow-state refresh keys to dynamic floating workflow controls so multi-select `Proceed`, overlay selected-count actions, and custom action offsets refresh their handlers when the active line, active step, selected count, visible components, or custom-capable step changes.
  - Added shared centered stack offsets for the invoice floating lane: base workflow action above the footer, item switcher FAB on the second level, and custom action on the third level when a multi-select `Proceed` button is also visible, keeping all three aligned on the same x-axis without overlap.
  - Raised inline workflow floating offsets to the same footer-safe lane used by the item FAB, keeping custom/proceed controls above the Save Draft/Create footer in the inline invoice form.
  - Removed the unused House Package Tool door-group UID subtitle field so UID text cannot leak back into mobile component-list surfaces through that helper.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: edited invoice-form TSX files passed a pure Bun TSX transpile check, focused custom-component, shelf, barrel, and shared workflow tests passed, and scoped `git diff --check` passed; direct runtime import was not useful because React Native's package entry contains Flow syntax for Bun. No dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile custom-component sheet parity audit without marking the Brain-goal queue complete.
  - Audited the shared mobile `Modal` primitive and found that it always presents at snap index `0`, so the custom sheet's previous dynamic single-snap `["100%"] -> ["42%"]` mode switch did not explicitly drive the requested fullscreen-to-compressed morph.
  - Changed the custom component sheet to use stable snap points `["42%", "100%"]`, explicitly snap to fullscreen on open, and explicitly snap down to compressed `Title & Cost` when search/title selection proceeds.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused custom-component, shelf, barrel, and shared workflow tests plus scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile sales-form shared-export audit without marking the Brain-goal queue complete.
  - Audited all mobile invoice-form imports from `@gnd/sales/sales-form-core` against the actual package entrypoint and found one remaining missing mobile-critical export: `swapWorkflowDoorComponent`, used by the HPT active-door swap flow.
  - Exported `swapWorkflowDoorComponent` through `sales-form-core` and added a small barrel smoke test covering the mobile shelf traversal and HPT door swap helpers.
  - Re-ran the mobile import/export audit and confirmed 101 imported symbols across 22 mobile invoice-form files now have matching `sales-form-core` exports.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused barrel, shelf, custom-component, and shared workflow tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile shelf-items parity audit without marking the Brain-goal queue complete.
  - Extracted mobile shelf product bucketing, category scoping, search filtering, de-duping, and the 20-item visible cap into a pure helper so the shelf editor remains presentation-focused.
  - Added focused Expo Bun coverage for category-scoped capped rendering, duplicate product removal across parent/leaf buckets, and search filtering.
  - Fixed the shared `@gnd/sales/sales-form-core` export surface so mobile's shelf category helpers resolve through the package entrypoint at runtime.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused shelf helper and mobile workflow/custom tests passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile custom-component parity audit without marking the Brain-goal queue complete.
  - Aligned mobile custom-capable step detection with website/shared workflow semantics by recognizing `activeStep.custom === true` selected-step snapshots in addition to form-step and route-step metadata.
  - Kept the detection in the pure custom-component helper module and added focused coverage for all supported metadata shapes.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused custom-component helper tests and the mobile workflow/custom pack passed; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile foundation/customer-flow parity audit without marking the Brain-goal queue complete.
  - Changed `newSalesForm.searchCustomers` recent mode to group sales documents by customer for the selected `order`/`quote` type and order customers by their latest matching sales document timestamp, so repeated recent records for one customer no longer under-fill the requested 10 unique recent customers.
  - Added focused API coverage proving type-filtered recent customer search returns 10 unique quote customers even when one customer owns the newest repeated quote records.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`; no API contract doc update was needed because the existing `recent/type/limit` contract is unchanged.
  - Validation: the targeted recent-customer regression passed; the broader `new-sales-form.test.ts` file still has two unrelated tax-summary assertion failures in existing tests, so this slice relies on the focused regression plus the mobile workflow/custom test pack.

- Continued the mobile custom-component parity audit without marking the Brain-goal queue complete.
  - Extracted mobile custom-component option filtering/pricing into a pure helper module so sheet UI stays focused on presentation/state and option semantics can be tested without importing React Native UI.
  - Aligned mobile custom-component search/result cost resolution with website semantics by preferring the stored custom pricing row before falling back to component base/sales prices.
  - Added focused Expo Bun coverage for stored custom pricing preference, dependency pricing identity, and archived custom filtering.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused custom-component and shared workflow tests plus scoped `git diff --check` were run; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile sales invoice/quote parity audit without marking the Brain-goal queue complete.
  - Changed the mobile sales dashboard `New Invoice` Sales/Quote chooser from a hard-coded `super admin` role-name gate to the existing `auth.isAdmin` sales-stack convention, matching the protected mobile sales route and making the requested dashboard action available to mobile sales admins.
  - Hardened moulding grouped-row edit hydration so existing `line.meta.mouldingRows` identity fields such as `salesItemId`, `hptId`, `groupUid`, and `primaryGroupItem` survive the shared derivation step before mobile row edits are re-persisted.
  - Added focused shared workflow coverage for moulding identity preservation.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused shared workflow tests and scoped `git diff --check` were run; no dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile sales invoice/quote parity work directly in the main workspace without the Brain goal queue.
  - Added the mobile dashboard Sales/Quote chooser for `New Invoice`, preserved selected `order`/`quote` type through the customer selector, and changed mobile customer recents to request 10 type-aware customers.
  - Made customer/item helper text and item actions quote-aware, passing route type directly to the customer selector/list so quote flows do not flash invoice-only wording or query the wrong recent-customer type in those surfaces.
  - Passed the selected customer id into create-mode bootstrap after the customer selector handoff so bootstrap hydration stays scoped to the chosen customer.
  - Removed visible UID subtitles/fallback labels from workflow component cards and added a shared `FloatingInvoiceAction` helper for footer-safe centered actions.
  - Added a focused mobile custom-component sheet module with full-height search/create, explicit full-width fixed-bottom search proceed, compressed `Title & Cost`, dismiss reset, website-matched `inventories.upsertDykeCustomStepComponent` save/update metadata, workflow selection, advancement, and selected-custom-first ordering.
  - Hardened the mobile door-size `Next step` path by requiring at least one selected quantity and deferring route navigation until after the workflow callback runs.
  - Changed moulding component taps from a one-off quantity prompt to shared multi-select selection/removal, keeping detailed qty/add-on/custom price edits in the moulding row editor.
  - Added a centered floating `Proceed` action for selected door/moulding multi-select steps and kept it vertically separated from bottom footer actions and the custom-component FAB.
  - Moved the invoice item switcher FAB into the shared centered floating-action lane so it aligns with custom/proceed actions and stays above the Save Draft/Create footer.
  - Added mobile HPT active-door removal through the shared `removeWorkflowHptDoorOption` helper so selected door state and grouped door rows stay synchronized.
  - Added mobile HPT active-door swap using visible door-step candidates and the shared `swapWorkflowDoorComponent` helper; hardened that helper to keep `selectedProdUids` synchronized with the swapped component.
  - Wired mobile HPT active-door `Sizes` into the existing fullscreen door-size picker, including supplier-sensitive row derivation, and applied selected rows back through shared door-row patching.
  - Changed HPT `Add size` on active door groups to open the derived size picker, leaving manual blank-row add only as a fallback for manual groups.
  - Added mobile shelf category-path selection, category-scoped product loading, selected-product detail hydration, bounded product chip rendering, and full category metadata in shelf row patches.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused shared workflow tests passed for visible components, door actions, moulding actions, row patches, and selection actions; scoped static scans and `git diff --check` passed. No dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile sales invoice/quote parity audit without the Brain goal queue.
  - Re-read the five mobile sales parity plan contracts and current mobile invoice feature notes, then audited the current code paths for customer type flow, custom components, door/HPT, moulding, shelf items, component subtitles, and floating actions.
  - Fixed mobile HPT active-door removal so it passes the current workflow route data into `removeWorkflowHptDoorOption`; remaining door rows now preserve route-config-sensitive no-handle/swing normalization instead of recalculating through a null route context.
  - Added a focused workflow-door regression test covering HPT door removal under a no-handle/no-swing route config.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused shared workflow tests passed for visible components, door actions, moulding actions, row patches, and selection actions; scoped `git diff --check` passed for the touched code/test files. No dev server, broad typecheck/build, or UI automation was run per request.

- Continued the mobile custom-component parity audit without the Brain goal queue.
  - Compared mobile custom-component save/select behavior with the website new-sales-form custom component path.
  - Exported the shared `profileAdjustedSalesPrice` helper through `@gnd/sales/sales-form-core` and changed the mobile custom-component sheet so selected custom components use the entered cost as base price and derive the selected sales price from the active customer profile coefficient before workflow selection.
  - Added focused shared workflow-format coverage for profile-adjusted sales price derivation.
  - Updated docs: `brain/features/mobile-invoice-form.md` and `brain/progress.md`.
  - Validation: focused shared workflow tests passed for workflow format, visible components, door actions, moulding actions, row patches, and selection actions; scoped `git diff --check` passed for the touched code/test/Brain files. No dev server, broad typecheck/build, or UI automation was run per request.

- Fixed a legacy sales-form custom component price-selection regression.
  - Updated `apps/www/src/components/forms/sales-form/custom-component.tsx` so editing the cost price of an existing custom component and pressing `Proceed` selects the component with the submitted price immediately, then refreshes the component list afterward.
  - Follow-up: kept the custom component input as cost/base price and derived sales price through the active sales profile multiplier in both legacy and new sales-form custom selection paths; legacy flat-rate custom totals now use the derived sales price instead of the cost value.
  - Updated `brain/features/inventory-backed-sales-fulfillment.md` with the behavior note.
  - Validation: scoped `git diff --check` passed for the touched sales-form and Brain files; no build, broad typecheck, browser QA, or dev server was run.

- Created a Brain-goal intake for mobile sales invoice/quote website parity and split it into five approved, handoff-sized plans instead of one monolithic implementation packet.
  - Added `brain/intake/2026-06-18-mobile-sales-form-website-parity.md`.
  - Added approved plans for foundation/customer flow, custom component parity, door size/HPT parity, moulding parity, and shelf items parity under `brain/plans/`.
  - Added matching backlog entries in `brain/tasks/backlog.md`.
  - Converted the approved plans into ready handoffs under `brain/handoffs/ready/` and moved the matching tasks to `brain/tasks/in-progress.md`.
  - Created five global Brain Loop queue items under `~/.brain-loop/queues/handoffs/`, enabled the GND project in the Brain Loop registry, created five requested task worktrees under `~/.brain-loop/worktrees/gnd/`, and synced the new Brain planning/handoff files into each worktree so implementation agents can read their contracts.
  - No app code was changed in this planning/handoff slice; implementation remains queued for the five review units.

- Moved local database workflow from XAMPP to Docker MySQL.
  - Updated `.env.local` to use `mysql://root@127.0.0.1:3307/gnd-prisma2` and changed local validation/audit script fallback database URLs to port `3307`.
  - Hardened `scripts/mysql-xampp-to-docker.sh` so it prefers XAMPP's bundled `mysqldump`, forces TCP for the source dump, and drops/recreates the Docker target database before import.
  - Started XAMPP MySQL through the macOS admin prompt, dumped `gnd-prisma2` from XAMPP on `3306`, and reset/imported Docker MySQL on `3307`.
  - Confirmed Docker MySQL, Adminer, and Redis are running through `apps/www/docker-compose.yml`; existing root dev scripts already run Docker MySQL/Redis via `dev:prepare -> dev:services`.
  - Validation: `prisma migrate dev` reached Docker MySQL but stopped on drift because it would require `migrate reset` and discard the cloned data; `prisma migrate status` and `prisma migrate deploy` were run with Node 22 and reported 100 migrations with no pending migrations.

- Continued the `apps/www` unused/old-code cleanup with a ninety-sixth package-dependency slice.
  - Removed 15 high-confidence stale `@gnd/www` package declarations: `@actions/core`, `@actions/github`, Cloudinary React helpers, MDX/MDX editor packages, `next-cloudinary`, `next-mdx-remote`, accidental `crypto`/`i`/`npm` package dependencies, `resend`, and `@types/mdx`.
  - Refreshed `bun.lock` with `bun install --lockfile-only`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: exact import/config scans found no live `apps/www` use of the removed packages; refreshed full Knip reports 39 runtime dependency candidates, 3 dev dependency candidates, and the same 20 retained file candidates. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a ninety-fifth conservative classification pass.
  - Confirmed the remaining 20 file-only Knip candidates split into 16 tests, 3 production-control files read by `production-control-reset.test.ts`, and 1 shadcn tooling stylesheet referenced by `apps/www/src/components.json`.
  - No source files were deleted in this pass because the remaining non-test candidates are test-backed or tooling-backed rather than high-confidence dead runtime code.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted classification scans and the slice104 Knip snapshot support the retained-tail decision. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a ninety-fourth conservative slice.
  - Deleted 8 more high-confidence stale tracked files: the rootless legacy Dyke form compatibility island spanning app-side legacy hooks/contexts, app-deps step action/helper/modal files, and the private app-deps step-products type barrel.
  - Confirmed no live provider/caller imports existed outside that deleted island; retained separate current `zus-step-helper` imports used by the active sales form.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted legacy Dyke form chain; refreshed Knip file-candidate count is 20, down from 653 at audit start and 28 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a ninety-third conservative slice.
  - Deleted 2 more high-confidence stale tracked files: detached `resolve-payment-issue.ts` and its private `delete-payroll.ts` helper.
  - Confirmed production-control files remain because `production-control-reset.test.ts` reads them directly, and no broad payment/production cleanup was attempted.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted payment-resolution action island; refreshed Knip file-candidate count is 28, down from 653 at audit start and 30 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with ninety-first and ninety-second conservative slices.
  - Deleted 5 more high-confidence stale tracked files: the detached customer data component/action/cache island and duplicate app-deps sales-form hook type-source files.
  - Switched `legacy-dyke-form-helper.tsx` to import `IDykeComponentStore` and `LegacyDykeFormItemType` from the live app-side hook files before deleting the duplicate app-deps copies.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the customer data island or old app-deps hook paths; refreshed Knip file-candidate count is 30, down from 653 at audit start and 35 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with eighty-eighth through ninetieth conservative slices.
  - Deleted 10 more high-confidence stale tracked files: orphan app-deps `doors-modal` plus its private product image helper, duplicate app-deps step/pricing use-case and data-access copies, empty `hpt-helper`, and detached hook/context leaves (`use-sales-book-form`, `use-zus-form-hook`, `_utils/context`).
  - Confirmed live app-side step/pricing use-cases, step-products type barrel, `legacy-dyke-form-helper`, `data-store`, `legacy-hooks`, and `component-deps-modal` chains remain intact.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted door/product helper, duplicate use-case/data-access paths, or hook/context symbols; refreshed Knip file-candidate count is 35, down from 653 at audit start and 45 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eighty-seventh conservative slice.
  - Deleted 4 more high-confidence stale tracked files: the orphan `step-component-modal` wrapper/hook pair plus follow-on orphan helpers `components/(clean-code)/search.tsx` and `_v2/components/common/render-form.tsx`.
  - Confirmed live `component-deps-modal` remains opened by the step helper, and step-products type/image helpers remain imported by legacy sales-form code.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for deleted wrapper/helper symbols or exact paths; refreshed Knip file-candidate count is 45, down from 653 at audit start and 49 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eighty-sixth conservative slice.
  - Deleted 4 more high-confidence stale tracked app-deps modal files: the orphan `deps-modal` action/index pair and incomplete `height-settings-modal` ctx/modal pair.
  - Confirmed the retained `component-deps-modal` step-component files are separate live code and were not touched.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for deleted modal symbols or exact folder paths; refreshed Knip file-candidate count is 49, down from 653 at audit start and 53 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eighty-fifth conservative slice.
  - Deleted 3 more high-confidence stale tracked app-deps sales-form UI leaves: `component-section-footer.tsx`, old `components-section/custom-component.tsx`, and `data-page/line-input.tsx`.
  - Confirmed similarly named `custom-component.action.tsx` and shared `_components/line-input.tsx` remain live and were not touched.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted UI leaves; refreshed Knip file-candidate count is 53, down from 653 at audit start and 56 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with eighty-third and eighty-fourth conservative slices.
  - Deleted 3 more high-confidence stale tracked files: the old app-local Dyke step-component action pair (`save-step-component.ts`, `update-component-pricing-action.ts`) and the unused app-deps duplicate legacy step hook.
  - Removed the now-unused `stepComponentSchema`, `updateComponentPricingSchema`, and `StepComponentMeta` import from `apps/www/src/actions/schema.ts`; the active Dyke component save/pricing path remains owned by `@gnd/inventory` through the inventories tRPC router.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted action paths, schema symbols, or app-deps duplicate hook path; refreshed Knip file-candidate count is 56, down from 653 at audit start and 59 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Fixed local jobs Trigger profile selection.
  - Updated `@gnd/jobs` dev script to pass `--profile redland` directly to `trigger dev`, so root `bun run jobs` no longer depends on the local dotenv `TRIGGER_PROFILE` value or Trigger CLI's current default profile.
  - Validation: scoped diff inspection only; no dev server, Trigger dev session, broad typecheck, build, or browser QA was run.

- Continued the `apps/www` unused/old-code cleanup with eighty-first and eighty-second conservative slices.
  - Deleted 8 more high-confidence stale tracked files: the orphan root dispatch `where.dispatch` utility plus the old app-local Trigger/email v3 chain (`lib/resend`, app-local email template/components, trigger constants/schema, and the no-op `send-composed-email` task).
  - Confirmed the live `send-composed-email` job is now owned by `@gnd/jobs` / `@gnd/email`, and current app code triggers the task id without importing the deleted app-local task files.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted dispatch utility or app-local Trigger/email paths; refreshed Knip file-candidate count is 59, down from 653 at audit start and 67 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eightieth conservative slice.
  - Deleted 5 more high-confidence stale tracked files: old app-deps v1 customer-wallet transaction/wallet helpers, settings helper, progress helper, and pagination action utility.
  - Confirmed remaining same-name wallet/settings/progress helpers are package-level or unrelated app-local implementations, not imports of the deleted app-deps files.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted utility helper paths or exported symbols; refreshed Knip file-candidate count is 67, down from 653 at audit start and 72 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-ninth conservative slice.
  - Deleted 4 more high-confidence stale tracked files: the old app-deps v1 sales customer/type island (`type.ts`, customer sales-order query, customer merge, and customer list helpers).
  - Confirmed no `app-deps/(v1)/(loggedIn)/sales` file candidates remain after this slice.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted customer/type paths or exported symbols; refreshed Knip file-candidate count is 72, down from 653 at audit start and 76 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-eighth conservative slice.
  - Deleted 10 more high-confidence stale tracked files: the old app-deps v1 logged-in sales action island for pickup, supplies, customer CRUD, inventory, component save, sales form, sales inventory, payment, priority, and save-PDF helpers.
  - Kept app-deps v1 customer/type files and wallet/settings helpers for separate exact-reference review rather than folding them into this deletion.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted v1 sales action paths or exported symbols; refreshed Knip file-candidate count is 76, down from 653 at audit start and 86 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-seventh conservative slice.
  - Deleted 5 more high-confidence stale tracked files: standalone app-local actions for old sale delete/restore plus date, delivery-cost, and labor-cost updates.
  - Kept similarly prefixed live actions (`delete-sales-assignment`, `delete-sales-assignment-submission`, and `delete-sales-extra-cost`) because active production/sales-form UI still imports them.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted standalone sales action paths; refreshed Knip file-candidate count is 86, down from 653 at audit start and 91 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-sixth conservative slice.
  - Deleted 5 more high-confidence stale tracked files: the detached old sales delivery deletion action, its private app-local stat-delta helpers, and two unused customer profile/tax update action leaves.
  - Kept `sales-progress-fallback.ts` because `apps/www/src/actions/production-control-reset.test.ts` reads it directly, kept `get-sales-customer-data.ts` because the legacy sales form imports it, and kept payment resolution/payroll actions due to their internal dependency chain.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted action paths; refreshed Knip file-candidate count is 91, down from 653 at audit start and 96 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-fifth conservative slice.
  - Deleted 4 more high-confidence stale tracked files: detached app-side clean-code sales/production helper leaves for batch production, assignment lookup, sales item overview, and sales overview loading.
  - Kept `item-assign-action.ts` because `apps/www/src/actions/production-control-reset.test.ts` imports it directly, and kept legacy form hook candidates untouched.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted app-side helper paths or exported symbols; refreshed Knip file-candidate count is 96, down from 653 at audit start and 100 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-fourth conservative slice.
  - Deleted 2 more high-confidence stale tracked files: the detached app-side clean-code production list action and its app-side production utility helper.
  - Kept the current app-deps production list mirror because active infinite production API routes import that path, and kept all remaining production assignment actions/tests untouched.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`, `ai/plan.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted app-side production list paths; refreshed Knip file-candidate count is 100, down from 653 at audit start and 102 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-third conservative slice.
  - Deleted 8 more high-confidence stale tracked files: the orphan app-side clean-code sales-form utility, old v1 sales-inbound action leaves, and old v1 sales-payment action leaves.
  - Kept current inbound-management/payment flows and remaining live-adjacent sales payment/test files untouched; exact scans showed the deleted files had no live imports outside themselves.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted sales-form utility or v1 inbound/payment action paths and exported symbols; refreshed Knip file-candidate count is 102, down from 653 at audit start and 110 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-second conservative slice.
  - Deleted 13 more high-confidence stale tracked files: app-side clean-code Dyke custom-step helpers, sales use-case wrappers, and the customer/wallet data-access island.
  - Kept current app-deps mirrors, package-domain inventory/payment paths, customer infinite API, and live production assignment row untouched; exact scans showed the deleted app-side files had no live imports outside themselves.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted app-side clean-code helper paths or exported symbols; refreshed Knip file-candidate count is 110, down from 653 at audit start and 123 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventy-first conservative slice.
  - Deleted 3 more high-confidence stale tracked files: the detached clean-code production-worker data/use-case pair and orphan sales analytics data helper.
  - Kept current production routes, assignment flows, and dashboard/report code untouched; exact scans showed the deleted helpers had no live imports outside themselves.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted production-worker or analytics helper paths or exported symbols; refreshed Knip file-candidate count is 123, down from 653 at audit start and 126 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventieth conservative slice.
  - Deleted 2 more high-confidence stale tracked files: the detached clean-code tax data-access and sales-tax use-case pair.
  - Kept active `sales-tax.persistent.ts` because current sales-form data access still imports it; exact scans showed the deleted tax data/use-case pair had no live imports outside itself, and two stale commented `getTaxListUseCase` references were removed from legacy hook mirrors.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted tax data/use-case paths or exported symbols; refreshed Knip file-candidate count is 126, down from 653 at audit start and 128 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-ninth conservative slice.
  - Deleted 2 more high-confidence stale tracked files: the detached clean-code tax modal action and component pair.
  - Kept active sales tax persistence because current sales-form data access still imports it; exact scans showed the deleted modal pair had no live imports outside itself.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted tax modal paths or exported symbols; refreshed Knip file-candidate count is 128, down from 653 at audit start and 130 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-eighth conservative slice.
  - Deleted 7 more high-confidence stale tracked files: detached clean-code dispatch create/delete/list/overview action loaders and DTOs across the app and app-deps mirrors.
  - Kept current dispatch data-access, tRPC, and table paths; exact scans showed the deleted dispatch data-action island had no live imports outside itself.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted dispatch data-action paths or exported symbols; refreshed Knip file-candidate count is 130, down from 653 at audit start and 137 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-seventh conservative slice.
  - Deleted 1 more high-confidence stale tracked file: the orphan app-side clean-code `use-sticky` hook copy.
  - Kept the app-deps `use-sticky` hook because old components-section context still imports it; exact scans showed the deleted app copy had no live imports.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted app-side `use-sticky` path or exported symbols; refreshed Knip file-candidate count is 137, down from 653 at audit start and 138 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-sixth conservative slice.
  - Deleted 4 more high-confidence stale tracked files: unused clean-code sales sidebar/store hooks, detached `PagesTab`, and old `getSalesTabActionUseCase`.
  - Kept the current sales-book tab implementation in `components/sales-tabs.tsx`; exact scans showed no imports of the deleted clean-code helper files.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted clean-code sales UI helper paths or exported symbols; refreshed Knip file-candidate count is 138, down from 653 at audit start and 142 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-fifth conservative slice.
  - Deleted 4 more high-confidence stale tracked files: duplicated clean-code sales accounting and resolution-center search-param modules under both `app` and `app-deps`.
  - Kept the shared clean-code data-table search parser because current code still imports it; exact scans showed the deleted accounting search-param quartet had no live imports.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted accounting search-param paths or exported symbols; refreshed Knip file-candidate count is 142, down from 653 at audit start and 146 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-fourth conservative slice.
  - Deleted 2 more high-confidence stale tracked files: unused legacy v1 sales `update-payment-term.ts` and detached `update-sales-date.ts` action leaves.
  - Kept v1 sales `type.ts` because old customer query actions still import its filter types; nearby payment/inventory/customer actions remain for one-by-one review.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted v1 sales action paths or exported symbols; refreshed Knip file-candidate count is 146, down from 653 at audit start and 148 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-third conservative slice.
  - Deleted 8 more high-confidence stale tracked files: the unused `SalesPaymentForm`, stale customer profile/tax prompt, old sales form email/labor/door-size leaves, and unused new-sales-form adapter hooks.
  - Removed the lone stale commented `<SalesPaymentForm />` call from the customer transactions tab while leaving transaction loading/rendering untouched.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted sales form/payment UI paths or exported symbols; refreshed Knip file-candidate count is 148, down from 653 at audit start and 156 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-second conservative slice.
  - Deleted 8 more high-confidence stale tracked files: unused legacy dispatch completion/sweeper leaves plus old packing driver/order cards and packing item list/form/listing components.
  - Kept the current `tables-2/sales-dispatch` controls and live `dispatch-packing-overview` progress usage; `PackingProgress` remains imported by active UI and was not touched.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted dispatch/packing component paths or exported symbols; refreshed Knip file-candidate count is 156, down from 653 at audit start and 164 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixty-first conservative slice.
  - Deleted 5 more high-confidence stale tracked files: the unused legacy `DispatchActions` wrapper plus its cancel, clear-packing, delete, and queue confirmation dialogs.
  - Kept the current `tables-2/sales-dispatch` actions cell and shared `DispatchCompletionDecisionModal`; exact scans showed the deleted dialog island had no live imports.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted dispatch action/dialog paths or exported symbols; refreshed Knip file-candidate count is 164, down from 653 at audit start and 169 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixtieth conservative slice.
  - Deleted 3 more high-confidence stale tracked files: the unused `SalesOptionMarkAs` menu leaf plus detached `OrderProductionGateCard` and its now-internal production-gate helper.
  - Kept current production dashboard/workspace routes; exact scans showed the production-gate helper was only imported by the deleted card.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted sales/production UI island paths or exported symbols; refreshed Knip file-candidate count is 169, down from 653 at audit start and 172 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with fifty-eighth and fifty-ninth conservative slices.
  - Deleted 3 more high-confidence stale tracked files: the no-op `getSalesProductionQueryTabs` action plus old `PrintSales` and standalone `sales-menu-print` wrappers.
  - Kept live dispatch query helpers, current `print-sales-v2` viewer, and the current `sales-menu.tsx` internal print action.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted action/print-wrapper paths or exported symbols; refreshed Knip file-candidate count is 172, down from 653 at audit start and 175 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifty-seventh conservative slice.
  - Deleted 2 more high-confidence stale tracked lib files: the unused `DataPageContext`/`useDataPage` helper and obsolete `@/lib/modal` dispatcher wrapper.
  - Kept active modal providers/utilities and the current order production gate helper; matching `openModal` text belongs to other live modal systems, not the deleted wrapper.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted lib paths or exported symbols; refreshed Knip file-candidate count is 175, down from 653 at audit start and 177 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifty-sixth conservative slice.
  - Deleted 2 more high-confidence stale tracked files: the unused clean-code `Kbd` atom and obsolete client-side `isProdClient` helper.
  - Removed only an inactive commented refund menu block from the resolution-center component; runtime resolution actions were not changed.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for `Kbd`, `kbdVariants`, `isProdClient`, or `@/lib/is-prod`; refreshed Knip file-candidate count is 177, down from 653 at audit start and 179 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifty-fifth conservative slice.
  - Deleted 6 more high-confidence stale tracked component files: unused sales invoice due-status display, old order header/search/export wrappers, old sales production header wrapper, and old task production tabs component.
  - Kept current production search filters and current sales tables; remaining `sales-order-search-filter` text is a task-event filter-system id, not an import of the deleted wrapper.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted component paths or exported symbols; refreshed Knip file-candidate count is 179, down from 653 at audit start and 185 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifty-fourth conservative slice.
  - Deleted 4 more high-confidence stale tracked utility/type files: unused compact-number formatter, generated id helper, old customer-service work-order types, and duplicated data-table type helpers.
  - Kept live Trigger email `lib/resend.ts`; also left payment-adjacent `lib/is-prod.ts` for later review because a current file still contains a commented refund block referencing its symbol.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted utility/type paths or exported symbols; refreshed Knip file-candidate count is 185, down from 653 at audit start and 189 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with fifty-second and fifty-third conservative slices.
  - Deleted 4 more high-confidence stale tracked component files: old placeholder sales-rep recent-quotes/recent-sales/chart UI leaves and the orphan `CommunityTemplateActions` wrapper.
  - Removed a stale commented `<RecentSales />` call from the active sales-rep page; current sales-rep data tables and community-template form header controls were retained.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted component paths or symbols; refreshed Knip file-candidate count is 189, down from 653 at audit start and 193 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifty-first conservative slice.
  - Deleted 3 more high-confidence stale tracked app-deps v1 HRM employee action files: old soft-delete, employee-list cache, create/save, and password-reset server actions.
  - Kept current HRM tRPC/table flows; matching `resetEmployeePassword` text is a current tRPC mutation option, not an import of the deleted old server action.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted HRM employee action paths; refreshed Knip file-candidate count is 193, down from 653 at audit start and 196 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fiftieth conservative slice.
  - Deleted 3 more high-confidence stale tracked app-deps v1 customer-service action files: old assign-tech, CRUD, and status-update server actions.
  - Kept current customer-service tRPC/table flows; matching `updateWorkOrderStatus` text is a current tRPC mutation option, not an import of the deleted old server action.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted customer-service action paths; refreshed Knip file-candidate count is 196, down from 653 at audit start and 199 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-ninth conservative slice.
  - Deleted 5 more high-confidence stale tracked app-deps v1 files: old community-invoice task delete/update actions and old HRM job worker-change/approval, make-payment, and payment-delete actions.
  - Kept current payment UI mutations and tRPC job/payment flows; matching `makePayment` text is local current UI state, not an import of the deleted old HRM action.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted community-invoice and HRM job/payment action paths; refreshed Knip file-candidate count is 199, down from 653 at audit start and 204 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-eighth conservative slice.
  - Deleted 9 more high-confidence stale tracked app-deps v1 files: old home-template query helper, task-name loader, activate-production action, community-model-cost action, home query action, install-cost action, community job assignment action, community production query action, and HRM delete-job bridge.
  - Kept current tRPC community/job routes and current `/community/install-costs` navigation; matching text hits are route/API names, not imports of the deleted app-deps files.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted community/HRM action paths; refreshed Knip file-candidate count is 204, down from 653 at audit start and 213 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-seventh conservative slice.
  - Deleted 9 more high-confidence stale tracked files: the old app-deps community model-form compatibility island, its now-internal `_v1` import/base sheet helpers, `_v1/page-header.tsx`, common data-table `table-cells.tsx`, and the `_template-import.ts` search action.
  - Removed the stale `#unitModelForm` rule from `styles/globals.css` because the only component emitting that id was deleted.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live references for the deleted model-form/sheet/helper paths or `#unitModelForm`; refreshed Knip file-candidate count is 213, down from 653 at audit start and 222 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

## 2026-06-17

- Continued the `apps/www` unused/old-code cleanup with a forty-sixth conservative slice.
  - Deleted 5 more high-confidence stale tracked app-deps v1 community action files: old unit-template link resolver, invoice sync helper, model-search updater, install-cost action wrapper, and one-off lot/block backfill helper.
  - Kept still-live community helpers such as `_template-import.ts` and `_task-names.ts`, plus current production/model-cost helpers, because exact imports still reference nearby compatibility code.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted community helper paths; refreshed Knip file-candidate count is 222, down from 653 at audit start and 227 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-fifth conservative slice.
  - Deleted 4 more high-confidence stale tracked app-deps v1 action files: the old customer conflict merge fixer, community pivot bootstrap helper, home-template suggestion loader, and static home-model reader.
  - Kept still-live community helpers such as `_template-import.ts` because the `_v1` import model-template sheet still imports them.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted one-off app-deps action paths; refreshed Knip file-candidate count is 227, down from 653 at audit start and 231 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-fourth conservative slice.
  - Deleted 2 more high-confidence stale tracked support files: orphan `_v1/info.tsx` and unused common data-table pagination.
  - Kept `_v1/page-header.tsx` and `common/data-table/table-cells.tsx` because exact model-form/version-history imports still reference them.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted info/pagination paths; refreshed Knip file-candidate count is 231, down from 653 at audit start and 233 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-third conservative slice.
  - Deleted 11 more high-confidence stale tracked files: orphan `_v1` putaway/community/status/payment/work-order helpers and the old `_v1` install-cost form.
  - Kept `_v1/sheets/base-sheet.tsx` and `_v1/sheets/import-model-template-sheet.tsx` because the old model-form compatibility path still imports them.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for deleted `_v1` helper paths; refreshed Knip file-candidate count is 233, down from 653 at audit start and 244 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-second conservative slice.
  - Deleted 15 more high-confidence stale tracked files: the orphan clean-code data-table shell/filter-command/infinity helpers and styles, unused common data-table column wrappers, and unused app-deps data-table context/cell wrappers.
  - Kept live clean-code data-table support (`search-params`, `table-cells`, `Dl`, compose/header helpers), common pagination/table-cells, and `_v1/data-table/data-table-row-actions.tsx` because exact scans showed current imports.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for deleted clean-code/common/app-deps data-table support paths; refreshed Knip file-candidate count is 244, down from 653 at audit start and 259 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a forty-first conservative slice.
  - Deleted 16 more high-confidence stale tracked files: the old app-deps community-template table shell, its app-deps install-cost modal, `_v1` builder/projects filters, `_v1` install/model cost cells, `_v1` base modal, and old `_v1` data-table helper files.
  - Kept similarly named current implementations under `components/tables-2/community-templates`, `components/modals/model-install-cost-modal`, and `components/forms/community-template-v1`, and kept `_v1/data-table/data-table-row-actions.tsx` because sales-form/table-cell imports still use it.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for deleted table-shell, modal, filter, cell, base-modal, or data-table-helper paths; refreshed Knip file-candidate count is 259, down from 653 at audit start and 275 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with thirty-eighth through fortieth conservative slices.
  - Deleted 22 more high-confidence stale tracked files: 11 orphan `_v1` table-shell files, follow-on orphan employee/roles/task filters, the verify-task-jobs modal, and the old `_v1/print` base/home/order print island.
  - Kept `builder-filter.tsx`, `projects-filter.tsx`, and `lib/data-page-context.ts` because current app-deps/model/work-order imports still reference them; modal-name strings in store typing were left for later type cleanup.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for deleted shell, filter, modal, or print paths; refreshed Knip file-candidate count is 275, down from 653 at audit start and 297 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with thirty-fifth through thirty-seventh conservative slices.
  - Deleted 9 more high-confidence stale tracked files: the self-contained `_v1` tab-layout island, three unmounted `_v1` modal wrappers for activate-production/assign-task/edit-invoice flows, and orphan lib leaves `chunker.ts`/`navs.ts`.
  - Kept `_v1/modals/base-modal.tsx` because current model-install-cost and verify-task modal code still imports it, kept Trigger email support files because the live Trigger task imports them, and left legacy modal-name openers for later shell-level review.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted tab-layout, modal-wrapper, or lib paths; refreshed Knip file-candidate count is 297, down from 653 at audit start and 306 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with thirty-third and thirty-fourth conservative slices.
  - Deleted 5 more high-confidence stale tracked files: orphan `community-summary-widgets`, the empty root `inventory-category-form.tsx`, unreferenced `styles/sales.css`, and the self-contained clean-code export `config.ts`/`type.ts` pair.
  - Kept `hooks/use-id.ts`, app-deps `_actions/progress.ts`, app-deps `_actions/settings.ts`, the inventory-category form subfolder, and `styles/globals.css` because exact scans showed live imports or tooling references.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted support/export leaves; refreshed Knip file-candidate count is 306, down from 653 at audit start and 311 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with thirty-first and thirty-second conservative slices.
  - Deleted 15 more high-confidence stale tracked files: unused root/demo UI leaves, old root auth/shell helpers, and orphan `_v1` atom components.
  - Removed stale commented `CancelSalesTransactionAction` and `ResetInventories` call sites while preserving current `ProductionWorkerDashboardV2`, `_v1/page-header`, `_v1/info`, clean-code `Kbd`, and clean-code `Search` because exact scans showed live imports.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live imports for the deleted root and `_v1` leaves; refreshed Knip file-candidate count is 311, down from 653 at audit start and 326 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with twenty-ninth and thirtieth conservative slices.
  - Deleted 12 more high-confidence stale tracked files: orphan community dashboard/summary/search UI leaves, the old install-cost sidebar, empty model-template header helpers, and unused community model/project/work-order opener buttons.
  - Removed a stale commented legacy block from the current community-template page because it referenced the deleted install-cost sidebar.
  - Kept `CommunityTemplateActions` because the legacy model-form compatibility path still imports it, and kept the current install-cost resizable panel/portal id because it is still used by active form UI.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted community/root opener leaves; refreshed Knip file-candidate count is 326, down from 653 at audit start and 338 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with twenty-seventh and twenty-eighth conservative slices.
  - Deleted 7 more high-confidence stale tracked files: the old contractor v1 jobs table/sheet island and four unused root component helper leaves (`AnimateReveal`, `GridSkeleton`, `IconButton`, and `LineInfo`).
  - Kept noisier or live-adjacent root components such as `Shell`, `LoginForm`, and `SummaryCardLink`, plus sensitive sales/production actions and active compatibility helpers that still need one-by-one review.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted contractor jobs and root component leaves; refreshed Knip file-candidate count is 338, down from 653 at audit start and 345 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with twenty-fourth through twenty-sixth conservative slices.
  - Deleted 15 more high-confidence stale tracked files: the old clean-code `fikr-ui` shell island, unused customer/auth server-action leaves, and old customer-sales query actions plus their orphan revalidation tag helper.
  - Kept still-live common data-table/type helpers, model-form types/sections, dispatch production-control action fixture, step-component pricing/inventory actions, and customer-service/current sales-form customer data actions because exact scans showed live imports or higher migration risk.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted `fikr-ui`, server-action, and customer-sales query leaves; refreshed Knip file-candidate count is 345, down from 653 at audit start and 360 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with twenty-second and twenty-third conservative slices.
  - Deleted 6 more high-confidence stale tracked files: the unmounted `viewer-shell` provider/dialog/barrel, old clean-code `NumberPicker`, old `TableMenuTrigger`, and unused sales-overview v2 section helper components.
  - Kept the still-live `viewer-shell/controller.ts` and controller test because sales-print imports the controller directly, and kept nearby live sales-overview hooks/provider/route-entry plus current community summary widgets.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted viewer/dialog/input/menu/overview leaves; refreshed Knip file-candidate count is 360, down from 653 at audit start and 366 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a twenty-first conservative slice.
  - Deleted 6 more high-confidence stale tracked files: obsolete cached sales-payment-resolution filters, old recent-sales cache query, unused payment-portal column builder, unused client auth guard, unused old Midday search-filter component, and a mismatched resolution-center empty-state component.
  - Kept nearby live helpers including current Midday search-filter adapters/TRPC components, table/widget empty states, customer-address cache action, revalidation tag helper, and paginated customer action helper.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted UI/action leaves; refreshed Knip file-candidate count is 366, down from 653 at audit start and 372 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a twentieth conservative slice.
  - Deleted 7 more high-confidence stale tracked files: old module-local email send/attachment/transform helpers, the private PDF creation helper, the private Cloudinary wrapper, and the now-orphan module-local error reporter.
  - Kept the Trigger `send-composed-email` task and React email template because current app code still triggers that task id, and kept the separate live upload-signature Cloudinary helper used by `lib/upload-file.ts`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted module-local email/PDF/Cloudinary/error chain; refreshed Knip file-candidate count is 372, down from 653 at audit start and 379 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a nineteenth conservative slice.
  - Deleted 6 more high-confidence stale tracked files: duplicate app-deps clean-code export config/types, old punchout-cost loader, stale auto-complete persistence helper, stale app-deps email sender, and no-op Twilio SMS helper.
  - Kept the non-app-deps clean-code export mirror under `apps/www/src/app/(clean-code)/_common/export`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted app-deps utility/helper paths; refreshed Knip file-candidate count is 379, down from 653 at audit start and 385 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eighteenth conservative slice.
  - Deleted 7 more high-confidence stale tracked files: old customer-service list/create/update/project-unit actions and old HRM job creation/insurance/list/payment loader actions.
  - Kept nearby live v1 actions, including customer-service assignment/delete/status actions and HRM delete/approve/reject/payment actions that current `_v1` shells still import.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live path references for the deleted customer-service or HRM loader/action files; remaining `getJobs` and `getCustomerServices` hits are current tRPC route names, not imports of removed v1 files; refreshed Knip file-candidate count is 385, down from 653 at audit start and 392 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventeenth conservative slice.
  - Deleted 7 more high-confidence stale tracked files: unused v1 email-template actions, an empty community-invoice edit action, an unused old home-invoice query action, and unused v1 model-cost helper actions.
  - Kept nearby live v1 actions, including customer-wallet transactions, community invoice task delete/update actions, install-cost updates, and community-model-cost import/sync actions.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted v1 email, community-invoice query/edit, or model-cost helper paths; refreshed Knip file-candidate count is 392, down from 653 at audit start and 399 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a sixteenth conservative slice.
  - Deleted 15 more high-confidence stale tracked files: the unmounted dev-only sales `_backward-compat` repair menu island and its now-orphan `actions/--fix/fix-customer-tax-profiles.ts` server action.
  - Kept the neighboring `actions/--fix/fix-undefined-order-id.ts` because current edit-quote routing still imports it.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted `_backward-compat` paths, repair-menu symbols, or removed tax-profile fix action; refreshed Knip file-candidate count is 399, down from 653 at audit start and 414 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifteenth conservative slice.
  - Deleted 10 more high-confidence stale tracked files: old `_v1` home selection batch action, unmounted image/back-order/community-install-cost/model-cost modals, the legacy community-model-cost modal subfolder, and the unmounted sales supply sheet.
  - Kept nearby live replacements and false-positive-adjacent code, including the modern community model cost modals, clean-code image-gallery modal, `homes-selection-action.tsx`, active `_v1` modal/sheet bases, `import-model-template-sheet.tsx`, and `payment-overview-sheet.tsx`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted `_v1` home-selection/modal/sheet paths; refreshed Knip file-candidate count is 414, down from 653 at audit start and 424 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fourteenth conservative slice.
  - Deleted 6 more high-confidence stale tracked files: old `_v1` production action menu, breadcrumb portal/link helpers, task action dropdown, and unused delivery/sales batch action components.
  - Removed two stale commented breadcrumb imports from the community-template page and kept nearby live `_v1` files such as `putaway-actions.tsx`, `job-type.tsx`, filters, and `community-summary-widgets.tsx`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted `_v1` action/breadcrumb/task/batch files; refreshed Knip file-candidate count is 424, down from 653 at audit start and 430 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a thirteenth conservative slice.
  - Deleted 6 more high-confidence stale tracked files: old `_v2` dirty-form persistence and transform-option helpers, unmounted employee-management record approval/overview helpers, and self-only chart/toast utility files.
  - Kept nearby live false positives including `_v2/components/common/render-form.tsx`, `utils/db/where.dispatch.ts`, `lib/format.ts`, and `lib/chunker.ts` because current imports still prove them live.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted `_v2`, employee-management, chart, or toast utility files; refreshed Knip file-candidate count is 430, down from 653 at audit start and 436 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a twelfth conservative slice.
  - Deleted 8 more high-confidence stale tracked files: orphan inventory and invoice-summary stores, old notification-channel context, empty auth provider, starter `siteConfig`, duplicate users data-action, old export-config helper, and unused `sales.stats.ts` recalculation path.
  - Kept nearby live paths such as `apps/www/src/actions/get-users-list.ts`, current sales stat reset/update actions, global CSS, and still-imported `_v1` data-table/customer-service types.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted store/context/provider/config/data-action/data-access files; refreshed Knip file-candidate count is 436, down from 653 at audit start and 444 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eleventh conservative slice.
  - Deleted 9 more high-confidence stale tracked files: orphan app-local utility files for payment params, query checking, old sales-invoice printing, server data typing, type-to-Zod conversion, resumable uploads, plus stale dashboard/email/modal type files.
  - Removed two commented resumable-upload branches from upload components, while keeping live `@gnd/utils/sales` payment-param usage, the live sales-print service `printQuote`, and still-imported `_v1` customer-service/data-table types.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted app-local utility or type files; refreshed Knip file-candidate count is 444, down from 653 at audit start and 453 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a tenth conservative slice.
  - Deleted 22 more high-confidence stale tracked files: 13 orphan hook files plus 9 old lib utility leaves for watermark adjustment, session policy, community home-template building, composed refs, safe actions, email transform, option building, quick print, and token refresh.
  - Removed stale commented references from the task trigger and home printer while keeping nearby live helpers such as `lib/resend`, `modules/email/transform`, `modules/email/send`, `chunker`, `format`, `order-production-gate`, `data-page-context`, and `lib/is-prod.ts`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted hooks or utilities; the remaining `useStepComponents` hit is a live object property in the new-sales-form workflow adapter; refreshed Knip file-candidate count is 453, down from 653 at audit start and 475 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Fixed Expo login template 0 keyboard avoidance.
  - Replaced the template 0 `KeyboardAvoidingView` + `ScrollView` stack with the app's existing `react-native-keyboard-controller` `KeyboardAwareScrollView` pattern, preserving the login layout while letting focused email/password inputs scroll above the keyboard.
  - Kept the quick-login FAB outside the scroll content as an overlay and added bottom scroll padding/offset so the lower security note and controls remain reachable.
  - Validation: scoped `git diff --check -- apps/expo-app/src/components/login-template-0.tsx` passed. A focused `./node_modules/.bin/tsc -p apps/expo-app/tsconfig.json --noEmit` was attempted but stayed silent for about two minutes and was stopped; no diagnostics were emitted before stopping.

- Continued the `apps/www` unused/old-code cleanup with a sixth conservative slice.
  - Deleted 15 more high-confidence stale tracked files: unmounted sales-overview inline controls, orphan customer/account/unit-invoice/job modal components, an unused inventory-import table skeleton, legacy table helper leaf files, and the unreferenced sales-orders fulfillment completion modal.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live source references for the deleted files; refreshed Knip file-candidate count is 507, down from 653 at audit start and 522 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a seventh conservative slice.
  - Deleted 12 more high-confidence stale tracked files: the old notification-channel form island, unused site-action notification configuration actions, unmounted account/customer update actions, and the obsolete unit-invoice modal report hook/body while preserving the live print-based invoice-aging report path.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live references to the deleted paths or symbols; refreshed Knip file-candidate count is 495, down from 653 at audit start and 507 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with an eighth conservative slice.
  - Deleted 15 more high-confidence stale tracked files: old `app-deps` community project/unit table shells and add button, the unmounted take-off form island plus loader action, dead app-deps v2 contractor upload and sales edit utility files, stale customer-report CSS, and the old builder table/modal pair plus builder task sync actions that were only imported by that old modal.
  - Kept nearby live compatibility files, including `community/units/home-modal.tsx`, app-deps sales v2 step-product helpers, HRM job actions, and the builder `action.ts` module because current source imports still prove them live.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live references to the deleted paths or symbols; refreshed Knip file-candidate count is 480, down from 653 at audit start and 495 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a ninth conservative slice.
  - Deleted 12 more high-confidence stale tracked files: generated `page.md` implementation sketches for old route patterns, an empty community-template schema placeholder, a stale community-inventory sheet sketch, unreferenced cache helpers for dispatchers/customer profiles/page tabs/sales order numbers, and the obsolete sidemenu cookie server action.
  - Removed the stale commented customer-profile helper loader from the customer form and kept live nearby helpers such as `get-loggedin-profile`, `get-customer-address`, and current tRPC customer-profile loading.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans returned no live references to the deleted paths or symbols; refreshed Knip file-candidate count is 475, down from 653 at audit start and 480 after the previous cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Tightened sales-form custom component entry UX. The shared combobox now has an opt-in input normalizer, and the custom component picker uses it so only explicitly custom-marked components appear, search/create/select text is stored and displayed in uppercase, suggestions are sorted alphabetically, duplicate custom names keep unique option identity, and existing custom selection carries the option price into the selected step. The cost price field is compact, right-aligned, and shows `$0.00` when empty. The footer `Custom` action now uses the destructive button variant in both old and shared workflow panels, opens an anchored inline alert editor above the footer button without increasing footer height, persists selected custom metadata on the step/form, sends `meta.custom` on custom upsert, and pins a selected custom component first in the component list with a custom avatar and destructive border treatment. Validation: scoped `git diff --check` passed for tracked UI/Brain files, and a direct trailing-whitespace scan passed for the custom picker.

- Started cleanup from the `apps/www` unused/old-code audit.
  - Fixed active sidebar links for unit production and mobile app support, removed the no-route sales commission link, and made the edit-order sublink a meta matcher instead of a clickable invalid `/sales-book/edit-order` href.
  - Retargeted stale legacy community table/nav links from old `/settings/community/*`, `/community/units`, `/community/invoices`, and `/community/productions` URLs to current canonical community routes.
  - Deleted 42 high-confidence stale tracked files: copied middleware/image-loader, debug/sandbox/copy files, the 21 `app-deps` orphan `loading.tsx` route-convention files, the placeholder `/sales-book/home-page` route, isolated `app-deps/(v1)/_actions/upgrade/*` actions, and stale tracked Knip report artifacts.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/features/site-navigation.md`, `brain/engineering/www-routes.md`, `brain/progress.md`.
  - Validation: focused `bun test apps/www/src/components/sidebar-links.test.ts` passed with 6 tests and 30 expectations; active sidebar path-literal scan returned 0 missing paths; `find apps/www/src/app-deps -type f -name 'loading.tsx'` returned no files; no source references remain for `app-deps/(v1)/_actions/upgrade`; scoped `git diff --check -- apps/www brain` passed; refreshed Knip file-candidate count is 614, down from 653. No build, typecheck, browser QA, or dev server was run.

- Extended the `apps/www` unused/old-code cleanup.
  - Deleted another 43 high-confidence stale tracked files: inert `app-deps` root convention duplicates, unreferenced `app-deps` data-table wrappers, ignored community `_page.tsx` backup route, old dealer guest signup/password files, old `app-deps` sales settings components, unused MDX/Tiptap prototypes, login mockups, a demo outline table, an orphan sales-rep recent-sales widget, and the disabled transactions widget.
  - Removed the stale commented transactions widget reference from `apps/www/src/components/widgets/index.tsx`.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/engineering/www-routes.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans passed; focused `bun test apps/www/src/components/sidebar-links.test.ts` passed with 6 tests and 30 expectations; active sidebar route scan checked 67 hrefs and found 0 missing routes; `find apps/www/src/app-deps -type f -name 'loading.tsx'` returned no files; scoped `git diff --check -- apps/www brain` passed; refreshed Knip file-candidate count is 571, down from 653 at audit start and 614 after the first cleanup slice. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup.
  - Deleted 17 more high-confidence stale tracked files: the old `components/sales-view` mock UI, `components/forms/example-form`, `lib/dummy-inventory-data.ts`, the paired `data/old-site-jobs.ts` plus `app-deps/(v1)/_actions/hrm-jobs/restore-jobs.ts`, the unmounted `components/cmd` command palette, orphan `modules/error/handler.ts`, and unmounted inventory-stock/sales-pay widgets.
  - Removed the stale commented `<SalesPayWidget />` reference from the sales invoice column.
  - Kept `modules/error/report.ts` because a live import from `modules/pdf/create-pdf.ts` proves it is not safe to delete despite Knip flagging it.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans passed for the deleted names; refreshed Knip file-candidate count is 554, down from 653 at audit start and 571 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with another conservative slice.
  - Deleted 21 more high-confidence stale tracked files: unused common helpers, old validation schemas, stale `app-deps/(sidebar)` search-param helpers, old `_v2` email/contractor/tab helpers, and the duplicate unreferenced `src/app/_components/data-table` island.
  - Moved the tiny `EmailTypes` union into `apps/www/src/lib/modal.ts` so `openEmailComposer` keeps its local type without depending on the deleted `_v2/email/types.ts` file.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans passed for deleted paths; refreshed Knip file-candidate count is 533, down from 653 at audit start and 554 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Continued the `apps/www` unused/old-code cleanup with a fifth conservative slice.
  - Deleted 11 more high-confidence stale tracked files: unused `_v2` date/input/select controls, old static Dyke/home design data files, unused sales clone/invoice helper files, and the superseded v1 notification channel table/header.
  - Kept `_v2/components/common/render-form.tsx` and `lib/data-page-context.ts` despite Knip flags because source imports prove they are still live.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: targeted stale-reference scans passed for deleted paths; refreshed Knip file-candidate count is 522, down from 653 at audit start and 533 after the previous cleanup slice; scoped `git diff --check -- apps/www brain` passed. No build, broad typecheck, browser QA, or dev server was run.

- Analyzed unused and old code in `apps/www`.
  - Ran current Knip analysis for the `@gnd/www` workspace and grouped 653 unused-file candidates plus dependency/export findings into high-confidence cleanup, migration-review, route-link, and dependency categories.
  - Confirmed `apps/www/src/app-deps` is not globally removable because active code still imports legacy sales, auth, settings, and utility helpers from it, but its route-convention `loading.tsx` files, debug/sandbox files, and copied middleware/image-loader leftovers are strong cleanup candidates.
  - Identified current active sidebar route issues: `/tasks/unit-productions`, `/sales/commissions`, `/settings/mobile-app`, and the meta `/sales-book/edit-order` href.
  - Updated docs: `brain/reports/2026-06-17-www-unused-old-code-analysis.md`, `brain/progress.md`.
  - Validation: analysis-only; no app code changes, build, typecheck, browser QA, or dev server run.

- Fixed the Expo slice of `mobile-jobs` startup.
  - Replaced Expo package scripts that invoked the `expo` shim through Bun's package runner with a local `scripts/run-expo-cli.cjs` wrapper that resolves and executes `expo/bin/cli` through Node, avoiding the Bun auto-install/package-resolution path that was receiving `SIGKILL`.
  - Downgraded `expo-navigation-bar` from the Expo 56 preview line to the SDK 54 bundled range `~5.0.10`, and changed the login template system navigation-bar usage from the preview declarative component to the stable async API.
  - Validation: `bun install` completed and updated `bun.lock`; `bun run with-env node ./scripts/run-expo-cli.cjs --version` returned `54.0.25`; `bun run with-env node ./scripts/run-expo-cli.cjs config --type public` returned the public Expo config; `bun run with-env node ./scripts/run-expo-cli.cjs start --help` returned help without starting Metro; scoped `git diff --check` passed. Full `mobile-jobs` was not run per fast Bun monorepo command discipline.

- Reworked sales-form custom component selection and archiving.
  - Removed the legacy custom-component form from the component card grid and exposed it through a `Custom` button in the step floating footer when the step supports custom components.
  - The shared custom-component form now distinguishes selecting an existing component from updating its stored price: `Proceed` selects existing components or creates new ones, while `Update price` is shown only when an existing component's cost was edited.
  - Custom-component dropdown rows now reveal a delete action on hover with confirmation; deletion uses `inventories.archiveDykeCustomStepComponent`, storing `meta.deletedAt` so the component is hidden from future selection without breaking older sales, invoice editing, or print references.
  - Hardened `inventories.upsertDykeCustomStepComponent` so price/name updates preserve existing component metadata, including any future metadata flags.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for tracked touched code and Brain files; direct trailing-whitespace scan passed for the untracked shared combobox file. No build, typecheck, dev server, or browser validation was run per fast Bun monorepo command discipline.

- Added interactive duplicate-key recovery to local production database sync.
  - `packages/db` sync now detects raw MySQL duplicate-key write failures, runs the default `sync:prod-to-local` package script with `--on-duplicate prompt`, supports `--on-duplicate ignore|reset|cancel` overrides, and routes interactive conflicts through an arrow-key chooser with `[ignore]`, `[reset]`, or `[cancel]`.
  - `[reset]` deletes only the failed local table, clears that table cursor, retries the table once, and bypasses the default initial cursor floor so the reset table is fully reimported from source.
  - Updated docs: `brain/database/migrations.md`, `brain/progress.md`.
  - Validation: `bun test packages/db/src/local-sync.test.ts` passed with 21 tests and 41 assertions; `bun packages/db/scripts/sync-prod-to-local.ts --help` passed and showed the new `--on-duplicate` option.

- Added a visible hover state to sales production order summary triggers.
  - Production order cards now use a pointer cursor plus hover/focus background and subtle shadow on the clickable summary trigger area, and the collapsed header parent also tints on hover/focus without extending into the expanded overview.
  - Updated docs: `brain/features/sales-productions-v2.md`, `brain/progress.md`.
  - Validation: scoped class scan and `git diff --check` passed. No build, typecheck, browser, or dev-server validation was run per fast Bun monorepo command discipline.

- Normalized the sales productions v2 board and removed the old productions page implementation.
  - `/sales-book/productions` now preserves query params and redirects to `/sales-book/productions/v2` instead of mounting the legacy `ProductionWorkspace`.
  - Sales production nav/tab links now point directly to `/sales-book/productions/v2`.
  - The admin board title now reads `Production Board`, the metadata title no longer says v2, search/status/priority controls sit in a tighter row on wider screens, the calendar is labeled `Calendar`, and the compact date-picker copy plus Current Focus mini-card were removed so the queue snapshot has more room.
  - Updated docs: `brain/features/sales-productions-v2.md`, `brain/engineering/www-routes.md`, `brain/progress.md`.
  - Validation: scoped stale-label/link scan passed. No build, typecheck, browser, or dev-server validation was run per fast Bun monorepo command discipline.

- Removed the duplicate expanded-sidebar control-panel label and replaced the faint wordmark.
  - `packages/site-nav` now renders the supplied compact GND mark with optional explicit brand title/subtitle text, and no longer appends the separate "Workspace / Control Panel" text stack.
  - `apps/www` now passes visible `GND` / `Millwork Corp` text beside the compact mark for the expanded sidebar state instead of relying on the faint wide wordmark image.
  - Updated docs: `brain/features/site-navigation.md`, `brain/progress.md`.
  - Validation: `git diff --check` passed for the touched site-nav logo and Brain files. The focused `@gnd/site-nav` typecheck was attempted but stayed silent for about two minutes and was stopped.

- Updated the sales product report ordering.
  - `sales.getProductReport` now computes report rows first, sorts them by units sold descending, then applies the existing cursor/page size so `/product-report`, `/sales-book/top-selling-products`, table mode, and grid mode share the same default ranking.
  - Updated docs: `brain/features/sales-product-report-table.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for the product-report query and Brain docs. No build, typecheck, browser, or dev-server validation was run per fast Bun monorepo command discipline.

- Added a global web navigation loading bar.
  - Mounted `NavigationLoadingBar` from the root `apps/www` providers so the indicator appears on initial load and route-level navigation across the web app.
  - The bar starts for same-origin link clicks, form submits, and full document unloads, changes color as progress advances, finishes in light green, completes when App Router pathname/search state settles, and has an 8 second safety completion for cancelled/client-handled navigation attempts.
  - Updated docs: `brain/features/site-navigation.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for the touched provider, navigation-loading-bar, and Brain files. No build, typecheck, browser, or dev-server validation was run per fast Bun monorepo command discipline.

- Added a grid view to the sales product report table.
  - Extended shared `tables-2` table settings with a persisted `viewMode` preference, defaulting existing tables to `table`.
  - Added `components/tables-2/core/TableGrid` as the reusable scroll/grid shell for card-style views that still consume table-owned row data.
  - Wired the sales-statistics/product-report table to switch between the existing virtualized table and product metric cards backed by the same `sales.getProductReport` infinite query.
  - Added an icon-only grid/table toggle beside the product-report table settings button, with tooltip and `aria-pressed` state.
  - Updated docs: `brain/features/sales-product-report-table.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for the touched table settings, product-report header, tables-2 core/grid, sales-statistics, and Brain files. No build, typecheck, browser, or dev-server validation was run per fast Bun monorepo command discipline.

- Fixed the Expo app login dark-mode input inset, quick login, and template 2 system-bar behavior.
  - The active `LoginTemplate0` email and password inputs now force the nested `TextInput` background to transparent and use theme-owned cursor/selection colors, preventing Android dark mode from drawing a lighter native input rectangle inside the custom field container.
  - Added a 44px password reveal/hide button inside the password field using the shared `Eye` / `EyeOff` icons and accessible selected-state labels, and made the hidden password dots larger, heavier, and wider-spaced while leaving revealed text normally spaced.
  - Extracted the mobile quick-access behavior into a reusable `LoginQuickAccess` bottom-sheet employee login picker backed by the same `hrm.getEmployees({ size: 999 })` source used by the web quick-login; the sheet lists loginable employees, includes a search bar for name/role, fills the selected email into the existing sign-in form, and is now opened from an icon-only bottom-left floating FAB.
  - Updated `LoginTemplate1` / template 2's white-and-black design so the white top renders dark status-bar icons in both app color modes, the dark lower surface stays on a black system root background with light in-screen icons, and the system root background restores to the app theme when the screen unmounts.
  - Added `expo-navigation-bar` with contrast enforcement disabled and mounted a template-owned dark navigation bar style, so Android bottom navigation buttons stay light while template 2 is active.
  - Reworked template 2 keyboard handling around `KeyboardAwareScrollView` from `react-native-keyboard-controller`, preserving safe-area padding while allowing the login form and bottom actions to stay reachable above the keyboard.
  - Added an Expo `Icon` `theme` override prop so fixed-design surfaces can resolve token colors against a forced light/dark palette; template 2 now uses `theme="dark"` on its input icons so those icons stay stable regardless of the app color scheme.
  - Replaced the dev-only side template picker with a footer FAB that opens a bottom sheet listing the available login designs and switches the active sign-in template from that sheet.
  - Tightened the same login file's sign-in handler typing and fixed the neighboring `LoginTemplate1` `SafeArea` prop mismatch so the login route's template set has no focused TypeScript diagnostics.
  - Validation: `bunx prettier --write` completed for the login template and icon components, `git diff --check` passed for the touched Expo login/icon/config/package files and Brain progress note, and filtered Expo TypeScript checks reported no diagnostics for `app.config`, `login-quick-access`, `login-template-0`, `login-template-1`, `sign-in`, `input-2`, `expo-navigation-bar`, `components/ui/icon`, or the adjacent `components/ui/alert` `Icon as` usage. Biome passed before the final navigation-bar dependency/config edit, but local Biome hung afterward even on `biome --version`; the Expo config probe also started correctly but was stopped after producing no output for 75 seconds. Full Expo TypeScript remains blocked by existing app-wide/cross-workspace diagnostics outside this patch, including unresolved `@sales/*` aliases from `apps/api` and shared React type conflicts.

- Completed the desktop in-app browser inventory mutation matrix on `1440x900`.
  - Browser evidence passed for allocation approve/reject/bulk approval, dispatch assign/pack/fulfill/release, inbound receive, received-backorder release, partial ship, held-line skip, stock adjustment, and low-stock dashboard signal.
  - Added exact allocation id visibility/actions to dispatch mode so operator controls can target `Assign #id`, `Pack #id`, `Fulfill #id`, `Release #id` instead of mutating every allocation on a line.
  - Added receiving-line controls to `/inventory/inbounds` and fixed the default good quantity so controlled inbound receiving can be posted from the browser.
  - Repaired validation fixtures: `INV-FIX-ALLOC` has legacy sales-item delivery compatibility for dispatch fulfill, `INV-FIX-RECEIVED` has a positive stock row for received-backorder allocation, and `INV-FIX-PARTIAL` has per-line sales-item links for partial shipment delivery rows.
  - Final mutation snapshot showed inbound item `#1` completed with demand `#1` received `2`, received-backorder allocation `#17`, partial delivery `#4022`, held allocation `#6` still reserved, safe stock row `#2` moved `10 -> 12`, and low-stock variant `#2065` still at `0` against threshold `5`.
  - Inventory print route proof passed in the same desktop browser: production, order-packing, packing-slip, invoice, quote, backorder summary, and customer remaining summary cases each rendered a blob-backed PDF iframe. The print-data builder returned expected section titles and row counts for fixture sale ids `23027` and `23024`.
  - Mapped Dyke legacy-vs-inventory print parity passed for order `08077PC` / sale `21379`: legacy `/p/sales-invoice-v2` and inventory `/p/sales-inventory-v2` routes rendered without errors for invoice, production, packing-slip, and order-packing; data-shape evidence showed matching page counts for legacy and inventory section/row evidence for the inventory projection.
  - Updated docs: `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`, `brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 23 tests and 65 assertions; `bun test packages/sales/src/inventory-dispatch-transition.test.ts` passed with 5 tests and 14 assertions; repaired seed-helper dry-runs passed for `inventory:seed-received-fixture` and `inventory:seed-partial-fixture`; scoped `git diff --check` passed for touched inventory validation, fulfillment, API, seed helper, and Brain files.

- Hardened dispatch fulfillment delivery-write ordering.
  - `consumeComponentAllocations` now uses status-and-quantity-guarded allocation updates, so concurrently claimed picked allocations or stale partial split quantities do not count as consumed.
  - `fulfillInventoryDispatch` now consumes picked allocations before writing legacy `OrderDelivery` / `OrderItemDelivery` compatibility rows, and aborts if a picked allocation is claimed before fulfillment completes.
  - The inventory dispatch-mode UI now translates that concurrent-claim fulfillment failure into a refresh/retry toast for operators.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/inventory-dispatch-transition.test.ts` passed with 5 tests and 14 assertions; `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 23 tests and 65 assertions; scoped `git diff --check` passed for the dispatch-mode UI, dispatch fulfillment guard, and updated Brain docs; targeted scan confirmed the refresh/retry toast copy and quantity guard.

- Added dispatch-mode transition race guardrails.
  - `transitionInventoryDispatchAllocations` now uses status-guarded updates for assign, pack, and release transitions; if another dispatch action claims the allocation after the read, the row is reported as skipped with `concurrently_claimed` instead of being overwritten.
  - Added focused coverage for successful guarded assignment and concurrent-claim skip behavior.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/inventory-dispatch-transition.test.ts` passed with 2 tests and 5 assertions; `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 23 tests and 65 assertions.

- Added allocation-review retry guardrails.
  - `approveStockAllocation` and `rejectStockAllocation` now only mutate active `pending_review` allocations; retries against already transitioned or deleted rows return skipped evidence instead of reviving rows.
  - `approveBulkStockAllocation` now de-duplicates requested ids, approves only active `pending_review` rows, reports `count` from the guarded update result, and reports `skippedCount` for duplicate, missing, deleted, already transitioned, or concurrently claimed ids.
  - The allocation review UI now shows skipped retry evidence in approval/rejection toast copy instead of always presenting stale actions as newly approved or rejected.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/inventory/src/stock-allocation-review.test.ts` passed with 4 tests and 9 assertions; scoped `git diff --check` passed for the allocation review UI, inventory guard, and updated Brain docs; targeted scan confirmed skipped-result toast copy.

- Added raw reconciliation status to report and queued run evidence.
  - `buildInventoryReconciliationReportFromLines` now emits `synced`, `needs_review`, or `partial` using the same precedence operators see in the monitor: drift or skipped comparisons require review, bounded unfinished runs remain partial, and exhausted clean runs are synced.
  - The sales inventory sync monitor consumes the package-owned raw report status instead of deriving a second status, and the inventory import control center queued reconciliation summary now displays that status beside drift and skipped-comparison counts.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/inventory-reconciliation-report.test.ts packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 18 tests and 41 assertions; scoped `git diff --check` passed for the report, monitor, control center, and updated Brain docs; targeted scan confirmed the status evidence paths.

- Added skipped comparison totals to raw reconciliation run evidence.
  - `buildInventoryReconciliationReportFromLines` now returns total `skippedComparisonCount`, and the sales inventory sync monitor consumes that package-owned total instead of recomputing it from domain summaries.
  - The inventory import control center's queued reconciliation completion summary now includes skipped comparison rows when Trigger output reports them.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/inventory-reconciliation-report.test.ts packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with focused reconciliation coverage; scoped `git diff --check` passed for the report, monitor, control center, and updated Brain docs.

- Clarified the Review Risk stat composition in the inventory import control center.
  - The Review Risk stat subtitle now names componentless sales, stale inventory sale lines, reconciliation drift, and skipped reconciliation comparisons, matching the package-owned `failedRiskCount` inputs.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for the control center and updated Brain docs; targeted scan confirmed the Review Risk subtitle references `totalDriftCount` and `skippedComparisonCount`.

- Tightened the Phase 5 monitor gate for skipped reconciliation comparisons.
  - `buildSalesInventoryReconciliationSummary` now returns `needs_review` when any reconciliation domain skipped comparison rows, even if total drift is zero and the bounded cursor is exhausted, and exposes total skipped rows as `skippedComparisonCount`.
  - `buildSalesInventorySyncMonitor` now includes skipped reconciliation comparisons in `failedRiskCount`, so the Review Risk stat and the review gate agree.
  - The inventory import control center now calls out skipped reconciliation rows from the package-owned count in both the sales sync and reconciliation system-check details.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 10 tests and 12 assertions; scoped `git diff --check` passed for the monitor, monitor test, control center, and updated Brain docs.

- Tightened the Phase 5 monitor gate for partial reconciliation.
  - `buildSalesInventorySyncMonitor` now keeps the monitor in `needs_review` when the optional reconciliation summary is clean but still partial, while preserving `failedRiskCount` for actual drift/stale/componentless risk.
  - The inventory import control center now explains that case as incomplete reconciliation coverage instead of showing a generic `0` backfill / `0` review message.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 9 tests and 11 assertions; scoped `git diff --check` passed for the monitor, monitor test, control center, and updated Brain docs.

- Added reconciliation domain coverage to the sales inventory sync monitor.
  - The optional reconciliation summary now includes per-domain checked, drift, skipped, skipped-reason, severity, and sample counts, while preserving the existing drift-domain list for review-risk summaries.
  - The inventory import control center now renders reconciliation coverage cards for all domains, so clean-but-partial or skipped comparison coverage is visible before analytics cutover.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 8 tests and 10 assertions; scoped `git diff --check` passed for the monitor, monitor test, control center, and updated Brain docs.

- Promoted stale fulfillment residue to a control-center system check.
  - The inventory import control center now shows stale stock-allocation and inbound-demand residue as its own system-check row, so stale fulfillment residue is a visible cleanup gate rather than only a Review Risk subtitle detail.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for the import control center and updated Brain docs; targeted scan confirmed the system-check label and monitor response fields. No browser, build, typecheck, or dev-server validation was run.

- Added stale allocation/demand residue counts to the sales inventory sync monitor.
  - `getSalesInventorySyncMonitor` now counts active `StockAllocation` and `InboundDemand` rows attached to stale inventory sale-line components, matching the cleanup path that releases allocations and cancels demand before deleting stale components.
  - The monitor keeps `failedRiskCount` tied to stale sale-line review items while exposing allocation/demand residue as cleanup scope instead of double-counting the same stale line.
  - The inventory import control center's Review Risk stat now shows componentless sales, stale lines, stale allocations, and stale demand rows together.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 8 tests and 10 assertions; scoped `git diff --check` passed for the monitor, monitor test, and import control center.

- Added reconciliation drift-domain visibility to the inventory import control center.
  - When the sales inventory sync monitor's bounded reconciliation summary reports drift domains, the control center now renders compact domain cards with severity, drift count, and sample count.
  - This keeps the default clean state quiet while making Phase 5 review risk actionable when reconciliation drift exists.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for `apps/www/src/components/inventory/inventory-import-control-center.tsx`; targeted scan confirmed the drift-domain render path and severity/count fields. No browser, build, typecheck, or dev-server validation was run.

- Added a control-center action for the inventory reconciliation report.
  - The inventory import control center now exposes `Queue Reconciliation` beside the sales inventory backfill/review actions.
  - The action reuses the existing `inventories.runInventoryReconciliationReport` Trigger mutation and the control center's current run-status polling.
  - When the bounded reconciliation monitor summary is partial, the queued job starts from the summary's next cursor; otherwise it starts from the beginning with a bounded batch.
  - Trigger completion summaries now recognize reconciliation report output, showing checked inventory lines, drift rows, and next cursor instead of treating the job like a full import.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for `apps/www/src/components/inventory/inventory-import-control-center.tsx`; targeted scan confirmed the reconciliation mutation, button label, queued summary, and reconciliation task output handling. No browser, build, typecheck, or dev-server validation was run.

## 2026-06-16

- Surfaced the optional sales inventory reconciliation gate in the inventory import control center.
  - The control center's existing `salesInventorySyncMonitor` query now requests `includeReconciliation: true` with a bounded `reconciliationLimit`.
  - The sales sync monitor card gained a compact `Reconciliation` stat showing drift count, checked line count, and partial cursor state.
  - The system checks list now includes an `Inventory reconciliation` row so operators can see whether the current bounded reconciliation is clean, partial, unavailable, or needs review.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/progress.md`.
  - Validation: scoped `git diff --check` passed for `apps/www/src/components/inventory/inventory-import-control-center.tsx`; targeted scan confirmed the control center passes `includeReconciliation` and renders the reconciliation stat/check. No browser, build, typecheck, or dev-server validation was run.

- Extended the sales inventory sync monitor with an optional reconciliation-backed Phase 5 cutover gate.
  - `getSalesInventorySyncMonitor` can now opt into a bounded dry-run inventory reconciliation report without changing the default lightweight monitor query.
  - When requested, reconciliation drift from missing component rows, shipment/allocation mismatch, or component-fulfillment mismatch contributes to the monitor's review-risk count and returns a compact reconciliation summary with drift domains, partial cursor state, checked line count, and total drift count.
  - Exposed the optional `includeReconciliation` and `reconciliationLimit` inputs through `inventories.salesInventorySyncMonitor`.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/api/endpoints.md`, `brain/progress.md`.
  - Validation: `bun test packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 8 tests and 10 assertions; scoped `git diff --check` passed for the monitor, monitor test, and inventory router files.

- Promoted inventory browser mutation proof into package-owned validation matrix.
  - `buildInventoryBrowserValidationFixtureReport` now returns runnable/blocked workflow status for allocation approve/reject/bulk approve, dispatch assign/pack/fulfill/release, inbound receive, received-backorder release, partial ship/hold, stock adjustment, and low-stock dashboard proof.
  - Workflow rows now include candidate fixture samples, so `/inventory` and the CLI can point browser validation at concrete fixture order/item/status rows.
  - `/inventory` renders the workflow matrix inside `InventoryValidationFixturePanel`, keeping the route shell thin while surfacing operator actions, expected evidence, and sample chips from the inventory package.
  - `bun run inventory:validation-fixtures` now includes workflow matrix output in human and markdown modes, the seed checklist reports runnable browser check counts once fixtures are ready, and `--evidence-template` prints a paste-ready before/action/after/result worksheet for the browser pass.
  - The markdown preflight snapshot now includes workflow candidate samples too, so the evidence worksheet can keep the fixture preflight and mutation plan connected without a second lookup.
  - Tightened pending allocation review readiness from one row to three rows so approve, reject, and bulk-approve browser proof cannot all point at the same mutable allocation; updated the `INV-FIX-ALLOC` seed helper to create distinct pending-review rows for those workflows.
  - Tightened dispatch assign/pack readiness to require spare approved/reserved allocations, so dispatch proof does not rely on the same rows used by partial-shipment or held-line proof.
  - Tightened ship-available partial readiness to exclude `holdUntilComplete` rows, keeping the partial-shipment and held-line browser proofs on separate fixture samples.
  - Added deterministic run order, primary samples, and operator guards to each workflow row, so `/inventory` and `bun run inventory:validation-fixtures --evidence-template` now show the exact sequence and row to use first while preserving the broader candidate sample list.
  - Added `bun run inventory:validation-fixtures --mutation-snapshot`, a read-only exact-row state snapshot for the local fixture set so before/after browser evidence can still reference rows after their statuses move out of the readiness categories.
  - Added `proofTarget` and `primaryProof` columns across the mutation snapshot's mutable evidence tables, plus allocation/inbound-specific `proofRole`, making the ordered browser-proof rows distinct from legacy seed rows, alternate/recovery candidates, and future delivery compatibility rows.
  - Added a `Primary Proof Target Index` to the mutation snapshot so workflow runs `10` through `130` show their exact primary row ids, before/after compare fields, and expected deltas before the detailed tables.
  - Updated the generated evidence template to print the before-snapshot, ordered browser action, after-snapshot procedure, compare fields, and expected deltas above the workflow worksheet.
  - Added `bun run inventory:validation-fixtures --completion-gate`, a read-only Pending 15 gate checklist that groups the browser proof rows into allocation review, inventory dispatch fulfillment, inbound/backorder, partial/held shipment, and stock/low-stock coverage while keeping before/after snapshots and Brain evidence update as explicit manual completion gates.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md`, `brain/progress.md`.
  - Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 8 tests and 45 assertions; `bun --cwd apps/www -e "await import('./src/components/inventory/inventory-validation-fixture-panel.tsx'); console.log('inventory validation fixture panel import ok')"` passed; `bun run inventory:seed-allocation-fixture --apply` repaired local `INV-FIX-ALLOC` rows; a follow-up dry-run reported allocation rows unchanged; `bun run inventory:validation-fixtures --seed-checklist` reported `status: ready`, `11/11` fixtures ready, and `13/13` browser checks runnable; `bun run inventory:validation-fixtures --markdown` printed a ready preflight with sampled workflow matrix rows, pending allocation review `4/3`, ship-available partial sample line `23`, and held partial sample line `24`; `bun run inventory:validation-fixtures --evidence-template` printed a ready worksheet with `Run`, `Use Sample`, `Compare Fields`, `Expected Delta`, and `Guard` columns for all 13 workflows; `bun run inventory:validation-fixtures --mutation-snapshot` printed exact current fixture state including allocations `7`/`8`/`9`/`13`/`14`/`15`/`12`, inbound shipment item `1`, received demand `2`, partial lines `23`/`24`, stock fixtures `2065`/`2066`, and no delivery compatibility rows yet; follow-up snapshot checks confirmed `proofTarget` / `primaryProof` labels across allocations, inbound shipment items, inbound demands, line projections, stock fixtures, and delivery compatibility rows, plus a ready `Primary Proof Target Index` with compare-field and expected-delta guidance for every run from `10` through `130`.
  - Follow-up verification: `bun run inventory:seed-allocation-fixture` dry-run reported all current `INV-FIX-ALLOC` proof rows unchanged, including pending ids `7`/`8`/`9`, approved ids `10`/`13`, reserved ids `11`/`14`/`15`, and picked id `12`; `bun run inventory:validation-fixtures --markdown` again reported `status: ready`, `11/11` fixtures ready, and `13/13` browser workflows runnable.

- Updated the Expo app login template password flow.
  - Added credential email/password sign-in controls to the active `LoginTemplate1` surface used by `apps/expo-app/src/app/(auth)/sign-in.tsx`.
  - Added a 44px password visibility toggle using shared `Icon` entries for `Eye` and `EyeOff`, while keeping the text input background transparent inside the dark input wrapper.
  - Validation: scoped `git diff --check` passed for tracked touched Expo files; the login template file is currently untracked in the working tree, so broader Expo validation remains manual/pending.

- Updated shared site navigation hover expansion behavior.
  - Desktop sidebar child groups now expand after a 1 second hover delay and collapse 1 second after mouse leave.
  - Downward mouse-leave collapse now preserves the scroll position of following nav items when enough scroll offset is available, avoiding the visible upward jump/flicker under the cursor.
  - Documented the shared sidebar behavior in `brain/features/site-navigation.md`.
  - Validation: scoped `git diff --check` passed for the touched site-nav files.

- Implemented shared sales-form custom component create/select behavior.
  - Added `inventories.upsertDykeCustomStepComponent`, an inventory-domain mutation that matches step-scoped custom Dyke components by id, uid, or normalized title, writes the component, optionally creates/updates the Dyke pricing row, invalidates sales workflow caches, and queues targeted `sync-dyke-step-to-inventory`.
  - Added a reusable `CustomComponentCombobox` for `apps/www`, so the legacy sales form can browse existing custom components, create a new title, fill/update cost price, proceed, refresh component data, and auto-select the returned component.
  - Wired the app-local new sales form Component action to a custom-component dialog using the same combobox and mutation; after proceed it refetches step components and selects the hydrated custom component through the existing workflow selection path.
  - Updated shared workflow visibility so selected custom components remain visible while unselected custom components stay hidden by default when custom browsing is off.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`.
  - Validation: focused Biome check passed for the new/small touched files; `bun test packages/sales/src/sales-form/ui/workflow/workflow-visible-components.test.ts` passed with 3 tests and 6 assertions; `bun --cwd apps/api -e "await import('./src/trpc/routers/inventories.route.ts'); console.log('inventories route import ok')"` passed; legacy custom component import passed; env-wrapped new sales workflow panel import passed; scoped `git diff --check` passed. Broad `@gnd/inventory` typecheck remains blocked by existing `bun:test` type diagnostics and an unrelated `inventory.ts` diagnostic, and broad `@gnd/www` typecheck stayed silent for several minutes before being stopped.

- Added inventory browser-validation fixture readiness preflight.
  - Added `buildInventoryBrowserValidationFixtureReport` and `inventoryBrowserValidationFixtureReport` in `@gnd/inventory` as a read-only diagnostic for the remaining Pending 15 browser mutation blockers.
  - The report checks pending allocation review, dispatch assignable approved allocations, dispatch packable reserved allocations, dispatch fulfillable picked allocations, open inbound demand, inbound receiving shipments, received-inbound backorder release candidates, available partial shipment lines, held partial shipment lines, low-stock monitored variants, and safe monitored stock-adjustment variants with bounded samples.
  - Tightened the report so SQL-filterable fixture categories use separate database counts while samples stay capped, preventing readiness totals from being capped by the five-row dashboard sample.
  - Moved fixture workspace links and recommended operator actions into the inventory package response, so the `/inventory` validation panel renders package-owned guidance instead of duplicating fixture semantics in UI code.
  - Exposed the diagnostic through protected tRPC as `inventories.inventoryBrowserValidationFixtureReport`.
  - Added `InventoryValidationFixturePanel` to `/inventory` as a separate dashboard section that reads the fixture report, shows ready/required/missing counts, lists missing categories first when blocked, and links each category to the matching inventory workspace.
  - Ran the read-only fixture report from `apps/api` against fallback local `mysql://root@localhost/gnd-prisma2`; it returned `blocked` with 0 of 11 required fixture categories ready, confirming that database cannot support mutating browser workflow validation yet.
  - Updated docs: `brain/api/endpoints.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-15-inventory-browser-validation-evidence.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`.
  - Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 6 tests and 24 assertions; `bun --cwd apps/api -e "await import('./src/trpc/routers/inventories.route.ts'); console.log('inventories route import ok')"` passed; `bun --cwd apps/www -e "await import('./src/components/inventory/inventory-validation-fixture-panel.tsx'); console.log('inventory validation fixture panel import ok')"` passed. Direct plain-Bun import of `apps/www/src/app/(sidebar)/inventory/page.tsx` remains blocked by the expected Next `server-only` boundary in the app tRPC server helper, so route proof belongs to the browser/Next validation pass.

- Updated Expo mobile build variant identity.
  - Development EAS builds now resolve to the separate native identity `com.gnd.prodesk.dev` while preview and production-style builds keep `com.gnd.prodesk`.
  - Consolidated app name, scheme, launcher icon, adaptive icon, iOS icon, and splash asset selection into a variant config in `apps/expo-app/app.config.ts`, matching the existing Al-Ghurobaa icon-variant pattern while adding the missing package-name split for GND.
  - Added build-variant documentation at `brain/features/mobile-build-variants.md`.
  - Validation: not run per fast Bun monorepo command discipline; recommended check is `bun --cwd apps/expo-app run with-env expo config --type public` with each target variant env.

- Tightened sales inventory sync-monitor cutover risk coverage.
  - Added `staleInventoryLineItemCount` to the sales inventory sync monitor so active inventory-backed sale lines with deleted or missing parent sales are surfaced as review risk instead of being silently excluded from healthy coverage.
  - Updated the monitor risk score to include stale inventory sale-line residue alongside componentless synced sales.
  - Extended the monitor payload with bounded stale inventory sale-line samples.
  - Updated the inventory import control center to show a compact Review Risk metric plus bounded componentless sale and stale inventory sale-line samples in the existing sales sync monitor card.
  - Added `cleanupStaleSalesInventoryLineItems`, a dry-run-capable package service and protected inventory tRPC mutation for stale inventory sale lines whose parent sale is missing or deleted.
  - Added a confirmed "Clean Visible Stale Lines" control-center action that only targets the currently visible stale sample ids, then refreshes the monitor and inventory summaries.
  - Added explicit React JSX import-source pragmas to shared React TSX packages pulled through API validation (`packages/email`, `packages/pdf`, `packages/sales`, and `packages/ui`) so they no longer inherit the API app's `hono/jsx` runtime when imported across workspace boundaries.
  - Added `apps/api/src/trpc/routers/inventories-route-import.test.ts` to guard the inventory router import and cross-workspace React JSX runtime boundary.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/engineering/coding-standards.md`.
  - Validation: `bun test packages/sales/src/sales-inventory-sync-monitor.test.ts` passed with 6 tests and 8 assertions; `bun test apps/api/src/trpc/routers/inventories-route-import.test.ts` passed with 1 test and 1 assertion; `bun --cwd apps/www -e "await import('./src/components/inventory/inventory-import-control-center.tsx'); console.log('inventory import control center import ok')"` passed; `bun --cwd apps/api -e "await import('./src/trpc/routers/inventories.route.ts'); console.log('inventories route import ok')"` passed; React JSX pragma scans passed for `packages/email`, `packages/pdf`, `packages/sales`, and `packages/ui`.

- Planned the Orders V2 table-standard migration.
  - Added `brain/plans/2026-06-16-orders-v2-table-standard-migration.md` with the current Orders V2 standard, route/table inventory, migration phases, Midday performance rules, cleanup gates, validation requirements, and risk mitigations.
  - Updated `brain/features/sales-orders-v2.md` so the canonical frontend table paths point at `apps/www/src/components/tables-2/sales-orders/*` instead of the stale `components/tables/sales-orders-v2/*` implementation.
  - Added the migration to `brain/tasks/in-progress.md`.
  - Corrected the plan after implementation-scope review: migrations must reuse existing queries, existing filter params, and existing page headers; add only `components/tables-2/<domain>/*` table modules where needed; and leave `apps/www/src/components/tables-2/core/*` unchanged.
  - No runtime code was changed in this planning slice.

- Normalized sales orders to the `tables-2/sales-orders` standard on the canonical route.
  - `/sales-book/orders` now renders the summary-first Orders workspace using `apps/www/src/components/tables-2/sales-orders/*`, existing `sales.getOrdersV2` / summary queries, existing sales-orders filter params, and the existing `SalesOrdersV2Header`.
  - `/sales-book/orders/v2` now redirects to `/sales-book/orders` while preserving query params.
  - Runtime navigation links were moved back to `/sales-book/orders`, the old header "Legacy" button was removed, and stale `components/tables/sales-orders-v2/*` files plus the tracked table `.DS_Store` artifact were deleted after import scans.
  - Updated docs: `brain/features/sales-orders-v2.md`, `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/tasks/in-progress.md`, `brain/engineering/www-routes.md`, `brain/system/architecture-guide.md`.
  - Validation: old table import scan passed; focused Biome check passed for the canonical orders route, redirect route, header, and sales tabs; `bun test apps/www/src/components/sidebar-links.test.ts` passed. Browser smoke passed via Quick Login as Pablo Cruz / Super Admin on desktop `/sales-book/orders`, `/sales-book/orders/v2?search=08499` redirect, and mobile `390x844` with no console errors and no document-level horizontal overflow.
  - Known baseline blockers remain outside this slice: full `@gnd/www` typecheck reports existing workspace errors, and `redirect-engine.test.ts` still expects `/production/dashboard` even though the app redirects that route to `/production/dashboard/v2`.

- Migrated `/sales-book/orders/bin` to the shared `tables-2/sales-orders` table.
  - Switched the actual bin route from `components/tables/sales-orders/data-table` to `components/tables-2/sales-orders/data-table` with `bin` enabled.
  - Reused the existing `SalesOrdersV2Header`, sales-orders v2 filter params, and `sales.getOrdersV2` query path; no new `/v2` route, query, filter param, or filter metadata endpoint was added.
  - Updated the existing `sales.getOrdersV2` adapter so its existing `bin` input is forwarded into the legacy sales query used under the hood.
  - Left `components/tables/sales-orders/*` in place because sales-rep recent-sales widgets still import it.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-orders-v2.md`, `brain/api/endpoints.md`, `brain/tasks/in-progress.md`.
  - Validation: focused Biome check passed for `sales-orders-v2.ts`, the shared orders `tables-2` data table, and the orders-bin route; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; legacy sales-order import scan now shows only sales-rep widgets/embeds; `tables-2/core` has no diff. Browser smoke passed in the Pablo Cruz / Super Admin session on desktop and mobile `390x844`, with no document-level mobile overflow and search for `08489PC` updating the URL to `q=08489PC` and narrowing to the matching row. A regression `curl` probe for `/sales-book/orders` also returned `200`.

- Migrated `/sales-book/quotes` to the `tables-2` table standard under the clarified migration constraints.
  - Added `apps/www/src/components/tables-2/sales-quotes/*` and switched the canonical quotes route to the new domain table module.
  - Reused the existing `sales.quotes` query, existing quote filter params, existing `SalesQuoteHeader`, and existing `SalesQuoteSearchFilter`; no new quote `*V2` query, filter param, or `/v2` route was added.
  - Removed the unnecessary route-level `filters.salesQuotes` prefetch so the page hydrates only the visible quotes table and keeps filter metadata in the existing lazy header adapter.
  - Kept `apps/www/src/components/tables-2/core/*` unchanged.
  - Left the legacy `components/tables/sales-quotes/*` table in place for `/sales-book/quotes/bin` and the sales-rep quote embed, which are separate migration slices.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-quotes-table.md`, `brain/tasks/in-progress.md`.
  - Validation: focused Biome check passed for the quotes route/header/new table/settings files; filtered `@gnd/www` typecheck grep reported no diagnostics for touched quotes files; import scans confirmed the canonical route no longer imports the legacy quote table and `tables-2/core` has no diff. Browser smoke passed as Pablo Cruz / Super Admin on desktop and mobile `390x844`; search for `03214LM` set `q=03214LM` and narrowed to the matching row; no document-level mobile horizontal overflow was detected.

- Migrated `/sales-book/quotes/bin` to the shared `tables-2/sales-quotes` table.
  - Switched the actual bin route from `components/tables/sales-quotes/data-table` to `components/tables-2/sales-quotes/data-table` with `bin` enabled.
  - Reused the existing quote header/search/filter contracts and existing `sales.quotes` table query path; no new `/v2` route, query, filter param, or filter metadata endpoint was added.
  - Kept the route shell thin and removed server-side deleted-quote prefetch after validation showed it delayed the initial route response; the client table still resolves through the existing shared quote table query.
  - Left `components/tables/sales-quotes/*` in place because the sales-rep quote embed still imports it.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-quotes-table.md`, `brain/tasks/in-progress.md`.
  - Validation: focused Biome check passed for the bin route and quote table files; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; legacy quote import scan now shows only the sales-rep embed; `tables-2/core` has no diff. Browser smoke passed in the Pablo Cruz / Super Admin session on desktop and mobile `390x844`, with no document-level mobile overflow and existing search debounce updating the URL to `q=03214LM`.

- Migrated `/sales-book/customers` to the `tables-2` table standard.
  - Added `apps/www/src/components/tables-2/customers/*` and switched the canonical customers route to the new domain table module.
  - Reused the existing `sales.customersIndex` query, existing customer filter params, existing `CustomerHeader`, and existing `CustomerSearchFilter`; no new customer `*V2` query, filter param, filter metadata endpoint, or `/v2` table route was added.
  - Converted `/sales-book/customers/v2` into a compatibility redirect to `/sales-book/customers` while preserving query params.
  - Added only the required non-core table settings/config entries for the `customers` table id; `apps/www/src/components/tables-2/core/*` remained unchanged.
  - Removed the old `components/tables/customers/*` table files and now-unreferenced `CustomerDirectoryV2Page` after import scans.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-customers-table.md`, `brain/tasks/in-progress.md`.
  - Validation: focused Biome check passed for the customers route, redirect route, header, table settings/config, and new customers table files; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; stale customer import scans were clean; `git diff --check` passed; `tables-2/core` has no diff. Browser smoke passed in the Pablo Cruz session on desktop `1440x900`, mobile `390x844`, search `q=Amaury`, and `/sales-book/customers/v2?q=Amaury` redirect, with no document-level horizontal overflow and no customer-related console errors.

- Migrated dispatch route tables to the `tables-2` table standard.
  - Added `apps/www/src/components/tables-2/sales-dispatch/*` and switched `/sales-book/dispatch`, `/sales-book/dispatch-admin`, and `/sales-book/dispatch-task` to the new domain table module.
  - Reused the existing `dispatch.index` and `dispatch.assignedDispatch` queries, existing dispatch filter params, existing `DispatchHeader`, existing `AdminDispatchHeader`, existing driver list data, and existing dispatch mutations/actions; no new dispatch `*V2` query, filter param, filter metadata endpoint, or route was added.
  - Converted `/sales-book/dispatch/v2` into a compatibility redirect to `/sales-book/dispatch` while preserving query params.
  - Added only the required non-core table settings/config entries for `sales-dispatch`; `apps/www/src/components/tables-2/core/*` remained unchanged.
  - Removed the old `components/tables/sales-dispatch/*` table files after import scans.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-dispatch-table.md`, `brain/tasks/in-progress.md`, `brain/engineering/www-routes.md`.
  - Validation: focused Biome check passed for the dispatch routes, dispatch headers, table settings/config, sidebar links, and new dispatch table files; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; stale dispatch table import scans were clean; `git diff --check` passed; `tables-2/core` has no diff. Browser smoke passed for `/sales-book/dispatch`, `/sales-book/dispatch/v2?q=07340`, and `/sales-book/dispatch-admin?view=table&q=07340&size=1` on desktop/mobile with visible search/table UI, table-owned horizontal scroll, and no document-level mobile overflow. `/sales-book/dispatch-task` still times out before first byte even when temporarily reduced to static markup, so that route-level issue remains outside this table migration.

- Migrated `/sales-book/inbound-management` to the `tables-2` table standard.
  - Added `apps/www/src/components/tables-2/inbound-management/*` and switched the actual inbound-management route to the new domain table module.
  - Reused the existing `sales.inboundIndex` query, existing inbound summary queries, existing inbound filter params, existing `InboundHeader`, and existing `InboundSearchFilter`; no inbound `*V2` query, filter param, filter metadata endpoint, or `/v2` route was added.
  - Added only the required non-core table settings/config entries for `inbound-management`; `apps/www/src/components/tables-2/core/*` remained unchanged.
  - Removed the old typo-named `components/tables/inbound-managment/*` table files after import scans and repointed the existing inbound payload type imports to the new table module.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-inbound-management-table.md`, `brain/tasks/in-progress.md`.
  - Validation: focused Biome check passed for the inbound route, header, filter hooks, table settings/config, and new inbound table files; filtered `@gnd/www` typecheck grep reported no touched-file diagnostics; stale inbound table import scans were clean; `tables-2/core` has no diff. Browser smoke used Quick Login as Pablo Cruz / Super Admin: desktop `1440x900`, mobile `390x844`, search `q=08492PC`, row-click `viewInboundId=22996`, no app errors, no document-level horizontal overflow, and table-owned mobile horizontal scrolling.

- Migrated `/sales-book/accounting` to the `tables-2` table standard and cleaned the migrated quotes table surface.
  - Added `apps/www/src/components/tables-2/sales-accounting/*` and switched the actual accounting route to the new domain table module.
  - Reused the existing `sales.getSalesAccountings` query, existing accounting filter params, existing `SalesAccountingHeader`, existing `SearchFilterAdapter`, existing accounting export/report actions, and existing `openSalesAccountingId` URL state; no accounting `*V2` query, filter param, filter metadata endpoint, or `/v2` route was added.
  - Preserved accounting export selection by reusing the existing `useSalesAccountingStore`, removed only the old `components/tables/sales-accounting/data-table.tsx` route table after import scans, and kept the legacy accounting columns file for the still-live customer transaction subtable.
  - Removed the P.O column from `components/tables-2/sales-quotes/columns.tsx` while preserving existing quote filter params, and added a quote-table sort guard so stale `sort=displayName.asc` URLs no longer send a derived UI field to the existing `sales.quotes` query.
  - Updated docs: `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`, `brain/features/sales-accounting-table.md`, `brain/features/sales-quotes-table.md`, `brain/tasks/in-progress.md`.
  - Validation: focused Biome checks passed for the accounting and quotes touched files; filtered `@gnd/www` typecheck greps reported no touched-file diagnostics; stale accounting route-table imports were clean; static quote scans found no P.O column declarations or derived `displayName` sort mapping in the migrated quotes table; `tables-2/core` has no diff. Browser smoke used Quick Login as Pablo Cruz / Super Admin: accounting desktop/mobile/search/row-open passed (`openSalesAccountingId=11139`), quotes desktop/mobile confirmed no P.O header, stale `sort=displayName.asc` no longer errors, no document-level mobile overflow, and table-owned mobile horizontal scrolling.

- Implemented Expo mobile invoice form grouped line editor structure.
  - Added dedicated mobile step-family editors under `apps/expo-app/src/features/sales/invoice-form/steps/` for House Package Tool, service rows, moulding rows, shelf items, and shared mobile editor primitives.
  - Reworked `line-item-card.tsx` to compose those editors instead of carrying grouped row UIs inline.
  - Added a first-class House Package Tool mobile section with package totals, active-door chips, add-size action, stacked size rows, and canonical `buildWorkflowDoorRowsPatch` persistence.
  - Service, moulding, and shelf mobile editors continue to use shared core patch helpers so create/edit/update saves preserve `formSteps`, `shelfItems`, `housePackageTool.doors`, `meta.serviceRows`, and `meta.mouldingRows`.
  - Updated feature documentation: `brain/features/mobile-invoice-form.md`.
  - Validation: focused Biome check passed for the new `invoice-form/steps` modules; lint-only Biome check passed for the touched `line-item-card.tsx` with formatter/import organization disabled due to its known existing formatting baseline; filtered Expo typecheck reported no diagnostics for `apps/expo-app/src/features/sales/invoice-form/components/line-item-card.tsx` or `apps/expo-app/src/features/sales/invoice-form/steps/`; `git diff --check` passed for tracked touched files; trailing-whitespace scan passed for new step docs/files.

- Added sales invoice save-path inventory sync guard coverage.
  - Guarded the new sales form draft/final save functions so both keep queueing `queueSalesInventoryLineItemsSync` with `source: "new-form"` and the authenticated user id.
  - Guarded the legacy sales form save path so successful saves keep queueing `queueSalesInventoryLineItemsSync` with `source: "old-form"`.
  - Extended shared queue coverage so `new-form`, `old-form`, `copy-sales`, `manual`, and `repair` source labels are preserved in the Trigger task payload.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`.
  - Validation: `bun test apps/www/src/actions/sales-inventory-sync-save-paths.test.ts` passed with 2 tests and 9 assertions; `bun test packages/sales/src/sales-inventory-sync-job.test.ts` passed with 3 tests and 7 assertions.

- Advanced Dyke + inventory produceable semantics.
  - Inventory sales-line sync now derives production eligibility from explicit produceable metadata, service-row `dykeProduction`, and moulding detection.
  - Synced inventory sale lines store the result in `LineItem.meta.production.produceable` and `LineItem.meta.inventorySync.productionProduceable`.
  - Added sync regression coverage proving explicit `produceable: false` metadata overrides legacy Dyke production truthiness.
  - Production lifecycle updates preserve the produceable flag while refreshing assigned, fulfilled, remaining, and status fields.
  - Production plan/readiness projections now skip inventory-backed lines marked non-produceable, keeping fulfilment/backorder component data intact for stock analytics.
  - Added fulfillment-plan regression coverage proving non-produceable stock demand still appears in backorder/fulfillment queues while staying out of production planning.
  - Added persisted mixed grouped metadata regression coverage proving HPT metadata remains produceable and extracts HPT/door inventory candidates, service metadata stays produceable when `dykeProduction` is true, and moulding metadata remains non-produceable even when legacy Dyke production flags are truthy.
  - Added shipment-planning regression coverage proving optional component shortages do not block shipment when required components are available.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`.
  - Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-fulfillment-plan.test.ts` passed with 29 tests and 74 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 12 tests and 25 assertions after adding the explicit non-produceable metadata precedence and persisted mixed grouped metadata cases; `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 23 tests and 65 assertions after adding the non-produceable fulfillment queue and optional-component shipment invariants.

- Collapsed legacy production lifecycle bypasses into inventory projection refreshes.
  - Direct legacy production assignment/submission/delete/mark-complete paths now call `syncInventoryProductionLifecycleForSale` after their existing sales-control/stat reset mutation.
  - Covered standalone production assignment actions, clean-code production data-access helpers, mirrored `app-deps` helpers, batch assignment, old mark-complete actions, sales-progress fallback deletion, and older production item action helpers.
  - Moved the canonical `update-sales-control` lifecycle-sync decision into `@gnd/sales` control application code via `shouldSyncInventoryProductionLifecycleForSalesControl`, so assignment, submit-all, submission update/delete, assignment delete, and mark-complete actions are package-owned sync triggers while dispatch-only mutations stay excluded.
  - Added package-level lifecycle coverage proving assignment/completion refreshes preserve Dyke-derived `production.produceable` and `inventorySync.productionProduceable` metadata.
  - Updated guardrail coverage in `apps/www/src/actions/production-control-reset.test.ts`.
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`.
  - Validation: `bun test apps/www/src/actions/production-control-reset.test.ts` passed with 2 tests and 42 assertions; `bun test packages/sales/src/control/application/update-sales-control-command-map.test.ts` passed with 3 tests and 19 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts packages/sales/src/sales-fulfillment-plan.test.ts` passed with 29 tests and 74 assertions; `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 5 tests and 10 assertions.

- Connected order inbound prompts to inventory demand reconciliation.
  - `notes.saveInboundNote` now maps `ORDERED` and `PENDING ORDER` prompts onto existing open `InboundDemand` rows for the sale.
  - `AVAILABLE` remains non-destructive so real shortage demand is not hidden by an order-level prompt; `PENDING ORDER` does not downgrade partially received or shipment-linked demand.
  - Sales inventory line sync now reads `SalesOrders.inventoryStatus` and applies the inventory-owned demand status resolver when creating or updating active `InboundDemand`, covering the async case where the prompt is saved before demand rows exist.
  - Sales inventory sync, inbound queue, reorder suggestions, reconciliation, and inbound assignment flows now use the inventory-owned `ACTIVE_INBOUND_DEMAND_STATUSES` policy for active demand reads.
  - Order prompt mutation now uses the narrower inventory-owned `ORDER_PROMPT_MUTABLE_INBOUND_DEMAND_STATUSES` policy.
  - Added optional selected-demand prompt scope: `notes.saveInboundNote` can pass `demandIds` into the inventory boundary, allowing future line-level prompts to mark selected demand as ordered/pending or cancel selected pending/ordered demand when those lines are confirmed available.
  - Tightened selected-demand prompt safety so a non-empty but invalid selected id list no-ops at the inventory boundary instead of widening into order-wide demand mutation.
  - Added selected-demand controls to the inbound status modal: when an order has mapped active inventory demand, the modal fetches `inventories.inboundDemandQueue` by sale id and submits selected demand ids through `notes.saveInboundNote`.
  - Extracted the demand row picker to `apps/www/src/components/modals/inbound-demand-selection.tsx` so the modal stays focused on form/query orchestration while the line-demand surface owns row rendering and prompt-mutability display.
  - Moved selected-demand prompt mutability into the inventory package via `canOrderInboundPromptMutateDemand`, exposed the pure helper through `@gnd/inventory/inbound-policy`, and kept the modal selector as a UI consumer of inventory-owned demand status policy.
  - Documented the package boundary decision in `brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
  - Added `inventories.inboundStatusDemandReconciliation` and a compact `/inventory/inbounds` panel showing prompt-vs-line-demand mismatches, extracted into a dedicated widget component for cleaner Midday-style page composition.
  - Refreshed the Dyke + inventory integration report to name the public `@gnd/inventory/inbound-policy` boundary and the latest inbound policy/service validation count.
  - Updated docs: `brain/features/order-inbound-status.md`, `brain/features/inventory-backed-sales-fulfillment.md`, `brain/reports/2026-06-16-dyke-inventory-integration-status-roadmap.md`, `brain/api/endpoints.md`.
  - Validation: `bun test packages/inventory/src/application/inbound/inbound-demand-policy.test.ts packages/inventory/src/application/inbound/inbound-demand.test.ts` passed with 21 tests and 44 assertions; `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 10 tests and 20 assertions; `bun --cwd apps/www -e "import { canOrderInboundPromptMutateDemand } from '@gnd/inventory/inbound-policy'; ..."` passed; scoped `git diff --check` passed.

- Added root Android native run shortcut.
  - Added root `bun run android`, which best-effort uninstalls `com.gnd.prodesk` through the Android SDK `adb` path and then delegates to `apps/expo-app`'s existing `bun run android` native build/install flow through `bun run --cwd apps/expo-app android`.
  - Validation: root `package.json` parsed successfully and `scripts.android` resolves to the expected command; running it reaches `expo run:android` but stops because no Android device/emulator is connected or auto-startable.

- Fixed Expo splash/logo presentation.
  - Added a cropped `apps/expo-app/assets/icons/splash-logo.png` from the existing GND mark so Expo splash `imageWidth` applies to the visible logo instead of a padded 1024px canvas.
  - Added `apps/expo-app/assets/icons/loading-icon.png` and pointed the top-level Expo `icon` at it so the Expo bundling/loading card uses a cleaner, larger mark.
  - Updated `apps/expo-app/app.config.ts` to use the cropped splash logo for light and dark native splash screens.
  - Simplified Android adaptive icon config to use the logo only as the foreground over `#E6F4FE`, removing the previous duplicated background/monochrome logo layers that made the dev loading icon look boxed-in.
  - Validation: `bun run with-env expo config --type public` resolves the new splash/adaptive icon config; `bun run with-env expo export --platform android --output-dir /private/tmp/gnd-expo-export-splash-logo` completed. Focused Biome on `app.config.ts` remains blocked by existing file-wide formatting/import-style baseline.

- Fixed Expo mobile runtime warning cleanup.
  - Added `apps/expo-app/babel.config.js` with `babel-preset-expo` and the Reanimated Babel plugin so React Native codegen transforms run for native modules such as `react-native-safe-area-context`.
  - Declared `babel-preset-expo` in `apps/expo-app/package.json` so Babel can resolve the preset under Bun's isolated install layout; refreshed `bun.lock` with `bun install`.
  - Removed the Expo toast component's Android `setLayoutAnimationEnabledExperimental(true)` call because it is a New Architecture no-op and only emits a runtime warning.
  - Removed the `@gnd/notifications` self-import cycle in `packages/notifications/src/payload-utils.ts` by importing from the folder index explicitly.
  - Validation: focused Biome check passed for `apps/expo-app/babel.config.js` and `packages/notifications/src/payload-utils.ts`; `apps/expo-app/package.json` parsed successfully; static scan found no remaining `setLayoutAnimationEnabledExperimental` calls; Android Expo export completed to `/private/tmp/gnd-expo-export-warning-fixes` without the SafeArea codegen or notification require-cycle warnings. Focused Biome on `apps/expo-app/src/components/ui/toast/toast.tsx` remains blocked by existing hook-dependency/non-null assertion/format baseline findings in that file. `packages/notifications` typecheck remains blocked by existing unrelated workspace baseline errors in notifications, pdf, sales, and ui packages.

- Standardized Expo EAS Android build shortcuts.
  - Added root `bun run eas-build:dev` for the development Android profile.
  - Renamed the preview Android build shortcut from `build:preview` to `eas-build:preview`.
  - Updated the EAS account runner plus Expo app scripts so root commands still authenticate before dispatching into `apps/expo-app`.
  - Follow-up: made the development Android build use local `.env` loading and added a development app variant that switches to `DEV`-badged icon/splash assets when `APP_VARIANT=development` or the EAS profile is `development`.

## 2026-06-15

- Updated the app download API default APK source.
  - Changed `/api/download-app` to default to Expo EAS artifact `QG5-xn0VgAxDwj58KqyTLdN1aXKiQRpUOYxLc1rFr5s.apk`.
  - Updated API documentation: `brain/api/endpoints.md`.
  - Validation: pending focused route/source check.

- Implemented Expo mobile design-system template previews.
  - Added preview routes under `apps/expo-app/src/app/design-system-preview` for the template index plus Ops Console, Field Flow, and Sales Ledger samples.
  - Added isolated preview feature files under `apps/expo-app/src/features/design-system-preview`, including token specs, sample data, shared preview components, and documentation.
  - Added a Settings section named `Design System Previews` with links to the index and each template.
  - Added mobile design documentation: `apps/expo-app/DESIGN.md` and `apps/expo-app/src/features/design-system-preview/DESIGN.md`.
  - Updated plan: `brain/plans/2026-06-15-mobile-design-system-template-previews.md`.
  - Narrowed Settings job-setting updates to the literal `"jobs-settings"` type instead of the previous loose `setting?.type!`.
  - Validation: focused Biome check for the new preview route/feature files passed; `git diff --check` passed; broad Expo typecheck remains blocked by existing workspace baseline errors, but touched-file diagnostic grep returned no preview/settings/layout diagnostics after the Settings type fix. Expo dev server started on port `3502`; web route smoke is blocked by an existing `react-native-css` / `react-native-web` FlatList Metro error and Playwright screenshot smoke is blocked by a missing local browser binary.
  - Follow-up: gated the design-system preview Settings section, protected root stack screen, and preview route layout behind `__DEV__`, making the samples development-only. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: added per-template dark palettes and made the preview index plus Ops Console, Field Flow, and Sales Ledger screens resolve colors from the app color scheme. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: added the existing app theme toggle to the shared preview shell's top-right header slot so all three template screens can switch light/dark mode in place. Focused validation passed.
  - Follow-up: moved preview template bottom tabs into a shared shell overlay outside the scroll view, with scroll padding adjusted for the overlay. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: updated the preview shell to derive header text/search contrast and native status bar style from header luminance, making Ops Console's dark light-mode header use light status icons and Sales Ledger's near-white header use dark text. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: expanded the Ops Console preview work queue to ten records and made the visible item count derive from sample data so the template is scrollable under the bottom tab overlay. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: replaced the preview header's image-based global theme toggle with a local Sun/Moon icon toggle that keeps theme switching behavior but inherits the template header foreground color, so Ops Console's dark header controls blend with the custom chrome. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: added explicit overflow clipping to rounded preview touch surfaces and header controls so pressed/ripple feedback stays inside curved card, search/filter, header-button, index-card, and CTA bounds. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.
  - Follow-up: added a reusable `Icon` `inverted` option that resolves theme-token colors against the opposite app theme, then used it for preview header back, search, and filter icons when the custom header surface is opposite the current theme. Focused preview Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed; full Biome on `components/ui/icon.tsx` remains blocked by existing file baseline lint/format issues.
  - Follow-up: changed the preview bottom tab overlay to float without a full-width footer background, added card shadow, and increased scroll bottom padding so content remains visible around and behind the tab card. Focused Biome, `git diff --check`, and touched-file TypeScript diagnostic grep passed.

- Fixed `apps/www` production logout hardening.
  - Changed `/signout` to call the Better Auth sign-out handler in-process instead of server-fetching the public `/api/auth/sign-out` URL.
  - Preserved forwarded auth/request headers for the internal handler call and continued forwarding any Better Auth `Set-Cookie` response headers.
  - Replaced generic cookie deletion fallback with secure-prefix-aware expiration for legacy NextAuth and Better Auth cookies so `__Secure-*` / `__Host-*` cookies are cleared correctly in production.
  - Updated auth documentation: `brain/api/permissions.md`.
  - Validation: focused Prettier check and `git diff --check` passed for the logout route; `@gnd/www` typecheck remains blocked by existing unrelated baseline errors, with no `/signout` route diagnostics surfaced by a focused grep.

- Advanced Inventory Pending 15 browser validation readiness.
  - Static audit found inventory dispatch assign/pack/fulfill/release commands in the API but no dedicated web UI caller.
  - Added `/inventory/dispatch-mode` with `InventoryDispatchModePage`, exposing per-line assign, pack, fulfill, and release actions against the existing inventory dispatch tRPC procedures.
  - Linked dispatch mode from the `/inventory` operations dashboard.
  - Added Dispatch Mode, Variants, and Partial Shipments to the Inventory sidebar module for Super Admins with focused access coverage for every authenticated inventory validation route.
  - Added readiness report: `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`
  - Updated plan: `brain/plans/2026-06-12-feature-pending-15-inventory-browser-validation.md`
  - Validation: `bun test apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts` passed with 29 tests and 89 assertions; import checks for sidebar links, inventories router, dispatch-mode component, and operations dashboard component passed; scoped `git diff --check` and trailing-whitespace scans passed.
  - Print validation: `bun test packages/sales/src/print/inventory-print-data.test.ts apps/www/src/modules/sales-print/application/inventory-print-request.test.ts apps/www/src/components/sidebar-links.test.ts packages/sales/src/sales-fulfillment-plan.test.ts packages/inventory/src/inventory-item-dashboard.test.ts` passed with 36 tests and 105 assertions; import check for `print.route.ts`, `rendered-inventory-pdf-print-viewer.tsx`, and `inventory-print-request.ts` passed. Direct `SalesInventoryPrintViewerPage` import outside Next hit the expected `server-only` boundary, so route proof remains part of browser validation.
  - Route matrix validation: added route-file existence coverage for the Pending 15 matrix, including `/p/sales-inventory-v2`; focused suite now passes with 37 tests and 115 assertions, and import check for sidebar links plus inventory/print routers passed.
  - Added a concrete browser QA execution checklist to `brain/reports/2026-06-15-inventory-browser-validation-readiness.md`, covering preflight, route smoke, allocation review, inbound receiving, production readiness, backorder and partial shipment behavior, stock operations, dispatch mode, print parity, evidence format, and stop conditions.
  - Added the Pending 15 browser evidence worksheet at `brain/reports/2026-06-15-inventory-browser-validation-evidence.md` so the final live validation pass has a structured place to record route smoke, workflow, print, fixture, screenshot/note, and completion-decision evidence.
  - Browser validation started in the Codex in-app browser after explicit approval to ignore the fast Bun command-discipline gate; viewport was set to `1440x1000` and Dev Quick Login used Pablo Cruz / Super Admin.
  - Route smoke passed for `/inventory`, `/inventory/variants`, `/inventory/allocations`, `/inventory/inbounds`, `/inventory/production-plan`, `/inventory/backorders`, `/inventory/partial-shipments`, `/inventory/stocks`, `/inventory/dispatch-mode`, and `/p/sales-inventory-v2`.
  - Browser validation found an inventory print SSR regression: `/p/sales-inventory-v2` initially triggered `PDFViewer is a web specific API` during server render. Added a client-only dynamic wrapper for the inventory PDF viewer, then re-tested the route and confirmed it renders a blob-backed PDF iframe.
  - Remaining Pending 15 browser validation is data-fixture gated: current local data has no pending allocation suggestions, no inbound shipments/demand, no partial-shipment lines, no dispatch lines, and no safe stock audit rows for mutating workflow proof.

- Completed Inventory Pending 16 operations dashboard stock controls.
  - Added `buildInventoryOperationsSummary(...)` and `inventoryOperationsSummary(...)` in `@gnd/inventory`.
  - Added protected tRPC route `inventories.inventoryOperationsSummary`.
  - Added `InventoryOperationsDashboard` on `/inventory` with tracked/untracked stock, low-stock, out-of-stock, open inbound, pending allocation, backordered line, and production blocker metrics.
  - Replaced the old low-stock-only widget mount on `/inventory` with the operations dashboard and linked alerts into item dashboards, variants, stock operations, inbound, allocations, backorders, and production plan.
  - Updated plan: `brain/plans/2026-06-15-feature-inventory-operations-dashboard-stock-controls.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 4 tests and 13 assertions; import check for the inventories router and operations dashboard component passed; scoped `git diff --check` passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 14 stock audit verification.
  - Added `STOCK_AUDIT_MATRIX`, `getStockAuditExpectation(...)`, `buildStockAuditVerificationReport(...)`, and `getStockAuditVerificationReport(...)`.
  - Added protected tRPC route `inventories.stockAuditVerificationReport`.
  - Stock operations now shows recent audit evidence for stock in, stock out, return, correction, consume, and release.
  - Static scan confirmed direct physical `InventoryStock.qty` writes are in the expected receiving and manual adjustment paths; receiving writes `stock_in` movement plus `inbound-received` log, while manual adjustments write movement/log rows for each reason.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-14-stock-audit-verification.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/inventory/src/application/stock/stock-adjustment.test.ts` passed with 6 tests and 12 assertions; import check for the inventories router and stock operations page passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 13 top-sales analytics by inventory item and variant.
  - Added `inventoryTopSalesAnalytics(...)` and pure `buildInventoryTopSalesAnalytics(...)` in `@gnd/inventory`.
  - Ordered quantity now aggregates from inventory-backed `LineItem` rows; shipped quantity aggregates from consumed `StockAllocation` rows.
  - Sale counts are de-duplicated across ordered lines and consumed allocations so shipped activity does not inflate sales coverage counts.
  - The analytics payload carries and tests the caveat that shipped quantity is based on consumed stock allocations.
  - Added protected tRPC route `inventories.inventoryTopSalesAnalytics`.
  - Added `InventoryTopSalesAnalytics` UI on `/inventory` and `/inventory/[id]` with item/variant rankings and revenue/cost reliability counts.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-13-top-sales-analytics-inventory-item-variant.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 4 tests and 16 assertions after adding top-sales sale-count de-duplication and consumed-allocation caveat coverage; import check for the inventories router, analytics component, item dashboard component, and variants workspace component passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 12 variants workspace.
  - Replaced the `/inventory/variants` redirect with a real workspace.
  - Added `inventoryVariantsWorkspace(...)` and `buildInventoryVariantWorkspaceRow(...)` in `@gnd/inventory`.
  - Added protected tRPC route `inventories.inventoryVariantsWorkspace`.
  - Added search and filters for item id, category id, supplier id, status, stock mode, and low-stock rows.
  - Added variant rows with item/category, status, stock quantity/value, cost, price, supplier, attributes, and actions to item dashboard, edit flow, and stock operations.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-12-inventory-variants-workspace.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 2 tests and 4 assertions; import check for the inventories router, item dashboard component, and variants workspace component passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 11 item dashboard.
  - Added `getInventoryItemDashboard(...)` and `buildInventoryItemDashboardSummary(...)` in `@gnd/inventory`.
  - Added protected tRPC route `inventories.inventoryItemDashboard`.
  - Added `/inventory/[id]` dashboard route with variants, stock, movement history, inbound demand, allocations, sales, and quotes sections.
  - Wired the inventory products table eye action to the new dashboard route so viewing no longer forces edit mode.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-11-inventory-item-dashboard.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 1 test and 2 assertions; import check for the inventories router and dashboard component passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Fixed Expo Android runtime startup recursion around `get Dimensions`.
  - Added a narrow Metro resolver guard in `apps/expo-app/metro.config.js` so NativeWind/react-native-css still rewrites app-level `react-native` imports for global `className`, but package-internal imports from `react-native-css` and `react-native` resolve to the native React Native package instead of looping back through `react-native-css/components`.
  - Follow-up: tightened the Metro resolver so any `react-native` import that originates under `node_modules` resolves to the Expo app's own `react-native@0.81.5+f99a...` copy, preventing stale Bun symlink paths such as `react-native@0.81.5+87dd...` from initializing React Native DevTools a second time and throwing `property is not writable` for `__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__`.
  - Follow-up: extended the singleton resolver to `react`, `react-dom`, `react-native-css`, `react-native-css-interop`, and `react-native-safe-area-context`, and bypassed NativeWind wrapping inside React Native internals so `AppContainer` uses the raw RN `View` instead of a `react-native-css` hook wrapper.
  - Validation: Metro config loads with CSS support; targeted resolver smoke delegates `react-native-css` internal `react-native` imports to the native resolver; `bun run with-env expo export --platform android --output-dir /private/tmp/gnd-expo-export` completed and emitted an Android Hermes bundle; temporary Metro on port `3511` returned `200` for the Android dev virtual entry bundle and was stopped afterward.
  - Follow-up validation: targeted resolver smoke proves package origins, including old `react-native@0.81.5+87dd...` origins, resolve to the app `react-native@0.81.5+f99a...` entry; `bun run with-env expo export --platform android --output-dir /private/tmp/gnd-expo-export-rn-singleton` completed and emitted an Android Hermes bundle; temporary Metro on port `3511` returned `200` for the Android dev virtual entry bundle and was stopped afterward.
  - Follow-up validation: `bun run with-env expo export --platform android --output-dir /private/tmp/gnd-expo-export-singletons` completed and emitted an Android Hermes bundle; temporary Metro on port `3511` returned `200` for the Android dev virtual entry bundle; the dev bundle no longer contains stale `react-native-css@3.0.1+db5...`, `react@19.1.0`, or `react-native@0.81.5+87dd...` paths.
  - Follow-up: pinned the Expo app to SDK 54's expected React stack (`react`/`react-dom` `19.1.0`, `@types/react` `~19.1.10`), aligned Expo SDK 54 patch packages (`expo` `54.0.35`, `expo-router` `6.0.24`, `expo-dev-client` `6.0.21`, related Expo packages), and added the `expo-font` / `expo-web-browser` config plugins requested by `expo install`.
  - Follow-up: extended the Metro singleton resolver to the duplicate Expo modules reported by `expo-doctor` (`expo`, `expo-constants`, `expo-font`, `expo-linking`, `@expo/vector-icons`) so package-origin imports use the app-level SDK copies.
  - Final validation: `bunx expo-doctor` now passes SDK package-version checks, with only Bun isolated-store duplicate warnings remaining; `bun run with-env expo export --platform android --output-dir /private/tmp/gnd-expo-export-sdk54-aligned` completed and emitted an Android Hermes bundle; port `3501` Metro was restarted with a cleared cache and served the live Android dev bundle with HTTP 200, and the live bundle grep found no stale React/RN/Expo package markers.

- Polished the Expo invoice form component grid image loading state.
  - Replaced the inline component-grid image cell in `WorkflowStepSelector` with a small `ComponentGridImage` helper that shows the existing animated `Skeleton` over the image slot until `Image` load completion and falls back to the file icon on image errors.
  - Validation: scoped `git diff --check` passed. `bunx tsc -p apps/expo-app/tsconfig.json --noEmit` still fails on broad pre-existing workspace errors across `apps/api`, `packages/sales`, `packages/ui`, and unrelated Expo files, with no touched-file error surfaced. `bunx biome check apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx` is blocked by pre-existing lint/format findings in the same large file (`as any`, hook dependency warnings, index-key skeleton loop, import/format drift).

- Removed the Expo invoice form env-driven test/mock data-source switch.
  - Deleted the invoice-form API config flag, removed the sample env entry and prompt scaffold references, and made the invoice form record/action/search/customer/tax/profile/workflow hooks call the real mobile tRPC procedures directly.
  - Validation: static scan found no remaining invoice-form env/test flag references; `git diff --check` passed for the touched files. Broad Expo typecheck and focused Biome remain blocked by existing workspace baseline errors/formatting outside this behavior change.

- Fixed the Expo invoice form initial customer selector back navigation.
  - New invoice creation now replaces `/invoices/new` with the required customer selector instead of pushing it over the form, so native back swipe closes the create flow and returns to the previous screen.
  - After customer selection, the selector replaces back to `/invoices/new` with a one-shot skip flag so the form does not auto-open the selector again.
  - Validation: route-file Biome check passed; scoped `git diff --check` passed; touched-file TypeScript grep after broad Expo typecheck found no errors. Broad Expo typecheck still fails on existing workspace baseline errors outside these touched files.

- Completed Inventory Pending 10 repeat receive / allocation auto-release guardrails.
  - Added `planInboundReceiptDelta(...)` so inbound receipt handling calculates target good/issue totals and applies only newly received deltas.
  - `receiveInboundShipment(...)` now treats identical receive retries as no-ops for stock, stock movements, inbound demand received quantities, and issue rows.
  - Partial receive retries now process only remaining unprocessed quantity.
  - Receive results now include `skippedItemCount`, `newlyReceivedQty`, and `alreadyReceivedQty`.
  - `allocateReceivedInboundToBackorders(...)` now reports skipped and already-covered demand counts so repeated auto-release jobs have structured retry output.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-10-repeat-receive-allocation-auto-release-guardrails.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/inventory/src/application/inbound/inbound-demand.test.ts` passed with 4 tests and 4 assertions; `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 20 tests and 55 assertions; import check for inbound service, allocation job, and inventories router passed. No broad typecheck, build, dev server, browser test, PDF render test, or curl check was run.

- Completed Inventory Pending 09 hold-until-complete and partial-shipment workspace slice.
  - Added line-level fulfillment hold metadata under `LineItem.meta.fulfillment.holdUntilComplete`.
  - Fulfillment projections now expose `holdUntilComplete`, `availableToShipQty`, `canShipNow`, and `heldBackQty`.
  - `shipAvailableSalesInventory` now skips held lines unless the full remaining quantity is available, and returns skipped held lines with `reason: "hold_until_complete"`.
  - Added `setSalesInventoryLineFulfillmentHold`, `salesPartialShipmentQueue`, and protected inventory tRPC procedures for the same.
  - Added dedicated `/inventory/partial-shipments` route and client workspace with hold toggles, available quantity, remaining quantity, blockers, and guarded Ship Available actions.
  - Updated `/inventory/backorders` to show hold/available state, link to the partial-shipment workspace, and avoid accidental held partial shipments.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-09-hold-until-complete-partial-shipment-screen.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 19 tests and 54 assertions; import check for the inventories router plus partial-shipment client component passed. Importing the server route directly hit the expected Next `server-only` runtime guard, so route runtime/browser validation remains deferred to Pending 15. No broad typecheck, build, dev server, browser test, PDF render test, or curl check was run.

- Completed Inventory Pending 07 reconciliation job foundation.
  - Added `packages/sales/src/inventory-reconciliation-report.ts` with a dry-run report for inventory-backed sales drift across sales inventory sync, shipment/allocation, and component fulfillment domains.
  - Added checked counts, drift counts, severity, bounded samples, skipped counts, skipped reasons, next cursor, and has-more output.
  - Added Trigger task `run-inventory-reconciliation-report` plus protected tRPC query/mutation access through `inventories.inventoryReconciliationReport` and `inventories.runInventoryReconciliationReport`.
  - Kept repair actions explicit and separate; the reconciliation job does not mutate stock, allocations, inbound demand, sales lines, or Dyke definitions.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-07-inventory-reconciliation-jobs.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/sales/src/inventory-reconciliation-report.test.ts` passed with 7 tests and 21 assertions; import check for `apps/api/src/trpc/routers/inventories.route.ts` and `packages/jobs/src/tasks/inventory/run-inventory-reconciliation-report.ts` passed. No broad typecheck, build, dev server, browser test, PDF render test, or curl check was run.

- Completed Inventory Pending 06 inventory print parity data/golden slice.
  - Inventory print keeps the exact current v2 template input shape and does not modify the legacy sales print route.
  - Added packet-specific section titles for production BOM, pick list, packing list, backorder summary, and customer remaining summary using existing `LineItemSection` data.
  - Added print-only operational quantity helpers so pick/packing packets reflect inventory allocation state before legacy delivery rows exist.
  - Added golden-style fixture assertions for production/BOM, pick list, packing list, backorder, and customer remaining summary packet rows.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-06-inventory-print-parity-dyke-golden-packets.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/api/endpoints.md`
  - Validation: `bun test packages/sales/src/print/inventory-print-data.test.ts` passed with 5 tests and 14 assertions; import check for `apps/api/src/trpc/routers/print.route.ts` passed; scoped `git diff --check` passed. No broad typecheck, build, dev server, browser/PDF render test, or curl check was run.

- Completed Inventory Pending 05 shipment-record decision.
  - Accepted `OrderDelivery` / `OrderItemDelivery` as canonical shipment records for the current inventory cutover phase.
  - Added ADR: `brain/decisions/ADR-008-inventory-shipment-record-source.md`
  - Inventory-origin shipments must use metadata source tags such as `inventory_partial_shipment` and `inventory_dispatch_mode`; stock reservation/pick/consume state remains in `StockAllocation`.
  - Deferred new `SalesShipment` / `SalesShipmentLine` models until a concrete reporting, audit, or operational gap proves the existing delivery records plus metadata are insufficient.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-05-shipment-record-decision.md`
  - Updated docs: `brain/features/inventory-backed-sales-fulfillment.md`, `brain/database/schema.md`, `brain/database/relationships.md`, `brain/api/endpoints.md`
  - Validation: documentation/code evidence check only; no broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 04 inventory-mode dispatch assign/pack/fulfill command/API slice.
  - Added inventory dispatch allocation transition planning and commands for assign (`approved` -> `reserved`), pack (`reserved` -> `picked`), release (`approved` / `reserved` / `picked` -> `released`), and structured skips for unsafe states.
  - Added picked-only inventory dispatch fulfillment that consumes only `picked` allocations and writes completed legacy `OrderDelivery` / `OrderItemDelivery` rows with `source: "inventory_dispatch_mode"`.
  - Added inventory tRPC procedures: `assignInventoryDispatchAllocations`, `packInventoryDispatchAllocations`, `fulfillInventoryDispatch`, and `releaseInventoryDispatchAllocations`.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-04-inventory-mode-dispatch-assign-pack-fulfill.md`
  - Updated API docs: `brain/api/endpoints.md`
  - Updated tasks: `brain/tasks/roadmap.md`, `brain/tasks/done.md`
  - Validation: `bun test packages/sales/src/sales-fulfillment-plan.test.ts` passed with 15 tests and 44 assertions; import check for `apps/api/src/trpc/routers/inventories.route.ts` passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 08 production readiness gates.
  - Added shared `evaluateProductionReadinessGate` / `assertProductionReadinessForSale` logic backed by the existing inventory production plan projection.
  - `update-sales-control` now gates `createAssignments` and `submitAll` before legacy production assignment/start actions run.
  - Blockers cover missing inventory components, awaiting inbound, pending allocation review, and blocked/shortage readiness; no supervisor override was added.
  - Added `lineItemUids` scoping to `getSalesProductionPlan` so selected production starts can be checked by control UID.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-08-production-readiness-gates.md`
  - Updated tasks: `brain/tasks/roadmap.md`, `brain/tasks/done.md`
  - Validation: `bun test packages/sales/src/sales-fulfillment-plan.test.ts packages/sales/src/production-readiness-gate.test.ts` passed with 16 tests and 49 assertions; import check for `packages/jobs/src/tasks/sales/update-sales-control.ts` passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 03 production assignment/completion inventory lifecycle bridge.
  - Added `syncInventoryProductionLifecycleForSale`, which first ensures inventory sale lines exist via `syncSalesInventoryLineItems`, then recomputes production lifecycle from persisted production assignments/submissions.
  - Wired `update-sales-control` to refresh inventory production projection after production assignment, submit-all completion, submission update/delete, assignment delete, and mark-as-completed actions.
  - Inventory line production state is persisted in `LineItem.meta.production` with ordered, assigned, fulfilled, remaining, status, and timestamp fields; `LineItemComponents.status` remains dedicated to stock allocation/inbound/fulfillment.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-03-production-assignment-completion-inventory-lifecycle-bridge.md`
  - Updated tasks: `brain/tasks/roadmap.md`, `brain/tasks/done.md`
  - Validation: `bun test packages/sales/src/inventory-production-lifecycle.test.ts` passed with 4 tests and 9 assertions; `bun -e` import check for `packages/jobs/src/tasks/sales/update-sales-control.ts` passed; scoped `git diff --check` passed. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 02 variant/supplier price sync to Dyke.
  - Generic inventory variant price sync now projects inventory `costPrice` into `DykePricingSystem.price` using `dependenciesUid = InventoryVariant.uid`, with idempotency recheck behavior that does not over-report creates.
  - Supplier variant sync keeps legacy compatibility guardrails: update exact preserved/candidate rows, create only from preserved `SupplierVariant.meta.pricingKey`, skip missing original keys and ambiguous matches under `result.pricing.skipped`.
  - Drift reporting now follows the same generic and supplier mapping rules used by the sync service.
  - Updated plan: `brain/plans/2026-06-12-feature-pending-02-inventory-variant-supplier-price-sync-to-dyke.md`
  - Updated tasks: `brain/tasks/roadmap.md`, `brain/tasks/done.md`
  - Validation: `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts` passed with 34 tests and 81 assertions. No broad typecheck, build, dev server, browser test, or curl check was run.

- Completed Inventory Pending 17 cutover gap audit execution matrix.
  - Report: `brain/reports/2026-06-15-inventory-cutover-gap-audit.md`
  - Updated plan: `brain/plans/2026-06-15-investigation-inventory-cutover-gap-audit.md`
  - Updated tasks: `brain/tasks/roadmap.md`, `brain/tasks/done.md`
  - Updated feature pointer: `brain/features/inventory-backed-sales-fulfillment.md`
  - Findings: inventory foundations are broad but cutover remains incomplete; next recommended build order starts with Pending 02 price sync, Pending 03 production lifecycle bridge, Pending 08 production readiness gates, Pending 04 dispatch inventory mode, Pending 05 shipment record decision, Pending 06 print parity, and Pending 16 operations dashboard stock controls.
  - Validation: read-only audit; no builds, typechecks, dev servers, browser tests, or curl checks were run.

## 2026-06-12

- Approved Pending 01 inventory-to-Dyke sync fix-2 after Codex review.
  - Review: `brain/reviews/2026-06-12-inventory-to-dyke-sync-pending-01-review-v4.md`
  - Queue item: `2026-06-12-gnd-pending-01-inventory-to-dyke-fix-1` marked approved
  - Validation: focused sync tests pass (29 tests / 65 assertions), `git diff --check` clean, inventory typecheck still limited to known baseline caveats
  - Broader inventory-backed fulfillment master task remains in progress for later slices

- Completed Pending 01 inventory-to-Dyke sync fix (fix-2 handoff from `brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-2.md`).
  - Added focused regression tests proving `updateVariantStatus(...)` queues `sync-inventory-to-dyke` for both the update branch (`inventoryId`, `inventoryVariantId`, `source: "variant-form"`) and the create branch (with the created variant id)
  - Added idempotency test: repeated archive sync reports `pricing.archived = 0` when active Dyke pricing rows are already gone
  - The core implementation (variant archive soft-delete, draft variant skip, `updateVariantStatus` queue wiring) was already in place from the prior submission
  - Checks: `bun test packages/inventory/src/application/sync/inventory-to-dyke-sync.test.ts` — 29 tests / 65 assertions, 0 failures; `git diff --check` clean
  - `@gnd/inventory` typecheck still fails on known baseline issues: `bun:test` type declarations and `inbound-demand.ts: lineItemComponentIds` — no new errors from touched sync/inventory files

- Fixed local dev `with-env` script resolution for `bun run mobile-jobs`.
  - replaced ambiguous workspace `dotenv` calls with explicit `node ../../node_modules/dotenv-cli/cli.js` invocations across app/package scripts so local commands no longer resolve to a system Python `dotenv` executable
  - verified `bun run mobile-jobs` reaches ready states for `@gnd/www`, `@gnd/site`, Expo Metro, and Trigger dev instead of failing with immediate SIGKILL exits
  - stopped the validation dev stack and cleaned the portless proxy listener after the smoke run

- Re-ran manual `brain-review-handoff` review for Pending 01 after checking the active fix handoff state.
  - no submitted queue item exists, so no queue item was updated
  - result remains `Needs Fix`; the existing fix handoff has not been implemented in the current worktree
  - saved repeat review at `brain/reviews/2026-06-12-inventory-to-dyke-sync-pending-01-review-v2.md`
  - gates: focused sync test passed with 20 tests / 41 assertions; `git diff --check` passed; `@gnd/inventory` typecheck still fails on known baseline `bun:test` declarations and `inbound-demand.ts`

- Reviewed Pending 01 `Full inventory-to-Dyke sync for create/update/delete/archive` against `brain/handoffs/inventory-to-dyke-sync-handoff.md`.
  - previous pricing skip, supplier pricing key, category archive result, and weak-test findings are fixed
  - review remains `needs fix` because `updateVariantStatus(...)` does not queue inventory-to-Dyke sync and archived/deleted variants are not projected into `DykePricingSystem.deletedAt`
  - saved review at `brain/reviews/2026-06-12-inventory-to-dyke-sync-pending-01-review.md` and fix handoff at `brain/handoffs/fixes/2026-06-12-inventory-to-dyke-sync-pending-01-fix-1.md`
  - gates: focused sync test passed with 20 tests / 41 assertions; `git diff --check` passed; `@gnd/inventory` typecheck still fails on known baseline `bun:test` declarations and `inbound-demand.ts`

- Refined `Inventory Pending 02 - Inventory Variant Supplier Price Sync To Dyke` with `brain-plan-handoff`.
  - kept status `Proposed` and retained the existing roadmap task
  - made the plan handoff-ready with explicit dependency on Pending 01, concrete generic/supplier pricing mapping rules, skip-result requirements, focused seeded-delegate tests, and Brain update requirements

- Created Brain plans for `Pendings By Importance` items 2-15 from the inventory-backed sales fulfillment cutover list.
  - each plan file uses a serial-numbered filename from `pending-02` through `pending-15`
  - added one companion `Roadmap` task per plan in `brain/tasks/roadmap.md`, all with `Plan Status: Proposed`

- Updated the inventory-to-Dyke handoff after the second fix review.
  - added the remaining fix pass: pricing skips must return under `pricing.skipped`, supplier pricing must not create from guessed generated keys, category archive counts must be preserved in result/schema, and focused tests must use table-specific seeded delegates that actually exercise sync paths
  - recorded validation state: focused test currently passes but does not prove the reviewed behavior; drift-report typecheck errors are gone, while broader inventory typecheck still has unrelated baseline/test-type noise

- Updated the inventory-to-Dyke handoff after review of the completed implementation attempt.
  - added the required fix pass: drift report typecheck failures, generic pricing dependency-key mapping, supplier pricing legacy-key preservation, category archive sync, drift step/category filter semantics, and focused test requirements
  - clarified that the next agent should fix the existing worktree implementation rather than restart from the old baseline

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
- 2026-06-16: Added the repeatable inventory validation fixture preflight command `bun run inventory:validation-fixtures`, backed by `scripts/inventory-validation-fixture-report.ts`. The script wraps `inventoryBrowserValidationFixtureReport`, defaults to the local `gnd-prisma2` MySQL URL when `DATABASE_URL` is unset, supports human and `--json` output, and offers `--fail-on-blocked` for CI-style gates while staying read-only. Validation: `bun scripts/inventory-validation-fixture-report.ts --help` passed; the live report command reached its DB reachability guard and stopped because local MySQL was unavailable at `127.0.0.1:3306`, so no fixture fanout or mutation was run.
- 2026-06-16: Added count-source diagnostics to the inventory browser validation fixture report. Each fixture row now carries `countDiagnostic` metadata, and the report-level diagnostics list incomplete count categories when readiness is derived from a bounded application scan rather than a complete SQL count. Held partial shipment readiness now reports its candidate scan limit/count, and low-stock readiness reports its monitored-variant scan limit/count; the root CLI prints incomplete-count warnings in human output. Validation: `bun test packages/inventory/src/inventory-item-dashboard.test.ts` passed with 7 tests / 27 assertions; `bun run inventory:validation-fixtures --help` passed; `bun --cwd apps/api -e "await import('@gnd/inventory'); console.log('inventory package import ok')"` passed.
- 2026-06-16: Surfaced inventory validation fixture count diagnostics in the `/inventory` panel. `InventoryValidationFixturePanel` now renders a compact bounded-count notice when the report includes incomplete count diagnostics, and affected fixture rows show a bounded-count badge, scan/candidate details, and the package-owned diagnostic note. Validation: `bun --cwd apps/www -e "await import('./src/components/inventory/inventory-validation-fixture-panel.tsx'); console.log('inventory validation fixture panel import ok')"` passed; focused inventory fixture tests still pass with 7 tests / 27 assertions.
- 2026-06-16: Added `brain/reports/2026-06-16-inventory-validation-fixture-seed-plan.md`, a controlled local/staging fixture setup plan for the inventory browser mutation matrix. It defines the minimal fixture set (`INV-FIX-ALLOC`, `INV-FIX-INBOUND`, `INV-FIX-RECEIVED`, `INV-FIX-PARTIAL`, `INV-FIX-STOCK-LOW`, and `INV-FIX-STOCK-SAFE`), required preflight categories, safe setup sequence, and completion gate before browser validation. Linked the seed plan from the readiness, evidence, and Dyke/inventory roadmap docs. Validation: scoped `git diff --check` passed for the new report and linked Brain docs.
- 2026-06-16: Connected the inventory validation fixture report to the fixture seed plan. Package-owned fixture rows and `missingFixtures` now include `seedFixtureId` and `seedPlanHref`, the CLI prints the seed ID/plan path for every fixture category, and the `/inventory` validation panel shows the seed ID beside fixture counts and missing-fixture guidance. This lets a blocked preflight map directly to `INV-FIX-*` setup work. Validation: focused inventory fixture tests and import checks were rerun for the package report, CLI help, inventory panel, and API import.
- 2026-06-16: Hardened the grouped seed-fixture diagnostic contract for the inventory validation preflight. `packages/inventory/src/inventory-item-dashboard.test.ts` now asserts that multiple missing allocation categories collapse into one `INV-FIX-ALLOC` entry in `diagnostics.seedFixturesToPrepare`, preserving the shortcut from blocked categories to the minimal fixture setup work. Validation: focused inventory fixture tests passed with 8 tests / 30 assertions and scoped `git diff --check` passed.
- 2026-06-16: Added Markdown snapshot output to the inventory validation fixture preflight. `bun run inventory:validation-fixtures --markdown` now emits a Brain-ready fixture readiness table with seed-fixture and count-diagnostic columns, while `--json --markdown` is rejected to keep CLI output modes unambiguous. Validation: CLI help and mutual-exclusion checks passed; the live Markdown run reached local MySQL and returned blocked with 0/11 required fixture categories ready.
- 2026-06-16: Added read-only seed checklist output to the inventory validation fixture preflight. `bun run inventory:validation-fixtures --seed-checklist` now groups missing categories by `INV-FIX-*` seed fixture and prints each package-owned workspace/action, giving operators a concrete setup list before any DB-mutating fixture work. Validation: focused CLI help, mixed-output rejection, seed checklist, Markdown snapshot, and scoped `git diff --check` were run.
- 2026-06-16: Added read-only seed blueprint output and tightened safe-stock fixture readiness. `bun run inventory:validation-fixtures --seed-blueprint` now prints row families, validation predicates, and rollback order for each missing `INV-FIX-*` seed group. The safe stock-adjustment fixture now requires a monitored non-custom variant with a positive stock row instead of any monitored variant, avoiding false-ready stock operation proof. Validation: focused inventory dashboard tests passed with 8 tests / 30 assertions; blueprint and Markdown CLI modes reached local MySQL and still report blocked 0/11 fixture readiness.
- 2026-06-16: Added a default-dry-run stock fixture seed helper. `bun run inventory:seed-stock-fixtures` now plans the `INV-FIX-STOCK-LOW` and `INV-FIX-STOCK-SAFE` category/item/variant/stock rows and only writes them when explicitly run with `--apply`; dry-run output uses planned references instead of fake numeric ids. Validation: help, human dry-run, and JSON dry-run all reached local MySQL without mutating data.
- 2026-06-16: Added stock fixture rollback support and applied the stock-only validation fixtures locally. `bun run inventory:seed-stock-fixtures --rollback` now dry-runs soft-delete cleanup in dependency order, while `bun run inventory:seed-stock-fixtures --apply` created `INV-FIX-STOCK-LOW` (variant id `2065`, stock `0`) and `INV-FIX-STOCK-SAFE` (variant id `2066`, stock `10`). The preflight now reports `2/11` ready and `9` missing. Rollback was dry-run only, not applied.
- 2026-06-16: Added and applied the allocation lifecycle validation fixture. `bun run inventory:seed-allocation-fixture` now dry-runs/applies/rollback-dry-runs `INV-FIX-ALLOC`, creating sale `23024`, line `20`, component `116`, variant `2067`, and allocation ids `1`-`4` for pending review, approved, reserved, and picked states. Partial-shipment readiness now checks active allocation against ordered quantity so complete allocation fixtures do not count as partial. Latest `bun run inventory:validation-fixtures --markdown` reports `6/11` ready and `5` missing: `INV-FIX-INBOUND`, `INV-FIX-RECEIVED`, and `INV-FIX-PARTIAL`.
- 2026-06-16: Added and applied the inbound demand/receiving validation fixture. `bun run inventory:seed-inbound-fixture` now dry-runs/applies/rollback-dry-runs `INV-FIX-INBOUND`, creating supplier `7`, sale `23025`, line `21`, component `117`, variant `2068`, shipment `1`, shipment item `1`, and ordered inbound demand `1`. Latest `bun run inventory:validation-fixtures --markdown` reports `8/11` ready and `3` missing: `INV-FIX-RECEIVED` and `INV-FIX-PARTIAL`.
- 2026-06-16: Completed the local inventory browser-validation fixture setup gate. `bun run inventory:seed-received-fixture --apply` created `INV-FIX-RECEIVED` with supplier `8`, sale `23026`, line `22`, component `118`, variant `2069`, shipment `2`, shipment item `2`, and partially received demand `2`. `bun run inventory:seed-partial-fixture --apply` created `INV-FIX-PARTIAL` with sale `23027`, variant `2070`, stock `4`, available line/component/allocation `23`/`119`/`5`, and held line/component/allocation `24`/`120`/`6`. Latest `bun run inventory:validation-fixtures --markdown` reports `ready`, `11/11` ready, and `0` missing; the next gate is browser mutation evidence.
- 2026-06-16: Migrated the sales statistics/product report pages to the tables-2 standard. `/sales-book/top-selling-products` and `/product-report` now render `components/tables-2/sales-statistics/*` with the existing `sales.getProductReport` query, existing product-report filter params/hook, and existing `ProductReportHeader` / `ProductReportSearchFilter`; no new v2 query, filter param, filter endpoint, or route was added. Removed the now-unused `components/tables/sales-statistics/*` legacy files after import scans, kept `components/tables-2/core` untouched, and added `brain/features/sales-product-report-table.md`. Validation: focused Biome passed, `git diff --check` passed, filtered `@gnd/www` typecheck had no diagnostics for the product-report slice while full typecheck remains blocked by existing baseline errors, Browser smoke passed for `/sales-book/top-selling-products`, `/sales-book/top-selling-products?q=door`, and `/product-report`, and HTTP probes returned `200 OK` for the same routes.
- 2026-06-16: Removed the remaining legacy quote-table P.O display from `components/tables/sales-quotes/columns.tsx` by deleting the P.O column and mobile PO badge. The active `/sales-book/quotes` and `/sales-book/quotes/bin` routes already render `components/tables-2/sales-quotes/*` without P.O; this follow-up keeps the still-live sales-rep quote embed from reintroducing it before that slice migrates. Validation: static scan found no P.O column/mobile PO renderers in either quote table folder, `git diff --check` passed for the touched legacy quote file, and `components/tables-2/core` has no diff. Focused Biome on the legacy quote file remains blocked by pre-existing file debt (`noExplicitAny`, click-handler a11y, and whole-file formatting), so no broad reformat was applied.
- 2026-06-16: Migrated the inventory products/components list pages to the tables-2 standard. `/inventory` and `/inventory/components` now render `components/tables-2/inventory-products/*` with the existing `inventories.inventoryProducts` query, existing inventory filter params/hook, and existing `InventoryHeader` / `InventorySearchFilter`; no new v2 query, filter param, filter endpoint, route fork, or core table change was added. Removed the now-unused `components/tables/inventory-products/*` legacy files after import scans, kept `components/tables-2/core` untouched, and added `brain/features/inventory-products-table.md`. Validation: focused Biome passed, `git diff --check` passed for the inventory slice, filtered `@gnd/www` typecheck had no diagnostics for touched inventory route/table/header/settings/config files while full typecheck remains blocked by existing baseline errors, Browser smoke passed for `/inventory`, `/inventory?q=Validation`, `/inventory/components`, and `/inventory/components?q=Validation` across desktop and mobile `390x844`, with no document-level mobile overflow and table-owned horizontal scrolling.
- 2026-06-16: Migrated `/inventory/categories` to the tables-2 standard. The route now renders `components/tables-2/inventory-categories/*` with the existing `inventories.inventoryCategories` query, existing inventory filter params/hook, and existing `CategoryHeader`; no new v2 query, filter param, filter endpoint, route fork, or core table change was added. The header now reuses the existing inventory Midday search-filter surface with a `Search Categories` placeholder. Removed the now-unused `components/tables/inventory-categories/*` legacy files after import scans, kept `components/tables-2/core` untouched, and added `brain/features/inventory-categories-table.md`. Validation: focused Biome passed, `git diff --check` passed for the category slice, filtered `@gnd/www` typecheck had no diagnostics for touched category route/table/header/settings/config files while full typecheck remains blocked by existing baseline errors, Browser smoke passed for `/inventory/categories`, `/inventory/categories?q=door`, mobile `390x844` `/inventory/categories`, and `/inventory/categories?productKind=component` in the Pablo Cruz / Super Admin session, with no document-level mobile overflow and table-owned horizontal scrolling.
- 2026-06-16: Migrated the `/inventory/imports` diagnostic table section to the tables-2 standard inside the existing control center. The page now renders `components/tables-2/inventory-import/*` from the control center's existing `inventories.inventoryImports` query result, preserves existing inventory import filter params/hook and import actions, adds table-2 persisted columns/virtualized rows, and removes the now-unused `components/tables/inventory-import/*` legacy files after import scans. No new v2 query, filter param, filter endpoint, route fork, or core table change was added. The route now awaits the existing import prefetch and the control center reads it with `useSuspenseQuery`, fixing a browser-observed hydration mismatch without changing the query contract. Added `brain/features/inventory-import-table.md`. Validation: focused Biome passed, `git diff --check` passed for the imports slice, filtered `@gnd/www` typecheck had no diagnostics for touched imports route/table/control-center/settings/config files while full typecheck remains blocked by existing baseline errors, import scans were clean, `components/tables-2/core` has no diff, HTTP smoke returned `200` for `/inventory/imports` and `/inventory/imports?scope=all`, and Browser smoke passed with the Pablo Cruz / Super Admin `PC` account signal on desktop `/inventory/imports`, desktop `/inventory/imports?scope=all`, desktop `/inventory/imports?scope=all&q=door`, and mobile `390x844` `/inventory/imports?scope=all` with no document-level horizontal overflow.
- 2026-06-16: Migrated `/community/builders` to the tables-2 standard. The route now renders `components/tables-2/community-builders/*` with the existing `community.getBuilders` query, existing builder filter params/hook, existing `BuilderHeader` search/filter surface, and existing `openBuilderId` modal behavior; no new v2 query, filter param, filter endpoint, route fork, or core table change was added. Removed the now-unused `components/tables/builder/*` legacy files after import scans and added `brain/features/community-builders-table.md`. Validation: focused Biome passed, `git diff --check` passed for the builders slice, filtered `@gnd/www` typecheck had no diagnostics for touched builders route/table/header/settings/config files while full typecheck remains blocked by existing baseline errors, import scans were clean, `components/tables-2/core` has no diff, and Browser smoke passed with Quick Login as Pablo Cruz / Super Admin on desktop `/community/builders`, desktop `/community/builders?q=Mattamy`, and mobile `390x844` `/community/builders` with no document-level horizontal overflow.
- 2026-06-16: Migrated `/community/templates` to the tables-2 standard. The route now renders `components/tables-2/community-templates/*` with the existing `community.getCommunityTemplates` query, existing template filter params/hook, existing `CommunityTemplateHeader` actions, existing template modal/model-cost/install-cost/preview/delete behavior, and a lazy Midday search-filter adapter over the existing `filters.communityTemplateFilters` endpoint; no new v2 query, filter param, filter endpoint, route fork, or core table change was added. Removed the now-unused `components/tables/community-template/*` files and old `CommunityTemplateSearchFilter` wrapper after import scans, and added `brain/features/community-templates-table.md`. Validation: focused Biome passed, `git diff --check` passed for the templates slice, filtered `@gnd/www` typecheck had no diagnostics for touched templates route/table/header/settings/config files or the retargeted legacy install-cost modal row type while full typecheck remains blocked by existing baseline errors, import scans were clean, `components/tables-2/core` has no diff, HTTP smoke returned `200` for `/community/templates`, and Browser smoke passed with Quick Login as Pablo Cruz / Super Admin on desktop `/community/templates`, desktop `/community/templates?q=2795`, and mobile `390x844` `/community/templates` with no document-level horizontal overflow.
- 2026-06-16: Migrated `/community/customer-services` to the tables-2 standard. The route now renders `components/tables-2/customer-service/*` with the existing `customerService.getCustomerServices` query, existing customer-service filter params/hook, existing `CustomerServiceHeader`, existing Punchout employee query for assignment, and existing work-order edit/status/assign/delete behavior; no new v2 query, filter param, filter endpoint, route fork, or core table change was added. Removed the now-unused `components/tables/customer-service/*` files after import scans and added `brain/features/customer-service-table.md`. Browser validation also found and fixed an invalid shared summary-card skeleton nested inside text elements in `packages/ui/src/components/custom/summary-card-skeleton.tsx`, removing fresh hydration warnings from the customer-services summary widgets. Validation: focused Biome passed, `git diff --check` passed for the customer-service slice, filtered `@gnd/www` typecheck had no diagnostics for touched customer-service route/table/header/settings/config files while full typecheck remains blocked by existing baseline errors, import scans were clean, `components/tables-2/core` has no diff, HTTP smoke returned `200` for `/community/customer-services`, and Browser smoke passed with Quick Login as Pablo Cruz / Super Admin on desktop `/community/customer-services`, desktop `/community/customer-services?q=Yanaixy`, and mobile `390x844` `/community/customer-services` with no document-level horizontal overflow.
- 2026-06-16: Migrated `/community/unit-invoices` to the tables-2 standard. The route now renders `components/tables-2/unit-invoices/*` with the existing `community.getUnitInvoices` query, existing unit-invoice filter params/hook, existing `UnitInvoicesHeader`, existing report menu, and existing `editUnitInvoiceId` modal behavior; no new v2 query, filter param, filter endpoint, route fork, or core table change was added. The old `components/tables/unit-invoices/*` files remain because the project overview widget still imports the legacy embeddable table. Browser validation also found and fixed a shared `CustomModal` Radix title/description id issue so row-open invoice dialogs no longer emit fresh accessibility errors. Added `brain/features/unit-invoices-table.md`. Validation: focused Biome passed, `git diff --check` passed for the unit-invoices slice, filtered `@gnd/www` typecheck had no diagnostics for touched unit-invoices route/table/header/settings/config files or `CustomModal` while full typecheck remains blocked by existing baseline errors, `components/tables-2/core` has no diff, HTTP smoke returned `200` for `/community/unit-invoices`, and Browser smoke passed with Quick Login as Pablo Cruz / Super Admin on desktop `/community/unit-invoices`, existing `q` search binding, mobile `390x844`, and row-open modal behavior with no document-level horizontal overflow.
- 2026-06-18: Continued the `apps/www` unused/old code cleanup with package-dependency/tooling slices. After exact app import/config scans, removed 35 more stale `@gnd/www` runtime package declarations (`@dnd-kit/modifiers`, `@gnd/email`, `@gnd/events`, `@headlessui/react`, `@radix-ui/react-dialog`, `@radix-ui/react-icons`, `@react-hook/async`, `@react-pdf/renderer`, `@tiptap/*`, `@trpc/*`, `aos`, `autoprefixer`, `cmdk`, `debounce`, `embla-carousel-*`, `focus-trap-react`, `fs-extra`, `nanoid`, `next-themes`, `puppeteer`, `react-beautiful-dnd`, `react-colorful`, `react-wrap-balancer`, `swr`, `ts-results`, `tus-js-client`, `use-deep-compare-effect`, `uuid`, and `xlsx`), removed the stale commented `@gnd/events/client` layout import, deleted old unreferenced `apps/www/tailwind-copy.config`, removed its private `tailwindcss-animate` / `@tailwindcss/typography` deps, removed the unused package-local `vercel` CLI dev dependency, and refreshed `bun.lock`. Full Knip snapshot `/tmp/gnd-www-knip-full-20260618-after-tooling1-lock.json` now reports 20 file candidates, 3 runtime dependency candidates, 1 dev dependency candidate, 5 unlisted candidates, 5 unresolved candidates, and 551 export candidates; remaining package candidates are tooling/config-sensitive and retained for separate review.
- 2026-06-18: Repaired the remaining `apps/www` Knip unresolved import candidates in legacy sales type code. Stale `@/app/(v2)/(loggedIn)/sales-v2/type` imports now point to the existing `@/app-deps/(v2)/(loggedIn)/sales-v2/type` module, and that module no longer imports deleted private v2 form-action files; it now declares the legacy form shape structurally for the still-live old-sales-form type consumers. Full Knip snapshot `/tmp/gnd-www-knip-full-20260618-after-unresolved1.json` now reports 20 file candidates, 3 runtime dependency candidates, 1 dev dependency candidate, 5 unlisted candidates, 0 unresolved candidates, and 551 export candidates.
- 2026-06-19: Restored the mobile new-invoice customer handoff to the original first-item workflow behavior after the fresh-state audit made the items screen start empty after customer selection. `selectCustomer` now seeds the blank workflow `New Line` only when the selected form has no line items, preserving the customer gate while showing the inline `Item Type` step pills/component grid immediately after customer selection. Validation: focused invoice-form store regression test passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Fixed the remaining mobile new-invoice first-item regression where create-mode bootstrap hydration could overwrite the selected customer's seeded blank workflow line with an empty line-item array after route handoff. Empty create bootstrap now preserves the current selected customer's `New Line` workflow item, or reseeds it when the bootstrap already carries a selected customer, so the original `Item Type` step pills/component grid remain visible after customer selection. Validation: focused invoice-form store regression test passed and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Added a pure mobile items-step section boundary so the seeded first workflow line is explicitly recognized as the active workflow section for inline step-pill rendering without mounting the React Native UI. The focused proof now covers customer selection seeding, empty create-bootstrap preservation, seeded workflow section detection, and both native UI package boundary tests. No dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Removed the mobile invoice-form dependency on the shared `componentLabel` export after Expo reported the symbol as unavailable. Mobile workflow component titles, selected step-pill labels, and HPT door labels now use a native-local formatter in `workflow-selectable-copy`, preserving uppercase display without relying on the sales-form-core barrel. Validation: focused workflow-copy, step-pill, HPT row-group, native UI boundary, and sales-form-core native-safety tests passed; scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Fixed legacy-strategy sales-form summary totals so credit-card convenience charges are included in `grandTotal` instead of only being exposed as `ccc`. This cleared the broader new-sales-form save/hydrate assertions where credit-card/HPT quote totals were equal to subtotal after hydration. Validation: focused costing and API new-sales-form relational tests passed as part of the 58-test mobile/sales-form regression pack; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened mobile House Package Tool reopened-row grouping without changing the main workflow step system. Component-less legacy/imported HPT size rows now attach to the only selected door group, matching the website panel fallback instead of showing an empty selected door and a separate manual group. Validation: focused HPT row-group tests passed and scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened Door/Moulding multi-select selected-count detection without touching the main workflow step UI. The shared `getSelectedProdUids` helper now reads selected UIDs from nested `step.meta` as well as outer form-step metadata, including JSON-string metadata, so reopened Door/Moulding multi-select steps can still show the floating Proceed action when selections were persisted in nested metadata. Validation: focused mutation-engine, workflow-moulding-action, and mobile proceed-visibility tests passed; scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Removed another mobile workflow UID-copy leak from the inline invoice item description input without changing workflow routing or selection. Extracted item-step display copy into a pure helper so placeholder/UID-like workflow descriptions (`WF-ITEM`, `workflow-*`, `mobile-*`, and UID-ish metadata strings) render as blank while human descriptions remain visible. Validation: focused item-step copy, item-selector copy, and line-item display tests passed; scoped whitespace checks passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Fixed the mobile Door/Moulding multi-select Proceed visibility regression reported during manual testing. The floating Proceed helper now treats Door and Moulding selected state as explicit visibility inputs, so the button remains visible after more than one selection even if the generic picker flag changes. Door card taps now persist the selected Door component before opening the Door Size route, preserving the existing size workflow while giving the Door step immediate selected metadata for the Proceed button. Validation: focused `workflow-proceed-visibility` test passed and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened the mobile invoice form store's service-row taxable metadata patch without changing runtime behavior. `buildLineTaxablePatch` now carries an explicit parsed metadata shape with optional `serviceRows`, keeping grouped service-row tax propagation type-stable while preserving the shared object-or-JSON metadata path. Validation: focused invoice-form store regression test passed and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened the mobile invoice form API action hook around generated tRPC mutation input types without changing the user-facing form flow. Save draft/final calls now bridge through the generated mutation input aliases, and server recalculation strips the mobile-local `cccPercentage` field before calling `newSalesForm.recalculate` because that percentage is used by the local summary calculator but is not part of the server recalculate schema. Validation: scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Stabilized the mobile invoice form search hook around generated tRPC query option types without changing the customer/item picker behavior. Disabled customer/product/workflow queries now still use their real tRPC `queryOptions` with `enabled: false` instead of hand-written placeholder query objects, while the hook continues to use the shared recent-customer request helper and UID-safe workflow selectable copy helpers. Validation: focused customer-search-options and workflow-selectable-copy tests passed, scoped `git diff --check` passed, and no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened the mobile floating invoice action regression test fixtures so they use valid React nodes while still proving refresh-key and node-identity updates for the shared FAB/custom/proceed host. Validation: focused floating action registry/layout tests passed and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened the mobile HPT row-group tests around JSON-string metadata fixtures. The two tests that intentionally pass stringified row metadata now cast through `unknown` before `DoorStoredRow[]`, keeping object-metadata fixtures directly typed while preserving coverage for reopened JSON metadata grouping and UID-safe fallback labels. Validation: focused HPT row-group tests passed and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Tightened mobile invoice workflow component scrolling behavior. Component search now appears only when the active step has more than 15 components, the step pills/search stay fixed above the scrolling component grid, and scroll-down/up behavior hides or reveals the normal Save Draft/Create footer while preserving centered workflow Proceed actions by moving their lane lower when the footer is hidden. Validation: focused workflow-step-rendering and floating-action-layout tests passed, scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Followed up on the mobile workflow component scrolling fix after Expo reported a nested `VirtualizedLists` warning and manual QA showed the whole invoice screen should remain the scroller. Inline workflow selectors now render component cards as normal content in the invoice form ScrollView, while a screen-level sticky workflow header mirrors the step pills/search once that section reaches the top under the invoice header. The footer-hidden state now also collapses the form and item bottom padding so hiding Save Draft/Create does not leave a large blank reserve. Overlay selectors still use `FlatList` because they are not nested in the parent form scroll. Validation: focused workflow-step-rendering and floating-action-layout tests passed, scoped `git diff --check` passed, and a targeted scan confirmed inline mode no longer owns a nested vertical VirtualizedList/ScrollView.
- 2026-06-19: Fixed the sticky workflow header maximum-update-depth regression. The inline workflow selector no longer pushes a freshly-created React node into parent state on every render; it now sends a keyed sticky-header entry, and the invoice form only updates sticky state when that key changes or the sticky header clears. This preserves the full-screen scroll plus sticky step pills/search behavior without a render-effect loop. Validation: focused workflow-step-rendering and floating-action-layout tests passed, scoped `git diff --check` passed, and a targeted scan confirmed the old unstable `setStickyWorkflowHeader(node)` path is gone.
- 2026-06-19: Removed the remaining hidden-footer layout reserve in the mobile invoice form. The Save Draft/Create footer now renders as an absolute bottom overlay instead of occupying normal screen layout, and hidden-footer state drops both the form and item-section bottom padding to zero so scrolling content no longer stops above a blank footer slot when the actions slide away. Validation: focused workflow-step-rendering and floating-action-layout tests passed, scoped `git diff --check` passed, and a targeted scan confirmed the footer overlay plus zero hidden padding wiring.
- 2026-06-19: Polished the mobile Door Size picker footer actions. The picker footer now uses a sticky bottom action bar with a subtle top border, larger rounded buttons, the secondary `OK` action on the left as an outline button, and the primary `Next step`/`Apply` action emphasized on the right or full-width when secondary is hidden. Validation: scoped `git diff --check` passed for the Door Size footer file; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Reworked the mobile Door Size picker footer after design review. The rejected side-by-side OK/Next footer was replaced with a calmer native action stack: a compact selected-door/status row, a quiet ghost `OK` action when present, and one full-width primary `Next step`/`Apply` button whose zero-quantity disabled state uses the muted secondary treatment instead of a heavy primary slab. The footer keeps extra bottom breathing room because the Expo `SafeArea` helper only pads the top on Android. Validation: scoped `git diff --check` passed for the Door Size footer file; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Adjusted the mobile Door Size picker quantity columns after device review. LH/RH input columns are wider, the total column/gap is tighter, and the quantity group sits farther right beside the total without changing pricing or row-save behavior. Validation: scoped `git diff --check` passed for the Door Size picker and Brain progress files; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Redesigned the mobile invoice items bottom sheet. The sheet now uses content-estimated snap points plus dynamic sizing so it opens closer to the available item content, item rows use tighter rounded list cards with a clearer selected check treatment, and the add action is a full-width primary `+ Item` control pinned above the safe bottom area. Validation: focused `items-step-sheet` test passed and scoped `git diff --check` passed for the touched item sheet files; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Fixed inline workflow Proceed placement in the mobile invoice form. Inline Door/Moulding Proceed no longer renders at the end of the component list; it now registers with the screen-level floating action host like overlay workflows, stays centered above the invoice footer, and uses the existing animated footer-hidden offset so it moves lower when the footer actions hide and back up when they return. Validation: focused floating-action-layout and workflow-step-rendering tests passed, and scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Realigned the mobile Door Size picker footer with the main invoice action footer style. The size modal now uses the same compact background/padding, row gap, ghost secondary `OK` button, and `h-11` rounded primary `Next step`/`Apply` button pattern as `InvoiceFormFooter`; the taller custom status/action stack and extra list padding were removed. Validation: scoped `git diff --check` passed for the Door Size picker file; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Fixed the follow-up inline Door/Moulding Proceed visibility regression and capped Moulding component results. Inline workflow selectors now publish a keyed Proceed action entry through `ItemsStep` to `InvoiceFormScreen`, keeping the screen-level floating host responsible for rendering the button after Door Size or Moulding line patches; the key refreshes when the backing line changes so the handler stays current. Moulding component grids now apply the workflow component visible limit of 15 after optional search filtering. Validation: focused workflow-step-rendering, workflow-proceed-visibility, and floating-action-layout tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Adjusted the mobile invoice item switcher sheet so the add-item button appears directly after the invoice item rows inside the sheet content instead of as a fixed bottom footer. Validation: scoped `git diff --check` passed for the item sheet file and Brain notes; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Fixed Door/Moulding multi-select Proceed visibility while selected component metadata is still rehydrating through the mobile invoice form store. The workflow selector now tracks local pending multi-select card taps per line/step, feeds that count into the Proceed visibility fallback, clears it once real step metadata catches up, and recognizes Moulding/Molding plural title variants as Moulding steps. Validation: focused workflow-step-rendering, workflow-proceed-visibility, and floating-action-layout tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Followed up on the Door/Moulding multi-select Proceed regression by removing the fragile parent-stored inline Proceed node handoff. Inline workflow selectors now mount their `FloatingInvoiceAction` directly under the shared host like overlay selectors, while stale persisted `mouldingRows` no longer force a newly selected non-moulding route into the `moulding-line-item` family. Validation: focused workflow-step-rendering, workflow-proceed-visibility, floating-action-layout, and shared step-family tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Fixed the remaining mobile Moulding Proceed visibility gap where category pills such as `FLAT BOARD (...WOOD PRIMED)` were not recognized as moulding multi-select steps. The inline selector now treats non-root, non-Line Item component picker steps inside a Moulding item as moulding selection steps, so selected category cards register the centered floating Proceed action while the final Moulding line-item editor remains separate. Validation: focused workflow-step-rendering, workflow-proceed-visibility, floating-action-layout, and shared step-family tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Fixed the follow-up mobile multi-select Proceed rendering issue by moving inline Proceed back to the screen-owned keyed action handoff instead of relying on direct registration from inside the invoice form scroller. The floating-action registry now treats `refreshKey` as the explicit update boundary rather than React node identity, avoiding action churn while still refreshing Proceed when selected UIDs, active step, visible components, or footer state changes. Validation: focused floating-action registry, workflow-step-rendering, workflow-proceed-visibility, floating-action-layout, and shared step-family tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Reworked the inline mobile multi-select Proceed rendering path again after device testing still showed no button. Inline selectors now publish only a keyed Proceed button plus footer offset, and `InvoiceFormScreen` renders that button directly in an absolute animated frame above the footer instead of routing it through the floating-action host registry. The inline visibility fallback also now treats any visible selected component in the active picker as enough to surface Proceed, covering configured multi-select steps whose titles are not in the small built-in multi-select title list. Validation: focused floating-action registry, workflow-step-rendering, workflow-proceed-visibility, floating-action-layout, and shared step-family tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Followed up on the inline Proceed regression by removing the last child-rendered button handoff. `WorkflowStepSelector` now publishes only a stable Proceed callback plus footer offset, and `InvoiceFormScreen` owns the actual absolute pill button with explicit Android `elevation`/`zIndex`. The parent action state now also refreshes when the callback or offset changes under the same visual key, preventing stale handlers without storing child React elements. Validation: focused floating-action registry, workflow-step-rendering, workflow-proceed-visibility, floating-action-layout, and shared step-family tests passed; scoped `git diff --check` passed; no dev server, broad typecheck/build, or UI automation was run per fast Bun monorepo discipline.
- 2026-06-19: Updated the mobile Sales Dashboard Recent Sales section to render the shared actual order sales card used by the mobile Orders list instead of the old compact dashboard-only row. The dashboard overview now includes `customerPhone`, and a focused mapper converts recent sales into `SalesDocumentCard` items with total/paid/due, date, phone, and delivery-option fields while preserving order-detail navigation. Validation: focused recent-sales mapper test passed; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or device automation was run.
- 2026-06-19: Wired the mobile inline Moulding `Line Item` step to the invoice line-item editor surface, matching the website new-sales-form `StepSection` boundary. `WorkflowStepSelector` now only reports the active grouped line-item step, while `ItemsStep` renders a shared native `WorkflowMouldingLineItemEditor` below the selector; the old inline placeholder notice is suppressed only for that wired Moulding final step. The editor reuses the existing moulding row features for row thumbnails, qty, calculator, add-on, nullable custom price, estimate, totals, and final-row removal protection through shared sales-form-core patches. Validation: focused workflow-step-rendering test passed and scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Hotfixed the inline workflow Proceed handoff after device testing reported a maximum-update-depth crash in `InvoiceFormScreen`. `WorkflowStepSelector` now passes a stable inline Proceed callback that delegates to the latest proceed handler through a ref, so the parent action state no longer loops on fresh callback identity. The workflow step pills also opt into `will-change-pressable` to avoid ReactNativeCss remount warnings when selected/active styles change. Validation: focused workflow-step-rendering test passed and scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Hotfixed the second mobile Moulding `Line Item` update-depth crash where the inline final-step editor patched the invoice line from its mount-time row sync effect. The shared `WorkflowMouldingLineItemEditor` now supports `syncOnMount`, and the inline `ItemsStep` instance disables mount-time syncing so it displays derived rows without calling `patchLineItem` until the user edits qty, calculator, add-on, custom price, or removal. The card-owned editor path keeps the existing sync behavior. Validation: focused workflow-step-rendering test passed and scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Implemented the mobile Shelf Items final-step editor. Shelf workflow rows now use a shared native `WorkflowShelfLineItemEditor` extracted from `LineItemCard`, and the inline final `Shelf Items` step renders that editor below the workflow pills instead of the old grouped-row placeholder. The inline path disables mount-time shelf sync to avoid `patchLineItem` loops, while user actions still patch through shared sales-form-core shelf helpers. The selected shelf UI was flattened to title + qty stepper, category tree + editable unit price + prominent total, plus a `+ Add shelf` action. The fullscreen picker keeps the simplified direct product search/recent flow with flat result rows showing title, category tree, unit price, edit icon, and delete icon. Validation: focused workflow-step-rendering and shelf-product-options tests passed, and scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Fixed the mobile Shelf Items picker follow-up. The fullscreen shelf modal now uses the app SafeArea wrapper like customer selection so it clears the Android status bar, shelf results show skeleton rows while loading, the inline shelf editor can activate from the visible Shelf step while item-type metadata catches up, and blank shelf search requests up to 15 items with recent-usage ordering plus active-product fallback when usage history is sparse. The API keeps hidden/archived products excluded while scanning recent usage in batches. Validation: focused new-sales-form API, mobile shelf-product-options, workflow-step-rendering, and workflow step-family tests passed with 45 tests / 183 assertions; scoped `git diff --check` passed. No dev server, broad typecheck/build, or UI automation was run per request.
- 2026-06-19: Implemented the mobile Service `Line Item` final-step editor and flattened grouped line editors. The inline Service final step now renders a native row editor below the workflow pills, patches through shared sales-form-core service helpers, and disables mount-time sync in the inline path to avoid invoice-line update loops. Service and Moulding grouped row editors now use flat divider rows and plain summary strips while keeping their row controls and totals. Validation: focused workflow-step-rendering, workflow-row-patches, and step-family tests passed with 30 tests / 91 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Fixed the mobile inline workflow Proceed button visibility regression where the pill could render white text without its blue background. The screen-owned Proceed overlay now uses style-only React Native primitives with explicit themed primary background/foreground colors, avoiding the Expo `className` plus `style` mix on the animated frame/button path. Validation: focused floating-action-layout, workflow-proceed-visibility, and workflow-step-rendering tests passed with 19 tests / 44 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Lowered the mobile inline workflow Proceed button placement. Inline Proceed now uses a dedicated lower offset while the footer is visible and a near-bottom offset when the footer hides, so it moves down farther without moving Custom or other floating action lanes. Validation: focused floating-action-layout, workflow-proceed-visibility, and workflow-step-rendering tests passed with 19 tests / 46 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Tuned the mobile inline workflow Proceed visible-footer lane after device review still showed it too high when the Save Draft/Create action footer was visible. The visible-footer offset now derives from the 44px footer action height plus 15px, while the hidden-footer near-bottom offset remains unchanged. Validation: focused floating-action-layout, workflow-proceed-visibility, and workflow-step-rendering tests passed with 19 tests / 47 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Reduced the mobile inline workflow Proceed pill size from 220x48 to 184x44 while keeping the style-only themed button path and existing vertical offsets. Validation: focused floating-action-layout, workflow-proceed-visibility, and workflow-step-rendering tests passed with 19 tests / 47 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Changed the mobile invoice footer item-switcher icon from the route/breadcrumb symbol to the clipboard-list item symbol while keeping placement and item-sheet behavior unchanged. Validation: scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Tightened the mobile inline workflow Proceed visibility contract so the floating Proceed button can appear only on active multi-component picker steps. The visibility helper now requires a component-picker gate, while Door/Moulding fallback counts still work inside that gate; regular single-select steps, line-item editors, HPT, shelf/service final steps, and selected metadata outside a component picker no longer surface Proceed. Validation: focused workflow-proceed-visibility, workflow-step-rendering, and floating-action-layout tests passed with 20 tests / 49 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Increased the mobile Service line-item row total emphasis by widening the total column and changing the amount from small bold text to a larger heavy amount treatment. Validation: scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Removed redundant mobile grouped line-item chrome for Service and Moulding. Inline grouped line-item steps no longer render the empty component-picker `Line Item` label/body, and the Service/Moulding row editors no longer add duplicate top section labels or top dividers before their totals; Service keeps its add action as a simple bottom button. Validation: focused workflow-step-rendering and workflow-proceed-visibility tests passed with 17 tests / 34 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Added plus/minus quantity controls to the mobile Service line-item row editor. Service qty now uses a compact stepper with an editable numeric center value, clamps decrement at zero, and leaves Unit as the standard numeric field. Validation: scoped `git diff --check` passed and the service editor path was scanned for Expo `className` plus `style` mixing; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-19: Increased the mobile Service row total emphasis again by widening the amount column and bumping the row total to an extra-large heavy text treatment. Validation: scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Updated the mobile Moulding line-item editor so moulding names are display-only instead of editable text fields, row thumbnails use the resolved moulding image URI, and tapping a thumbnail opens a fullscreen native image preview with a close control. Validation: focused workflow-step-rendering, workflow-row-patches, and step-family tests passed with 30 tests / 91 assertions; scoped `git diff --check` passed; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Redesigned the mobile Moulding line-item row into a compact row-first editor. Rows now show a larger actual moulding thumbnail, display-only title, icon-only calculator trigger, More options action, protected remove action, plus/minus qty stepper with direct entry, estimate, total, and conditional Add-on/Custom chips. Add-on and nullable custom price moved from the main row into a per-row bottom sheet with Clear, Cancel, and Apply actions, while the calculator panel remains shared-core backed and applies quantity through the existing grouped-row patch path. Validation: focused workflow-step-rendering, workflow-row-patches, and step-family tests passed with 30 tests / 91 assertions; scoped `git diff --check` passed; touched moulding files were scanned for Expo `className` plus `style` mixing with no matches; no Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Fixed mobile Moulding line-item row thumbnails showing the fallback icon by preserving selected/persisted moulding `img` values when deriving row context and when backfilling selected moulding components from saved row metadata. Validation: focused workflow row patch and selector tests passed with 29 tests / 101 assertions; scoped `git diff --check` passed. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Refined the mobile Moulding image preview modal with a darker tappable backdrop, top-right close icon, image tap isolation, and swipe-down dismissal. Validation: scoped Biome check passed for the moulding row editor, scoped `git diff --check` passed, and the touched file was scanned for Expo `className` plus `style` mixing with no matches. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Changed the mobile Moulding line-item calculator action to use the actual Hugeicons calculator icon and open the calculator in a per-row bottom sheet instead of expanding inline in the row. Validation: scoped Biome check passed for the moulding row editor, the Hugeicons calculator export was verified from the Expo app workspace, and scoped `git diff --check` passed. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Added more breathing room to the mobile Moulding calculator and More bottom sheets with larger side/bottom padding plus clearer title, field, and action spacing. Validation: scoped Biome check passed for the moulding row editor, scoped `git diff --check` passed, and the touched file was scanned for Expo `className` plus `style` mixing with no matches. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Updated mobile invoice quantity inputs to use number keyboards for whole-count fields. Door Size modal Qty/LH/RH, inline HPT Qty/LH/RH, Moulding qty, selected Moulding grid qty, Service qty, and Shelf qty now use `number-pad`, while price/cost/custom fields stay on decimal keyboards. Validation: focused workflow-step-rendering, workflow-row-patches, and step-family tests passed with 30 tests / 92 assertions; scoped `git diff --check` passed; targeted scan found no Qty/LH/RH field still using `decimal-pad`. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Restyled the mobile Moulding line-item row to match the attached bold data mockup: larger row spacing, padded image thumbnail, uppercase two-line title, compact icon actions, stacked Add-on/Custom chips, stronger Quantity stepper, line-through estimate when overrides are present, and prominent primary Final Total. Validation: scoped Biome check passed for the moulding row editor, focused workflow-step-rendering/workflow-row-patches/step-family tests passed with 30 tests / 92 assertions, scoped `git diff --check` passed, and the touched file was scanned for Expo `className` plus `style` mixing with no matches. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Added keyboard-aware handling to the mobile Moulding Add-on/Custom bottom sheet. The More options sheet now uses fixed taller keyboard-safe snap points, the app's bottom-sheet keyboard-aware scroll view, larger bottom reserve, and interactive keyboard behavior so focused Add-on and Custom inputs can move above the keyboard without mixing Expo `className` and `style` on the same element. Validation: scoped Biome check passed for the moulding row editor, scoped `git diff --check` passed, and the touched file was scanned for Expo `className` plus `style` mixing with no matches. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-21: Matched the mobile Moulding calculator bottom sheet spacing to the Add-on/Custom sheet polish by increasing bottom padding and the title-to-panel gap while leaving calculator behavior and patch logic unchanged. Validation: scoped Biome check passed for the moulding row editor, scoped `git diff --check` passed, and the touched file was scanned for Expo `className` plus `style` mixing with no matches. No Expo dev server, broad typecheck/build, or UI automation was run.
- 2026-06-23: Fixed inventory-backed sales sync pricing fallback for moulding and shelf components. `syncSalesInventoryLineItems` now loads the order customer profile coefficient, HPT moulding `priceTags`, shelf row `unitPrice`/`totalPrice`/`meta`, and completes missing cost/sales snapshots from the available side when safe. Inventory variant and supplier pricing still take precedence. Validation: `bun test packages/sales/src/sync-sales-inventory-line-items.test.ts` passed with 19 tests / 43 assertions; reran sync for order `08568PC` and confirmed moulding `LinePricing` rows now contain unit/total cost and sales values; scoped `git diff --check` passed for the sync file and focused test.
- 2026-06-23: Added stock-scoped Create inbound support to the sales overview Inventory tab. The overview projection now exposes merged component ids, inbound demand ids, and pending stock allocation ids. `inventories.createInboundShipmentFromDemands` can prepare missing pending inbound demand rows from monitored stock line-item components before creating the inbound shipment, and row-level `Allocate available stock` approves pending stock allocation ids through the existing bulk allocation approval flow. The Inventory tab now defaults to `STOCK`, adds `INBOUNDS` after `NON STOCK`, removes the top "new inventory workspace" badge, stock allocator card, bulk "Allocate available stocks" action, and component-list card/header, and keeps Create inbound inside the `STOCK` view with a supplier combobox allow-create and shadcn calendar date picker. Validation: focused sales inventory overview tests passed with 10 tests / 21 assertions; focused Biome passed for the Inventory tab/projection files; filtered `@gnd/api` and `@gnd/www` typecheck greps reported no touched-file diagnostics. In-app browser reload did not restore the legacy overview sheet from the query string during validation, so browser proof was limited to confirming removed top-level labels were absent from the loaded page state.
- 2026-06-23: Added per-row requested qty controls to the sales overview Inventory tab Create inbound form. Each stock shortage row now has a checkbox plus minus/input/plus qty stepper capped at the row's pending qty; selected component groups submit requested qty to `inventories.createInboundShipmentFromDemands`. The API prepares only the requested pending demand quantity and splits existing unlinked pending demand rows when a smaller qty is selected, leaving the remainder pending. Validation: focused Inventory tab/router Biome passed, `apps/api/src/db/queries/inbound-receiving.ts` formatted cleanly, sales inventory overview tests passed with 10 tests / 21 assertions, and filtered `@gnd/api` / `@gnd/www` typecheck greps reported no touched-file diagnostics.
- 2026-06-23: Added order-linked and general Sales Book inbound lifecycle surfaces. The sales overview Inventory tab now lists order-linked inbounds with stock-line detail and status/receive actions, while `/sales-book/inbounds` shows all inbounds in a flatter shadcn collapsible workspace with search/status filters, compact analytics, linked order/customer context, stock lines, receive-stock, status updates, and activity history. Inbound lifecycle activity now syncs the `inventory_inbound_activity` notification channel, adds `status_updated`, carries `lifecycleEventId`, and guarantees a timeline note for new lifecycle events. Validation: focused UI/notification Biome passed, inbound query formatting passed while its pre-existing lint debt remains, sales inventory overview tests passed with 10 tests / 21 assertions, filtered `@gnd/api` / `@gnd/www` typecheck greps reported no touched-file diagnostics, and in-app browser validation on `/sales-book/inbounds` confirmed linked order/customer rows plus a status update activity for inbound #4.
- 2026-06-23: Updated the `/sales-book/inbounds` activity panel to reuse the jobs overview shared activity-history timeline design instead of custom mini-cards. In-app browser validation confirmed the inbound detail now renders the uppercase Activity History heading, dated timeline item, subject, headline, and By line for inbound #4; focused Biome passed and filtered `@gnd/www` typecheck grep reported no touched-file diagnostics.
- 2026-06-23: Replaced the pre-save "Is all product in stock?" sales-form prompt with a post-save inventory configuration modal for both legacy and new order save flows. The new modal reuses `SalesOverviewInventoryContent` as a standalone workbench by saved `salesOrderId`, supports the existing stock/non-stock/inbounds configuration actions, and blocks Save & Close / Save & New navigation until the operator closes it. The old stock-status dialog file was removed. Validation: no remaining static references to the old prompt, focused Biome passed for the new dialog and both save components, filtered `@gnd/www` typecheck grep reported no touched-file diagnostics, and whitespace checks passed. In-app browser navigation could open the target order overview (`08609DB`) but automation clicks into the edit form were intercepted by the orders/overview surface, so full browser save acceptance was not completed in this pass.
- 2026-06-23: Added required customer-selection-on-open behavior to the legacy `/sales-book/create-order` form. Fresh unsaved legacy forms without `metaData.customer.id` now open a required `Create Order: Select Customer` dialog that reuses the existing legacy customer lookup and closes naturally once the customer is selected. Validation: filtered `@gnd/www` typecheck grep reported no diagnostics for `sales-form.tsx` / `sales-customer-input.tsx`, scoped whitespace check passed, and the in-app browser on `/sales-book/create-order` showed `Create Order: Select Customer` on load with no console errors.

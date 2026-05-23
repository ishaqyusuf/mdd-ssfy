## Install Cost Sorting Rollout
- Status: In Progress
- Objective: Implement server-authoritative install-cost sorting by `builderTask.taskIndex` with `builderTask.createdAt` fallback across web admin and jobs flows on web and Expo.
- Current Phase: Server-side implementation complete
- Next Step: Manual verification on web admin install-cost sidebar, web jobs form, and Expo/mobile install-cost step.
- Blockers: None
- Related Files: brain/features/install-cost-sorting.md, apps/api/src/trpc/routers/community.route.ts, apps/api/src/utils/install-cost-sort.ts, apps/api/src/utils/install-cost-sort.test.ts, apps/www/src/hooks/use-model-install-config.ts, apps/www/src/components/modals/new-job/install-tasks-list.tsx, apps/expo-app/src/components/forms/job-v2/install-cost-form.tsx, apps/expo-app/src/hooks/use-job-form-v2.tsx
- Last Updated: 2026-03-28

### Completed Steps
1. Created `apps/api/src/utils/install-cost-sort.ts` with shared `sortInstallCosts` and `sortBuilderTasks` helpers.
2. Created `apps/api/src/utils/install-cost-sort.test.ts` with 17 passing tests covering all comparator scenarios.
3. Updated `community.getModelBuilderTasks` to include `taskIndex`/`createdAt` in builder-task select and sort builder tasks by `taskIndex → createdAt → id`.
4. Updated `community.getModelInstallTasksByBuilderTask` to fetch `builderTask.taskIndex/createdAt/id` per cost row and sort using `sortInstallCosts`.
5. Updated `community.getJobForm` to include `id/taskIndex/createdAt` in `builderTask` select and sort `builderTaskInstallCosts` via `sortInstallCosts` before mapping to `job.tasks`.
6. Audited all consumers — no local resorting applied in any file; server-authoritative order is preserved end-to-end.

### Plan
1. ✅ Add canonical server-side install-cost sorting using `builderTask.taskIndex`, then `builderTask.createdAt`, then stable tie-breakers.
2. ✅ Apply the sorted output to `community.getModelInstallTasksByBuilderTask` and `community.getJobForm`.
3. ✅ Audit web admin, web jobs form, and Expo/mobile jobs form consumers to preserve server order without local reshuffling.
4. ✅ Add focused validation for mixed `taskIndex` and fallback scenarios.
5. ✅ Update Brain progress/tasks as implementation lands.

## Sales PDF Follow-up Rollout
- Status: Planned
- Objective: Finish the next sales print slice by moving preview/download UX onto the new Sales PDF renderer, reducing print latency, and defining cache reuse/invalidation rules around stored downloads.
- Current Phase: Scope captured in Brain, pending implementation kickoff
- Next Step: Trace current preview/print entry points in the sales form and sales overview, then map them onto the v2 template renderer and stored-document lifecycle.
- Blockers: None
- Related Files: brain/features/sales-pdf-system.md, brain/tasks/in-progress.md, apps/www/src/components/print-sales-v2.tsx, apps/www/src/components/sales-menu-print.tsx, apps/www/src/components/sales-preview.tsx
- Last Updated: 2026-04-03

### Planned Steps
1. Add quick-print CTA entry points in the sales form and beside preview inside the sales overview surface.
2. Switch sales preview flows to the new template render path so preview and download stay visually aligned.
3. Profile the current print/download path and remove the main latency source before broadening usage.
4. Define stored-PDF cache invalidation so sales updates and successful payments clear stale cached documents.
5. Reuse an existing stored download link when its print type matches the requested output; otherwise render and persist a fresh file.
6. Evaluate grouped print requests where one sales record may contribute multiple print documents, then merge them into a single PDF in sales order when needed.

## Link Modules Web Optimization
- Status: In Progress
- Objective: Optimize `apps/www` active routes using `apps/www/src/components/sidebar/links.ts` as the authoritative scope for current user-facing pages, and track non-linked route pages as possibly stale for later review.
- Current Phase: Linked route implementation pass complete, pending validation on the highest-traffic shortlist
- Next Step: Validate the highest-traffic shortlist in live usage and do only residual hotspot cleanup if one still feels meaningfully slow.
- Blockers: None
- Related Files: brain/link-modules-web-optimization-plan.md, brain/engineering/www-routes.md, brain/engineering/www-performance-guardrails.md, apps/www/src/components/sidebar/links.ts, apps/www/src/app/(sidebar)/community/(main)/templates/page.tsx, apps/www/src/app/(sidebar)/community/community-template/[slug]/page.tsx, apps/www/src/app/(sidebar)/community/community-template/[slug]/v1/page.tsx, apps/www/src/app/(sidebar)/community/model-template/[slug]/page.tsx, apps/www/src/app/(sidebar)/community/template-schema/page.tsx, apps/www/src/app/(sidebar)/community/(main)/projects/page.tsx, apps/www/src/app/(sidebar)/community/(main)/project-units/page.tsx, apps/www/src/app/(sidebar)/community/(main)/unit-productions/page.tsx, apps/www/src/app/(sidebar)/community/(main)/unit-invoices/page.tsx, apps/www/src/app/(sidebar)/community/(main)/builders/page.tsx, apps/www/src/app/(sidebar)/community/(main)/install-costs/page.tsx, apps/www/src/app/(sidebar)/community/customer-services/page.tsx, apps/www/src/components/modals/global-modals.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/orders/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/orders/bin/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/quotes/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/quotes/bin/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/customers/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx, apps/www/src/components/tables/sales-orders/data-table.tsx, apps/www/src/components/tables/sales-quotes/data-table.tsx, apps/www/src/components/tables/customers/data-table.tsx, apps/www/src/components/tables/sales-dispatch/data-table.tsx
- Related Files: brain/link-modules-web-optimization-plan.md, brain/engineering/www-routes.md, brain/engineering/www-performance-guardrails.md, brain/engineering/www-performance-validation-checklist.md, apps/www/src/components/sidebar/links.ts, apps/www/src/app/(sidebar)/community/(main)/templates/page.tsx, apps/www/src/app/(sidebar)/community/community-template/[slug]/page.tsx, apps/www/src/app/(sidebar)/community/community-template/[slug]/v1/page.tsx, apps/www/src/app/(sidebar)/community/model-template/[slug]/page.tsx, apps/www/src/app/(sidebar)/community/template-schema/page.tsx, apps/www/src/app/(sidebar)/community/(main)/projects/page.tsx, apps/www/src/app/(sidebar)/community/(main)/project-units/page.tsx, apps/www/src/app/(sidebar)/community/(main)/unit-productions/page.tsx, apps/www/src/app/(sidebar)/community/(main)/unit-invoices/page.tsx, apps/www/src/app/(sidebar)/community/(main)/builders/page.tsx, apps/www/src/app/(sidebar)/community/(main)/install-costs/page.tsx, apps/www/src/app/(sidebar)/community/customer-services/page.tsx, apps/www/src/components/modals/global-modals.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/orders/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/orders/bin/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/quotes/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/quotes/bin/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/customers/page.tsx, apps/www/src/app/(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx, apps/www/src/components/tables/sales-orders/data-table.tsx, apps/www/src/components/tables/sales-quotes/data-table.tsx, apps/www/src/components/tables/customers/data-table.tsx, apps/www/src/components/tables/sales-dispatch/data-table.tsx
- Last Updated: 2026-04-15

### Planned Steps
1. Freeze active optimization scope to routes represented in `linkModules`.
2. Separate non-linked route pages into a `Possibly Stale Pages` bucket for future action.
3. ✅ Optimize Community template list/detail/edit/schema pages with awaited server hydration.
4. ✅ Optimize active Community list and operations pages with awaited server hydration for first-paint-critical data.
5. ✅ Reduce Community client-shell weight by lazily mounting Community modal and editor systems.
6. ✅ Apply the first Sales list-route pass to orders, quotes, customers, and dispatch admin, including awaited route hydration and lighter table shells.
7. In progress: extend the same server-first pattern to active Sales operational routes including productions, dispatch, inbound management, accounting, resolution center, sales-rep, and the linked new sales-form routes by hydrating first-page data, filter metadata, and visible bootstrap queries together.
8. In progress: move the same server-first route hydration pattern into active HRM employees, contractor jobs, payments, and worker jobs-dashboard surfaces from the linked navigation model.
9. In progress: finish the remaining linked production dashboard surfaces with auth-aware server preloading for worker views and hydrated analytics for dashboard-first pages.
10. Keep sales-form parity/cutover planning separate from route-load optimization.

### Highest-Traffic Validation Shortlist
- `/community/templates`
- `/community/builders`
- `/sales-book/orders`
- `/sales-book/productions`
- `/sales-form/create-order`
- `/hrm/employees`
- `/contractors/jobs/payments`

### Next Execution Order
1. Validate the highest-traffic shortlist in live navigation and note any residual slow routes.
2. Do a client-runtime pass only on the routes that still feel slow after hydration changes.
3. Hotspot implementation already landed for `sales-form/create-order`, `sales-book/productions`, and `community/builders`; only revisit them if live validation still shows a real issue.
4. After shortlist validation, move to measurement and cleanup rather than more broad route rewrites.

## Legacy Sales Form Mobile + Architecture Refactor
- Status: Planned
- Objective: modernize the active legacy sales form with a cleaner mobile UX, a canonical `domains/sales-form/legacy` folder boundary, centralized legacy controllers/helpers, and cleaner save-flow architecture without a big-bang rewrite.
- Current Phase: Planning locked in Brain
- Next Step: create the domain root and stable entrypoint, then re-home shell files and legacy controller imports without changing behavior.
- Blockers: None
- Related Files: brain/legacy-sales-form-mobile-architecture-plan.md, brain/sales-form-system-hardening-plan.md, brain/decisions/ADR-005-legacy-sales-form-domain-and-mobile-architecture.md, apps/www/src/components/forms/sales-form/sales-form.tsx, apps/www/src/components/forms/sales-form/sales-form-sidebar.tsx, apps/www/src/components/forms/sales-form/sales-form-save.tsx, apps/www/src/components/forms/sales-form/sales-meta-form.tsx, apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/item-section.tsx, apps/www/src/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/step-section.tsx
- Last Updated: 2026-04-16

### Planned Steps
1. Create `apps/www/src/domains/sales-form/legacy/*` and route the current shell through one canonical entrypoint.
2. Re-home shell files, then centralize legacy classes/helpers into explicit controller/helper folders.
3. Introduce adapters/hooks so touched UI components stop instantiating legacy classes directly.
4. Flatten the shell UI and switch mobile to single-active-item editing with top-level invoice item selector.
5. Replace bulky step header chrome with wrapped step CTA buttons and value-only component previews.
6. Refactor summary/history into a flatter sheet layout and make HPT, moulding, service, and shelf-items mobile-native within their own step-family folders.
7. Extract save orchestration from the button component into application/server save boundaries while preserving hardening constraints and server-authoritative pricing.

## Sales Default Action Queue Cleanup
- Status: Ready
- Objective: Change the default Sales orders page from a broad incomplete-orders list into a focused actionable queue, so forgotten payment/delivery completion states do not bloat the first view.
- Current Phase: Detailed implementation plan captured
- Next Step: Add a server-side default queue mode to the sales query contract and map empty Sales page loads to that mode.
- Blockers: None
- Related Files: packages/sales/src/utils/where-queries.ts, packages/sales/src/schema.ts, apps/api/src/schemas/sales.ts, apps/api/src/utils/sales.ts, apps/api/src/db/queries/sales.ts, apps/api/src/db/queries/sales-orders-v2.ts, apps/www/src/hooks/use-sales-filter-params.ts, apps/www/src/hooks/use-sales-orders-v2-filter-params.ts, apps/www/src/components/sales-order-search-filter.tsx, apps/www/src/components/sales-orders-v2-header.tsx, apps/api/src/db/queries/filters.ts
- Last Updated: 2026-05-04

### Plan
1. Define the target queue contract: default Sales should mean "active action required," not every order that is simply not delivered or not paid. Keep explicit filters for Outstanding Payment, Pending Delivery, Pending Production, Needs Completion Review, and All Orders.
2. Extend the sales query schema with a stable queue/filter key, for example `queue: "actionable" | "needs-completion" | "all"`, while preserving existing `invoice`, `production`, and `dispatch.status` filters for user-selected searches.
3. Replace the current default `OR` query in `packages/sales/src/utils/where-queries.ts` with a named default queue builder. The current default includes pending dispatch, pending production, or `amountDue > 0`; the new default should prefer true operational action and exclude orders that are fully operationally complete but only stale because someone forgot to close status.
4. Add a `needs-completion` queue that catches likely forgotten rows, such as orders with completed production and dispatch control but lingering open delivery status, or orders with old/no recent activity and inconsistent payment/delivery flags. Keep this queue visible as a deliberate tab/filter instead of hiding the data.
5. Wire both old and V2 Sales routes through the same queue semantics. The legacy page currently uses `loadOrderFilterParams` and `getOrders`; V2 converts its own filters to the legacy query before `whereSales`, so both paths need the same default behavior.
6. Update filter metadata and UI copy so sales reps see "Action Queue" by default, with clear alternate filters for "Needs Completion", "Outstanding Payment", "Pending Delivery", and "All Orders". Avoid in-app explanatory text blocks; use concise labels, badges, and filter chips.
7. Add focused tests around `whereSales` and default scoping: empty default load, manager all-sales visibility, explicit payment filter, explicit dispatch filter, needs-completion queue, and bin behavior.
8. Verify with one manual pass on `/sales-book/orders` and `/sales-book/orders/v2`: default list size is reduced, explicit filters still reveal the hidden/stale rows, summaries match the active filter, and sales-rep scoping remains intact.

### Resume Prompt
Continue the Sales Default Action Queue Cleanup plan from `brain/plans/ongoing.md`. Current phase: detailed implementation plan captured. Next step: add a server-side default queue mode to the sales query contract and map empty Sales page loads to that mode. Blockers: none. Relevant files: `packages/sales/src/utils/where-queries.ts`, `packages/sales/src/schema.ts`, `apps/api/src/schemas/sales.ts`, `apps/api/src/utils/sales.ts`, `apps/api/src/db/queries/sales.ts`, `apps/api/src/db/queries/sales-orders-v2.ts`, `apps/www/src/hooks/use-sales-filter-params.ts`, `apps/www/src/hooks/use-sales-orders-v2-filter-params.ts`, `apps/www/src/components/sales-order-search-filter.tsx`, `apps/www/src/components/sales-orders-v2-header.tsx`, and `apps/api/src/db/queries/filters.ts`. Update `brain/plans/ongoing.md` as progress continues.

## Dealership Program
- Status: In Progress
- Objective: Build a dedicated dealer management and dealer portal program with `apps/dealership`, dealer onboarding from a Dealers page, dealer-owned customers/profiles/orders, and the new shared sales form system from `packages/sales`.
- Current Phase: Phase 11 build/runtime smoke complete for unauthenticated dealership routes; authenticated browser click-through requires dealer credentials.
- Next Step: Complete authenticated Phase 11 click-through with a valid dealer account/session: dealership quote create/edit/quote-to-order, dealer customers/profiles/settings, branded print paths, and `www` create/edit/print/payment/packing/dispatch/settings parity.
- Blockers: A valid dealer login/session is needed for authenticated browser QA. Headless Chromium still cannot launch from this Codex sandbox due macOS MachPort permission errors, so browser automation may need the in-app browser or a manually available browser session. Full API/`www`/notifications/email/package typechecks still inherit unrelated existing errors from `apps/api`, `packages/ui`, `packages/email`, `packages/sales`, and legacy `www` surfaces.
- Related Files: apps/dealership, apps/dealership/src/app/api/auth/[...all]/route.ts, apps/dealership/src/app/api/trpc/[...trpc]/route.ts, apps/dealership/src/lib/dealer-session.ts, apps/www/src/app/(sidebar)/(sales)/sales-book/dealers/page.tsx, apps/www/src/components/dealers/dealers-admin-page.tsx, apps/api/src/schemas/dealer.ts, apps/api/src/trpc/init.ts, apps/api/src/trpc/routers/dealer.route.ts, apps/api/src/trpc/routers/dealer-portal.route.ts, apps/api/src/trpc/routers/_app.ts, packages/auth/src/better-auth/dealership.ts, packages/db/src/queries/dealers.ts, packages/db/src/queries/index.ts, packages/db/src/schema/dealer.better-auth.prisma, packages/db/src/schema/sales.customer.prisma, packages/db/src/schema/sales.prisma, packages/db/src/schema/migrations/20260515120000_dealership_foundation/migration.sql, packages/db/src/schema/migrations/20260515123000_dealership_better_auth/migration.sql, packages/notifications/src/channels.ts, packages/notifications/src/payload-utils/channel-triggers.ts, packages/notifications/src/schemas.ts, packages/notifications/src/types/dealer-onboarding.ts, packages/email/emails/dealer-onboarding.tsx, packages/sales/src/sales-form, packages/sales/src/print/get-print-document-data.ts
- Last Updated: 2026-05-18

### Quote-to-Order Approval Addendum
- Status: Planned
- Objective: Replace dealer-owned direct quote-to-order conversion with a sales-rep approval workflow while preserving dealer quote creation/editing, dual pricing, package workflow payloads, print/PDF behavior, and payment handoff.
- Current Phase: Product plan captured in Brain; implementation should wait until package-backed dealership form browser QA has authenticated fixtures.
- Next Step: After authenticated dealership browser QA passes, add `dealerPortal.requestQuoteOrder`, internal request review/count/approval APIs, sales rep notifications, manual delivery-cost review, dealer payment-link email, dealer sales/quotes tabs with count badges and query filters, sales-header pending request indicator, and dealer dashboard analytics.
- Blockers: Authenticated dealership and `www` browser QA are still blocked by missing local DB/session fixtures; direct conversion currently exists and must not be removed until the request workflow is implemented and tested.
- Related Files: brain/features/dealership-quote-to-order-approval.md, brain/new-sales-form-phase27-browser-qa.md, brain/new-sales-form-completion-roadmap.md, brain/dealership-cutover-readiness.md, brain/dealer-tax-tracking-client-memo.md, apps/api/src/trpc/routers/dealer-portal.route.ts, packages/db/src/queries/dealers.ts, packages/db/src/schema/sales.customer.prisma, packages/db/src/schema/sales.prisma, packages/notifications/src, packages/email/emails, apps/dealership/src/components/dealer-sales-form, apps/dealership/src/components/dealer-portal, apps/www/src/components/notification-center
- Last Updated: 2026-05-23

### Planned Approval Workflow Steps
1. Replace the dealer-facing `Convert to order` action with `Request order` while keeping quote create/edit unchanged.
2. Store one pending `quote_to_order` request per dealer-owned quote and expose request state on dealer quote lists/details.
3. Notify eligible sales reps in app and by email with a deep link to internal request review.
4. Approve requests transactionally: lock pending request, convert quote once, assign the approving sales rep, add reviewed delivery cost, stamp approval metadata, and resolve/send the dealer payment link.
5. Show already-worked information for later sales rep clicks instead of approving twice.
6. Add Dealer Sales / Dealer Quotes tabs with count badges and dealer-facing query filters.
7. Add a sales-header pending dealer request indicator.
8. Add dealer dashboard analytics for quotes, requests, orders, amount due, paid revenue, customers, and recent activity.
9. Preserve dealer/customer invoice address modes and dual-pricing visibility rules.

### Sales Form Migration 100% Phase Checklist
1. [x] Phase 1: Finish workflow action extraction. Extracted door/HPT mutations, component edit and price override actions, moulding removal/update helpers, and kept `www` as prompt/modal/tRPC/upload/Zustand adapter only. Added focused package tests for every action module.
2. [x] Phase 2: Complete shared workflow renderer. Moved HPT presentation to `HousePackageToolPanel`, shelf shell to `WorkflowShelfPanel`, and step component picker/card/action/popover layout to `WorkflowStepComponentPanel`. `WorkflowStepRenderer` owns the first package branch boundary, while `www` keeps only app data, persistence callbacks, prompts, dev logging, supplier APIs, uploads, and modal state.
3. [x] Phase 3: Establish shared sales form state contract. Created package-owned state types, initial state, reducers/actions, selectors, and tests; `apps/www` `store.ts` is now a thin Zustand adapter around package state/actions while preserving the app's router-derived record type externally.
4. [x] Phase 4: Complete shared composition root. `SalesFormShell` now supports fixed `www` and embedded dealership surfaces, accepts a composition object with record/state/data/actions/permissions/capabilities/slots, and is used by both `apps/www` new sales form and dealership quote composer.
5. [x] Phase 5: Cut dealership onto full shared form. Dealership now uses package state reducers through a dealer state adapter, dealer-scoped data/actions adapters, shared shell/line-item/summary composition, dealer customer/profile APIs, and dealer quote create/edit/quote-to-order persistence while internal-only features stay hidden by capabilities.
6. [x] Phase 6: Cut `www` new sales onto full shared form. Replaced obsolete local wrappers with package imports, moved shared overview/workflow/state/action/patch helpers into `packages/sales`, and kept `www` as the app adapter for store/query/modal/upload/dev logging/permissions/slots while preserving payments, print, packing, dispatch, settings, sales history, and existing permission access.
7. [x] Phase 7: Complete dual pricing end-to-end. Internal GND pricing and dealer-facing pricing now flow through dealer quote create/edit, quote-to-order snapshot preservation, dealer portal list/detail responses, print pricing surfaces, and shared reprice/snapshot helpers with focused regression tests.
8. [x] Phase 8: Verify print and dealer branding. Confirm dealer logo/company/address render for dealer-owned quotes/invoices, GND branding remains for internal docs, and internal-only fields stay hidden from dealer print output.
9. [x] Phase 9: Harden authorization and data isolation. Verify dealer sessions cannot access another dealer's customers, profiles, quotes, orders, documents, or branding; preserve `www` admin/internal permissions.
10. [x] Phase 10: Cleanup and deletion. Delete obsolete `apps/www` form UI sections, compatibility re-exports, duplicated dealership composer UI, and any remaining app-owned shared TSX.
11. [ ] Phase 11: End-to-end QA. Smoke `www` create/edit quote/order, print/payment/packing/dispatch/settings, dealership create/edit quote, quote-to-order, branded print, and responsive shared form behavior.
12. [ ] Phase 12: Final Brain documentation and closeout. Document final architecture, adapters, capabilities, permissions, slots, test commands, known constraints, and mark the sales form migration complete.

### Completed Steps
1. Added dealership schema foundation: optional customer-backed dealer account, dealer profile fields, dealer-owned customers/profiles, dealer-owned orders, and dealer sales profile linkage.
2. Added migration `20260515120000_dealership_foundation`.
3. Added Midday-style DB query boundary in `packages/db/src/queries/dealers.ts`.
4. Added API schemas/router for dealer list, customer candidate search, and dealer account creation.
5. Registered `dealer` router in the API app router.
6. Scaffolded `apps/dealership` with Next.js app shell, providers, TRPC plumbing, dashboard shell, route placeholders, and local `/api/trpc` bridge.
7. Added root `dealership` dev script.
8. Ran `bun run --filter @gnd/db db:generate` and `bun run --filter @gnd/db typecheck` successfully.
9. Added the dedicated `apps/www` Dealers admin page using the Midday-style split: thin server route, `HydrateClient` prefetch, `AuthGuard`, and client feature component consuming shared `dealer` tRPC procedures.
10. Implemented the add-dealer UX with two paths: select an existing customer with an email, or enter a new dealer name/email profile, then call `dealer.createAccount`.
11. Ran `bun run --filter @gnd/www typecheck`; full check still fails from unrelated existing API/UI errors, but filtered validation shows no errors in `dealers-admin-page`, `sales-book/dealers`, `dealer.route`, `schemas/dealer`, or `queries/dealers`.
12. Added `DealerStatusHistory` writes to `createDealerAccount` with the admin author id.
13. Added `dealer_onboarding` as a channel-backed notification type with schema, trigger helper, notification handler, email service registration, and React email template.
14. Wired `dealer.createAccount` to trigger `dealer_onboarding` through `NotificationService` after creating the dealer invite token.
15. Ran `bun run --filter @gnd/db typecheck` successfully. Full notifications/email/API typechecks still inherit unrelated existing errors, but filtered checks show no dealer-onboarding-specific errors.
16. Added `getDealerOnboardingInvite` and `completeDealerOnboarding` in the shared DB query boundary.
17. Added `apps/dealership/create-password/[token]` route with invite verification and password creation server action.
18. Added a minimal `apps/dealership/login` route as the redirect target for completed setup.
19. Re-ran `bun run --filter @gnd/db typecheck` successfully. Filtered `@gnd/dealership` validation shows no errors around `create-password`, dealer queries, password completion, or login route.
20. Added dealer-scoped Better Auth models and migration, keeping dealer auth storage separate from the existing `www`/NextAuth account tables.
21. Added `packages/auth/src/better-auth/dealership.ts` as the shared Better Auth config for the dealership app, with `/api/auth/[...all]` mounted inside `apps/dealership`.
22. Updated dealer onboarding completion to sign up through Better Auth and link `DealerAuth.authUserId` instead of storing a password hash directly on `DealerAuth`.
23. Added dealer login form, `requireDealer()` app helper, and gated the dealership dashboard/section routes by the resolved active dealer session.
24. Replaced the dealership `/api/trpc` bridge with a cookie-backed tRPC route that resolves the Better Auth session server-side and injects `dealer`/`dealerAuthUserId` into context.
25. Added `dealerProtectedProcedure` and `dealerPortal` router with `me` and dashboard summary endpoints for dealer-only API usage.
26. Ran `bun install`, `bun run --filter @gnd/db db:generate`, and `bun run --filter @gnd/db typecheck` successfully. Filtered API/dealership/auth checks show no dealer-specific errors; full package checks remain blocked by unrelated pre-existing errors.
27. Added `dealer.resendOnboarding` with fresh invite-token generation, previous-token invalidation, status history logging, and the same `dealer_onboarding` notification channel.
28. Added a "Resend onboarding" action to the Dealers admin list, disabled once the dealer has completed Better Auth onboarding.
29. Added dealer portal DB query APIs for dealer-owned customers, dealer sales profiles, sales document lists, dashboard counts, and company settings.
30. Added dealer portal tRPC procedures for customers, sales profiles, orders/quotes, and settings using `dealerProtectedProcedure`.
31. Replaced dealership route placeholders for `/customers`, `/profiles`, `/orders`, `/quotes`, and `/settings` with working dealer-scoped list/form surfaces.
32. Added create/edit flows for dealer-owned customers and sales profiles, including sales-profile assignment to dealer-owned customers.
33. Added dealer company settings for contact/company details, logo URL, and billing address data used later by invoice/quote printing.
34. Ran `bun run --filter @gnd/db typecheck` successfully and filtered API/dealership typechecks with no dealer-specific errors. Local runtime smoke remains blocked by portless sandbox permissions.
35. Moved the `apps/www` new sales form mapper/normalization layer into `packages/sales/src/sales-form/application/record-normalization.ts`, leaving `apps/www` with a thin typed adapter so the existing form consumes the shared package contract.
36. Added the first pure dual-pricing engine in `packages/sales/src/sales-form/domain/dual-pricing.ts`, including focused tests for separated internal/dealer totals and missing-profile coefficient fallback.
37. Tightened local recovery typing in the `www` new sales form so API draft payloads can still restore into the hydrated editor record shape after the shared mapper migration.
38. Corrected the shared package architecture to include reusable `.tsx` as well as `.ts`, then moved the first shared React UI slice (`SalesFormHeaderActions` and `SalesFormStatusStrip`) into `packages/sales/src/sales-form/ui` with `apps/www` compatibility re-exports.
39. Moved `LineItemsPanel` into `packages/sales/src/sales-form/ui/line-items-panel.tsx` as a prop-driven shared TSX component, leaving `apps/www` with only a store adapter.
40. Added dealer-protected quote creation using the shared sales form header/line-items UI in `apps/dealership`, backed by `dealerPortal.saveQuote`.
41. Added dealer quote persistence with dealer-owned customer/profile enforcement, internal and dealer-facing pricing snapshots, `dealerAuthId`, `dealerSalesProfileId`, and legacy `SalesOrderItems` rows.
42. Added dealer print branding resolution in `packages/sales/src/print/get-print-document-data.ts`, so dealer-owned sales documents can use dealer logo/company/address overrides while non-dealer sales keep GND defaults.
43. Added shared sales form composition contracts for capabilities, permissions, slots, and shell-level composition, keeping app-specific behavior outside `packages/sales`.
44. Added neutral app adapter folders for `apps/www` and `apps/dealership` using `use-sales-form-*` names without app prefixes.
45. Moved the invoice summary sidebar shell into `packages/sales/src/sales-form/ui/summary/invoice-summary-sidebar.tsx`, with `apps/www` now passing overview/history through slots and adapters.
46. Added `SalesFormShell` as the shared layout/composition boundary for future removal of app-owned sales form shell layout.
47. Updated shared header actions to respect explicit capabilities and permissions, preserving GND-only print/packing/settings controls in `www` while hiding them in dealership.
48. Extracted reusable overview pricing/credit/totals TSX into `packages/sales/src/sales-form/ui/overview`, with `www` consuming shared pricing and credit components and dealership consuming the shared quote totals card.
49. Extracted reusable overview customer and invoice details TSX into `packages/sales/src/sales-form/ui/overview`, leaving `apps/www` invoice overview as mostly data/effect adapter code.
50. Extracted workflow leaf TSX/utilities into `packages/sales/src/sales-form/ui/workflow`: invoice item card, shelf inputs, component snapshots, door pricing/utilities, and step-family selection.
51. Moved the step-family regression test into `packages/sales` beside the package-owned workflow logic.
52. Added dealer quote-to-order conversion through `dealerPortal.convertQuoteToOrder`, with DB-level dealer ownership checks and a dealer portal list action.
53. Moved the workflow active-item controller, moulding workflow hook, and component skeleton grid into `packages/sales`, then removed the now-empty `apps/www/.../sections/item-workflow` folder so `www` no longer owns shared workflow leaf files.
54. Extracted the door price cell, door base-price update helper, and door size title formatter into `packages/sales/src/sales-form/ui/workflow/door-price-cell.tsx`, with `workflow-modals.tsx` now consuming those shared exports.
55. Moved package-owned workflow modal exports out of `apps/www` by replacing the local `workflow-modals.tsx` implementation with a compatibility re-export from `@gnd/sales/sales-form`.
56. Added dealer quote reopen/edit support with a dealer-protected sales-document detail query, persisted `newSalesForm` meta hydration, and updates through the existing dealer-owned `saveQuote` path.
57. Split `DoorDetailsDialog` and `MouldingCalculatorDialog` into dedicated package-owned modal files under `packages/sales/src/sales-form/ui/workflow/modals`, keeping the shared public exports stable while reducing the remaining workflow modal file.
58. Split the remaining door-size workflow dialogs into dedicated package-owned files (`door-size-qty-dialog.tsx` and `door-size-variant-dialog.tsx`) and reduced `workflow-modals.tsx` to a six-line shared barrel export.
59. Extracted the package-owned `WorkflowLineList` renderer from the bottom of `apps/www` `item-workflow-panel.tsx`, so the item-card list/step-chip shell is now shared and `www` only supplies store callbacks and the active step panel render function.
60. Extracted shared workflow bottom-sheet dialogs for door swapping and component editing into `packages/sales/src/sales-form/ui/workflow/modals`, with `www` keeping only swap mutations and the component image upload slot.
61. Extracted the repeated workflow component search/action toolbar into `packages/sales/src/sales-form/ui/workflow/workflow-component-toolbar.tsx`, with `www` supplying only menu/action slots.
62. Split the dealership quote composer out of the large `dealer-portal-section.tsx` into `apps/dealership/src/components/dealer-sales-form/dealer-quote-composer.tsx`, keeping dealer list routes lean and leaving quote composition beside its app-specific sales-form adapters.
63. Extracted the service line-item editor table into `packages/sales/src/sales-form/ui/workflow/service-line-items-editor.tsx`, leaving `www` with only service row derivation and persistence.
64. Extracted the moulding line-item editor table into `packages/sales/src/sales-form/ui/workflow/moulding-line-items-editor.tsx`, using a calculator render slot so `www` keeps the app-specific `MouldingCalculator` integration.
65. Extracted the shelf sections wrapper into `packages/sales/src/sales-form/ui/workflow/shelf-sections-panel.tsx`, leaving `www` with only section derivation, persistence, and row-specific product/category wiring.
66. Extracted the door supplier management UI into `packages/sales/src/sales-form/ui/workflow/door-supplier-manager.tsx`, leaving `www` with only supplier mutations, selected-step updates, and query refetching.
67. Extracted the workflow component grid shell into `packages/sales/src/sales-form/ui/workflow/workflow-component-grid.tsx`, so root and step component lists share one responsive grid and empty-search presentation while `www` supplies card behavior.
68. Extracted the repeated component image/title/price preview block into `packages/sales/src/sales-form/ui/workflow/workflow-component-preview.tsx`, reducing duplicate root, moulding, and normal component card markup in `www`.
69. Extracted workflow component card chrome, badges, and action-menu controls into package-owned files so root/step pickers no longer duplicate card structure in `www`.
70. Extracted package-owned root and step component picker shells, leaving `www` responsible only for query data, filtering state, menu slots, and selection callbacks.
71. Extracted the moulding selection popover shell into `packages/sales/src/sales-form/ui/workflow/moulding-selection-popover.tsx`, with `www` passing the calculator slot and persistence callback.
72. Extracted the door step panel wrapper into `packages/sales/src/sales-form/ui/workflow/door-step-panel.tsx`, including door tab/supplier-header presentation while keeping supplier mutations in `www`.
73. Added a package-owned `WorkflowStepRenderer` boundary for the next state/controller phase, so the remaining branch selection can move out of `apps/www` without introducing a bloated shared file.
74. Added package-owned workflow record/helper contracts in `packages/sales/src/sales-form/ui/workflow/workflow-records.ts`, covering step/component/line/shelf/door row shapes plus step navigation, stored row extraction, title helpers, and component override maps.
75. Added package-owned workflow format helpers in `packages/sales/src/sales-form/ui/workflow/workflow-format.ts`, then removed the duplicated local money/profile-adjustment helpers from `www`.
76. Rewired `apps/www` `item-workflow-panel.tsx` to consume shared workflow records/helpers and `getWorkflowSteps()` at the adapter boundary, reducing the panel from 4,256 to 3,961 lines and clearing the focused `item-workflow-panel.tsx` typecheck scan.
77. Extracted the first package-owned workflow controller action module, `workflow-selection-actions.ts`, covering save-selected-component, proceed-multi-select, and root-component selection as pure patch/active-step calculations.
78. Rewired `apps/www` `item-workflow-panel.tsx` to call the shared selection actions and keep only Zustand `updateLineItem`, active-step state updates, and editor activation locally, reducing the panel from 3,961 to 3,826 lines.
79. Added `workflow-selection-actions.test.ts` with focused coverage for root selection, item-type selection routing, and multi-select door proceed behavior.
80. Started Phase 1 from the 100% checklist by adding `workflow-component-edit-actions.ts` for component edit state, save patch generation, and quick price override patch generation.
81. Rewired `apps/www` `item-workflow-panel.tsx` to use the package-owned component edit actions while keeping modal open/close state, browser prompt, uploads, and Zustand writes in the app adapter.
82. Added `workflow-component-edit-actions.test.ts` covering edit state construction, save patch behavior, and quick price override behavior.
83. Extracted door/HPT workflow actions into `workflow-door-actions.ts`, covering supplier update, door swap, generic selected component removal, and HPT door option removal as pure package-owned patch/action results.
84. Extracted moulding removal/update behavior into `workflow-moulding-actions.ts`, returning a combined meta, quantity, total, and form-step patch for the `www` adapter to persist.
85. Rewired `apps/www` `item-workflow-panel.tsx` to delegate door/HPT/moulding patch calculations to package-owned actions, keeping only Zustand writes and active-door/step UI state in the app.
86. Added focused tests `workflow-door-actions.test.ts` and `workflow-moulding-actions.test.ts`; the package workflow action suite now covers selection, component edit/price override, door/HPT, and moulding removal actions.
87. Started Phase 2 by extracting the House Package Tool presentation and row controls into `packages/sales/src/sales-form/ui/workflow/house-package-tool-panel.tsx`, with `www` passing active-door state, row persistence, size configuration, swap/delete callbacks, money formatting, and image resolution as composition props.
88. Expanded `WorkflowStepRenderer` so the package-owned renderer handles HPT and redirect-disabled branch selection, while falling back to composed panels for shelf, service, moulding, supplier, and component picker content.
89. Rewired `apps/www` `item-workflow-panel.tsx` to consume `HousePackageToolPanel` and `WorkflowStepRenderer`, reducing the app panel from 3,458 lines after Phase 1 to 2,946 lines while keeping app-only dev logging, supplier APIs, prompts, uploads, and Zustand writes outside the package.
90. Added `WorkflowShelfPanel` in `packages/sales` and rewired the `www` shelf branch to consume the shared shelf shell while leaving product/category data preparation, dev logging, and persistence callbacks in the app adapter.
91. Extracted the step component picker card/action/moulding-popover/toolbar layout into `WorkflowStepComponentPanel`, with `www` now passing callbacks for select, edit, redirect, delete, door sizing, moulding quantity, search, refresh, and custom-component toggles.
92. Completed Phase 2 focused validation: the workflow action/dual-pricing package suite remains 17 passing tests, and focused `@gnd/www` / `@gnd/sales` scans are quiet for the migrated workflow files aside from unrelated existing repository typecheck noise.
93. Started and completed Phase 3 by adding `packages/sales/src/sales-form/state` with split state modules for types, initial state, editor/meta/line-item/extra-cost/summary/save actions, and active-item/summary selectors.
94. Replaced the 502-line `apps/www` sales form Zustand store implementation with a 159-line adapter that delegates all pure state transitions to `packages/sales` while keeping the existing `useNewSalesFormStore` API stable for `www` components.
95. Added focused package tests for shared state line-item and summary actions, then re-ran the combined state/workflow/dual-pricing migration suite with 17 passing tests and no failures.
96. Ran focused `@gnd/www` and `@gnd/sales` typecheck scans for `new-sales-form/store`, sales-form state modules, and package exports; scans are quiet for the Phase 3 files. Full package/app typechecks still inherit unrelated existing repository errors, including `bun:test` type declarations and legacy `www` surfaces.
97. Completed Phase 4 by expanding `SalesFormComposition` with record, state, data, actions, surface mode, and mobile footer options, then making `SalesFormShell` support both fixed `www` layout and embedded dealership layout.
98. Cut `apps/www` `NewSalesForm` onto `SalesFormShell`, passing customer selector, payment review, recovery banner, workflow panel, floating actions, overview summary, and sales history through slots while preserving existing save, print, packing, settings, and permission behavior.
99. Cut `apps/dealership` `DealerQuoteComposer` onto the same `SalesFormShell` in embedded mode, with dealer customer/profile fields as `MainPanel`, dealer totals as `SummaryPanel`, and dealer quote persistence/actions passed through the composition object.
100. Re-ran the combined dual-pricing/workflow/state suite with 17 passing tests; focused `@gnd/sales`, `@gnd/www`, and `@gnd/dealership` scans are quiet for the Phase 4 shell/composition files.
101. Completed Phase 5 by adding dealer-scoped form state types and a `useDealerSalesFormState` adapter that hydrates create/edit quote records and delegates customer/profile/tax state to package state reducers.
102. Replaced ad hoc dealership line-item mutation state with `useSalesFormActions`, which delegates add/update/remove line-item transitions to package-owned reducers.
103. Split dealership quote UI into `DealerQuoteMainPanel` and `DealerQuoteSummaryPanel`, keeping the composer as a composition assembler around shared `SalesFormShell`, `SalesFormLineItemsPanel`, and `SalesFormTotalsCard`.
104. Preserved dealer quote create/edit persistence and existing quote-to-order conversion through dealer portal tRPC/DB boundaries; dealership internal-only features remain hidden through capabilities and permissions.
105. Re-ran the combined dual-pricing/workflow/state suite with 17 passing tests; focused dealership scans are quiet for `dealer-sales-form`, and focused sales scans are quiet except existing `bun:test` type-declaration noise.
106. Started Phase 6 by removing obsolete `www` compatibility wrappers for header actions, status strip, line items, summary sidebar, and workflow modals after Phase 4 made `SalesFormShell` own the shared summary/root layout.
107. Rewired `apps/www` `NewSalesForm` and `item-workflow-panel.tsx` to import shared package components directly from `@gnd/sales/sales-form` instead of local wrapper files.
108. Re-ran the combined dual-pricing/workflow/state suite with 17 passing tests; focused scans are quiet for removed wrappers and direct package imports. The focused `www` scan still reports an unrelated existing settings modal type issue.
109. Continued Phase 6 by moving `www` overview option/default-profile/tax-rate/summary-drift helpers into `packages/sales/src/sales-form/ui/overview`, then rewired `invoice-overview-panel.tsx` to consume those package helpers.
110. Added focused overview helper tests covering default profile selection, select option generation, tax-rate lookup, and summary drift detection.
111. Moved workflow line display total calculation into `packages/sales/src/sales-form/ui/workflow/workflow-line-totals.ts`, exported it from the package, and rewired `www` `item-workflow-panel.tsx` to pass the package helper into `WorkflowLineList`.
112. Added focused workflow line total tests; the combined dual-pricing/workflow/state/overview suite now has 22 passing tests and 0 failures. Focused `@gnd/www` scans are quiet for the touched Phase 6 files; focused `@gnd/sales` scans only show existing `bun:test` type-declaration noise for test files.
113. Continued Phase 6 by extracting duplicated workflow component visibility/pricing logic into `packages/sales/src/sales-form/ui/workflow/workflow-visible-components.ts`.
114. Rewired `apps/www` `item-workflow-panel.tsx` normal-step and door-step component lists to call `resolveWorkflowVisibleComponents`, keeping only app query inputs and memo dependencies local.
115. Added focused workflow visible-component tests; the combined dual-pricing/workflow/state/overview suite now has 23 passing tests and 0 failures. `item-workflow-panel.tsx` is down to 2,691 lines.
116. Continued Phase 6 by extracting shelf and door auto-sync calculations into `packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.ts`, covering persisted shelf row normalization, initial shelf rows, shared door surcharge recalculation, route override handling, and pure line patch generation.
117. Rewired `apps/www` `item-workflow-panel.tsx` to call `buildWorkflowShelfSyncPatch`, `buildInitialWorkflowShelfPatch`, and `buildWorkflowDoorSyncPatch`, leaving only dev-flow logging and Zustand `updateLineItem` writes in the app adapter.
118. Added focused sync patch tests; the combined dual-pricing/workflow/state/overview suite now has 26 passing tests and 0 failures. Focused `@gnd/www` scans are quiet for the touched Phase 6 files, and focused `@gnd/sales` scans only show existing `bun:test` type-declaration noise for test files. `item-workflow-panel.tsx` is down to 2,616 lines.
119. Continued Phase 6 by adding `packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts` for shared moulding row contexts/patches, service row contexts/patches, shelf section patch derivation, HPT door row patching, and door-size variant patching.
120. Rewired `apps/www` `item-workflow-panel.tsx` to use the shared row patch helpers while keeping dev-flow logging, product/category option wiring, prompts, modal state, and Zustand writes local.
121. Added focused workflow row patch tests; the combined dual-pricing/workflow/state/overview suite now has 31 passing tests and 0 failures. Focused `@gnd/www` scans are quiet for the touched Phase 6 files, and focused `@gnd/sales` scans only show existing `bun:test` type-declaration noise for test files. `item-workflow-panel.tsx` is down to 2,533 lines.
122. Finished Phase 6 by moving component-picker select-all and component redirect patch generation into `workflow-selection-actions.ts`, then rewired `apps/www` `item-workflow-panel.tsx` to keep only the Zustand write and active-step/modal state update.
123. Added focused selection-action regression coverage for select-all and redirect rerouting; the combined dual-pricing/workflow/state/overview suite now has 33 passing tests and 0 failures.
124. Completed the Phase 6 final audit: obsolete `www` compatibility wrapper references are gone, no `use-www-*` naming exists in the sales form adapters, `www` and dealership consume package-owned shared sales form surfaces directly, focused `@gnd/www` scans are quiet for touched files, focused `@gnd/sales` scans only show existing `bun:test` test declaration noise, and `item-workflow-panel.tsx` is down to 2,446 lines.
125. Started and completed Phase 7 by adding `buildDualSalesFormPricingSnapshot` in `packages/sales`, preserving the existing `calculateDualSalesFormPricing` engine while making profile ids, labels, coefficients, line snapshots, internal totals, dealer totals, source, and timestamp explicit.
126. Hardened dealer quote persistence in `packages/db/src/queries/dealers.ts` with an explicit `pricingSnapshot`, dealer-facing lines, internal lines, per-line internal/dealer unit and total metadata, and customer-facing `newSalesForm.summary` while keeping persisted `SalesOrders` financial fields internal/GND-facing.
127. Preserved quote-to-order pricing by carrying existing quote metadata forward during conversion and adding conversion metadata without recomputing the quote snapshot.
128. Switched dealer portal sales document list/detail responses to show dealer/customer-facing totals and omit raw `meta`, preventing internal pricing snapshots from being returned to dealership clients.
129. Added dealer print pricing surface support: dealer-owned print data defaults to customer-facing totals and line prices, while an explicit `pricingMode: "internal"` can preserve internal/GND pricing for internal contexts.
130. Rewired the dealership quote composer to use the shared dual-pricing snapshot builder for UI totals, keeping the server as the source of truth for persisted internal/dealer snapshots.
131. Added focused regression coverage for shared dual-pricing snapshots, DB dealer quote pricing snapshots, and dealer print pricing surfaces. The combined migration suite now has 37 passing tests and 0 failures; `@gnd/db typecheck` and `@gnd/dealership typecheck` pass. Focused `@gnd/sales` scans only show existing `bun:test` declaration noise in older print test files.
132. Completed Phase 8 by extracting dealer print branding resolution into `packages/sales/src/print/dealer-branding.ts`, covering dealer logo URL, company name, billing address, and empty-logo fallback behavior with focused tests.
133. Preserved dealer branding across all sales PDF render paths by carrying `logoUrl` from `getPrintDocumentData` through direct `www` downloads, public/snapshot API preview downloads, notification attachments, dispatch attachments, and background snapshot generation.
134. Extended sales print-data cache records to retain `logoUrl` in cache metadata, so regenerated/cached dealer PDFs keep the correct dealer brand instead of falling back to GND branding.
135. Re-ran focused Phase 8 validation: dealer branding/pricing, dual-pricing, and dealer query tests pass with 8 tests and 33 expects; focused sales scans only show the existing older `bun:test` test-declaration noise, focused jobs/api/notifications scans show no Phase 8 logo/render errors, and `git diff --check` is clean.
136. Completed Phase 9 by hardening dealer customer saves so a dealer can only assign sales profiles owned by the same dealer, preventing cross-dealer profile leakage through customer/profile relations.
137. Hardened dealer quote saves so an explicit dealer sales profile id must belong to the active dealer; invalid or cross-dealer profile ids now fail before quote creation/update.
138. Hardened dealer sales document detail responses by stripping raw `items` from the returned object and exposing only dealer-facing `lineItems`, preventing internal line metadata such as internal unit prices/totals from reaching dealership clients.
139. Added dealer-isolation regression coverage for profile assignment, quote profile assignment, document detail scoping, document list scoping, metadata stripping, dealer-facing totals, and quote-to-order active-dealer scoping.
140. Re-ran focused Phase 9 validation: dealer pricing/isolation, dealer print branding/pricing, and dual-pricing tests pass with 13 tests and 45 expects; focused `@gnd/db`, `@gnd/api`, and `@gnd/dealership` scans show no Phase 9 dealer-query/router/app errors; `git diff --check` is clean.
141. Completed Phase 10 by auditing the remaining sales-form wrapper references: obsolete `www` compatibility imports for header actions, status strip, line items, summary sidebar, workflow modals, and `use-www-*` naming are absent.
142. Split the dealership portal surface from one 709-line mixed file into a 21-line section router plus focused files for customers, sales profiles, sales documents, settings, and shared field/date/currency helpers under `apps/dealership/src/components/dealer-portal`.
143. Re-ran focused Phase 10 validation: the shared dealer pricing/isolation/branding suite still passes with 13 tests and 45 expects, focused `@gnd/dealership` scans show no dealer portal or dealer sales form errors, and `git diff --check` is clean.
144. Started Phase 11 static QA with the broad shared migration suite: dealer pricing/isolation, dealer print branding/pricing, dual-pricing, workflow action modules, workflow row/sync/visibility/line-total helpers, overview helpers, and shared state action tests pass with 44 tests and 148 expects.
145. Ran focused Phase 11 type scans: `@gnd/dealership` shows no dealer portal/sales-form/session/API route matches; `@gnd/www` only reports known legacy download route `qrCodeDataUrl`/`Buffer` issues and the existing new-sales-form settings modal type issue.
146. Started the dealership dev server with `bun run dealership`; Next reported ready on port 4200, but the Turbo dev process exited after the smoke attempt.
147. Installed matching Playwright Chromium revisions for the local runtime, but headless Chromium still cannot launch from this Codex sandbox because macOS denies the Chromium MachPort rendezvous permission.
148. Ran a production dealership build with `bun run --filter @gnd/dealership build`; it completed successfully, including `/login`, `/[section]`, Better Auth route, and dealership tRPC route generation.
149. Started the built dealership app with `next start` on `127.0.0.1:4200` outside the sandbox, then verified runtime HTTP behavior: `/login` returns 200 with the dealer login form, while `/quotes`, `/customers`, and `/settings` return 307 redirects to `/login` when unauthenticated. The production server was stopped afterward.

### Plan
1. ✅ Scaffold `apps/dealership` as the dealer portal for `dealers.gndprodesk.com`, using existing monorepo conventions for Next.js, TRPC, auth, UI, and deployment scripts.
2. ✅ Separate dealers from customers in the admin UX by adding a dedicated Dealers page where staff can add/search/manage dealers, instead of marking dealers directly from the Customers page.
3. ✅ Implement dealer creation from two paths: select an existing customer to create a dealer account, or enter a new dealer profile with dealer name and email only, then send the onboarding guide/setup invite.
4. ✅ Retain and harden existing dealer primitives (`DealerAuth`, `DealerToken`, `DealerStatusHistory`) while adding explicit dealer profile/company fields, status handling, onboarding tokens, Better Auth linkage, and notification payloads.
5. ✅ Add dealer-owned data boundaries for customers, sales profiles, quotes, and orders so dealer-managed customers remain separate from GND/global customer records.
6. In progress: use the new sales form system as the shared form engine in `packages/sales`, with `apps/www` consuming extracted mapper/normalization logic plus shared header/status/line-items/summary/overview/workflow UI shells/hooks/record helpers, package-owned workflow action modules, and package-owned state reducers/selectors. Both apps now use explicit capability/permission adapters.
7. In progress: add dual dealer pricing where GND charges the dealer using the standard/internal sales profile, while the dealer charges their own customer using the dealer-selected sales profile. Dealer quote creation persists both snapshots, quote edit/reopen is wired, and quote-to-order conversion is wired; deeper shared-form edit parity remains.
8. ✅ Build dealer portal surfaces for Dashboard, Orders, Quotes, Customers, Sales Profiles, and Company Settings, with ledger-only analytics for v1.
9. ✅ Add dealer company branding for invoice/quote printing. Dealer-owned sales documents now resolve logo/address overrides in print document data, cached print-data records retain dealer logo metadata, and all current PDF render paths pass the resolved logo into the v2 PDF renderer.
10. ✅ Harden authorization, tests, and launch verification so dealer sessions cannot access another dealer's customers, profiles, orders, quotes, documents, or branding. Dealer portal DB queries now enforce active-dealer profile/customer/document scoping and strip internal pricing metadata from dealer-facing document detail.

### Resume Prompt
Continue the Dealership Program from `brain/plans/ongoing.md`. Current phase: Phase 11 build/runtime smoke is complete for unauthenticated dealership routes, but authenticated browser click-through requires a valid dealer login/session; Phase 12 should wait until the remaining authenticated Phase 11 smoke is completed. Dealer quote creation/edit/conversion is wired to shared package UI and the overview plus workflow leaf TSX/hooks/modals/list/toolbar/grid/preview/card/actions/pickers/moulding-popover/door-step/service-editor/moulding-editor/shelf-sections/supplier-manager shells plus workflow record/format helpers and package-owned selection, component edit/price override, door/HPT, moulding action modules, state modules, visible-component helpers, line-total helpers, shelf/door sync patch helpers, workflow row patch helpers, select-all helpers, redirect patch helpers, dual-pricing snapshot helpers, print branding helpers, and dealer-isolation DB guards have moved into `packages/sales`/`packages/db` boundaries. Phase 11 validation completed so far: the broad migration suite passes with 44 tests and 148 expects; focused dealership scans show no dealer portal/sales-form/session/API errors; focused `www` scans only report known legacy download route and settings modal type issues; `bun run --filter @gnd/dealership build` passes; built dealership runtime returns 200 for `/login` and 307 redirects to `/login` for protected `/quotes`, `/customers`, and `/settings` when unauthenticated. Remaining blocker: a valid dealer login/session is needed for authenticated browser QA, and headless Chromium still cannot launch from this Codex sandbox due macOS MachPort permission errors even after installing matching Playwright browsers. Important product decisions: dealers are managed from a dedicated Dealers page, adding a dealer supports existing customer lookup or new dealer name/email invite, onboarding sends a setup guide through the channel notification system, dealer-managed customers are separate dealer-owned records, dealer auth uses Better Auth from `packages/auth`, the new sales form system in `packages/sales` is shared by `apps/www` and `apps/dealership`, the shared sales package can include both `.ts` and `.tsx`, app projects keep neutral `use-sales-form-*` route/session/API adapters, feature visibility is controlled by explicit capabilities and permissions, and v1 billing is ledger-only. Update `brain/plans/ongoing.md` as progress continues.

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
- Current Phase: Dealer portal setup route implemented; dealer login/session authorization next
- Next Step: Connect dealer login/session authorization in `apps/dealership`, then gate dashboard/orders/quotes/customers/profiles/settings by the authenticated dealer account.
- Blockers: API, `www`, notifications, email, and dealership app typechecks currently inherit unrelated existing errors from `apps/api`, `packages/ui`, `packages/email`, and `packages/sales`; `@gnd/db` typecheck and Prisma generation pass after the dealership schema changes. Filtered checks show no dealer-page/router/onboarding-channel errors after the latest changes.
- Related Files: apps/dealership, apps/www/src/app/(sidebar)/(sales)/sales-book/dealers/page.tsx, apps/www/src/components/dealers/dealers-admin-page.tsx, apps/api/src/schemas/dealer.ts, apps/api/src/trpc/routers/dealer.route.ts, apps/api/src/trpc/routers/_app.ts, packages/db/src/queries/dealers.ts, packages/db/src/queries/index.ts, packages/db/src/schema/sales.customer.prisma, packages/db/src/schema/sales.prisma, packages/db/src/schema/migrations/20260515120000_dealership_foundation/migration.sql, packages/notifications/src/channels.ts, packages/notifications/src/payload-utils/channel-triggers.ts, packages/notifications/src/schemas.ts, packages/notifications/src/types/dealer-onboarding.ts, packages/email/emails/dealer-onboarding.tsx, packages/auth/src/utils.ts, packages/sales/src/sales-form, packages/sales/src/print/get-print-document-data.ts
- Last Updated: 2026-05-15

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

### Plan
1. ✅ Scaffold `apps/dealership` as the dealer portal for `dealers.gndprodesk.com`, using existing monorepo conventions for Next.js, TRPC, auth, UI, and deployment scripts.
2. ✅ Separate dealers from customers in the admin UX by adding a dedicated Dealers page where staff can add/search/manage dealers, instead of marking dealers directly from the Customers page.
3. ✅ Implement dealer creation from two paths: select an existing customer to create a dealer account, or enter a new dealer profile with dealer name and email only, then send the onboarding guide/setup invite.
4. In progress: retain and harden existing dealer primitives (`DealerAuth`, `DealerToken`, `DealerStatusHistory`) while adding explicit dealer profile/company fields, status handling, onboarding tokens, and notification payloads.
5. ✅ Add dealer-owned data boundaries for customers, sales profiles, quotes, and orders so dealer-managed customers remain separate from GND/global customer records.
6. Use the new sales form system as the shared form engine in `packages/sales`, with both `apps/www` and `apps/dealership` consuming the same domain/application contracts.
7. Add dual dealer pricing: GND charges the dealer using the standard/internal sales profile, while the dealer charges their own customer using the dealer-selected sales profile.
8. Build dealer portal surfaces for Dashboard, Orders, Quotes, Customers, Sales Profiles, and Company Settings, with ledger-only analytics for v1.
9. Add dealer company branding for invoice/quote printing: logo, company name, contact details, and address override dealer-created sales documents while non-dealer documents keep GND defaults.
10. Harden authorization, tests, and launch verification so dealer sessions cannot access another dealer's customers, profiles, orders, quotes, documents, or branding.

### Resume Prompt
Continue the Dealership Program from `brain/plans/ongoing.md`. Current phase: dealer portal setup route implemented; dealer login/session authorization next. Next step: connect dealer login/session authorization in `apps/dealership`, then gate dashboard/orders/quotes/customers/profiles/settings by the authenticated dealer account. Important product decisions: dealers are managed from a dedicated Dealers page, adding a dealer supports existing customer lookup or new dealer name/email invite, onboarding sends a setup guide through the channel notification system, dealer-managed customers are separate dealer-owned records, the new sales form system in `packages/sales` is shared by `apps/www` and `apps/dealership`, and v1 billing is ledger-only. Validation status: Prisma generation and `@gnd/db` typecheck pass; full API/www/notifications/email/dealership typechecks inherit unrelated existing errors from `apps/api`, `packages/ui`, `packages/email`, and `packages/sales`, while filtered checks show no dealer-specific errors. Update `brain/plans/ongoing.md` as progress continues.

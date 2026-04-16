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

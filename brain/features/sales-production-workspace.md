# Sales Production Workspace

## Goal
Provide a cleaner production operations surface for both admins and production workers with fast due-date triage, clear urgency alerts, and a more usable daily queue.

## Routes
- Admin board: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/(admin)/productions/page.tsx`
- Admin board v2: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/(admin)/productions/v2/page.tsx`
- Worker sales-book route: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx`
- Worker sidebar route: `apps/www/src/app/(sidebar)/production/dashboard/page.tsx`
- Worker sidebar route v2: `apps/www/src/app/(sidebar)/production/dashboard/v2/page.tsx`

## Shared UI
- Shared client shell: `apps/www/src/components/production-workspace.tsx`
- Shared list/table: `apps/www/src/components/tables/sales-production/*`
- Shared filter state: `apps/www/src/hooks/use-sales-production-filter-params.ts`

## V2 Architecture
- New package boundary: `packages/sales/src/production-v2/*`
- Route entry points delegate to dedicated v2 queries:
  - `sales.productionsV2`
  - `sales.productionDashboardV2`
  - `sales.productionOrderDetailV2`
- The v2 pages do not reuse the shared production workspace or modal flow.
- Production order interaction is moving to inline collapsible sections instead of the legacy production modal.
- Worker and admin pages are separate page compositions, but share v2 package contracts and application services.

## Core UX
- Summary cards for active queue, past due, due today, and due tomorrow
- Alert sections for today and tomorrow with direct open-to-overview actions
- Compact due-date calendar strip that applies exact-date filtering to the queue
- Search/filter panel retained from the existing production filter system
- Worker and admin routes now reuse the same workspace shell with role-specific copy

## V2 Core UX
- Worker dashboard v2 is a mobile-friendly assigned-production board with:
  - due-date cards
  - clickable month calendar
  - worker-only queue
  - inline expandable order detail
  - note activity stream in the expanded section
- Admin productions v2 is a dedicated admin board with:
  - completed label visibility
  - expandable order detail
  - quick-assign panel scaffolded inline
- Inline detail sections are the new home for production information, notes/activity, and production actions such as submission and submission removal.

## Data Contract
- `sales.productions`: full/admin production queue
- `sales.productionTasks`: authenticated worker queue
- `sales.productionDashboard`: summary counts, alert buckets, and next-10-day calendar counts
- `productionDueDate`: exact queue filter used by the compact calendar
- `show`: alert preset selector for `due-today`, `due-tomorrow`, and `past-due`

## V2 Data Contract
- `sales.productionsV2`: v2 list query for worker/admin boards
- `sales.productionDashboardV2`: v2 summary counts plus label metadata including `completed`
- `sales.productionOrderDetailV2`: lazy inline detail payload for expanded order sections
- Worker scoping remains server-enforced in v2 through authenticated `workerId` injection at the router layer.

## Notes
- The rebuild intentionally reuses the existing production list infrastructure instead of creating a second list system.
- The current dashboard summary is optimized around open production queue visibility and near-term due dates.
- The current v2 slice is an architecture-first foundation:
  - new routes and sidebar discovery are in place
  - inline expand/collapse detail is live
  - note activity is visible inline
  - worker/admin action buttons are scaffolded, with mutation wiring planned as the next slice

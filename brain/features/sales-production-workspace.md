# Sales Production Workspace

## Goal
Provide a cleaner production operations surface for both admins and production workers with fast due-date triage, clear urgency alerts, and a more usable daily queue.

## Routes
- Admin board: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/(admin)/productions/page.tsx`
- Worker sales-book route: `apps/www/src/app/(clean-code)/(sales)/sales-book/(pages)/production-tasks/page.tsx`
- Worker sidebar route: `apps/www/src/app/(sidebar)/production/dashboard/page.tsx`

## Shared UI
- Shared client shell: `apps/www/src/components/production-workspace.tsx`
- Shared list/table: `apps/www/src/components/tables/sales-production/*`
- Shared filter state: `apps/www/src/hooks/use-sales-production-filter-params.ts`

## Core UX
- Summary cards for active queue, past due, due today, and due tomorrow
- Alert sections for today and tomorrow with direct open-to-overview actions
- Compact due-date calendar strip that applies exact-date filtering to the queue
- Search/filter panel retained from the existing production filter system
- Worker and admin routes now reuse the same workspace shell with role-specific copy

## Data Contract
- `sales.productions`: full/admin production queue
- `sales.productionTasks`: authenticated worker queue
- `sales.productionDashboard`: summary counts, alert buckets, and next-10-day calendar counts
- `productionDueDate`: exact queue filter used by the compact calendar
- `show`: alert preset selector for `due-today`, `due-tomorrow`, and `past-due`

## Notes
- The rebuild intentionally reuses the existing production list infrastructure instead of creating a second list system.
- The current dashboard summary is optimized around open production queue visibility and near-term due dates.

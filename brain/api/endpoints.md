# API Endpoints

## Purpose
Tracks notable API surfaces and where they are implemented.

## Current Notes
- Primary API implementation lives in `apps/api`.
- The codebase uses route/query organization around domain-specific files and tRPC routers.
- Sales production routes now include:
  - `sales.productions`: admin-facing production queue list with due-date/status filtering
  - `sales.productionTasks`: worker-scoped production queue list using the authenticated user as `workerId`
  - `sales.productionDashboard`: production workspace summary query for alert buckets, queue counts, and compact due-date calendar data
- Sales overview routes now include:
  - `sales.getSaleOverview`: dedicated single-sale overview query used by the v2 sales overview system; loads one order/quote directly instead of routing through the broader sales list query
- Community production routes now include:
  - `community.getUnitProductions`: community unit-production task list with builder/project/task/status/due-date filtering and `ids` deep-link filtering
  - `community.getUnitProductionSummary`: lightweight summary query powering unit-production widgets for total tasks, units covered, queued, started, completed, and past-due counts
  - `filters.unitProduction`: filter metadata for the rebuilt `/community/unit-productions` table surface
- Community notification channels now include:
  - `community_unit_production_started`
  - `community_unit_production_stopped`
  - `community_unit_production_completed`
  - `community_unit_production_batch_updated`
- Customer routes now include:
  - `customer.getCustomerDirectoryV2Summary`: lightweight stats for the `sales-book/customers/v2` directory header cards
  - `customer.getCustomerOverviewV2`: shared customer overview payload used by both the v2 full page and the 3xl side-sheet surface

## TODO
- Summarize the highest-value API surfaces by domain.
- Link important sales, checkout, dispatch, jobs, and customer flows to their implementation areas.

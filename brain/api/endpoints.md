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

## TODO
- Summarize the highest-value API surfaces by domain.
- Link important sales, checkout, dispatch, jobs, and customer flows to their implementation areas.

# Production Database Performance Optimization Plan

## Context
The July 9, 2026 production query-insights export shows performance pressure concentrated in a few query families rather than broad database saturation. The highest-impact fixes are query-shape changes plus targeted composite indexes, validated with `EXPLAIN` before schema changes.

## Evidence Summary
Source: pasted production query-insights table for the `gndprodesk` keyspace, parsed from 75 query rows.

| Query Family | Total Time | Count | Weighted p50 | Worst p99 | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Notes tag lookup (`NotePad` + repeated `NoteTags EXISTS`) | 1007s | 2069 | 462ms | 1343ms | Largest total-time issue; driven by sales note counts/activity-tree tag filters. |
| Auth/session/permission hydration | 326s | 251615 | 1ms | 4ms | Low latency per query, but very high volume per request/session. |
| Sales order status/payment aggregates (`SalesOrders` + `SalesStat`) | 275s | 2525 | 97ms | 465ms | `getOrdersSummary` repeats the same expensive predicate across count/sum queries. |
| Inventory/Dyke component product aggregates | 160s | 72 | 2038ms | 3725ms | Low volume, high latency; product report and step-component aggregate patterns load/aggregate too much. |
| Sales search/list counts with `LIKE` joins | 160s | 2175 | 64ms | 240ms | Search across orders/customers/address/producer is not index-friendly with `contains`. |
| Other SalesOrders list/detail | 120s | 2103 | 56ms | 2044ms | Includes broad list/detail hydration and nested Dyke form lookups. |
| Community/project aggregate/list | 53s | 304 | 55ms | 2447ms | Project list/overview counts are expensive when aggregated per project. |

## Primary Findings

### 1. Notes Tag Lookup Is The Top Production Cost
Observed shape:
- `NotePad.deletedAt is null`
- multiple correlated `EXISTS` subqueries over `NoteTags`
- each `NoteTags` filter uses `tagName`, `tagValue in (...)`, `deletedAt is null`, and `notePadId`

Likely owners:
- `packages/notifications/src/activity-tree.ts`
- `apps/api/src/db/queries/sales.ts` `salesNotesCount`
- legacy web note actions under `apps/www/src/modules/notes/actions/` and `apps/www/src/actions/sales-note-count.ts`

Plan:
1. Rewrite sales note counts to query `NoteTags` first and group by `salesId`/`salesNo`, then fetch note metadata only when needed.
2. For activity-tree filters, derive candidate `notePadId` values from `NoteTags` with grouped intersections before fetching `NotePad` rows.
3. Validate these index candidates with `EXPLAIN`:
   - `NoteTags(tagName, tagValue, deletedAt, notePadId)`
   - `NoteTags(notePadId, tagName, tagValue, deletedAt)`
   - `NotePad(deletedAt, createdAt, id)`
4. Prefer the query rewrite before adding both `NoteTags` indexes; the rewrite may make one index sufficient.

Expected impact: remove the current top query shape from the hot path and reduce note-count/activity-tree total time by an estimated 70-90%.

### 2. Sales Order Summary Runs The Same Expensive Predicate Repeatedly
Observed shape:
- `SalesOrders` filtered by `type`, `deletedAt`, `amountDue`, `status`, and default pending logic
- repeated `EXISTS` / `NOT EXISTS` over `SalesStat` for `prodCompleted` and `dispatchCompleted`
- `getOrdersSummary` currently runs separate count and sum queries over the same `where`

Likely owners:
- `apps/api/src/db/queries/sales-orders-v2.ts`
- `packages/sales/src/utils/where-queries.ts`

Plan:
1. Replace the five `getOrdersSummary` Prisma calls with one aggregate query that computes:
   - total orders
   - sum `grandTotal`
   - sum `amountDue`
   - paid count
   - evaluating count
2. Validate composite indexes:
   - `SalesOrders(type, deletedAt, createdAt, id)`
   - `SalesOrders(type, deletedAt, amountDue, createdAt, id)`
   - `SalesOrders(type, status, deletedAt, id)`
   - `SalesStat(salesId, type, deletedAt, total, percentage)`
3. Longer term, move default pending/open order summary reads onto a control/projection read model instead of repeated legacy `SalesStat` predicates.

Expected impact: reduce summary scans from five passes to one and make the default orders page materially cheaper.

### 3. Dyke/Product Reports Aggregate Too Much At Request Time
Observed shape:
- `DykeStepProducts` list/count queries with joins to `DykeStepForm`, `DykeSalesDoors`, `HousePackageTools`, `SalesOrderItems`, and `SalesOrders`
- p99 between 2.2s and 3.7s on low query volume

Likely owners:
- `apps/api/src/db/queries/product-report.ts`
- `apps/api/src/db/queries/sales-form.ts`
- `packages/inventory/src/application/definitions/dyke-step-components.ts`

Plan:
1. Stop loading all matching products and all child rows before sorting/paginating in JS.
2. Build a DB-level aggregate query for product report rows, ordered and limited before secondary hydration.
3. Reuse or extend `DykeProductsMetric` as a persisted read model for selection count, quantity, sales price, and cost price.
4. Validate composite indexes:
   - `DykeStepForm(componentId, deletedAt, createdAt, price, basePrice, salesItemId)`
   - `DykeSalesDoors(stepProductId, deletedAt, createdAt, salesOrderId, salesOrderItemId)`
   - `HousePackageTools(stepProductId, moldingId, deletedAt, createdAt, salesOrderId, orderItemId)`
   - `DykeStepProducts(deletedAt, dykeStepId, id)`

Expected impact: move product report p99 from multi-second request-time aggregation toward bounded sub-second reads.

### 4. Auth And Permission Queries Are Cheap But Too Frequent
Observed shape:
- session/user/role/permission lookups run tens of thousands of times
- p50/p99 are low, but total query volume is high

Likely owners:
- `packages/auth/src/better-auth/www-session.ts`
- `packages/auth/src/utils.ts`
- `apps/api/src/db/queries/user.ts`

Plan:
1. Add short-lived server-side session/permission memoization keyed by session id + user id + permission invalidation markers.
2. Ensure tRPC context builds auth once per request and downstream resolvers reuse it instead of calling `auth(ctx)` again.
3. Cache generated `can` maps for 30-60 seconds, invalidated by session deletion, permission edits, user access revocation, and role changes.
4. Validate indexes:
   - `ModelHasPermissions(modelId, modelType, deletedAt, permissionId)`
   - `ModelHasRoles(modelId, deletedAt, roleId, organizationId)`
   - `RoleHasPermissions(roleId, permissionId, deletedAt)`

Expected impact: reduce auth/permission query volume significantly without changing business behavior.

### 5. Search Queries Need A Search Strategy, Not Just Indexes
Observed shape:
- `%contains%` matching across order id, customer, billing address, and producer fields
- count and sum queries are repeated while search filters are active

Plan:
1. Debounce sales search and do not run summary widgets for every intermediate keystroke.
2. Treat exact order-number-like input as exact/prefix `orderId` search before falling back to broad search.
3. Introduce a normalized sales search column/table for common fields, or a dedicated search service if requirements keep expanding.
4. Keep broad `contains` search out of first-paint dashboard paths.

Expected impact: lower load during search-heavy sessions; indexes alone will not fix leading-wildcard `contains`.

### 6. Community Project Counts Should Be Summary-First
Observed shape:
- project rows include multiple `_count` subqueries for homes, jobs, invoices, and production tasks
- p99 reaches 2.4s

Plan:
1. Replace per-row aggregate counts with a lightweight project list query plus on-demand/project-overview counts.
2. For dashboards, read from a project summary query/read model instead of per-project `_count` joins.
3. Validate `deletedAt`-aware relation indexes for `Homes`, `Jobs`, `Invoices`, and `HomeTasks` by `projectId`.

## Rollout Plan

### Phase 0 - Baseline And EXPLAIN
- Capture current top 20 query fingerprints, counts, total time, p50, p99, and max latency over the same observation window.
- Run `EXPLAIN FORMAT=JSON` or provider equivalent for the top notes, sales summary, Dyke aggregate, and project aggregate fingerprints.
- Confirm row counts and selectivity for candidate indexes before applying schema changes.

### Phase 1 - Low-Risk Query Rewrites
- Rewrite `salesNotesCount` to `NoteTags`-first grouped counts.
- Consolidate `getOrdersSummary` into one aggregate read.
- Add per-request auth/session reuse and short-lived permission memoization.
- Stop product report from loading all child rows before pagination.

### Phase 2 - Targeted Composite Indexes
- Add only indexes proven useful by Phase 0/1 plans.
- Apply through Prisma schema/migration flow; avoid manual production DDL outside the project migration process.
- Roll out one index group at a time and monitor write cost, index size, and hot-query p99.

### Phase 3 - Structural Read Models
- Promote product report/component usage metrics into `DykeProductsMetric` or a new explicit reporting read model.
- Move default sales open/pending summaries to the control/projection layer instead of legacy `SalesStat` predicates.
- Add a sales search read model if broad search remains a common workflow.

### Phase 4 - Observability Guardrails
- Add endpoint-level timing for sales orders, notes/activity tree, product report, auth-session building, and community projects.
- Add query-count sampling around tRPC requests so repeated auth or note-count regressions are visible before they reach production insights.
- Define budget targets:
  - notes count/activity-tree p99 under 250ms
  - sales orders summary p99 under 200ms
  - product report p99 under 500ms
  - auth/session query count reduced by at least 60%

## Non-Goals
- Do not run production data sync or repair jobs as part of this performance analysis.
- Do not add broad indexes without `EXPLAIN` proof.
- Do not refactor sales/inventory correctness behavior during the performance pass unless a query rewrite requires a narrow contract change.

## Brain Documentation Impact
This plan changes planning and operational direction only. It does not change runtime code, schema, migrations, API contracts, or feature behavior yet. Future implementation slices must update `brain/database/schema.md`, `brain/database/migrations.md`, `brain/api/endpoints.md`, and affected feature docs if they add indexes, alter query contracts, or introduce read models.

# Task: Progressive AI Chat T14 — Build schema-aware analytics and charts

## Status
In Progress

## Priority
High

## Created Date
2026-09-13

## Last Updated
2026-09-12

## Global Ticket
- Ticket Position: 14/19

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
GND extension for reviewed query intents, optimized data access, and generative UI. Depends on T05, T08, T10, T11, and T17.

## Implementation Progress
- Completion: 25%
- Current Checklist: 2/8 — versioned semantic catalog and validated query-intent AST
- Blockers: T05, T08, T10, and T11 are complete. T17 remains the activation gate.

## Implementation Decisions
- Use a checked-in semantic catalog over the existing Prisma/MySQL domain model;
  lifecycle rules and scope policies remain reviewed metadata rather than inferred
  from table names.
- Encode the domain in both the metric identity and intent, then reject mismatches
  at the strict Zod boundary.
- Accept only allowlisted metric, filter, operator, grouping, presentation, sort,
  date-range, cursor, and limit values. No SQL text or identifier input exists.
- Treat filters as field-discriminated contracts: dates accept range operators,
  identifiers accept positive safe integers, and categorical values accept only
  equality/set membership. Validate calendar dates and cap ranges at 366 days.
- Mark one-to-many Community aggregation as pre-aggregated before joins and retain
  per-metric query owner, source revision, grant, unit, timezone, currency, soft
  deletion, lifecycle, scope, and freshness metadata.
- Compile the first directly executable metrics through reviewed MySQL statements
  whose identifiers come only from code switches and whose actor scope, timezone,
  dates, filters, and limits remain bound values. Revenue additionally requires
  `viewOrderPayment`; production counts only submissions with no material review
  or an approved review, matching the canonical finalized-submission policy.
- Reject projection-backed status, blocker, and inventory metrics until their
  canonical adapters are installed. The adapters now hydrate only IDs returned
  by the scoped base query, fail closed on incomplete or conflicting evidence,
  deduplicate by reviewed identities, and apply validated filters/grouping/sort/
  limits after canonical projection. Reject cursors until deterministic keyset
  pagination is available instead of accepting intent that would be ignored.
- Bound each executable plan to one query, 5,000 rows, 2 MB, eight seconds, 2,000
  scoped IDs, a measured cost ceiling, best-effort cancellation, and a hard
  deadline race for non-cooperative drivers.

## Implementation Checklist
- [x] Build a versioned semantic catalog from Prisma plus reviewed lifecycle, metric, join, scope, unit, and freshness metadata.
- [x] Define a validated query-intent AST with allowlisted domains, metrics, filters, grouping, sort, and pagination.
- [ ] Compile intents into reviewed parameterized Prisma/SQL query helpers with scope inside every subquery and aggregate.
- [ ] Add query count, row/byte, date-range, timeout, cancellation, and cost bounds.
- [ ] Render KPI, table, bar, line, and area results through typed AI SDK parts and existing GND Recharts wrappers.
- [ ] Include metric definition, sources, date range, currency/unit, freshness, accessible table fallback, and safe drill-downs.
- [ ] Benchmark representative `EXPLAIN` plans and add indexes only with measured read/write evidence.
- [ ] Test one-to-many join duplication, mixed currencies, restricted fields, injection attempts, and forbidden arbitrary SQL.

## Validation Evidence
- `assistant-analytics-catalog-v1` defines six reviewed metrics across Sales,
  Fulfillment, Production, Inventory, and Community using exact checked-in Prisma
  model names and explicit source paths/revisions, stable IDs, deduplication keys,
  safe output fields, date/measure/currency fields, archive/delete policies, and
  lifecycle/scope/join authority. Sales revenue is fixed to USD in the current
  Sales authority and exposes that currency in every safe output.
- Canonical Sales status resolves through `SalesPipelineSnapshot`; Production and
  Inventory declare complete paths back to authorized Sales rows, and every
  qualified date/filter/measure/dedup field plus join endpoint is checked against
  a declared source authority.
- Inventory exposure uses the real exported
  `SalesOverviewInventoryLine.qtyPending` measure. Community progress is defined
  as pre-aggregated Home lifecycle counts by project/status; no unsupported
  completion percentage is inferred.
- Inventory deduplicates by the canonical projected line ID and groups through
  its derived `inventoryCategoryId`, preserving distinct component demand and
  subcomponent-inherited categories.
- The strict intent contract rejects unknown keys including arbitrary `sql`, wrong
  domain ownership, metric-forbidden filters/groupings, reversed date ranges, and
  operator/value shape mismatches. Limits are capped at 100 and cursors at 500
  characters.
- Focused contract tests pass 9/9 with 215 assertions. Targeted Biome and
  `git diff --check` pass. API typechecking reaches only the unrelated existing
  nullable-string error in `packages/sales/src/copy-sales.ts:521` and concurrent
  `runtime-lock.ts` BuildConfig error outside this ticket.
- The first query-plan slice passes 12/12 tests with 40 assertions. It verifies
  grant enforcement, scope in joins and aggregate predicates, exact grouping,
  placeholder/value parity, actor-timezone date filters, canonical finalized
  production, archive exclusion, cursor rejection, cost/row/byte bounds, hard
  timeout, cancellation, and BigInt result sizing.
- The full Assistant API suite passes 117/117 with 674 assertions after the
  compiler changes. Independent specification and standards reviews found no
  remaining actionable issue in this slice; database-enforced cancellation stays
  explicitly pending with the concrete database runner.
- Canonical projection tests pass 28/28 with 276 focused assertions across the
  catalog, compiler, and adapters. They cover empty scopes, order-only status,
  payment-blocker privacy, exact deduplication, incomplete snapshots, conflicting
  inventory identities, duplicate-filter rejection, bounded scoped payloads, and
  runtime-validated query accounting. Both independent reviews are clean for this
  checkpoint; production loader binding remains the next unchecked work.
- The complete Assistant API suite passes 124/124 with 694 assertions after the
  counted-loader budget and empty-scope corrections. API typechecking is clean for
  this work and stops only at the unrelated existing nullable string in
  `packages/sales/src/copy-sales.ts:521`.
- Next implementation slice will install bounded canonical projection adapters
  for Sales status, fulfillment blockers, and inventory exposure before checking
  the query-helper and execution-bound checklist items complete.

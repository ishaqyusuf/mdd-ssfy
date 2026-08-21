# Plan: Production Worker Global Search And Filters

## Type
Feature

## Status
Planned - Awaiting Approval

## Created Date
2026-08-21

## Objective

Make every worker search or worker-visible filter on `/production/dashboard`
query the authenticated worker's complete production-order corpus instead of
intersecting it with the selected queue or Calendar period. Keep tabs as queue
navigation without adding a permanent All tab.

## Current Behavior

- Table search is tab-scoped: `q`, `salesNo`, and `priority` are sent together
  with the selected `show`/`production` preset.
- Calendar search is period-scoped: `q` and `priority` are combined with the
  visible week/month date range, excluding undated and out-of-period matches.
- PageTabs preserve search/filter values because their links replace only tab
  preset parameters.
- Worker ownership is server-owned for list and calendar queries.

## Assumptions

- “All orders” means all active production assignments owned by the logged-in
  worker, including pending, scheduled, unscheduled, and worker-completed work.
- Worker discovery criteria are `q`, `salesNo`, and `priority`; tab/view URL
  values are navigation presets, not user discovery filters.
- Global discovery is a temporary result state, not an All tab.
- Calendar displays the shared result table while discovery is active because a
  date grid cannot represent undated, completed, or out-of-period results.
- Clearing discovery restores the originating tab and Calendar period.
- Clicking a tab or analytics card exits discovery, clears discovery criteria,
  and applies that queue preset in one URL transition.
- Tab and analytics counts remain stable account totals. Results get a separate
  count/empty state.
- No schema work is planned unless measured performance requires a separately
  approved index or projection.

## Detailed Execution Plan

### Phase 0 - Acceptance Baseline

1. Create development fixtures for one worker with a uniquely searchable Due
   Today, Unscheduled, Past Due, Future, and worker-completed order, plus a
   similar order assigned to another worker.
2. Capture current Due Today and Calendar results for `q`, `salesNo`, and
   `priority` to prove the existing tab/period intersection.
3. Preserve current free-text field coverage; this task changes scope, not the
   search vocabulary.
4. Lock acceptance: all five owned categories can be found from any tab, the
   other worker is excluded, filters compose, pagination works, and rows open
   the existing Production Tasks overview.

### Phase 1 - Canonical Discovery Resolver

1. Add a pure resolver near
   `packages/sales/src/production-workspace-query.ts` that separates:
   authenticated base scope, user discovery criteria, tab presets, and
   Calendar presentation state.
2. Trim strings before deriving discovery mode so whitespace is inactive.
3. Preserve current mappings when discovery is inactive.
4. When discovery is active, remove only tab-derived `production`, `show`, and
   exact-date constraints; retain `q`, `salesNo`, `priority`, sort, and page
   size. Never derive worker ownership from client input.
5. Return one explicit scope descriptor for the workspace, table, Calendar,
   tabs, and empty state rather than duplicating booleans.
6. Keep endpoint input backward-compatible. Add a validated explicit scope only
   if the shared resolver cannot express the contract safely.

### Phase 2 - Global Authorized Worker Query

1. Make the worker table consume the canonical resolver.
2. In discovery mode, call `sales.productionTasks` without due, completion, or
   exact-date presets, while preserving explicit discovery criteria and cursor
   pagination.
3. Keep `productionTasks` authoritative by overwriting `workerId` with the
   authenticated user id at the router.
4. Verify completion is evaluated from that worker's assignments, allowing
   worker-completed work to appear even if the whole order is not complete.
5. Keep queries bounded and server-filtered; do not fetch all rows for a client
   scan.
6. Keep navigation summaries independent of discovery. Add a result count only
   if it does not require an unbounded duplicate query.

### Phase 3 - Global Results UI

1. Derive `isGlobalDiscovery` once in the worker workspace.
2. While active, render the shared result table from every originating tab,
   including Calendar; suspend the active tab treatment and show an
   `All my production` scope indicator.
3. Preserve the originating tab, `calendarView`, and `calendarDate` in URL
   state. Clearing criteria restores that exact view.
4. Clear only the chosen criterion; remain global while another discovery
   criterion is active. Provide a separate clear-all action.
5. Make tab and analytics clicks explicit exits from discovery so they never
   appear ineffective.
6. Preserve keyboard/focus behavior, responsive containment, Suspense,
   virtualization, and the existing overview-opening context.

### Phase 4 - URL Contract

1. Keep discovery shareable through the existing NUQS `q`, `salesNo`, and
   `priority` state rather than adding component-local state.
2. Reset pagination whenever a discovery criterion changes.
3. Resolve direct URLs containing both stale tab presets and discovery criteria
   to global results; reveal the stored tab preset after clearing.
4. Prevent the default Due Today effect from overwriting discovery state.
5. Ensure entry, clear, tab selection, card selection, and Calendar restoration
   each use one coherent URL transition.

### Phase 5 - Automated Coverage

1. Extend resolver tests for every tab plus whitespace, combined criteria, and
   unchanged no-criteria mappings.
2. Add query tests proving global worker discovery crosses all five categories,
   includes assignment-level completion, paginates, and excludes another
   worker.
3. Add router tests proving caller-supplied worker scope is ignored.
4. Add dashboard tests for discovery from Due Today and Calendar, Calendar
   table replacement, stable counts, partial/complete clearing, tab/card exits,
   direct URLs, empty results, and mobile containment.
5. Run existing production query, Calendar, completion, permission,
   migration-parity, table, and overview-opening suites.

### Phase 6 - Performance And Safety Gate

1. Measure representative free-text, order-number, priority, combined, and
   no-result searches across multiple pages.
2. Inspect generated Prisma/MySQL queries for broad relation scans, accounting
   for the project's known broad Sales search timeout risk.
3. Require the first bounded page within one second on representative data, no
   more than 10% regression for unchanged tab requests, and pagination without
   duplicates or gaps.
4. If the gate fails, stop rollout and propose a separately approved indexed
   projection. Do not ship an unbounded memory scan.

### Phase 7 - Browser Validation And Rollout

1. Validate against non-production fixtures, then perform a read-only smoke
   test in the existing production-account browser session without logout or
   order/submission mutations.
2. From Due Today, find unique Past Due, Future, Unscheduled, and Completed
   orders; repeat a representative search from Calendar.
3. Verify filters use global scope, cross-worker data never appears, URLs and
   Calendar restoration work, and result rows open correctly.
4. Check desktop/mobile layout, keyboard/focus, loading/empty states, console
   errors, timings, and accidental search-text logging.
5. Pause for operator approval, then update feature/API/permission/progress
   documentation to match the final implementation.

## Likely File Areas

- `packages/sales/src/production-workspace-query.ts`
- `packages/sales/src/production-workspace-query.test.ts`
- `packages/sales/src/sales-production.ts`
- `packages/sales/src/sales-production.test.ts`
- `packages/sales/src/schema.ts` (only if explicit scope is required)
- `apps/api/src/trpc/routers/sales.route.ts`
- `apps/dashboard/src/hooks/use-sales-production-filter-params.ts`
- `apps/dashboard/src/components/production-workspace.tsx`
- `apps/dashboard/src/components/sales-production/worker-tabs.ts`
- `apps/dashboard/src/components/sales-production/calendar.tsx`
- `apps/dashboard/src/components/tables-2/sales-production/data-table.tsx`
- focused Production dashboard tests

## Documentation Impact

- Update `.brain/features/sales-production-workspace.md` after implementation.
- Update `.brain/api/contracts.md` and `.brain/api/permissions.md` only if the
  public contract or enforcement implementation changes.
- Update `.brain/database/*` only if the performance gate authorizes schema
  work.
- No ADR is planned unless a durable shared search projection or new
  cross-workspace scope contract is introduced.

## Skills Used

- `plan`: structured the approval-first phases and validation gates.
- `project-brain`: aligned with active Production work, authorization, and the
  known broad-search performance risk.
- `agency-engineering` / Frontend Developer: defined URL-owned React UI,
  accessibility, responsive, and validation behavior.
- `vercel-react-best-practices`: preserved bounded fetching, Suspense,
  virtualization, and avoided client bulk scans or new waterfalls.

## Risks And Mitigations

- Authorization broadening: retain router-injected worker id and negative
  cross-worker tests.
- Misleading tab state: suspend tab selection and label temporary global scope.
- Calendar mismatch: render table results and restore the prior period on clear.
- Completion mismatch: test worker-assignment completion separately from global
  order completion.
- Slow broad search: benchmark bounded pages and stop for indexed follow-up if
  the gate fails.
- Count inconsistency: keep navigation totals stable and label result counts.
- URL loops/stale presets: centralize normalization and test direct/history
  transitions.
- Production-session disruption: perform only read-only live validation and do
  not log out.

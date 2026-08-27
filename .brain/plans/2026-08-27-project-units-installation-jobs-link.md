# Plan: Project Units Installation Jobs Link

## Objective

Make the Installation value in each Project Units row navigate to Contractor
Jobs with that unit's jobs selected, using the existing
`/hrm/contractors/jobs?unitId=<unitId>` filter contract.

## Assumptions

- The destination remains the canonical Contractor Jobs route at
  `/hrm/contractors/jobs`.
- A unit is identified by the numeric Project Unit `id`, which maps to
  `Jobs.homeId` in the jobs query.
- The full Installation badge/count is the click target, including when the
  count is zero.
- Clicking Installation must not also trigger the Project Units row's default
  navigation to the unit overview.
- No database, permission, API shape, or new filter control is required.
- Current-code audit found that the requested link and filter plumbing already
  exist; execution should preserve them and close the missing regression and
  browser-proof gaps instead of rewriting working behavior.

## Detailed Execution Plan

### 1. Confirm the existing navigation and filter contract

1. Inspect `components/tables-2/project-units/columns.tsx` and keep the
   Installation cell as a Next.js `Link` targeting
   `/hrm/contractors/jobs?unitId=${unit.id}`.
2. Confirm the cell remains marked `preventDefault` and stops click propagation
   so the table's row-level unit-overview navigation cannot win over the link.
3. Confirm the shared `columns` and `projectTabColumns` arrays both reuse this
   Installation column, covering the standalone Project Units page and the
   Project Overview Units embed.
4. Decision point: if execution finds the current implementation differs from
   this contract, make the smallest cell-level correction; otherwise avoid a
   redundant production-code change.

### 2. Verify Contractor Jobs consumes the unit filter end to end

1. Keep `unitId` registered as an integer query parameter in
   `use-contractor-jobs-filter-params.ts`.
2. Confirm the Contractor Jobs route loads `unitId` from `searchParams` for
   server prefetch and the client table uses the same parsed filter, preventing
   hydration/query-key drift.
3. Confirm `getJobsSchema` accepts nullable/optional numeric `unitId` and
   `whereJobs` maps it to `homeId`, so only jobs attached to the selected unit
   are returned.
4. Preserve all unrelated Contractor Jobs filters, saved tabs, pagination,
   job-sheet opening, KPI behavior, and Project Units row behavior.

### 3. Add focused regression coverage

1. Extend the Project Units migration-parity test to pin the Installation link
   destination, `unit.id` usage, accessible label, and propagation guard.
2. Pin the jobs-side contract in the narrowest existing query/route test:
   `unitId` parses as a number and produces a `homeId` predicate without
   dropping the standard `deletedAt` guard.
3. Avoid broad snapshot coverage; assert the exact URL and filter mapping so a
   route rename or query-parameter drift fails clearly.

### 4. Validate the user flow

1. Run the focused Project Units parity test and the selected jobs-query test.
2. Run targeted Biome/lint checks on only the touched files and
   `git diff --check`.
3. In an authenticated local browser, open Project Units, click an Installation
   badge, and verify:
   - the URL becomes `/hrm/contractors/jobs?unitId=<clicked-unit-id>`;
   - the Contractor Jobs table contains only rows for that unit;
   - the job-count result agrees with the source Project Units row;
   - browser back returns to the Project Units table without an unintended unit
     overview navigation;
   - both non-zero and zero-count rows behave consistently.
4. If the Project Overview embed is user-visible in the test environment,
   repeat one click there to confirm the shared column behaves identically.

### 5. Complete the Brain documentation impact check

1. Update `.brain/features/project-units-table.md` only if execution changes the
   documented behavior or adds new validation evidence.
2. Update `.brain/features/contractor-jobs-table.md` only if the filter contract
   changes; no update is expected for verification-only work.
3. Record execution status in the appropriate Brain task/progress files without
   overwriting unrelated in-progress edits.
4. No schema, API contract, permission, migration, or ADR update is expected
   unless execution uncovers a contract change outside this plan.

## Skills List Used

- `plan` — produced an implementation-ready, validation-aware execution plan
  without changing application code.

## Risks and Mitigations

- **The row click opens the unit overview instead of jobs.** Keep both the
  column-level `preventDefault` metadata and link-level propagation stop, then
  verify the real click path.
- **Server and client queries disagree on `unitId`.** Reuse the same Nuqs parser
  on route hydration and client rendering, and test the numeric query input.
- **The link works only on the standalone page.** Keep one shared Installation
  column in both column sets and smoke the Project Overview embed when
  available.
- **A zero-count badge appears inert.** Keep it as a normal link so users can
  still open the correctly filtered empty state.
- **Existing unrelated worktree changes are disturbed.** Limit edits and
  validation to this feature's files and avoid broad formatting or cleanup.

## Execution Result

Completed on 2026-08-27.

- The production link and end-to-end `unitId` filter path already matched the
  requested behavior, so no redundant application-code rewrite was made.
- Added Project Units regression coverage for the URL, unit identity,
  accessible label, propagation guard, and shared standalone/embed column.
- Added a jobs-query regression proving `unitId: 42` becomes
  `{ homeId: 42, deletedAt: null }` for count and row queries.
- Focused validation passed with 6 tests / 53 assertions, targeted Biome, and
  `git diff --check`.
- Authenticated HTTPS browser QA proved both zero-count and non-zero-count
  Installation links reach Contractor Jobs with the exact unit filter and
  matching empty/job results, and browser Back restores the originating
  Project Units filter URL.
- Broad Dashboard and API typechecks were run and remain nonzero only for
  unrelated pre-existing baseline diagnostics; neither reported a defect in
  the focused behavior covered here.

# Plan: Relative Month Cutoff Filters

## Type
Feature

## Status
Implemented

## Created Date
2026-07-28

## Last Updated
2026-07-28

## Objective
Extend the shared date-filter system with safe, reusable month-cutoff presets
that can find records older than the last 1, 3, or 6 complete calendar months,
while preserving the existing recent-period presets, explicit date ranges,
saved filter URLs, and every current query consumer.

## Current State
- `packages/utils/src/index.ts` owns the canonical
  `transformFilterDateToQuery` parser used by Jobs, Unit Invoices, Unit
  Production, Project Units, Product Report, Sales Accounting, Customer
  Service, and shared Sales queries.
- `packages/utils/src/constants.ts` owns the `daysFilters` values rendered by
  both the shared UI search filter and the Midday-style dashboard search
  filter.
- The current parser supports:
  - `last month`
  - `last 2 month` / `last 2 months`
  - `last 6 month` / `last 6 months`
- The current UI exposes `last month`, `last 2 months`, and `last 6 months`.
  It does not currently expose or parse `last 3 months`, despite the expected
  product vocabulary referring to three months.
- Recent-period presets use complete calendar months and exclude the current
  partial month.
- Filter inputs are already arrays of strings in the applicable tRPC/query
  schemas, so adding recognized preset values does not require a schema or
  database change.

## Recommended Semantics
Use non-overlapping complete-calendar-month semantics:

- `last N months`
  - starts at the first instant of the month `N` months ago
  - ends at the final instant of the previous month
- `before last N months`
  - ends at the final instant of the month immediately preceding the
    `last N months` range
  - has no lower bound

For a fixed current date of 2026-07-28:

| Preset | Query boundary |
| --- | --- |
| `last month` | 2026-06-01 through 2026-06-30 |
| `last 3 months` | 2026-04-01 through 2026-06-30 |
| `last 6 months` | 2026-01-01 through 2026-06-30 |
| `before last month` | on or before 2026-05-31 |
| `before last 3 months` | on or before 2026-03-31 |
| `before last 6 months` | on or before 2025-12-31 |

This is recommended over labels such as `1 month and above` or `from 3
months`, because those labels do not reveal whether the cutoff month is
included and can produce overlaps. If the intended product behavior is an
aging bucket measured from the current day instead of the complement of
`last N months`, that must be selected explicitly before implementation.

## Detailed Execution Plan

### Phase 1: Lock the Product Contract
1. Confirm the presets are intended to be the non-overlapping complement of
   `last N complete months`, not rolling `N * 30-day` windows.
2. Confirm the user-facing labels. Recommended:
   - `before last month`
   - `before last 3 months`
   - `before last 6 months`
3. Keep `last 2 months` parsing for backward compatibility with saved URLs and
   saved page tabs.
4. Add `last 3 months` as a supported value. Do not remove the displayed
   `last 2 months` option unless product explicitly chooses to replace it.

Decision dependency: implementation must use one agreed cutoff definition;
mixing calendar-month and day-age semantics would make reports disagree.

### Phase 2: Extract a Typed Month-Range Seam
1. Add a small pure helper in the shared utils package that accepts:
   - mode: recent complete months or before recent complete months
   - positive integer month count
   - optional reference date for deterministic testing
2. Return the same Prisma-compatible ISO boundary shape already used by the
   system:
   - recent range: `{ gte, lte }`
   - cutoff range: `{ lte }`
3. Give `transformFilterDateToQuery` an explicit input and return type instead
   of extending its current implicit `any` contract.
4. Make the existing parser delegate recognized month presets to the pure
   helper.
5. Preserve all current aliases and behavior:
   - case-insensitive matching
   - surrounding whitespace
   - singular and plural `month` forms
   - `today`, `yesterday`, week, month, year, explicit range, and open-ended
     date handling
   - safe `null` result for invalid free-form dates
6. Prefer one exact, anchored parser for `last N month(s)` and
   `before last N month(s)` rather than adding a separate branch for every
   number. Reject zero, negative, fractional, or malformed counts.

Dependency: keep the canonical behavior in `@gnd/utils`; do not add another
app-local date parser.

### Phase 3: Add Presets to the Shared UI Source
1. Update `daysFilters` in `packages/utils/src/constants.ts` with the agreed
   recent and cutoff options.
2. Preserve stable existing string values so bookmarked URLs and saved tabs
   continue to resolve.
3. Because both current filter menus iterate `daysFilters`, verify the options
   appear in:
   - `packages/ui/src/components/custom/search-filter/index.tsx`
   - `apps/dashboard/src/components/midday-search-filter/search-filter-trpc.tsx`
4. Verify selecting a cutoff preset stores the same one-element string array
   shape as existing presets.
5. Verify the calendar control does not attempt to invent a lower-bound date
   for an `{ lte }`-only cutoff filter; the selected preset label is the source
   of truth.

### Phase 4: Regression Coverage
1. Add focused shared utility tests with a fixed reference date.
2. Cover existing behavior:
   - `last month`
   - legacy `last 2 month` and `last 2 months`
   - `last 6 month` and `last 6 months`
3. Cover new behavior:
   - `last 3 months`
   - all three cutoff presets
   - uppercase/mixed-case and surrounding whitespace
4. Cover boundaries:
   - current partial month is excluded
   - recent and cutoff ranges meet without overlap or a missing calendar day
   - January/year rollover
   - leap-year February
   - month-end dates with different month lengths
5. Cover compatibility:
   - explicit one-sided and two-sided date filters remain unchanged
   - invalid date strings still return `null`
   - empty input still returns `undefined`
6. Add one representative query-level regression proving an `{ lte }` cutoff
   is passed to Prisma unchanged. The Unit Invoice or Jobs query is the best
   seam because both directly use the canonical helper.
7. Add a lightweight constants/UI regression proving every new preset is
   available from `daysFilters` and remains selectable in the Midday filter.

### Phase 5: Validation
1. Run the focused date-helper and representative query tests.
2. Run `bun --filter @gnd/utils typecheck`.
3. Run focused Biome checks for the helper, constants, tests, and any touched
   filter component.
4. Run `bun --filter @gnd/api typecheck` if a query-level test or typed query
   seam changes.
5. Run the narrowest existing dashboard filter test, then a filtered
   dashboard typecheck if a filter component changes.
6. Browser-smoke one high-value page:
   - open a page using the Midday search filter
   - select each new preset
   - confirm the URL value
   - confirm returned rows satisfy the cutoff
   - reload and confirm the preset and results persist
7. Smoke one printable/report consumer, preferably Unit Invoice Aging, to
   verify the shared preset behaves identically outside the base table.
8. Run `git diff --check` and review the scoped diff for unrelated formatting.

### Phase 6: Documentation and Rollout
1. Update the relevant feature documentation for any surface used in browser
   validation, especially Community Unit Invoice Reporting if it is the
   representative report consumer.
2. Record the exact cutoff semantics and supported aliases so future reports
   do not reimplement them.
3. Update `.brain/progress.md` after implementation and validation.
4. No ADR is expected unless implementation changes the project-wide timezone
   model or replaces calendar-month semantics with a new date-filter
   architecture.
5. Roll out as a backward-compatible additive change; no migration, feature
   flag, data repair, or permission update should be required.

## Acceptance Criteria
- The shared filter offers and correctly parses the agreed 1-, 3-, and
  6-month cutoff presets.
- `last 3 months` is supported without breaking legacy `last 2 months`
  selections.
- Recent-period presets continue to exclude the current partial month.
- A cutoff preset returns an upper-bound-only query and does not accidentally
  include current or recent-period records.
- Existing custom date ranges and all non-month presets retain their current
  results.
- Saved URLs/tabs containing current preset strings continue to work.
- The new presets work through both shared filter-menu implementations and at
  least one real API/report consumer.
- No database schema, migration, API input schema, authentication, or
  permission change is introduced.

## Implementation Outcome
- Added the typed shared month-range module at
  `packages/utils/src/date-filter.ts`.
- `transformFilterDateToQuery` now accepts both existing array inputs and the
  string input used by Customer Service, while preserving explicit ranges and
  all non-month presets.
- Month presets are parsed generically with positive whole-number counts.
- Added `last 3 months`, `before last month`, `before last 3 months`, and
  `before last 6 months` to the shared preset list.
- Preserved `last 2 month` and `last 2 months` parsing for saved-filter
  compatibility.
- Added deterministic coverage for month boundaries, cutoff behavior, aliases,
  whitespace/case normalization, leap-year February, year rollover, invalid
  input, and explicit ranges.
- Added a pure Midday calendar adapter that preserves the one-element preset
  selection shape and displays an upper-bound-only cutoff without inventing a
  lower-bound date.
- Added Unit Invoice query coverage proving an upper-bound-only cutoff reaches
  the Prisma where shape unchanged.

## Validation
- `bun test packages/utils/src/date-filter.test.ts
  apps/dashboard/src/components/midday-search-filter/date-filter-selection.test.ts
  apps/api/src/trpc/routers/community.route.test.ts`
  - passed with 24 tests / 60 assertions.
- `bun --filter @gnd/utils typecheck`
  - passed.
- `bun --filter @gnd/ui typecheck`
  - passed.
- `bun --filter @gnd/sales typecheck`
  - passed.
- Focused Biome passed for the new helper, tests, constants, and representative
  API test.
- Full `bun test` completed with 2,407 passing, 1 skipped, and 30 existing
  unrelated failures; the date-filter and Unit Invoice regression suites
  remained green.
- API-wide typecheck reached only the existing unrelated Sentry event typing
  errors in `apps/api/src/instrument.ts`.
- Browser QA was attempted against the active shared dashboard route, but the
  pre-existing Next development server remained CPU-bound and returned no HTTP
  response. The shared proxy/server was not stopped or reconfigured.
- The dashboard typecheck also remained non-responsive while that shared server
  was CPU-bound and was stopped without changing the server or proxy.

## Risks and Mitigations
- Ambiguous `from/above` wording could invert the query.
  - Use explicit `before last N months` labels and acceptance examples.
- Calendar-month and rolling-day interpretations could disagree.
  - Preserve the existing complete-calendar-month model and test fixed
    boundaries.
- Replacing `last 2 months` could break saved filters.
  - Preserve it as a parser alias and do not remove the UI value without an
    explicit product decision.
- A shared helper change affects many query consumers.
  - Keep the change additive, type the return contract, and regression-test all
    existing preset categories before query-level smoke tests.
- Server timezone differences could move a cutoff at midnight.
  - Preserve the current Day.js timezone behavior in this feature; handle any
    user-timezone redesign separately and document the deployed timezone used
    during browser validation.
- An upper-bound-only range may not preview in calendar fields designed around
  `{ gte, lte }`.
  - Treat the preset label as canonical and add a UI regression for `{ lte }`
    selection and reload behavior.

## Out of Scope
- Database or Prisma schema changes.
- Permission or authentication changes.
- A general timezone redesign.
- Replacing every app-local reporting comparison such as dashboard
  month-over-month metrics.
- Converting relative presets into mutually exclusive aging buckets such as
  0-30, 31-60, 61-90, and 90+ days.
- Removing historical date preset aliases or rewriting existing saved filters.

## Skills List Used
- `plan`: structured the request as an execution-ready, validation-led plan.
- Project Brain protocol: aligned the plan with the canonical shared utility,
  active architecture rules, and existing Community reporting behavior.

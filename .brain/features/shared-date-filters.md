# Shared Date Filters

## Purpose
The shared date-filter contract converts URL/search-filter values into
Prisma-compatible date boundaries for dashboard tables, API queries, saved
filter tabs, and printable reports.

## Canonical Modules
- Parser entrypoint: `transformFilterDateToQuery` from `@gnd/utils`
- Complete-month helper: `packages/utils/src/date-filter.ts`
- Shared visible presets: `daysFilters` from `@gnd/utils/constants`

Do not add app-local relative-month parsers. New table and report consumers
should reuse the shared contract so saved URLs and report results agree.

## Complete-Month Semantics
- `last N months`
  - includes the first instant of the month `N` months ago
  - includes the final instant of the previous month
  - excludes the current partial month
- `before last N months`
  - has no lower bound
  - includes the final instant of the month immediately preceding the
    corresponding `last N months` range

Example for 2026-07-28:

| Preset | Boundary |
| --- | --- |
| `last 3 months` | 2026-04-01 through 2026-06-30 |
| `before last 3 months` | on or before 2026-03-31 |

The two ranges meet at a calendar-month boundary without overlap.

## Supported Presets
- Existing day/week/month/year presets remain supported.
- Complete-month aliases accept case-insensitive singular/plural forms:
  - `last month`
  - `last N month`
  - `last N months`
  - `before last month`
  - `before last N month`
  - `before last N months`
- Visible shared month options include:
  - `last month`
  - `last 2 months`
  - `last 3 months`
  - `last 6 months`
  - `before last month`
  - `before last 3 months`
  - `before last 6 months`
- Legacy `last 2 month` and `last 2 months` values remain valid for saved URLs
  and page tabs.

## Input and Output Contract
- Accepted inputs:
  - a single preset/date string
  - an array containing a preset
  - a one-sided explicit date
  - a two-sided explicit date range
  - an empty array
  - `null` / `undefined`
- Outputs:
  - bounded range: `{ gte, lte }`
  - before/cutoff range: `{ lte }`
  - one-sided explicit range: `{ gte }`
  - invalid input: `null`
  - absent or empty input: `undefined`

## Consumers
The shared parser is used by Jobs, Unit Invoices, Unit Production, Project
Units, Product Report, Sales Accounting, Customer Service, shared Sales query
helpers, and both dashboard search-filter implementations.

## Validation
- Deterministic shared utility coverage locks recent and cutoff boundaries,
  aliases, explicit ranges, invalid inputs, year rollover, and leap-year
  behavior.
- Unit Invoice query coverage proves upper-bound-only cutoff filters pass
  through to the database where contract.
- Midday filter adapter coverage proves preset selections remain one-element
  arrays and cutoff presets expose only the upper calendar boundary.
- No database schema, migration, API input schema, permission, or
  authentication change is required.

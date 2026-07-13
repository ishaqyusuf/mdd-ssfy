# Plan: Community Table Density And Viewport Polish

## Type
UX/UI

## Status
Proposed

## Created Date
2026-07-01

## Last Updated
2026-07-01

## Intake
- Intake File: brain/intake/2026-07-01-sales-inventory-inbounds-tables-polish.md
- Intake Item: Tighten vertical spacing and table height for community/customer-services, builders, templates, invoices, productions, and similar pages.

## Goal Or Problem
Several table pages have too much vertical whitespace before and after search controls, leaving the scrollable table area using barely half of the screen. These operational pages should feel compact like Sales Book orders while keeping the clean current aesthetics.

## Current Context
- `brain/plans/2026-06-16-orders-v2-table-standard-migration.md` says community builders, templates, customer-services, and unit-invoices are already migrated to tables-2.
- Unit productions has a `components/tables-2/unit-productions/*` module, while sales-book productions still has legacy and v2 routes.
- The requested pages include `community/customer-services`, `community/builders`, `community/templates`, `community/invoices`, `community/productions`; in current routes likely `community/unit-invoices` and `community/unit-productions` are the closest named surfaces.

## Proposed Approach
Do a focused viewport-density pass across the listed routes. Align page shell spacing, header/search margins, analytics-card density, and table viewport height with Sales Book orders. Prefer shared table/page-shell variables where possible, but keep changes scoped and avoid a broad design rewrite.

## Implementation Steps
- Identify exact active routes for the requested pages:
  - `/community/customer-services`
  - `/community/builders`
  - `/community/templates`
  - `/community/unit-invoices`
  - `/community/unit-productions`
  - TODO: confirm whether `community/invoices` and `community/productions` refer to these route names.
- Compare each route's page shell, header, search/filter spacing, analytics card block, and table container height to `/sales-book/orders`.
- Reduce excessive top/bottom gaps around search inputs and filter bars.
- Ensure table containers use a viewport-aware height that leaves the table with most of the remaining screen, similar to Sales Book orders.
- Keep analytics cards compact and avoid stacking large cards above the table unless the page needs them.
- Preserve mobile horizontal table scroll while avoiding document-level horizontal overflow.
- Extract a tiny shared spacing helper only if repeated route-local changes become meaningfully duplicated.

## Affected Files Or Areas
- `apps/www/src/app/(sidebar)/community/customer-services/page.tsx`
- `apps/www/src/app/(sidebar)/community/(main)/builders/page.tsx`
- `apps/www/src/app/(sidebar)/community/(main)/templates/page.tsx`
- `apps/www/src/app/(sidebar)/community/(main)/unit-invoices/page.tsx`
- `apps/www/src/app/(sidebar)/community/(main)/unit-productions/page.tsx`
- `apps/www/src/components/tables-2/customer-service/*`
- `apps/www/src/components/tables-2/community-builders/*`
- `apps/www/src/components/tables-2/community-templates/*`
- `apps/www/src/components/tables-2/unit-invoices/*`
- `apps/www/src/components/tables-2/unit-productions/*`
- `apps/www/src/components/tables-2/core/*` only if a shared height/spacing primitive is truly needed

## Acceptance Criteria
- Listed routes have compact search/header spacing comparable to Sales Book orders.
- Table scroll containers use most of the available viewport instead of roughly half the screen.
- Existing analytics cards remain useful but no longer dominate the page before the table.
- Desktop and mobile layouts do not show incoherent overlap or document-level horizontal overflow.
- Existing search/filter/table actions continue to work.

## Test Plan
- Focused Biome/import checks for touched route/table files.
- Browser screenshots or smoke checks for each listed route at desktop and mobile widths.
- Search/filter smoke for at least one migrated community route and one invoice/production route.

## Brain Update Requirements
- Update `brain/progress.md`.
- Update relevant feature docs only if route behavior changes beyond layout polish.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Compacting desktop spacing can make mobile cramped; validate both.
- Some routes may intentionally reserve space for summary cards; reduce, do not remove, useful context.

## Open Questions
- TODO: Confirm whether `community/invoices` means `/community/unit-invoices` and `community/productions` means `/community/unit-productions`.

## Linked Task
- Task Title: Community Table Density And Viewport Polish
- Task File: brain/tasks/roadmap.md

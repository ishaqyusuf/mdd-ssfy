# Plan: Community Projects Table Migration And Action Menu Standardization

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
- Intake Item: Update community/project-units and community/projects to the table system, keep clean aesthetics, and standardize action menus/icons/spacings to the project-units design.

## Goal Or Problem
Community projects and project-units should use the current table system while preserving their clean aesthetic. Table row actions across migrated pages should use one consistent more-icon, delete icon, spacing, and dropdown menu treatment based on the project-units design.

## Current Context
- `brain/plans/2026-06-16-orders-v2-table-standard-migration.md` lists `/community/projects` and `/community/project-units` as remaining community routes still using legacy table modules.
- Existing likely files include `apps/www/src/components/tables/community-project/*` and `apps/www/src/components/tables/project-units/*`.
- Already migrated domains such as community builders, templates, customer-services, unit-invoices, and inbound-management each have their own action menu implementations that may not match the desired baseline.

## Proposed Approach
First migrate `/community/projects` and `/community/project-units` to domain modules under `components/tables-2` while preserving existing queries, filters, headers, modal params, and row actions. Then extract or document a standard table action menu pattern from project-units and apply it to targeted migrated table domains so the more icon, delete icon, spacing, destructive treatment, and dropdown layout are consistent.

## Implementation Steps
- Inspect current `/community/projects` and `/community/project-units` route/query/filter/header/action behavior.
- Add `components/tables-2/community-projects/*` and `components/tables-2/project-units/*` modules using the existing table migration pattern.
- Reuse existing filter hooks/loaders and query contracts; do not add `*V2` routes or new queries unless necessary.
- Preserve existing row-open behavior, project/unit sheets, print flow, edit/delete actions, and analytics cards.
- Identify the project-units action menu visual baseline:
  - more icon
  - delete icon
  - icon button size
  - menu spacing
  - destructive item styling
  - confirmation dialog pattern
- Create a shared local table action menu helper only if it reduces real duplication and fits existing table architecture.
- Standardize action menus in the newly migrated project/projects tables first.
- Apply the same standard to high-visibility migrated tables where action inconsistency is visible:
  - community builders
  - community templates
  - customer services
  - unit invoices
  - unit productions
  - inbound management if applicable
- Remove old table imports only after import scans prove no active consumers remain.

## Affected Files Or Areas
- `apps/www/src/app/(sidebar)/community/(main)/projects/page.tsx`
- `apps/www/src/app/(sidebar)/community/(main)/project-units/page.tsx`
- `apps/www/src/components/tables/community-project/*`
- `apps/www/src/components/tables/project-units/*`
- `apps/www/src/components/tables-2/community-projects/*`
- `apps/www/src/components/tables-2/project-units/*`
- `apps/www/src/components/tables-2/community-builders/columns.tsx`
- `apps/www/src/components/tables-2/community-templates/columns.tsx`
- `apps/www/src/components/tables-2/customer-service/columns.tsx`
- `apps/www/src/components/tables-2/unit-invoices/columns.tsx`
- `apps/www/src/components/tables-2/unit-productions/columns.tsx`
- `apps/www/src/components/tables-2/inbound-management/columns.tsx`
- `apps/www/src/components/tables-2/core/*` only if shared action-menu support is required
- `brain/plans/2026-06-16-orders-v2-table-standard-migration.md`

## Acceptance Criteria
- `/community/projects` uses the current table system without losing existing filters, modals, row actions, or clean aesthetics.
- `/community/project-units` uses the current table system without losing existing filters, sheets, print/action flows, or analytics.
- Table action menus use the same more icon, delete icon, spacing, destructive treatment, and dropdown layout across the targeted pages.
- Old legacy table files are removed only when import scans confirm they are unused.
- Browser smoke passes for projects and project-units on desktop and mobile.

## Test Plan
- Focused Biome/import checks for migrated projects/project-units and affected action-menu columns.
- Import scans for old table module references before deletion.
- Filtered typecheck grep or full `bun run typecheck` depending on shared type changes.
- Browser verification for `/community/projects`, `/community/project-units`, action menu open/delete confirmation, and mobile horizontal scroll.

## Brain Update Requirements
- Update `brain/plans/2026-06-16-orders-v2-table-standard-migration.md` with migration evidence when implemented.
- Update `brain/progress.md`.
- Update community feature docs only if behavior changes beyond table architecture and action-menu polish.

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
- Project/unit pages may have embeddable table consumers; remove legacy files only after import proof.
- A shared action-menu abstraction can become too generic; keep it simple or route-local if domains differ meaningfully.
- Preserve destructive confirmation behavior exactly where existing flows require it.

## Open Questions
- None.

## Linked Task
- Task Title: Community Projects Table Migration And Action Menu Standardization
- Task File: brain/tasks/roadmap.md

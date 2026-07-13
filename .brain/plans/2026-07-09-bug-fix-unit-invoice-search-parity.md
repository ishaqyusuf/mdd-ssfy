# Plan: Unit Invoice Search Parity With Project Units

## Type
Bug Fix

## Status
Implemented

## Created Date
2026-07-09

## Last Updated
2026-07-09

## GitHub Issue
- https://github.com/ishaqyusuf/mdd-ssfy/issues/38

## Problem Statement
Community Project Units and Unit Invoices return different unit sets for the same project-scoped search. The reported reproduction is:

- Breezewood Villas selected in Project Units: `97` results.
- Breezewood Villas selected in Unit Invoices: `97` results.
- Breezewood Villas plus search `/01` in Project Units: `19` results.
- Breezewood Villas plus search `/01` in Unit Invoices: `8` results.

From the operator perspective, units that exist in the project are missing from invoices when they search by the visible unit/lot-block text.

## Goal
Make Unit Invoices base text search match the same user-visible unit fields as Project Units, especially `lotBlock`, so equivalent project-scoped searches return the same unit set unless an explicit invoice-only filter is active.

## Current Context
- Both pages list `Homes` as the unit grain.
- Unit Invoices continues to use `community.getUnitInvoices`; no new `*V2` query was introduced during the tables-2 migration.
- Project Units searches broader unit context, including visible unit identifiers such as `lotBlock`, while Unit Invoices currently searches a narrower field set.
- The issue is search parity, not invoice total calculation, invoice modal behavior, or table layout.

## Proposed Approach
Align the Unit Invoices `q` search predicate with the Project Units unit lookup semantics for shared visible fields. At minimum, Unit Invoices must search `lotBlock` so lot/block-style searches such as `/01` include every matching unit in the selected project.

Prefer a small shared Community unit-search helper if that reduces future drift between Project Units and Unit Invoices without broad refactoring. Keep the existing Unit Invoices route, filter params, report menu, pagination, sorting, and modal behavior unchanged.

## Implemented
- Updated `whereUnitInvoices` so base `q` search now includes `search`, `modelName`, `lotBlock`, `project.title`, and `project.builder.name`, matching Project Units visible text search.
- Preserved existing project, builder, production, installation, invoice, date, pagination, sorting, invoice total, chargeback, row click, and modal behavior.
- Added focused regression coverage for Unit Invoices search fields and project-scoped search composition.

## Testing Seam
Primary seam: the Community unit query behavior for `community.getProjectUnits` and `community.getUnitInvoices`.

The highest-value regression should compare returned unit ids/counts for the same project scope and `q` search before table rendering. This tests external behavior rather than implementation details.

## Acceptance Criteria
- With project Breezewood Villas selected and search `/01`, Unit Invoices returns the same matching unit count as Project Units: `19`.
- Unit Invoices base search includes units whose match is in the visible unit/lot-block value.
- Project, builder, production, installation, invoice, date, pagination, and sort behavior remain compatible with existing Unit Invoices behavior.
- Invoice totals, payment totals, chargebacks, task counts, row click, and invoice modal behavior remain unchanged.
- No database schema change, migration, or permission change is required.

## Test Plan
- Add focused API/query coverage for project-scoped `q` search parity between Project Units and Unit Invoices.
- Include a unit that matches only through `lotBlock`, not through `search` or `modelName`.
- Include a project-scoped negative case so matching `lotBlock` values from other projects are not included.
- Reuse existing Community router/query test patterns where possible.
- Browser smoke after implementation: select Breezewood Villas on Project Units and Unit Invoices, search `/01`, and confirm both show `19` rows.

## Validation
- `bun test apps/api/src/trpc/routers/community.route.test.ts` passed.
- `bunx biome check --formatter-enabled=false apps/api/src/db/queries/unit-invoices.ts apps/api/src/trpc/routers/community.route.test.ts` passed.
- `bun --filter @gnd/api typecheck` was attempted and remains blocked by existing unrelated API/workspace diagnostics in files such as `bug-reports.ts`, `checkout.ts`, `community.ts`, `inbound-receiving.ts`, shared sales package files, Square, and shared UI.
- Full Biome formatting check was not applied because the existing `unit-invoices.ts` file still wants a broad indentation-only reformat outside this bug fix.
- Browser smoke was not run in this implementation pass.

## Out Of Scope
- Reworking the Unit Invoices table UI.
- Migrating Project Units to tables-2.
- Changing invoice task editing, payment/check fields, report layouts, or invoice total formulas.
- Data repair for unit or invoice task rows.
- Permission changes for CommunityUnit or install-cost access.
- Broad Community search/filter redesign beyond the parity bug.

## Brain Update Requirements
- Update `brain/features/community-unit-invoice-reporting.md` or `brain/features/unit-invoices-table.md` if implementation changes the documented Unit Invoices search behavior.
- Update `brain/progress.md` when implemented.
- Update API docs only if the query contract changes beyond base search parity.

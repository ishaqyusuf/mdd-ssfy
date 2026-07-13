# New Sales Form Package Migration Plan

Date: 2026-03-09
Owner: Sales Platform
Status: Phase 3 In Progress

## Objective

Move sales-form business logic into a well-organized `packages/sales` module so API and web consume one canonical engine, while keeping app-specific UI/routing in `apps/www`.

## Target Structure

`packages/sales/src/sales-form/`

- `contracts/`
- shared input/output types and DTO contracts
- `domain/`
- pure business engines (costing, route resolution, visibility, pricing dependency logic)
- `application/`
- orchestration use-cases that combine domain functions
- `adapters/` (Phase 2+)
- db/trpc mapping helpers where needed
- `tests/` (Phase 2+)
- parity fixtures, golden scenarios, edge-case suites

## Boundaries

Keep in `apps/www`:
- Next.js pages/layouts
- component composition and app-level interaction state
- app navigation/modals

Move to `packages/sales`:
- costing and summary calculations
- step/route progression and fallback logic
- component visibility + dependency pricing logic
- grouped workflow calculators (HPT, moulding, service, shelf)
- sales-form contract types and canonical mappers

## Phased Execution

1. Phase 1 (completed) - Foundation extraction
- Create `sales-form` module structure in package.
- Move canonical costing logic to `domain`.
- Re-export compatibility path for existing imports.
- Wire API/web summary paths to package module.

2. Phase 2 (completed) - Route + step engine extraction
- Extract route progression (`SettingsClass` equivalent) to package domain.
- Extract variation visibility + dependency pricing resolver.
- Replace UI-local route/cost branching with package use-cases.
- Preserve legacy customer/customer-profile repricing trigger semantics:
- when effective profile coefficient changes from previous coefficient, re-run canonical sales cost recomputation (not ratio-only approximations).
- Status update: trigger remains in `invoice-overview-panel`, repricing engine is now canonicalized in `packages/sales/src/sales-form/domain/profile-repricing.ts` with test coverage.

3. Phase 3 (in progress) - Grouped workflow + profile-reprice parity closure
- Move HPT/moulding/service/shelf calculators into package domain/application.
- Keep UI as input/output adapter only.

4. Phase 4 - Adapter and persistence normalization
- Consolidate API mappers around package contracts.
- Reduce duplicate transformations between API and web.

5. Phase 5 - Validation and cutover
- Execute parity matrix with PASS criteria only.
- Remove temporary compatibility shims.

## Validation Gates

1. No API/UI pricing drift for shared scenarios.
2. Deterministic parity tests for legacy-critical behaviors.
3. No new waterfall or bundle regressions in web form paths.
4. Customer selection and profile-change repricing parity:
- selecting a customer/profile with a different coefficient must reprice consistently with legacy `salesProfileChanged` semantics.

## Current Phase 1 Deliverables

- Added `packages/sales/src/sales-form/*` structure with contracts/domain/application indexes.
- Added canonical summary engine at `domain/costing.ts`.
- Updated API/web consumers to use `@gnd/sales/sales-form`.
- Kept compatibility export `@gnd/sales/new-sales-form-costing` for safe incremental migration.

# Sales Form Office/Dealer Shareability Execution

Date: 2026-05-24
Status: Completed

## Goal

Implement the office/dealer sales-form cleanup so `@gnd/sales/sales-form` owns
portable contracts, shared schemas, pricing composition, workflow capability
gating, and reusable adapter helpers while `www` and dealership keep only
host-owned UI and routing.

## Execution Rules

- Keep moving through all phases unless a directly related test/gate fails.
- Keep `bun run test:new-sales-form-migration` as the primary migration gate.
- Preserve rollback controls until browser QA and rollback signoff are complete.
- Do not remove legacy `www` workflow fallback in this pass.

## Checklist

- [x] Restore safe `www` package-panel default.
- [x] Make `SalesFormEnginePanel` the documented shared entrypoint.
- [x] Add shared runtime schemas for sales-form payloads.
- [x] Reuse shared schemas in dealer save input.
- [x] Centralize dealer pricing/save composition in the shared sales-form package.
- [x] Keep DB query modules persistence-focused where feasible.
- [x] Consolidate repeated workflow adapter helpers.
- [x] Move dealer state/payload normalization toward shared package utilities.
- [x] Add/extend contract and parity tests.
- [x] Run focused migration gate.

## Results

- `@gnd/sales/sales-form` now exports shared portable Zod schemas, dealer quote
  record/save/payload composition, dealer quote pricing snapshots, and workflow
  image resolver helpers.
- Dealer quote saving now routes through `apps/api/src/db/queries` so the API
  layer can compose shared sales-form pricing while still using DB persistence
  and dealer visibility checks.
- `apps/www` defaults the package workflow panel to legacy unless explicitly
  opted into `package`.
- The dealership app now delegates dealer quote state hydration, line creation,
  pricing, and save payload mapping to package helpers.

## Notes

- Browser QA is still a separate external gate if local auth/MySQL is unavailable.
- `www` legacy/package switch remains available through env, URL override, and
  local storage until production signoff.
- `bun run test:new-sales-form-migration` passed with 88 sales package tests,
  19 dealer persistence tests, dealership typecheck, and the tolerated `www`
  baseline check.
- Full `@gnd/api` typecheck still has existing unrelated workspace failures; a
  filtered check found no errors in the touched API route/schema/query files.

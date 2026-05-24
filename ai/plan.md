# Sales Form Office/Dealer Shareability Execution

Date: 2026-05-24
Status: In progress

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

- [ ] Restore safe `www` package-panel default.
- [ ] Make `SalesFormEnginePanel` the documented shared entrypoint.
- [ ] Add shared runtime schemas for sales-form payloads.
- [ ] Reuse shared schemas in dealer save input.
- [ ] Centralize dealer pricing/save composition in the shared sales-form package.
- [ ] Keep DB query modules persistence-focused where feasible.
- [ ] Consolidate repeated workflow adapter helpers.
- [ ] Move dealer state/payload normalization toward shared package utilities.
- [ ] Add/extend contract and parity tests.
- [ ] Run focused migration gate.

## Notes

- Browser QA is still a separate external gate if local auth/MySQL is unavailable.
- `www` legacy/package switch remains available through env, URL override, and
  local storage until production signoff.

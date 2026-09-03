# Task: HPT Size Hot-Swap And Height Reconciliation

## Status
Done

## Priority
High

## Created Date
2026-09-03

## Last Updated
2026-09-03

## Global Ticket
- Ticket Position: 1/1

## Source Context
Implement the approved HPT size hot-swap and height reconciliation plan across
the shared Sales Form, both Dashboard workflow-panel modes, and Dealership.

## Implementation Progress
- Completion: 100%
- Current Checklist: 7/7 — Reviewed, verified, documented, and ready to commit
- Blockers: None

## Implementation Checklist
- [x] Add failing shared helper and rendering regressions
- [x] Implement canonical row-size swap and height reconciliation
- [x] Add the accessible HPT row swap menu and unpriced presentation
- [x] Guard Dashboard and Dealership persistence with unpriced-row confirmation
- [x] Run focused tests and typechecks
- [x] Update Sales Form Brain documentation and final validation evidence
- [x] Complete independent code review and prepare the scoped implementation commit

## Validation Evidence
- Focused HPT, persistence-guard, and host wiring suite — 57 pass, 0 fail,
  248 assertions.
- `bun test packages/sales/src/sales-form` — 480 pass, 0 fail, 1,644
  assertions.
- `bun --filter @gnd/sales typecheck` — pass.
- Dealership affected-file typecheck diagnostic — no findings. Dashboard full
  typecheck retains the pre-existing broad sales-record/legacy-adapter baseline;
  the new guard test has no diagnostic.
- Three independent reviews covering pricing/reconciliation, UI/save guards,
  and tests/contracts — no remaining findings.
- Authenticated local browser smoke reached the HPT workflow without a feature
  JavaScript error. The exact end-to-end swap interaction remains unproven
  because the local workflow selection reset during test setup; pure and render
  regressions cover the specified `2-4 x 6-8` to `2-4 x 8-0` behavior.

## Documentation Impact
- Updated `.brain/features/sales-form-system-hardening.md` and
  `.brain/progress.md`.
- No database or API documentation update is required because the change uses
  existing record metadata and persistence contracts without schema, endpoint,
  permission, or migration changes.

# Latest Daily GND Codebase Review

Latest report: [2026-09-08](./2026-09-08.md)

## Executive Summary

This was a read-only operational review for Ishaq using the Africa/Lagos date. The active Brain directory is `.brain/`; there is still no top-level `brain/` directory in this workspace, so the report follows the established `.brain/reports/daily-codebase-review/` path.

The worktree was already dirty before report writing. Pre-existing changes included active Brain/task follow-ups plus `apps/dashboard/src/utils/table-settings.ts`, `packages/sales/src/sales-production.test.ts`, and `packages/sales/src/sales-production.ts`. I preserved that state and did not edit source files, app/package code, schemas, migrations, environment files, or task ledgers.

The strongest positive delta is that Brain now records the canonical Sales Pipeline lifecycle as complete, with all 18 tickets and 196/196 acceptance checks verified. The dirty local production-workspace changes also point to a focused Active count eligibility correction: undeleted order scoping, cancelled-headline exclusion, and focused production tests. Remaining operational risk is still concentrated in public API route boundaries for legacy sales/payment/Square/task controls, the red broad typecheck, mock account-security UI, and dealer/mobile readiness gaps that matter for mixed-skill staff and dealer/customer trust.

## Typecheck Result

`bun run typecheck` still fails in `@gnd/settings` because `packages/errors/src/index.ts` has extensionless NodeNext relative exports. The reported exports should include `.js` suffixes for `app-error`, `classify`, `descriptors`, `public-error`, `reference`, `presentation`, and `types`. Today's run reported 13 successful tasks out of 24 and a Turbo lockfile warning for missing `@npmcli/package-json`.

## Top Findings

- P1: Legacy sales router write paths remain public: wallet payment, restore, supplier save/delete, and step metadata mutations are still exposed through `publicProcedure`.
- P1: Square terminal side-effect routes remain public: `squareTestRouter.test` can create a test terminal checkout, and `checkout.generateDeviceCode` can create a Square Terminal API device code.
- P1: Broad typecheck is red in `@gnd/settings`, so shared package validation is still not clean.
- P2: Task-event job-control routes use public tRPC wrappers even though the query layer has inner Super Admin guards.
- P2: Settings Active Sessions still renders mock device data and fake logout behavior.
- P2: Mobile packing quantities are not interruption-safe until submitted.
- P2: Dealer order guidance still collapses manufacturing blockers into generic preparation language.

## Next Actions

1. Protect or retire the public Square terminal test/device-code routes.
2. Harden legacy public sales mutations: wallet payment, restore, supplier save/delete, and step metadata.
3. Fix the `packages/errors/src/index.ts` NodeNext export suffixes and rerun `bun run typecheck`.
4. Finish the already-tracked production Active count and completion/actor follow-ups from the dirty local Brain/task state.
5. Decide whether dealer manufacturing readiness or mobile packing draft recovery should become the next small intake.

## Source Limitations

This was a static source and Brain review. I did not run browser QA, emulator/device QA, migrations, data syncs, production scripts, repair dry-runs, repair applies, or dev servers. `apps/www` does not exist, so I reviewed active equivalents `apps/dashboard`, `apps/web`, and `apps/storefront`. No source files, app/package code, schemas, migrations, environment files, or task ledgers were edited by this run.

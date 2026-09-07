# Latest Daily GND Codebase Review

Latest report: [2026-09-07](./2026-09-07.md)

## Executive Summary

This was a read-only operational review for Ishaq using the Africa/Lagos date. The active Brain directory is `.brain/`; there is no top-level `brain/` directory in this workspace, so the report follows the established `.brain/reports/daily-codebase-review/` path.

The worktree was already heavily dirty before this automation, including active Brain docs/ledgers, Sales Orders request-control work, canonical sales lifecycle cutover work, dispatch/production query changes, DB/schema files, tests, scripts, and untracked task/report files. I preserved that state and did not edit source files, app/package code, schemas, migrations, environment files, or task ledgers.

The strongest positive delta since the previous daily review is that the canonical sales lifecycle has moved materially forward: channel/customer lifecycle migration is done, local post-cutover retirement is recorded at 12/13, and production later accepted general 100% canonical Sales Pipeline serving after authenticated checks. Sales Orders request-storm protection also has real source guardrails and focused tests, while Ticket 17 now adds a deliberate failed-subset status-only fallback path. Remaining operational risk is concentrated in legacy public sales write routes, Square terminal/device-code side effects, the red broad typecheck, and usability gaps where workers/dealers still need clearer interruption-safe or manufacturing-ready guidance.

## Typecheck Result

`bun run typecheck` still fails in `@gnd/settings` because `packages/errors/src/index.ts` has extensionless NodeNext relative exports. The reported exports should include `.js` suffixes for `app-error`, `classify`, `descriptors`, `public-error`, `reference`, `presentation`, and `types`. Today's run reported 13 successful tasks out of 24 and a Turbo lockfile warning for missing `aproba`.

## Top Findings

- P1: Legacy sales router write paths remain public: wallet payment, restore, supplier save/delete, and step metadata mutations are still exposed through `publicProcedure`.
- P1: Square terminal side-effect routes remain public: `squareTestRouter.test` can create a test terminal checkout, and `checkout.generateDeviceCode` can create a Square Terminal API device code.
- P1: Broad typecheck is red in `@gnd/settings`, so shared package validation is still not clean.
- P2: Task-event job-control routes use public tRPC wrappers even though the query layer has inner Super Admin guards.
- P2: Settings Active Sessions still renders mock device data and fake logout behavior.
- P2: Mobile packing quantity drafts are in-memory only and are not recoverable after interruption.
- P2: Dealer order guidance still collapses manufacturing blockers into generic preparation language.

## Next Actions

1. Harden public legacy sales mutations: wallet payment, restore, supplier save/delete, and step metadata.
2. Move Square terminal test/device-code operations behind staff auth and role/permission checks.
3. Fix the `packages/errors/src/index.ts` NodeNext export suffixes and rerun `bun run typecheck`.
4. Close the Sales Orders request-storm task once the remaining validation and Brain evidence are recorded.
5. Finish the canonical lifecycle closure gates already tracked in Brain, then continue Ticket 17 fallback validation.

## Source Limitations

This was a static source and Brain review. I did not run browser QA, emulator/device QA, migrations, data syncs, production scripts, repair dry-runs, or repair applies. `apps/www` does not exist, so I reviewed active equivalents `apps/dashboard`, `apps/web`, and `apps/storefront`. No source files, app/package code, schemas, migrations, environment files, or task ledgers were edited by this run.

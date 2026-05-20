# New Sales Form Phase 0 Validation Log

Date: 2026-05-20
Status: Active
Owner: Sales Form Rebuild Team

## Purpose

Track Phase 0 validation runs separately from the acceptance matrix and fixture
catalog. This log records which checks have evidence, which checks are blocked,
and which checks still require browser/runtime proof.

## 2026-05-20 Automated Runs

### Shared Sales Form Domain And Workflow Suite

Command:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/ui/workflow
```

Result:

- Pass.
- 99 tests.
- 286 assertions.

Coverage signal:

- Profile repricing.
- Workflow calculators.
- Door/HPT supplier and size pricing helpers.
- Step engine, route engine, grouping, mutation engine.
- Workflow row patches, door actions, selection actions, sync patches.
- Dual pricing with internal coefficient plus dealer percentage.

Remaining gap:

- This is package-level proof only. Browser/runtime proof is still required for
  `www` form interactions and dealership quote composer display/save/reopen.

### Shared Dual Pricing

Command:

```sh
bun test packages/sales/src/sales-form/domain/dual-pricing.test.ts
```

Result:

- Pass.
- 3 tests.
- 13 assertions.

Coverage signal:

- Internal profile uses `coefficient`.
- Dealer profile uses `salesPercentage`.
- Missing profiles fall back to internal coefficient `1` and dealer percentage `0`.
- Snapshot records internal coefficient and dealer sales percentage separately.

### Dealer Query/Pricing Suite

Command:

```sh
bun test packages/db/src/queries/dealers.test.ts
```

Result:

- Pass.
- 6 tests.
- 19 assertions.

Coverage signal:

- Dealer pricing snapshot keeps internal and dealer totals separate.
- Dealer profile percentage contributes to dealer-facing pricing.
- Dealer isolation guards reject cross-dealer profile/document access.
- Dealer quote conversion is scoped to the active dealer.

### API New Sales Form Query Suite

Command:

```sh
bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
```

Result:

- Blocked by local dependency environment.
- The run emitted:

```text
error: ENOENT reading "/Users/M1PRO/Documents/code/_turbo/gnd/packages/ui/node_modules/tailwind-merge"
```

Notes:

- The process hung after the dependency error and was stopped.
- This is an environment/dependency-resolution blocker, not a Phase 0 product
  pass/fail result.
- The local `packages/ui/node_modules/tailwind-merge` symlink points at
  `node_modules/.bun/tailwind-merge@3.5.0/...`, while the checked local root
  has `tailwind-merge@3.4.0` available.
- `bun install` completed with "no changes" and did not repair the missing
  `tailwind-merge@3.5.0` target.
- `bun install --force` produced no progress for multiple minutes and was
  stopped; no source or lockfile changes were observed afterward.

Required follow-up:

- Repair/install workspace dependencies, then rerun the API new-sales-form query
  suite before closing Phase 0.

## Current Phase 0 Evidence Summary

| Area | Evidence Status | Notes |
| --- | --- | --- |
| Shared domain/workflow package | Passing automated evidence | 99 tests / 286 assertions |
| Dealer percentage pricing | Passing package/query evidence | Browser display/save/reopen still pending |
| Dealer line total semantics | Contract gap documented | Needs Phase 1 fix or explicit override contract |
| API save/reopen suite | Blocked | Local `tailwind-merge` dependency issue |
| `www` browser workflows | Pending | Requires dev server/browser runtime |
| Dealership browser workflows | Pending | Requires dev server/browser runtime |

## Phase 0 Cannot Close Until

- API new-sales-form query suite runs successfully or fails with actionable
  product-level failures.
- Browser/runtime evidence is captured for the workflows listed in
  `brain/new-sales-form-phase0-acceptance-matrix.md`.
- Remaining `Fail`/`Partial` repro rows are linked to Phase 1+ implementation
  task IDs.

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

Initial result:

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

- Complete. The stale `packages/ui/node_modules/tailwind-merge` symlink was
  repointed from missing `tailwind-merge@3.5.0` to the installed lockfile target
  `tailwind-merge@3.4.0`.

Rerun:

```sh
bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
```

Rerun result:

- Pass.
- 12 tests.
- 108 assertions.

Coverage signal:

- Shelf category/product query hydration.
- Payment method hydration from legacy sales order meta.
- Save/hydrate relational `formSteps`, `shelfItems`, `housePackageTool`, doors,
  and moulding rows.
- Soft-delete/replace behavior for prior relational rows.
- Legacy-style order ID generation and relational sales tax rows.
- Mixed-line relation boundaries for door, shelf, service.
- Grouped moulding/service collapse and legacy sibling save parity.

## 2026-05-20 Phase 1/6 Implementation Runs

### Pricing, Dealer Query, And API Regression Set

Command:

```sh
bun test packages/sales/src/sales-form/domain/dual-pricing.test.ts packages/db/src/queries/dealers.test.ts apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
```

Result:

- Pass.
- 21 tests.
- 140 assertions.

Coverage signal:

- Dealer pricing continues to use internal `coefficient` and dealer
  `salesPercentage` separately.
- Dealer query save/convert behavior remains scoped and percentage-aware.
- New sales form API save/reopen behavior still passes after UI contract fixes.

### Shared Sales Form Package Regression Set

Command:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/ui/workflow
```

Result:

- Pass.
- 99 tests.
- 286 assertions.

Coverage signal:

- Shared workflow/domain helpers still pass after adding read-only line-total
  display support and stricter header action gating.

### Typecheck Signal

Commands:

```sh
bun run --filter @gnd/dealership typecheck
bun run --filter @gnd/sales typecheck
bun run --filter @gnd/www typecheck
```

Result:

- `@gnd/dealership`: Pass.
- `@gnd/sales`: Blocked by existing unrelated typecheck errors in package test
  and print/control files; no new edited-file error was identified in the
  visible output.
- `@gnd/www`: Blocked by existing unrelated application-wide typecheck errors;
  no new edited-file error was identified in the visible output.

## Current Phase 0 Evidence Summary

| Area | Evidence Status | Notes |
| --- | --- | --- |
| Shared domain/workflow package | Passing automated evidence | 99 tests / 286 assertions |
| Dealer percentage pricing | Passing package/query evidence | Browser display/save/reopen still pending |
| Dealer line total semantics | Implemented; browser proof pending | Dealer line total is now read-only/derived in dealership UI |
| API save/reopen suite | Passing automated evidence | 12 tests / 108 assertions |
| `www` load error retry | Implemented; browser proof pending | Error branch now renders before skeleton fallback |
| Header action gating | Implemented; browser proof pending | Optional shared actions now require real handlers |
| `www` browser workflows | Pending | Requires dev server/browser runtime |
| Dealership browser workflows | Pending | Requires dev server/browser runtime |

## Phase 0 Cannot Close Until

- Browser/runtime evidence is captured for the workflows listed in
  `brain/new-sales-form-phase0-acceptance-matrix.md`.
- Remaining `Fail`/`Partial` repro rows are linked to Phase 1+ implementation
  task IDs.

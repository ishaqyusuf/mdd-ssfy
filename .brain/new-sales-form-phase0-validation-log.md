# New Sales Form Phase 0 Validation Log

Date: 2026-05-20
Status: Phase 0 code gate complete; runtime proof pended
Owner: Sales Form Rebuild Team

## Purpose

Track Phase 0 validation runs separately from the acceptance matrix and fixture
catalog. This log records which checks have evidence, which checks are blocked,
and which checks still require browser/runtime proof.

## 2026-07-18 Migration Gate Rerun

Command:

```sh
bun run test:new-sales-form-migration
```

Result:

- Shared sales package workflow/domain suite passed: `161` tests / `492` assertions.
- Dealer persistence/query suite passed: `39` tests / `101` assertions.
- New-sales-form API compatibility tests passed in the gate; the immediately preceding focused rerun recorded `23` tests / `155` assertions across the API query and history query suites.
- The gate stopped at `@gnd/dealership` typecheck before the watched `www` signal ran.
- Dealership diagnostics are in unchanged baseline files, including `apps/api/src/db/queries/checkout.ts`, `apps/api/src/db/queries/sales-form.ts`, `apps/api/src/db/queries/sales-inventory-inbound-ownership.ts`, `packages/inventory`, `packages/pdf`, `packages/sales/src/sales-form/ui/workflow/sales-form-workflow-panel.tsx`, `packages/sales/src/sales-fulfillment-plan.ts`, and duplicate React types in shared `packages/ui` primitives.
- The changed estimate implementation `packages/sales/src/sales-form/ui/workflow/house-package-tool-panel.tsx` and changed new-form history/parity files did not appear in the dealership diagnostics.

Gate interpretation:

- Feature test evidence is green.
- The repository-level migration command is not green because the documented gate still requires a clean dealership typecheck and does not tolerate its current unrelated baseline.
- Do not report the full migration gate as passed until that broader baseline is repaired or the gate policy is deliberately revised.

## Pend Decision

The browser/runtime proof remains open, but it is no longer blocking the next
implementation phase. The blocker is environmental access, not a known product
failure in the completed fixes: local `www` and dealership routes redirect to
login without valid sessions, and unauthenticated `www` also reports a tRPC
runtime parse issue. Continue feature implementation with automated package/API
proof, and resume browser evidence when authenticated local sessions are
available.

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

## 2026-05-20 Runtime Smoke Attempt

### Dealership Quote Composer

Command:

```sh
curl -i -sS --max-time 10 -H 'Host: gnd-dealership.localhost' http://127.0.0.1:3006/quotes/new
```

Result:

- Blocked by local dealer auth/session.
- Existing dev process was already registered for `gnd-dealership.localhost`
  with PID `15043`.
- `/quotes/new` returns `307 Temporary Redirect` to `/login` via
  `requireDealer`.

### `www` New Sales Form

Command:

```sh
curl -i -sS --max-time 10 -H 'Host: gndprodesk.localhost' http://127.0.0.1:3000/sales-form/create-order
```

Result:

- Blocked by local auth/session and runtime environment.
- The route returns an SSR shell, but the layout emits
  `NEXT_REDIRECT;replace;/login/v2;307`.
- The shell also reports a tRPC client parse failure:
  `Unexpected token '<', "<?xml vers"... is not valid JSON`.

Runtime conclusion:

- Code-level and package/API regression proof is green for the implemented
  fixes.
- Browser workflow proof still requires valid local authenticated sessions and
  a clean local tRPC/runtime endpoint.

## 2026-05-20 Phase 1 Customer/Profile/Tax Integration

Implementation:

- Added `setSalesFormCustomerProfileMeta(...)` to the shared sales-form state
  reducers so profile meta changes, profile repricing, and summary recompute are
  applied atomically.
- Wired `apps/www` invoice overview profile changes through the new reducer for
  manual profile selection, resolved-customer profile changes, default-profile
  selection, and late-loaded profile option safety.
- Kept tax-rate updates on the existing `setSalesFormTaxRate(...)` path, which
  recomputes summary immediately.

Focused command:

```sh
bun test packages/sales/src/sales-form/state/actions/line-items.test.ts packages/sales/src/sales-form/domain/profile-repricing.test.ts packages/sales/src/new-sales-form-costing.test.ts
```

Result:

- Pass.
- 23 tests.
- 88 assertions.

Regression command:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow
```

Result:

- Pass.
- 104 tests.
- 306 assertions.

API command:

```sh
bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
```

Result:

- Pass.
- 12 tests.
- 108 assertions.

Typecheck signal:

- `bun run --filter @gnd/dealership typecheck`: Pass.
- `@gnd/sales` still has existing repo-wide typecheck blockers, but filtering
  for the touched sales-form files only reports the existing missing
  `bun:test` type declaration in test files.
- `@gnd/www` still has existing repo-wide typecheck blockers, and filtering for
  touched `new-sales-form/store` and `invoice-overview-panel` files reports no
  matching errors.

## 2026-05-20 Phase 1 Door/HPT Pricing Proof

Implementation/proof:

- Added package proof that changing the selected door supplier reprices already
  persisted HPT rows using supplier variant cost, the active customer-profile
  multiplier, and shared non-door component surcharge.
- Added proof that unavailable supplier pricing marks persisted rows as missing
  and zeros their unit/line totals instead of silently falling back to stale
  prices.

Focused command:

```sh
bun test packages/sales/src/sales-form/ui/workflow/workflow-door-actions.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts packages/sales/src/sales-form/domain/workflow-calculators.test.ts
```

Result:

- Pass.
- 37 tests.
- 109 assertions.

Regression command:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow
```

Result:

- Pass.
- 106 tests.
- 318 assertions.

## 2026-05-20 Phase 1 Shelf Pricing/Rollup Proof

Implementation/proof:

- Hardened the shared shelf row normalizer so profile-based recalculation only
  derives sales price from explicit base metadata.
- Preserved stored shelf `unitPrice`/sales price for legacy persisted rows that
  do not carry base-price metadata, avoiding accidental double-discount during
  sync/reopen.
- Added package proof for both legacy shelf rows and base-metadata shelf rows,
  plus workflow sync coverage for parent line totals.

Focused command:

```sh
bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts
```

Result:

- Pass.
- 38 tests.
- 115 assertions.

Regression command:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow
```

Result:

- Pass.
- 110 tests.
- 334 assertions.

## 2026-05-20 Phase 1 Moulding/Service Proof

Implementation/proof:

- Fixed grouped moulding display totals to include shared non-moulding
  component price from the line's workflow steps when deriving totals from
  persisted `meta.mouldingRows`.
- Added package proof that fresh/reselected moulding rows default to quantity
  `1`, while existing stored moulding rows preserve their quantity.
- Added package proof for moulding shared component price, addon, custom
  override, row totals, and parent line rollups.
- Added package proof that multi-row service tax and production flags persist
  into line metadata and grouped display totals are derived from
  `meta.serviceRows`.

Focused command:

```sh
bun test packages/sales/src/sales-form/domain/workflow-calculators.test.ts packages/sales/src/sales-form/ui/workflow/workflow-row-patches.test.ts packages/sales/src/sales-form/ui/workflow/workflow-line-totals.test.ts packages/sales/src/sales-form/ui/workflow/workflow-moulding-actions.test.ts
```

Result:

- Pass.
- 42 tests.
- 121 assertions.

Regression command:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow
```

Result:

- Pass.
- 116 tests.
- 356 assertions.

## Current Phase 0 Evidence Summary

| Area | Evidence Status | Notes |
| --- | --- | --- |
| Shared domain/workflow package | Passing automated evidence | 116 tests / 356 assertions |
| Dealer percentage pricing | Passing package/query evidence | Browser display/save/reopen still pending |
| Dealer line total semantics | Implemented; browser proof pending | Dealer line total is now read-only/derived in dealership UI |
| `www` profile/tax recalc chain | Implemented; API/package proof passing | Browser proof pending behind local auth/session gate |
| Door/HPT pricing | Implemented; package proof passing | Supplier repricing, surcharge, missing-price, size-candidate, and HPT row proof passing; browser proof pending |
| Shelf pricing/rollups | Implemented; package proof passing | Legacy stored unit prices and explicit base-metadata repricing are covered; browser proof pending |
| Moulding/service pricing | Implemented; package proof passing | Moulding default qty/shared component/addon/custom totals and service tax/production flags are covered; browser proof pending |
| API save/reopen suite | Passing automated evidence | 12 tests / 108 assertions |
| `www` load error retry | Implemented; browser proof pending | Error branch now renders before skeleton fallback |
| Header action gating | Implemented; browser proof pending | Optional shared actions now require real handlers |
| `www` browser workflows | Blocked | Requires valid local auth/session and clean tRPC runtime endpoint |
| Dealership browser workflows | Blocked | Requires valid local dealer auth/session |

## Pended Runtime Gate

- Browser/runtime evidence is captured for the workflows listed in
  `brain/new-sales-form-phase0-acceptance-matrix.md`.
- Remaining `Fail`/`Partial` repro rows are linked to Phase 1+ implementation
  task IDs.

This gate is explicitly pended so Phase 1 implementation can continue.

## 2026-05-20 Phase 1 Final Checkpoint

Commands:

```sh
bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
bun run --filter @gnd/dealership typecheck
git diff --check
```

Result:

- API save/reopen suite: Pass, 12 tests / 108 assertions.
- Dealership typecheck: Pass.
- Diff whitespace check: Pass.

Known remaining typecheck signal:

- `bun run --filter @gnd/sales typecheck` still fails on existing repo-wide
  strictness/test type issues, including missing `bun:test` declarations and
  unrelated print/control/UI utility errors.
- `bun run --filter @gnd/www typecheck` still fails on existing repo-wide
  action, legacy sales-book, table, TRPC, and shared UI type issues.

## 2026-05-20 Phase 2 Persistence/Recovery Proof

Implementation/proof:

- Kept autosave as an explicit opt-in/off-by-default editor setting while
  strengthening the local recovery path around dirty edits.
- Extracted pure local-recovery snapshot helpers for versioned snapshot creation
  and parsing so recovery behavior is testable without browser runtime access.
- Added app-level recovery tests for storage-key scoping, snapshot parsing,
  stale/invalid snapshot rejection, and recoverable-content fingerprinting.
- Added state lifecycle tests covering hydrated autosave opt-in defaults, save error
  retention, status reset on next edit, successful save cleanup, and local draft
  restoration without overwriting editor preferences.
- Extended API save/reopen proof to assert customer profile id, tax code, tax
  rate, tax total, relational tax rows, and amount due persistence.

Focused command:

```sh
bun test packages/sales/src/sales-form/state/actions/line-items.test.ts apps/www/src/components/forms/new-sales-form/local-recovery.test.ts
```

Result:

- Pass.
- 13 tests.
- 53 assertions.

Regression commands:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow
bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
bun test apps/www/src/components/forms/new-sales-form/local-recovery.test.ts
```

Result:

- Shared sales package: Pass, 120 tests / 378 assertions.
- API save/reopen suite: Pass, 12 tests / 114 assertions.
- App recovery unit: Pass, 4 tests / 11 assertions.

Remaining Phase 2 gap:

- Browser refresh/network-interruption proof is still intentionally pended
  behind the local auth/session gate.

## 2026-05-20 Phase 3 Shared Composer Proof

Implementation/proof:

- Added `packages/sales/src/sales-form/composer` as the shared composer
  boundary for record normalization, save payload shaping, and pricing adapter
  selection.
- Added coefficient and percentage pricing adapters:
  - `www` uses coefficient mode.
  - dealership uses percentage mode with dealer `salesPercentage`.
- Rewired `www` new-sales-form save payload creation through
  `composeSalesFormSavePayload(...)`.
- Rewired dealership quote client display pricing through
  `composeSalesFormPricingSnapshot(...)` with `surface: "dealership"` and
  `mode: "percentage"`.
- Left dealership server-side quote persistence local for now to avoid creating
  a `@gnd/db` -> `@gnd/sales` package dependency cycle.

Focused command:

```sh
bun test packages/sales/src/sales-form/composer/composer.test.ts packages/sales/src/sales-form/domain/dual-pricing.test.ts
```

Result:

- Pass.
- 6 tests.
- 29 assertions.

Regression commands:

```sh
bun test packages/sales/src/sales-form/domain packages/sales/src/sales-form/state packages/sales/src/sales-form/ui/workflow packages/sales/src/sales-form/composer
bun test apps/api/src/db/queries/new-sales-form.test.ts apps/api/src/db/queries/new-sales-form.multi-line.test.ts
bun run --filter @gnd/dealership typecheck
git diff --check
```

Result:

- Shared sales package + composer: Pass, 123 tests / 394 assertions.
- API save/reopen suite: Pass, 12 tests / 114 assertions.
- Dealership typecheck: Pass.
- Diff whitespace check: Pass.

Boundary note:

- Shared composer can shape records and select pricing adapters.
- Surface-specific UX, auth, navigation, save side effects, and dealer server
  persistence remain outside the composer.

# Sales Overview Production V2 Progressive Status Badges

## Status

Planned on 2026-08-23. Implementation has not started.

## Objective

Replace the fixed Assigned, Production, and Fulfilled progress strips in each
Sales Overview Production V2 item header with a compact, progressive set of
shadcn badges. The badges should show only actionable/current state, while
retaining overlapping partial stages when the underlying data genuinely spans
multiple stages. Item title and subtitle remain uppercase.

## Assumptions

- This is a Sales Overview V2-only presentation change. The legacy Production
  fallback keeps `ItemProgressBar` until its own migration is authorized.
- The existing role boundary remains: the three status strips are currently
  admin-only, so the replacement badge row is admin-only. Production workers
  keep their existing simplified item header.
- Canonical stage quantities come from the existing Sales Control projection:
  - ordered: `item.qty.total`, falling back to `item.qty.qty`;
  - assigned: `item.analytics.stats.prodAssigned.total`;
  - produced/submitted: `item.analytics.stats.prodCompleted.total`;
  - fulfilled: `item.analytics.stats.dispatchCompleted.total`.
- The resolver must use `total`, not only `qty`, because handed doors may store
  their quantities in `lhQty` and `rhQty` while `qty` is zero.
- Fulfillment applicability comes from the current item control's `shippable`
  flag. A fully produced non-shippable item ends at `Production Completed`; a
  fully produced shippable item advances to `Ready to Fulfill`.
- Final fulfillment copy is `Fulfilled` when fulfilled quantity reaches the
  ordered quantity.
- Quantities are clamped to `0...ordered` for display. The UI does not rewrite
  or conceal upstream partial states when legacy data contains downstream
  progress before an upstream stage is complete.

## Detailed Execution Plan

### 1. Establish a pure V2 status contract

1. Add a pure resolver under
   `apps/dashboard/src/components/sheets/sales-overview-sheet/production/v2/`
   instead of embedding stage rules in the React item shell.
2. Define a small input contract containing ordered, assigned, produced,
   fulfilled, and shippable values.
3. Define a stable badge model containing an id, visible label, and shadcn Badge
   variant. The React component should only render this model.
4. Normalize invalid values once:
   - coerce null/undefined/NaN to zero;
   - clamp negative values to zero;
   - clamp stage values above the ordered quantity;
   - return no status badges when ordered quantity is zero.
5. Keep the resolver independent from React, routing, queries, and mutation
   components so every state can be covered by a fast Bun unit test.

### 2. Implement the progressive badge rules

Use these rules in pipeline order while allowing partial upstream badges to
coexist with downstream progress:

| Data state | Visible badge result |
| --- | --- |
| Assigned `0` | `Not Assigned` |
| Assigned between `0` and total | `X of Y assigned` |
| Assigned complete, production `0` | `Assigned` |
| Production `0` | No production badge |
| Production between `0` and total | `X of Y submitted` |
| Production complete, assignment complete, shippable, fulfillment `0` | `Ready to Fulfill` |
| Production complete, non-shippable | `Production Completed` |
| Fulfillment `0` before upstream completion | No fulfillment badge |
| Fulfillment between `0` and total | `X of Y fulfilled` |
| Fulfillment complete | `Fulfilled` |

Additional composition rules:

1. Hide the completed Assignment badge as soon as production progress begins.
2. Hide the completed Production badge when the item advances to an applicable
   fulfillment state.
3. Keep a partial Assignment badge visible even when Production or Fulfillment
   has started. This exposes incomplete upstream work rather than falsely
   presenting a clean handoff.
4. Keep a partial Production badge visible beside partial Fulfillment.
5. Permit one, two, or three badges:
   - healthy sequential data normally produces one badge;
   - overlapping partial stages produce two badges;
   - partial assignment, production, and fulfillment produces three badges.
6. Do not show `Ready to Fulfill` unless Assignment and Production are both
   complete and the item is shippable.
7. If Production is complete while Assignment is unexpectedly partial, show
   the partial Assignment badge plus `Production Completed`; do not claim the
   item is ready to fulfill.

### 3. Add the shadcn badge presentation

1. Add a small `ProductionItemStageBadges` component in the V2 package.
2. Render a wrapping row with compact spacing so one to three badges remain
   readable at mobile widths without horizontal overflow.
3. Use the repository's existing shadcn `Badge` variants rather than custom
   status pills:
   - `outline` for `Not Assigned`;
   - `secondary` for partial and assigned states;
   - `default` for `Ready to Fulfill`;
   - `success` for terminal completed states.
4. Keep complete status meaning in the badge text; color must not be the only
   carrier of state.
5. Avoid icons unless later visual review proves they improve scanning. Text-only
   badges match the requested compact treatment and reduce header noise.
6. Keep item title and subtitle in standard shadcn `ItemTitle` and
   `ItemDescription`, both with the existing `uppercase` class.

### 4. Integrate only with the Production V2 item header

1. In `production/v2/production-tab-v2.tsx`, remove the V2 import and render of
   the legacy `ItemProgressBar`.
2. Render `ProductionItemStageBadges` in the same admin-only header position so
   selection, item menu, accordion trigger, expansion, and worker behavior do
   not change.
3. Type the new component from the shared `ProductionItem` contract in
   `production-item-context.tsx`; do not import `ItemCardProps` from the legacy
   `production-tab.tsx` renderer.
4. Preserve the existing uppercase title/subtitle classes and add a focused
   regression assertion so this requirement cannot drift.
5. Do not change Assignment, Submission, Details, Notes, readiness, or mutation
   components as part of this slice.

### 5. Build focused behavior coverage before visual polish

Add table-driven unit tests for at least these ordered/assigned/produced/
fulfilled cases, using an ordered quantity of 10:

1. `0/0/0` -> `Not Assigned`.
2. `4/0/0` -> `4 of 10 assigned`.
3. `10/0/0` -> `Assigned`.
4. `4/2/0` -> assignment and submission badges.
5. `4/2/1` -> three partial badges.
6. `10/3/0` -> only `3 of 10 submitted`.
7. `10/10/0`, shippable -> only `Ready to Fulfill`.
8. `10/10/0`, non-shippable -> only `Production Completed`.
9. `10/10/4` -> only `4 of 10 fulfilled`.
10. `10/10/10` -> only `Fulfilled`.
11. Over-reported and negative quantities -> clamped labels.
12. Handed-door input whose `qty` is zero but `total` is nonzero -> correct
    stage counts.

Update the V2 source contract to assert:

- the V2 item shell imports the new badge component and no longer imports
  `ItemProgressBar`;
- title and subtitle remain uppercase;
- worker-mode badge suppression remains intact;
- the legacy Production tab still imports `ItemProgressBar` as its fallback;
- the expected labels and shadcn Badge variants are present.

### 6. Validate the completed implementation

1. Run the new pure resolver test first.
2. Run the focused Production V2 gateway/source contract and current Production
   worker-policy tests.
3. Run scoped Biome check only on the new V2 resolver/component/test and the
   touched V2 item shell.
4. Run `git diff --check` on the touched scope.
5. Recommended authenticated browser acceptance in the already-running app:
   - no assignment;
   - partial assignment;
   - fully assigned with no submission;
   - partial submission;
   - ready to fulfill;
   - partial fulfillment;
   - fulfilled;
   - a deliberately overlapping partial fixture showing two or three badges;
   - desktop and narrow sheet widths;
   - admin versus worker header parity.
6. Do not run a broad dashboard build/typecheck or browser mutation flow unless
   explicitly requested under the fast Bun command discipline.

### 7. Documentation impact check

1. Update `.brain/features/sales-production-workspace.md` with the final badge
   state contract and validation evidence.
2. Update `.brain/progress.md` when implementation is complete.
3. Update this plan from `Planned` to `Implemented` with the actual file scope
   and verification results.
4. No API, database, migration, permission, or ADR update is expected because
   the resolver consumes the existing Sales Control projection and changes only
   V2 presentation.

## Expected File Scope

New:

- `apps/dashboard/src/components/sheets/sales-overview-sheet/production/v2/production-item-stage.ts`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production/v2/production-item-stage.test.ts`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production/v2/production-item-stage-badges.tsx`

Modified:

- `apps/dashboard/src/components/sheets/sales-overview-sheet/production/v2/production-tab-v2.tsx`
- `apps/dashboard/src/components/sheets/sales-overview-sheet/production-v2-gateway.test.ts`
- `.brain/features/sales-production-workspace.md`
- `.brain/progress.md`
- this plan file

Explicitly unchanged:

- legacy `item-progress-bar.tsx` and `production-tab.tsx` behavior;
- Sales Control/API projections;
- assignment, submission, packing, dispatch, and fulfillment mutations;
- database schema, migrations, permissions, and routing.

## Skills List Used

- `plan`: structured the request as an implementation-ready execution plan and
  prevented implementation from starting before approval.
- `project-brain` protocol: aligned the plan with the existing Sales Production
  workspace, V2 rollout boundary, and documentation requirements.
- `vercel-react-best-practices`: kept derived badge state pure, avoided extra
  client state/effects, and preserved the V2 dynamic boundary.
- `agency-engineering` — Frontend Developer: defined responsive, accessible,
  shadcn-based badge presentation and focused UI acceptance criteria.

## Risks and Mitigations

- **Handled-door counts can be wrong if `.qty` is used.** Use QtyStat `.total`
  with a focused handed-door test.
- **Stage labels can hide inconsistent upstream work.** Always retain partial
  upstream badges even when downstream progress exists.
- **`Ready to Fulfill` can be shown too early.** Require complete Assignment,
  complete Production, zero Fulfilled, and `shippable === true`.
- **Changing the shared progress component would alter the legacy fallback.**
  Introduce a V2-specific badge component and leave `ItemProgressBar` intact.
- **Three badges can overflow narrow item headers.** Use `flex-wrap`, compact
  gaps, and browser acceptance at narrow sheet width.
- **Color-only status is inaccessible.** Keep explicit state and quantities in
  every badge label and use standard theme variants.
- **Legacy data may exceed or contradict ordered quantity.** Clamp display
  values and surface overlapping partial badges instead of normalizing source
  data in the UI.

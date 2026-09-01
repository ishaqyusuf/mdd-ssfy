# Status-only Sales Completion Release Verification

## Release decision

Ready for final Brain review. All 23 approved acceptance scenarios have direct
automated evidence, the focused release suite passes 134 tests / 702 assertions,
the permission regression repair passes its scoped lint, test, and typecheck,
and authenticated local runtime proof covers both Production and Fulfillment
Status-only mark/cancel presentation without changing either operational state.

Repository-wide commands were run rather than inferred from the focused suite.
Their unrelated existing failures are recorded below. No Status-only completion
failure remains, no assertion was weakened or skipped, and no Preview or
Production database was read from or written to for migration verification.

## Acceptance matrix

| # | Requirement | Direct evidence | Result |
|---:|---|---|---|
| 1 | Production Status-only writes audited administrative provenance only. | `packages/sales/src/sales-completion.test.ts`; authenticated order `09535DB` remained `Awaiting production` after the mark and exposed Pablo Cruz provenance. | Pass |
| 2 | Fulfillment Status-only writes no Production record. | `packages/sales/src/sales-completion.test.ts`; authenticated order `09541AD` showed Fulfillment Status-only provenance while Production retained its independent operational state. | Pass |
| 3 | Fulfillment implies Production satisfaction without manufacturing workflow evidence. | `packages/sales/src/sales-completion.test.ts` and `packages/sales/src/order-list-read-model.test.ts`. | Pass |
| 4 | Full workflow remains the default and retains existing behavior. | `apps/dashboard/src/components/sales-fulfillment-completion.test.ts`, `apps/dashboard/src/components/sales-completion-presentation.test.ts`, and both authenticated dialogs opened with Full workflow selected. | Pass |
| 5 | A user without edit permission cannot call mark/cancel directly. | `apps/api/src/trpc/routers/sales-completion-permissions.test.ts` and `apps/api/src/trpc/routers/permission-boundaries.test.ts`. | Pass |
| 6 | A user without view permission cannot see governed choice or provenance. | `apps/dashboard/src/actions/role-permission-rows.test.ts` and `apps/dashboard/src/components/sales-completion-presentation.test.ts`. | Pass |
| 7 | Duplicate requests are idempotent. | `packages/sales/src/sales-completion.test.ts` covers repeated mark/cancel request identities and active-record races. | Pass |
| 8 | Cancelling Fulfillment restores explicit or operational Production evidence. | `packages/sales/src/sales-completion.test.ts`. | Pass |
| 9 | Cancelling Fulfillment becomes unresolved when no Production evidence survives. | `packages/sales/src/sales-completion.test.ts`. | Pass |
| 10 | Production cancellation is rejected while active Fulfillment depends on it. | `packages/sales/src/sales-completion.test.ts`. | Pass |
| 11 | Status-only cancellation preserves history and performs no operational reversal. | `packages/sales/src/sales-completion.test.ts`; local cleanup cancelled the exact two Ticket 07 records and left their ledger history durable. | Pass |
| 12 | Full cancellation continues through the existing workflow reversal. | `packages/sales/src/sales-completion.test.ts` and Full-workflow provenance/cancellation coverage from Ticket 05. | Pass |
| 13 | Unknown effective time stays null while recorded time is populated. | `packages/sales/src/sales-completion.test.ts`, `packages/sales/src/sales-completion-reporting.test.ts`, and both authenticated dialogs displayed effective date as unknown. | Pass |
| 14 | List/detail/pending projections agree. | `packages/sales/src/order-list-read-model.test.ts`, `apps/api/src/db/queries/sales-orders-v2.test.ts`, and `packages/sales/src/utils/where-queries.control-filters.test.ts`. | Pass |
| 15 | Administrative completion does not mutate operational side effects. | `packages/sales/src/sales-completion.test.ts`; local Fulfillment stayed `Ready to fulfill` and local Production stayed `Awaiting production`. | Pass |
| 16 | Migration creates no inferred completion rows or legacy authority changes. | `packages/db/src/sales-completion-migration.test.ts`; local migrate/push reported already in sync. | Pass |
| 17 | Concurrent mark/cancel cannot duplicate or produce an invalid active state. | `packages/sales/src/sales-completion.test.ts` serializable/race coverage. | Pass |
| 18 | Operational reports omit Status-only by default while history retains it. | `packages/sales/src/sales-completion-reporting.test.ts`. | Pass |
| 19 | Administrative Fulfillment does not make canonical Fulfilled true. | `packages/sales/src/sales-completion.test.ts` and `packages/sales/src/order-list-read-model.test.ts`. | Pass |
| 20 | Later canonical evidence wins disposition without erasing administrative history. | `packages/sales/src/sales-completion.test.ts`. | Pass |
| 21 | Completion queues may close while operational filters remain unchanged. | `packages/sales/src/utils/where-queries.control-filters.test.ts`, `apps/api/src/db/queries/sales-orders-v2.test.ts`, and `packages/sales/src/order-list-read-model.test.ts`. | Pass |
| 22 | Exactly two persisted permission rows normalize independently. | `packages/utils/src/status-only-sales-completion-permissions.test.ts`, `apps/dashboard/src/actions/role-permission-rows.test.ts`, and migration contract coverage. | Pass |
| 23 | A lone snake-case compatibility row grants neither capability. | `packages/utils/src/status-only-sales-completion-permissions.test.ts`. | Pass |

## Focused automated verification

The combined release command passed **134 tests, 0 failures, 702 assertions**
across these 13 files:

- `packages/sales/src/sales-completion.test.ts`
- `packages/sales/src/sales-completion-reporting.test.ts`
- `packages/sales/src/order-list-read-model.test.ts`
- `packages/sales/src/utils/where-queries.control-filters.test.ts`
- `packages/db/src/sales-completion-migration.test.ts`
- `apps/api/src/trpc/routers/sales-completion-permissions.test.ts`
- `apps/api/src/trpc/routers/permission-boundaries.test.ts`
- `apps/api/src/db/queries/sales-orders-v2.test.ts`
- `apps/dashboard/src/actions/role-permission-rows.test.ts`
- `apps/dashboard/src/components/sales-completion-presentation.test.ts`
- `apps/dashboard/src/components/sales-fulfillment-completion.test.ts`
- `apps/dashboard/src/components/sales-bulk-production-completion-task.test.ts`
- `packages/sales/src/bulk-production-completion.test.ts`

Root typecheck exposed a Ticket 07-related declaration mismatch in
`packages/utils/src/status-only-sales-completion-permissions.test.ts`: the local
`bun:test` declaration exports `it`, not `test`, and does not type `.not`. The
test now uses the declared API while retaining the same negative permission
assertion. Its scoped Biome check, 3 tests / 9 assertions, and Utils typecheck
all pass after the repair.

Affected package typechecks pass for `@gnd/sales`, `@gnd/db`, and `@gnd/utils`.
Filtered API diagnostics contain only three unrelated existing errors in
inbound receiving, Special Order enrollment, and dispatch route typing.
Dashboard diagnostics complete with the increased heap and retain broad
existing errors outside Status-only completion. Root typecheck proceeds through
the affected packages and stops at the unrelated `@gnd/settings` / NodeNext
extension baseline in `packages/errors/src/index.ts`.

## Repository-wide checks and isolated baselines

- `bun test`: **4,186 pass, 1 skip, 86 fail, 13 errors**, 4,273 tests and
  14,638 assertions. The failures span unrelated missing workspace metadata,
  Sentry contracts, Sales form/document fixtures, table tests, and other
  existing suites. The main checkout baseline was worse at 4,179 pass / 93
  fail / 13 errors. No Status-only completion test failed.
- `bun run test` in `apps/api`: **599 pass, 53 fail, 8 errors**. Failures are
  unrelated environment and mock-contract baselines, including missing
  `ENC_SECRET_KEY` and concurrent Sales-document-readiness work whose mocks do
  not implement `salesOrders.findUnique`.
- `bun run test` in `packages/observability`: **4 pass, 0 fail**.
- `bun run test` in `packages/errors`: **19 pass, 0 fail**.
- `bun run lint`: stops on existing repository-wide Biome formatting debt in
  packages such as Events and Dev Logger. The only changed source file passes
  a direct Biome check after scoped formatting.
- `git diff --check`: pass.
- Root production build ran with the repository's local environment loader.
  DB generation and the Web client/server build passed before Turbo stopped on
  an unrelated Storefront browser import of `@prisma/client` through
  `packages/sales/src/payment-system/infrastructure/canonical-mirror.ts`.
  The affected Dashboard production build was then run directly and passed:
  optimized compilation, post-compile hook, page-data collection, and 31/31
  static pages. The isolated worktree cannot load `../../local-infra-kit` or
  its main-checkout `.env.local` by itself, so the registered main checkout's
  local environment loader was injected without targeting a hosted service.

These failures are release baselines, not exemptions for feature failures: all
affected Status-only suites and typecheck scopes are green.

## Local database safety

All database commands resolved to local fingerprint
`mysql://127.0.0.1:3307/gnd-prisma2#identity=4813494d`.

- `bun run db:generate`: pass; Prisma Client 6.19.2 generated.
- `bun run db:migrate`: pass; already in sync with no pending migration.
- `bun run db:push`: pass; database already in sync.
- Migration contract tests confirm no historical ledger backfill and no
  `SalesOrders`, `SalesStat`, `QtyControl`, production, dispatch, or inventory
  mutation.

No Preview or Production database command ran, and no reset, data-loss flag,
manual SQL, or sync command was used.

## Authenticated runtime and browser proof

The shared local dashboard was authenticated as **Pablo Cruz** and loaded the
Sales list successfully after regenerating the local Prisma client. The account
has the governed view/edit capabilities, so runtime proof exercised the
authorized path; unauthorized and view-only role variants are directly covered
by API/UI tests because no separate authenticated local sessions were
available.

### Fulfillment — order `09541AD` (`salesOrderId=26854`)

- Full workflow was selected by default.
- Status-only warned that delivery proof, inventory, dispatch, shipment, tax,
  accounting, notifications, commissions, payouts, and integrations are
  skipped; it also displayed the recent-order warning and optional effective
  date.
- Submission returned `Fulfillment completed — status only` with explicit
  administrative-only copy. The operational row remained `Ready to fulfill`.
- The action changed to `Cancel Fulfillment status only` and displayed Pablo
  Cruz provenance with unknown effective date.
- The exact temporary record `cmtj7biss00019kty2av6x3vl` was cancelled through
  the same domain command with its expected revision and Ticket 07 cleanup
  reason. Final state is `CANCELLED`, disposition `PENDING`, operational
  Fulfillment `false`, operational Production `true`.

### Production — order `09535DB` (`salesOrderId=26821`)

- Full workflow was selected by default.
- Status-only warned that inventory, accounting, notifications, commission,
  payout, dispatch, and integrations are skipped; it also displayed the
  recent-order warning and optional effective date.
- Submission returned `Production completed — status only`. The operational
  row remained `Awaiting production`.
- The action changed to `Cancel Production status only` and displayed Pablo
  Cruz provenance with unknown effective date.
- The exact temporary record `cmtj7fxc500039ktycz3do5yi` was cancelled through
  the same domain command with its expected revision and Ticket 07 cleanup
  reason. Final state is `CANCELLED`, disposition `PENDING`, operational
  Production `false`, operational Fulfillment `false`.

Both cleanups preserve cancellation audit history and invoke no operational
reversal. Browser cancellation stopped at the destructive confirmation gate;
the exact scoped cleanup used the package-owned command instead of bypassing
that confirmation policy.

## Documentation impact

The release updates the feature status, plan, task ledgers, progress, API and
permission verification notes, database migration verification, handoff,
review, and this release report. ADR-081 remains current: exhaustive
verification confirms its authority boundary and requires no decision change.

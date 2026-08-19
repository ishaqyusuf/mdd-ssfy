# Handoff Ticket: Fix Quote To Invoice Runtime Timeout

## Status
Completed

## Source Plan
`.brain/plans/2026-08-19-bug-fix-quote-to-invoice-runtime-timeout.md`

## Assigned Agent
- Agent: `gpt-5.6-sol`
- Why: Production timeout diagnosis must cross transaction performance, durable post-commit work, target-load fan-out, and duplicate-invoice safety.

## Priority
Critical

## Review Unit
- Type: task
- Linked Task: Fix Quote To Invoice Runtime Timeout
- Depends On: None
- Approval Boundary: Review and land this ticket independently after production-shaped validation.

## Goal
Make Quote -> Create Invoice complete with headroom under the 15-second Vercel limit and guarantee one target invoice across timeout, retry, and double-click scenarios.

## Read First
- `.brain/plans/2026-08-19-bug-fix-quote-to-invoice-runtime-timeout.md`
- `.brain/features/sales-history-snapshots.md`
- `.brain/system/architecture.md`
- `apps/dashboard/src/components/sales-menu.tsx`
- `apps/api/src/db/queries/sales-actions.ts`
- `packages/sales/src/copy-sales.ts`

## Implementation Route
1. Correlate and time the mutation and newly opened invoice load separately; identify the exact timing stage/function before optimizing.
2. Add small/large copy fixtures, rollback tests, and retry/double-click idempotency tests.
3. Narrow the source projection and reduce transaction round trips without changing copied commercial semantics.
4. Move non-critical post-commit work behind a durable, observable dispatch boundary.
5. Return/recover one committed target identity for retries and concurrent clicks.
6. Optimize target first-load fan-out only if measurements prove it participates in the timeout.
7. Validate against production-shaped data and audit duplicates/orphans/child parity.

## Acceptance Criteria
- Largest validated quote completes below 15 seconds with documented headroom.
- Copy parity and transaction rollback tests pass.
- Timeout/retry/double-click yields one invoice.
- Inventory/activity follow-up is durable and observable without blocking response.
- Opened invoice renders without a delayed runtime error.
- Errors carry a correlated failed stage and do not misreport a committed invoice.

## Do Not Change
- Do not solve this only by raising a timeout.
- Do not fire-and-forget inventory/activity work without durable delivery.
- Do not weaken transaction atomicity or copied commercial fields.
- Do not treat the 81ms Redis GET as root cause without timing evidence.
- Do not move the linked task to done; review owns final closure.

## Required Checks
- `bun test packages/sales/src/copy-sales.test.ts`
- Focused API action/idempotency and large-fixture budget tests.
- `bun run --filter @gnd/sales typecheck`
- `bun run --filter @gnd/api typecheck`
- `bun run --filter @gnd/dashboard typecheck`
- Preview/production smoke with correlated logs and duplicate/orphan audit.

## Brain Update Contract
After implementation, create/update the matching `.brain/bugs/` record, update `.brain/features/sales-history-snapshots.md` if shared copy behavior changes, update `.brain/api/contracts.md` if the mutation contract changes, and update `.brain/progress.md`. Add an ADR only for a durable architecture decision.

## Completion Report
- Root cause: the synchronous path loaded the full Sales graph and had no
  source-to-target retry lookup. Stage-level timing was skipped, so no narrower
  production bottleneck is claimed.
- Fix: use a copy-specific projection, serialize on the quote row, persist and
  reuse the source-to-target identity, and isolate durable note/inventory
  follow-up failures from the successful copy result.
- Checks: focused copy, retry-idempotency, and concurrency tests pass;
  `@gnd/sales` typecheck passes.
- Production-shaped evidence: not claimed.
- Unresolved issues: broad API typecheck retains two unrelated baseline errors;
  dashboard typecheck did not complete in the bounded validation window.
- Skipped acceptance criteria: production timing and browser proof, by request.

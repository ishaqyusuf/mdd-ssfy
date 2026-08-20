# Plan: Quote To Invoice Runtime Timeout

## Type
Bug Fix

## Status
Done

## Created Date
2026-08-19

## Last Updated
2026-08-20

## Recommended Codex Agent
- Agent: `gpt-5.6-sol`
- Reason: This production-only revenue-path timeout crosses transaction performance, post-copy work, first-load behavior, Vercel limits, and duplicate-invoice safety.

## Goal Or Problem
Make Quote -> Create Invoice complete within the production runtime budget and open the new invoice reliably without duplicate invoices or a delayed error boundary.

## Current Context
- `SalesMenu.move()` uses `sales.copySale` for quote conversion, then awaits dashboard-side reset/invalidation work before showing the open action.
- `copySale()` loads the author, calls `copySales()`, waits for an inventory sync enqueue, and writes an activity note.
- `copySalesInTransaction()` loads `SalesIncludeAll`, creates the order, then creates each line concurrently inside one transaction with nested step/HPT/door writes.
- The reported log reaches a Vercel 15-second timeout. The nearby Redis `sales-filter-options` GET took only 81ms and is timing context, not sufficient evidence of root cause.
- The UI reportedly opens/loads before failing, so the copy mutation and the newly opened invoice load must be timed separately.

## Proposed Approach
Instrument and reproduce the exact two-phase path before optimizing. Establish which Vercel function times out, then minimize the synchronous critical path: select only copied fields, use bounded/bulk child writes where relational semantics allow, and move non-critical post-commit work to durable background dispatch. Add an idempotency/recovery contract so a client retry after a committed timeout returns the same target invoice instead of creating another.

## Implementation Steps
1. Reproduce with the failing quote or a production-shaped fixture and capture quote item/step/HPT/door counts, the failing deployment/function, request ID, and timestamps for click, copy response, navigation, form shell, primary record query, filter queries, and error boundary.
2. Add structured stage timing around author lookup, source graph load, slug generation, parent create, child writes, transaction commit, inventory-sync enqueue, note creation, dashboard reset/invalidation, and target invoice load. Do not log customer/order payloads.
3. Add integration/performance fixtures for a small quote and a large nested quote. Pin query count, completion budget, copied commercial fields, and rollback behavior.
4. Narrow the source query from `SalesIncludeAll` to the exact copy projection. Replace per-item round trips with safe nested/bulk writes or bounded batches while preserving item-to-HPT/door/form-step relationships and transaction atomicity.
5. Keep only target identity and required commercial writes on the request critical path. Dispatch inventory projection sync and non-critical activity/document warming durably after commit without losing observability or retryability.
6. Add a conversion idempotency key/source reference. A retry after the target order committed must resolve the existing target; concurrent clicks must not create two active invoices.
7. Separate mutation completion from target-load UI. Disable repeat clicks while pending, navigate only after committed identity is returned, and surface an actionable correlated error without claiming failure when the invoice already exists.
8. Verify whether target form first-load fan-out independently exceeds the budget. If so, keep the route shell fast and defer/filter secondary queries rather than widening the timeout as the primary fix.
9. Validate on production-shaped data and confirm no orphan order, duplicate invoice, missing child rows, or partial copy can result from timeout/retry.

## Affected Files Or Areas
- `apps/dashboard/src/components/sales-menu.tsx`
- `apps/api/src/db/queries/sales-actions.ts`
- `apps/api/src/trpc/routers/sales.route.ts`
- `packages/sales/src/copy-sales.ts`
- `packages/sales/src/copy-sales.test.ts`
- `packages/sales/src/sales-inventory-sync-job.ts`
- Target new-sales-form load/query path in `apps/dashboard/src/components/forms/new-sales-form/` and `apps/api/src/db/queries/new-sales-form.ts` only if timing proves it is part of the failure
- Existing observability/task diagnostics helpers; do not invent a parallel logging system.

## Acceptance Criteria
- Create Invoice returns and opens within the 15-second production budget with documented headroom on the largest validated quote.
- Small and nested quotes copy all required commercial rows and metadata exactly once.
- A timeout/retry or double-click yields one active target invoice and returns its identity.
- Non-critical inventory/activity work is durable, observable, and does not hold the response open.
- The target invoice shell and primary record render without a delayed runtime timeout.
- Errors identify the failed stage/request and never report a committed invoice as wholly failed.

## Test Plan
- `bun test packages/sales/src/copy-sales.test.ts`
- Add focused `sales-actions` integration/idempotency tests.
- Production-shaped large-copy performance fixture with an explicit budget below 15 seconds.
- `bun run --filter @gnd/sales typecheck`
- `bun run --filter @gnd/api typecheck`
- `bun run --filter @gnd/dashboard typecheck`
- Preview/production smoke with correlated logs and a post-run duplicate/orphan audit.

## Brain Update Requirements
- Create/update a bug memory under `.brain/bugs/` with measured root cause and prevention.
- Update `.brain/features/sales-history-snapshots.md` if `copySales` behavior changes broadly.
- Update `.brain/api/contracts.md` if idempotency/request shape changes and `.brain/progress.md` after implementation.
- Add an ADR only if a durable cross-domain async/idempotency boundary is introduced.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Report measured root cause, before/after stage timings, changed files, checks run, production-shaped evidence, Brain docs updated, unresolved issues, and skipped criteria.

## Risks / Edge Cases
- The server may commit before Vercel terminates the response; retry safety is mandatory.
- Unbounded `Promise.all` inside a transaction can exhaust connections or extend lock time on large quotes.
- Moving work async without durable dispatch can trade timeout failures for silent missing inventory/activity work.

## Open Questions
- The exact failing production quote/order number is not in the intake. Use correlated production evidence or a representative high-cardinality fixture; do not block initial instrumentation on that identifier.

## Linked Task
- Task Title: Fix Quote To Invoice Runtime Timeout
- Task File: `.brain/tasks/backlog.md`

## 2026-08-20 Runtime Follow-Up

- Measured the remaining local critical path: the idempotent copy transaction
  took 31ms while awaited inventory task dispatch took 2.53s.
- Deferred inventory dispatch and copy-note creation through Vercel
  `waitUntil`; history/job callers retain the default awaited `copySales`
  behavior unless they explicitly provide a post-commit scheduler.
- Dashboard confirmation now precedes its concurrent status reset and query
  refresh waits.
- Authenticated local browser evidence improved from 1.53s API / 2.12s
  click-to-confirmation to 127ms API / 521ms click-to-confirmation on a new
  4-item, 9-door conversion. Retry reused the existing target and confirmed in
  421ms.

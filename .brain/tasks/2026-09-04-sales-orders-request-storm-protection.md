# Task: Sales Orders Request-Storm Protection

## Status

In Progress

## Priority

High

## Created Date

2026-09-04

## Last Updated

2026-09-04

## Global Ticket

- Ticket Position: 1/1

## Source Context

Continue Step 4 of
[Vercel Function Cost Reduction And Trigger Offload](../plans/2026-08-21-feature-vercel-function-cost-reduction-and-trigger-offload.md):
stop duplicate/eager `sales.getOrders` pagination, align server/client query
inputs, and cancel superseded Sales Orders list and summary requests before the
read-model rollout advances.

The pre-agreed behavior seams are the exported infinite-scroll request gate and
sentinel decision, the normalized Sales Orders list-query input, and the
Sales Orders search/filter cancellation boundary.

## Implementation Progress

- Completion: 86%
- Current Checklist: 7/7 — Complete authenticated browser QA, then commit and record final evidence
- Blockers: Browser/UI validation requires explicit approval before starting or
  reusing the local Dashboard server and authenticated browser.

## Implementation Checklist

- [x] Inspect the active Sales Orders query, hydration, search, and pagination paths
- [x] Guard pagination with a user-scroll sentinel and cursor-level in-flight lock
- [x] Normalize server/client list inputs and cancel superseded list/summary requests
- [x] Add focused regression coverage for request gating and query-key parity
- [x] Run focused tests and the Dashboard typecheck
- [x] Complete standards and specification review and resolve findings
- [ ] Update Brain documentation, commit the scoped implementation, and record evidence

## Validation Evidence

- Focused request-control tests: 23 passed, 0 failed, 65 assertions. The suite
  includes a real TanStack QueryClient check proving one list and one summary
  execution under duplicate initial fetches plus AbortSignal cancellation of
  both before transition.
- Final relevant Sales Orders suite: 44 passed, 0 failed, 139 assertions.
- Focused Biome check: 19 files clean; `git diff --check` passes.
- Dashboard typecheck required an 8 GB Node 22 retry after the default 4 GB
  process exhausted its heap. The retry completed with the repository's broad
  existing diagnostics; the filtered touched-path scan has no new application
  implementation diagnostic. It reports only the unchanged Sales Orders
  filter-list baseline and repository-wide Bun matcher typing gaps in tests.
- Final specification review found zero findings. Final standards review found
  zero hard code violations; its two non-blocking judgement calls were brittle
  source-wiring assertions and a query-key hash memoization opportunity. The
  hash is now memoized, while behavioral QueryClient coverage backs the source
  wiring checks.

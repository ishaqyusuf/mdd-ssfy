# Scoped physical receipt from Production

Status: Accepted for the current implementation.
Date: 2026-09-08

## Context
Production users need a compact way to receive inbound material for assigned work.
Embedding the administrative material-review queue duplicated order context and
made review, receipt and production progress difficult to distinguish.

## Decision
- Production shows inbound reference/supplier and Open inbound / Mark as received.
  Other material operations stay in Inventory or the standalone review workspace.
- Workers use an explicit default-off Sales policy and a dedicated API. Resolve
  active assignment/door scope and policy again inside the receipt transaction.
  Existing general Inventory and Production permissions remain separate.
- Use physical receiving plus scoped Needs allocation in one Serializable
  transaction. Validate existing pending allocations against exact variant,
  component requirement and available stock before confirmation. Reject ambiguous,
  damaged, cross-order shared-item or oversized shortcut operations.
- Reuse cumulative receipt guards, request UUID audit/replay and inventory
  primitives. Refresh projections from the post-receipt canonical pipeline evidence
  revision and require successful persistence in the same transaction; publish
  both inventory and pipeline query events before completing UI feedback.
- Receipt alone does not approve existing production submissions or payroll.
  New submissions retain the existing fresh-material approval policy.
- Compute final uncovered Needs after all allocations, once per component, so
  split demands do not inflate the reported remainder.
- Production progress and material readiness remain distinct. A reported or
  finalized submission supersedes Material Ready. Missing commercial metadata
  does not replace a known, current Production stage with Status unavailable.

## Validation and consequences
Five rollback-only local MySQL scenarios exercise canonical stock receipt,
allocation, audit, projection refresh and replay. Domain/API/component tests
cover policy, scope, capacity, navigation, visibility and query invalidation.
Nine additional tests use committed, disposable local fixtures and the command's
real transactions: rejection rolls back its own writes, and independent concurrent
requests with identical or different keys apply stock once. They assert persisted
audit contents and projection revision and remove their fixtures afterward.
They also verify enabled-worker scope, worker/admin and shared-stock races,
authorization revalidation and unchanged existing production records. Policy reads
and locks use private fixture Settings rows; interactive policy remains unchanged.
Authenticated admin browser receipt with automatic refresh also passes.
The shortcut is bounded; complex receipts remain administrative Inventory work.
No schema migration, historical backfill or automatic approval of old reviews.

The user requested retained receipt/cancellation and separate primary/secondary
attention presentation afterward. Those are queued in
[the follow-up ticket](../tasks/2026-09-08-production-receipt-follow-up-and-cancel-review.md)
and must explicitly define reversal and review-finalization semantics.

## Related decisions

- [ADR-039](ADR-039-nonblocking-production-submission-material-review.md): existing submission review boundary.
- [ADR-063](ADR-063-guarded-worker-production-reporting-and-separate-packing-review.md): worker reporting and packing separation.
- [ADR-071](ADR-071-reversible-inbound-needs-application.md): Inventory Needs application ownership.
- [ADR-075](ADR-075-authorized-on-behalf-production-submission-approval.md): authorized submission approval.
- [ADR-084](ADR-084-canonical-sales-pipeline-lifecycle-authority.md): canonical lifecycle authority.

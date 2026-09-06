# ADR: Treat Unresolved Sales Reconciliation as Informational Cleanup

## Status

Accepted

## Context

The canonical Sales Pipeline can deterministically repair derived projection
drift, but some historical and current orders lack reconstructable operational
proof or contain contradictory legacy lifecycle facts. Requiring every such
record to reach zero conflict blocks forward rollout and encourages fabricated
Production, Dispatch, inventory, or delivery evidence. The fresh local audit
compared 8,172 orders, accepted 7,500, and retained 672 non-reconstructable
exceptions after 497 safe administrative resolutions.

## Decision

Unresolved reconciliation exceptions are a reported, filterable operator
cleanup population, not a canonical cutover failure. Cutover continues to fail
for stale projections, unexplained workspace membership, unacceptable latency,
or missing operator approval. Known legacy-versus-canonical transitions and
incomplete conflict sampling are informational.

Reconciliation automation may repair deterministic derived state only. It must
not fabricate operational facts. Authorized Sales users may deliberately mark
an exceptional Production or Fulfillment milestone through the existing
status-only command. Known supported cross-stage conflicts remain in the audit
payload as information and do not reject that user decision. Unknown future
conflict codes, cancelled orders, coherent wrong-stage actions, missing
permission/reason, and stale revisions continue to fail closed.

## Alternatives

- Require zero unsafe transitions before cutover. Rejected because ambiguous
  legacy evidence cannot be reconstructed safely and would indefinitely block
  current operations.
- Bulk-force every unresolved record to completed. Rejected because it would
  manufacture business truth and remove individual accountability.
- Exempt only pre-2026 orders. Rejected as the sole rule because 547 of the 672
  current exceptions are from 2026 and should still be reportable without
  blocking forward operation.

## Consequences

- Canonical rollout can proceed once projection integrity, membership parity,
  latency, approval, and live-cohort gates pass.
- Reports explicitly show accepted and informational-exception counts.
- Sales representatives and administrators can clean up records through
  revision-bound, reasoned, idempotent, audited status-only actions.
- Conflict evidence remains available even when an administrative completion
  controls the headline.
- The remaining exception count is operational debt to monitor, but not a
  release blocker.

## Implementation Notes

- `evaluateSalesPipelineCutoverGates` returns reconciliation reporting but does
  not fail on unsafe-transition count or conflict-sample completeness.
- The cutover CLI emits `sales-pipeline-cutover-gate/v2` with compared,
  accepted, and informational-exception counts.
- Administrative status-only policy accepts only the existing known lifecycle
  exception codes across dimensions and preserves all of them in immutable
  audit history.
- No database schema change or automatic Production data migration is required.

# Decision: Separate table activity from query membership

- Date: 2026-09-08
- Status: Implementation checkpoint; authenticated pilot acceptance pending
- Scope: Dashboard shared table infrastructure, Sales Orders first consumer

## Context

An action can remove a sale from a filtered table before an operator understands
its outcome. Delaying invalidation or inserting snapshots into the query cache
would make summaries, pagination and action payloads stale.

## Decision

Use an opt-in client activity ledger keyed by owner, table, entity and operation.
Store only identity, phase, labels and timing globally. Each mounted table owns
snapshots of already-loaded rows and a scope key covering its query and saved view.
A generic hook composes temporary display rows without changing server data.
Domain adapters interpret payment and task results; shared table code does not.

Capture synchronously before the request. Settle business outcomes before existing
refresh callbacks. A successful same-scope network refetch may prove departure;
manual cache updates and incomplete windows cannot. Server exhaustion can shorten
a complete infinite refetch. Retention expires independently of animation events,
with a bounded lifetime, and navigation never transfers snapshots between views.

Keep query-event ownership unchanged under ADR-013. The existing task monitor
remains the durable job owner; local and monitor callbacks settle the same run
idempotently. Cancellation settles neutral feedback and releases caller state.
Selections and operation payloads use authoritative rows, with successful captured
UUIDs removed by functional selection updates even when no longer displayed.

## Consequences

Other tables may adopt the hook and optional row presentation, but must supply
explicit outcome adapters and stable identities. Row feedback adds no polling,
cache membership mutations, database fields or API contract changes. Cross-table
rollout and further Sales actions remain subject to the pilot acceptance gate.

See [implementation task](../tasks/2026-09-08-table-row-processing-exit-feedback.md)
for evidence and [plan](../plans/2026-08-06-ux-ui-table-row-processing-exit-feedback.md)
for the remaining acceptance requirements.

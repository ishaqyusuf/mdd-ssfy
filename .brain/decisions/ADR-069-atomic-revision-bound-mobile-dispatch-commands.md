# ADR: Atomic Revision-Bound Mobile Dispatch Commands

## Status

Accepted

## Context

Expo previously sequenced legacy packing, inventory preparation, status edits,
and notifications as separate client operations. Mixed fulfillment could
partially commit, client status checks could drift from current permissions and
readiness, and a retry could duplicate work or apply against a changed
manifest.

## Decision

- Mobile packing and reset use protected, dispatch-scoped commands with a
  request id and expected manifest revision.
- The server locks the dispatch and commits compatibility packing rows,
  inventory reserve/pick/release transitions, guarded-review records, and the
  resulting lifecycle in one serializable database transaction.
- A bounded fingerprint history in `OrderDelivery.meta.mobilePackingCommands`
  makes byte-equivalent retries idempotent and rejects request-id reuse with
  different content. This compatibility metadata does not require a schema
  migration.
- Notifications run after commit and report delivery failure separately from
  command success.
- Expo renders server-projected capabilities and blockers. Assigned drivers do
  not receive generic status editing, cancellation, or picked-stock release.
- A server and Expo environment flag can disable mobile packing writes without
  reintroducing the former partial-write sequence.

## Alternatives

- Keep client-sequenced legacy and inventory mutations. Rejected because a
  later failure can leave half of a visible packing action committed.
- Make the new route a thin wrapper over the existing independent mutations.
  Rejected because it would not provide one lock, rollback boundary, or
  idempotency record.
- Create a new command table immediately. Deferred because the bounded dispatch
  metadata record supplies the required retry contract without a schema
  rollout; a table remains appropriate if audit/search retention grows.

## Consequences

- Packing correctness has one server authority and mixed execution is
  all-or-nothing.
- Stale clients must refresh and reconfirm instead of silently overwriting
  current work.
- Notification outages cannot make a committed operation look rolled back.
- The transaction is deliberately broader and must retain dispatch locking,
  bounded work, and focused rollback/concurrency tests.
- Older clients can keep read/proof-safe behavior while mobile packing writes
  are disabled, but must not fall back to split mutations.

## Implementation Notes

- Command orchestration lives in
  `apps/api/src/db/queries/dispatch-packing-command.ts` and is exposed as
  `dispatch.confirmPacking` and `dispatch.resetPacking`.
- `dispatch.startTrip` is the narrow server-owned start command; completion
  remains `dispatch.completeDispatchWithProof`.
- Expo consumes these routes through typed dispatch hooks and central query
  invalidation while preserving the existing screen layout.

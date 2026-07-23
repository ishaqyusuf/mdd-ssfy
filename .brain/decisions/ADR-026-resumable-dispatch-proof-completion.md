# ADR-026: Resumable Dispatch Proof Completion

- Status: Accepted
- Date: 2026-07-23

## Context

Expo previously uploaded every dispatch photo and the signature from the
client, optionally packed pickups through a separate task, and only then
started `update-sales-control`. A network interruption could leave stored proof
without completion, duplicate proof on retry, or completion state that the
worker saw as failed.

## Decision

Dispatch proof completion is one protected, dispatch-id-bound API operation.
The server validates ownership/capability, uploads proof under deterministic
request-scoped names, and persists each successful path in
`OrderDelivery.meta.dispatchCompletion`. Final completion carries the same
request id into the canonical sales-control transaction.

Each staged-proof checkpoint claims and updates the current request inside a
short serializable database transaction. A request that loses ownership to a
new completion attempt stops instead of overwriting that attempt's staged
paths.

The finalizer treats the same completed request as an idempotent replay and a
different request as a conflict. Pickup packing is server-orchestrated in the
same operation. The mobile form retains its request id and proof until success.

## Consequences

- Retry resumes staged proof and does not duplicate completion notes or payment
  review.
- Completion author identity comes from the authenticated server context.
- Generic unbound dispatch proof upload is no longer an API capability.
- Blob storage and MySQL remain separate systems; staging plus deterministic
  overwrite and idempotent finalization replace an impossible cross-system
  transaction.
- `OrderDelivery.meta` gains a documented completion-attempt contract without a
  schema migration.
- Migration of proof into canonical `StoredDocument` rows remains separate
  follow-up work.

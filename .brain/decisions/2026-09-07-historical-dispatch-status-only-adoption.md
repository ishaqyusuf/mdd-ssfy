# Historical completed Dispatch adoption

## Status
Accepted — explicit user decision, 2026-09-07.

## Decision
Every non-deleted completed Dispatch whose `meta.dispatchCompletion.status` is not `completed` is treated as a historical shortcut completion. Missing item quantities or old action/job metadata do not disqualify a record. The migration records one audited STATUS_ONLY FULFILLMENT_COMPLETED ledger entry per order, preserving known deliveredAt as effective time; unknown historical dates and actors remain explicitly unknown.

This specifically amends ADR-081's prohibition on broad legacy status inference for this historical import. It does not weaken ordinary interactive lifecycle/proof checks. The user expressly approved the classification and subsequently approved the reviewed 912-order local apply.

Existing active completions are retained. Cancelled/deleted orders, later dispatch reopenings/cancellations, and later (or undated) completion cancellations remain held. Earlier dated cancellations do not veto a demonstrably later completed dispatch. Completed proof with missing inventory alone is outside this rule.

## Authority and effects
The migration owns dedicated serializable transactions; unrelated Production conflicts do not reject the explicit historical Fulfillment decision. Only the completion ledger, two linked Sales History audit events, and derived list projection are written. Dispatch/packing/proof/inventory/payment/tax facts are not invented or updated. Original dispatch rows and canonical conflict evidence remain present. Marked as completed describes administrative satisfaction, not operational delivery proof.

## Execution
Root `.env.local` or `.env.production` owns the connection; inherited DATABASE_URL cannot select it. Local refuses non-loopback targets. A target-bound preview manifest fixes order ids, source hashes, lifecycle/completion revisions, source dispatch ids and optional effective dates. Apply requires an authorized audit actor and explicit target fingerprint. Apply transactions check source/revisions again for every new row and atomically write completion ledgers plus paired audits for up to 20 approved orders. Any stale candidate rejects the entire group. Recovery remains transactional per order. Full derived projection refresh runs after commit to respect PlanetScale’s 20-second transaction cap; a ledger_committed checkpoint and replay repair cover interruptions before refresh. Durable per-order journal plus deterministic request IDs allow restart after interruption. Groups execute sequentially to avoid SERIALIZABLE gap-lock contention; bulk evidence reads remove per-order graph-query overhead. Derived refresh and verify reads are batched. A serialized journal preserves durable checkpoint order. Failures stop new work and repair committed projections before exiting; earlier independent successes remain.

Production requires a separate preview and explicit user confirmation of that population after local verification. The fingerprint is the CLI confirmation mechanism; the operator must not treat merely knowing it as user authorization.

## Recovery
Recovery accepts the original manifest, finds only the ledger records owned by that manifest's deterministic request IDs, and cancels those records with immutable history. It never deletes business records, revokes another action's completion, or reverses operational activity. Later operational changes are preserved; recovery hashes the current source and verifies it stays unchanged during cancellation. Later user cancellations are reported distinctly from successful migration recovery.

# 05 — Restore Guarded Production-Only Reporting

**What to build:** Let an authenticated production-only worker report physically completed quantity against their own active assignment even when material administration is unresolved. The report must enter the existing production material-review authority rather than becoming finalized work or being discarded.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Production-only actors can submit positive remaining quantity only for their server-derived identity and active assignment scope.
- [x] Configured unavailable, unresolved, awaiting-inbound, awaiting-allocation, not-configured, and temporarily unavailable evidence follow the existing material-review policy instead of a worker-specific hard rejection.
- [x] Ready evidence may auto-approve through the existing review authority; unresolved or unavailable evidence creates a durable pending review with a bounded evidence snapshot.
- [x] Idempotent retries return the existing review and cannot duplicate reported quantity under concurrency.
- [x] Pending quantity counts as reported for assignment progress and duplicate prevention but remains excluded from finalized production, payroll, packing, dispatch, fulfillment, completion, and completion-dependent payment review.
- [x] The worker interface clearly distinguishes pending review from finalized work and does not expose admin-only inventory-resolution controls.
- [x] Recheck and approval read fresh exact-scope evidence and invoke only canonical inbound receipt, manual fulfillment, configuration exception, or production-review authority already permitted to the approving actor.
- [x] Rejection releases pending reported quantity without modifying inventory; stale scope or evidence revisions require re-evaluation rather than time-based approval.
- [x] Existing production admin and supervisor submission behavior remains compatible, and ordinary assignment and review permissions remain server-enforced.
- [x] A new accepted ADR explicitly supersedes ADR-062, retains ADR-035 and ADR-039 where compatible, and records the separate packing pending-report boundary required by the next slice.
- [x] Submission policy, service, decision, permission, idempotency, downstream projection, worker UI, and authenticated operational tests replace the worker-hard-block expectation with guarded pending-review behavior.
- [x] The completed slice proves an authorized reviewer can resolve evidence and approve a worker report without fabricating material truth.

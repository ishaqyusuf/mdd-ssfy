# 06 — Add Guarded Packing Reports

**What to build:** Let an authenticated packing actor preserve physically verified packed quantity when stale upstream administration blocks the normal command. Store it as a packing-specific pending report that authorized reviewers can approve or reject without pretending the order is packed, loaded, dispatched, or fulfilled.

**Blocked by:** 05 — Restore Guarded Production-Only Reporting.

**Status:** completed

- [x] Packing-specific report and review persistence records actor, dispatch allocation and item, exact quantity, manifest or evidence revision, idempotency identity, reviewer, decision, and lifecycle timestamps.
- [x] Only a server-authorized packing actor can report positive remaining quantity for their current allocation and dispatch scope.
- [x] Pending reporting is available only for physically verified quantity blocked by stale or unresolved upstream evidence.
- [x] A genuine physical shortage remains in the existing Dispatch Exception or shortage workflow and cannot be submitted as packed quantity.
- [x] Idempotent retries return the existing report; over-reporting, stale allocation, stale manifest revision, duplicate quantity, and concurrent packing changes are rejected or re-evaluated safely.
- [x] Pending reports are visible as awaiting review but do not change canonical Packed Quantity or authorize loading, trip start, dispatch readiness, fulfillment, or completion.
- [x] Production and packing retain separate domain commands and downstream effects while sharing only review-envelope invariants established by the preceding slice.
- [x] Approval re-reads fresh scope and evidence, then uses canonical packing authority to finalize only the accepted quantity.
- [x] Rejection voids pending reported quantity without modifying inventory, production, or canonical packing truth.
- [x] Review capability is assignment- or role-scoped; session identity replaces any caller-supplied packing actor or reviewer scope.
- [x] The packing and review interfaces clearly distinguish physically verified pending quantity, finalized Packed Quantity, and genuine shortage handling.
- [x] Persistence, permission, command, idempotency, stale-revision, downstream-hold, approval, rejection, concurrency, UI, and authenticated operational tests pass.
- [x] The implementation remains consistent with the ADR introduced by Ticket 05 and updates it only if implementation evidence requires a clarified durable decision.

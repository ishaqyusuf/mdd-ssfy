# 03 — Surface Production Handoff Actions

**What to build:** Extend the representative Sales Orders alert with Production Handoff Actions for payment-qualified production-capable quantity that has not been assigned to an owner. The action must open the exact production assignment workflow and resolve only from authoritative assignment or completed-production evidence.

**Blocked by:** 02 — Surface Material Handoff Actions.

**Status:** completed

- [x] The shared Sales Handoff projection derives Production actions at quantity grain from required production-capable quantity, active owned assignments, attributable completed work, revisions, and lifecycle state.
- [x] Partial assignment and active unowned quantity remain actionable; multiple worker assignments aggregate without double counting.
- [x] Cancelled, deleted, superseded, stale-revision, and unrelated assignments do not satisfy the action.
- [x] Completed owned assignment or finalized attributable submission evidence continues to cover its quantity after assignment closure.
- [x] An order revision opens a new epoch only for new or changed uncovered quantity and does not reopen unchanged completed work.
- [x] Material availability, inbound receipt, and Material Handoff Action state never determine whether Production is assigned.
- [x] Production and Material actions for the same order retain independent stable identities, epochs, resolution, and reopening behavior.
- [x] Relevant order, production requirement, assignment, ownership, revision, submission, review, and cancellation mutations reconcile only the affected current truth.
- [x] Sales Orders displays `#ORDERID — Production` pills alongside Material pills with distinct restrained semantics and the same representative scope, bounded loading, accessibility, and invalidation behavior.
- [x] A Production pill opens the affected Sales Overview production item or assignment surface through the canonical query-state builder, repeats ordinary authorization, and restores focus on close.
- [x] Projection, epoch, API, permission, alert integration, deep-link, revision, and authenticated browser tests cover full, partial, split-worker, unowned, completed, superseded, and material-independent behavior.
- [x] The completed slice never auto-assigns a worker or grants production mutation authority through the alert.

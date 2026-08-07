# 02 — Atomic mixed inventory and legacy dispatch packing

**What to build:** Give warehouse operators one confirmation operation for a
dispatch containing both inventory-backed and legacy lines. The operation must
preflight the complete selection and either commit all compatible packing and
inventory effects or leave the dispatch unchanged with an actionable reason.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] One protected packing operation accepts the complete dispatch selection
      while preserving each line's inventory, legacy, or review-required mode.
- [ ] Permission, active-dispatch state, manifest revision, selected quantity,
      legacy eligibility, inventory availability, and cross-dispatch ownership
      are validated before durable writes.
- [ ] Inventory-only and legacy-only dispatches continue to work through the
      same operator-facing confirmation behavior.
- [ ] A mixed dispatch with sufficient inventory commits exact reserve/pick
      effects and shipment compatibility quantities together.
- [ ] A shortage, stale revision, invalid legacy line, excess quantity, or
      cross-dispatch allocation leaves both execution modes unchanged.
- [ ] Repeating the same successful request returns the same outcome without
      duplicate packing rows, allocation splits, reservations, or picks.
- [ ] The mobile UI sends one request, reports one outcome, refreshes the exact
      queue/manifest/readiness queries, and never presents partial success as
      complete.
- [ ] Packed, target, and remaining quantities retain distinct meanings before
      and after confirmation.
- [ ] Transaction and operator-flow tests prove successful mixed packing,
      all-or-nothing failure, concurrency behavior, and idempotent retry.


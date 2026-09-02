# 01 — Ship Reversible Single-Order Sales Order Archiving

**What to build:** Deliver the complete reversible archive journey for one
Sales Order. An authorized sales user can archive an order from the ordinary
Sales Orders workspace, see it disappear from the default working set, find it
through `Show > Archived`, and restore it without changing any commercial or
operational lifecycle fact. The list, summary, Sales Bin, direct-order, audit,
and guarded legacy/projected read behaviors remain coherent throughout the
journey.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Existing Sales Orders remain non-archived after the nullable archive state and supporting list index are migrated.
- [ ] The default Sales Orders list and summary include non-deleted, non-archived orders and apply that scope before counting, sorting, and pagination.
- [ ] `Show > Archived` returns only non-deleted Archived Sales Orders and composes independently with search, sorting, Special Order, and the other canonical Sales Orders filters.
- [ ] Sales Bin remains deletion-only and returns deleted orders independently of their archive timestamp.
- [ ] A user with `editOrders` can archive one non-deleted order after confirmation; a user without that capability cannot see or execute the command.
- [ ] Archiving a non-terminal order displays an explicit warning that operational work continues, without blocking the archive command.
- [ ] An authorized user can restore one order from the Archived view and observe it leave that view and return to the default scope.
- [ ] Archive and restore are idempotent set-state operations that return structured changed or skipped outcomes for stale, missing, deleted, already-archived, and already-active targets.
- [ ] Every successful archive or restore writes attributable Sales History evidence atomically with the state change; audit failure rolls back the change.
- [ ] Direct Sales Overview and edit access continue to resolve archived orders, and purpose-built production, inventory, dispatch, fulfillment, and accounting queues do not gain an implicit archive filter.
- [ ] Legacy reads, payment-review fallback, and guarded projected candidate selection enforce the same default, Archived, and Bin scopes without requiring archive data in the compact projection payload.
- [ ] Successful commands publish the established Sales Order invalidation event so current list, summary, saved-tab, and detail caches refresh without duplicate feedback.
- [ ] Focused schema, command, query-contract, permission, audit, filter, row-action, and projected-read parity tests pass.
- [ ] An authenticated browser smoke proves archive, default disappearance, Archived discovery, restore, default return, accessible controls, and no new console errors.


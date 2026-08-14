# 02 — Super Admin Policy And Sales Settings

**What to build:** Give Super Admin one global Special Order section in Sales settings where policy wording can be drafted, previewed, and published as immutable versions, approval-link lifetime can be configured, and the active enforcement mode can be selected.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] Sales settings expose a dedicated Special Order section only to Super Admin users.
- [x] Super Admin can edit a draft, preview the customer-facing acknowledgment, and publish an immutable policy version.
- [x] Publication preserves prior policy versions and exact wording for historical and already-issued approval evidence.
- [x] Publishing new wording affects newly issued Approval Revisions but does not invalidate Current Approvals or mutate active issued requests.
- [x] Approval-link lifetime accepts values from 1 through 30 days and defaults to seven days.
- [x] Enforcement mode supports Warning Only, Block Purchasing & Production, and Block All Operations, with Warning Only as the launch default.
- [x] Settings changes become authoritative immediately for governed active orders while preserving unrelated Sales settings.
- [x] The initial published policy reflects the approved special/custom, non-returnable, non-refundable, and complete-order-review statement.
- [x] Unauthorized reads and writes fail through the existing permission contract rather than relying only on hidden UI controls.
- [x] Behavioral tests cover publishing, version history, bounds, default values, permissions, preservation of unrelated settings, and existing-approval compatibility.

## Implementation progress (2026-08-13)

- Implemented in the Super Admin Sales settings UI and protected settings API with immutable policy-version persistence.
- Completed acceptance includes settings permission and policy-version compatibility coverage.
- 2026-08-14 addendum: settings include the `SUPER_ADMIN_ONLY | ALL_STAFF` enrollment audience, defaulting to the Super Admin pilot without changing enforcement on existing marked orders.

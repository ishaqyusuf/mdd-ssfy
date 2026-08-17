# 01 — Enroll Special Orders From Sales Overview

**What to build:** Let an eligible employee classify an existing Sales Order as
a Special Order from Sales Overview through the same server-owned enrollment,
customer-email, reason, revision, history, activity, and release-audience rules
used by the Sales Form. Completing enrollment must leave approval delivery as a
separate deliberate action.

**Blocked by:** None — can start immediately.

**Status:** implementation complete; authenticated browser proof pending

- [x] Sales Overview offers Mark as Special Order only for orders not currently declared Yes and only when the authenticated employee has `editOrders` plus effective enrollment-audience access.
- [x] The protected enrollment command reloads the order, employee authority, live audience, canonical customer, declaration, prior evidence, and customer-visible projection before writing.
- [x] Missing customer email opens the canonical repair flow; success resumes enrollment exactly once, while cancellation or failed repair leaves the order unchanged.
- [x] Enrollment requires confirmation and a bounded reason, initializes the current Approval Revision, moves the order to Signature Pending, and preserves prior requests and evidence as history.
- [x] Enrollment records actor-attributed Sales Activity, refreshes affected document snapshots, and invalidates the focused overview, list, history, and document reads.
- [x] Enrollment never issues or emails an approval request; the existing state-aware send action remains separate.
- [x] Re-enrollment after prior removal produces the same valid governed state without restoring superseded approval evidence.
- [ ] Focused domain/API/UI tests cover both enrollment audiences, eligible and ineligible actors, missing-email continuation, cancellation, reason validation, re-enrollment, activity, invalidation, and protected-command denial.
- [ ] Authenticated browser proof demonstrates the complete Sales Overview enrollment path without sending a real customer email.

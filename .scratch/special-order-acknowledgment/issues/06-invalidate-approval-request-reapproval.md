# 06 — Invalidate Approval And Request Reapproval

**What to build:** Keep approval bound to what the customer actually reviewed. Customer-visible changes and deliberate staff reapproval supersede prior evidence, revoke stale links, preserve history, and provide a state-aware way to deliver the current request.

**Blocked by:** 04 — Approve With Acknowledgment And Signature; 05 — Decline And Handle Terminal Approval Links.

**Status:** in-progress

- [x] Saving a governed customer-visible change computes a new Approval Revision, revokes prior active capabilities, preserves prior evidence as Superseded Approval, and produces Reapproval Required when customer evidence existed.
- [x] Internal notes, operational status, activity, signature metadata, and presentation-only changes do not invalidate approval.
- [x] Automatic invalidation records actor-attributed Sales Activity but does not automatically email during iterative edits or autosave.
- [x] Customer Approved exposes Request Re-Approval; Reapproval Required exposes Send Re-Approval Request; Customer Declined exposes Send Revised Request.
- [x] Manual Request Re-Approval requires confirmation and a bounded reason, immediately supersedes Current Approval, records Sales Activity, and attempts delivery for the current revision.
- [x] A failed reapproval delivery leaves the order Reapproval Required, records failed ledger evidence, and exposes a retry action rather than restoring prior approval.
- [x] A revised request after decline snapshots the current revision and policy and never turns the declined evidence back into Current Approval.
- [x] Repeated actions and retries are idempotent and reuse the active current-revision capability where allowed.
- [x] Approval history clearly distinguishes Current Approval, decline evidence, automatic invalidation, manual reapproval, and Superseded Approvals.
- [x] Behavioral and browser tests cover governed/non-governed changes, manual reapproval, revised request after decline, revocation, delivery failure, retry, and history.

## Implementation progress (2026-08-13)

- Revision canonicalization, automatic invalidation, manual reapproval, retry, and history presentation are implemented with focused domain/API tests.
- Live browser QA proved the `Request Re-Approval` dropdown action, required reason, immediate supersession, revised request, decline, and preserved approval history.
- Remaining: complete the customer-visible edit/automatic-invalidation browser sequence.

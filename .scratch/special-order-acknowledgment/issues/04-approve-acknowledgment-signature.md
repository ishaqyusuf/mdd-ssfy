# 04 — Approve With Acknowledgment And Signature

**What to build:** Let the holder of a valid approval link affirm the policy, provide a printed name and drawn signature, and create immutable Current Approval for the exact Approval Revision, with completion evidence visible to the customer and staff.

**Blocked by:** 03 — Send An Approval Request And Review The Order Publicly.

**Status:** complete

- [x] Approval requires the acknowledgment checkbox, a non-empty bounded printed name, and a valid bounded drawn signature.
- [x] Signature input works with pointer and touch interaction and produces the supported canonical private document format.
- [x] Raw signature data is never retained in general Sales metadata or exposed through production and packing projections.
- [x] The approval command transactionally validates capability hash, expiry, active status, current revision, policy context, and prior consumption.
- [x] One successful transaction creates immutable approval evidence, consumes the capability, updates Current Approval and Customer Approved state, and records Sales Activity.
- [x] Evidence preserves the complete customer-visible order snapshot, exact policy wording/version, printed name, private signature reference, relevant identity snapshots, and server timestamp.
- [x] The public result states that approval is complete without overstating legal identity verification beyond link possession and signer-provided evidence.
- [x] The customer receives a completion email; the assigned salesperson receives email and in-app notification.
- [x] Post-commit notification failure does not roll back approval and remains visible and retryable without duplicating approval or activity.
- [x] Behavioral, concurrency, permission, document-privacy, and browser tests prove one durable Current Approval and the staff-visible state transition.

## Implementation progress (2026-08-13)

- Transactional single-use approval, encrypted private signature storage, protected authenticated retrieval, immutable evidence, and retryable notification delivery are implemented and covered by focused tests.
- Live browser QA recorded a drawn signature, produced one Current Approval, expired mutation access to the link, and retrieved the decrypted PNG only through the protected route; an unauthenticated request returned `401`.
- Complete. The explicit approve-versus-decline race commits one evidence row,
  and live browser QA proved signature capture, protected retrieval, Current
  Approval, and non-reusable capability behavior.

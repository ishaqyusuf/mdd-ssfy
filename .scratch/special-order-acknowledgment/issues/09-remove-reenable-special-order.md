# 09 — Remove And Re-Enable Special Order Classification

**What to build:** Let authorized staff deliberately remove an incorrect Special Order classification without erasing history, notify affected parties appropriately, and allow later re-enrollment as a new governed approval lifecycle.

**Blocked by:** 04 — Approve With Acknowledgment And Signature; 05 — Decline And Handle Terminal Approval Links; 06 — Invalidate Approval And Request Reapproval.

**Status:** complete

- [x] Removing Special Order requires authorization, confirmation, and a non-empty bounded reason.
- [x] Removal revokes active capabilities, clears Current Approval, preserves every request/approval/decline as superseded historical evidence, and produces Not Required.
- [x] Removal records actor, reason, prior state, affected revision, and outcome in idempotent Sales Activity.
- [x] The customer receives a removal email only when a request was delivered or approval/decline evidence exists.
- [x] The assigned salesperson receives the internal removal notification and result evidence.
- [x] Missing customer email or customer-notification failure does not roll back removal and produces a visible skipped or retryable delivery result.
- [x] An order never communicated to the customer is removed without sending a confusing customer notice.
- [x] Re-enabling Special Order requires deliberate confirmation and reason, creates a newly governed Approval Revision, and never restores historical approval automatically.
- [x] Sales Overview state, actions, history, and documents refresh correctly after removal and re-enrollment.
- [x] Behavioral, notification, permission, history, and browser tests cover removal from pending/approved/declined states, skipped delivery, retries, and re-enrollment.

## Implementation progress (2026-08-13)

- Removal/re-enrollment transactions, conditional customer notification, staff notification, retry evidence, and preserved history are implemented.
- Live browser QA proved removal from Customer Declined, required reason, Not Required state, preserved approved/declined evidence, and removal notification history.
- Final acceptance completed pending/approved removal and post-removal re-enrollment browser cases.

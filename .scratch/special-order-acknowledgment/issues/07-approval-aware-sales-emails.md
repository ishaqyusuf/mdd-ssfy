# 07 — Make Sales Emails Approval-Aware

**What to build:** Make every eligible direct Sales Order document email, resend, and reminder automatically include the correct revision-bound approval action when Current Approval is missing, while suppressing it when approval is current.

**Blocked by:** 04 — Approve With Acknowledgment And Signature; 05 — Decline And Handle Terminal Approval Links; 06 — Invalidate Approval And Request Reapproval.

**Status:** complete

- [x] Direct internal Sales Order document emails automatically append an approval action for Signature Pending, Customer Declined, and Reapproval Required orders.
- [x] Customer Approved orders whose Current Approval matches the current revision omit the approval action from future eligible emails.
- [x] Resends and order reminders resolve current server state instead of trusting a caller-provided link or historical email payload.
- [x] An unchanged revision reuses its active unexpired capability; an expired request receives a replacement; a stale or revoked request is never reactivated.
- [x] A message containing multiple orders renders one independent action for every pending Special Order and none for ordinary or currently approved orders.
- [x] Payment receipts, statements, and unrelated operational messages do not acquire Special Order approval actions.
- [x] If any mandatory approval capability cannot be generated, the eligible Sales email sends nothing, fails visibly, and records failed delivery evidence.
- [x] Retry reconstructs the message from current order state and cannot restore an obsolete approval action after approval, decline revision, removal, or reapproval.
- [x] Email and activity writes deduplicate across retries while preserving an auditable delivery history.
- [x] Behavioral rendering and delivery-ledger tests cover presence, suppression, reuse, replacement, multi-order composition, fail-closed behavior, and server-side retry resolution.

## Implementation progress (2026-08-13)

- Server-side capability resolution, CTA composition/suppression, fail-closed sending, and durable delivery attempts are implemented.
- Complete. Rendering tests cover presence, suppression, and independent
  multi-order actions; capability tests cover reuse/replacement/fail-closed
  behavior, and Sales-document delivery now marks every embedded approval
  request delivered for removal/retry decisions.

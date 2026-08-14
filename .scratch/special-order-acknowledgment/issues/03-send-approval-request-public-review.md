# 03 — Send An Approval Request And Review The Order Publicly

**What to build:** Let staff send an order-specific approval request from Sales Overview and let the recipient securely review the exact customer-visible Approval Revision and published policy without signing in.

**Blocked by:** 01 — Special Order Declaration And Lifecycle Foundation; 02 — Super Admin Policy And Sales Settings.

**Status:** complete

- [x] Signature Pending exposes a state-aware Send or Resend Approval Request action to authorized staff.
- [x] Issuing a request snapshots the canonical customer-visible order projection and exact applicable policy version.
- [x] The Approval Revision changes for customer, line, specification, quantity, pricing, discount, tax, or total changes but remains stable for internal-only and presentation-only changes.
- [x] The system creates a high-entropy order-and-revision capability, stores only its cryptographic hash, and permits at most one active unexpired capability for that revision.
- [x] Repeated requests for the unchanged revision reuse the active capability; a request after expiry creates a replacement.
- [x] The customer receives a clear order-specific email and the delivery attempt is represented in the existing Sales email ledger.
- [x] The public link requires no login and renders the complete customer-visible order, totals, and exact policy while revealing no private staff-only information.
- [x] Invalid capabilities reveal no order details, and expired capabilities direct the customer to obtain a current request.
- [x] Request creation, delivery result, resend, expiry replacement, and relevant failures create idempotent operational evidence and Sales Activity.
- [x] Behavioral and responsive browser tests prove the pending-order-to-email-to-public-review path on desktop and mobile layouts.

## Implementation progress (2026-08-13)

- Focused capability, public-review, response, and delivery tests are passing; immutable request snapshots and hashed capabilities are implemented.
- Live browser QA proved request issuance, complete public order/policy review, invalid-address delivery evidence, and a consumed-link receipt on desktop.
- The latest review also proved customer/salesperson identity, order date,
  address slots, item specifications, subtotal, discount, tax, total, and exact
  policy in the immutable public snapshot. The final acceptance run completed
  the true mobile viewport pass.

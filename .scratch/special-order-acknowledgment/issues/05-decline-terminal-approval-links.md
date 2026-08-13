# 05 — Decline And Handle Terminal Approval Links

**What to build:** Let a customer decline the current Approval Revision with a reason and make invalid, stale, expired, consumed, repeated, and concurrent capability use resolve safely with clear customer and staff outcomes.

**Blocked by:** 03 — Send An Approval Request And Review The Order Publicly.

**Status:** complete

- [x] A valid active request offers a decline action that requires a non-empty bounded reason and does not require a signature.
- [x] One successful decline transaction creates immutable evidence, consumes the capability, changes the order to Customer Declined, and records the supplied reason in Sales Activity.
- [x] The customer receives a decline receipt email; the assigned salesperson receives email and in-app notification with a safe reference to the order and reason.
- [x] A consumed capability can render only a minimal read-only completion receipt and cannot approve, decline, or alter evidence again.
- [x] Concurrent approval or decline submissions resolve to one committed outcome; losing and repeated mutations receive an already-completed result.
- [x] Expired and revision-stale capabilities explain that a current request is required without exposing protected order details.
- [x] Invalid or fabricated capabilities reveal no order, customer, policy, or completion information.
- [x] Notification failures remain retryable and do not roll back the committed decline or duplicate activity.
- [x] Sales Overview exposes Review Decline and the reason only to authorized staff.
- [x] Behavioral, concurrency, security, and browser tests cover approve-versus-decline races, terminal receipts, stale/expired states, and information disclosure.

## Implementation progress (2026-08-13)

- Decline evidence, terminal capability behavior, safe public states, staff review, and durable notification retry are implemented.
- Live browser QA proved the required decline reason, terminal declined receipt, non-reusable link, and staff-visible reason/history.
- Complete. Concurrent approve/decline execution produces one durable outcome;
  focused public-boundary tests cover invalid/stale/expired disclosure and live
  browser QA proved the required reason and terminal declined receipt.

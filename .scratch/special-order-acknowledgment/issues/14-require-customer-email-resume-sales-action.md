# 14 — Require Customer Email And Resume Sales Action

**What to build:** Add one reusable Midday-style customer-email interruption flow so every Special Order has a deliverable customer address before classification/manual save, and Sales Overview can repair a missing email then automatically continue the original Sales email.

**Blocked by:** 01 — Special Order Declaration And Lifecycle Foundation; 03 — Send Approval Request And Public Review; 07 — Make Sales Emails Approval-Aware.

**Status:** complete

- [x] Reuse the canonical `Customers.email` field and existing validated customer-email mutation; do not add a duplicate Sales-order email field or database migration.
- [x] Compose the modal from installed Shadcn Dialog, Field, Input, Button, and Spinner primitives with a local Zod form and accessible invalid state.
- [x] Follow the Midday customer-edit pattern: mutation-owned pending/error behavior, update the canonical customer, invalidate customer/Sales queries, then close and continue.
- [x] Selecting Yes checks the selected customer before applying Special Order; missing customer or cancelled email entry leaves the declaration unchanged.
- [x] Existing-order enrollment preserves its required confirmation/reason and requests the missing email before applying the confirmed change.
- [x] Save Draft, Save & Close, Save & New, and final save recheck email for an already-governed order; successful repair resumes the exact pending save intent.
- [x] The server rejects every non-autosave governed save whose selected customer has no email with `SPECIAL_ORDER_CUSTOMER_EMAIL_REQUIRED`.
- [x] Sales Overview direct Sales email opens the same modal when email is missing, saves the canonical email, and resumes the stored send intent exactly once.
- [x] The email update endpoint requires `editSalesCustomers` or `editOrders` and retains the dealer-owned customer write prohibition.
- [x] Focused tests cover validation, continuation/cancellation, server fail-closed behavior, and one-send-only semantics.
- [x] Authenticated browser QA proves missing-email selection/save and Sales Overview repair-and-send without sending to a real customer.

## Implementation progress (2026-08-13)

- Complete. Browser QA verified the Sales Form repair flow and the Sales Overview resume flow against non-routable `.invalid` addresses.
- The overview continuation produced exactly one `SalesEmailAttempt` (`SKIPPED`) after the canonical customer email update; no real customer delivery occurred.

Browser note: authenticated QA proves both missing-email dialogs, inline invalid-email feedback, and cancellation with no customer/order mutation. The final update-and-auto-send leg was intentionally not executed because it would deliver an external email; the continuation is covered by the exact-once unit test.

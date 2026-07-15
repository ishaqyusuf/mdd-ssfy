# Sales Online Payment Follow-Up Reliability

## Purpose
Prevent online-paid sales from being missed operationally when email delivery is delayed, buried, skipped, or overlooked.

## Current Implementation State
- Local Wayfinder scratch map: `.scratch/sales-online-payment-follow-up/map.md`
- Created from the 2026-07-15 client complaint about online customer payments, missing/buried emails, limited notification bell behavior, and paid orders sitting without inbound/fulfillment action.
- First runtime slice implemented for the `apps/www` notification bell: unread count badge, lazy inbox/archive dropdown, mark-unread-as-read on open, single notification archive, archive all, load-more controls, recipient-scoped status mutations, and domain-specific notification row icons/actions.

## Current System Facts
- Checkout payment settlement already sends staff-side `sales_checkout_success` notifications through the payment-system notification bridge.
- Customer receipt/failure email flows already exist through `sales_customer_payment_received` and `sales_customer_payment_failed`.
- The existing `SalesEmailAttempt` ledger is scoped to sales document emails, so payment receipt email audit/resend semantics still need a decision.
- The web notification center has Inbox/Archive tabs, notification actions, unread count badge, read/archive mutations, and infinite-query load-more behavior backed by `NoteRecipients.status`.
- Inventory-backed sales fulfillment already owns guarded inbound creation/assignment workflows; this effort should surface paid orders that need attention without bypassing those guards.

## Implemented Notification Bell Slice
- `apps/www/src/components/notification-center/notification-center.tsx` now opens as a counted actionable inbox, marks unseen notifications as read on open, lazy-loads archive only when the archive tab is active, and exposes archive-all plus load-more controls.
- `apps/www/src/hooks/use-notifications.ts` now exposes unread count, mark-seen, archive-one, archive-all, and update-pending state on top of the existing notes infinite queries.
- `apps/api/src/trpc/routers/notes.route.ts` exposes protected `updateNotificationStatus` and `updateAllNotificationStatus` mutations that resolve the current user's notification contact server-side.
- `packages/notifications/src/activities.ts` updates `NoteRecipients.status` by current recipient, preventing one user's archive/read action from changing another user's receipt.
- Focused coverage lives in `packages/notifications/src/activities.test.ts`.

## Open Decisions
- Define the online payment acknowledgement and payment receipt email reliability contract.
- Decide whether clicking a notification should archive it automatically or only mark it read/open the target.
- Define a recent-online-paid sales follow-up queue with aging, ownership, routes, and resolved-state rules.
- Decide which post-payment fulfillment/inventory actions are automatic versus staff-confirmed.

## Boundaries
- Do not resume broad inventory repair/backfill work as part of this effort.
- Do not replace the existing sales document email ledger without an explicit data-model decision.
- Do not use email delivery as the only operational signal for paid orders.

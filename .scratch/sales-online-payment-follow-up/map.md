# Wayfinder: Sales Online Payment Follow-Up Reliability

## Local Scratch Tracker

This is a local Wayfinder scratch map because no repo issue-tracker Wayfinder operations were configured for this session.

## Destination

Reach an implementation-ready spec and ticket set that prevents online-paid sales from being missed. The final tickets should make payment success visible in-app, improve the notification bell, add a recent-paid operational follow-up queue, and reduce reliance on customer/staff email delivery as the only signal.

## Notes

- Domain: public sales checkout, payment-system notifications, sales/customer payment receipt emails, in-app notification center, sales orders, inventory-backed inbound demand, and fulfillment follow-up.
- Customer complaint: after customers pay online, customer/staff email can be missed or buried, the notification bell does not show a useful count/list workflow, and staff can miss paid orders for days before creating inbounds or taking fulfillment actions.
- Current checkout settlement already builds `sales_checkout_success` events and sends them to the attached sales rep through `sendPaymentSystemNotifications`.
- Customer receipt/failure email flows exist through `sales_customer_payment_received` and `sales_customer_payment_failed`, but the existing `SalesEmailAttempt` ledger is scoped to sales document emails rather than all payment receipt email outcomes.
- The current web `NotificationCenter` shows a small unread dot on the bell, not a count badge. Its popover has Inbox and Archive tabs, scrollable lists, and payment notification actions that open the sales overview, but archive/read mutation hooks are placeholders and the badge does not quantify pending work.
- The notification feed currently requests `pageSize: 20`, has infinite-query metadata, and exposes `fetchNextPage`, but the web popover does not visibly provide paging/scroll-to-load behavior.
- Inventory fulfillment docs already define inventory-backed inbound demand and create/assign inbound workflows. This effort should not bypass those guards or resume broad inventory repair/backfill work.
- For implementation, follow Brain protocol and the repo order: Schema -> API -> UI -> Validation -> Polish. For Next.js UI work, apply the repo's mandatory React/Next.js UI skill expectations.

## Decisions So Far

- None yet. This map was created from the client complaint and local code/Brain inspection.

## Frontier Tickets

### Define Online Payment Acknowledgement And Email Reliability Contract

- Type: `research`
- Status: Open
- Blocked by: none

#### Question

What should happen every time a customer completes an online payment so that customer receipt delivery and staff acknowledgement are reliable even when email is buried, skipped, delayed, or fails? Decide whether payment receipt emails need their own durable attempt ledger, whether they should extend `SalesEmailAttempt`, whether staff need resend/retry controls, and what customer-facing fallback the checkout page should show after payment.

#### Known Inputs

- Existing `SalesEmailAttempt` tracks sales document emails, not necessarily payment receipt emails.
- `verifyPayment` sends staff `sales_checkout_success` notifications and customer `sales_customer_payment_received` / failure emails after checkout status is confirmed.
- The customer complaint is not only "email failed"; it is that the business did not reliably notice payment completion.

#### Expected Resolution

A payment acknowledgement contract that states the required durable records, retry/resend surfaces, fallback UI copy, owner visibility, and which email outcomes must be auditable in v1.

### Upgrade Notification Bell Into A Counted Actionable Inbox

- Type: `prototype`
- Status: Open
- Blocked by: none

#### Question

What should the notification bell provide beyond the current unread dot and static popover? Decide count badge semantics, unread/read/archive behavior, infinite scroll or load-more behavior, payment notification prioritization, empty/loading/error states, and mobile/desktop sizing for the web notification center.

#### Known Inputs

- `NotificationCenter` currently renders only a dot on the bell even though the hook can derive unread notifications.
- Inbox/archive tabs and scroll areas exist, but archive/read actions are incomplete.
- Payment notification actions already open the sales overview for `sales_checkout_success` and `sales_payment_recorded`.

#### Expected Resolution

A small UI contract or prototype direction for an actionable notification center that can be implemented without re-deciding badge math, scroll behavior, action placement, or payment notification handling.

### Define Recent Online-Paid Sales Follow-Up Queue

- Type: `grilling`
- Status: Open
- Blocked by: none

#### Question

What operational queue should staff use to catch recently paid online sales that still need action? Decide where it lives, which orders qualify, how long they remain visible, what aging/SLA indicators are shown, what actions are available, and how staff resolve or snooze a paid-sale follow-up.

#### Known Inputs

- The client specifically wants "recently paid sales" visible so staff can create inbounds and take other order actions.
- Sales overview already exposes payment status and an Inventory tab with create-inbound workflows.
- A queue should avoid duplicating the inventory/inbound source of truth while still surfacing orders that need human follow-up.

#### Expected Resolution

An operational definition for "recently paid and still needs attention," including first-version placement, filters, owner/role visibility, action routes, and resolved-state rules.

### Decide Payment-To-Fulfillment Automation Boundaries

- Type: `research`
- Status: Open
- Blocked by: Define Recent Online-Paid Sales Follow-Up Queue

#### Question

After an online payment is applied, which fulfillment or inventory actions should happen automatically, and which should remain staff-confirmed from the sales overview or inbound workspace? Decide whether fully paid versus partially paid orders differ, whether inventory sync should be queued, whether inbound demand should only be created manually, and what audit history should be written.

#### Known Inputs

- Checkout payment application updates balances and sends notifications.
- Inventory-backed create/assign inbound workflows are guarded and should not be bypassed.
- Existing inventory work has strong warnings against broad repair/backfill or unsafe mutation without explicit review.

#### Expected Resolution

A clear boundary between automatic post-payment bookkeeping and staff-triggered fulfillment actions, with audit/history expectations and any background job requirements.

### Plan Implementation Slices And Validation Gates

- Type: `task`
- Status: Open
- Blocked by: Define Online Payment Acknowledgement And Email Reliability Contract; Upgrade Notification Bell Into A Counted Actionable Inbox; Define Recent Online-Paid Sales Follow-Up Queue; Decide Payment-To-Fulfillment Automation Boundaries

#### Question

Once the decisions above are made, how should the implementation be sliced into tracer-bullet tickets? Convert the decisions into ordered Schema -> API -> UI -> Validation steps with targeted tests, browser proof, and Brain documentation updates.

#### Expected Resolution

An implementation-ready spec/ticket outline that can be handed to agents without re-litigating notification semantics, email reliability, recent-paid queue rules, or inventory automation boundaries.

## Not Yet Specified

- Whether payment receipt emails should reuse `SalesEmailAttempt`, add a new `SalesPaymentEmailAttempt`, or rely on a broader notification delivery ledger.
- Whether the notification badge count should be unread notifications, unacknowledged payment-critical notifications, or all pending inbox items.
- Whether opening the notification center should mark notifications as read, or whether read/archive should require explicit action.
- Whether a recent-paid queue should live on the Sales Orders V2 page, sales rep dashboard, notification center, `/sales-book/payments`, or a new operations page.
- Exact qualifying rules for recent-paid follow-up: online-only versus all payments, fully paid only versus partial payments, balance threshold, fulfillment/inbound status, cancelled/fulfilled exclusions, and aging window.
- Whether staff acknowledgement should be per payment, per order, per sales rep, or per fulfillment/inbound action.
- Whether reminders/escalations are needed when a paid sale remains unacknowledged after a threshold.
- Whether mobile/Expo should receive the same paid-sale follow-up queue in v1.

## Out Of Scope

- Replacing the inventory-backed fulfillment model or bypassing existing inbound/stock guards.
- Resuming broad inventory repair/backfill work.
- Rebuilding all notification preferences or notification channels.
- Adding webhook-grade email open/read tracking; v1 should focus on app-side delivery attempts and operational visibility.
- Implementing WhatsApp/SMS payment receipt delivery unless a later decision expands the destination.
- Full customer order-tracking portal changes beyond checkout/payment confirmation fallback behavior.

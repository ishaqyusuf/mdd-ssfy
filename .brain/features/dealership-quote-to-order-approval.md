# Dealership Quote-to-Order Approval

## Goal

Dealers create quotes only. When a dealer is ready to proceed, they request that
the quote become an order. Sales reps are notified, one sales rep approves and
owns the order, delivery cost is reviewed before approval, and the dealer then
receives a payment link and order/invoice access.

This feature builds on the package-backed dealership quote form and must not
weaken the existing dealer ownership, dual-pricing, print, payment, or workflow
payload guarantees.

## Current State

- Dealership quote create/edit uses the shared `@gnd/sales/sales-form`
  package path.
- Dealer quote save/reopen, package workflow payload persistence, dealer
  pricing, print/PDF fallbacks, and inventory sync fallbacks are covered by the
  new sales form migration docs and gate.
- Existing code supports direct dealer quote-to-order conversion through
  `dealerPortal.convertQuoteToOrder`.
- The desired product change is to replace dealer-owned direct conversion with
  a sales-rep approval request workflow.
- Browser proof for the package-backed dealership form is still blocked by
  authenticated dealer/internal fixtures. Do not treat this workflow as
  production-ready before the browser QA phases pass.
- Dealer Sales / Dealer Quotes tabs now show dealer-scoped count badges from the
  dashboard query.
- Dealer sales/quote list filters now include delivery option, dealer sales
  profile, and payment state; sales/orders also include invoice status.
- 2026-06-18 implementation pass added dealer-side payment-link creation from
  approved orders, an order overview/payment page, a real dealer dashboard
  summary, and approval-time delivery-cost review/approver ownership stamping.
- 2026-06-18 follow-up pass added payment links to dealer approval emails,
  bounded dealer logo image upload via data URL persistence, and OpenPanel
  progress tracking in the dealer app.
- 2026-06-29 authenticated dealership browser QA proved the dealer-side request
  action on quote `00002DPP`: clicking `Request order` changed the quotes list
  status to `Order requested`, disabled duplicate requests as `Requested`, and
  persisted a pending `DealerSalesRequest` row with `request = make_order` for
  `SalesOrders.id = 23562`. A follow-up fix made dealer quote edit routes use
  order-number slugs (`/quotes/00002DPP/edit`), redirect legacy numeric quote
  ids, keep users on the saved quote after create/update, and persist structured
  shelf line totals from the package summary so item headers and summaries agree.
- 2026-06-29 follow-up added dealership dev-mode price breakdown hovers for
  visible cost/sales price surfaces including component cards, shelf rows, door
  size/HPT unit and line prices, moulding rows, subtotal, invoice grand total,
  sticky sidebar total, and mobile footer total. The hover chain is office cost
  price -> dealer profile sales price with profile name/coefficient -> customer
  profile sales price with profile name/markup percentage, and only renders in
  non-production dealership mode when an office/base cost is available.
- A same-day correction made the hover chain calculation-driven instead of
  trusting stored row `salesPrice` fields, because dealership row `salesPrice`
  can already be customer-facing. Dealer sales price now derives from office
  cost and the dealer profile coefficient, and customer sales price derives from
  that dealer sales price plus the customer profile markup. Quantity line totals
  use rounded unit dealer/customer prices before multiplying so the displayed
  customer total matches quote line rounding.
  Full production readiness is still blocked by missing Door/HPT plus Moulding
  size fixture coverage and final responsive screenshot evidence.

## Scope

In scope:

- Dealer submits an order request from an existing dealer-owned quote.
- Sales reps receive in-app and email notifications for pending dealer order
  requests.
- The first approving sales rep becomes the assigned `SalesOrders.salesRepId`.
- Later clicks by other sales reps show already-worked-on information instead
  of approving again.
- Sales rep reviews the dealer-selected delivery type and adds manual delivery
  cost before approval.
- Dealer receives a payment-link email after approval.
- Dealer can also open the order from the dashboard/orders page and pay there.
- Dealer can print or download dealer/customer invoice PDFs.
- Dealer Sales and Dealer Quotes get top tabs, count badges, and stronger query
  filters.
- Internal sales header gets a pending dealer request count indicator.
- Dealership dashboard metrics become real dealer-scoped analytics.

Out of scope for v1:

- Automated delivery cost calculation. Store enough delivery metadata for a
  future automated delivery-cost system, but keep approval review manual.
- Removing the `www` legacy workflow panel. Follow
  `brain/new-sales-form-legacy-duplication-removal-plan.md`.
- Changing the dealer/customer tax model without a separate tax/accounting
  decision.

## Flow

1. Dealer creates or edits a quote in `apps/dealership`.
2. Dealer clicks `Request order`.
3. System creates or reuses one pending `quote_to_order` request for that quote.
4. Sales reps receive in-app and email notifications.
5. Sales rep opens the request review screen.
6. Sales rep reviews quote details, dealer, customer, selected delivery type,
   line totals, and request age.
7. Sales rep adds delivery cost when required by the selected delivery type.
8. Sales rep approves.
9. Transaction converts the quote to an order once, assigns the approving sales
   rep, stores delivery cost, and stamps request approval metadata.
10. Dealer receives a payment-link email.
11. Dealer can pay from the email link or from the dealer order/dashboard page.
12. Dealer can print/download dealer invoice or customer invoice.

Already-worked behavior:

- If another sales rep opens an approved request, show approving sales rep,
  approval timestamp, resulting order number, and current payment/order status.
- Do not run conversion, sales rep assignment, delivery cost insertion, or email
  dispatch a second time.

## Data Model

Use or extend `DealerSalesRequest` for the approval request lifecycle:

- `request`: use a stable value such as `quote_to_order`.
- `status`: `pending`, `approved`, and optionally `rejected`.
- `salesId`: original dealer quote/order record.
- `approvedById`: approving internal sales rep.
- `meta`: store request/approval details such as selected delivery type,
  delivery cost, approver notes, resulting order id/number, and payment-link
  dispatch state.

Order conversion requirements:

- Preserve existing dealer quote metadata and `meta.newSalesForm.lineItems`.
- Preserve internal and dealer-facing pricing snapshots.
- Assign `salesRepId` to the approving user.
- Persist manual delivery cost as a `SalesExtraCosts` row of type `Delivery`.
- Keep conversion scoped to the active dealer-owned quote.

Invoice address rules:

- Dealer invoice: `ship to` is customer information; `bill to` is dealer
  information.
- Customer invoice: `ship to` and `bill to` are customer information.

## APIs

Dealer portal:

- Add `dealerPortal.requestQuoteOrder`.
- Add `dealerPortal.createPaymentLink` for dealer-owned approved orders with an
  outstanding balance.
- Return request status with dealer quote/order list/detail payloads.
- Prevent duplicate pending requests for the same quote.
- Enforce dealer ownership on every request path.

Internal sales/admin:

- Add pending dealer request count/query.
- Add dealer request review query.
- Add dealer request approval mutation.
- Approval mutation must be transactional and idempotent for already-approved
  requests.

Notifications:

- Add a dealer order request notification type/channel.
- Notify eligible sales reps in app and by email.
- Notification action deep-links to the internal request review surface.
- Dealer payment-link email should reuse existing sales checkout/payment-link
  infrastructure where possible.
- Approval emails include both the dealer order URL and a checkout URL when the
  approved order has an outstanding balance and payment token context can be
  built.

Analytics:

- The dealer app mounts the shared OpenPanel provider and emits a
  `Dealer Program Progress Viewed` event on dealer dashboard, quote, order,
  customer, and settings navigation.

## Dealer UI

Quotes:

- Replace dealer-facing `Convert to order` with `Request order`.
- Show request status: not requested, pending, approved/order created, rejected
  if enabled.
- Disable duplicate request action while pending.

Sales/orders:

- Show approved dealer orders.
- Show payment CTA when amount due remains.
- Show print/download actions for dealer and customer invoice modes.

Top tabs:

- `Dealer Sales` opens the dealer sales/orders page.
- `Dealer Quotes` opens the dealer quotes page.
- Each tab shows a dealer-scoped count badge excluding deleted records.
- Keep pages separate so each page owns its query state.

## Dealer-Facing Query Filters

Keep existing filters:

- `q`
- `customer.name`
- `phone`
- `orderNo`
- `status`

Add shared dealer sales/quote filters:

- `createdFrom` / `createdTo`
- `deliveryOption`: pickup, delivery, ship
- `customerProfileId` or dealer profile
- `amountDue`: due, paid, partial, credit/overpaid if supported

Add sales-only filters:

- `invoiceStatus`: unpaid, partially paid, paid
- `paymentStatus`: no payment, pending checkout, paid
- `deliveryStatus`: not started, queued, in progress, completed

Add quote-only filters:

- `requestStatus`: not requested, pending request, approved, rejected if enabled
- `goodUntil`: valid, expiring soon, expired

## Internal Sales UI

Request review surface:

- Show quote summary, dealer, customer, selected delivery type, line items,
  dealer-facing total, internal total where authorized, and request age.
- Require delivery cost review before approval when applicable.
- Show already-worked state for approved requests.

Sales header indicator:

- Add a top-right sales-module component for pending dealer requests.
- Query returns `pendingCount`, oldest pending request timestamp, and optionally
  latest dealer/customer label for preview.
- Clicking opens request review queue filtered to pending.
- Count updates after request creation and approval.

## Dashboard Analytics

Replace placeholder dealership dashboard metrics with dealer-scoped data:

- open quotes
- pending order requests
- active/approved orders
- unpaid amount due
- paid revenue
- customer count
- recent quotes, orders, and requests

Keep the dashboard summary-first:

- one lightweight summary query for counts/totals
- paginated lists for detail tables
- no full collection loading just to render metric cards

## Validation

Required baseline gate:

```bash
bun run test:new-sales-form-migration
```

Focused tests to add or preserve:

Current 2026-06-18 implementation pass skipped browser testing by user request;
use focused static checks until a separate browser QA pass is requested.

- Dealer can request order from own quote only.
- Dealer cannot request another dealer's quote.
- Duplicate pending request is prevented or returns the existing request.
- First approval converts quote, assigns approving sales rep, adds delivery
  cost, and sends payment-link email.
- Second approval attempt returns already-worked information.
- Dealer payment link works from email and order dashboard.
- Dealer uploaded logo image persists through settings and resolves in dealer
  print branding.
- Dealer program OpenPanel progress event is mounted in the dealership app.
- Dealer invoice address mapping is customer ship-to and dealer bill-to.
- Customer invoice address mapping is customer ship-to and customer bill-to.
- Dealer/customer pricing visibility follows
  `brain/dealer-tax-tracking-client-memo.md`.
- Dealer Sales and Dealer Quotes tab counts are correct.
- Dealer query filters persist through reload/navigation and return correct
  dealer-owned records.
- Pending request header indicator updates after request creation and approval.
- Dashboard analytics render correct empty, loading, and populated states.

## Dependencies

- Finish authenticated dealership browser QA in
  `brain/new-sales-form-phase27-browser-qa.md`.
- Keep `brain/new-sales-form-completion-roadmap.md` phases 27-30 open until
  authenticated dealership and `www` package paths are proven in browser.
- Keep rollback plans available:
  - `brain/dealership-new-sales-form-rollback-plan.md`
  - `brain/www-new-sales-form-rollback-plan.md`

## Follow Up

- Plan automated delivery cost rules after manual review is stable.
- Decide whether request rejection needs full v1 UI or can remain an internal
  admin-only escape hatch.
- Add request SLA/aging analytics once the request queue is in production use.

## Implementation Progress

- 2026-05-23: Added Dealer Sales / Dealer Quotes count badges to the existing
  dealership sales tabs and prefetched dashboard counts on both list pages.
- 2026-05-23: Added dealer list query/filter support for delivery option,
  dealer sales profile, payment state, and order invoice status, with a focused
  dealer-owned list filter regression in `packages/db/src/queries/dealers.test.ts`.

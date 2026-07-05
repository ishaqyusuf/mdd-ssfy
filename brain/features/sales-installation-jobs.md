# Sales Installation Jobs

## Goal

Create a sales-origin installation job workflow for customers who buy materials from GND and also want installation service. The workflow should let the office control the customer experience while giving installers a clear path to accept fixed-price work or bid on open-price installation jobs.

Captured from the July 3, 2026 client discussion:
- Customer may buy materials first, then request installation for those same materials.
- Sales invoice payment should not be delayed by installation pricing.
- Customer pays GND for installation after service.
- GND adds installer payment to the contractor payout/check cycle.
- The system must support both:
  - office-set flat-rate installation jobs
  - open marketplace jobs where eligible installers submit bids

## Product Decisions

- Installation billing is separate from the original sales invoice in v1.
- The customer does not pay the installer directly.
- Customer installation payment happens after service and is paid to GND.
- Installer payment becomes part of the existing contractor payout flow after the job is complete and the customer installation charge is paid.
- Office can optionally set a fixed installer price when posting the job.
- If no fixed installer price is set, the job appears in an installer marketplace.
- Installers can submit bids for marketplace jobs.
- Every submitted bid notifies the sales rep through the notification channel.
- The sales rep can optionally enable customer bid email notifications per sales installation job.
- A public bid page should exist at a route shaped like `/sales/job-biddings/[salesJobUid]`.
- The sales rep can accept one bid. Once accepted, the sales installation job closes and no further bids can win.

## Core Flow

1. Sales rep opens a sales order from Sales Overview.
2. Sales rep posts an installation job from that order.
3. Sales rep selects the installed sales items and quantities, such as 10 doors.
4. Sales rep adds job scope, customer/site details, preferred date, and internal notes.
5. Sales rep chooses pricing mode:
   - Fixed price: set installer pay amount and assign or offer to one installer.
   - Marketplace: leave installer pay open and allow eligible installers to bid.
6. If fixed price:
   - Installer receives a job assignment notification.
   - Installer accepts or declines.
7. If marketplace:
   - Job appears in the installer jobs portal.
   - Installer submits a bid with amount, note, and optional availability.
   - Sales rep receives bid notification.
   - If customer notifications are enabled, customer receives a bid update email with a public bid page link.
8. Sales rep accepts a bid.
9. Accepted bid creates or links the contractor-facing job row.
10. Installer completes the work and submits completion evidence.
11. Office/customer approves completion.
12. Customer pays GND for the installation charge after service.
13. Linked contractor job becomes eligible for the next payout/check run.

## Data Model Direction

Add first-class sales installation records instead of storing the relationship only in `Jobs.meta`.

Expected models:
- `SalesInstallationJob`
  - uid
  - salesOrderId
  - salesRepId
  - customerId
  - status
  - pricingMode: `fixed` or `marketplace`
  - fixedInstallerAmount
  - customerChargeAmount
  - requestedDate
  - scopeNotes
  - customerBidEmailEnabled
  - acceptedBidId
  - assignedInstallerId
  - linkedJobId
  - meta
  - createdAt, updatedAt, deletedAt
- `SalesInstallationJobItem`
  - salesInstallationJobId
  - salesOrderItemId or line/item reference
  - title snapshot
  - quantity
  - unit label
  - meta
- `SalesInstallationBid`
  - salesInstallationJobId
  - installerId
  - amount
  - note
  - availability
  - status: `submitted`, `accepted`, `declined`, `withdrawn`, `expired`
  - createdAt, updatedAt, deletedAt
- `SalesInstallationCustomerCharge`
  - salesInstallationJobId
  - amount
  - status: `pending`, `paid`, `waived`, `cancelled`
  - paidAt
  - payment reference fields
  - recordedById
  - note

Extend existing contractor `Jobs` with a nullable `salesInstallationJobId` relation so accepted/assigned installation work can keep using current contractor job review, completion, deletion guard, payout, print, and notification behavior.

## API And Contract Direction

Add a `salesInstallation` API surface or equivalent package-owned service with protected procedures:
- `salesInstallation.createFromSale`
- `salesInstallation.overview`
- `salesInstallation.listForSale`
- `salesInstallation.marketplace`
- `salesInstallation.submitBid`
- `salesInstallation.withdrawBid`
- `salesInstallation.acceptBid`
- `salesInstallation.declineBid`
- `salesInstallation.assignFixedPrice`
- `salesInstallation.acceptFixedAssignment`
- `salesInstallation.declineFixedAssignment`
- `salesInstallation.submitCompletion`
- `salesInstallation.approveCompletion`
- `salesInstallation.rejectCompletion`
- `salesInstallation.recordCustomerPayment`
- `salesInstallation.publicBidPage`
- `salesInstallation.generateBidPageLink`

Important contract rules:
- Only order records are in scope for v1. Quotes must convert to orders before installation jobs are posted.
- Sales installation job ids in public links should use signed access, not an unprotected uid alone.
- Bid acceptance must be transactional: accept selected bid, close the job, decline other open bids, and create/link the contractor job.
- Bids are blocked after the job is closed, cancelled, expired, or already awarded.
- Payout eligibility for linked contractor jobs is blocked until customer installation payment is recorded as paid or explicitly waived.
- Existing insurance gate behavior should apply to bidding, assignment acceptance, and completion submission.

## UI Direction

Sales web:
- Add an `Install Jobs` tab or clear action in `sales-overview-system`.
- Show installation job status, selected items, pricing mode, accepted installer/bid, customer charge status, and linked contractor job status.
- Provide a post-job form that starts from the current sale and supports selected item quantities.
- Provide a bid review panel with accept/decline and public bid page link actions.
- Provide a customer notification toggle for bid emails.
- Provide a customer payment panel for after-service charge recording.

Contractor web and Expo:
- Show marketplace installation jobs to eligible installers.
- Show fixed-price assignments separately from open bidding jobs.
- Let installers bid, revise/withdraw active bids where allowed, accept fixed assignments, and submit completion.
- Keep customer direct contact details hidden until assignment/bid acceptance unless a later product decision changes this.

Public bid page:
- Route shape: `/sales/job-biddings/[salesJobUid]`.
- Sales/internal view can show full bid and installer details.
- Customer/public view should show customer-safe bid information and avoid exposing installer private contact details by default.
- Expired or invalid signed access should render a clear unavailable state.

## Notifications

Add notification channels/templates:
- `sales_installation_job_posted`
- `sales_installation_bid_submitted`
- `sales_installation_bid_accepted`
- `sales_installation_fixed_assignment`
- `sales_installation_completion_submitted`
- `sales_installation_customer_payment_recorded`

Notification behavior:
- Sales rep always receives bid submitted notifications.
- Customer receives bid submitted notifications only when enabled for the sales installation job.
- Installer receives accepted-bid, fixed-assignment, rejected/declined, and completion/payment lifecycle updates.
- Notification activities should be written so the Sales Overview activity history can show the install workflow timeline.

## Payment And Payout Rules

- The original material sales invoice remains separate.
- Installation charge is tracked separately against the sales installation job.
- Customer payment can be recorded after service.
- Linked contractor job should not appear as ready-to-pay until:
  - installer work is completed/submitted
  - completion is approved
  - customer installation charge is paid or waived
- Existing contractor payout batches should include these jobs once eligible.
- Contractor payout print/reporting should show the sales installation scope and selected item snapshots.

## Budget Guidance

Planning rate: `$50/hour`.

Estimated implementation ranges:
- Fixed-price installation jobs MVP: `120-180 hours`, approximately `$6,000-$9,000`.
- Installer marketplace bidding: `160-280 hours`, approximately `$8,000-$14,000`.
- Customer bid emails, public bid page, and post-service customer payment tracking: `160-240 hours`, approximately `$8,000-$12,000`.
- Complete v1 with fixed-price jobs, marketplace bidding, customer notification controls, public bid page, completion approval, customer payment gating, and contractor payout integration: `440-700 hours`, approximately `$22,000-$35,000`.

Client-facing recommendation:
- Position the first usable release around `$15,000` when scope is constrained to the highest-value operational flow.
- Position the complete version around `$25,000-$30,000` if the client wants the full fixed-price plus marketplace bidding workflow.
- Treat these as planning ranges until a final implementation plan locks exact v1 scope, payment-link behavior, customer approval rights, and mobile completion evidence.

## Open Questions

- Should the customer bid page allow the customer to approve a bid, or should it be view-only in v1?
- Should office set the customer-facing installation charge before service, after service, or when accepting a bid?
- Should fixed-price assignments be offered to one installer only, or can a fixed-price job be visible to a claim pool?
- Should installer bids include proposed schedule/date windows in v1?
- Should customer payment use an online checkout link immediately after completion approval, or only manual payment recording first?

## Implementation Notes

- Reuse current contractor job and payout infrastructure where possible:
  - `Jobs`
  - `JobPayments`
  - contractor job overview
  - job notifications
  - contractor payout dashboard/portal
  - contractor payout print reports
- Do not model installer marketplace behavior by exposing raw customer details to all installers.
- Do not push installation cost into the existing sales invoice by default.
- Keep the sales overview route shell thin and use on-demand queries for bid details and payment history.
- Use the existing signed-token/public route patterns for public bid page access.

## Test Scenarios

- Sales rep posts a fixed-price installation job from an order.
- Installer receives fixed assignment and accepts it.
- Sales rep posts a marketplace installation job with no fixed price.
- Installer submits a bid.
- Sales rep receives bid notification.
- Customer receives bid email only when enabled.
- Public bid page opens with a valid signed link and rejects expired/invalid access.
- Sales rep accepts one bid and the job closes.
- Other bids cannot be accepted after closure.
- Accepted bid creates or links the contractor job.
- Installer completion submission updates sales installation job state.
- Customer installation payment recording releases the linked job into contractor payout eligibility.
- Unpaid customer installation charge blocks contractor payout readiness.
- Contractor payout report shows installation scope and selected item snapshots.

## Brain Status

- Captured as future feature scope on 2026-07-04.
- No runtime code, schema, API, permission, or UI changes have been made yet.
- Before implementation, create a detailed plan under `brain/plans/` and update API/database docs as schema/contracts land.

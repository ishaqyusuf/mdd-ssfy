# Wayfinder: Dealership Program Expansion and Recruitment

## Local Scratch Tracker

This map and its child tickets use the repository's local Markdown tracker.

## Destination

Deliver a production-ready dealership expansion in which dealer-origin documents
carry reliable dealer branding, dealer customers remain private unless
explicitly shared, office fulfillment receives an immutable direct-ship
recipient, and eligible GND customers can move from a targeted sales-email
campaign through application, approval, password setup, and managed dealer
lifecycle.

## Notes

- Domain: dealership settings, dealer-owned customers, sales documents,
  fulfillment, sales email, recruitment campaigns, applications, onboarding,
  notifications, and dealer account status.
- Preserve explicit customer/internal dealer pricing surfaces and dealer
  ownership boundaries.
- One recruitment campaign may be globally active at a time.
- Any pending, approved, or denied application suppresses future recruitment
  banners until Super Admin explicitly resets eligibility.
- Incentives, commissions, dealer fees, tax-policy changes, SMS/WhatsApp, and
  automated delivery pricing are outside this effort.
- Follow Brain protocol and implement Schema -> API -> UI -> Validation ->
  Polish. React/Next.js work must follow the repository's Midday and frontend
  engineering standards.

## Decisions so far

- Dealer customers are private by default and shared per customer.
- Shared dealer customers are read/process-only in the office.
- Submitted delivery/ship orders expose an immutable recipient snapshot to
  authorized fulfillment staff regardless of directory visibility.
- Campaigns are reusable and sequential, with one globally active campaign.
- Campaign content uses a structured editor rather than arbitrary HTML.
- Eligible channels are standard/composed quote and invoice emails plus payment
  reminders.
- The application page is read-only and requires consent plus one request
  action.
- Lifecycle notifications use customer/dealer email and Super Admin in-app plus
  email alerts.
- Suspension blocks the dealer portal while office fulfillment continues.
- Campaign analytics use a basic sent/open/application/decision funnel without
  tracking pixels or device fingerprinting.

## Tickets

1. [Harden dealer-origin invoice branding](issues/01-harden-dealer-origin-invoice-branding.md)
2. [Make dealer customers private by default with explicit sharing](issues/02-private-dealer-customers-with-explicit-sharing.md)
3. [Carry a direct-ship customer snapshot into office fulfillment](issues/03-direct-ship-customer-snapshot.md)
4. [Create the Super Admin recruitment campaign workspace](issues/04-recruitment-campaign-workspace.md)
5. [Run the standard sales-email recruitment funnel end to end](issues/05-standard-sales-email-recruitment-funnel.md)
6. [Extend recruitment banners to composed emails and reminders](issues/06-expand-recruitment-email-channels.md)
7. [Approve or deny applications and activate dealers](issues/07-application-review-and-dealer-activation.md)
8. [Suspend and reactivate dealer accounts](issues/08-dealer-suspension-and-reactivation.md)
9. [Prove the complete dealership-program launch path](issues/09-dealership-program-launch-proof.md)

## Not yet specified

- Incentive, fee, commission, and accounting policy for dealer-assisted direct
  shipment.
- A future general-purpose announcement platform beyond dealership recruitment.
- SMS or WhatsApp recruitment and lifecycle delivery.

## Out of scope

- Replacing the existing dealership quote-to-order approval workflow.
- Reworking dealer/customer tax or dual-pricing policy.
- Automated delivery-cost calculation.
- Allowing office staff to edit or directly market to dealer-owned customers.
- Invasive email open pixels, device fingerprinting, or cross-campaign ad
  attribution.

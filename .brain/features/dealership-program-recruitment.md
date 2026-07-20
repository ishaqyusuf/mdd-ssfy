# Dealership Program Recruitment and Customer Privacy

## Goal

Recruit eligible office customers through personalized sales-email banners,
approve them into the existing dealer portal, and manage dealer access without
weakening dealer-customer privacy or fulfillment continuity.

## Behavior

- Dealer branding includes company name, logo, phone, address, and ZIP.
  Branding saves increment a version and dealer update time participates in
  print-cache freshness for dealership- and office-initiated prints.
- Dealer customers default to `PRIVATE`. Dealers share one customer at a time
  from the customer table; office surfaces identify the owner and remain
  read-only.
- Delivery/ship requests capture an immutable name, email, phone, address, and
  ZIP recipient snapshot used by office fulfillment.
- Super Admins manage structured campaigns, placement, dates, all-eligible or
  union profile/customer audiences, lifecycle, preview, and funnel summaries.
- The shared send-time resolver covers standard/composed sales documents and
  payment reminders. It excludes dealer-owned customers, dealers, recipient
  mismatches, deleted/ineligible customers, and non-reset applications.
- Personalized links use a random token stored only as a SHA-256 hash. They
  expire after 30 days, reject inactive campaigns, display customer data
  read-only, require consent, and submit idempotently.
- Submission acknowledges the applicant and alerts active Super Admins by
  email/in-app note. Notification failure does not roll back a saved request.
- Review is idempotent. Approval creates/reuses the dealer/onboarding token and
  sends password-only setup; denial accepts an optional note; explicit reset
  permits later recruitment.
- Suspension/reactivation is Super Admin-only, accepts an optional reason,
  records history, sends email, and uses the active-dealer guard for lockout.

## Validation and Rollout

- Focused suite: 70 passing tests / 178 assertions.
- `@gnd/db` and `@gnd/email` typechecks pass; filtered task-file checks are
  clean.
- Browser QA covered the Super Admin workspace, audiences/applications/access
  tabs, dealer settings ZIP, and seeded dealer portal shell.
- Apply the Prisma schema and restart services before final database-backed
  customer sharing and public-token browser proof, then execute Wayfinder ticket
  9 before activating a campaign.

# ADR: Storefront custom millwork inquiry workflow

- Date: 2026-07-22
- Status: Accepted

## Context

Custom millwork needs more discovery than a standard catalog checkout. Customers
must share scope and private reference material while the office must preserve
its existing customer, Sales quote, authorization, and audit boundaries.

## Decision

Use `StorefrontInquiry` as the intake aggregate and add an append-only activity
timeline. Customer submission is a two-phase draft/finalize flow so private
Vercel Blob files can be scoped, verified, and registered before the inquiry is
visible to office staff. Office users triage the brief, link the canonical
customer, and explicitly create one Draft through the existing Sales form save
path. Quote creation requires both storefront-order edit permission and the
canonical Sales `editOrders` permission.

Private attachments use a dedicated token when configured, are never exposed by
the public API, and stream through an authenticated office route. Notifications
run after commit and record outcomes without rolling back customer submission.
Unsubmitted drafts and their blob prefixes expire after 24 hours.

## Consequences

- Custom work remains a review workflow, not an alternate order system.
- The Sales quote and downstream production/payment behavior stay canonical.
- Guests can submit securely without receiving a customer portal or two-way
  messaging surface.
- File delivery depends on private Vercel Blob support and the dedicated
  production token.
- The legacy customer/Sales links are application-enforced; unique quote linkage,
  a conversion lease, activity, and audit records constrain duplicate work.

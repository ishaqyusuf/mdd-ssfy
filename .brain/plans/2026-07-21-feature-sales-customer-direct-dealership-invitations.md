# Sales Customer Direct Dealership Invitations

## Status

Implemented — 2026-07-22

## Goal

Let office users understand each Sales Customer's dealership-partnership state
while reserving manual invitation and controlled-resend authority for Super
Admin. Manual invitations reuse the active recruitment campaign and the
existing secure application, suppression, approval, onboarding, and dealer
lifecycle flows.

## Delivered Scope

- Added a shared `DealerPartnershipSummary` to paginated Sales Customers and
  Customer Overview. State precedence is dealer account, application, latest
  invitation, then current eligibility.
- Added the resizable `Partnership` table column and Customer Overview
  partnership card. All authenticated office users see status; only summaries
  returned to Super Admin expose enabled Invite/Resend actions.
- Added `dealerProgram.sendCustomerInvitation({ customerId })` with a strict
  Super Admin guard, active in-window campaign requirement, direct office
  customer/email/dealer/application checks, and campaign audience bypass.
- Added manual-vs-banner source, provider-attempt delivery state, sender,
  sanitized failure, revocation, and supersession evidence to recruitment
  invitations.
- Added per-customer leases to reject concurrent sends and permit stale pending
  recovery. Sent/opened invitations require 24 hours before resend; failed,
  skipped, expired, and inactive-campaign attempts can be replaced immediately.
- Added the dedicated campaign-styled invitation email. Raw 30-day tokens are
  returned only in the outbound URL and remain hash-only in storage.
- Successful resend supersedes older unused links. Failed replacement links are
  revoked without invalidating an older usable link.
- Sales-email banner deliveries now populate the same provider-result delivery
  contract.

## Data and Migration

- Prisma schema: `packages/db/src/schema/dealer-program.prisma` plus customer
  and user relations.
- Generated additive SQL:
  `packages/db/src/migrations/20260722150000_dealer_customer_direct_partnership_invitations/migration.sql`.
- Existing rows default to `SALES_EMAIL_BANNER`; rows with historical
  `deliveredAt` are backfilled to `SENT` with the same attempt timestamp.
- Local `migrate dev` refused pre-existing broad migration drift and no reset
  was accepted. The generated additive SQL was applied directly to local
  `gnd-prisma2`; `prisma db push` and a live-schema diff then reported the
  schema in sync. Migration-history reconciliation remains a deployment task.

## Validation

- Focused domain tests cover status precedence, resend timing, hash-only token
  storage, successful supersession, failed replacement preservation, and the
  concurrent-send lease.
- API authorization tests cover Super Admin acceptance and Sales Team
  `FORBIDDEN` behavior.
- Email snapshot/render coverage checks campaign content and secure CTA.
- Sales Customers source parity checks the column, row-click isolation, and
  Customer Overview card.
- Prisma Client generation, `@gnd/db` typecheck, local schema apply, database
  model smoke, and live-schema diff pass.

## Deferred V1 Items

- No bulk invitation action, partnership filter/sort, campaign picker, SMS, or
  WhatsApp.
- Provider acceptance means `SENT`; it is not described as inbox delivery.
- Full browser QA with a real provider-delivered email remains a release proof,
  not a contract change.

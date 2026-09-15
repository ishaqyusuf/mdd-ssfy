# Employee Mobile Access

## Purpose

Provide authenticated employees with a safe request surface for Android or iOS
account access and give Super Admins an auditable manual review/guidance
workflow. The iOS binary's planned public App Store availability is separate
from permission to sign in and use company data.

## Employee behavior

- Support > Mobile App is available to active employee roles.
- `mobileAccess.myRequests` returns only the authenticated employee's records
  and omits internal notes, invitation provider, and external portal reference.
- A requester must be an active, non-revoked employee with an active role
  assignment to an active referenced role and organization; a deleted role
  assignment or deleted organization cannot authorize requests. Explicit
  `CUSTOMER` accounts are excluded even
  if they have a role assignment; legacy null-type staff remain eligible only
  through the same active-role check used by existing mobile authentication.
- `mobileAccess.request` creates or reopens the employee/platform record. An
  active non-terminal request is idempotently returned instead of duplicated.
- Android downloads require either Super Admin or an Android request in
  `INVITED`, `ACCEPTED`, or `INSTALLED`. The endpoint no longer accepts a
  caller-provided download URL or filename. It also requires an active
  employee/manager or legacy null-type account with an active role and
  organization assignment; an explicit customer, deleted-only role, or
  deleted-organization assignment cannot use the Super Admin bypass or a
  historical request status to retrieve the APK.
- The Android APK endpoint recognizes Super Admin only from an active role
  assignment whose referenced role is also active; a soft-deleted role name
  does not bypass the request-status gate.
- The UI never asks for Apple passwords, one-time codes, or credentials.

Public availability of the iOS binary also makes the existing mobile password
route reachable by non-employees. Production custom web/mobile sign-in routes
now consume distributed, hashed IP/account attempt quotas before legacy-user
lookup; a limited request returns 429 and an unavailable protection service
returns 503. This is separate from the employee request/status workflow and
does not grant an unapproved account access. See the
[auth abuse contract](../api/mobile-auth-abuse-protection.md).

## Admin behavior

- `mobileAccess.adminList` and `mobileAccess.adminUpdate` require Super Admin.
- Admin review re-checks current user liveness and at least one active Super
  Admin role/organization assignment server-side before listing or changing
  requests. It also requires the reviewing account to satisfy the employee account-type
  check; an explicitly typed customer cannot review requests merely by having
  a role named Super Admin.
- Allowed lifecycle: Requested -> Approved -> Invited -> Accepted -> Installed,
  with Rejected/Cancelled exits where appropriate. Employees may re-request
  after Rejected or Cancelled.
- Every transition stores authenticated actor, previous/next status, note,
  timestamp, and bounded metadata in an append-only event.
- Employee-visible status notes are separate from internal notes and optional
  portal references. Internal values never appear in employee responses.
- In-app notifications use the existing `Notifications` table. No external
  invitation or messaging side effect is hidden inside the request mutation.

## Invitation integration

`mobile-access-invitation.ts` defines the provider boundary and currently uses
manual modes (`MANUAL_PUBLIC_APP_STORE_GUIDANCE` for new iOS `INVITED` records
and `MANUAL_ANDROID_DISTRIBUTION`). The iOS status means access/download
instructions were manually sent after public release; it does not mean an Apple
tester or App Store Connect user was invited. Older
`MANUAL_APP_STORE_CONNECT` records remain historical and must not be rewritten.
The dashboard renders an iOS `INVITED` status as **Access details sent** for
both old manual Apple invitation records and new public guidance records;
it does not relabel historical invitations as public guidance. Android retains
the ordinary **Invited** label.
No App Store Connect API-key automation is needed for employee access to a
publicly distributed binary. Backend access remains subject to the existing
live-company-member/session checks. The shared member predicate also applies
at web/mobile legacy sign-in, and the Better Auth session resolver refuses a
mapped user with no live organization role. This is not an HRM per-platform
access toggle. A future explicit mobile-entitlement feature is
required if HRM is to control per-platform runtime access independently.
See [ADR-103](../decisions/ADR-103-shared-live-company-membership-for-public-mobile-access.md).

## Key files

- `packages/db/src/schema/mobile-access.prisma`
- `apps/api/src/db/queries/mobile-access.ts`
- `apps/api/src/trpc/routers/mobile-access.route.ts`
- `apps/api/src/services/mobile-access-invitation.ts`
- `apps/dashboard/src/components/settings/app-download-support-page.tsx`
- `apps/dashboard/src/app/api/download-app/route.ts`

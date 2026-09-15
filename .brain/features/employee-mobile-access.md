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
  assignment to an active referenced role; a deleted role assignment alone
  cannot authorize requests.
- `mobileAccess.request` creates or reopens the employee/platform record. An
  active non-terminal request is idempotently returned instead of duplicated.
- Android downloads require either Super Admin or an Android request in
  `INVITED`, `ACCEPTED`, or `INSTALLED`. The endpoint no longer accepts a
  caller-provided download URL or filename.
- The Android APK endpoint recognizes Super Admin only from an active role
  assignment whose referenced role is also active; a soft-deleted role name
  does not bypass the request-status gate.
- The UI never asks for Apple passwords, one-time codes, or credentials.

## Admin behavior

- `mobileAccess.adminList` and `mobileAccess.adminUpdate` require Super Admin.
- Admin review re-checks current user liveness and at least one active Super
  Admin role/assignment server-side before listing or changing requests.
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
No App Store Connect API-key automation is needed for employee access to a
publicly distributed binary. Backend access remains subject to the existing
active-account/session checks; a future explicit mobile-entitlement feature is
required if HRM is to control per-platform runtime access independently.

## Key files

- `packages/db/src/schema/mobile-access.prisma`
- `apps/api/src/db/queries/mobile-access.ts`
- `apps/api/src/trpc/routers/mobile-access.route.ts`
- `apps/api/src/services/mobile-access-invitation.ts`
- `apps/dashboard/src/components/settings/app-download-support-page.tsx`
- `apps/dashboard/src/app/api/download-app/route.ts`

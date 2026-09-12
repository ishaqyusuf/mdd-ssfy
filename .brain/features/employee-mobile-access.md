# Employee Mobile Access

## Purpose

Provide authenticated employees with a safe request surface for Android or iOS
access and give Super Admins an auditable manual review/invitation workflow.

## Employee behavior

- Support > Mobile App is available to active employee roles.
- `mobileAccess.myRequests` returns only the authenticated employee's records
  and omits internal notes, invitation provider, and external portal reference.
- `mobileAccess.request` creates or reopens the employee/platform record. An
  active non-terminal request is idempotently returned instead of duplicated.
- Android downloads require either Super Admin or an Android request in
  `INVITED`, `ACCEPTED`, or `INSTALLED`. The endpoint no longer accepts a
  caller-provided download URL or filename.
- The UI never asks for Apple passwords, one-time codes, or credentials.

## Admin behavior

- `mobileAccess.adminList` and `mobileAccess.adminUpdate` require Super Admin.
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
manual modes (`MANUAL_APP_STORE_CONNECT` and
`MANUAL_ANDROID_DISTRIBUTION`). App Store Connect API automation is deferred
until an API key is explicitly approved, stored server-side using an established
secret pattern, and granted only the minimum required access.

## Key files

- `packages/db/src/schema/mobile-access.prisma`
- `apps/api/src/db/queries/mobile-access.ts`
- `apps/api/src/trpc/routers/mobile-access.route.ts`
- `apps/api/src/services/mobile-access-invitation.ts`
- `apps/dashboard/src/components/settings/app-download-support-page.tsx`
- `apps/dashboard/src/app/api/download-app/route.ts`

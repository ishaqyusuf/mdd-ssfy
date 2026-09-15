# ADR: Shared Live Company Membership for Public Mobile Access

## Status

Accepted

## Context

ADR-098 allows worldwide acquisition of the iOS binary while protecting GND
data with existing company accounts. A non-deleted user row and employee type
alone do not prove current membership: each role assignment references a role
and an organization, both of which can be soft-deleted. Better Auth session
projection filtered those nested records, but sign-in, other authorization
reads, admin notification recipients, and Android artifact delivery could
apply weaker or duplicated checks.

## Decision

One pure auth-package predicate defines a live company member as an active,
non-revoked `EMPLOYEE`/`MANAGER` or legacy null-type user with at least one
non-deleted role assignment referencing a non-deleted role and organization.
An explicit `CUSTOMER` is never admitted by this predicate. Web/mobile legacy
sign-in lookup, Better Auth session resolution, mobile-access requests and
admin review, HRM Super Admin authority, notification recipients, and the
Android APK route use the same shared predicate/assignment filter.

Session resolution returns no member when the active role list is empty and
removes that Better Auth session through its existing invalid-session path.
This makes role/organization offboarding effective on the next protected
session resolution; it does not add public registration or an HRM per-platform
mobile entitlement. The App Store binary remains publicly downloadable.

## Alternatives

- Rely on `Users.type` or `deletedAt` alone: insufficient to detect revoked
  access or a deleted role/organization.
- Repeat Prisma filters in every app and API query: already drifted and would
  make future offboarding behavior inconsistent.
- Infer company membership from App Store Connect tester or portal users:
  incompatible with the chosen public App Store distribution and unsuitable
  for application-data authorization.
- Add a new per-platform entitlement table now: a separate HRM product choice,
  not required to protect the existing login-only first release.

## Consequences

- Existing staff must have at least one live organization role to sign in or
  continue a session. Explicit customers and offboarded/deleted-organization
  users are denied even if an old mobile request or session record exists.
- HRM Super Admin checks now reject a role assignment belonging to a deleted
  organization. An account with only deleted-org assignments needs authorized
  HRM correction, not a bypass in the iOS release path.
- Legacy null-type users remain eligible only with a live role/organization;
  this preserves the current legacy employee migration rule without admitting
  explicit customer rows.
- This is server-side protection and must still be verified with real
  least-privilege and offboarded-account sessions before App Review. Local
  source/unit tests do not prove deployed route reachability or production data.

## Implementation Notes

`packages/auth/src/company-member.ts` owns the predicate and exported role
filter. The shared package subpath is imported by `packages/auth` Better Auth,
`apps/api` HRM/mobile-access queries, and the dashboard APK route. No Prisma
schema, EAS project, Apple permission, or App Store distribution setting
changes.

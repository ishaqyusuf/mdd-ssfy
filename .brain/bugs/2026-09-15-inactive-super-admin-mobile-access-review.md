# Bug: Inactive Super Admin authority in mobile-access review

## Date

2026-09-15

## Problem

`mobileAccess.adminList` and `mobileAccess.adminUpdate` used the shared HRM
`requireSuperAdmin` guard, which accepted a user ID and the first active role
assignment's name without checking whether the user was deleted/revoked or the
referenced `Super Admin` role had been soft-deleted. Severity: High for a
potential administrator review/status authorization bypass. No live affected
account, request mutation, or exploit was observed.

## Root Cause

`protectedProcedure` establishes a user ID but does not itself re-query the
current user's soft-delete/revocation or role state. The HRM guard queried a
user by ID alone and filtered only the assignment's `deletedAt`; a stale
credential/context or active assignment pointing to a deleted role could be
treated as admin. Checking only `roles[0]` also denied a valid Super Admin
whose active assignment was not first.

## Fix

The shared guard now requires `users.deletedAt: null`,
`users.accessRevokedAt: null`, and both assignment and referenced-role
`deletedAt: null`, then looks for Super Admin across the remaining active
roles. Employee mobile-access request reads/writes likewise require an active
referenced role. A new regression failed on the old guard and passes after the
change. A runtime mock-database test also checks the active-query shape,
any-position Super Admin matching, and denied users. The focused
mobile-access/download suite passes 16 tests / 41 assertions. The API
typecheck reports only separately edited Assistant/Sales
errors, not the changed guard/query files.

## Prevention

For any privileged route, derive authority from a fresh server-side read of
the active user and active role assignment **and** referenced role. A signed
token or previously active role name is not current authorization. Keep the
mobile-access source and runtime guard regressions. `TODO:` add an isolated
database-backed negative test for revoked users and soft-deleted role records;
mock-query checks are not end-to-end proof.

## Related Files

- `apps/api/src/db/queries/hrm.ts`
- `apps/api/src/db/queries/mobile-access.ts`
- `apps/api/src/trpc/routers/mobile-access.route.test.ts`
- `apps/api/src/db/queries/require-super-admin.test.ts`
- `.brain/api/permissions.md`
- `.brain/features/employee-mobile-access.md`

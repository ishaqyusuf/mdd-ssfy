# Bug: Deleted Super Admin role still authorized Android download

## Date

2026-09-15

## Problem

The protected `/api/download-app` APK proxy could treat an active role
assignment pointing at a soft-deleted `Super Admin` role as administrator
authority. Severity: Medium for bypassing the Android artifact download gate;
this route does not itself grant access to protected GND backend data. No live
exploit or affected account was observed.

## Root Cause

The route checked that the employee was active and that the role assignment's
`deletedAt` was null, but selected the referenced role name without filtering
the role's own `deletedAt`. If a soft-deleted Super Admin role remained attached
to an active assignment, `isSuperAdmin` would still be true and the APK proxy
would bypass the employee's Android request-status requirement. The repository
already uses a nested active-role filter in other permission queries.

## Fix

Filter nested role assignments with
`where: { deletedAt: null, role: { deletedAt: null } }` before evaluating the
Super Admin name. Added a focused route regression test that failed on the
old query and passes with the active-role filter. The mobile-access workflow
and permission subset passes 12 tests / 32 assertions.

## Prevention

When a route derives privilege from role assignments, check both assignment
and referenced role liveness server-side. Do not trust a role-name-only match
or rely on a dashboard guard. Keep the deleted-role regression in the protected
APK route suite. `TODO:` add a mock-database/HTTP negative test if this route
is refactored beyond the current focused query guard.

## Related Files

- `apps/dashboard/src/app/api/download-app/route.ts`
- `apps/dashboard/src/app/api/download-app/route.test.ts`
- `.brain/api/permissions.md`
- `.brain/features/employee-mobile-access.md`

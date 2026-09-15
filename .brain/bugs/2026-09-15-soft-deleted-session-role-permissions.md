# Bug: Soft-deleted role rows in web/mobile session permissions

## Date

2026-09-15

## Problem

The shared Better Auth web/mobile session resolver selected the first loaded
role assignment for permission generation without explicitly filtering
soft-deleted assignments, roles, organizations, or role-permission links.
Repository code therefore permitted an inactive row to become a session
capability source. No production exploit or affected user was observed.

## Root Cause

`getLegacyUserByAuthUserId` included all `ModelHasRoles` rows and nested
`RoleHasPermissions`; `buildPermissions` used `user.roles[0]` and looked up
permission definitions without an explicit active-row filter. User
deletion/revocation checks existed, but did not make nested roles live.

## Fix

The legacy-user session query now includes only active role assignments,
referenced roles, and organizations, and only active role-permission links.
Permission-definition lookup also requires `deletedAt: null`. A focused
regression asserts the nested query shape. This shared resolver applies to
both web and mobile Better Auth sessions.

## Prevention

When deriving a capability from a soft-deletable relation, filter every
assignment, referenced authority, and grant row before choosing the role.
Keep user liveness and role/grant liveness as separate regression checks.

## Related Files

- `packages/auth/src/better-auth/www-session.ts`
- `packages/auth/src/better-auth/www-session.test.ts`
- `.brain/api/permissions.md`

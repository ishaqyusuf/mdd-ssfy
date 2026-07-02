# API Permissions

## Purpose
Tracks authentication and authorization patterns across API surfaces.

## Current Notes
- Permission logic is implemented in API middleware and route-level orchestration.
- The `apps/www` proxy resolves its internal `/api/auth-session` check through the local IPv4 app port for localhost, `.localhost`, `.test`, and IPv6 loopback dev hosts, avoiding portless/local proxy auth lookups through public or IPv6 localhost origins while preserving the same session payload and permission snapshot; transient local socket-close fetch failures are retried once before treating the request as unauthenticated.
- `apps/www` logout uses `/signout` as the user-facing redirect route; it now invokes the Better Auth `/api/auth/sign-out` handler in-process and expires legacy NextAuth plus Better Auth cookies with secure-prefix-aware attributes so production logout does not depend on a server-side fetch to the public app host.
- Login/session permission hydration now merges role permissions with any per-employee `ModelHasPermissions` overrides before building `can`.
- Sales / dispatch permission surface now includes `viewPacking` for the warehouse pickup-packing tunnel at `/sales/packing-list`.
- `viewPacking` grants access to the packing-list workspace itself.
- Community operations now include a restricted `CommunityUnit` permission surface:
  - it gets read-style community access for projects, units, and templates
  - install-cost queries and mutations are explicitly blocked server-side for that role
- Custom job access can now be granted either globally through jobs settings (`allowCustomJobs`) or per-employee through the `submitCustomJob` permission.
- `jobs.deleteJob` is authenticated and permission-aware: the assigned contractor can delete their own unlocked mistaken submission, while admins need `editJobs`; approved, completed, paid, payment-cancelled, and payout-linked jobs cannot be deleted by either path.
- Admins use the same route but get extra controls:
  - an additional `Cancelled` tab
  - lifecycle actions like `Mark Completed`, `Cancel`, and move-back-to-queue

## TODO
- Document core permission boundaries and any admin-only or repair-only flows.

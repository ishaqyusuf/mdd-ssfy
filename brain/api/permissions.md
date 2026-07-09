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
- Sales rep transfer for existing orders allows two actor paths: users with `editOrders` may transfer any active order, while the currently assigned sales rep may transfer only orders whose `SalesOrders.salesRepId` matches their authenticated user id.
- Both the option list and mutation require an authenticated active user. The option list accepts `salesId` so non-manager reps can be verified as the current owner before seeing target reps.
- The transfer mutation also requires password confirmation for the signed-in actor before updating ownership.
- The transfer target must be an active, non-revoked internal user whose role is sales/order-capable by sales role name or order permissions; the server revalidates the target during the mutation instead of trusting the client picker.
- Sales email ledger access requires an authenticated active user with sales read/write capability (`viewOrders`, `editOrders`, or `viewEstimates`) or Super Admin role behavior.
- Non-Super Admin sales email ledger reads are scoped to attempts where the authenticated user is the sender or the attached sales rep.
- Super Admin can view all sales email attempts and is the only actor allowed to resend `FAILED` or `SKIPPED` attempts from the ledger.
- Community operations now include a restricted `CommunityUnit` permission surface:
  - it gets read-style community access for projects, units, and templates
  - install-cost queries and mutations are explicitly blocked server-side for that role
- Custom job access can now be granted either globally through jobs settings (`allowCustomJobs`) or per-employee through the `submitCustomJob` permission.
- Web bug reporting access can now be granted per employee through the `submitBugReport` generated permission scope, normalized from the specific permission name `submit bug report`.
- Super Admin receives bug reporting access through role behavior and is the only role allowed to view all reports, filter the admin board, and update report status.
- Non-Super Admin users with `submitBugReport` can see the header report button, create reports, list their own reports, view their own report details, and add follow-ups to their own reports.
- `/api/bug-reports/upload` also requires `submitBugReport` before issuing a Vercel Blob client upload token and scopes the token to the authenticated user's `bug-reports/<userId>/` prefix.
- Super Admin employee-row toggles are handled by `hrm.setEmployeeBugReportingAccess`; toggling the permission clears the target employee's `session` and `webAuthSession` rows so the permission snapshot refreshes on next login. Super Admin users cannot have bug reporting disabled through this route because they receive access by role.
- `jobs.deleteJob` is authenticated and permission-aware: the assigned contractor can delete their own unlocked mistaken submission, while admins need `editJobs`; approved, completed, paid, payment-cancelled, and payout-linked jobs cannot be deleted by either path.
- Admins use the same route but get extra controls:
  - an additional `Cancelled` tab
  - lifecycle actions like `Mark Completed`, `Cancel`, and move-back-to-queue

## TODO
- Document core permission boundaries and any admin-only or repair-only flows.

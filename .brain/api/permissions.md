# API Permissions

## Purpose
Tracks authentication and authorization patterns across API surfaces.

## Current Notes
- All authenticated office users may read Sales Customer partnership status.
  Only Super Admin receives enabled `canSend`/`canResend` state and only Super
  Admin may call `dealerProgram.sendCustomerInvitation`; Sales Team and other
  office roles receive `FORBIDDEN` even if they forge the mutation directly.
- Direct invitation authorization is rechecked server-side together with
  customer ownership/deletion/email, dealer linkage/email conflict, campaign
  window, application suppression, resend timing, and the customer send lease.
- Dealer-customer visibility is enforced in directory, search, counts,
  overview, statement, and office sale-customer lookups. Shared records are
  dealer-owned/read-only; private records remain absent.
- Fulfillment staff receive the order-specific direct-ship snapshot through the
  authorized dealer request/order workflow, not broad directory access.
- Campaign management, application review/reset, and dealer
  suspension/reactivation require `Super Admin`. Public recruitment endpoints
  accept only opaque invitation tokens and expose no internal customer id.
- API context no longer trusts the legacy `Bearer random|userId` suffix.
  Browser requests derive the legacy user from the verified Better Auth session
  cookie; app requests derive it from a verified session token or signed JWT.
- Suspended/restricted dealers fail the active-dealer guard, blocking portal
  access/new operations while authorized office fulfillment and history remain.
- Permission logic is implemented in API middleware and route-level orchestration.
- Dealership quote, order, checkout, print, and customer-payment mutations are
  protected by the dealer session and recheck `dealerAuthId` ownership at the
  query boundary. A dealer cannot request, pay, print, or mark customer payment
  status for another dealer's document.
- Dealer request review is available to the assigned rep, Sales Team users for
  unassigned requests, and existing sales/admin roles. Approval stamps the first
  approver and later attempts return the already-worked state instead of
  reassigning or reconverting the order.
- Dealer request notification fallback selects only active, non-deleted users
  with an active `Sales Team` role. Each recipient's in-app/email preference is
  still enforced by the notification service.
- The `apps/www` proxy resolves its internal `/api/auth-session` check through the local IPv4 app port for localhost, `.localhost`, `.test`, and IPv6 loopback dev hosts, avoiding portless/local proxy auth lookups through public or IPv6 localhost origins while preserving the same session payload and permission snapshot; transient local socket-close fetch failures are retried once before treating the request as unauthenticated.
- `apps/www` logout uses `/signout` as the user-facing redirect route; it now invokes the Better Auth `/api/auth/sign-out` handler in-process and expires legacy NextAuth plus Better Auth cookies with secure-prefix-aware attributes so production logout does not depend on a server-side fetch to the public app host.
- Login/session permission hydration now merges role permissions with any per-employee `ModelHasPermissions` overrides before building `can`.
- Shared page tabs are authenticated through `pageTabs`. Any authenticated user can create private tabs for themselves and use public/general tabs visible on a page.
- Only Super Admin can create or switch tabs to public/general visibility. Public-tab management is limited to the creator or a Super Admin; other users can view/use the tab, reorder it for themselves, and set it as their own default, but cannot rename, draft, publish, change visibility, or delete it.
- Sales / dispatch permission surface now includes `viewPacking` for the warehouse pickup-packing tunnel at `/sales/packing-list`.
- `viewPacking` grants access to the packing-list workspace itself.
- Sales rep transfer supports existing orders and quotes and is ownership-only: the authenticated user's id must match `SalesOrders.salesRepId`. `editOrders` does not grant authority to transfer another rep's sale.
- Both the option list and mutation require an authenticated active user and a `salesId` so ownership is verified before target reps are exposed.
- The transfer mutation also requires password confirmation for the signed-in actor before updating ownership.
- The transfer target must be an active, non-revoked internal user whose role is sales/order-capable by sales role name or order permissions; the server revalidates the target during the mutation instead of trusting the client picker.
- Sales email ledger access requires an authenticated active user with sales read/write capability (`viewOrders`, `editOrders`, or `viewEstimates`) or Super Admin role behavior.
- Non-Super Admin sales email ledger reads are scoped to attempts where the authenticated user is the sender or the attached sales rep.
- Super Admin can view all sales email attempts and is the only actor allowed to resend `FAILED` or `SKIPPED` attempts from the ledger.
- Task-run diagnostics writes require an authenticated actor when using the protected tRPC mutations; the `apps/www` server-action bridge skips diagnostic writes if no actor session is available rather than blocking the original task flow.
- `taskRunDiagnostics.list`, `taskRunDiagnostics.get`, and `taskRunDiagnostics.markReviewed` are Super Admin-only review surfaces.
- Normal production users do not receive run ids, task names, copy/cancel controls, or internal error detail in the task monitor UI; they only receive the simplified loading indicator and terminal toasts.
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
- Master password login audit review is Super Admin-only through `masterPasswordLoginAudits.list` and `masterPasswordLoginAudits.clear`; the Settings navigation link uses the same Super Admin-only sidebar gating.
- Admins use the same route but get extra controls:
  - an additional `Cancelled` tab
  - lifecycle actions like `Mark Completed`, `Cancel`, and move-back-to-queue

## TODO
- Document core permission boundaries and any admin-only or repair-only flows.
## Storefront permissions (2026-07-20)

- `viewStorefront`, `editStorefront`, and `publishStorefront` control catalog,
  configuration, content, settings, and publication.
- `viewStorefrontCarts` and `manageStorefrontCarts` control customer/guest cart
  visibility and operations.
- `viewStorefrontOrders` and `manageStorefrontOrders` control storefront-order
  and inquiry operations.
- Super Admin retains implicit authority; all other employee access is checked
  against the normal form-permission model. Customer reads remain strictly
  owner-scoped and are never authorized through employee sessions.

## Workflow component catalog permissions (2026-07-21)

- Admin and Super Admin may edit component details, visibility, section
  overrides, redirects, enter catalog selection, and soft archive components.
- Only Super Admin may edit shared component base pricing.
- Ordinary internal sales users retain normal sale-component selection only.
- Dealership and storefront capability sets never expose internal
  catalog-management actions.
- All catalog mutations are `protectedProcedure` routes and repeat role checks
  server-side; UI capability checks are not an authorization boundary.

## Employee, profile, and notification mutation boundaries (2026-07-22)

- HRM employee mutations and employee-form reads now require an authenticated
  procedure. The query layer additionally requires Super Admin for password
  reset, delete, access revocation/restoration, employee saves, and employee
  form data; profile and role edits repeat the Super Admin check in the route.
- User profile, password, employee-document, document-review, and notification
  preference mutations are protected and execute against the authenticated
  actor context rather than an anonymous request.
- Notification channel administration, subscriber/role membership, inbound-note
  writes, and note creation are protected. Public channel/activity reads remain
  intentionally available to existing login and shared notification surfaces;
  personal activity mutations use the current authenticated contact.

# API Permissions

## Sales Form Adoption (2026-07-30)

- Any authenticated user may record their own bounded form-open telemetry and
  update only their own sales-form preference.
- User identity is taken from the authenticated server context and is never
  accepted from client input.
- Adoption aggregation requires the exact `Super Admin` role in the query
  implementation. The settings-sidebar visibility check is convenience only.
- Bulk legacy-preference reset requires the exact `Super Admin` role at the
  mutation boundary. Target user ids are selected server-side from current
  `LEGACY` preferences; the client cannot provide or broaden the target set.
- Each changed preference records the authenticated Super Admin actor id in the
  bounded audit event without customer or sales-document data.
- Preference cookies do not grant access and are validated against the current
  authenticated user id and cookie version.

## Sales Finance

- Every `salesFinance` endpoint uses `protectedProcedure`.
- Read access requires any of `viewOrderPayment`, `editOrderPayment`, or
  `viewSales`, matching the existing Sales Accounting navigation audience
  during parallel adoption.
- `salesFinance.analytics`, receivables list/summary, and receivable detail are
  read-only projections and use the same Finance read boundary as payment list,
  summary, and detail.
- `salesFinance.report` and `salesFinance.receivablesReport` additionally require
  `generateSalesPaymentReport`; the dashboard hides its Reports control without
  that permission, while the server remains the authorization boundary.
- `salesFinance.reconciliationStart` and
  `salesFinance.reconciliationResolve` additionally require
  `editOrderPayment`. They write append-only `Event` evidence only and do not
  grant or perform receipt, refund, application, invoice, or customer mutation.
- `salesFinance.resolutionSyncBalance` and
  `salesFinance.resolutionPayment` additionally require `editOrderPayment`.
  The dashboard hides Sync and Resolve payment controls without that
  permission, while the protected API remains authoritative. Resolution
  list/summary reads use the normal Finance read boundary.
- Adoption pings use the Finance read boundary. The readiness popover is shown
  only to `editOrderPayment` users, while the server response never grants
  legacy-record deletion or redirect authority.

## Purpose
Tracks authentication and authorization patterns across API surfaces.

## Current Notes
- Sales Overview reads are authenticated and capability-aware.
  `sales.getSaleOverview` accepts order, estimate, production, delivery, pickup,
  or packing viewers; `sales.productionOverview` accepts order, production,
  delivery, pickup, or packing viewers. UI tab visibility is not the
  authorization boundary, and both queries are side-effect-free.
- Production queue, dashboard, worker-task, and v2 order-detail reads require an
  authenticated user with an order, production, delivery, pickup, or packing
  viewing capability. Worker routes always replace caller scope with the
  authenticated worker id before querying assignments.
- Shared `storage.upload` and `storage.delete` require an authenticated user.
  Upload ownership/uploader ids come only from API context; delete repeats
  provider, pathname, owner, uploader, active-state, and trusted browser-staging
  source/key checks. Durable consumed/employee documents and unregistered
  legacy path-only blobs are not physically deleted through this route. The
  browser receives no write-capable Blob credential.
- Employee document saves require a session. Cross-user saves retain the
  `editEmployeeDocument` capability check, and updates also scope the feature
  row to the authorized target user.
- Dispatch proof/signature writes retain assigned-driver or dispatch-manager
  guards. Document owner ids are resolved from the live dispatch, never client
  supplied.
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
- Customer profile and address mutations require the authenticated
  `editSalesCustomers` capability and independently reject dealer-owned
  customers. The new sales form and Sales Overview mirror both restrictions,
  but the server remains the authorization boundary.
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
- Dealer quote edits also fail closed after any active `make_order` request
  reaches `pending`, `approved`, or `rejected`. The lock is repeated inside the
  save transaction; disabling Edit or hiding the composer is not the
  authorization boundary.
- Dealer request review is available to the assigned rep, Sales Team users for
  unassigned requests, and existing sales/admin roles. Approval stamps the first
  approver and later attempts return the already-worked state instead of
  reassigning or reconverting the order.
- Dealer request notification fallback selects only active, non-deleted users
  with an active `Sales Team` role. Each recipient's in-app/email preference is
  still enforced by the notification service.
- The `apps/dashboard` proxy resolves its internal `/api/auth-session` check through the local IPv4 app port for localhost, `.localhost`, `.test`, and IPv6 loopback dev hosts, avoiding portless/local proxy auth lookups through public or IPv6 localhost origins while preserving the same session payload and permission snapshot; transient local socket-close fetch failures are retried once before treating the request as unauthenticated.
- `apps/dashboard` logout uses `/signout` as the user-facing redirect route; it now invokes the Better Auth `/api/auth/sign-out` handler in-process and expires legacy NextAuth plus Better Auth cookies with secure-prefix-aware attributes so production logout does not depend on a server-side fetch to the public app host.
- Login/session permission hydration now merges role permissions with any per-employee `ModelHasPermissions` overrides before building `can`.
- Shared page tabs are authenticated through `pageTabs`. Any authenticated user can create private tabs for themselves and use public/general tabs visible on a page.
- Only Super Admin can create or switch tabs to public/general visibility. Public-tab management is limited to the creator or a Super Admin; other users can view/use the tab, reorder it for themselves, and set it as their own default, but cannot rename, draft, publish, change visibility, or delete it.
- Sales / dispatch permission surface now includes `viewPacking` for the warehouse pickup-packing tunnel at `/sales/packing-list`.
- `viewPacking` grants access to the packing-list workspace itself.
- Sales rep transfer supports existing orders and quotes and is ownership-only: the authenticated user's id must match `SalesOrders.salesRepId`. `editOrders` does not grant authority to transfer another rep's sale.
- Manual single and batch payment review use protected sales mutations. The server stamps `reviewedById` from the authenticated context; the client cannot choose the reviewer. Batch review retains the existing authenticated-office permission boundary and is capped at 100 selected sales ids.
- Both the option list and mutation require an authenticated active user and a `salesId` so ownership is verified before target reps are exposed.
- The transfer mutation also requires confirmation with the signed-in owner's account password or the configured master password before updating ownership. Master password does not bypass the ownership or target checks and may confirm an owner who has no account-password hash.
- Only completed master-password transfers create usage evidence; invalid credentials, forbidden/non-owner attempts, invalid targets, and unchanged assignments create no usage row. The transfer fails closed if its atomic usage write fails.
- The transfer target must be an active, non-revoked internal user whose role is sales/order-capable by sales role name or order permissions; the server revalidates the target during the mutation instead of trusting the client picker.
- Sales email ledger access requires an authenticated active user with sales read/write capability (`viewOrders`, `editOrders`, or `viewEstimates`) or Super Admin role behavior.
- Non-Super Admin sales email ledger reads are scoped to attempts where the authenticated user is the sender or the attached sales rep.
- Super Admin can view all sales email attempts and is the only actor allowed to resend `FAILED` or `SKIPPED` attempts from the ledger.
- Sales document Email/WhatsApp/SMS choices reuse the existing authenticated
  sales document send boundary; selecting a transport does not grant a new
  capability. Short-link redirects remain opaque public reads, never mutation
  authority.
- Task-run diagnostics writes require an authenticated actor when using the protected tRPC mutations; the `apps/dashboard` server-action bridge skips diagnostic writes if no actor session is available rather than blocking the original task flow.
- `taskRunDiagnostics.list`, `taskRunDiagnostics.get`, and `taskRunDiagnostics.markReviewed` are Super Admin-only review surfaces.
- Normal production users do not receive run ids, task names, copy/cancel controls, or internal error detail in the task monitor UI; they only receive the simplified loading indicator and terminal toasts.
- Inventory import source archive, single/batch retained disposition, retained-item projection history/retry, category cleanup, task dispatch, reset/backfill, Dyke projection writes, and inventory/category/sub-component delete routes require Super Admin after authentication. Retained disposition and projection-retry actors are always taken from the protected API context; clients cannot choose audit users. Each ownership update and `Event` evidence are fail-closed in one transaction, while each post-commit projection attempt is separately actor-attributed in `TaskRunDiagnostic`. Retry atomically claims one failed diagnostic before dispatch so concurrent clicks cannot queue it twice. Read-only import run/source/category review remains available to authenticated users.
- Remaining inventory category/item/component/product-kind/stock-mode/status/
  variant/cost writes now use the same authenticated Super Admin operator guard.
  A dedicated inventory-edit permission is required before delegating these
  configuration writes to other roles.
- Dispatch mutations are protected and capability-shaped. Assigned trip start,
  completion, and signature require the live `driverId` match unless the actor
  has manager authority; manager operations require `editPickup`, `editOrders`,
  or `viewPacking`. Mobile proof completion is bound to the dispatch and the
  authenticated actor; the generic proof-upload mutation has been removed.
- Contractor job assignment/restore/approve/reject requires `editJobs`;
  payment create/cancel/reverse requires `editJobPayment`. Contractors may
  submit/update only their own work, and custom submissions require either
  `submitCustomJob` or the global `allowCustomJobs` setting.
- `community.saveJobForm` enforces that self-service boundary inside its
  transaction: a non-`editJobs` actor may submit, update an existing owned job,
  or request task configuration; the requested worker and any existing job must
  belong to that actor, and assignment/review/cross-worker changes fail closed.
- Community mutations are protected and divided into template/project,
  builder, unit, cost, invoice, job, and production capability sets.
  CommunityUnit cost restrictions remain enforced after authentication.
- Work-order saves accept `editCustomerService`, `editCommunityUnit`,
  `editCommunity`, or `editProject`. This keeps the mutation authenticated
  while allowing the dedicated Customer Service role to perform the edit
  action exposed by its workspace.
- Shared job settings require authentication to read and Super Admin to
  mutate. Mobile/admin UI visibility is not the authorization boundary.
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
- Shipping settings read/write reuse `viewStorefront` and `editStorefront`.
  Shipping quote review reuses `editStorefrontOrders`; order listing and quote
  evidence remain under `viewStorefrontOrders`. Customer preview and order
  detail remain collection/order owner-scoped.
- Super Admin retains implicit authority; all other employee access is checked
  against the normal form-permission model. Customer reads remain strictly
  owner-scoped and are never authorized through employee sessions.

### Storefront pricing and promotion permissions (2026-07-24)

- Campaign list/detail and target-option reads require `viewStorefront`.
- Campaign create/update and default-profile settings require
  `editStorefront`.
- Campaign publish/archive require `publishStorefront`.
- Every mutation is a protected procedure and writes a
  `StorefrontAuditEvent`; UI visibility is not an authorization boundary.
- Public campaign projections omit internal name, priority, customer IDs,
  profile IDs, coefficients, and all normalized targets.
- Signed-in customer identity and assigned profile are derived from the server
  session. Public inputs cannot claim a customer or profile.

## Workflow component catalog permissions (2026-07-21)

- Admin and Super Admin may edit component details, visibility, section
  overrides, redirects, enter catalog selection, and soft archive components.
- Only Super Admin may edit shared component base pricing.
- Ordinary internal sales users retain normal sale-component selection only.
- Dealership and storefront capability sets never expose internal
  catalog-management actions.

## Custom millwork inquiries (2026-07-22)

- Reading the office inquiry inbox, briefs, activity, and private documents
  requires `viewStorefrontOrders`.
- Default assignment, assignee options, and staff notification recipients use
  the same `viewStorefrontOrders` grant (including user-specific permission and
  Super Admin resolution); role-name matching is not an authorization boundary.
- Assignment, notes, customer linking, status changes, and the storefront side
  of quote conversion require `editStorefrontOrders`.
- Quote creation repeats the canonical Sales authorization and additionally
  requires `editOrders` (or Super Admin). Possessing storefront permissions
  alone cannot create a Sales quote.
- Private attachment downloads repeat employee authentication, permission, and
  document owner checks on every request. Storage credentials and private blob
  URLs never cross the office API boundary.
- All catalog mutations are `protectedProcedure` routes and repeat role checks
  server-side; UI capability checks are not an authorization boundary.

## Employee, profile, and notification mutation boundaries (2026-07-22)

- The public `hrm.getQuickLoginEmployees` query is safe by construction: it
  always returns an empty array and does not expose employee identities. Mobile
  development quick login uses this route instead of the general employee list.
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

## Contractor accounting permissions (2026-07-29)

- `jobs.paymentDashboard`, `jobs.paymentPortal`, `jobs.contractorPayouts`,
  `jobs.contractorPayoutOverview`, `jobs.getContractorPayoutPrintData`,
  `jobs.contractorPeriodReport`, and `filters.contractorPayout` are protected
  reads requiring `viewJobPayment` or `editJobPayment`.
- `contractorAccounting.summary`, `periodReport`, `entries`, `entry`,
  `filterOptions`, `periods`, `reconciliationIssues`, `reportRuns`,
  `reportSchedules`, `taxProfiles`, `payables`, `insights`,
  `resolutionIssues`, `resolutionIssue`, `closeReadiness`,
  `contractorProfile`, `payoutRuns`, `alertRules`, and `alertEvents` require the
  same `viewJobPayment | editJobPayment` viewer boundary.
- `createAdjustment`, `reverseEntry`, `closePeriod`, `runReconciliation`,
  `reviewReconciliationIssue`, `generateReport`, `createReportSchedule`, and
  `updateTaxProfile`, `startResolution`, `resolveIssue`, `createPayoutRun`,
  `updatePayoutRun`, `createAlertRule`, `updateAlertRule`, and
  `updateAlertEvent` require `editJobPayment`.
- `reopenPeriod` and `backfillLedger` require the authenticated actor to have an
  active `Super Admin` role. Backfill defaults to dry-run even after that check.
- `myStatement` requires authentication and derives contractor scope from
  `ctx.userId`; the input schema cannot select another contractor.
- Creating, cancelling, and reversing legacy contractor payouts also continue
  to require `editJobPayment`; ledger read authority does not imply mutation
  authority.
- Generated report artifacts are created only after a protected report-run
  mutation. Stored filter/actor evidence remains the audit boundary for
  downloads and scheduled delivery.
- Sidebar visibility is not the authorization boundary; every interactive read
  repeats permission enforcement on the server.


## Production readiness override permissions (2026-07-27)

- Production readiness reads require the existing Production Overview viewer
  boundary.
- Confirm and revoke mutations require `editProduction`.
- The server derives the actor from the authenticated session and does not
  trust client-supplied author identity.
- UI visibility is not an authorization boundary; the assignment task repeats
  the revision-bound readiness check before writing.

## Sales dashboard and reporting permissions (2026-07-30)

- Every `salesDashboard` endpoint is a protected procedure.
- Read access requires at least one of `viewOrders`, `editOrders`, `viewSales`,
  `viewEstimates`, or `editEstimates`.
- `salesDashboard.report` additionally requires the dedicated
  `generateSalesPerformanceReport` scope. Super Admin receives the scope
  through role behavior; other roles must be assigned it explicitly.
- The Sales Reports UI hides the workbook menu without the export scope, while
  the protected endpoint repeats both the sales-read and export checks.
- Net collections and payment review counts remain behind the separate Sales
  Finance read boundary (`viewOrderPayment`, `editOrderPayment`, or
  `viewSales`).
- Report-card layout cookies are presentation preferences only. They grant no
  data access, and every linked report repeats its own API authorization.

## Production submission material review permissions (2026-07-30)

- Review queue/detail reads and approve/reject commands require
  `editProduction`.
- A decision that receives linked inbound additionally requires
  `editInboundOrder`.
- A decision that marks scoped needs fulfilled without inbound additionally
  requires `editOrders`.
- Background and direct worker submissions replace client-supplied author
  identity with the authenticated employee. Without `editProduction`, the
  server restricts submission scope to assignments owned by that employee.
- UI visibility is not an authorization boundary; assignment/order/inbound
  ownership and optimistic review state are revalidated inside the transaction.

## Manual activity note permissions (2026-08-04)

- An authenticated author may edit or soft-delete their own manual Sales Info or Inventory Inbound note.
- Super Admin may manage any manual note and request deleted activity history.
- Other users are rejected server-side.
- `inventory_inbound_activity`, other system channels, and `activity_note_revision` entries are immutable.

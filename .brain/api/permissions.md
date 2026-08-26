# API Permissions

## Sales Handoff Action Read Boundary (2026-08-23)

- `sales.getSalesHandoffActions`, its exact open-epoch where fragment, and its
  distinct-order scope helper derive authority only from the authenticated
  active user. Active Super Admin assignments grant organization-wide reads;
  all other actors are limited to their own representative id. Caller-provided
  representative, organization, worker, or role scope is not accepted.
- Material and Production action payloads are read/deep-link intents only. They
  do not grant inventory, inbound, production assignment, submission, review,
  payroll, packing, dispatch, or fulfillment authority.
- Production deep links re-enter the ordinary Sales Overview permission and
  role-derived mode boundary. Production-only workers remain in their
  authorization-derived `production-tasks` mode; the alert never auto-assigns.
- Escalation recipients are re-read as active, non-revoked Super Admins inside
  the epoch organization. The scheduler uses only the explicitly configured
  active system notification actor and fails visibly if it is absent; it never
  attributes system activity to an arbitrary admin.
- Recurring repair has no user-callable API and accepts no representative,
  organization, worker, or role scope. It requires the explicitly configured
  `SALES_HANDOFF_RECONCILIATION_ACTOR_USER_ID`, verifies that user remains
  active/non-revoked before scanning, and attributes every reconciliation to
  that actor. Invalid actor configuration fails the task with durable worker
  repair and schedule-history evidence.

## Role Permission Session Revocation (2026-08-20)

- Saving changed permissions for an existing role atomically revokes both legacy
  `session` records and Better Auth `webAuthSession` records for every employee
  assigned to that role. They must authenticate again to receive the updated
  permission snapshot.
- Creating a role or changing only its name leaves existing sessions intact.

## Mark Sales Order Fulfilled Permission (updated 2026-08-24)

- `viewMarkSalesOrderFulfilled` is the dedicated capability for the Sales
  Orders Mark as Fulfilled action. It is available to roles and
  employee-specific grants as the view-only `Mark Sales Order Fulfilled` row;
  Super Admin retains implicit access.
- The role and employee editors persist the exact
  `view mark sales order fulfilled` permission record through the View column.
  The Edit cell is unavailable because this is an execution capability, not
  general order-edit authority.
- Legacy `mark sales order fulfilled` grants continue to hydrate the canonical
  capability. Opening and saving the affected role or employee maps that legacy
  grant to the view-prefixed permission record.
- `editOrders`, `editPickup`, `editDelivery`, and `viewPacking` do not imply the
  new capability. Their existing inventory, dispatch, packing, and order
  permissions are unchanged.
- Fulfillment preflight and ordinary continuation enforce the capability only
  when `action = fulfilled`; Production completed keeps its existing boundary.
- Dependency resolution that receives inbound material or approves production
  requires `viewMarkSalesOrderFulfilled` plus the existing `editOrders`,
  `editInboundOrder`, and `editProduction` checks.
- The Dashboard hides both Sales menu Fulfilled and dispatch-list Mark as
  completed without the grant. The protected task-start action and the
  `update-sales-control` job independently recheck the authenticated actor
  before any terminal fulfillment write.
- `dispatch.ensureSalesOrderFulfillmentDispatch` uses the dedicated capability
  to reuse or create only the active dispatch needed by this workflow. It does
  not grant the general `dispatch.createDispatch` contract.

## Dashboard Liveness (2026-08-21)

- `GET /api/health/live` is intentionally public and returns no application,
  customer, employee, session, deployment, or database detail.
- The Dashboard proxy excludes `/api/*`, so the route cannot create an auth
  session lookup. The route itself does not read auth or persistence state.

## Dispatch Workspace And Exceptions (2026-08-18)

- Workspace summary, backlog, list, calendar, driver workload, exception list,
  and exception resolution require the existing dispatch-manager capability
  boundary (`editPickup`, `editOrders`, or `viewPacking`).
- `dispatch.createDispatches` uses the same manager boundary and repeats the
  existing per-order Special Order enforcement before its eligibility-checked
  atomic transaction. The linked V2 dashboard itself remains restricted to
  `editOrders` users.
- Dispatch detail and exception reporting require either that manager boundary
  or a live `OrderDelivery.driverId` match to the authenticated user.
- Driver manifest access requires dispatch-worker capability and always
  overwrites requested driver ids with the authenticated user id.
- Reporter and resolver ids are taken only from protected API context. The
  client cannot attribute an exception to another employee.

## Driver Platform Revival (2026-08-06)

- Dispatch operational/customer reads use `protectedProcedure`; no public
  dispatch manifest, packing, or queue read remains.
- Driver detail reads require the authenticated user to be the assigned driver
  unless the user has a dispatch-management capability.
- Driver work-queue routes ignore caller-provided driver ids and force the
  authenticated user id. Packing operators and managers use their explicit
  capability boundaries.
- Inventory preparation requires packing access. Reconciliation/backfill and
  cancellation require dispatch-manager access.
- Development quick-login data is guarded twice: the API returns rows only in
  `NODE_ENV=development`, and the mobile selector exists only under `__DEV__`.


## New Sales Form Adjustments (2026-08-04)

- Preview and proposal creation use protected procedures and the existing new
  sales form/order access boundary. `requestedById` and `submittedById` come
  from authenticated context.
- Customer approval read/respond procedures are public only through a random,
  expiring token. The database stores its SHA-256 hash, never the raw token.
- The public response may change only its pending approval/adjustment decision;
  it cannot edit order fields, choose money values, or identify an employee.
- Save bypass is not granted by the client-provided adjustment ID alone. The
  server verifies approved status, order identity, source version, proposed
  total, and exact quantity snapshot inside the save transaction.
- The asynchronous apply task reloads all durable evidence and atomically claims
  `APPROVED` before any sale or wallet mutation.

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

## Square Sales Refunds (2026-08-21)

- `editRefundSquare` is the dedicated action capability, stored as
  `edit refund square`; Super Admin retains implicit access.
- `salesRefunds.create`, `salesRefunds.retry`, and
  `salesRefunds.allocateExternal` repeat the exact capability check at the
  protected API boundary. Existing `editOrderPayment`, `editSales`, and other
  broad Sales/Finance permissions do not authorize a Square refund command.
- `salesRefunds.overview` uses the same canonical Sales Overview viewer boundary
  as `sales.getSaleOverview`: order, estimate, production, delivery, pickup, or
  packing viewers may read the mounted order's transaction/refund projection.
  The external-review queue retains the authenticated Sales Finance/payment-view
  audience. The dashboard hides action controls without `editRefundSquare`, but
  UI visibility is never the authorization boundary.
- The legacy `sales.resolvePayment` path rejects Square refund attempts before
  it can write a local negative payment.

## Purpose
Tracks authentication and authorization patterns across API surfaces.

## Current Notes
- Dispatch web navigation separates delivery execution from administration:
  delivery-only users (`editDelivery` without `editOrders`) are authorized for
  `/sales-book/dispatch-task` and use it as their default Dispatch link, while
  `/sales-book/dispatch-admin` requires `editOrders`. The authenticated proxy
  applies the same link map to direct route attempts, so a delivery-only user
  opening the admin URL is redirected to the task workspace.
- Sales Overview reads are authenticated and capability-aware.
  `sales.getSaleOverview` accepts order, estimate, production, delivery, pickup,
  or packing viewers; `sales.productionOverview` accepts order, production,
  delivery, pickup, or packing viewers. UI tab visibility is not the
  authorization boundary, and both queries are side-effect-free.
- Sales Overview General rollout management is Super Admin-only.
  `sales.getSalesOverviewViewSettings` and
  `sales.updateSalesOverviewViewSettings` repeat the active-role check at the
  API boundary. Other overview viewers receive only their resolved V1/V2 value
  through `sales.getSaleOverview`, never the office or pilot policy.
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
- `inventories.createInboundShipmentFromDemands` retains its existing authenticated create-inbound boundary, but requests with `operation="mark_available"` additionally require `editOrders` before any demand split, shipment, receipt, stock, or activity write runs.
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

- `editSalesComponent` authorizes component creation and component-details
  updates. Both mutations repeat this explicit permission check server-side
  through the shared workflow-component editor guard. Its regression test
  executes the guard with authenticated allowed and denied role-permission
  contexts and asserts the denied path returns `FORBIDDEN` before mutation work.
- Admin and Super Admin may edit visibility, section overrides, redirects,
  enter catalog selection, and soft archive components.
- Only Super Admin may edit shared component base pricing.
- Ordinary internal sales users retain normal sale-component selection only.
- Dealership and storefront capability sets never expose internal
  catalog-management actions.
- The dashboard sales-form capability projection grants grouped Service unit
  price, tax, and production editing to internal users with `editOrders`.
  Door/HPT, Moulding, Shelf, flat-line, and shared catalog pricing remain on
  their existing Super Admin-only capabilities.

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
- All catalog mutations are `protectedProcedure` routes and repeat their
  permission or role checks server-side; UI capability checks are not an
  authorization boundary.

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

## Sales production workspace permissions (2026-08-21)

- Production list, dashboard, summary, and calendar reads require the existing
  Production Overview viewer boundary.
- Worker reads `sales.productionTasks`, `sales.productionDashboardTasks`, and
  `sales.productionCalendarTasks` derive assignee scope from `ctx.userId` and
  do not trust caller-supplied worker or assignee ids.
- Calendar cards do not expand read authority; worker cards open the existing
  Production Tasks context.

## Sales dashboard and reporting permissions (2026-07-30)

- Every `salesDashboard` endpoint is a protected procedure.
- Read access requires at least one of `viewOrders`, `editOrders`, `viewSales`,
  `viewEstimates`, or `editEstimates`.
- `salesDashboard.report` and `salesDashboard.salesTaxReport` additionally
  require the dedicated
  `generateSalesPerformanceReport` scope. Super Admin receives the scope
  through role behavior; other roles must be assigned it explicitly.
- The Sales Reports UI hides performance and sales-tax workbook actions without
  the export scope, while each protected endpoint repeats both the sales-read
  and export checks.
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
- Direct production-only actors (`viewProduction` without `viewOrders`) must
  also pass the scoped material-availability evaluation. Configured unresolved
  or unreadable evidence rejects the submission server-side; missing material
  configuration remains eligible for material review. Admin/supervisor
  submissions retain the nonblocking review workflow.
- Production submission deletion always binds the requested submission to the
  supplied sale. Without `editProduction`, the authenticated employee must be
  both the submission author and the current assignment owner. An empty or
  cross-scope match is rejected before the production reset lifecycle runs.
- UI visibility is not an authorization boundary; assignment/order/inbound
  ownership and optimistic review state are revalidated inside the transaction.

## Manual activity note permissions (2026-08-04)

- An authenticated author may edit or soft-delete their own manual Sales Info or Inventory Inbound note.
- Super Admin may manage any manual note and request deleted activity history.
- Other users are rejected server-side.
- `inventory_inbound_activity`, other system channels, and `activity_note_revision` entries are immutable.

## Inventory fulfillment permissions (2026-08-04)

- Backorder and partial-shipment queue reads require one of `viewOrders`,
  `viewPacking`, `viewInboundOrder`, `viewPickup`, or `viewDelivery`.
- Shipment, hold, and inventory-dispatch writes require one of `editOrders`,
  `editPickup`, `editDelivery`, or the operational packing capability
  `viewPacking`.
- Received-stock allocation to backorders requires `editInboundOrder` or
  `editOrders`.
- Client-supplied audit authors are rejected. Mutation audit identity is derived
  from the authenticated user, and direct route tests prove unauthorized users are
  denied before domain writes are reached.

## Inbound quantity adjustment permissions (2026-08-06)

- `inventories.reduceInboundShipmentDemand` requires authentication and the
  existing `editInboundOrder` operational permission.
- Actor identity is derived from the authenticated session. The supplied note is
  a reason, not an author field; Sales and inbound activity use the server-resolved
  employee contact.

## Staff Sales Payment Date permissions (2026-08-21)

- Existing payment authorization continues to govern who may apply a payment.
- Supplying a non-null manual `paymentDate` to
  `salesPaymentProcessor.applyPayment` additionally requires an authenticated,
  non-deleted, non-revoked user with an active exact `Super Admin` role.
- Other authorized payment users may omit the date or send null; the payment
  occurrence then resolves to the current New York business date. The hidden
  dashboard control is a usability affordance, while the API check is the
  authorization boundary.

## Proposed multi-tenant SaaS permission boundary (2026-08-08)

- Platform roles and tenant roles are distinct. A tenant Super Admin is not a
  platform operator and cannot inspect another tenant or platform billing.
- Platform support access to tenant data requires an explicit tenant, approved
  capability, reason, actor, expiry, and append-only access audit. It is never
  inferred from a global role alone.
- Tenant membership, tenant status, active office, role/permissions,
  entitlement, and entity ownership are separate checks. Passing one does not
  imply the others.
- Custom hostname resolution selects tenant context but grants no staff or
  entity permission.
- Tenant-admin feature selection cannot grant platform-only features or violate
  feature dependencies. Manual grants are platform-controlled, time bounded,
  reasoned, and audited.
- Subscription failure follows approved grace/read-only/export behavior; it
  cannot delete data or bypass legal hold/retention.
- Tenant price/configuration administrators may manage their tenant overlay and
  price books but cannot mutate the platform template, another tenant overlay,
  or GND confidential pricing.
- Merchant connections, subscription billing, finance, refunds, exports,
  domains, sender domains, support access, and destructive lifecycle operations
  require dedicated capabilities and reauthentication where defined.
- Every new/converted route requires direct negative tests for anonymous,
  wrong-tenant, wrong-office, wrong-role, disabled-feature, suspended-tenant,
  expired-support, and stale/revoked public-token contexts as applicable.

## Special Order acknowledgment permissions (2026-08-13)

- During the `SUPER_ADMIN_ONLY` enrollment pilot, only an authenticated actor
  with an active Super Admin role may newly mark an order Special Order. The
  server enforces this transition independently of the hidden Sales Form
  control. `ALL_STAFF` restores enrollment to users already authorized for the
  Sales save workflow.
- Enrollment rollout does not change read, history, approval, removal,
  reapproval, document, email, or operational permissions. Employees continue
  to see and operate on previously marked orders under the normal Special Order
  lifecycle and enforcement rules.
- Classification, approval request/retry, reapproval, and removal require an
  authenticated user with `editOrders`. Sales Overview classification also
  re-resolves the live enrollment audience server-side; `SUPER_ADMIN_ONLY`
  limits the transition to active Super Admin role assignments, while
  `ALL_STAFF` admits otherwise-authorized active employees.
- Reusing or preparing an approval capability for Sales Overview clipboard use
  also requires `editOrders`; possessing the public URL remains the customer's
  revision-bound capability, and preparing it does not send customer email.
- Approval history requires `viewOrders` or `editOrders`.
- Decrypted signature retrieval requires an authenticated user with
  `viewOrders` or `editOrders`; anonymous access returns `401` and an
  authenticated user without either permission receives `403`.
- Enforcement-mode, link-lifetime, policy draft, and policy publication require
  Super Admin. No salesperson-level override bypasses the active gate.
- Public review/respond requires no employee login because authority is the
  valid, unexpired, unrevoked, revision-bound capability. It grants access only
  to its customer-visible snapshot and one terminal response.
- Existing purchasing, production, packing, and dispatch permissions remain
  mandatory in addition to passing Special Order enforcement.
- The focused `customers.updateCustomerEmail` repair permits
  `editSalesCustomers` or `editOrders`, derives identity from the authenticated
  session, and remains forbidden for dealer-owned customers in office mode.
- Warning Only response metadata grants no additional authority; callers must
  still satisfy the existing permission for the attempted operation.

## Guarded packing report permissions (2026-08-23)

- `viewPacking`, `editPickup`, or `editOrders` grants role-scoped reporting and
  review. A `viewDelivery`/`viewPickup` worker may report only on their assigned
  dispatch and cannot review.
- Reporter and reviewer ids come only from the protected session; forged caller
  actor fields are stripped by the boundary schema.
- Assignment-scoped authority is rechecked after the dispatch lock so a driver
  reassignment cannot race a submit. Context returns server-derived reviewer
  capability, and assignment-only actors do not receive Approve/Reject controls.

## Mobile task and notification boundaries (2026-08-23)

- The client task-trigger router is authenticated and permits only
  `update-sales-control`. Every durable sales-control run revalidates the active
  employee, action-specific permissions, exact sale/dispatch or owned-production
  scope, and replaces caller identity and production elevation with server data.
- Direct cancel, start, submit, packing, and unpack routes derive audit identity
  from the authenticated session; caller-supplied names or ids grant no
  authority and are not written as audit attribution.
- Generic notification task execution is not exposed to clients. Mobile may use
  only the dedicated five-channel notification route for `job_task_configured`,
  `sales_request_packing`, `dispatch_packing_delay`,
  `sales_dispatch_duplicate_alert`, and `sales_dispatch_packing_reset`.
- Job notification authority requires `editJobs`, reloads the active job, and
  derives its contractor recipient. Dispatch notification authority reloads the
  active dispatch, requires the assigned driver or packing/dispatch-manager
  authority, and derives dispatch scope and subscriber recipients server-side.

## Mobile dispatch command boundaries (2026-08-23)

- Mobile detail, manifest, Start Trip, proof completion, and issue reporting
  require the live assigned driver or dispatch manager. A packing operator may
  read/confirm packing only through explicit `viewPacking`, `editPickup`, or
  `editOrders` capability.
- `dispatch.resetPacking` requires `editPickup` or `editOrders`. Only these
  manager capabilities may release already-picked inventory; assignment alone
  never grants that authority.
- Server capabilities are presentation-safe results, not authorization tokens.
  Every mutation reloads the dispatch and rechecks assignment, permission,
  terminal state, pending reviews, special-order policy, and revision under its
  own protected boundary.
- Assigned drivers have no mobile cancellation or generic lifecycle-edit
  route. They use durable Report Issue; reschedule/cancel and reconciliation
  stay in manager workflows.
- Warehouse Packing navigation requires packing or manager capability and is
  also suppressed when the reversible mobile packing-command flag is disabled.

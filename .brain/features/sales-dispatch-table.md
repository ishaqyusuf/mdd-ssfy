# Sales Dispatch Table

## Status
- 2026-08-18: The Finance/Midday-style Dispatch Admin replacement moved to
  `/sales-book/dispatch-admin/v2` for a reversible Super Admin rollout. The
  previous Dispatch Admin dashboard is restored at `/sales-book/dispatch-admin`,
  including its summaries, overdue alert, filters, table/calendar switch,
  export/deleted/sweeper controls, calendar, and workload sidebar.
- 2026-08-18: A follow-up local Wayfinder map now charts the requested
  office-admin and phone-responsive driver workflow, including driver-led
  warehouse quantity verification, partial packing, protected admin approval
  requests, notification/email response, delivery proof, and fulfillment. The
  current Expo/Packing List/ADR-054 authorities remain active until the map's
  decisions are reviewed and approved. See
  `.scratch/dispatch-admin-responsive-driver-workflow/map.md`.
- 2026-08-18: Dispatch Admin was rebuilt as a Sales Finance/Midday-style
  operating workspace with Dashboard, Backlog, Dispatches, Calendar, Drivers,
  and Exceptions. The workspace uses a shared lifecycle projection, URL-backed
  filters/sheets, actionable summaries, durable exception records, and one
  server-owned driver manifest. Remaining automated and runtime validation was
  explicitly deferred by the operator for this stage.
- 2026-08-06: Hardened legacy `Mark as completed` for already-produced orders.
  Pack-all and pack-available now treat an empty production plan as a workflow
  no-op and continue packing existing deliverables; the direct production
  submission command still rejects an empty plan. This covers both fresh
  completion and production-submitted-before-packing states. Authenticated dev
  browser verification completed the first ten visible orders and confirmed
  all ten reached `Ready to fulfill` without the empty-submission error.
- 2026-08-05: Fixed the legacy `Mark as completed` orchestration so pack-all is
  the single owner of auto-assignment, production submission, and packing. The
  command no longer pre-submits production and then fails when pack-all sees an
  empty second submission scope. Direct production submission remains strict
  and still rejects a genuine empty request.
- 2026-08-05: Dispatch workspace access was split by operational capability.
  Delivery-only users now receive the dedicated `/sales-book/dispatch-task`
  route as their visible/default Dispatch link. `/sales-book/dispatch-admin`
  now requires `editOrders`, and direct navigation by a delivery-only user is
  redirected to the task workspace by the authenticated navigation proxy.
- 2026-06-16: Dispatch list routes are migrated to the `tables-2` table standard.
- 2026-07-17: Dispatch density and content-fit widths were tightened against the Sales Orders/Midday invoices standard while keeping the interactive dispatch controls readable.
- 2026-07-27: Admin dispatch single-row and batch menus now reuse the canonical Sales Orders `Mark as` workflow for production completion and fulfillment.

## Dispatch Admin v2 Workspace (2026-08-18)

- `/sales-book/dispatch-admin/v2` is the replacement workspace selected by the
  `section` URL parameter: `dashboard | backlog | dispatches | calendar |
  drivers | exceptions`.
- Lifecycle filters project legacy storage into `ready_to_assign`, `assigned`,
  `packing`, `packing_blocked`, `ready_to_load`, `in_transit`, `fulfilled`, and
  `cancelled` without rewriting historical rows.
- The admin route is a thin server composition boundary. It loads URL/sort
  state and table settings, prefetches only the active section, then hydrates
  the client workspace and always-mounted dispatch sheet.
- The title and five compact summary cards follow Sales Finance. Search,
  filters, PageTabs, table/calendar switching, column tools, and administrative
  overflow share one Midday-style toolbar.
- The URL-owned sheet supports create-from-backlog, assign/reassign, schedule,
  durable exception report/resolve, and detail tabs for overview, packing,
  route/contact, proof, and activity.
- Packing execution still belongs to `/sales/packing-list`. Dispatch Admin
  displays readiness and deep-links into that accepted workflow.
- The workspace table removes unrestricted trip status selection. Assignment,
  scheduling, packing, exceptions, start, proof completion, fulfillment, and
  cancellation retain their guarded domain commands.

## Routes
- Canonical dispatch route: `/sales-book/dispatch`
- Compatibility redirect: `/sales-book/dispatch/v2` redirects to `/sales-book/dispatch` and preserves query params.
- Legacy Admin dashboard: `/sales-book/dispatch-admin?view=table|calendar`
  (`editOrders`)
- Replacement Admin workspace: `/sales-book/dispatch-admin/v2` (Super Admin
  plus `editOrders`; linked only from the Dispatch Admin dropdown)
- Driver task route: `/sales-book/dispatch-task` (`editDelivery` without
  `editOrders`)

## Frontend Implementation
- Dispatch route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch/page.tsx`
- Dispatch redirect: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch/v2/page.tsx`
- Admin route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch-admin/page.tsx`
- Admin v2 route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch-admin/v2/page.tsx`
- Driver route: `apps/dashboard/src/app/(sidebar)/(sales)/sales-book/dispatch-task/page.tsx`
- Legacy calendar: `apps/dashboard/src/components/dispatch-admin/dispatch-calendar-view.tsx`
- Admin v2 calendar: `apps/dashboard/src/components/dispatch-admin/dispatch-calendar-view-v2.tsx`
- Table module: `apps/dashboard/src/components/tables-2/sales-dispatch/*`
- Headers:
  - `apps/dashboard/src/components/dispatch-header.tsx`
  - `apps/dashboard/src/components/dispatch-admin/admin-dispatch-header.tsx`

The table uses the shared `tables-2` domain pattern with typed columns, stable row ids, virtual rows, sticky order columns, column visibility/settings, table-owned horizontal and vertical scrolling, `useScrollHeader(parentRef)` header-offset behavior, empty state, no-results state, row selection, and the existing dispatch row-action flows.

## Density And Widths
- `TABLE_CONFIGS["sales-dispatch"].rowHeight` is `56` with compact table padding. This is intentionally taller than the 40px Sales Orders/Quotes rows because dispatch rows include a schedule picker, two-line Ship To/progress text, and status/driver menus.
- Current content-fit defaults:
  - Schedule: `sizes.custom(118, 180, 136)`
  - Order: `sizes.custom(140, 230, 160)`
  - Order Date: `sizes.custom(104, 150, 118)`
  - Ship To: `sizes.custom(180, 360, 220)`
  - Assigned To: `sizes.custom(132, 220, 160)`
  - Progress: `sizes.custom(118, 180, 132)`
  - Status: `sizes.custom(116, 170, 132)`
  - Actions: `sizes.custom(72, 72)`

## Contracts Reused And Added
- Existing admin/list query: `trpc.dispatch.index`
- Existing driver query: `trpc.dispatch.assignedDispatch`
- Existing server filter loader: `loadDispatchFilterParams`
- Existing client filter hook: `useDispatchFilterParams`
- Existing sort state: `loadSortParams` / `useSortParams`
- Existing mutations and actions for driver assignment, bulk assignment, cancellation, due-date updates, status updates, submit dispatch, and sales overview dispatch opening
- Existing `SalesMenu.MarkAs` workflow for inventory preflight, production completion, fulfillment, task monitoring, and query invalidation
- Added protected admin projections: `dispatch.workspaceSummary`, `backlog`,
  `list`, `calendar`, `driverWorkload`, `exceptions`, and `detail`.
- Added the authenticated `dispatch.driverManifest` projection and durable
  `reportException` / manager-only `resolveException` mutations.

The dispatch table maps selected dispatch rows to their underlying sales order ids
before invoking batch `Mark as`. Duplicate active dispatch rows for one order are
deduplicated so the sales workflow runs once per order. These sales actions are
enabled only by the admin route and only for pending dispatch statuses, including
missing-item rows that must pass the canonical inventory preflight; completed and
cancelled rows, the standard dispatch route, and the driver task route do not
receive them. The dispatch trip status menu remains separate and continues to
own queue/packed/in-progress/completed trip transitions.

The replacement now runs in parallel at `/sales-book/dispatch-admin/v2` while
the previous dashboard remains the canonical admin URL. Both routes share the
existing dispatch, Packing List, inventory, and proof authorities; the split is
only a page-composition and rollout boundary.

## 2026-08-18 Route Split Validation

- Focused sidebar and dispatch migration parity coverage passes with 24 tests
  and 120 assertions.
- Authenticated browser proof confirmed the legacy summary/dashboard and legacy
  calendar at `/sales-book/dispatch-admin`, the new six-section calendar
  workspace at `/sales-book/dispatch-admin/v2`, and the Super Admin-only v2
  dropdown link.
- The replacement workspace still emits its pre-existing PageTabs hydration
  warning when client-saved tab ordering differs from the server ordering; it
  recovers to the correct section after hydration.

## 2026-08-18 Validation Handoff

- Shared lifecycle unit tests, `@gnd/sales` typecheck, dispatch-scoped dashboard
  and mobile TypeScript scans, API dispatch compilation, formatter, diff check,
  and an HTTP 200 route probe were completed during implementation.
- The operator then explicitly requested that all remaining tests and QA be
  skipped. No responsive review, device run, or broad repository validation is
  claimed for this handoff. After a later authenticated runtime failure, the
  additive exception migration was applied locally and the restarted Dispatch
  Admin route rendered its summary and table without the Prisma relation error.

## Cleanup
Removed after import scans:
- `apps/dashboard/src/components/tables/sales-dispatch/data-table.tsx`
- `apps/dashboard/src/components/tables/sales-dispatch/columns.tsx`
- `apps/dashboard/src/components/tables/sales-dispatch/batch-actions.tsx`

`apps/dashboard/src/components/tables-2/core/*` was not modified.

## Validation
- Focused Biome check passed for the dispatch routes, headers, sidebar links, table settings/config, and new sales-dispatch table files.
- Filtered `@gnd/dashboard` typecheck grep reported no diagnostics for touched dispatch route/table/header/config files.
- Import scans found no remaining references to `components/tables/sales-dispatch` or `tables/sales-dispatch`.
- `git diff --check` passed.
- `git diff -- apps/dashboard/src/components/tables-2/core` was clean.
- Browser smoke passed in authenticated sessions:
  - `/sales-book/dispatch?size=5` rendered search, table headers, rows, and table-owned horizontal scroll on desktop and mobile.
  - Search for `07340` updated the URL to `q=07340` and narrowed the dispatch rows.
  - `/sales-book/dispatch/v2?q=07340` redirected to `/sales-book/dispatch?q=07340`.
  - `/sales-book/dispatch-admin?view=table&q=07340&size=1` rendered the admin table on desktop and mobile after the route warmed.
- Caveat: `/sales-book/dispatch-task` still timed out before first byte even when temporarily reduced to static markup, so end-to-end browser smoke for that route remains blocked by a route/access/dev-server issue outside the table module.
- 2026-07-17 density proof:
  - Focused Dispatch parity test passed with 4 tests / 39 assertions.
  - Full `apps/dashboard/src/components/tables-2` suite passed with 293 tests / 2382 assertions.
  - Focused Biome passed for the Dispatch table files and table config.
  - Touched-path `@gnd/dashboard` typecheck scan produced no diagnostics for `sales-dispatch` / `table-configs`.
  - Authenticated browser proof on `/sales-book/dispatch?size=20` confirmed `56px` row height, `45px` header height, vertical table-owned overflow (`scrollHeight 2005` vs `clientHeight 459`), horizontal table-owned overflow (`scrollWidth 1180` vs `clientWidth 1146`), clean scroll movement from `scrollTop 0` / `scrollLeft 0` to `scrollTop 600` / `scrollLeft 34`, and `--header-offset` changing from `0px` to `70px`.
  - Screenshot evidence saved at `/private/tmp/gnd-sales-dispatch-table.png`.
- 2026-07-27 Mark-as action proof:
  - Focused dispatch selection and migration parity coverage was added for distinct orders, duplicate dispatch rows, terminal/invalid rows, and admin-only route wiring.
  - The final scoped diff check passed.
  - The final focused suite, browser QA, and package typecheck were not run under the explicitly requested fast Bun monorepo command discipline.

# Bug Reports Table

## Purpose
The support bug reports route at `/support/bug-reports` lets employees review their submitted bug reports and lets Super Admin users triage all submitted reports.

## Current Implementation
- Route: `apps/www/src/app/(sidebar)/support/bug-reports/page.tsx`
- Workspace component: `apps/www/src/components/bug-reports/bug-report-workspace.tsx`
- Table module: `apps/www/src/components/tables-2/bug-reports/*`
- Access settings route: `apps/www/src/app/(sidebar)/settings/bug-reports/page.tsx`
- Access settings component: `apps/www/src/components/settings/bug-report-access-settings-page.tsx`
- Access settings table module: `apps/www/src/components/tables-2/bug-report-access-employees/*`
- Data sources:
  - `trpc.bugReports.mine.queryOptions()` for normal users
  - `trpc.bugReports.adminList.queryOptions({ status })` for Super Admin users
  - `trpc.bugReports.byId.queryOptions({ id })` for selected report details
  - `trpc.hrm.getEmployees.queryOptions({ accessStatus: "active", size: 200 })` for the Super Admin access settings list, enabled only after the client confirms the authenticated user is Super Admin
- The route uses `PageShell`, `ScrollableContent`, and `getInitialTableSettings("bug-reports")`.
- The workspace keeps the existing detail panel, status update, evidence preview, and follow-up behavior, but replaces the left-side card-mapped report picker with the domain `tables-2/bug-reports` table.
- The table uses the `tables-2` core primitives through a domain table module, with no changes to `components/tables-2/core`.
- The `/settings/bug-reports` route hydrates `getInitialTableSettings("bug-report-access-employees")`, then the guarded client component renders the employee access list through its own domain `tables-2` table.

## Table Behavior
- Compact row styling is registered through `TABLE_CONFIGS["bug-reports"]`.
- Columns are content-tailored:
  - Report: `220/420/280`, sticky
  - Status: `118/170/136`
  - Capture: `110/170/126`
  - Replies: `86/126/96`
  - Submitted: `126/190/146`
  - Actions: `56/80/64`, sticky right
- Row height is `64px`, keeping the report description and submitter readable without returning to large cards.
- The table owns vertical and horizontal scroll, virtual rows, draggable headers, resize handles, persisted visibility/sizing/order, and column divider settings.
- Clicking a report row or the action button selects the report and updates the existing detail panel.
- Super Admin users keep the status filter above the table; all users get the column visibility/divider control.

## Access Settings Table Behavior
- The Super Admin access settings list uses `TABLE_CONFIGS["bug-report-access-employees"]`.
- Columns are content-tailored:
  - Employee: `220/420/280`, sticky
  - Role: `132/220/160`
  - Account: `170/320/210`
  - Status: `112/170/126`
  - Access: `96/130/104`, sticky right
- Row height is `56px`, keeping the settings table dense while leaving enough room for the employee identity and contact text.
- The table owns vertical and horizontal scroll, virtual rows, draggable headers, resize handles, persisted visibility/sizing/order, and column divider settings.
- The access switch remains disabled for Super Admin employees because they are enabled by role, and mutation-pending rows keep their existing loading feedback.

## Preserved Behavior
- Existing report list and detail tRPC contracts are unchanged.
- Existing owner-vs-Super Admin visibility rules are unchanged.
- Existing Super Admin status updates still invalidate `mine`, `adminList`, and selected detail queries.
- Existing follow-up creation still invalidates the list/detail queries and clears the input after success.
- Existing screenshot/video evidence rendering and voice-note follow-up rendering remain in the detail panel.
- Existing bug-report access behavior is unchanged: Super Admin users can toggle employee-specific access, Super Admin employees are enabled by role, and the employee list query stays client-guarded instead of server-prefetched.

## Validation
- Focused parity test: `bun test apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts`
- Full restarted table suite: `bun test apps/www/src/components/tables-2`
- Targeted Biome check over the route, workspace, table module, and table registry.
- Broad `@gnd/www` typecheck still exits on unrelated baseline errors, but the touched-file grep reported no diagnostics for this slice.
- Static scans found no card-mapped report rows, old table import, shared-header pattern, or manual route fetch in the bug reports route/workspace/table surface.
- Runtime route smoke returned `200` from both `https://gndprodesk.localhost:3011/support/bug-reports` and `http://localhost:3010/support/bug-reports` after the dev server booted.
- `git diff --check` passed.
- `apps/www/src/components/tables-2/core` has no diff.
- Access settings follow-up validation: `bun test apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts` passed with coverage that `/settings/bug-reports` hydrates `bug-report-access-employees`, the client component renders the domain table/column visibility control, the guarded employee query is preserved, and the switch/by-role behavior lives in the table columns.

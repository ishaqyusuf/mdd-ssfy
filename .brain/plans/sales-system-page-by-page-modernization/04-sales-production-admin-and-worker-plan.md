# Plan: Sales Production Admin And Worker Modernization

## Type
Feature Modernization

## Status
In Progress - Admin Workspace Complete; Worker Phases Pending

## Sequence
04

## Created Date
2026-07-30

## Last Updated
2026-08-18

## Goal
Provide clear, role-specific production workspaces for administrators and
workers while preserving shared production controls, assignment, material
review, approval, payroll, and fulfillment-release authority.

## Activation Gate
- Sequence 03 is accepted.
- The operator explicitly activates Sequence 04.
- Production state, permission, material, payroll, and fulfillment contracts
  are documented from current behavior.

## Current Context
- Admin routes include `/sales-book/productions` and
  `/sales-book/productions/v2`.
- Worker routes include `/production/dashboard/v2`.
- Admin and worker currently share `ProductionWorkspace` and
  `tables-2/sales-production`.
- Current Brain decisions require assignment before material readiness,
  revision-bound readiness overrides, and nonblocking submission with
  conditional material review.

## Required Invariants
- Assignment, work progress, submission, material verification, approval,
  payroll effect, and fulfillment release remain distinct.
- Workers cannot assign, approve, bypass material review, or alter protected
  order state.
- Admin approval remains the authoritative completion gate.
- Existing revision-bound overrides and audit evidence remain intact.

## Intended Admin Experience
- Queue views: Unassigned, Ready, In progress, Blocked, Awaiting review,
  Material review, Completed.
- Actionable summaries: unassigned, overdue, blocked, awaiting review.
- Views: Queue, Calendar, Capacity, Material review.
- Bulk assignment, priority and due-date actions are permission-gated.
- Detail tabs: Overview, Assignments, Items, Materials, Activity.

## Admin Workspace Decision (2026-08-18)

- `/sales-book/productions` is canonical; `/v2` redirects locally and preserves
  its query.
- The admin shell follows Sales Finance layout and visual primitives.
- PageTabs express work state: Active, Review, Completed.
- Table and Calendar are Active queue display modes, not peer work tabs.
- Summary cards apply queue/review filters and return the operator to the table
  when the selected summary represents a list slice.
- Row, card, and calendar-agenda selection continue to open Sales Overview on
  the production tab.
- P1 and the admin portion of P4 are complete. Capacity and the worker-specific
  phases remain pending and are not implied by the admin workspace release.

## Intended Worker Experience
- My current task, Today, Next, Blocked, Submitted.
- One obvious primary action: start, pause/resume, report blocker, or submit.
- Large touch targets and mobile-safe task details.
- Offline-safe draft for notes/evidence where practical.
- No administrative queue or approval controls.

## Incremental Phases

### P0 - State, Role, And Baseline Map
- Record routes, query families, status transitions, assignments, controls,
  material rules, overrides, approval effects, notifications, and permissions.
- Create representative admin/worker fixtures and overdue/blocked/material
  cases.

### P1 - Admin Queue Shell
- Put the queue ahead of decorative hero/calendar content.
- Align compact header, summaries, filters, columns, and mobile behavior.
- Preserve all transitions.

### P2 - Worker Workspace
- Build the `scope=mine` task hierarchy.
- Keep admin and worker presentation separate while reusing domain contracts.
- Validate mobile and interruption behavior.

### P3 - Production Detail
- Consolidate detail/open behavior into one URL-owned composition.
- Separate overview, assignment, item, material, and activity loading.

### P4 - Calendar, Capacity, And Material Review
- Load calendar/capacity only when selected.
- Add capacity only from trustworthy assignment/due-date data.
- Preserve conditional material verification and audit trails.

### P5 - Route And Query Consolidation
- Select canonical routes after usage and parity evidence.
- Consolidate duplicate read models only after measured payload/query analysis.

### P6 - Cleanup
- Remove proven unused workspace/query variants.
- Record operator acceptance and production-control regression evidence.

## Data And Permission Direction
- Lean paginated production rows; summary, calendar, capacity, and detail remain
  separate queries.
- All internal reads and mutations require protected, office-scoped access.
- Transitions are server-validated, idempotent where retries are possible, and
  audit logged.
- Optimistic UI is limited to safe presentation state.

## Likely File Areas
- Production routes under `apps/dashboard/src/app/(sidebar)/(sales)`
- `apps/dashboard/src/components/production-workspace.tsx`
- `apps/dashboard/src/components/production-work-sheet.tsx`
- `apps/dashboard/src/components/tables-2/sales-production/*`
- Production hooks, params, summaries, calendar, and material-review components
- `apps/api/src/trpc/routers/sales.route.ts`
- Production DB queries and control services
- `packages/sales/src/control/*` and `packages/sales/src/sales-control/*`

## Validation
- Role/permission matrix tests
- Production transition and revision-override tests
- Material review, inventory reconciliation, approval, payroll, and fulfillment
  regressions
- Admin desktop and worker mobile browser proof
- Query-count, list-size, calendar, and sheet-open measurements
- Interruption, double-submit, stale revision, and blocked-material fixtures

## Non-Goals
- Rebuilding Packing or Dispatch
- Weakening production approval/readiness controls
- Combining worker and admin actions in one toolbar
- Route removal before telemetry

## TODO
- Select the final canonical worker URL.
- Approve capacity metrics and worker scheduling rules.
- Confirm which worker actions require offline drafts.

## Completion Gate
Both admin and worker journeys require operator acceptance before Sequence 05.

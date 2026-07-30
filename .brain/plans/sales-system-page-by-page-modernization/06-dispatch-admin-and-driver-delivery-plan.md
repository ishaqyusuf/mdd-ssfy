# Plan: Dispatch Admin And Driver Delivery Modernization

## Type
Feature Modernization

## Status
Deferred - Activate Only After Sequence 05 Acceptance

## Sequence
06

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Provide one coherent dispatch operating model across admin scheduling,
assignment, driver workload, mobile route execution, delivery exceptions, and
proof completion.

## Activation Gate
- Sequence 05 is accepted and packing readiness is authoritative.
- The operator explicitly activates Sequence 06.
- Dispatch reads, permissions, statuses, mobile flows, proof, and retry behavior
  have a reproducible baseline.

## Current Context
- Web routes include `/sales-book/dispatch`, `/sales-book/dispatch-admin`,
  `/sales-book/dispatch-task`, and `/sales-book/dispatch/v2`.
- Mobile driver routes include dispatch home, all assignments, detail, and
  delivery completion.
- The admin page includes status summaries, queue/calendar tools, driver
  workload, export, deleted records, and duplicate resolution.
- Resumable/idempotent delivery proof already supports signature and photos.
- Several internal dispatch/packing reads currently require an explicit
  protected-procedure and ownership audit before broader redesign.

## Required Invariants
- Packing readiness, driver assignment, trip state, proof, and exception state
  remain distinct.
- A driver can operate only assigned work unless a protected administrative
  capability explicitly allows otherwise.
- Starting a trip requires valid assignment, readiness, and server-authorized
  transition.
- Delivery completion remains idempotent and proof-bound.
- Customer contact, address, proof, deleted records, and exports remain
  protected and office-scoped.

## Intended Admin Experience
- Views: Queue, Calendar, Drivers, Exceptions.
- Actionable summaries: Unassigned, due/overdue, in transit, exceptions.
- Default rows: schedule, order/customer, zone/address, driver, packing
  readiness, trip status, risk, and actions.
- Actions: assign/reassign, schedule/reschedule, notify, export, guarded cancel,
  and resolve exception.
- Detail tabs: Overview, Items/Packing, Route/Contact, Proof, Activity.

## Intended Driver Experience
- Today manifest, next stop, remaining/completed stops, exceptions, and sync
  state.
- Server-ranked route/urgency, not counts or ordering derived only from loaded
  client pages.
- Journey: verify load, start, navigate, arrive, deliver/report exception,
  capture proof, confirm sync.
- Real map/directions provider or native deep link; no static placeholder map.
- Offline queue, resumable uploads, compression, retry, and visible sync state.

## Incremental Phases

### D0 - Security, State, And Baseline
- Audit every public/protected procedure, ownership rule, office scope, export,
  deleted-record path, and no-user fallback.
- Record current state strings and map them to separate readiness, assignment,
  trip, proof, and exception concepts.
- Harden security before expanding UI access.

### D1 - Admin Page Shell
- Consolidate header, approved summaries, toolbar, responsive layout, and views.
- Preserve transitions, calendar, workload, export, and deleted behavior.

### D2 - Queue And Assignment
- Align columns and server-backed filters.
- Add guarded bulk assign/reschedule only after permission and audit tests.

### D3 - Calendar, Drivers, And Exceptions
- Move workload into Drivers.
- Replace isolated duplicate tools with an audited Exceptions view.
- Keep analytics out of the operational queue.

### D4 - Dispatch Detail
- Consolidate sheet/open behavior and lazy tabs.
- Keep packing, contact, proof, and activity permission boundaries explicit.

### D5 - Driver Home And Manifest
- Replace client-derived urgency/counts with server-ranked assignments.
- Add next-stop focus, sync state, and safe contact/navigation actions.

### D6 - Delivery Execution And Proof
- Preserve current resumable proof contract.
- Add offline/background behavior and real directions.
- Validate start, arrive, exception, and completion transitions under retries.

### D7 - Route And Legacy Cleanup
- Choose canonical admin and driver web fallback routes after usage evidence.
- Preserve compatibility redirects and remove only unused status helpers.

## Data And Permission Direction
- Lean cursor-paginated dispatch list; separate summary, calendar, driver
  workload, exceptions, detail, and export contracts.
- Exports are bounded or asynchronous and manager-only.
- Mobile transitions use idempotency keys and durable activity evidence.
- Location is opt-in, purpose-limited, and never inferred as authorization.

## Likely File Areas
- Dispatch routes under `apps/dashboard/src/app/(sidebar)/(sales)/sales-book`
- `apps/dashboard/src/components/dispatch-admin/*`
- `apps/dashboard/src/components/tables-2/dispatch/*`
- Dispatch sheets, headers, filters, and query hooks
- `apps/mobile/src/app/(drivers)/dispatch/*`
- `apps/mobile/src/features/dispatch/*`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/api/src/db/queries/dispatch.ts`
- `apps/api/src/db/queries/dispatch-proof-completion.ts`

## Validation
- Protected-procedure, office-scope, ownership, export, and deleted-data tests
- Transition, double-submit, stale assignment, and proof idempotency tests
- Admin desktop/mobile web validation
- Driver device validation for online, offline, interrupted upload, and retry
- Map/deep-link, contact, notification, and exception regressions
- Duplicate dispatch and route-order fixtures

## Non-Goals
- Reopening accepted Packing design
- Continuous driver surveillance
- Automatic route optimization without approved operational rules
- Removing compatibility routes before parity

## TODO
- Confirm whether dispatch supports split loads and multiple stops per run.
- Select the real maps/directions integration.
- Approve schedule-window, route-zone, and exception taxonomy.

## Completion Gate
Admin and driver acceptance, security evidence, and proof reliability are
required before Sequence 07.

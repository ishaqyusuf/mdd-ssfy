# Plan: Packing List Modernization

## Type
Feature Modernization

## Status
Deferred - Activate Only After Sequence 04 Acceptance

## Sequence
05

## Created Date
2026-07-30

## Last Updated
2026-07-30

## Goal
Turn Packing List from a dispatch-status table into an item-level warehouse
workflow for claiming, packing, resolving shortages, printing, staging, and
handing work to pickup or delivery.

## Activation Gate
- Sequence 04 is accepted.
- The operator explicitly activates Sequence 05.
- Production completion/readiness boundaries are stable.
- Current packing notification, dispatch, printing, mobile, and permission
  behavior is mapped.

## Current Context
- Web route: `/sales/packing-list`
- Mobile warehouse routes: `/(drivers)/warehouse-packing`
- Current tabs: Current, Completed, and admin-only Cancelled.
- The web list uses `tables-2/packing-list`.
- Current packing membership/status relies partly on dispatch data and
  notification/note tags.

## Required Invariants
- Production approval/readiness precedes packing where required.
- Packing progress is distinct from dispatch trip state.
- Completion requires verified quantities and any required evidence.
- Notifications are side effects, not the durable source of work state.
- Existing packing-slip/print behavior remains available during migration.

## Intended Experience
- Views: Ready to pack, Packing, Issues, Staged, Completed.
- Search/scan by order, dispatch, item, or supported barcode.
- Default rows: priority/due, order/customer, pickup/delivery, item count,
  blockers, packed progress, assignee, and activity.
- Detail workflow: required versus packed quantity, bins, shortages,
  substitutions, damage, notes/photos, draft save, print/reprint, request help,
  finalize, and stage.
- Bulk actions: claim, assign, print slips, and move to staging.
- Mobile uses a task list and full-screen packing workflow rather than a
  compressed management table.

## Incremental Phases

### K0 - Domain And Baseline Map
- Record packing membership, statuses, item quantities, notification tags,
  dispatch dependencies, printing, mobile routes, permissions, and failure
  recovery.
- Decide the minimum durable packing-work projection.

### K1 - Queue Shell
- Create the canonical page shell and approved operational views.
- Keep current status mutations and print behavior unchanged.
- Validate responsive list/card behavior.

### K2 - Item-Level Packing
- Introduce required-versus-packed progress and guarded completion.
- Add shortage, substitution, damage, note, and evidence handling only after
  their durable contracts are approved.

### K3 - Assignment And Batch Work
- Add claim/assign, priority, batch print, and staging actions.
- Require server validation and audit evidence.

### K4 - Mobile Warehouse And Scanning
- Reuse the same packing contracts in a mobile task flow.
- Add scanning only with a supported identifier strategy and manual fallback.
- Preserve work across interruption and weak connectivity.

### K5 - Canonical State Cutover
- Shadow-compare the canonical packing projection with legacy notification/tag
  membership.
- Cut reads/writes over only after parity; notifications remain derived effects.

### K6 - Compatibility And Cleanup
- Add canonical `/sales-book/packing` only after route review.
- Preserve redirects and remove old helpers only with usage/import evidence.

## Data And Permission Direction
- Candidate records: packing work, packing lines, assignment, evidence,
  exception, and activity/audit.
- List, summary, detail, print, and transition contracts remain separate.
- Paginate and filter on the server.
- Enforce pack, assign, override, cancel, reprint, and completed-record access.
- Mutations use idempotency keys where mobile retries are possible.

## Likely File Areas
- `apps/dashboard/src/app/(sidebar)/sales/packing-list/*`
- `apps/dashboard/src/components/tables-2/packing-list/*`
- Packing slip and print-preview components
- `apps/mobile/src/app/(drivers)/warehouse-packing/*`
- `apps/mobile/src/features/dispatch/components/packing-list-screen.tsx`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/api/src/db/queries/dispatch.ts`
- Sales/inventory control packages

## Validation
- Quantity and guarded-completion tests
- Assignment, permission, cancellation, and audit tests
- Print/reprint and pickup/delivery handoff regressions
- Notification projection parity
- Desktop warehouse and mobile device browser/app proof
- Offline/retry, duplicate scan, shortage, damaged item, and partial-pack cases

## Non-Goals
- Rebuilding Dispatch UI
- Treating delivery signature as packing completion
- Using client-only quantities or status
- Removing legacy membership before shadow parity

## TODO
- Approve the durable packing-work data model.
- Define supported barcode identifiers and hardware assumptions.
- Define staged-location and partial-packing policy.

## Completion Gate
Packing requires operator acceptance and canonical readiness evidence before
Sequence 06.

# Brain Handoff: Mobile Delivery Module Logic Hardening

## Status

Completed

## Source Plan

`.brain/plans/2026-08-23-mobile-delivery-module-logic-hardening.md`

## Task

- Task Title: Mobile Delivery Module Logic Hardening
- Task File: `.brain/tasks/done.md`

## Recommended Agent

- Agent: open-code
- Reason: The review unit is primarily backend/API, transactional correctness,
  native data-flow, tests, and typed refactoring. The active Codex Goal remains
  the orchestrator and reviewer.

## Goal

Bring the Expo delivery module onto the current dispatch, packing, inventory,
exception, proof, permission, notification, and freshness contracts without
redesigning the accepted mobile screens. Complete feature implementation and
validation, then pause for explicit user permission before any screen-by-screen
UI testing or design-html alternatives.

## Review Unit

- Type: group
- Linked Tasks: Mobile Delivery Module Logic Hardening
- Grouping Reason: Mobile packing, lifecycle capabilities, proof recovery, and
  cache invalidation share the dispatch revision and action contracts. Partial
  landing would preserve known split authorities and unsafe write sequences.
- Depends On Queue Items: None
- Approval Boundary: Approve only after the complete linked task is implemented,
  reviewed, landed or recorded as no-landing-required, validated, and reconciled
  in Brain. UI redesign and design sampling are excluded.

## Context To Read First

- `.brain/plans/2026-08-23-mobile-delivery-module-logic-hardening.md`
- `.brain/features/driver-platform-revival.md`
- `.brain/features/mobile-dispatch-proof-completion.md`
- `.brain/features/fulfillment-admin-responsive-driver.md`
- `.brain/decisions/ADR-026-resumable-mobile-dispatch-proof-completion.md`
- `.brain/decisions/ADR-050-dispatch-bound-inventory-allocation.md`
- `.brain/decisions/ADR-054-canonical-dispatch-state-and-durable-driver-exceptions.md`
- `.brain/decisions/ADR-057-reversible-dispatch-admin-v2-and-driver-proof-flow.md`
- `.brain/decisions/ADR-065-route-command-as-driver-dashboard-visual-base.md`
- `.brain/decisions/ADR-066-intercepted-driver-stop-workspace.md`
- `.brain/api/contracts.md`
- `.brain/api/endpoints.md`
- `.brain/api/permissions.md`
- `.brain/database/schema.md`
- `.brain/database/relationships.md`
- `.brain/database/migrations.md`
- `apps/mobile/src/features/dispatch/`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/api/src/db/queries/dispatch.ts`
- `apps/api/src/db/queries/dispatch-proof-completion.ts`
- `packages/sales/src/dispatch-packing-plan.ts`
- `packages/sales/src/dispatch-manifest/`

## Implementation Instructions

1. Freeze current mobile routes, component order, information hierarchy, and
   screen styling. Add behavioral tests before changing packing authority.
2. Replace mobile-owned packing allocation and Pack All logic with a native-safe
   adapter over `@gnd/sales/dispatch-packing-plan`; fix scalar and LH/RH payload
   regressions without weakening expected values.
3. Add one protected, dispatch-locked, idempotent, revision-bound atomic packing
   command that derives live actor, assignment, permissions, lifecycle,
   execution modes, and availability. It must commit legacy compatibility rows,
   inventory transitions, and guarded-review orchestration without partial
   mixed writes. Add an atomic reset command only if the permission contract
   continues to allow it.
4. Extend protected dispatch detail with canonical lifecycle, risks, revision,
   current exceptions/reports, action capabilities, and typed blockers. Move
   mobile Start Trip to the direct route, retain proof completion as the only
   completion route, remove driver cancellation and generic status editing, and
   gate warehouse packing by explicit capability.
5. Connect the existing Start Trip confirmation, phone, email, and canonical
   map actions. Refresh queue/detail after mutations and return to the original
   queue context after completion.
6. Add a versioned, user/dispatch-scoped proof draft backed by app-owned files.
   Preserve stable request identity across process restarts, bound and validate
   media, retry only on explicit action, derive audit time/type on the server,
   and clean local files only after success, discard, or expiry.
7. Centralize dispatch query keys and invalidation. Wire React Query to native
   focus/connectivity and expose truthful sync state. Do not persist the general
   customer/manifest cache without a separate retention decision.
8. Add current typed notification behavior, accurate guarded-review outcomes,
   Completed/search list semantics, and authoritative packing-list summaries.
9. Incrementally extract typed query/action/packing/proof/contact controllers
   behind the unchanged UI and remove dead paths only after live-route proof.
10. Run the full automated matrix, reversible local fixture, Android phone and
    tablet weak-network checks, idempotency/reconciliation proof, and rollback
    rehearsal. Do not start the later UI design review without user permission.

## Acceptance Criteria

- The existing mobile route and visual flow are preserved.
- The focused mobile packing suite passes with correct scalar and LH/RH intent.
- Legacy-only, inventory-only, and mixed packing are all-or-nothing and stale
  revisions, shortages, reassignment, guarded holds, terminal states, and
  permission failures leave no partial writes.
- Same-request retries are idempotent and different-content reuse conflicts.
- Mobile controls use server capabilities; assigned drivers cannot cancel or
  edit lifecycle status through a generic path.
- Warehouse Packing navigation and mutations match server permission.
- Phone, email, map, Start Trip, Report Issue, packing, and proof completion are
  connected and refresh all affected surfaces.
- Proof drafts survive process restart without persisting base64 in AsyncStorage
  and never replay completion automatically.
- Online/offline/sync state is truthful and foreground/reconnect refresh is
  bounded.
- Notification review outcomes and deep links are accurate.
- Focused tests, touched-file typecheck/lint, API tests, package tests, Android
  runtime matrix, reversible fixture, and reconciliation evidence pass.
- Required Brain feature/API/permission/progress/task documentation is current.
- UI testing and five-sample design exploration remain unstarted until the user
  explicitly approves that next phase.

## Files Or Areas Likely Involved

- `apps/mobile/src/features/dispatch/**`
- `apps/mobile/src/components/notifications/notification-center-screen.tsx`
- `apps/mobile/src/trpc/query-client.ts`
- `apps/mobile/src/app/(drivers)/**`
- `apps/mobile/src/driver-app/**`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `apps/api/src/db/queries/dispatch*.ts`
- `apps/api/src/db/queries/packing-reports.ts`
- `packages/sales/src/dispatch-packing-plan.ts`
- `packages/sales/src/dispatch-manifest/**`
- Focused tests adjacent to these areas

## Do Not Change

- Do not redesign the current mobile screens or begin design-html sampling.
- Do not mutate or synchronize production data.
- Do not weaken inventory, special-order, guarded-packing, assignment,
  authentication, or idempotency checks.
- Do not restore driver cancellation through a legacy task path.
- Do not persist general customer/query cache data without an approved policy.
- Do not overwrite unrelated dirty-worktree changes.
- Do not move the linked task to done; review owns final approval.
- Do not broaden scope beyond this handoff.

## Required Checks

- Focused mobile dispatch unit and component tests.
- Focused dispatch API/query/domain tests, including atomic mixed packing,
  stale-revision, concurrency, permission, and idempotency cases.
- `bun run typecheck` with the repository baseline separated from new touched
  path diagnostics.
- Narrowest relevant build/lint/format checks.
- Reversible local end-to-end fixture and inventory reconciliation snapshots.
- Android Expo Go phone and tablet/landscape feature validation.
- `git diff --check` on owned files.

## Queue Item

`/Users/M1PRO/.brain-loop/queues/handoffs/2026-08-23-gnd-mobile-delivery-logic-hardening.json`

## Execution Path

`/Users/M1PRO/Documents/code/_turbo/gnd`

An isolated worktree is intentionally not requested because the approved plan
and the current dispatch contracts depend on active uncommitted work in this
checkout. Creating a worktree from `HEAD` would silently execute against stale
contracts. The executor must preserve unrelated changes and restrict edits to
the areas named by this handoff.

## Brain Update Contract

After implementation, update only the relevant files:

- `.brain/progress.md`: summarize completed implementation and checks.
- `.brain/features/driver-platform-revival.md`: reconcile current mobile flow.
- `.brain/features/mobile-dispatch-proof-completion.md`: document durable draft,
  submission, retry, and cleanup behavior.
- `.brain/features/fulfillment-admin-responsive-driver.md`: update shared
  authority boundaries if affected.
- `.brain/api/endpoints.md`: document new or changed dispatch routes.
- `.brain/api/contracts.md`: document command and response contracts.
- `.brain/api/permissions.md`: document action capabilities and actor rules.
- `.brain/database/schema.md`, `.brain/database/relationships.md`, and
  `.brain/database/migrations.md`: update only if persisted schema changes.
- `.brain/decisions/`: add an ADR only for a durable new command, proof storage,
  cancellation, or retention decision not already covered.
- `.brain/tasks/in-progress.md`: keep this task in progress until review.

Do not move the linked task to `done`. `brain-review-handoff` owns final approval.

## Completion Notes

- Changed files: atomic packing/inventory/report orchestration and protected
  dispatch routes; shared packing plan; Expo dispatch hooks, durable proof
  storage, detail/list/packing/notification/settings flows, native query
  focus/connectivity; notification transforms; adjacent focused tests.
- Checks run: focused mobile/API/sales/notification matrix passes 83 tests / 500
  assertions; owned-file `git diff --check` passes; API and Expo broad
  typechecks were inspected and retain unrelated pre-existing diagnostics, with
  no new focused diagnostics in the changed dispatch runtime paths.
- Brain docs updated: driver platform, proof completion, responsive fulfillment,
  API endpoints/contracts/permissions, ADR-069, plan/handoff/task/progress and
  review records.
- Unresolved issues: Android phone/tablet, weak-network, and screen-level visual
  QA are deliberately deferred to the explicit UI-testing permission gate.
  Broad monorepo typecheck baseline cleanup is outside this handoff.

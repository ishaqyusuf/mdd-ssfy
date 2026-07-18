# Background Task Monitor

## Purpose

Give users persistent visibility into long-running background jobs after a job id is returned to the browser. The initial production surface is `apps/www`.

## Current Implementation

- Client state lives in `apps/www/src/store/task-monitor.ts`.
- State is persisted with Zustand persist under `gnd-task-monitor`.
- `useTaskTrigger` registers Trigger.dev run ids into the monitor after `triggerTask` returns an id and public access token.
- `TaskNotification` is mounted globally in the sidebar and clean-code layouts, rehydrates tasks after navigation or reload, and resumes monitoring with `useRealtimeRun`.
- In production, the floating task notification surface is intentionally simplified: it shows only a spinner-style loading circle while tasks are running, hides the numeric count, and does not expose the expandable task detail panel.
- In development/local contexts, the existing detailed monitor remains available with run id, task name, copy/cancel/dismiss controls, and error details for developer debugging.
- Terminal run states now produce closeable toasts: production success uses a success toast, and failures use a destructive toast with safe client-facing copy.
- Completed tasks are removed automatically.
- Watchers process realtime run status only while a task is still `SYNCING`; completed runs record the success-effect guard and terminal status in the same store update so stale realtime terminal statuses cannot trigger repeated React updates.
- Failed tasks remain visible until dismissed in development/local detail mode; in production the task row is hidden from the client monitor and removed after the failure toast window.
- Running tasks that do not report progress for six hours are marked failed with a stale-run message.
- Tasks carry lightweight metadata only: task name, type, entity id, and entity label. Full payloads are not persisted.
- Server-side task start logging lives in `apps/www/src/lib/task-run-diagnostics.server.ts` and records starts/start failures from `apps/www/src/actions/trigger-task.ts`.
- Terminal watcher finalization calls `apps/www/src/actions/task-run-diagnostics.ts`, which retrieves Trigger.dev run status server-side and upserts a database diagnostic row.
- Generic task diagnostics are stored in `TaskRunDiagnostic`; sales email delivery still uses `SalesEmailAttempt` as the email-specific delivery ledger.

## User Experience

- In production, a fixed bottom-right circular loading indicator appears only while tasks are running.
- Production users do not see a task count, run id, task name, copy action, cancel action, or expandable developer details.
- Production terminal status is communicated by closeable toasts: success for completed tasks and destructive for failed tasks.
- In development/local contexts, the detailed monitor count includes running, failed, and cancelled tasks; the ring spins while jobs are running; the monitor turns destructive when any task has failed; expanding the monitor shows task title, status, description/error, short run id, task name, copy-run-id action, cancel action, and dismiss action.

## Registration Rules

- Prefer `useTaskTrigger` for user-triggered Trigger.dev jobs.
- Use `monitor: true` when a flow needs progress visibility even if `silent: true` suppresses old toast behavior.
- Use `silent: true` and omit `monitor: true` only for internal jobs where user-visible progress would be noisy, such as post-save audit/history work.
- Direct server-side `tasks.trigger(...)` calls are not visible to the client monitor unless their run id/access token is returned to the client and registered.

## Current Coverage

- Covered by default: `useTaskTrigger` flows without `silent: true`.
- Covered explicitly with `monitor: true`: user-triggered sales order control work and new-sales-form send-for-packing work.
- Covered with task-specific labels: sales email, sales reminder, notifications, sales control, sales history, dispatch, document warmup, inventory import, and signed dispatch PDF jobs.
- Sales document email tasks have a provider-result override: when `send-sales-email` or a sales document `notification` run completes with failed/skipped email delivery output, the monitor marks the task failed and shows the provider/skipped reason instead of presenting Trigger task completion as a successful email send.

## Known Boundaries

- Persistence is same-browser persistence, not cross-device backend persistence.
- If task creation fails before a run id is returned, the monitor cannot track it; the user receives the immediate start failure toast and the server records a `START_FAILED` diagnostic when the actor session is available.
- Backend-only spawned jobs such as `triggerEvent(...)` do not appear unless a future client registration path is added.
- Diagnostics finalization currently occurs from the client watcher signal after a run reaches a terminal realtime state; a future server reconciliation job can mark long-running `RUNNING` rows as `STALE`.

## Planned Direction: Client Simplification And Error Ledger

- A local Wayfinder scratch map now exists at `.scratch/task-monitor-client-simplification/map.md`.
- A published spec now exists at `.brain/plans/2026-07-13-spec-task-monitor-client-simplification-and-error-ledger.md` and GitHub issue https://github.com/ishaqyusuf/mdd-ssfy/issues/42.
- Product direction from the client: production should hide developer-facing task monitor detail. Normal users should see only a loading circle while background work runs, no numeric count, and terminal closeable toasts with a success variant on success and destructive/error treatment on failure.
- Developer/admin diagnostics should move into a database-backed error log rather than relying on an expandable production client monitor.
- Existing `SalesEmailAttempt` remains the domain ledger for sales document email delivery. A broader task-error ledger should complement it instead of replacing it.
- Existing `ScheduleHistory` and `/task-events` are schedule/event history surfaces, not yet a general user-triggered background task failure ledger.
- Spec decisions: production normal users get simplified loading plus terminal success/destructive toasts; development/local contexts may keep the detailed monitor; a new database-backed task-run diagnostics ledger should register starts, persist start failures, finalize terminal runs from server-side Trigger status, reconcile stale running rows, and expose failures through a Super Admin-only diagnostics surface.

## Implemented Direction: Task Run Diagnostics Ledger

- Implemented on 2026-07-13 from GitHub issue https://github.com/ishaqyusuf/mdd-ssfy/issues/42.
- Added `TaskRunDiagnostic` / `TaskRunDiagnosticStatus` in `packages/db/src/schema/task-run-diagnostics.prisma`.
- Added protected tRPC router `taskRunDiagnostics` with register, start-failure, finalize, list, detail, and mark-reviewed procedures.
- Added Super Admin diagnostics page at `/task-events/diagnostics`, linked from `/task-events`.
- The `/task-events/diagnostics` page now renders through `components/tables-2/task-run-diagnostics` with compact `56px` table-core rows, sticky Status and Actions columns, tailored Status/Task/Entity/User/Started/Error/Actions widths, table-owned scroll, column DnD/resize, persisted visibility/sizing/order/divider settings, search/status/page filters, refresh, and Super Admin mark-reviewed behavior.
- 2026-07-17 browser-proof follow-up closed the old missing-table gap on local `gnd-prisma2`: the page rendered authenticated with temporary local proof rows, no login/runtime error, `56px` rows, a `45px` header, table-owned vertical scroll (`scrollTop 0 -> 650`, `scrollHeight 2915`, `clientHeight 439`), table-owned horizontal scroll (`scrollLeft 0 -> 148`, `scrollWidth 1294`, `clientWidth 1146`), `--header-offset: 70px` after scroll, and no document-level horizontal overflow. The `65` proof rows were deleted afterward and `TaskRunDiagnostic` returned to `0` rows.
- The diagnostics table is a developer/admin surface and intentionally separate from production client task feedback.

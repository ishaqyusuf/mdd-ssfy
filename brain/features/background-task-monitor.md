# Background Task Monitor

## Purpose

Give users persistent visibility into long-running background jobs after a job id is returned to the browser. The initial production surface is `apps/www`.

## Current Implementation

- Client state lives in `apps/www/src/store/task-monitor.ts`.
- State is persisted with Zustand persist under `gnd-task-monitor`.
- `useTaskTrigger` registers Trigger.dev run ids into the monitor after `triggerTask` returns an id and public access token.
- `TaskNotification` is mounted globally in the sidebar and clean-code layouts, rehydrates tasks after navigation or reload, and resumes monitoring with `useRealtimeRun`.
- Completed tasks are removed automatically.
- Watchers process realtime run status only while a task is still `SYNCING`; completed runs record the success-effect guard and terminal status in the same store update so stale realtime terminal statuses cannot trigger repeated React updates.
- Failed tasks remain visible until dismissed.
- Running tasks that do not report progress for six hours are marked failed with a stale-run message.
- Tasks carry lightweight metadata only: task name, type, entity id, and entity label. Full payloads are not persisted.

## User Experience

- A fixed bottom-right circular monitor appears only when there are running or failed tasks.
- The monitor count includes both running and failed tasks.
- The ring spins while jobs are running.
- The monitor turns destructive when any task has failed.
- Expanding the monitor shows task title, status, description/error, short run id, task name, copy-run-id action, and dismiss action for failed tasks.

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
- If task creation fails before a run id is returned, the monitor cannot track it; the user receives the immediate start failure message.
- Backend-only spawned jobs such as `triggerEvent(...)` do not appear unless a future client registration path is added.

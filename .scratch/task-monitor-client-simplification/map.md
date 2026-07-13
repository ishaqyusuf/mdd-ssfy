# Wayfinder: Task Monitor Client Simplification And Error Ledger

## Local Scratch Tracker

This is a local Wayfinder scratch map because no repo issue-tracker Wayfinder operations were configured for this session.

## Destination

Reach an implementation-ready decision map for simplifying the background task monitor in production while preserving developer/admin diagnostics. The final spec should let an agent implement the change without re-deciding production UX, durable error persistence, permissions, or validation gates.

## Notes

- Domain: `apps/www` background task monitor, Trigger.dev run feedback, developer/admin task diagnostics, and database-backed failure audit.
- Current client state lives in `apps/www/src/store/task-monitor.ts` and is persisted in the browser under `gnd-task-monitor`.
- `TaskNotification` is globally mounted in sidebar and clean-code layouts and currently shows a bottom-right floating monitor with a task count, expandable rows, run ids, task names, copy/cancel/dismiss controls, and detailed error text.
- `useTaskTrigger` starts Trigger.dev tasks, registers monitored runs, watches `useRealtimeRun`, and currently emits success/error toasts only when the task is not monitor-backed. Monitor-backed tasks rely mostly on the task monitor surface.
- Sales document email failures already have a domain-specific durable ledger through `SalesEmailAttempt`; this should remain the email delivery source of truth.
- `ScheduleHistory` and `/task-events` are for scheduled/admin task events, not a general run-error ledger for user-triggered background work.
- The client request is that production hides developer-facing monitor details. Users should see a loading circle while a task runs, no numeric count, no expanded task detail panel, and terminal closeable toasts with a success variant on success and destructive/error treatment on failure.
- Developer/admin error detail should move to a database-backed place where failures can be reviewed and fixed.
- Follow repo Brain protocol and React/Next.js UI skill expectations before implementation. For implementation, prefer the repo order: Schema -> API -> UI -> Validation -> Polish.

## Decisions So Far

- The conversation was synthesized into a published spec: `.brain/plans/2026-07-13-spec-task-monitor-client-simplification-and-error-ledger.md`.
- GitHub issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/42.
- The spec resolves the production UX direction as simplified loading plus terminal toasts for normal users, while developer diagnostics move into a database-backed task-run ledger with Super Admin review.
- The spec keeps `SalesEmailAttempt` as the sales-email source of truth and treats the generic task ledger as complementary diagnostics.

## Frontier Tickets

### Define Production And Development Task Feedback Contract

- Type: `grilling`
- Status: Open
- Blocked by: none

#### Question

What exact task feedback contract should `apps/www` use across production and non-production? Decide whether production shows only a spinner button, whether non-production keeps the full expandable monitor, whether users can cancel tasks from production, which task starts show spinner toasts versus global spinner state, and how success, failure, cancellation, and stale runs should map to closeable toasts.

#### Known Inputs

- User requested no count in production and no client-facing developer details.
- Existing monitor-backed tasks currently suppress ordinary success toasts.
- Toast variants available today include `success`, `error`, `spinner`, and `destructive`; the user specifically requested destructive for errors.
- Existing `@gnd/ui` toaster keeps one toast visible at a time and supports a close control.

#### Expected Resolution

A short UX contract covering production, development, and test/local behavior plus the exact toast copy principles. It should identify which current monitor affordances are removed, retained in dev only, or replaced by toast behavior.

### Choose Durable Task Error Ledger Data Model

- Type: `research`
- Status: Open
- Blocked by: none

#### Question

Should general task failures be stored in a new database model, an extension of an existing model, or a domain-specific set of ledgers? Decide the model name, indexes, retention fields, PII redaction posture, relation snapshots, and whether successful runs are stored or only failures.

#### Known Inputs

- `SalesEmailAttempt` already stores email delivery attempts and should not be replaced by a generic task log.
- `ScheduleHistory` is event-schedule history and does not fit user-triggered task run failures cleanly.
- Useful fields likely include run id, task name, status, error message, run error/output summary, actor id, entity metadata, started/finished timestamps, source surface, environment, and retry/dismiss metadata.

#### Expected Resolution

A schema/API direction that distinguishes general task failures from domain-specific ledgers while giving Super Admin or developers enough context to debug production failures.

### Define Failure Logging Source Of Truth

- Type: `research`
- Status: Open
- Blocked by: Choose Durable Task Error Ledger Data Model

#### Question

Where should failures be persisted from so the database log is reliable without exposing details to clients? Decide how to handle queue/start failures, Trigger terminal failures, completed runs whose output indicates domain failure, monitor websocket errors, cancellation, and stale client-side timeouts.

#### Known Inputs

- The current client watcher can see terminal run state only while the browser has a run id/access token.
- Trigger.dev itself has server-side run retrieval through `runs.retrieve`.
- `useTaskTrigger` can detect start failure before a run id exists.
- `TaskNotificationWatcher` can detect runtime failure and sales-email output failure after reload, but client-only logging can miss failures if no user returns to the page.

#### Expected Resolution

A logging responsibility matrix that states which errors are written by server action, which by client report mutation, which by job-side wrapper/webhook/polling, and which are intentionally best-effort in v1.

### Specify Admin Or Developer Review Surface

- Type: `grilling`
- Status: Open
- Blocked by: Choose Durable Task Error Ledger Data Model

#### Question

Where should developers/admins review the stored task failures, and who can access them? Decide whether to add a new `/task-errors` or fold into `/task-events`, which filters and detail fields are needed, whether Trigger run ids are linked or copyable, and whether retry/dismiss/status management belongs in v1.

#### Known Inputs

- `/task-events` already exists and is Super Admin-gated, but it currently manages scheduled event definitions and history.
- The client asked for developer visibility into error details, not a new client-facing support board.
- Existing sales email failed attempts already have `/sales-book/emails` for sales/email-specific retry.

#### Expected Resolution

A minimal v1 admin/developer surface contract with permissions, route placement, list/detail fields, and boundaries around retry or resolution actions.

### Plan Implementation Slices And Validation Gates

- Type: `task`
- Status: Open
- Blocked by: Define Production And Development Task Feedback Contract; Choose Durable Task Error Ledger Data Model; Define Failure Logging Source Of Truth; Specify Admin Or Developer Review Surface

#### Question

Once the decisions above are made, how should the implementation be sliced so it is safe to ship? Convert the decisions into ordered Schema -> API -> UI -> Validation steps with targeted tests and Brain documentation updates.

#### Expected Resolution

An implementation handoff with specific files, test seams, database migration/generation commands, browser QA notes, and documentation updates.

## Not Yet Specified

- Exact toast titles/descriptions for each task family and whether task-specific copy should live in `task-feedback.ts` or task metadata defaults.
- Whether production should show a single global spinner for all running tasks or one spinner per started action surface.
- Whether canceling a running task should remain available to clients in production.
- Whether stale-run detection should persist a failure row, and if so whether it is labeled client timeout, monitor timeout, or unknown.
- Whether the durable ledger needs resolution status, assignment, comments, or links to the existing web bug reporting workflow.
- Whether the general task error ledger should support retry in v1.
- Whether Trigger.dev webhooks are available and reliable in the current deployment environment.

## Out Of Scope

- Replacing Trigger.dev run history or storing full Trigger logs.
- Showing raw stack traces, run ids, payloads, or task names to normal production users.
- Reworking sales email delivery persistence beyond keeping `SalesEmailAttempt` aligned with the new general task UX.
- Adding external tracker integrations.
- Building a full developer incident workflow with owners, SLA, severity, comments, or deploy linkage.
- Broad Sentry or analytics instrumentation changes.
- Mobile/Expo task trigger UX unless a later ticket explicitly expands the destination.

# Spec: Task Monitor Client Simplification And Error Ledger

## Tracker

- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/42
- Triage Label: `ready-for-agent`
- Source Map: `.scratch/task-monitor-client-simplification/map.md`

## Problem Statement

The current background task monitor gives office users too much developer-facing information when they start long-running work. It exposes a running/failed count, expandable technical details, task names, run ids, copy controls, cancellation controls, and raw error text. That detail is useful for developers, but it creates confusion for clients and makes production workflows feel more technical than they need to be.

Clients only need to know that the task started, that it is still loading, and whether it finished successfully or failed. Developers and Super Admin users still need a durable way to inspect failed background tasks, see the useful run context, and work through those errors after they happen. Browser-local task monitor state is not enough for that because it is same-browser only and can be lost when a user closes the page.

## Solution

Simplify the production background task feedback experience while adding a database-backed diagnostics ledger for task failures.

In production, normal users see a simple loading indicator while monitored background work is running. The indicator does not show a numeric count, task ids, task names, run ids, raw errors, or expandable developer details. When a task finishes, the user gets a closeable success toast. When a task fails, the user gets a closeable destructive/error toast with safe, non-technical copy.

Behind the scenes, task starts, start failures, terminal failures, stale runs, and output-level failures are recorded in a durable task-run diagnostics model. The server owns the authoritative persistence path by retrieving Trigger.dev run status when possible instead of trusting raw client error details. Super Admin users get a protected diagnostics surface to review failed runs, filter them, inspect bounded technical context, and copy the Trigger run id when a run id exists. Existing domain ledgers, especially the sales email delivery ledger, remain the domain source of truth and can be linked from the general task diagnostics record instead of being replaced.

## User Stories

1. As a sales rep, I want to see a simple loading indicator when I start a background task, so that I know the system is working without seeing technical details.
2. As a sales rep, I want the loading indicator to avoid numeric task counts, so that I am not distracted by internal queue details.
3. As a sales rep, I want the task monitor to avoid raw run ids, so that I am not exposed to developer-only identifiers.
4. As a sales rep, I want the task monitor to avoid task names and implementation labels, so that the UI uses normal business language.
5. As a sales rep, I want a success toast when a task finishes, so that I know the action completed.
6. As a sales rep, I want an error/destructive toast when a task fails, so that I know the action did not complete.
7. As a sales rep, I want error toast copy to be clear and non-technical, so that I know whether to retry or ask for help.
8. As a sales rep, I want to close task result toasts, so that I can return to my workflow.
9. As a sales rep, I want failed tasks to stop leaving an expanded technical panel on screen, so that the interface stays clean.
10. As a sales rep, I want successful tasks to clean up their loading state automatically, so that completed work does not linger.
11. As a sales rep, I want a failed sales document email to show a useful failure message, so that I know the email did not send.
12. As a sales rep, I want the existing sales email ledger to remain available for email history, so that email-specific audit and resend behavior is not lost.
13. As a production user, I want background task feedback to look consistent across sales email, reminders, production updates, dispatch work, packing, document warmups, inventory import, and sales control tasks, so that all long-running work feels predictable.
14. As a production user, I want the generic monitor to avoid exposing cancel controls, so that I do not accidentally interrupt background work from a developer-style panel.
15. As a production user, I want task-specific workflows to keep their own intentional controls, so that any future cancellation or retry behavior can be designed in the context of that workflow.
16. As a production user, I want a task that cannot start to show an immediate error toast, so that I know the action did not enter the background queue.
17. As a production user, I want a task that starts successfully to show loading quickly, so that I get immediate feedback after clicking.
18. As a production user, I want page navigation or reloads to keep reasonable task feedback when possible, so that background work does not become mysterious after moving around the app.
19. As a production user, I want stale or timed-out monitoring to show a safe failure message, so that I know the system needs review without seeing internal watcher details.
20. As a Super Admin, I want task failures persisted in the database, so that I can investigate problems after the user has closed the browser.
21. As a Super Admin, I want to see which user started a failed task when known, so that I know who experienced the issue.
22. As a Super Admin, I want to see the task family or task name for failed runs, so that I can route the issue to the right developer.
23. As a Super Admin, I want to see the business entity snapshot for failed runs when available, so that I can find the related sale, dispatch, email, or import.
24. As a Super Admin, I want to see the Trigger run id when available, so that I can cross-check the run in Trigger.dev.
25. As a Super Admin, I want to copy the Trigger run id from the diagnostics surface, so that I can share it with a developer.
26. As a Super Admin, I want start failures recorded even when no run id exists, so that queueing problems are visible.
27. As a Super Admin, I want output-level failures recorded, so that a technically completed Trigger run can still be diagnosed when the business result failed.
28. As a Super Admin, I want stale monitored runs recorded, so that long-running or abandoned work is not invisible.
29. As a Super Admin, I want task diagnostics to avoid storing full task payloads, so that sensitive customer and payment data is not copied into a generic log.
30. As a Super Admin, I want diagnostic rows to keep bounded metadata, so that the page is useful without becoming an unstructured log dump.
31. As a Super Admin, I want to filter diagnostics by status, task family, actor, entity, and date, so that I can find the failures that matter.
32. As a Super Admin, I want failed diagnostics to be ordered newest first, so that recent production issues are easy to triage.
33. As a Super Admin, I want sales email failures to point to the email ledger when relevant, so that email-specific resend and audit behavior remains in the proper place.
34. As a Super Admin, I want non-Super Admin users blocked from the diagnostics page, so that developer details are not broadly exposed.
35. As a developer, I want server-side finalization to retrieve Trigger.dev run details when possible, so that the database log is based on authoritative run state.
36. As a developer, I want client-side watcher reports to be treated as signals rather than trusted raw logs, so that a browser cannot write arbitrary technical details.
37. As a developer, I want task starts registered durably, so that unfinished runs can be reconciled later.
38. As a developer, I want a reconciliation path for open task runs, so that failures can be captured even if a user closes the page before the run finishes.
39. As a developer, I want success rows retained only as needed for reconciliation and short audit windows, so that the diagnostics table does not grow without bound.
40. As a developer, I want failure rows retained longer than success rows, so that production issues remain available for investigation.
41. As a developer, I want production users to receive sanitized failure messages while diagnostics store richer internal context, so that support and debugging needs do not leak into the client UI.
42. As a developer, I want the old detailed monitor preserved in development or explicitly developer-only contexts, so that local debugging stays efficient.
43. As a developer, I want task feedback copy centralized, so that task-specific success and failure text stays consistent across direct watchers and recovered tasks.
44. As a developer, I want database migration/application called out as a release gate, so that the UI does not claim durable diagnostics before the target database has the new model.
45. As a developer, I want tests around the diagnostics contract rather than implementation details, so that the feature remains safe through refactors.

## Implementation Decisions

- Production users get a simplified task feedback surface: loading indicator while work is running, no numeric count, no expandable detail panel, no run id, no task name, no copy-run-id action, and no generic monitor cancellation control.
- Development and local environments may keep the detailed monitor surface for debugging, including run id, task name, copied id, and detailed error inspection. This keeps developer ergonomics without exposing those details to clients in production.
- Monitor-backed tasks should emit terminal toasts in production. The existing behavior where monitored tasks suppress normal success toasts should be changed so production users still get completion feedback.
- Success toasts should use the success variant and task-specific business copy when available. Generic fallback copy should be simple, such as "Task completed".
- Failure toasts should use destructive/error treatment and safe user-facing copy. Raw Trigger errors, stack traces, run ids, payloads, and internal task names must not appear in normal production failure toasts.
- Start failures should show an immediate destructive/error toast and should be persisted because no Trigger run id may exist.
- Runtime terminal failures should be finalized server-side. The client watcher can notify the server that a run reached terminal state, but the server should retrieve the Trigger run when possible and store the authoritative status, error, output summary, and timestamps.
- Completed Trigger runs that contain business-level failure output should be treated as failures for user feedback and diagnostics. Sales document email provider failures and skipped email output remain the key existing example.
- A new general task-run diagnostics model should be introduced for background task lifecycle and failure investigation. It should support running, succeeded, failed, canceled, stale, and start-failed states even if v1 focuses the admin page on failures.
- Task starts should be registered durably after a Trigger run is created. This allows later reconciliation if the browser stops watching.
- Start failures should be recorded by the server action that tried to create the Trigger run.
- Terminal client watcher reports should call a protected finalization route that retrieves the Trigger run, updates the durable row, and returns sanitized user-facing feedback.
- A reconciliation job or admin reconciliation action should review still-running diagnostic rows after a bounded age and retrieve Trigger status to close out completed, failed, canceled, or stale runs.
- Success rows may be retained for a short operational window and pruned or soft-deleted later. Failure, canceled, stale, and start-failed rows should be retained longer for debugging.
- The diagnostics model should store bounded metadata only: task name/family, actor id/name snapshot when known, entity type/id/label when known, source surface, environment, Trigger run id when available, status, error category, sanitized user message, internal error summary, output summary, timestamps, and soft-delete/resolution metadata.
- Full task payloads should not be persisted in the generic diagnostics table. Domain-specific ledgers may store their own safe snapshots where already designed to do so.
- The existing sales email delivery ledger remains the sales email source of truth. The general task diagnostics record may link to email attempts or expose a pointer to the email ledger, but resend and provider-level email audit stay in the email ledger.
- Existing scheduled task event history should not be stretched into the general user-triggered task error ledger. Scheduled event history and background task diagnostics are adjacent admin concerns but have different data semantics.
- Add a Super Admin-only diagnostics surface for task failures and problematic runs. The surface should be near existing task/admin operations rather than client-facing sales workflows.
- The diagnostics surface should default to failed/problematic rows, newest first, with filters for status, task family, actor, entity, and date range.
- Diagnostics details should show bounded technical context, including internal error summary, Trigger run id, task family, timestamps, actor, entity, and related ledger link where available.
- Retry is out of v1 unless a domain ledger already owns a safe retry path, such as sales email resend.
- Generic resolution workflows, assignment, comments, severity, and incident management are out of v1. A simple reviewed/resolved marker can be reserved in the schema if low-cost, but it should not become a full incident board.
- Permission scope for the diagnostics page is Super Admin-only in v1. The write/finalization endpoints are authenticated and should not allow ordinary users to read diagnostics.
- The finalization endpoint should not trust arbitrary client-supplied error text. It should use the run id and server-side Trigger retrieval when possible, with client metadata only as bounded context.
- Existing browser-local persisted monitor state can still track in-flight runs for UI continuity, but it is no longer the durable source of truth for errors.
- Database migration/application is a required release gate. The feature is not production-ready until the target database has the diagnostics model and the app can write/read it.

## Testing Decisions

- Primary testing seam: the protected task-run diagnostics contract. Tests should cover registering a run, recording a start failure, finalizing a failed Trigger run, finalizing a successful Trigger run, detecting output-level business failure, handling canceled runs, handling stale reconciliation, and listing diagnostics as Super Admin.
- The diagnostics contract tests should mock Trigger.dev run retrieval so tests assert app behavior without depending on the external Trigger service.
- The diagnostics contract should assert that normal users cannot read the diagnostics list or detail.
- The diagnostics contract should assert that finalization does not trust arbitrary client error payloads when server-side run retrieval is available.
- The diagnostics contract should assert that only bounded metadata is persisted and full payloads are not copied into the generic diagnostic row.
- The diagnostics contract should assert that sales email output-level failures are treated as task failures while preserving the existing email ledger as the email-specific source.
- Secondary UI testing seam: production task feedback presentation. Tests should assert that production mode shows a loading indicator without count/details, emits success toast on completion, emits destructive/error toast on failure, and does not render run ids, copy buttons, task names, or expandable details.
- Secondary UI testing should focus on externally visible behavior, not implementation details of Zustand, Trigger hooks, or the exact DOM structure of the old monitor.
- Existing task feedback helper tests are good prior art for centralizing task-specific failure classification and safe fallback messages.
- Existing API/router tests for sales email attempts, bug reports, task events, and sales rep transfer are good prior art for protected contract and permission testing.
- Browser QA should cover at least one representative monitored task in production mode and one failure path with mocked or controlled failure output, verifying that the user sees only loading plus terminal toast while Super Admin can see the persisted diagnostic row.
- Development/local QA should confirm the detailed monitor remains available where intended and still helps developers copy run ids and inspect error details.

## Out Of Scope

- Replacing Trigger.dev run history or storing full Trigger logs.
- Showing raw stack traces, run ids, payloads, or task names to normal production users.
- Replacing the sales email delivery ledger or moving sales email resend into the generic task diagnostics feature.
- Building a full incident management system with assignment, comments, severity, SLA, ownership, or deploy linkage.
- Adding Sentry, analytics, alerting, Slack, email, GitHub, Linear, or Jira integrations.
- Retrying arbitrary background tasks from the generic diagnostics page.
- Redesigning every task-specific workflow around cancellation or retry.
- Changing the core business behavior of sales email, sales reminders, sales control, dispatch, packing, document warmup, or inventory import tasks.
- Adding mobile/Expo task monitor behavior in this v1.
- Backfilling historical task failures from Trigger.dev into the new diagnostics table.
- Persisting full task payloads or sensitive customer/payment data in a generic log.

## Further Notes

- This spec comes from the local Wayfinder scratch map for task monitor simplification.
- The current request is primarily a production UX simplification plus developer diagnostics persistence. It should be implemented incrementally in the order: schema, API, feedback finalization, production UI simplification, diagnostics surface, validation, and Brain documentation updates.
- Because the current task monitor already has sales-email-specific failure overrides, the implementation should preserve that behavior and route it into both safe client toasts and durable diagnostics.
- The old browser-local monitor should no longer be treated as the source of truth for production failure review.
- The implementation should document any environment gating clearly so production users get the simplified experience while developers retain enough tooling to debug locally.

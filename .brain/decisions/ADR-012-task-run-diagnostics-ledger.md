# ADR-012: Task Run Diagnostics Ledger

## Status

Accepted

## Date

2026-07-13

## Context

The background task monitor exposed developer-focused details to production users: numeric task counts, run ids, task names, copy/cancel controls, and raw error detail. The client asked for production task feedback to be simplified to loading and closeable terminal toasts, while developers still need a durable way to inspect task errors after they happen.

Existing `ScheduleHistory` is scoped to configured scheduled task events, and `SalesEmailAttempt` is scoped to sales document email delivery. Neither is a general-purpose diagnostics ledger for user-triggered background tasks.

## Decision

Introduce a generic `TaskRunDiagnostic` database model for background task starts, start failures, terminal failures/successes/cancellations, and bounded output summaries. Production client UI will no longer expose the detailed task monitor; it will show a spinner-only loading indicator while tasks run and terminal success/destructive toasts when they finish.

Development/local contexts keep the detailed client monitor for debugging. Super Admins can review persisted diagnostics at `/task-events/diagnostics`.

## Consequences

- Developer-facing task details move from production client UI into a database-backed admin surface.
- Trigger public access tokens and full payloads are not persisted.
- Sales document email delivery remains recorded in `SalesEmailAttempt`; generic task diagnostics complement it with run-level failure context.
- Long-running `RUNNING` rows can later be reconciled by a server job into `STALE` without changing the production client UX.

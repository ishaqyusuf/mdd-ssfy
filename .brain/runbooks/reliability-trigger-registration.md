# Trigger reliability polling configuration

The same opt-in also guards `reliability-trigger-historical-sweep`, scheduled hourly
at minute 35 UTC. It revisits a seven-day creation window using its own persisted
cursor, resumes incomplete pages, and starts a new seven-day scan after completion.
It does not retrieve the unfinished watch set; incremental polling handles that.
Historical cursor health is available through a separate `mode: "historical"`
monitor registration; configure it alongside incremental monitoring.

## Independent health probe

The API now mounts `GET /api/reliability/health`. Configure a separate
`RELIABILITY_MONITOR_TOKEN` (at least 32 characters) and send it as a Bearer token.
Configure `RELIABILITY_MONITOR_SOURCES` with entries such as:

```json
[{ "provider": "trigger", "account": "ACCOUNT_ID", "project": "PROJECT_ID", "serviceId": "jobs", "maxAgeMs": 900000 }]
```

These identities must match the polling registration. The endpoint currently
checks Trigger sources only; it does not claim Sentry/Vercel coverage. Missing
token disables it (404); invalid credentials return 401. Stale/absent discovery,
stale watches, invalid source configuration, or database failure return 503.
Healthy responses are 200; all responses disable caching. Configure an external
monitor outside Trigger to alert on non-200, timeout, or connection failure.
This task has mounted local code only, without deploying or creating that monitor.

Status: local implementation only; production activation is pending review.

The existing Trigger job `reliability-trigger-reconciliation` runs every five
minutes in production after deployment. Provider reads remain disabled unless
`RELIABILITY_TRIGGER_POLL_ENABLED` is exactly `true`. Development and preview
executions remain disabled even with that flag.

Set `RELIABILITY_TRIGGER_READ_SOURCES` to a JSON array with one entry per production
account/project. Example placeholders (not a deployable registration):

```json
[
  {
    "account": "ACCOUNT_ID",
    "project": "PROJECT_ID",
    "environmentId": "PRODUCTION_ENVIRONMENT_ID",
    "serviceId": "jobs",
    "owner": "OWNER_ID",
    "fallbackOperation": "jobs.unknown",
    "operations": [
      { "task": "TASK_IDENTIFIER", "operation": "OPERATION_ID" }
    ],
    "tokenEnv": "RELIABILITY_TRIGGER_READ_TOKEN_JOBS"
  }
]
```

Store the production environment's read credential separately in the named secret.
The production token prefix is a configuration check, not proof of permission or
project ownership. Confirm the credential belongs to the configured production
environment before activation. Discovery verifies returned environment identity;
individual retrieval is limited to already recorded source-scoped run identities.
No payload/output URLs are fetched. Task mappings must be unique; unmapped tasks
use the configured fallback operation.

Each source receives at most 20 due watched-run reads, five discovery pages, and a
20-second processing budget. The batch supports at most ten sources and stops
starting sources after 220 seconds. HTTP calls have a five-second timeout. The
source cursor serializes polling and retains unfinished discovery pages. Rate
limits defer the source. Individual lookup failures postpone the watch by five
minutes without marking it terminal or advancing its last successful check.

Review before activation: confirm destination service/owner, environment and task
mapping; verify local migration deployment readiness; exercise delayed completion,
pagination recovery, and rate-limit handling against an authorized environment;
establish independent stale-ingestion monitoring. A monitor running inside Trigger
cannot independently detect Trigger's own scheduling outage. No hosted checks or
configuration changes have been performed by this task.
# Historical replay monitoring (2026-09-09)

Add a second Trigger entry to `RELIABILITY_MONITOR_SOURCES` with the same source
identity, `mode: "historical"`, and `maxAgeMs: 7200000` for the hourly replay.
It checks the separate historical cursor; incremental polling cannot mask stale
backfill. Omitted mode defaults to incremental and retains unfinished-run watch
checks. Historical health checks only completed replay coverage. External monitor
deployment remains pending.

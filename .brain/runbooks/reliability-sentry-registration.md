# Sentry reliability registration

Implementation exists; no live registration has been configured or verified.

## Independent discovery health

Add a `provider: "sentry"` entry to `RELIABILITY_MONITOR_SOURCES`, with `account`
matching the polling organization, `project` set to its **projectId** (not its
slug), the same `serviceId`, and `maxAgeMs` such as 900000. The authenticated
`GET /api/reliability/health` checks the exact `sentry-events` production cursor.
Missing completion, stale coverage/success, and future timestamps fail health.
Omitting `mode` checks incremental discovery. Add a second entry with
`mode: "historical"` and a threshold appropriate for hourly replay (for example
7200000) to check backfill independently. Alert delivery freshness is not covered.
External monitor deployment remains pending.

## Alert registration

The API reads `RELIABILITY_SENTRY_REGISTRATIONS` as a JSON array. Each entry
selects a server-owned source and owner; callers cannot override them.

```json
[
  {
    "id": "web",
    "installationId": "REPLACE_INSTALLATION_UUID",
    "account": "REPLACE_SENTRY_ORG",
    "projectId": "REPLACE_PROJECT_ID",
    "operation": "runtime.error",
    "serviceId": "gnd-web",
    "owner": "REPLACE_OWNER_ID",
    "secretEnv": "RELIABILITY_SENTRY_SECRET_WEB"
  }
]
```

Set the separately managed `RELIABILITY_SENTRY_SECRET_WEB` to the integration's
client secret. Never embed the secret in this document or the registration JSON.
Use `/api/webhooks/reliability/sentry/web` on the actual API host for this example.
Configure a Sentry integration-platform issue-alert action; legacy project service
hooks do not share this payload contract. Require the explicit production
environment on the event. Runtime exceptions enter with unknown business impact.

Before hosted activation, resolve the ledger migration artifact, replace all
placeholder IDs with verified values, and confirm the responsible owner. Test a
signed production-shaped event and its redelivery, verifying one occurrence and
two pending delivery intents. Verify the durable acknowledgement latency against
Sentry's one-second target. Invalid signatures must not write incidents; storage
failure must return 503. No live GitHub/Slack delivery is activated by this route.

Disable ingestion by removing the registration; it then returns 404. Existing
ledger data remains available. The bounded reconciliation worker now exists, but
its deployed Trigger registration and configured read credentials remain pending.
Provider registration and activation require
the later reviewable configuration gate recorded in the canonical task.

The reader uses Sentry's [project error-event API](https://docs.sentry.io/api/events/list-a-projects-error-events/)
with a `project:read` token, explicit start/end, and sampling disabled. API event
fields differ from webhook fields (`eventID`, `groupID`, `projectID`, `dateCreated`,
and object-shaped tags). It follows [Link pagination](https://docs.sentry.io/api/pagination/)
without following arbitrary response URLs. Supported cloud origins are sentry.io,
us.sentry.io, and de.sentry.io; self-hosted origins need an explicit policy extension.

## Polling schedule configuration

The checked-in Trigger task `reliability-sentry-reconciliation` runs every five
minutes in the production environment after deployment. Provider reads additionally
require `RELIABILITY_SENTRY_POLL_ENABLED=true`. With the flag absent, it returns
disabled without resolving or executing sources.

Set `RELIABILITY_SENTRY_READ_SOURCES` to an array shaped as follows, using the same
account/project/service/owner mapping as webhook registration:

```json
[
  {
    "account": "REPLACE_SENTRY_ORG",
    "projectId": "REPLACE_PROJECT_ID",
    "apiOrigin": "https://sentry.io",
    "operation": "runtime.error",
    "serviceId": "gnd-web",
    "owner": "REPLACE_OWNER_ID",
    "tokenEnv": "RELIABILITY_SENTRY_READ_TOKEN_WEB"
  }
]
```

The referenced read token is separate from the webhook signing secret. Configuration
rejects duplicate account/project scopes and missing credentials before running
any source. Up to ten sources run serially with five-page and twenty-second work
budgets per source, a batch stop-start threshold of 220 seconds, and a 300-second
Trigger limit. Initial discovery covers 24 hours; later windows overlap by five
minutes. Cursor checkpoints retain longer interrupted windows. Source failures are
reported as safe status/count summaries, without raw errors or credentials.

`reliability-sentry-historical-sweep` runs hourly at minute 15 UTC in production
after deployment, under the same enable flag. It uses a separate cursor and scans
the preceding seven days. Interrupted sweeps resume their original window; after
completion, the next sweep revisits the full seven-day range. Existing occurrences
deduplicate against both webhook and regular polling intake. Retention beyond the
configured lookback is not recovered by this bounded sweep.

No values above have been applied and no deployment was performed. Independent
stale-feed alerting and hosted acceptance remain pending.

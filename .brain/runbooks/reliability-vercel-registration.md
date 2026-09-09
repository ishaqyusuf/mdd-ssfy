# Vercel drain registration

## Deployment failure webhook

Separate local route:
`POST /api/webhooks/reliability/vercel-deployments/:registrationId`.
Configure `RELIABILITY_VERCEL_DEPLOYMENTS` as:

```json
[{ "id": "web", "account": "TEAM_ID", "project": "PROJECT_ID", "operation": "deployment.error", "serviceId": "web", "owner": "OWNER_ID", "secretEnv": "RELIABILITY_VERCEL_WEBHOOK_SECRET_WEB" }]
```

Set that separately referenced secret to the webhook signing secret. Subscribe
only to current `deployment.error` events for this handler; other lifecycle events
are not supported yet. Team/project identities must match and target must explicitly
be production. Failed deployment identity is independent of webhook delivery ID.
No webhook has been registered or deployed; hosted acceptance remains pending.

Local route: `POST /api/webhooks/reliability/vercel/:registrationId`.
No production drain has been created or activated.

Use the current Drains API validation endpoint `POST /v1/drains/test` with the
same schemas/delivery configuration intended for creation. It sends sample events:
https://vercel.com/docs/rest-api/drains/validate-drain-delivery-configuration.
Select delivery compression `none`; compressed requests receive explicit 415
`UNSUPPORTED_COMPRESSION`. Signature checks remain mandatory. The current docs
review did not establish an unsigned x-vercel-verify handshake for this API;
legacy log-drain verification must not be assumed to apply. Hosted sample shape
and signature compatibility still require authorized testing.

Set `RELIABILITY_VERCEL_DRAINS` to a JSON array. Placeholder example:

```json
[{ "id": "web", "account": "TEAM_ID", "project": "PROJECT_ID", "operation": "runtime.error", "serviceId": "web", "owner": "OWNER_ID", "format": "json", "secretEnv": "RELIABILITY_VERCEL_SECRET_WEB" }]
```

Store the drain signing secret separately in the referenced environment variable.
Only names beginning `RELIABILITY_VERCEL_SECRET_` are accepted. Configure the
provider's format to match: `application/json` for JSON or `application/x-ndjson`
for NDJSON. The handler accepts at most 1 MiB and 1000 records per request.

The signature binds the configured account; log project IDs must match and
production environment must be explicit. Preview records are ignored. Only
actionable error/fatal, 5xx, and lambda-crash candidates are persisted. Full-batch
validation precedes writes; 200 follows all writes. Storage failures return 503
and any partial writes deduplicate on retry.

Before activation, verify endpoint registration/verification requirements against
the provider, batch-size compatibility, signed hosted delivery, and database retry
acceptance. Provider setup handshake support and hosted testing are still pending.
Deployment lifecycle webhooks, log-query fallback, correlation, and Vercel freshness
monitoring remain separate incomplete work.

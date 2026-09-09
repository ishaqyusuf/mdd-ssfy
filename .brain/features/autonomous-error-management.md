# Autonomous error management

## Implementation state

In progress. [Canonical task](../tasks/2026-09-09-autonomous-production-error-management.md)
tracks full requirements and activation gates. [Research](../research/2026-09-03-autonomous-production-error-management.md)
is the design source. No provider connections or publications are active yet.

## Intake boundary

Recovery selection includes expired GitHub SENDING leases. A service-scoped,
incident-locked transition marks them UNCERTAIN and eligible for receipt discovery;
live leases stay untouched. Recovery does not require another incident revision.

Configured GitHub recovery reserves a five-minute cooldown in delivery
`nextAttemptAt` before credential acquisition. Reservations serialize on the incident
lock, acquired before transaction snapshot reads. Failed or absent scans preserve
UNCERTAIN and the cooldown; they do not enable another publication attempt.

Existing GitHub issues can receive bounded marked evidence comments through
`appendReliabilityGithubEvidence`, an update strategy allowed by the research.
The adapter preserves the issue body/title and validates the returned comment URL
against the intended issue. It shares timeout, rate-limit and uncertainty handling
with creation. Comment recovery and production dispatch remain incomplete.

`recoverGithubDelivery` reads only an UNCERTAIN GitHub delivery owned by the
configured service, scans from five minutes before its creation, and persists only
a uniquely validated receipt. Other results retain uncertainty. Repeated recovery
of a completed delivery performs no provider read. Registry credentials, automated
recovery scheduling/backoff, and large-scan continuation remain pending.

GitHub receipt identification validates repository URL, automation actor ID,
issue number, ordered unique incident/action markers, and absence of a PR marker.
Multiple issue matches are ambiguous; no match stays unresolved and never permits
recreation. Candidate discovery transport and recovery worker wiring remain open.

`deliverReliabilityIncident` now orchestrates a scoped 30-second delivery claim,
publisher callback, and lease-bound settlement. It passes the stable action key,
attempt count, and prior remote receipt to the publisher; unknown publisher errors
become UNCERTAIN. It does not schedule work or select credentials/drafts. GitHub
update transport, uncertain recovery, and production publication gates remain open.

Delivery claims accept an optional publication scope (`serviceId`, `revision`).
Under the incident lock they reject a mismatched service, stale revision, resolved
or informational incident, and claim only the matching pending revision. Production
publication workers must supply this scope. This protects claim-time consistency;
it does not hold a database lock across remote writes or replace credential checks.

The GitHub create adapter now emits stable incident/action markers and validates
the issue receipt against the configured repository. It bounds request duration
and receipt size, blocks redirects, and returns UNCERTAIN after ambiguous writes.
It does not retry creates inline. HTTP 429 and header-identified 403 throttling
return PENDING with the later of exponential backoff, Retry-After, and exhausted
quota reset. Malformed retry hints fail for review rather than retrying early.
Body-only 403 secondary-rate-limit/abuse-detection messages are recognized through
a bounded 16 KiB JSON read. Permission failures and unreadable/oversized 403 bodies
remain FAILED; provider diagnostics are not returned to callers.
App authentication, outbox execution,
receipt reconciliation, and publication activation remain incomplete.

GitHub evidence formatting now has an ownership boundary: stable incident markers
delimit automation-owned text. Updates preserve all surrounding human text and
reject missing, duplicated, reversed, or nested markers. Evidence/body budgets
bound output. This formatter is not yet wired to publication; transport, concurrent
remote-edit handling, credentials, and uncertain-response recovery remain open.

`@gnd/observability/reliability` is a server-only subpath. It reconstructs a safe
occurrence from an adapter-normalized event and a trusted service registration.
The caller must verify provider signatures and map trusted impact evidence before
calling it; this normalizer does not authenticate HTTP requests.

- Exact provider/account/project allowlist and production environment are required.
- Operation and owner come from the registered service boundary; event-supplied
  owner, raw title, payload, tags, and arbitrary evidence URL are not propagated.
- Occurrence identity hashes the provider scope and event ID. Problem identity
  also contains service identity and provider group ID. Delivery IDs do not replace
  event IDs. Shared traces or operation names cannot merge distinct groups.
- Unknown impact enters `NEEDS_INVESTIGATION` at P2; confirmed critical effects
  enter P0, blocked workflows P1, and expected outcomes remain informational.
- Adapters supply canonical UTC timestamps; malformed/rolled dates and future
  events beyond five minutes fail. Historical delayed events remain eligible.

## Durable ingestion

### Sentry issue-alert adapter

`prepareSentryAlert` authenticates the exact request bytes with the configured
client secret and constant-time HMAC comparison before parsing. It supports the
integration-platform `event_alert` / `triggered` payload, enforcing installation
UUID, project ID, and explicit production environment. Conflicting environment
values are rejected. Legacy service hooks require a separate adapter.

The adapter bounds payloads to 1 MiB and converts fractional timestamps to
milliseconds while retaining strict calendar validation. Only provider event and
issue IDs plus configured source/operation metadata reach intake. Raw messages,
users, and provider-supplied business-impact claims are not forwarded; impact
starts unknown. Request IDs and unsigned delivery timestamps do not replace the
durable occurrence identity used for replay deduplication.

The HTTP route is `POST /api/webhooks/reliability/sentry/:registrationId` with
server-owned JSON registration and separately referenced signing-secret variables.
Unconfigured routes return 404. The handler bounds streamed bytes, validates JSON
and signature, and acknowledges only after durable ingestion. Storage errors return
503 with no raw error details. No registration is activated. Bounded reconciliation
and hosted one-second response validation remain pending.

### Persistence

`@gnd/db/queries` exports ingestion and bounded incident retrieval. Ingestion
uses serializable transactions with bounded conflict retries. Duplicate provider
occurrences return the same incident without increasing counts or adding outbound
intents. Reuse of one occurrence identity for a different problem fails explicitly.
Delayed events widen first/last-seen bounds correctly without downgrading severity.
An informational problem becomes actionable when a later occurrence warrants it.

Incident/occurrence persistence and two outbound intents (GitHub/Slack) commit
together for actionable incidents. These are intents only: delivery workers and
publication configuration are not implemented. No external message is sent.
Reads return at most 100 occurrences, deliveries, and transitions; incident counts
remain total counts rather than the bounded sample size.

Local schema push succeeded; migration generation requested a reset due to broad
existing schema/history drift and was stopped. Outbox execution, provider
reconciliation, analysis, authorization, and hosted activation remain incomplete.

## Delivery ledger boundary

Claims serialize on the incident row, allowing one sender per destination across
revisions. A newer due revision supersedes older pending intents, while carrying
forward any retry delay and consecutive attempt budget. Five failed attempts stop
the stream as `FAILED`; fresh evidence cannot bypass that stop. A successful send
ends the retry chain and stores the remote identity for later updates.

Only the current unexpired lease can settle a send. Expired sends become
`UNCERTAIN`, blocking automatic retries to avoid duplicate remote creates. Receipt
recovery requires the matching action marker and retains the remote ID. Provider
lookup and marker verification adapters are still required before activating this
internal recovery function. Missing search results do not authorize another create.

Health queries expose counts by destination/status, the oldest pending timestamp,
and expired sending leases. External dispatch, operator recovery of failed streams,
and alerting remain pending; these queries alone do not activate delivery.

## Reconciliation cursor boundary

Cursor claims use a row lock and explicit lease ownership. A fresh discovery window
starts from the prior watermark minus the configured overlap; interrupted discovery
retains its original window and opaque provider cursor. Partial pages advance only
the checkpoint, and terminal pages advance the watermark to the fixed window end.

The poller must persist every occurrence before recording its page receipt. Page
receipts require the current lease and expected page number. Expired workers and
repeated page receipts cannot advance state. Provider cooldowns rotate the lease,
retain the checkpoint, and defer new claims until the retry time. Safe error codes
and last successful completion are stored separately from raw provider responses.

The Sentry error-event poller now consumes these primitives. It reads fixed-window
project events, validates the project and environment, and commits every accepted
occurrence before its page receipt. Explicit nonproduction events are skipped;
missing environment evidence fails the page. `Link` pagination must explicitly
identify the next page and completion, and arbitrary next-link hosts are rejected.
Requests have a five-second timeout and a 2 MiB response bound. Poll runs have
page/time budgets and durable cooldowns on read, persistence, or budget failure.

Sentry polling has been tested with simulated HTTP responses and real local
transactions. A production-only five-minute Trigger schedule is defined in code,
with a separate default-off enable flag and validated server-owned read sources.
It bounds source count and batch work and reports safe results. An hourly historical
schedule revisits seven days using an independent cursor, preserving partial
windows across retries. Completed historical scans restart the full lookback on
the next run; regular polling continues from its own watermark. No deployment or
configuration was applied. Stale-feed alerting and Trigger/Vercel loops remain
incomplete.

## Trigger run watch boundary

Trigger discovery validates the configured environment ID. Known watched-run
retrieval checks the requested run ID using its source-scoped client; retrieval
does not assume an environment field absent from the provider response. Test runs
and unclassified test flags are rejected. Registered task mappings choose the
operation, with an explicit configured fallback for unmapped tasks.

Failed, crashed, system-failure, timed-out, and expired runs create unknown-impact
incidents. Cancellation is actionable unless a trusted caller confirms it was
intentional; confirmed cancellation is informational. Unknown provider statuses
remain watched. Raw payloads, output, errors, and user metadata are not persisted.

The durable watch set has no creation-time cutoff when querying due unfinished
runs. A failure is ingested before marking its watch terminal; interrupted writes
can retry through occurrence deduplication. Provider update timestamps prevent old
responses from replacing newer states. The HTTP adapter now reads bounded
discovery pages from `/api/v1/runs` and known watches from `/api/v3/runs/:id`.
Discovery uses millisecond creation-time filters, requests all statuses, and
validates pagination. Retrieval has no creation cutoff. Both reads use the fixed
Trigger cloud host, reject redirects, require a production-key prefix, and apply
five-second request and 2 MiB response bounds. Key prefix checking supplements
configured source binding; it does not prove provider permissions or project
ownership. The combined discovery/watch loop and scheduling remain incomplete.

## Human action authorization

`applyReliabilityAction` accepts `ACKNOWLEDGE` and `ASSIGN_SELF` from an
authenticated adapter. The adapter supplies a server-owned principal and current
authorized service IDs; neither identity nor memberships may come from the action
payload. The query checks authorization against the persisted incident service.

An incident row lock serializes requests. Repeated request IDs must match actor,
action, and expected revision. Stale cards and identity conflicts fail without
another change. Each accepted action increments the revision and commits an actor
audit plus two delivery intents in one transaction. Assign-to-self uses the actor
ID. Acknowledge records receipt without implying triage completion or resolution.

Informational and resolved states reject these actions. Slack actor mapping,
expiring snooze, and additional operator actions are pending. No public action
endpoint is exposed yet.

## Validation

The opt-in Vercel polling schedule now connects configuration, isolated temporary
CLI config, bounded reads, and durable reconciliation. Cleanup is verified after
success and failure. Three tests / 10 assertions pass. CLI deployment packaging and
hosted acceptance remain pending; no live polling is enabled.

Vercel polling configuration now validates all sources and runtime paths before
execution, resolves separate token references, and enforces production opt-in plus
bounded batch budgets. Two tests / 6 assertions pass. Scheduler/runtime provisioning
and hosted acceptance remain pending.

Vercel reconciliation now persists subdivision checkpoints through cursor leases.
Occurrence writes precede page receipt; incomplete discovery retains its fixed
window and cooldown. Local DB acceptance verifies resumed halves and delayed
watermark advancement (5 assertions). Scheduler/runtime registration remains open.

Vercel discovery now has a bounded window-checkpoint planner. Saturated windows
split in half with shared endpoints; occurrence deduplication handles overlap.
Unsplittable density fails explicitly. Checkpoint validation preserves a contiguous
pending suffix within the original bounds. Durable cursor orchestration remains open.

Vercel query execution now binds explicit runtime/config paths and environment-only
credentials to scoped arguments, bounded execution, and normalized output. Two
boundary tests / 9 assertions pass. Deployment packaging and isolated config
directory provisioning remain pending alongside persistent discovery orchestration.

Vercel query pages now normalize only records inside the explicit query window.
Future windows reject, and saturation is assessed before filtering actionable logs.
Two tests / 5 assertions pass. Process binding and persistent window subdivision
remain pending; below-limit results still do not prove provider completeness.

The CLI fallback now has a bounded process runner with an explicit environment,
shell-free argument handling, timeout and output limits, and sanitized failures.
Two local-process tests / 4 assertions pass. Vercel credential binding and durable
query orchestration remain pending; this runner alone performs no provider reads.

CLI fallback normalization now handles request summaries separately from drains,
including nested error levels and responseStatusCode. Identity includes deployment
and request ID with a request-summary namespace. Two tests / 7 assertions pass.
CLI-provided defaults and retention limit evidence strength; execution, window
validation, and durable discovery orchestration remain pending.

Vercel fallback query preparation explicitly disables implicit git-branch filtering
and binds production/team/project/window. Bounded JSONL decoding flags limit
saturation rather than claiming completeness. Two tests / 10 assertions pass.
CLI record normalization/execution and durable discovery orchestration remain open.

Signed deployment failure redelivery is now verified through the HTTP handler and
local database: three deliveries with two delivery IDs produce one occurrence and
one pair of outbound intents, retaining deployment evidence. Focused acceptance
passes with 7 assertions. Hosted activation remains pending.

Deployment-failure handling is now mounted at the separate vercel-deployments
webhook route with deployment-specific registration/secret names. Four HTTP/config
tests / 13 assertions pass. Other lifecycle event types remain unsupported; hosted
activation has not occurred. See the Vercel registration runbook for configuration.

Deployment-failure HTTP handling now awaits persistence after bounded signature and
scope verification. Authenticated nonproduction events return ignored success;
storage failure returns 503. Two HTTP tests / 7 assertions pass. The handler is not
yet mounted with a deployment-specific registration.

Deployment-failure verification now authenticates bounded raw bytes before JSON
parsing or normalization. It shares constant-time HMAC-SHA1 verification with drains
while using its own supplied webhook secret. Five deployment/drain tests / 20
assertions pass; deployment HTTP route wiring remains pending.

Vercel deployment.error normalization now validates current webhook scope and
production target and separates delivery identity from failed-deployment identity.
Unknown impact remains P2; deployment failure alone does not prove a production
outage. Two tests / 9 assertions pass. Transport and remaining lifecycle handling
are pending. Contract: https://vercel.com/docs/webhooks/webhooks-api.

Vercel accepts both traceId and trace.id, rejecting conflicting simultaneous values.
Evidence rejection tests cover oversized identifiers, newline content, objects, and
null values. Correlation fields do not change occurrence deduplication identity.
Full reliability adapter suite: 28 tests / 118 assertions pass; observability/DB
typechecks pass for the evidence persistence change.

Safe correlation identifiers now survive intake and persistence: deploymentId,
requestId, traceId, and release are allowlisted and bounded. Vercel supplies its
deployment/request/trace identifiers. Raw message/path content remains excluded.
Ten unit tests / 43 assertions and batch replay integration / 13 assertions pass.
This retains evidence only; cross-provider grouping is not yet implemented.

Vercel HTTP-to-database partial-batch recovery is now verified locally: after one
write commits and the next fails, repeated signed retries yield one occurrence and
one pair of delivery intents per log. Raw log messages remain absent. Focused
integration acceptance passes with 11 assertions; provider hosted acceptance remains
pending.

Vercel drain handling is now mounted with validated registration and separate
secret references. Four HTTP/config tests / 13 assertions pass. See
[Vercel registration](../runbooks/reliability-vercel-registration.md). Hosted setup,
provider verification handshake, and database batch replay acceptance remain open.

Vercel drain HTTP handling now authenticates and normalizes the full bounded batch
before persisting actionable records. It acknowledges only after awaited writes;
storage errors return 503 without raw diagnostics. Partial writes rely on durable
occurrence deduplication during retry. Two HTTP tests / 6 assertions pass. Route
registration/mounting and real-database batch replay acceptance remain pending.

Vercel normalization now validates registered production scope and recognizes
error/fatal levels, 5xx responses, and top-level lambda crash status -1. Proxy -1
alone is not a crash. Explicit preview logs are ignored; missing environment is
rejected. Raw messages and request fields are excluded. Two tests / 21 assertions
pass. Log IDs remain separate candidates until evidence correlation is implemented.

Vercel drain transport authentication now verifies raw-body HMAC-SHA1 in constant
time before parsing JSON/NDJSON, with 1 MiB/1000-record bounds. Two tests / 8
assertions pass. Source/environment normalization and ingestion remain pending.
Primary contracts: https://vercel.com/docs/drains/security and
https://vercel.com/docs/drains/reference/logs (checked 2026-09-09).

Historical Trigger database acceptance now verifies repeated full-window replay,
deduplication of old failures, and independent incremental cursor identity. The
focused real-local-database test passes with 9 assertions. Hosted checks remain open.

Trigger historical discovery now has an hourly job with a separate cursor and
seven-day replay window. It uses existing production/opt-in guards and page/time
limits. Incremental polling retains responsibility for unfinished-run retrieval.
Five scheduler tests / 21 assertions pass; historical DB acceptance remains pending.

Follow-up: the health handler is now mounted at `GET /api/reliability/health` and
wired to validated Trigger-only monitor registrations and the durable health query.
Five HTTP/configuration tests / 20 assertions pass. Independent external monitor
activation and Sentry/Vercel coverage are still pending; this remains local code.

The API health handler now provides an authenticated aggregate response suitable
for an external uptime monitor. It requires a separately configured token of at
least 32 characters, compares credential digests in constant time, disables caching,
and returns 503 for missing sources, unhealthy state, or query failure. It exposes
no raw source evidence or errors. Three HTTP boundary tests / 12 assertions pass.
Route mounting and source registration are still pending; this is not a live endpoint.

`getTriggerReconciliationHealth` provides a read-only boundary for a monitor
outside the Trigger ingestion scheduler. It evaluates last successful polling and
discovery watermark separately, and counts unfinished watches using last successful
check time (or provider creation time when never checked). Postponed retries do not
hide stale watches. Threshold is caller-configured between five minutes and one day.
Focused local acceptance: 1 test / 5 assertions pass. External monitor routing and
escalation are not yet connected, so this alone does not provide independent alerts.

Trigger polling stops starting watch reads after half its processing budget, so
discovery can proceed with a watch backlog. Unvisited watches retain their due
time and precede recently checked watches on the next poll. Individual in-flight
reads may cross that midpoint; the full processing deadline remains enforced.
Red/green local acceptance verifies discovery proceeds and unvisited watches stay
due. Full local reliability suite: 21 tests / 105 assertions pass.

Trigger rate-limit recovery is verified through the real local database and fake
provider HTTP boundary: first-page evidence remains committed, a 429 preserves
the fixed window and cursor, the cooldown prevents provider requests, and the
next execution resumes the saved page. Focused acceptance: 1 test / 11 assertions.

Trigger scheduling is implemented in the existing jobs package with a production
environment guard and explicit opt-in flag. Source configuration validates the
entire batch before execution, binds task operations and separate credentials,
and rejects duplicate scopes/task mappings. Four scheduler tests / 18 assertions
pass. See [Trigger registration](../runbooks/reliability-trigger-registration.md).
Independent stale-watch escalation and hosted acceptance remain pending.

Trigger reconciliation now checks due unfinished runs before creation-window
discovery. Every page is persisted before its checkpoint advances. Failed individual
lookups postpone their watch without marking it terminal or refreshing its last
successful check; rate limits defer the source cursor. Polling is bounded by run,
page, and elapsed-time budgets. Scheduling and independent stale-watch escalation
remain pending; no live access is enabled.

2026-09-09 follow-up: 19 local-MySQL integration tests / 90 assertions pass,
including a run failing two days after discovery while another run returns 404.
DB typecheck and scoped Biome pass.

2026-09-09: 7 intake tests / 20 assertions, 4 Sentry adapter tests / 15 assertions,
3 Sentry reader tests / 11 assertions, 6 scheduler tests / 14 assertions,
4 Trigger normalizer tests / 21 assertions, and 18 local-MySQL integration tests / 83
assertions, and observability/DB package typechecks pass. The integration harness
requires an explicit flag and rejects database targets outside the verified local
host/port/database. No live provider checks have run.

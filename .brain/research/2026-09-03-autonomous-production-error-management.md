# Autonomous Production Error Management for GND

**Research date:** 2026-09-03  
**Revised:** 2026-09-09 — local Midday comparison, Slack/GitHub design, operational practices, and revised pilot

**Status:** Research proposal; implementation and external integrations have not been activated by this research.

**Scope:** Sentry, Trigger.dev, Vercel, Slack/GitHub coordination, regression prevention, and safe AI-assisted remediation
**Source policy:** Product claims below are based on first-party vendor documentation and APIs.

## Executive recommendation

Use **Sentry for exception grouping and technical evidence**, while adding a small **GND incident ledger** that correlates Sentry issues, Trigger.dev runs, Vercel deployments/logs, and GND business outcomes. GitHub owns remediation work; Slack provides discussion and acknowledgement. The ledger retains normalized incident/occurrence metadata, provider IDs and links, workflow state, ownership, release/deployment correlation, and automation audit history; Sentry, Trigger.dev, and Vercel remain the detailed evidence stores.

The target loop is:

```text
Sentry issue alerts ───────┐
Trigger failed-run alerts ─┼─> verified ingestion ─> normalize/correlate/dedupe
Vercel alerts/webhooks ────┤                                  │
Vercel log drain/poller ───┘                                  v
                                                   Incident + occurrences
                                                              │
                          ┌───────────────────────────────────┼────────────────┐
                          v                                   v                v
                   owner + alert                    test/AI draft PR   rollback/replay gate
                          │                                   │                │
                          └──────── CI + preview + review ────┴──── deploy ────┘
                                                              │
                                                     observe / regress / close
```

The first release should **detect, correlate, prioritize, analyze, and create/update a GitHub ticket with a linked Slack thread**. Begin in shadow mode with reviewable ticket drafts. Regression-test generation and draft fix PRs belong to a later, separately enabled phase after triage precision and CI gates are proven. Merging, deployment, production data changes, sensitive job replay, rollback, and incident resolution retain operator control. Sentry Seer is an existing candidate for root-cause analysis and later fixes; benchmark it before building a custom fixer ([Sentry Seer](https://docs.sentry.io/product/ai-in-sentry/seer)).

## What GND already has

- Production-only Sentry wiring exists across the dashboard, dealership, storefront, mobile, Bun API, and Trigger jobs. Releases, source maps, privacy scrubbing, and the shared tagged backend-project decision are documented in [Sentry Observability](../features/sentry-observability.md) and [ADR-032](../decisions/ADR-032-shared-backend-sentry-project.md).
- The jobs runtime registers a global Trigger failure hook and sends reportable terminal task errors to Sentry with safe task/run metadata in [`packages/jobs/src/tasks/init.ts`](../../packages/jobs/src/tasks/init.ts). The Trigger build config already has retries, Prisma instrumentation, Sentry source-map upload support, and a 60-second default maximum duration in [`packages/jobs/trigger.config.ts`](../../packages/jobs/trigger.config.ts).
- GND already has a privacy-bounded `TaskRunDiagnostic` model and Super Admin diagnostics flow with run, actor, entity, status, error, and review state in [`task-run-diagnostics.prisma`](../../packages/db/src/schema/task-run-diagnostics.prisma) and [`task-run-diagnostics.ts`](../../apps/api/src/db/queries/task-run-diagnostics.ts).
- The common observability package classifies errors and attaches runtime, source, operation, retryability, request ID, and safe extras/tags in [`error-report.ts`](../../packages/observability/src/error-report.ts).
- The project already uses idempotency keys and focused domain-ledger/reconciliation patterns in sensitive sales, payment, fulfillment, inventory, and notification workflows. Those are the right foundation for safe replay; telemetry must not replace domain truth.

## Gaps that currently prevent dependable autonomy

1. **Backend Sentry is implemented but not operationally complete.** The Brain records that the API production deployment still needs the backend DSN, Trigger Production still needs its backend Sentry variables/source-map credential, and controlled backend ingestion and symbolication proof remain pending ([current rollout state](../features/sentry-observability.md)). Until those gates close, an autonomous system will have systematic backend blind spots.

2. **The Trigger hook is not a complete failed-run feed.** Trigger documents that `onFailure` runs only after configured retries are exhausted, but does not fire for some terminal states including crashed, system-failure, and canceled runs ([task lifecycle hooks](https://trigger.dev/docs/tasks/overview)). GND's current global hook is therefore valuable but insufficient by itself.

3. **The task ledger is partly browser/finalizer driven rather than provider driven.** The existing query registers/finalizes known runs and retrieves authoritative status, but it is not yet a complete ingestion path for every Trigger run, platform crash, deployment failure, or unobserved background run.

4. **Vercel is still mostly an investigation surface.** Runtime logs have route, status, request ID, trace ID, deployment and function details, but their retention is plan-limited (for example one day on Pro without Observability Plus), so an incident discovered later may already have lost its detailed Vercel context ([Runtime Logs](https://vercel.com/docs/logs/runtime)).

5. **There is no repository-enforced CI workflow.** No `.github` directory is present. AI-generated or human fixes therefore have no checked-in pull-request gate that must run focused tests, typechecking, or builds before merge.

6. **Three web apps permit TypeScript errors to ship.** `typescript.ignoreBuildErrors` is enabled in the [dashboard](../../apps/dashboard/next.config.mjs), [dealership](../../apps/dealership/next.config.mjs), and [storefront](../../apps/storefront/next.config.mjs). Removing these flags may require baseline cleanup, but production promotion should not rely on a build that deliberately ignores the type system.

7. **The custom Sentry fingerprint is too coarse.** Every classified error currently receives only `[error_code, operation]` as its fingerprint in [`error-report.ts`](../../packages/observability/src/error-report.ts). This can merge unrelated failures from different code paths when they share a classification and operation, hiding new regressions inside an older issue. Sentry's default error grouping makes the stack trace its most important grouping input ([Issue Details](https://docs.sentry.io/product/issues/issue-details/)). Keep `error_code` and `operation` as searchable tags, but default to stack-based grouping; add a custom fingerprint only for a proven grouping defect and test it against multiple distinct stack traces.

8. **Exceptions alone do not prove business correctness.** A Trigger run can complete while returning an output-level failure or persisting a partial/stale business result. GND's existing reconciliation ledgers are a good answer; the reliability system must ingest invariant breaches and reconciliation failures as first-class incidents, not just thrown exceptions and 5xx responses.

## Provider-by-provider operating design

### 1. Sentry: canonical issue grouping, ownership, and code context

Sentry owns the identity of its exception groups; it groups occurrences, tracks affected users and event volume, distinguishes new/escalating/regressed issues, understands releases, and attaches technical context. Cross-provider incidents have their own ledger ID and need not have a Sentry issue. Resolved Sentry issues can become `Regressed` if they recur, and escalating issues reflect abnormal volume growth ([Issue Status](https://docs.sentry.io/product/issues/states-triage/)).

Recommended configuration:

- Finish the pending backend DSN and source-map rollout first. Enforce a single release identifier—prefer the git SHA—across Vercel web/API and Trigger jobs, plus `environment=production`, `runtime`, `service`, and domain `operation` tags.
- Send releases with commit refs and create a deploy marker for each production promotion. Sentry states that releases correlate first-seen errors to the release that may have introduced them and are required for source maps and other debugging features ([Create Release](https://docs.sentry.io/api/releases/create-a-new-release-for-an-organization/), [Create Deploy](https://docs.sentry.io/api/releases/create-a-deploy/)). Its Vercel integration can upload source maps and notify Sentry when releases are deployed ([Vercel integration metadata](https://docs.sentry.io/api/integrations/get-integration-provider-information/)).
- Replace the unconditional common fingerprint with default stack-based grouping. Preserve safe business classification in tags, then apply narrowly scoped fingerprint or stack-trace rules only after inspecting incorrectly grouped/separated events. Existing issues may be manually merged after the new-event grouping rule is corrected ([Sentry grouping guidance](https://www.sentry.help/en/articles/13964350-why-are-my-events-grouped-or-separated-incorrectly-in-sentry)).
- Add ownership rules for `runtime`, source path/module, URL/route, and domain operation. Sentry can sync CODEOWNERS and auto-assign to issue owners or suspect-commit authors ([Ownership Configuration API](https://docs.sentry.io/api/projects/update-ownership-configuration-for-a-project/)). A practical GND map is Sales/Payments, Inventory/Fulfillment, Jobs/Integrations, Web Platform, and Mobile.
- Use separate workflows instead of one catch-all rule:
  - P0: confirmed ongoing data corruption, duplicate financial effects, security compromise, or widespread failure of a critical journey;
  - P1: a critical workflow is blocked without a workaround, repeated failures have material impact, or a calibrated SLO burn alert fires;
  - P2: actionable isolated failures with a workaround, routed to the work queue and digest;
  - informational: expected validation/auth expiry or deliberate cancellation, retained only where useful for aggregate health.
  Unknown impact in a sensitive domain triggers prompt investigation, rather than an automatic P0 label. Severity and confidence are separate fields. These are proposed GND policies, not Sentry defaults.
  Sentry's current alert APIs support first-seen, reappeared, regression, priority, event-count, user-count, environment, static/percent-change, and dynamic anomaly conditions ([Create Alert](https://docs.sentry.io/api/monitors/create-an-alert-for-an-organization/), [Create Monitor](https://docs.sentry.io/api/monitors/create-a-monitor-for-a-project/)).
- Send the actionable alert to the GND ingestion endpoint and the responsible human channel. Sentry service hooks can emit `event.alert` and `event.created`, while the issues API supports filtered reconciliation reads and issue state/priority/assignee updates ([Service Hook API](https://docs.sentry.io/api/projects/register-a-new-service-hook/), [List Organization Issues](https://docs.sentry.io/api/events/list-an-organizations-issues/), [Update Issue](https://docs.sentry.io/api/events/update-an-issue/)).
- Treat suspect commits as evidence, not proof. With repository, release commit, and code-mapping data Sentry can show a suspect commit and suggest its author, which is useful for routing but must not justify automatic merge or blame ([Issue Details](https://docs.sentry.io/product/issues/issue-details/)).

### 2. Trigger.dev: terminal-run truth, retries, replay, and semantic checks

Use three complementary paths:

1. Keep the global `tasks.onFailure` path for immediate Sentry capture after task retries are exhausted.
2. Configure Trigger's **Run fails**, **Deployment fails**, and **Deployment succeeds** alerts to a verified webhook. Trigger provides SDK signature construction/verification for alert webhooks and identifies the event types as `alert.run.failed`, `alert.deployment.failed`, and `alert.deployment.success` ([Trigger Alerts](https://trigger.dev/docs/troubleshooting-alerts)).
3. Run a scheduled reconciliation task every five minutes using paginated `runs.list` discovery with an overlapping creation-time window, plus a persisted watch set of nonterminal run IDs checked through `runs.retrieve`. The documented list filters include creation time, status, task, and version; do not assume an updated-time filter. A run created yesterday can fail today, so creation-time polling alone is incomplete. Use a bounded historical sweep and flag watch-set/cursor staleness. Advance a discovery watermark only after every page is durably processed; provider rate limits or partial pages must not silently advance it ([List Runs](https://trigger.dev/docs/management/runs/list), [Retrieve Run](https://trigger.dev/docs/management/runs/retrieve)). Treat unexpected `TIMED_OUT`, `CRASHED`, `SYSTEM_FAILURE`, and `EXPIRED` outcomes as candidates; distinguish intentional cancellation ([Runs](https://trigger.dev/docs/runs)).

Retry policy should be explicit per failure class:

- transient network, rate-limit, and temporary provider failures: bounded exponential backoff with jitter;
- invalid input, invariant breach, permission/configuration failure, or missing permanent dependency: fail fast with `AbortTaskRunError` rather than spending retries;
- every task: realistic `maxDuration` and queue TTL, so stuck work becomes a detectable terminal state;
- child tasks: smaller independently retryable steps rather than a large opaque transaction.

Trigger supports task-level/default retry configuration, block-level `retry.onThrow`, status-aware `retry.fetch`, and permanent-failure abortion ([Errors & Retrying](https://trigger.dev/docs/errors-retrying), [Spend/retry guidance](https://trigger.dev/docs/how-to-reduce-your-spend)).

Replay must be controlled carefully. A retry remains locked to the run's original deployed version; a replay creates a **new run using the original payload/options but the latest task version**, which is exactly what is wanted after a fix ([Versioning](https://trigger.dev/docs/versioning), [Replay API](https://trigger.dev/docs/management/runs/replay)). However:

- auto-replay only read-only or proven idempotent tasks;
- require human approval for sales, payment, inventory, production, fulfillment, customer, or external-notification mutations;
- store `replayOfRunId`, the approving actor, fix release, idempotency key, and resulting run ID;
- check the domain ledger before replay, then reconcile after replay;
- never reset an idempotency key merely to force an uncertain side effect.

Use explicit idempotency scopes instead of relying on defaults. Since Trigger v4.3.1, raw strings inside tasks default to run scope; `global` scope is required for cross-parent-run deduplication, and keys remain isolated by task and environment. TTLs permit controlled recurrence ([Idempotency](https://trigger.dev/docs/idempotency)). Pair provider idempotency with a database unique constraint/command ledger because a task-level key cannot enforce atomicity in external systems.

For GND specifically, evolve `TaskRunDiagnostic` into the authoritative Trigger occurrence adapter: ingest every terminal run server-side, keep its current bounded/redacted context, add attempt/version/deployment/replay linkage, and preserve domain-specific ledgers as the source of business truth. Do not store full Trigger payloads; secret-key retrieval includes payload and output, whereas public-key retrieval omits them for security ([Retrieve Run](https://trigger.dev/docs/management/runs/retrieve), [Management API authentication](https://trigger.dev/docs/management/authentication)).

### 3. Vercel: deployment lifecycle, 5xx anomalies, and durable log correlation

Vercel provides three different signals and they should not be confused:

- **Account webhooks** report deployment created/succeeded/promoted/rollback/error/canceled events, not each runtime exception. Verify `x-vercel-signature` against the raw body using constant-time comparison; Vercel retries non-2xx deliveries with exponential backoff for up to 24 hours ([Webhooks](https://vercel.com/docs/webhooks), [Webhook API and delivery](https://vercel.com/docs/webhooks/webhooks-api)). Use these events to open build incidents and annotate release/deploy state.
- **Vercel Alerts** can detect a 5xx error-rate anomaly and usage anomaly. As of the research date, alerts are beta and require Pro/Enterprise with Observability Plus; they can notify by email, Slack, or webhook. Error anomaly compares a five-minute error rate against a 24-hour baseline and a minimum threshold ([Vercel Alerts](https://vercel.com/docs/alerts)). This is a valuable independent detector for failures Sentry missed, but should not be the only detector because low-volume critical routes may never cross an anomaly threshold.
- **Runtime logs / Drains** provide the occurrence detail. Runtime logs can be filtered by production environment, deployment, error/fatal level, 5xx status, route, request ID, source, and time through the dashboard or CLI ([Runtime Logs](https://vercel.com/docs/logs/runtime), [`vercel logs`](https://vercel.com/docs/cli/logs)). On Pro/Enterprise, a Log Drain can continuously send runtime, build, and static logs to a custom endpoint, including stable log ID, deployment ID, source, level, request ID, route/path, status code, trace ID, environment and execution details ([Drains](https://vercel.com/docs/drains), [Log Drain schema](https://vercel.com/docs/drains/reference/logs)). Drain endpoints must verify `x-vercel-signature`; Vercel also supports custom headers and team-wide IP hiding ([Drain Security](https://vercel.com/docs/drains/security)).

Recommended Vercel strategy:

- If the current plan supports Drains, send only production `lambda`, `edge`, and `build` records needed for error investigation. Drop routine static/redirect/4xx traffic, apply no sampling to fatal/5xx, dedupe by Vercel log `id`, and retain only redacted structured fields plus a bounded normalized message.
- If Drains or Alerts are unavailable, schedule a five-minute production log query using JSON output with an overlap window, then dedupe by provider log/request/deployment identity. The CLI supports `--environment production`, `--level error`, `--status-code 5xx`, `--since`, `--deployment`, `--request-id`, and JSON Lines output ([`vercel logs`](https://vercel.com/docs/cli/logs)). Treat this as a pragmatic fallback, not a durable streaming contract.
- Emit structured server logs with the same safe `request_id`, `trace_id`, `operation`, `runtime`, `release`, and business entity reference used by Sentry. Never log bodies, cookies, auth headers, customer/payment payloads, or credentials.
- Join Vercel `deploymentId` and git SHA to the Sentry release/deploy and Trigger deployment version. This turns "an error started at 14:05" into "this issue first appeared after deployment X and affects route Y/job Z."

## Cross-provider deduplication and the GND reliability ledger

Do not attempt to make one universal hash replace the provider's native grouping. Store two levels:

- `Incident`: durable triage unit with status, priority, title, suspected release/deployment, owner/team, domain, first/last seen, occurrence/user counts, client impact, automation state, resolution/reopen state, and canonical Sentry issue ID when one exists.
- `IncidentOccurrence`: append-only provider evidence keyed uniquely by `(provider, providerAccount, project, environment, providerEventId)`, carrying provider issue/run/request/deployment IDs, timestamp, route/task/operation/runtime, normalized error class/message hash, safe entity reference, release, trace/request correlation, and evidence link. Keep webhook delivery IDs separate from occurrence IDs: multiple deliveries can describe one occurrence. For run transitions without event IDs, include run ID, status, and provider update/version identity so later transitions are not discarded.

Correlation should be confidence-based:

1. exact provider issue identity for grouping, with Trigger run identity linking evidence for that execution;
2. exact distributed trace/request ID as a relationship, not proof that all failures share one root cause;
3. same release + runtime + route/task + exception type + stack/default Sentry group;
4. only then a short time-window/message similarity heuristic.

Never merge incidents solely because they share `error_code` and `operation`. If confidence is below a high threshold, link them as "possibly related" for review. Record every automated merge/split decision so it is reversible.

Suggested state machine:

```text
DETECTED -> TRIAGED -> FIX_DRAFTED -> IN_REVIEW -> READY_TO_RELEASE
   |            |                                      |
   |            └-> NEEDS_HUMAN / NOT_ACTIONABLE       v
   └-> SUPPRESSED (bounded rule)                 OBSERVING -> RESOLVED
                                                       |
                                                       └-> REGRESSED
```

Provider webhooks should acknowledge quickly after signature validation and durable insert, then queue enrichment asynchronously. Webhook retries and overlapping poll windows require unique provider-event constraints and idempotent consumers.

## Automated regression-test and remediation workflow

This workflow applies only after Phase 2B is enabled; the initial ticket-analysis pilot stops before code changes.

For an actionable new or regressed incident:

1. **Freeze a redacted evidence packet.** Include provider links/IDs, first and latest event, safe stack, route/task, release/deployment, request/trace ID, affected-user/event count, related domain entity reference, and suspected commit. Exclude raw payloads and secrets.
2. **Confirm reproducibility before changing code.** Map the failure to the smallest existing package boundary. If it is a business-correctness issue, reproduce it from a sanitized fixture or invariant, not by copying a production record into tests.
3. **Generate a regression test first.** The test must fail on the incident's current code path and pass only when the actual invariant is restored. For intermittent/provider failures, test retry classification, idempotency, timeout, and final ledger state rather than mocking only the happy response.
4. **Create an isolated branch and draft PR.** Sentry Seer can automatically scan/actionability-score issues and proceed through root cause, solution, code changes, and PR generation. Keep automatic fixes limited initially to "highly actionable" issues and stop at draft PR ([Sentry Seer](https://docs.sentry.io/product/ai-in-sentry/seer)). Sentry's documented Seer model is a new branch/draft PR rather than writing to main or merging without review; repository/branch access can be restricted ([Seer privacy overview](https://sentry.io/astro-assets/resources/legal/Data_Privacy_Overview_-_Seer_2026_01_21.pdf), [Seer permissions update](https://sentry.io/changelog/permissions-update-for-seer/)).
5. **Run mandatory CI.** At minimum: the incident regression test, affected package tests, `bun run typecheck`, dependency consistency, focused lint/format checks, and the narrowest affected production build. Remove `ignoreBuildErrors` only after its baseline is clean, but immediately add a separate required typecheck so ignored Next.js build diagnostics cannot reach merge unnoticed.
6. **Require ownership review.** GitHub protected branches/rulesets can require status checks and approving reviews; CODEOWNERS routes sensitive modules to the correct reviewer ([GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches), [PR standardization and CODEOWNERS](https://docs.github.com/en/pull-requests/reference/managing-and-standardizing-pull-requests)). Automation tokens should have least privilege and no production credentials ([GitHub Actions token guidance](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)).
7. **Validate the deployed artifact.** Run the regression and small synthetic smoke suite against the Vercel preview. Vercel Deployment Checks can withhold production domain assignment until selected GitHub checks pass; rolling releases can expose a fraction of traffic and be aborted/rolled back ([Deployment Checks](https://vercel.com/docs/deployment-checks), [Rolling Releases](https://vercel.com/docs/rolling-releases)).
8. **Release and observe.** Mark the Sentry issue resolved in the next release, deploy, and observe error/latency/invariant signals over staged windows. A recurrence becomes a Sentry regression. Only after telemetry is clean and any safe replay/reconciliation succeeds should the incident close.
9. **Recover deliberately.** Vercel Instant Rollback restores a prior production deployment at the routing layer, but also restores that deployment's environment/config and cron state; it therefore requires an operator gate and post-rollback verification ([Instant Rollback](https://vercel.com/docs/instant-rollback)). Trigger replay similarly requires the idempotency/domain checks above.

## Detection beyond error trackers

Getting ahead of clients requires positive health signals, not just exception capture:

- keep the lightweight `/api/health/live` availability check, and add dependency/readiness checks that do not expose secrets or perform broad expensive reads;
- run synthetic tests for the highest-value journeys: authentication, quote/sale save, payment state transition, inventory allocation, production submission, dispatch completion, and customer document/email initiation;
- schedule reconciliation tasks for invariants that can silently drift, with a strict cap, dry-run evidence, and a failure event when drift exceeds tolerance;
- alert on Trigger queue age/expired/timed-out runs, repeated retry exhaustion, and deployment failure;
- alert on Vercel 5xx rate, route-specific failures, build failure, and sudden function duration/usage changes;
- alert when observability itself goes quiet unexpectedly: no Sentry check-in, no Trigger reconciliation watermark, undelivered webhook counter growth, or a stale Vercel ingestion cursor.

The reliability system itself needs a dead-letter/reconciliation path. Webhooks are the fast path; provider API polling with overlap and cursors is the completeness path.

## Phased rollout (revised 2026-09-09)

### Phase 0 — Restore trustworthy release gates (first)

Run this alongside the read-only detection pilot. Missing CI must block autonomous code changes, not prevent useful incident discovery and draft tickets.

- Configure and prove API/jobs backend Sentry ingestion and symbolication.
- Audit the current Sentry common fingerprint and move back to default stack grouping.
- Add checked-in GitHub CI with required focused tests and `bun run typecheck`.
- Establish an explicit cleanup plan for all three `ignoreBuildErrors` flags.
- Standardize git-SHA releases across Vercel and Trigger and emit deploy markers.
- Verify current web/mobile/backend alert rules against controlled non-sensitive failures.

**Exit:** every runtime can produce one symbolicated production test issue tied to a release, owner, and alert; a deliberately failing regression test cannot merge.

### Phase 1 — Unified, loss-resistant detection

- Add signed webhook endpoints for Sentry alerts, Trigger run/deployment alerts, and Vercel deployment events/alerts.
- Add Trigger terminal-run reconciliation and either a Vercel production Log Drain or a bounded five-minute fallback query.
- Add `Incident`/`IncidentOccurrence` correlation around—not instead of—the existing task and domain ledgers.
- Add ingestion dedupe constraints, cursors, dead-letter evidence, and telemetry-health alarms.

**Exit:** controlled duplicated/out-of-order webhook deliveries create one incident with multiple occurrences, and a simulated dropped webhook is recovered by reconciliation.

### Phase 2A — Analyzed tickets and Slack coordination

- Add ownership rules/CODEOWNERS, priority policy, service/domain routing, and provider links.
- Evaluate a shadow set of at least 20 representative historical/seeded cases before enabling automatic ticket publication.
- Create/update one GitHub issue per distinct actionable problem; retain multiple provider occurrences and separate related remediation tasks where needed.
- Post a linked Slack incident thread and route meaningful transitions, escalation, and digests through the delivery outbox described below.
- Analysis must distinguish observed facts, hypotheses, missing evidence, proposed fix, and acceptance criteria. Publish a minimal urgent ticket even if the AI enrichment service is unavailable.

**Exit:** duplicate and delayed events, provider outages, ambiguous outbound responses, and human edits pass the acceptance cases below. Proposed pilot target: at least 90% of published tickets judged actionable and no duplicate tickets in the seeded concurrency/retry cases. These are GND acceptance proposals, not industry benchmarks.

### Phase 2B — Regression tests and draft PRs

- After Phase 2A and release gates pass, evaluate Seer or a bounded code agent on selected non-sensitive incidents.
- Require regression tests, isolated branches, and the full review/preview gate.

**Exit:** a seeded production-like failure produces one owned incident and a draft PR whose regression test fails before the patch and passes after it, without access to production secrets.

### Phase 3 — Guarded recovery automation

- Auto-replay only an allowlist of read-only/proven-idempotent tasks.
- Offer one-click operator-approved replay, reconciliation, rolling promotion, and rollback for sensitive workflows.
- Consider narrowly scoped auto-merge only after a sustained record of high precision; do not auto-deploy revenue/data mutations.

**Exit:** recovery has complete audit evidence and repeated replay cannot duplicate business side effects.

## Operating metrics

Track weekly:

- percentage of production incidents detected before client report;
- median time to detect, acknowledge, owner assignment, draft fix, release, and verified resolution;
- percentage of occurrences with release, deployment, route/task, request/trace ID, and owner;
- duplicate-alert suppression rate and incorrect merge/split rate;
- alert precision (actionable alerts / total alerts) by provider;
- percentage of fixes with a regression test;
- AI draft-PR acceptance, material-rewrite, and rejection rates;
- post-release regression rate and rollback rate;
- replay success rate and duplicate-side-effect count;
- ingestion delay, webhook failure/dead-letter count, and cursor staleness.

A useful initial objective is **100% release/owner correlation for P0/P1 incidents, 100% regression-test coverage for fixes to correctness-critical workflows, and zero autonomous production mutations or merges** until the pipeline's precision is proven.

## Midday evidence and lessons (2026-09-09)

Reference location from Brain: `/Users/M1PRO/Documents/code/_kitchen_sink/midday`.
Inspected local HEAD: `c511619e899a185c086ceb4b30610734942f12d1`.
The inspected paths had no working-tree changes. This is a local snapshot review,
not verification of Midday's hosted settings or a claim that upstream is identical.
The inspected Slack code implements product notifications and assistant interactions;
it does not establish that Midday already has this proposed incident pipeline.

| Observed implementation | Lesson for GND | Required adaptation |
| --- | --- | --- |
| [Production CI](/Users/M1PRO/Documents/code/_kitchen_sink/midday/.github/workflows/production.yml) uses affected-package lint/typechecks/tests, a test DB, deployment dependencies, git SHA stamping, and post-deploy API tests. | Reuse dependency-aware validation and release identity. | GND needs its own PR checks and hosted ruleset verification. Midday's production workflow runs on main pushes; its staging workflow runs on non-main pushes. These files alone do not prove protected merges. If affected-package detection fails, run the full relevant checks or fail visibly; do not interpret failure as no changes. |
| [Slack webhook route](/Users/M1PRO/Documents/code/_kitchen_sink/midday/apps/api/src/rest/routers/apps/slack/webhook.ts) delegates to the bot adapter; [OAuth callback](/Users/M1PRO/Documents/code/_kitchen_sink/midday/apps/api/src/rest/routers/apps/slack/oauth-callback.ts) verifies OAuth state and maps team/user identity. | Keep transport handling separate from installation identity and domain actions. | Bind Slack workspace and actor to GND authorization; channel membership alone cannot authorize incident actions. |
| [Slack verification helper](/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/app-store/src/slack/server/verify.ts) and interaction handling use raw-body HMAC, a five-minute timestamp window, and timing-safe comparison. | Verify before processing; keep signing keys server-side. | The active event route delegates verification to its adapter. Test the actual route, malformed/non-finite timestamps, stale requests, and interaction form bodies; do not assume a standalone helper is on every path. |
| [Provider notifications](/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/bot/src/activity-notifications.ts) separate immediate delivery from 10/30/60-minute batches and retain source message/thread context. | Use immediate incident escalation and batched routine updates; retain Slack message identity. | Operational escalation must not inherit optional product-notification preferences. Use explicit incident policy and fallback delivery. |
| [Batch queries](/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/db/src/queries/provider-notification-batches.ts) persist batches and expose bounded due queries; [flush processor](/Users/M1PRO/Documents/code/_kitchen_sink/midday/apps/worker/src/processors/notifications/activity-notification-flush.ts) executes in a worker. | Persist notification intent and process outside request handlers. | Read-modify-write batching and send-then-mark are not proof of concurrency-safe or exactly-once delivery. The flush also marks several skipped/unsent paths sent. GND needs explicit skipped/failed/uncertain states, atomic claims, and reconciliation. |
| [Bot instance](/Users/M1PRO/Documents/code/_kitchen_sink/midday/packages/bot/src/instance.ts) shares provider adapters with Redis state and debounce. | Hide messaging providers behind a small interface. | Begin with Slack only; keep durable incident state in the database. No reason to add Redis, BullMQ, or four chat providers solely to copy this reference. Reuse GND's Trigger runtime. |
| [HTTP logger](/Users/M1PRO/Documents/code/_kitchen_sink/midday/apps/api/src/utils/logger.ts) connects request IDs to start/completion logs. | Carry correlation through web → API → job → provider result. | Use route templates, bounded allowlisted metadata, existing GND error references, and compatible trace context. Do not broadly copy log capture or path values containing business identifiers. |

### GND baseline recheck

As of this local review, `.github` is still absent, all three web configs still
set `ignoreBuildErrors`, and the shared report fingerprint remains
`[classified.code, operation ?? "unknown"]`. Backend production ingestion remains
unverified in the Brain record; no hosted configuration was queried in this review.
The newer sales-save work adds useful `error_reference` correlation but explicitly
does not prove deployed Sentry receipt. Preserve that distinction.

The existing [bug-report issue adapter](../../apps/api/src/utils/bug-report-issue.ts)
already creates GitHub issues. Reuse its tested transport behavior, but its current
single POST and bug-report-specific body do not implement incident upserts,
uncertain-response recovery, or GitHub App authentication. Extract a neutral
transport only when a second caller needs it; retain the current user bug-report
contract and tests.

## Ownership, correlation, and trustworthy analysis

Define authority explicitly:

- Sentry owns its exception groups; Vercel and Trigger own their raw provider evidence.
- The incident ledger owns cross-provider correlation, severity history, observation state, and outbound delivery state. A Sentry ID is optional for build failures and business invariant incidents.
- GitHub owns remediation tasks, assignees, review, and implementation progress.
- Slack owns the discussion surface. Brain stores runbooks, researched decisions, and lessons linked to incidents, not raw log archives.

A single incident may contain several provider groups and several remediation tasks.
Initially create one primary GitHub ticket for a distinct actionable problem; split
additional work only when ownership or acceptance criteria differ. A shared trace
may contain independent failures. Use reversible related-links before automatic
merging. A regression should update/reopen the existing problem when appropriate,
while recording a new occurrence episode and preserving the earlier resolution.

Add a small versioned service registry: service/runtime, repository and paths,
provider account/project/environment, primary and backup owner, Slack destination,
runbook, critical journeys, and supported diagnostic queries. Missing owner routes
to a triage inbox rather than silently assigning the last committer. This can later
support other projects through configuration; GND should be the first pilot.

An analysis packet must contain:

1. Observed behavior, impact, first/last seen, and coverage window, with provider links.
2. Event counts versus distinct operation/user counts; mark capped samples as lower bounds.
3. Git SHA/deployment/job version and exact source locations where known.
4. Ranked hypotheses, evidence for/against, confidence, and missing information.
5. Smallest proposed investigation/fix, owner, test fixture strategy, and acceptance criteria.
6. Related GitHub/Brain work, prior fixes, and a reason this is new, regressed, or already covered.
7. Analysis version, model/tool provenance, query coverage, and cost/tool limits.

AI consumes redacted evidence as untrusted data. Log lines and Slack text cannot
grant tool permissions or inject executable commands. Read-only connectors and
typed allowlisted queries are the default; code execution for later reproduction
uses isolated fixtures without production secrets. Low confidence produces
`needs-investigation`, not a fabricated root cause. An urgent deterministic ticket
must not wait for an AI response.

## Slack and GitHub connection design

### Pilot communication

Propose `#gnd-reliability` for actionable incident cards and their threads, with
routine summaries delivered as a scheduled digest. Store workspace ID, channel ID,
and root message timestamp on the incident. Update the root card for current state;
reply only for meaningful changes such as ownership, stronger evidence, severity,
PR readiness, failed verification, or recurrence. An unchanged poll stays quiet.

The official [GitHub Slack integration](https://github.com/integrations/slack)
already supports issue, PR, workflow, and deployment subscriptions. Use it for
selected GitHub lifecycle notifications before recreating those features. Avoid
subscribing every provider to the same channel at full volume. Native integrations
do not by themselves create a unified cross-provider incident thread; that mapping
belongs in the small GND adapter. A provider alert may remain as an independent
fallback, with explicit routing so humans understand possible duplication.

Later Slack actions can include **Acknowledge**, **Assign to me**, **Snooze with
expiry**, **Request analysis**, and **Open ticket**. Each action checks a mapped
actor, incident revision, and allowed transition. Double clicks and stale cards
must not repeat actions. Acknowledge does not mean resolved; a PR merge does not
mean production recovered. Defer production replay/deploy buttons until the
recovery phase. Slash commands or free-text AI replies are not approval tokens.

[Slack Events API](https://docs.slack.dev/apis/events-api/) requires a response
within three seconds and retries failed deliveries. Verify the raw-body signature
and timestamp, durably accept the event, then perform analysis asynchronously;
dedupe inbound event IDs. Use the minimum scopes for enabled features and avoid
workspace-wide message history ingestion. [Slack signature verification](https://docs.slack.dev/authentication/verifying-requests-from-slack/)
is a transport check, separate from GND actor authorization.

### GitHub work queue

Use a repository-scoped GitHub App for a service integration: installation tokens
offer finer access and short lifetimes compared with a broad personal integration.
Start with Issues write and the metadata/read access actually required; add source
read only for approved analysis and PR/Contents write only for the later fix stage.
Do not grant workflow modification, administration, or ruleset bypass to the triage
writer. [GitHub App guidance](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)
supports this access model.

Suggested issue fields: incident ID, impact/severity, service/environment, owner,
evidence links, observation window, analysis confidence, proposed next action,
acceptance criteria, affected release, and related Brain/PR links. Suggested labels:
`source:reliability`, `severity:p1`, `area:sales`, `needs-investigation`. These are
proposals, not labels created by this research.

Keep the incident ID in a stable machine marker and store the GitHub issue number
locally. Update only the automation-owned evidence block or append a bounded
analysis comment; preserve human edits, labels, and discussion. Webhooks should
validate event/action and dedupe `X-GitHub-Delivery`; redelivery retains that ID.
GitHub recommends quick acknowledgement, asynchronous processing, and recovery of
missed deliveries. [Webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)

### Reliable outbound delivery

Create an outbox entry in the same transaction as incident changes. Use a unique
key such as `(incidentId, destination, actionType, revision)`, a lease/claim, attempt
count, next-attempt time, and explicit `pending`, `sending`, `sent`, `failed`,
`suppressed`, and `uncertain` states. Respect rate-limit retry timing.

If GitHub creates an issue but the response is lost, an immediate second POST can
duplicate it. Mark the attempt uncertain; reconcile the stable incident marker and
delivery ledger before retrying. Account for search visibility delay and race
conditions; unresolved ambiguity needs review. Apply the same principle to Slack
message creation. Do not promise exactly-once effects from a local DB constraint
across remote APIs. Distinguish delivery suppression from actual receipt.

## Practices to adopt from mature engineering organizations

| Practice and source | Proposed application to GND |
| --- | --- |
| [Google SRE: SLO alerting](https://sre.google/workbook/alerting-on-slos/) | Define good/eligible outcomes for sale save, payment posting, and dispatch completion. Calibrate fast/slow burn alerts against traffic and an agreed objective. At low volume, supplement with bounded synthetic checks and absolute correctness alarms. |
| [Google SRE: incident response](https://sre.google/workbook/incident-response/) | Name a primary responder and backup. For major incidents, explicitly assign incident lead, investigator, and communications owner; one person may initially hold multiple roles. Set an acknowledgement target and a fallback beyond Slack for urgent unacknowledged incidents. |
| [Google SRE: blameless postmortems](https://sre.google/sre-book/postmortem-culture/) | After significant/repeated failures, record impact, detection gap, timeline, contributing conditions, recovery, and owned prevention tickets. Link the result into Brain bug memory and the regression fixture set. |
| [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) | Verify required PR checks, owner approval, and allowed bypass actors in hosted settings. A workflow file alone is not enforcement. Separate telemetry read, issue write, code write, and deployment credentials. |
| [DORA metrics](https://dora.dev/guides/dora-metrics/) | Track change failure rate, failed-deployment recovery time, and change lead time alongside alert precision. Use trends to improve delivery; ticket volume is not a success metric. |

For sale-save availability, an eligible valid submission is good only if one correct
durable save and an unambiguous success outcome occur. Expected invalid input is
excluded; timeouts or ambiguous persistence count as failures. A committed save
followed by a failed statistics refresh is a different operational outcome from a
failed save and needs its own classification. Financial/inventory correctness
alarms may warrant immediate response even when aggregate availability looks good.
These are proposed domain definitions to validate with the business owner.

Do not make Trigger the sole detector of Trigger failure. Keep provider-native
failure alerts and an independent freshness monitor for the ingestion heartbeat.
The same applies if the webhook endpoint shares the failing API deployment.
An outage must not take down every route to notifying the operator.

## Existing repositories and products worth evaluating

These are researched candidates, not installed dependencies or endorsements of
their fit without testing. Verify license, hosted terms, permissions, maintenance,
runtime compatibility, and plan access before adoption.

| Candidate | Useful capability | Recommendation for this project |
| --- | --- | --- |
| [Sentry Seer](https://docs.sentry.io/product/ai-in-sentry/seer) | Analysis and fixes using Sentry/code context. | First analysis candidate because GND already emits Sentry issues. Compare its output against a human-reviewed incident set; confirm account entitlement and repository mapping. It cannot replace missing Vercel/Trigger/business evidence. |
| [keephq/keep](https://github.com/keephq/keep) | Alert management, provider integrations, and declarative workflows, including ticket/chat destinations. | Evaluate before building a general-purpose alert router. For three GND sources, a small existing-runtime adapter may cost less to operate; Keep becomes more attractive as project/provider count grows. |
| [HolmesGPT/holmesgpt](https://github.com/HolmesGPT/holmesgpt) | Tool-based incident investigation across data sources, with configurable integrations. | Optional challenger for cross-provider analysis. Verify GND's exact Vercel/Trigger/Sentry access paths rather than assuming ready-made coverage. Its CLI can be evaluated independently; the repository's operator mode requires Kubernetes, which GND should not add just for this pilot. |
| [integrations/slack](https://github.com/integrations/slack) | Official GitHub-to-Slack integration. | Adopt selected lifecycle subscriptions when connections are authorized; add custom code only for incident correlation and GND actions. |
| [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js) | Standard tracing/metrics/logging instrumentation interfaces. | Use as a reference for correlation, compatible with existing Sentry/Trigger instrumentation. Do not initialize a second competing SDK/export pipeline without checking duplication and compatibility. |

Recommendation: existing GND jobs and DB + Sentry + the current GitHub transport
with a reliable outbox + a narrow Slack adapter. Benchmark Seer first. Keep and
HolmesGPT are alternatives to evaluate against measured gaps, not extra mandatory
services. No new incident dashboard is needed for the pilot.

## Pilot acceptance, budgets, and next planning decisions

Build a redacted test corpus covering: one exception appearing in Sentry/Vercel,
a Trigger run failing long after creation, duplicate/out-of-order events, separate
bugs in one trace, an intentional cancellation, a business invariant failure with
HTTP 200, a successful save followed by refresh failure, and a recurrence after a
release. Add GitHub timeout-after-create, Slack 429, unauthorized/stale action,
disabled integration, AI timeout, misleading log instructions, and a dropped webhook.

Acceptance must demonstrate:

- One primary ticket per distinct actionable problem; separate problems stay separate.
- No lost occurrences when a webhook is recovered through polling; partial coverage is visible.
- No duplicate outbound action in seeded concurrency/retry tests, with uncertain outcomes held for reconciliation.
- High-severity detection continues if AI, Slack, or the main job runner is unavailable.
- Human ticket edits survive; stale actions fail safely; unresolved regressions reopen investigation.
- Closure requires deployed fix evidence, representative traffic or synthetic success, healthy ingestion, and an agreed observation window. Silence alone is insufficient.

Suggested starting limits, to be calibrated in shadow mode: five-minute discovery,
10-minute grouping for routine notifications, one deep analysis per new evidence
revision with a cooldown, and configurable per-run API/page/token/time limits.
Track backlog age and saturation when limits are hit; do not silently discard urgent
incidents. Keep redacted metadata under an explicit retention policy and fetch raw
provider evidence only as needed. Vercel Drains currently have plan restrictions
and usage charges; confirm actual entitlement, volume, and budget before selecting
Drains over the bounded polling fallback. [Vercel Drains](https://vercel.com/docs/drains)

Before implementation, select the pilot GitHub repository/install scope, Slack
workspace/channel and authorized responders, actual provider entitlements, retention
and spend limits, the critical-journey SLO definitions, and the shadow-to-publication
gate. These are configuration decisions still pending; this research does not
authorize posting messages, creating tickets, or modifying production settings.

Brain impact: this revision changes the research and phased proposal only. It does
not change API, schema, permissions, or implemented feature behavior; those documents
should change only when corresponding implementation is approved and delivered.

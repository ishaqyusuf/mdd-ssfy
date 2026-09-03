# Autonomous Production Error Management for GND

**Research date:** 2026-09-03  
**Scope:** Sentry, Trigger.dev, Vercel, regression prevention, and safe AI-assisted remediation  
**Source policy:** Product claims below are based on first-party vendor documentation and APIs.

## Executive recommendation

Use **Sentry as the canonical technical issue and triage system**, while adding a small **GND Reliability Control Plane** that correlates Sentry issues, Trigger.dev runs, Vercel deployments/logs, and GND business entities. Do not build another raw-log viewer. The control plane should retain normalized incident/occurrence metadata, provider IDs and links, state, ownership, release/deployment correlation, and automation audit history; Sentry, Trigger.dev, and Vercel remain the detailed evidence stores.

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

The autonomy boundary should initially be: **automatically detect, correlate, prioritize, assign, open a tracked issue, generate a failing regression test and draft fix PR; never automatically merge, deploy, mutate production data, replay a non-idempotent job, roll back, or mark an incident resolved.** Sentry Seer itself supports issue scan, actionability scoring, root-cause analysis, solutions, code changes, and PR creation with a configurable stopping point; its default stopping point is the solution step ([Sentry Seer](https://docs.sentry.io/product/ai-in-sentry/seer), [Start Seer Issue Fix API](https://docs.sentry.io/api/seer/start-seer-issue-fix/)).

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

Sentry should own the canonical technical issue ID because it already groups occurrences, tracks affected users and event volume, distinguishes new/escalating/regressed issues, understands releases, and attaches stack traces, breadcrumbs, replay, tags, and suspect commits. Resolved issues automatically become `Regressed` if they recur, and escalating issues reflect abnormal volume growth ([Issue Status](https://docs.sentry.io/product/issues/states-triage/)).

Recommended configuration:

- Finish the pending backend DSN and source-map rollout first. Enforce a single release identifier—prefer the git SHA—across Vercel web/API and Trigger jobs, plus `environment=production`, `runtime`, `service`, and domain `operation` tags.
- Send releases with commit refs and create a deploy marker for each production promotion. Sentry states that releases correlate first-seen errors to the release that may have introduced them and are required for source maps and other debugging features ([Create Release](https://docs.sentry.io/api/releases/create-a-new-release-for-an-organization/), [Create Deploy](https://docs.sentry.io/api/releases/create-a-deploy/)). Its Vercel integration can upload source maps and notify Sentry when releases are deployed ([Vercel integration metadata](https://docs.sentry.io/api/integrations/get-integration-provider-information/)).
- Replace the unconditional common fingerprint with default stack-based grouping. Preserve safe business classification in tags, then apply narrowly scoped fingerprint or stack-trace rules only after inspecting incorrectly grouped/separated events. Existing issues may be manually merged after the new-event grouping rule is corrected ([Sentry grouping guidance](https://www.sentry.help/en/articles/13964350-why-are-my-events-grouped-or-separated-incorrectly-in-sentry)).
- Add ownership rules for `runtime`, source path/module, URL/route, and domain operation. Sentry can sync CODEOWNERS and auto-assign to issue owners or suspect-commit authors ([Ownership Configuration API](https://docs.sentry.io/api/projects/update-ownership-configuration-for-a-project/)). A practical GND map is Sales/Payments, Inventory/Fulfillment, Jobs/Integrations, Web Platform, and Mobile.
- Use separate workflows instead of one catch-all rule:
  - P0: any new/regressed unhandled production issue in payment, sales-save, inventory mutation, dispatch completion, or auth/security operations;
  - P1: new/regressed high-priority issue, more than a small event threshold in five minutes, or more than one affected user;
  - P2: one isolated handled occurrence, aggregated into a digest unless it escalates.
  Sentry's current alert APIs support first-seen, reappeared, regression, priority, event-count, user-count, environment, static/percent-change, and dynamic anomaly conditions ([Create Alert](https://docs.sentry.io/api/monitors/create-an-alert-for-an-organization/), [Create Monitor](https://docs.sentry.io/api/monitors/create-a-monitor-for-a-project/)).
- Send the actionable alert to the GND ingestion endpoint and the responsible human channel. Sentry service hooks can emit `event.alert` and `event.created`, while the issues API supports filtered reconciliation reads and issue state/priority/assignee updates ([Service Hook API](https://docs.sentry.io/api/projects/register-a-new-service-hook/), [List Organization Issues](https://docs.sentry.io/api/events/list-an-organizations-issues/), [Update Issue](https://docs.sentry.io/api/events/update-an-issue/)).
- Treat suspect commits as evidence, not proof. With repository, release commit, and code-mapping data Sentry can show a suspect commit and suggest its author, which is useful for routing but must not justify automatic merge or blame ([Issue Details](https://docs.sentry.io/product/issues/issue-details/)).

### 2. Trigger.dev: terminal-run truth, retries, replay, and semantic checks

Use three complementary paths:

1. Keep the global `tasks.onFailure` path for immediate Sentry capture after task retries are exhausted.
2. Configure Trigger's **Run fails**, **Deployment fails**, and **Deployment succeeds** alerts to a verified webhook. Trigger provides SDK signature construction/verification for alert webhooks and identifies the event types as `alert.run.failed`, `alert.deployment.failed`, and `alert.deployment.success` ([Trigger Alerts](https://trigger.dev/docs/troubleshooting-alerts)).
3. Run a scheduled reconciliation task every five minutes using `runs.list`, filtering by terminal status and a created/updated watermark, then `runs.retrieve` when attempt/error detail is needed. The management API can filter by status, creation time, task, and version; retrieved runs include granular state, attempts and errors ([List Runs](https://trigger.dev/docs/management/runs/list), [Retrieve Run](https://trigger.dev/docs/management/runs/retrieve)). This closes webhook/hook gaps and identifies `TIMED_OUT`, `CRASHED`, `SYSTEM_FAILURE`, and `EXPIRED` runs described in the run lifecycle ([Runs](https://trigger.dev/docs/runs)).

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
- `IncidentOccurrence`: append-only provider evidence keyed uniquely by `(provider, providerEventId)`, carrying provider issue/run/request/deployment IDs, timestamp, route/task/operation/runtime, normalized error class/message hash, safe entity reference, release, trace/request correlation, and evidence link.

Correlation should be confidence-based:

1. exact Sentry issue ID or Trigger run ID;
2. exact distributed trace/request ID;
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

## Phased rollout

### Phase 0 — Restore trustworthy release gates (first)

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

### Phase 2 — Autonomous triage and regression PRs

- Add ownership rules/CODEOWNERS, priority policy, service/domain routing, and provider links.
- Auto-create one tracked GitHub issue per actionable incident.
- Enable Seer issue scans; enable automatic fix runs only for highly actionable, non-sensitive incidents, stopping at solution or draft PR.
- Require generated regression tests and the full review/preview gate.

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

## Bottom line

GND should not buy or build a fourth error console. Finish Sentry as the issue brain, make Trigger and Vercel reliable evidence feeds, correlate them in a small GND incident ledger, then let AI prepare tested draft fixes behind enforceable CI, preview, ownership, and production-recovery gates. The highest-return first work is operational activation and release safety—not broader AI autonomy: complete backend Sentry, correct over-grouping, add CI, stop allowing type errors to pass silently, and close Trigger/Vercel ingestion gaps.

# Task: Progressive AI Chat T20 — Build the assistant admin and feature delivery center

## Status
Backlog

## Priority
High

## Created Date
2026-09-13

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 20/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
User requested a dedicated follow-on ticket for individual assistant access, usage oversight, the complete new-feature request board, and the implementation history visible to administrators. T19 owns the secure entitlement, usage, quota, and governance foundation. This ticket turns those primitives and the T16 request lifecycle into a cohesive operating workspace without interrupting the active T11 implementation sequence.

## Product Outcome

Super administrators can decide exactly who may use Assistant, understand how it is being used, and operate requested capabilities from intake through release. Authorized users can see their own access and allowance, follow requests they submitted, subscribe or unsubscribe from release notices, and understand when a requested capability becomes available. Existing GND domain permissions remain the authority for every record, field, and action exposed through Assistant.

## Ownership Boundaries

- T16 owns missing-capability detection, requester consent, deduplication, AI-assisted engineering analysis, lifecycle events, and release subscriptions.
- T19 owns per-user entitlement enforcement, usage accounting, quota reservation/settlement, admin-only governance APIs, privacy, audit, and the minimum control surfaces needed to operate them safely.
- T20 owns the complete admin experience, cross-workflow views, prioritization support, implementation traceability, requester self-service, adoption insights, and operational polish built on T16/T19.
- T18 remains the authority for rollout verification, release readiness, monitoring, rollback, and canary evidence. A request cannot become `released` or notify subscribers until T18-compatible verification evidence is attached.

## Permission And Visibility Contract

- Assistant access is enabled per user. Role membership alone cannot grant Assistant access.
- Assistant access never bypasses Sales, Customer, Community, Inventory, Production, Fulfillment, Finance, Employee, document, organization, or row-level restrictions.
- Only existing super-admin authority can view or mutate access, organization-wide usage, quotas, costs, request prioritization, internal notes, engineering analysis, implementation links, and delivery audits.
- Normal users see only their own entitlement state, personal allowance, submitted requests, subscriptions, public lifecycle messages, and released capabilities they can actually use.
- Requester identity, raw chat, tool payloads, cost data, internal notes, implementation links, and sensitive AI-analysis evidence are independently redacted and audited.
- Disabling or expiring access immediately removes Assistant navigation and blocks direct API, reconnect, tool, artifact, and job continuation paths while retaining permitted history under the configured retention policy.

## Progressive Access And Rollout Contract

- Treat Assistant enablement as a product entitlement on an individual account, separate from job role and business-data permission grants.
- Support manual enable/disable, scheduled start, optional expiry, temporary pilot access, and an organization-wide emergency pause. Every change records actor, reason, previous state, and effective time.
- Resolve the entitlement at initial page load, stream admission, reconnect, tool execution, approval continuation, artifact download, background-job resume, and release-notification delivery.
- Support rollout cohorts and percentage-based pilots only as administrator conveniences that materialize explicit user entitlements. Cohort membership must not become a hidden permission path.
- Let administrators assign model, provider, tool-category, request, token, concurrency, and cost policies per user or inherited template while preserving a readable effective-policy explanation.
- Provide warning-only, hard-limit, and dry-run modes. Emergency pauses and hard limits return typed, user-readable states with reset or support guidance.
- Preserve conversation and request history when access is removed according to retention policy; block new model work and mutations immediately and safely settle already-incurred usage.
- Measure rollout health by access cohort, including activation, first successful task, repeated use, tool failure, denial, abandonment, cost, and requested-capability gaps.

## Admin Information Architecture

Use the normal dashboard navigation and layout; do not add a separate Assistant header.

1. **Overview** — enabled users, active users, requests/tokens, estimated cost, quota warnings, failure rate, open feature demand, releases, and operational alerts.
2. **Access** — searchable employees, entitlement status, expiry, reason, quota template/override, last usage, and immutable administrator history.
3. **Usage** — bounded trends and drill-down by user, domain, action/tool, model, provider, request class, status, latency, tokens, and estimated cost.
4. **Limits** — templates, per-user overrides, warning-only budgets, hard limits, temporary grants, effective dates, reset rules, and dry-run impact.
5. **Feature requests** — board/list views, demand, subscribers, domain, lifecycle, priority, owner, target release, blockers, AI-analysis state, and delivery confidence.
6. **Request detail** — safe originating summary, duplicates, clarification, human decisions, AI analysis with cited knowledge versions, Brain ticket, code/release references, rollout evidence, subscriber deliveries, and rollback history.
7. **Operations** — reconciliation backlog, failed analyses, failed notifications, unusual usage, denied-action spikes, quota races, and stale implementation records.

## Feature Request Delivery Contract

- Convert an unavailable capability into a concise editable request; keep `Notify developers`, `Not now`, and release-subscription consent separate.
- Group likely duplicates while preserving every requester, evidence item, consent state, vote/demand signal, and subscription.
- AI analysis proposes affected domains, likely reusable tools, required permissions, schema/API impact, dependencies, risk, evaluation cases, and an implementation outline. It must cite versioned registry/schema/repository inputs and never auto-accept, prioritize, assign, or release work.
- Authorized administrators can request clarification, merge, accept, reject, prioritize, assign, target a release, link or create a Brain ticket, record blockers, move lifecycle status, and approve or return AI analysis for revision.
- Every transition is append-only and attributable to a human, system job, AI analysis run, rollout verifier, or notification delivery.
- Requesters receive public status updates that omit internal notes, sensitive evidence, cost, private implementation details, and other requester identities.
- Release notifications are deduplicated per subscriber and release, re-check consent, entitlement, domain access, and capability availability at send time, and expose unsubscribe controls.
- Each request receives a stable public identifier and a separate internal engineering record. Public status survives merges and implementation-ticket changes without exposing repository or sensitive operational details.
- Clarification questions, requester responses, AI analysis revisions, human decisions, implementation milestones, verification evidence, and delivery attempts share one ordered event timeline with audience visibility on each event.
- A request may map to an existing capability, one planned capability, or multiple implementation tickets. Closing it as already available must include a usable deep link or saved action the requester is authorized to run.
- Status changes use explicit preconditions so concurrent administrators, automated analysis, deployment jobs, and notification workers cannot overwrite one another or publish an unverified release.
- Administrators can set service targets for triage, clarification, decision, and verification; overdue indicators are operational signals rather than automatic priority changes.

## Recommendations And Prioritization

- Calculate an explainable priority suggestion from distinct affected users, frequency, recency, business domain, workflow blockage, workaround cost, strategic fit, implementation size, risk, and dependencies. Show the factors; an administrator makes the final decision.
- Distinguish votes, duplicate reports, subscribed users, active affected users, and estimated reach instead of collapsing them into one demand number.
- Add capability-gap analytics by domain and denied/unavailable intent so the team can see where users repeatedly ask for missing work.
- Show time in state, request age, clarification latency, implementation lead time, verification time, notification success, and post-release adoption.
- Detect requests that appear solved by an existing action and let administrators reply with the available capability rather than creating redundant work.
- Recommend reusable tool/action candidates from successful repeated conversations, but require developer review before publishing organization-wide tools.
- Provide saved admin views and filters for `high demand`, `quick wins`, `blocked`, `needs clarification`, `analysis failed`, `ready for verification`, and `release notification failed`.
- Add a weekly administrator digest for new demand, rapidly growing duplicate clusters, stalled requests, quota anomalies, releases awaiting verification, and failed subscriber deliveries.
- Let administrators compare the AI proposal with the approved implementation scope and highlight drift in permissions, database changes, tools, dependencies, tests, and release criteria before work is marked ready.
- Add a safe preview of requester-facing copy and release notifications so internal notes, identities, code links, costs, and restricted capability details cannot leak through summaries.
- Track feature-request conversion from submission to accepted work, release, first use, and repeated use; use this to identify low-value delivery and improve future prioritization.
- Make all charts and rankings explain their date window, data freshness, excluded events, and estimated-versus-provider-reported cost so administrators can interpret them correctly.
- Provide reversible bulk operations with a preview of affected users or requests, validation errors, and an immutable result record for partial success.
- Add retention and deletion jobs for usage metadata, request evidence, AI-analysis inputs, and delivery logs, with legal/support holds separated from ordinary admin access.

## Delivery Slices

1. **T20A — Admin shell and access operations:** normal dashboard navigation, summary cards, access search, entitlement controls, audit timeline, and personal status/meter.
2. **T20B — Usage and limits workspace:** charts, filters, bounded drill-down, templates/overrides, dry-run budgets, exports, anomalies, and reconciliation actions.
3. **T20C — Feature delivery board:** list/board views, detail workspace, deduplication, clarification, analysis review, priority, ownership, dependencies, and Brain ticket linkage.
4. **T20D — Implementation and release history:** code/release/verification links, immutable timeline, subscriber delivery audit, rollback state, and requester-facing status history.
5. **T20E — Intelligence and adoption:** explainable priority suggestions, capability-gap trends, existing-tool matches, post-release adoption, saved views, and operational alerts.

## Implementation Progress
- Completion: 0%
- Current Checklist: 0/25 — admin and feature delivery center
- Blockers: T02, T03, T06, T16, T17, T18, and T19

## Implementation Checklist
- [ ] Define the final authorization matrix for super-admin, enabled user, disabled user, expired user, request owner, subscriber, and domain-restricted user views/actions.
- [ ] Add normal-dashboard Assistant Admin navigation with Overview, Access, Usage, Limits, Feature requests, and Operations routes; no separate Assistant header.
- [ ] Build Overview metrics with bounded date filters, freshness labels, drill-down links, loading/empty/error states, and privacy-safe totals.
- [ ] Build individual and bulk access operations with reason, optional expiry, temporary pilot grant, quota assignment, confirmation for broad changes, and immutable audit history.
- [ ] Add scheduled access, explicit rollout cohorts, an organization emergency pause, and server checkpoints that stop new or resumed work immediately after revocation.
- [ ] Add effective-policy resolution for user/template model, provider, tool-category, request, token, concurrency, and cost controls with a human-readable explanation of inherited values.
- [ ] Show each user a compact personal entitlement and allowance meter with warning, exceeded, expiry, reset, and support states.
- [ ] Build usage tables and charts with server pagination and filters for user, domain, action/tool, model/provider, request class, outcome, latency, tokens, and estimated cost.
- [ ] Build quota templates, inheritance preview, per-user overrides, effective dates, timezone/reset semantics, warning-only/hard-limit modes, and dry-run impact reports.
- [ ] Add authorized CSV export and reconciliation views that use the same filters, redaction, and scope as on-screen results.
- [ ] Build list and board views for feature requests with demand, subscribers, domain, lifecycle, priority, owner, target release, blockers, analysis state, and age/time-in-state.
- [ ] Build request detail with safe source context, duplicate cluster, clarification thread, consent/subscription totals, internal notes, public updates, and full immutable event history.
- [ ] Give each request a stable public identifier, audience-scoped timeline events, and mappings to existing capabilities or one-to-many implementation tickets without exposing private engineering data.
- [ ] Add reviewed request transitions for clarify, merge, accept, reject, prioritize, assign, plan, start, verify, release, cancel, duplicate, and rollback with transition preconditions.
- [ ] Render AI engineering analysis with cited knowledge versions, affected domains, proposed tools, permission/schema/API impact, dependencies, risks, estimates, tests, and approve/revise controls.
- [ ] Link accepted requests to the canonical Brain task, implementation references, capability/registry version, deployment/release, verification evidence, and rollback record.
- [ ] Add requester self-service for `My feature requests`, public status history, clarification responses, subscribe/unsubscribe, and release availability deep links.
- [ ] Deliver deduplicated release notices only after verified availability and re-check current consent, entitlement, domain access, and capability state immediately before delivery.
- [ ] Add explainable priority suggestions, existing-capability matches, capability-gap analytics, quick-win/dependency views, and human override history.
- [ ] Add configurable triage/clarification/decision/verification targets, overdue queues, and administrator digests without allowing elapsed time to mutate priority automatically.
- [ ] Measure post-release discovery, first use, repeated use, failure/denial, and subscriber conversion without storing raw prompts in routine analytics.
- [ ] Add alerts and recovery actions for unusual usage, quota exhaustion, denied-action spikes, reconciliation backlog, stale AI analysis, stalled requests, and failed release notifications.
- [ ] Add retention/deletion jobs, audited support holds, requester-facing preview/redaction checks, and reversible bulk-operation previews with partial-success records.
- [ ] Verify accessibility, keyboard workflows, responsive layouts, empty/loading/error/partial/stale states, normal dashboard navigation, and deep links with browser screenshots.
- [ ] Test authorization isolation, forged admin calls, mid-session revocation, quota/report consistency, duplicate merges, lifecycle races, audit immutability, sensitive redaction, verification gates, delivery deduplication, unsubscribe, rollback, and adoption metrics.

## Acceptance Criteria

- A super administrator can enable one employee without changing the employee role; only that user gains Assistant access, and all existing business permissions still apply.
- The Overview, Usage, and Limits views reconcile with the T19 ledgers and never expose routine raw prompts, tool payloads, or another user's private conversation.
- Administrators can follow a feature request from submission through clarification, reviewed AI analysis, planning, implementation, verification, release, notification, adoption, and rollback in one attributable timeline.
- Duplicate merging never loses requester evidence, demand, consent, subscriptions, or prior history.
- AI recommendations remain explainable suggestions, and every priority, assignment, acceptance, release, and rollback decision identifies the authorized human actor.
- Requesters can track their own requests and subscriptions without seeing internal notes, other requester identities, private engineering context, or unavailable capabilities.
- Release notices send at most once per subscriber/release and only after verification plus current access/consent checks pass.
- The workspace uses the ordinary dashboard shell and passes desktop/mobile browser QA with no separate Assistant header.

## Validation Evidence
- Planning only. T20 adds no application code, schema, API, permissions, provider usage, or notification delivery yet.

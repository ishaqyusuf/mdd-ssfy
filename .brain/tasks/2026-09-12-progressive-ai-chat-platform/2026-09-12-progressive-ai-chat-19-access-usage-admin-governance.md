# Task: Progressive AI Chat T19 — Control individual access, usage, quotas, and admin governance

## Status
In Progress

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 19/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
User requested account-by-account assistant enablement instead of role permission grants, plus super-admin token/request oversight, per-user limits, and a feature-request implementation board. This ticket extends T16's request lifecycle and gates the T18 rollout. Depends on T02, T03, T06, T16, and T17.

## Product Contract

- Assistant access is an explicit per-user entitlement. Enabling a role does not automatically enable its members.
- The individual entitlement opens the assistant product; it does not widen business-data access. Every tool continues to enforce the user's current domain grants, organization/user scope, row filters, and field redaction at execution time.
- Dashboard navigation, conversation APIs, streaming/reconnect, tool discovery/execution, artifact jobs, and notifications all check the current entitlement server-side. Disabling access takes effect immediately while retaining history under its retention policy.
- Existing super-admin authorization protects governance screens and mutations. Assistant entitlement does not grant admin access.
- Usage reporting stores operational metadata, token counts, outcomes, latency, model/provider, and estimated cost. Raw prompts and tool payloads are excluded from routine usage views.
- Quotas reserve capacity before provider work and settle actual usage so concurrent requests cannot silently exceed a user's limit.
- T16 remains the feature-request source of truth. T19 supplies its super-admin board and implementation/release history without creating a second lifecycle.

## Proposed Delivery Slices

1. **T19A — Individual access:** entitlement storage, super-admin controls, server enforcement, expiry, revocation, and audit history.
2. **T19B — Usage accounting:** provider-normalized token ledger, request/run counters, tool-call counts, latency, estimated cost, and reconciliation.
3. **T19C — Limits and reporting:** atomic quotas, warnings, user meter, super-admin dashboards, filters, drill-down, and export.
4. **T19D — Request governance:** T16-backed demand board, AI-analysis review, implementation links, release history, and subscriber delivery audit.

The slices are implementation checkpoints inside this ticket. T20 productizes these foundations as the complete admin and feature-delivery workspace; neither ticket interrupts the active T11 sequence.

## Data And Accounting Contract

- `AssistantUserEntitlement` is keyed by user and records `enabled`, optional `expiresAt`, reason, creator/updater, and timestamps. An append-only entitlement event records every enable, disable, expiry, and override.
- `AssistantUsageEvent` is idempotent by provider request/run identity. It records the actor and resolved scope captured at request time, model/provider, request class, token categories, tool calls, latency, terminal outcome, and estimated cost in integer micros.
- `AssistantQuotaPolicy` supports request, token, concurrent-run, and optional cost limits. Null means unlimited. Effective dates and policy snapshots make historical reports reproducible after a limit changes.
- `AssistantQuotaReservation` prevents concurrent streams from overspending. Reserve before provider work; settle actual reported usage; release unused capacity; send unresolved outcomes to reconciliation.
- Usage accounting distinguishes input, cached input, output, and reasoning tokens when the provider supplies them. Provider totals remain authoritative and missing categories stay null rather than being guessed.
- Retried provider calls are counted as separate provider usage events under one user-visible run. Replayed UI requests and idempotent tool retries do not create duplicate charges.
- Estimates use a versioned model-price snapshot. Reports label estimated cost clearly and preserve the original price version used for each event.

## API And Enforcement Contract

- Add a lightweight authenticated bootstrap query that returns `enabled`, expiry, quota warning/exceeded state, remaining allowance, and reset time without exposing admin-only spend data.
- Add super-admin-only list/detail/update endpoints for entitlements, quota policies, usage reports, exports, reconciliation, and feature-request governance.
- Re-read entitlement and quota state at stream admission and before every tool or job continuation; never trust a client-supplied access flag or cached sidebar state.
- A disabled user cannot create, continue, retry, reconnect to, or execute tools in a conversation. Read-only history behavior follows the configured retention/support policy and must be explicit in the UI.
- Disabling access during a run cancels further model/tool work at the next server checkpoint and safely settles already incurred provider usage.
- Rate limits protect infrastructure; quotas enforce the configured per-user allowance. Their error states and counters remain separate.

## Dashboard Contract

- The ordinary dashboard navigation shows Assistant only when the bootstrap entitlement is active; there is no separate assistant header.
- Super Admin gets an Assistant administration area with `Access`, `Usage`, `Limits`, and `Feature requests` views.
- Access lists show employee, account status, assistant state, expiry, current quota template/override, recent usage, last request, and last administrator action.
- Usage supports date/user/model/provider/request-class/status/domain filters; summary cards and charts drill into bounded, paginated events without loading raw conversations.
- Each enabled user sees a compact personal meter with requests/tokens remaining, next reset, and threshold warnings. Exact cost, rankings, and other users remain admin-only.
- The feature-request board supports list/board views, demand and subscriber counts, domain, status, priority, owner, target release, blockers, AI analysis review state, and an immutable implementation timeline.
- Request details link the originating safe summary, merged duplicates, clarification history, Brain ticket, implementation references, rollout verification, notification delivery, and rollback events. Sensitive prompt excerpts require a separate audited support action.

## Lifecycle And Status Vocabulary

- Entitlement: `enabled`, `disabled`, `expired`.
- Usage outcome: `reserved`, `running`, `succeeded`, `failed`, `cancelled`, `unknown`, `reconciled`.
- Feature request: `submitted`, `needs_clarification`, `under_review`, `accepted`, `planned`, `in_progress`, `verification`, `released`, `rejected`, `duplicate`, `cancelled`, `rolled_back`.
- AI analysis: `queued`, `running`, `ready_for_review`, `approved`, `needs_revision`, `failed`. AI analysis never accepts, prioritizes, or releases a request without an authorized human action.

## Implementation Progress
- Completion: 15%
- Current Checklist: 2/15 — individual entitlement enforcement foundation
- Blockers: None for T19A; administrator UI, bulk operations, usage accounting, quotas, and request governance remain.

## Implementation Checklist
- [x] T19A: Add individual entitlement storage and immutable audit events with enabled/disabled state, optional expiry, actor, reason, and timestamps.
- [ ] T19A: Resolve entitlement from authenticated server context and enforce it at navigation bootstrap, history, stream/reconnect, tool catalog/execution, background jobs, artifacts, and release notifications.
- [x] T19A: Preserve all existing domain permissions, organization/user row scope, and field redaction after assistant access is enabled.
- [ ] T19A: Build super-admin access controls with search/filter, single and bulk enable/disable, expiry, reason capture, current-state labels, and audit timeline.
- [ ] T19B: Persist an idempotent usage ledger per provider request/run with actor snapshot, model/provider, request class, token categories, tool calls, latency, outcome, and estimated cost in integer micros.
- [ ] T19B: Normalize provider usage receipts and versioned price snapshots; add unknown-usage reconciliation without exposing prompt or tool payloads in routine reports.
- [ ] T19C: Add daily/monthly per-user policies for tokens, requests, concurrent runs, and optional cost, with warning thresholds, timezone/reset rules, effective dates, templates, temporary overrides, and unlimited/null semantics.
- [ ] T19C: Implement atomic reserve/settle/release accounting for streams, retries, disconnects, provider errors, tool subcalls, and jobs without double charging.
- [ ] T19C: Return typed `access_disabled`, `quota_warning`, and `quota_exceeded` states with remaining allowance/reset time and render the personal usage meter.
- [ ] T19C: Build bounded super-admin reports for totals, trends, top users, model/tool mix, success/failure, latency, estimated spend, allowance, anomalies, drill-down, and CSV export.
- [ ] T19D: Build the T16-backed feature-request board with deduplicated demand, subscribers, domain, status, priority, owner, AI-analysis review, clarification, linked capability, target release, and blockers.
- [ ] T19D: Add the immutable implementation timeline connecting triage decisions, Brain/task ticket, code references, rollout verification, release version, subscriber delivery, and rollback/disable events.
- [ ] Add privacy and retention controls: metadata-only default views, explicit audited sensitive-content access, redaction, ledger retention, export authorization, and deletion behavior.
- [ ] Add anomaly alerts for unusual volume, rapid quota exhaustion, repeated denied tools, reconciliation backlog, provider-cost drift, and feature-notification delivery failures.
- [ ] Test disabled/expired users, mid-stream disable, preserved domain denial, cross-user/scope reads, forged admin calls, quota races, retries, reset boundaries, overrides, cost rounding, exports, board transitions, and audit immutability.

## Acceptance Criteria

- A super admin can enable one employee account, and only that account gains Assistant navigation and API access without changing its role.
- An enabled user still cannot discover or execute a business tool, view a row, or receive a sensitive field that their existing domain access denies.
- A disabled or expired account receives a typed unavailable state from direct API calls even if it manually enters the Assistant URL.
- Every provider request settles exactly once into request/token/cost totals, including cancellation, retry, disconnect, timeout, and unknown-outcome reconciliation paths.
- Two concurrent requests cannot exceed a hard user limit through a race. Warning-only budgets never block work.
- Super-admin totals reconcile to the bounded event ledger, filters and CSV export apply the same authorization/scope, and routine usage views contain no raw prompt or tool payload.
- Feature requests can be merged without losing requester consent or subscriber history, and every human/AI/implementation/release transition remains attributable and append-only.
- Subscribers are notified only after linked capability rollout verification succeeds, only when consent remains active, and at most once per release event.

## Recommended Enhancements

- Show each enabled user a compact usage meter and warning before the limit, while keeping exact spend and organization-wide comparisons admin-only.
- Let super admins define reusable quota templates and per-user overrides without losing inherited-policy history.
- Separate hard limits from alert budgets so usage can be observed before enforcement is enabled.
- Track cached-input and reasoning tokens separately where providers expose them; preserve raw provider usage receipts in restricted metadata for reconciliation.
- Alert on unusual volume, repeated denied tools, rapid quota exhaustion, and provider-cost drift.
- Merge duplicate feature requests while preserving each requester/subscriber and consent state.
- Add board views by domain, lifecycle, demand, owner, target release, and blocked dependency. A release-ready queue cannot notify subscribers until T18 verification passes.
- Add a dry-run quota mode that shows who would have been blocked before hard enforcement is activated.
- Support temporary access and quota grants for pilots, with automatic expiry and advance admin/user reminders.
- Add model-routing policy by user or quota template so lower-cost models can be preferred without changing tool permissions.
- Add admin notes and internal tags to user access and feature requests, excluded from user-visible chat history.
- Keep organization-wide safety caps and chargeback/showback reporting as a later extension; the first implementation remains per-user as requested.

## Validation Evidence
- 2026-09-13 T19A foundation adds explicit fail-closed per-user entitlement state, audited enable/disable/expiry transitions, optimistic administrator updates, bootstrap/navigation/direct-route gating, and enforcement through the existing Assistant actor boundary. Enabling access continues to derive all business grants and scope from current role and individual domain permissions.
- Focused access and sidebar validation passes 21 tests / 73 assertions; Prisma client generation and focused Biome checks pass. API typecheck reaches only the unrelated existing `packages/sales/src/copy-sales.ts:521` nullable-string diagnostic.
- 2026-09-13 planning review expanded the ticket into four delivery slices with explicit data, API, dashboard, lifecycle, privacy, accounting, and acceptance contracts.
- Planning only; no entitlement, quota, usage ledger, admin screen, request-board behavior, schema, or application code is implemented by this ticket update.

# Task: Progressive AI Chat T16 — Intake missing features and notify subscribers

## Status
Done

## Priority
Medium

## Created Date
2026-09-13

## Last Updated
2026-09-12

## Global Ticket
- Ticket Position: 16/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
GND extension for the requested unavailable-feature card, developer notification, AI engineering analysis, and release opt-in. Depends on T02, T05, T06, and T17.

## Implementation Progress
- Completion: 100%
- Current Checklist: 9/9 — feature lifecycle
- Blockers: None

## Implementation Checklist
- [x] Classify missing capability separately from denial, ambiguity, unmet prerequisite, outage, and degraded rollout.
- [x] Render editable request summary, `Notify developers`, `Not now`, and an independent unchecked release-notification checkbox.
- [x] Persist deduplicated request, consent, evidence, and immutable lifecycle event in one transaction.
- [x] Queue bounded AI analysis against versioned repository/schema/registry knowledge and cite the inputs used.
- [x] Add developer triage inbox with merge, clarify, accept, reject, status, owner, and reviewed-analysis controls.
- [x] Link accepted requests to capability/release versions and publish availability only after rollout verification.
- [x] Deliver opted-in notices through the existing deduplicated notification/outbox path with current consent/access checks.
- [x] Provide request status and unsubscribe controls in the assistant menu.
- [x] Test double clicks, deduplication, decline, analysis failure, revoked consent/access, delivery outage, and zero-send `Not now`.

## Validation Evidence
- Added the request/submission/subscription/event/analysis/release/outbox schema and generated additive migration `20260913210000_assistant_feature_requests`.
- The standard migration command stopped safely on pre-existing local migration drift. The generated T16 SQL was applied to local development in isolation; preview and production were unchanged.
- Added a versioned missing-capability tool/card, editable request dialog, personal status/unsubscribe list, Super Admin triage queue, verified release publishing, and deep links from existing notifications.
- Submission uses a serializable transaction, canonical upsert, durable client request identity, immutable event sequence, and deduplicated analysis/developer-notification jobs.
- AI analysis is typed, bounded to 3,000 output tokens and 45 seconds, retries safely, recovers stale claims, and rejects citations outside the saved curated knowledge snapshot.
- Release delivery rechecks active consent, current grants, rollout verification, and publication state. Accepted canonical and merged requests share one release and deduplicated subscriber notices.
- `bun run db:generate` passed. The combined Assistant API/dashboard suite passes 223 tests and 970 assertions. API typecheck reaches only the unrelated existing `packages/sales/src/copy-sales.ts:521` nullability error; dashboard typecheck exhausted its 4 GB heap without reporting a T16 diagnostic.
- Browser verification confirmed the Requests action in the normal dashboard toolbar and the editable request form with its independent unchecked notification checkbox and enabled Notify developers action. The existing shared process did not return caller request history, so that live authenticated read remains unclaimed; the process was left undisturbed as requested.

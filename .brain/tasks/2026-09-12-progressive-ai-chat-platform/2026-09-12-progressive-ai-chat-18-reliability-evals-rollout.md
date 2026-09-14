# Task: Progressive AI Chat T18 — Operationalize reliability, evaluations, and rollout

## Status
Backlog

## Priority
Medium

## Created Date
2026-09-12

## Last Updated
2026-09-12

## Global Ticket
- Ticket Position: 18/19

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
Final cross-cutting rollout ticket after the platform and first domain packs. Depends on T03–T17 and T19.

## Implementation Progress
- Completion: 0%
- Current Checklist: 0/9 — production readiness
- Blockers: T03–T17, T19

## MVP Audience Decision — 2026-09-14

The first MVP is limited to authenticated Super Admin accounts. MVP acceptance uses
that audience for desktop dashboard verification, provider/tool kill switches,
usage evidence, recovery, and permission-negative checks. Broader employee cohorts,
per-employee quota operations, compact/mobile acceptance, adoption measurement, and
organization-wide rollout remain later phases. Super Admin status does not bypass
domain tool grants, row scope, field redaction, explicit action approval, or
idempotency checks.

## Implementation Checklist
- [ ] Add structured metadata-only telemetry for runs, tool selection, queries, costs, approvals, jobs, effects, and notifications.
- [ ] Add per-user/scope quotas, provider/tool kill switches, concurrency and cost ceilings.
- [ ] Build curated positive, ambiguity, denied, adversarial, injection, stale-data, and domain-invariant evaluation suites.
- [ ] Measure tool-selection accuracy, answer/source quality, first progress, completion latency, query load, token use, and failure recovery.
- [ ] Add resumable checkpoints and reconcile unknown outcomes without replaying completed effects.
- [ ] Run load, disconnect/reconnect, provider outage, job retry, notification outage, and cache-isolation exercises.
- [ ] Pilot read-only tools first, then artifacts/drafts, then confirmed mutations by tool-specific canary.
- [ ] Publish rollback/disable procedures, on-call diagnostics, data-retention operations, and support playbooks.
- [ ] Close rollout only after authenticated desktop/compact acceptance and permission-negative evidence pass.

## Validation Evidence
- Nothing yet

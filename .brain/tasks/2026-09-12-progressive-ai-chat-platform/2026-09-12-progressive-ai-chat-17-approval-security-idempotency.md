# Task: Progressive AI Chat T17 — Enforce approval, authorization, and idempotency

## Status
Complete

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 17/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
Cross-cutting gate for every catalog entry, query, artifact, recipe, write, external send, and job. Begins after T01 and must land before domain mutation pilots.

## Implementation Progress
- Completion: 100%
- Current Checklist: 9/9 — adversarial validation and independent review
- Blockers: None. Local migration application remains environment-limited because the configured endpoint is unavailable.

## Implementation Checklist
- [x] Create the per-tool actor/profile/operation/row/field/artifact permission matrix and denied-user fixtures.
- [x] Enforce access at catalog visibility, execution, row selection, field projection, history/artifact retrieval, and job resume.
- [x] Define read/draft/artifact/write/external-send/destructive effect levels and confirmation policies.
- [x] Persist proposals with actor, exact versioned inputs, target revisions, diff, expiry, nonce, and idempotency identity.
- [x] Accept confirmation only through a server-validated UI event and atomically claim single-use proposals.
- [x] Recompute authorization, business preflight, pricing/configuration, and target revisions immediately before commit.
- [x] Persist mutation outcomes so timeout/retry checks status without repeating effects.
- [x] Redact protected record existence, prompts, secrets, signed links, and sensitive tool payloads from logs/history.
- [x] Run prompt-injection, forged-result, horizontal/vertical access, replay, conflict, revocation, and unknown-outcome tests.

## Validation Evidence
- Full Assistant API/dashboard matrix passes: 242 tests / 1,018 assertions.
- Focused Biome/static validation passes for all T17 API, runtime, persistence, registry, dashboard, and schema files.
- API typecheck reaches only the unrelated existing `packages/sales/src/copy-sales.ts:521` nullable-string error.
- Dashboard typecheck completed with an 8 GB heap and reported the existing broad repository baseline; filtered output contains no touched Assistant-file diagnostic.
- Prisma generation passed. Applying `20260913220000_assistant_proposal_execution` remains environment-limited because Prisma cannot reach the configured local MySQL endpoint at `127.0.0.1:3307`.
- In-app browser proof captured the development-only synthetic PDF approval dialog with exact action, effect, revision, parameters, and Decline/Confirm controls. No PDF, provider call, or business mutation occurred.
- Independent specification and engineering-standards re-reviews reported no remaining Blocker, P1, or P2 findings.

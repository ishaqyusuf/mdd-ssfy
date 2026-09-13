# Task: Progressive AI Chat T13 — Draft and create orders from customer requests

## Status
In Progress

## Priority
High

## Created Date
2026-09-13

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 13/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
GND-specific text and image request workflow using the existing Sales Request generator and native form initializer. Depends on T09, T10, and T17.

## Implementation Progress
- Completion: 25%
- Current Checklist: 2/8 — typed guarded preview plus durable native form
  hydration are complete; full evidence presentation and canvas editing remain
- Blockers: T09 and T10 are complete. T17 remains the activation and nested-usage
  accounting gate for paid draft generation and reviewed order creation.

## Implementation Decisions
- Register `sales_draft_from_request@1` separately from final
  `sales_create_order@1` so a generated native seed can be reviewed without a
  Sales write.
- Reuse `NewSalesFormSeed` as the output authority and derive request type and
  unresolved count at the trusted handler boundary.
- Preserve published configuration revision, provider/model identity, prompt
  version, generation ID, and bounded provider token usage in the typed preview.
- Keep the first surface text-only. Unknown image fields fail strict schema
  validation until the evaluated image phase begins.
- Reuse the production Sales Request preview orchestrator, pilot authority,
  benchmark approval, usage reservation, repeatable-read configuration snapshot,
  actor-bound telemetry, and zero-retry live provider policy.
- Require a `published` catalog authority record whose `publishedRevision`
  exactly matches the generated configuration context before reserving usage or
  invoking a provider.
- Thread the request cancellation signal from MCP through the registry into Sales
  Request generation so abandoned chat turns do not continue paid work.
- Stream and persist only a strictly parsed `data-assistant-order-draft` part,
  then prepare it in an adjacent dashboard canvas through the existing native
  Sales proposal and generic initializer path.

## Implementation Checklist
- [x] Expose existing text request generation as a typed preview tool using published configuration.
- [x] Hydrate the native `NewSalesFormSeed` through the existing generic initializer.
- [ ] Show source evidence, unresolved fields, catalog revision, services/delivery, and authoritative pricing.
- [ ] Open the existing Sales form in the artifact canvas for edit/apply/discard without duplicating pricing logic.
- [ ] Persist a reviewed action proposal before order creation and recheck permission/configuration/revision on confirm.
- [ ] Execute canonical save with idempotency and return the exact saved order/result links.
- [ ] Add request-image OCR/evidence mapping only after text acceptance and reject low-quality/illegible inputs.
- [ ] Verify manual-entry parity, reopen, conflict, duplicate confirm, multilingual text, handwriting, and no-guessed specifications.

## Validation Evidence
- `assistant-catalog-v6` contains a strict `sales_draft_from_request` preview
  contract with `draft` effect, `editOrders` grant, native seed output, published
  catalog source evidence, unresolved warnings, and an `order-draft` component key.
- Normal registry execution keeps it `coming_soon` until T17; the durable handler
  contract can be tested without making a paid provider call.
- The default service now reuses `createSalesRequestPreview` with existing pilot,
  quote-creation permission, usage, current benchmark approval, repeatable-read
  catalog snapshot and publication authority, provider, and durable actor-bound
  telemetry services.
- The orchestration has an injectable boundary with focused guarded-denial,
  success lifecycle, terminal provider failure, and cancellation propagation
  coverage.
- The complete Assistant suite passes 95 tests / 415 assertions. Targeted Biome,
  `git diff --check`, and the independent standards review are clean. API
  typechecking reaches only the pre-existing nullable value error in
  `packages/sales/src/copy-sales.ts:521`.
- Trusted draft output is strictly parsed, emitted as a dedicated durable chat
  part, restored from conversation history, parsed again in the dashboard, and
  opened in an adjacent draft canvas inside the normal dashboard shell.
- The canvas reuses `applySalesRequestGenerationProposal` with
  `performApply: false`, the native generic initializer, fresh component
  resolution, and exact published-revision validation. Unresolved, stale,
  initializer-blocked, query-failure, loading, and draft-switch states have
  focused coverage and accessible terminal/status presentation.
- Combined focused and complete suites pass: Assistant 96/96, dashboard Assistant
  43/43, Sales Request route/settings/canvas matrix 31/31. Dashboard typechecking
  is clean; API typechecking still reaches only the unrelated existing
  `copy-sales.ts:521` error. Both independent reviews are clean after fixes.
- Next implementation slice will show complete source, service, delivery, and
  pricing evidence before enabling edit/apply/discard behavior.

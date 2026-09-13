# Task: Progressive AI Chat T13 — Draft and create orders from customer requests

## Status
In Progress

## Priority
High

## Created Date
2026-09-13

## Last Updated
2026-09-12

## Global Ticket
- Ticket Position: 13/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
GND-specific text and image request workflow using the existing Sales Request generator and native form initializer. Depends on T09, T10, and T17.

## Implementation Progress
- Completion: 8%
- Current Checklist: 0/8 — typed native preview contract is complete; live
  Sales Request orchestration and canvas hydration remain
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

## Implementation Checklist
- [ ] Expose existing text request generation as a typed preview tool using published configuration.
- [ ] Hydrate the native `NewSalesFormSeed` through the existing generic initializer.
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
- The complete Assistant suite passes 90 tests / 402 assertions. Targeted Biome
  and both independent spec/standards reviews are clean.
- Next implementation slice will connect the existing Sales Request preview
  orchestration, current pilot/benchmark/usage gates, native seed initializer, and
  editable Sales form artifact canvas. No checklist item is marked complete until
  that real default-service path is connected.

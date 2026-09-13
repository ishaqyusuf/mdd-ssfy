# Task: Progressive AI Chat T10 — Ship Sales and customer read tools

## Status
Done

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 10/19

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
First useful GND tool pack, following Midday's domain-namespaced typed MCP tools. Depends on T05, T08, and T17's permission contract before pilot.

## Implementation Progress
- Completion: 100%
- Current Checklist: 7/7 — complete
- Blockers: None

## Implementation Checklist
- [x] Register authorized `sales.findOrders`, `sales.getOrderStatus`, `sales.explainBlockers`, and `sales.getTimeline` tools.
- [x] Register bounded `customers.find`, `customers.getSummary`, and safe customer-order history tools.
- [x] Reuse canonical Sales lifecycle, payment, inventory, fulfillment, and dispatch projections.
- [x] Add ambiguity pickers, keyset pagination, narrow projections, source revisions, and deep links.
- [x] Preserve decimal currency, quantities, archived/deleted semantics, and field-level redaction.
- [x] Add related-tool hints and curated question-to-tool evaluations.
- [x] Verify Sales rep, manager, dealer/customer, denied-user, stale-revision, and duplicate-order-number cases.

## Validation Evidence
- `bun test apps/api/src/assistant packages/db/src/queries/assistant.test.ts packages/db/src/queries/assistant-sales.test.ts apps/dashboard/src/components/assistant/assistant-entities.test.ts` — 79 tests / 331 assertions pass.
- `bun run typecheck --filter @gnd/db` passes. `bun run typecheck --filter @gnd/api` reaches only the unrelated existing `packages/sales/src/copy-sales.ts:521` nullable-string error and reports no Assistant diagnostic.
- Targeted Biome passes across all 17 touched implementation and test files.
- Final independent specification and engineering reviews are clean after correcting customer contact projection, timeline history freshness, and permission-aware next-action hints.
- Authenticated in-app browser verification confirms `/assistant` remains inside the normal dashboard navigation and header; T10 adds typed tool results without a separate Assistant header.

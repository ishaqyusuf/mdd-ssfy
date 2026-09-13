# Progressive AI Chat Usage Accounting

## Status

T19B foundation implemented on 2026-09-13. Quota enforcement and reporting UI remain in T19C.

## Ledger behavior

- A completed Assistant run writes one `AssistantUsageEvent` per provider response ID. When provider step metadata is unavailable, the run ID is the stable idempotency key.
- Each event captures the authenticated actor and scope snapshot, provider, model, request class, available token categories, tool-call count, run duration, terminal outcome, and completion time.
- Missing token categories remain null. Runtime output never invents usage values and the routine ledger does not store prompts, model messages, tool inputs, or tool results.
- Replayed completion requests upsert by provider request identity and cannot double charge the same provider response.

## Pricing

- `AssistantModelPrice` stores effective, versioned per-million-token rates in integer micros for input, cached input, output, and reasoning tokens.
- Ledger creation resolves the price active at the event completion time and stores both the estimated integer-micro cost and price version.
- Cost calculations use stable half-up rounding. Events remain valid with a null estimate when no reviewed price snapshot exists.

## Reconciliation

- Events without an authoritative total enter the `unknown` accounting state.
- `assistant.usageReconciliationQueue` returns a bounded metadata-only queue to Super Admin.
- `assistant.reconcileUsage` accepts corrected token categories plus an audit note, recalculates the historical estimate using the effective price, and appends `AssistantUsageReconciliation` before/after metadata.

## Validation

- Focused usage normalization and price-rounding tests pass.
- Focused runtime usage propagation and sidebar entitlement tests pass.
- Prisma client generation and local `db:push` pass.

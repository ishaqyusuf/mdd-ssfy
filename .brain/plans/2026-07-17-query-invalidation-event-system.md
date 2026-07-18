# Query Invalidation Event System Plan

## Status

Implemented foundation and critical-domain rollout on 2026-07-17.

## Problem

Successful actions can leave lists, summaries, dashboards, details, and saved-tab counts stale because invalidation is distributed among mutation components. Users then need a manual browser refresh.

## Implementation Phases

### Phase 1 — Typed Foundation

- Derive query, infinite-query, and mutation route strings from the tRPC React proxy.
- Add typed `path`, `query`, and `infinite` target builders.
- Add a query-target executor with per-event key deduplication.

Status: Complete.

### Phase 2 — Central Success Trigger

- Extend TanStack mutation metadata with typed `queryEvents`.
- Trigger after the global `MutationCache.onSuccess`.
- Merge automatic mutation-route events with explicit metadata.
- Preserve an explicit `false` opt-out.
- Keep invalidation failure isolated from mutation success.

Status: Complete.

### Phase 3 — Runtime And Transport

- Mount one event listener under QueryClient and tRPC providers.
- Deliver in the initiating tab.
- Mirror events to other open same-origin GND tabs through `BroadcastChannel`.
- Reject unknown remote event names and duplicate envelopes.

Status: Complete.

### Phase 4 — Critical Domain Registry

- Register sales order/quote/payment/production/dispatch query families.
- Register inventory catalog/stock/inbound/allocation/fulfillment query families.
- Register contractor jobs/payments, HRM employees, and page tabs.
- Map high-impact mutation routes to these events.
- Move the existing sales query-client facade behind domain events.

Status: Complete with 74 automatic mutation-route mappings.

### Phase 5 — Verification And Documentation

- Test route extraction, metadata merging, opt-out, event publication, query-key deduplication, event execution, and the sales compatibility facade.
- Run focused formatting/lint and filtered TypeScript checks.
- Record the architecture, calling contract, and limitations in Brain.

Status: Complete.

## Follow-up Rollout

The runtime is complete, but migration of low-risk raw `invalidateQueries()` call sites can continue opportunistically:

1. Audit remaining mutation success handlers by domain.
2. Add or reuse a domain event before deleting local invalidation.
3. Prefer one automatic route mapping over metadata repeated at multiple call sites.
4. Add server-originated realtime only when authenticated multi-device or background-job refresh is required.
5. Track invalidation failures or event volume if production observability shows a need; do not add speculative telemetry first.

## Acceptance Evidence

- All new production query-event files pass focused Biome.
- The focused suite passes 13 tests with 30 assertions.
- The scoped TypeScript diagnostic filter is empty.
- Registry target and mutation-route typos are compiler checked.
- The app provider mounts exactly one runtime listener.
- `meta.queryEvents` is invoked from global mutation success, independent of toast metadata.

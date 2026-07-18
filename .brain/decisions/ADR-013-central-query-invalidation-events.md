# ADR-013: Central Query Invalidation Events

## Status

Accepted

## Date

2026-07-17

## Context

WWW mutations invalidate TanStack Query data from many individual components and hooks. Related query families—lists, summaries, dashboards, page-tab counts, and detail workspaces—are easy to miss. The visible symptom is stale UI that updates only after a manual browser refresh.

GND already has typed tRPC query-key helpers, but callers still need to know every dependent route. Midday's useful patterns are typed query keys, domain-level invalidation helpers, and one owner for a mutation's cache effects; its analytics event package is not a cache invalidation bus.

## Decision

Adopt a central, typed domain query-event registry for the WWW app:

- Successful mutations trigger events from the global TanStack `MutationCache.onSuccess`.
- A typed mutation-route registry supplies the default event set.
- The mutation result and variables may resolve a serializable event scope such as affected sale references; `meta.queryEventScope` supplies scope when the call site already owns it.
- `meta.queryEvents` supplies typed call-site additions and `false` supplies an explicit opt-out.
- Each event owns its complete set of typed tRPC query targets.
- Entity detail reads use exact typed query targets when scope is known. Lists, summaries, dashboards, filters, and page tabs remain path-invalidated because one entity can affect many aggregate views.
- An unscoped event retains broad detail invalidation as a compatibility and correctness fallback while legacy producers migrate.
- One app-level runtime executes invalidation and accepts same-browser cross-tab events.
- Domain hooks may emit the same events for actions that do not pass through the tRPC mutation cache.
- Direct typed invalidation remains available for true one-off queries.

The cache-event runtime stays separate from `@gnd/events`, which continues to represent analytics events.

## Consequences

- Cache dependency knowledge moves from mutation components into one auditable registry.
- tRPC route renames surface as TypeScript errors in event targets and automatic mappings.
- Toast metadata no longer controls whether success-side invalidation runs.
- Existing component invalidators can migrate incrementally behind compatibility facades.
- Active queries refetch immediately; inactive matches become stale and refetch when used.
- Same-browser tabs converge through `BroadcastChannel`.
- Bulk event scopes are deduplicated by entity reference and travel with the same cross-tab envelope.
- Other devices and external/background writes still require a future authenticated realtime source.
- A mistaken event definition can affect several screens, so registry tests and bounded domain events are required.

## Alternatives Rejected

- Keep adding local `invalidateQueries()` calls: preserves the source of missed dependencies.
- Invalidate the entire cache after every mutation: correct but expensive, disruptive, and hard to reason about.
- Put query invalidation into `@gnd/events`: mixes analytics semantics with client cache lifecycle and introduces cross-package coupling.
- Require metadata on every mutation call site: repeats policy and still permits omissions; the central route registry is the default, with metadata reserved for exceptions.

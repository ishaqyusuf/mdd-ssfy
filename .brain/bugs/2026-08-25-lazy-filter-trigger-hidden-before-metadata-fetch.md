# Lazy Filter Trigger Hidden Before Metadata Fetch

## Date

2026-08-25

## Problem

The filter dropdown trigger disappeared from Sales Book Orders, Quotes, and other pages whose filter definitions are fetched lazily. The regression began after the 2026-08-24 shared search-filter change.

## Root Cause

Commit `3e08423456adeae6bb01b7fce4b3aead488237cb` hid the shared filter trigger unless filter metadata was loading or already contained a non-search definition. The metadata query, however, is enabled only after the filter menu opens or an active URL filter exists. On a fresh page load the unresolved list produced no definitions, the trigger was hidden, the menu could not open, and the request could never start.

## Fix

The shared filter now distinguishes unresolved metadata from a known search-only configuration:

- `undefined` filter metadata keeps the trigger visible.
- An explicit empty filter list hides the trigger for search-only surfaces.
- Loading metadata or resolved non-search definitions keeps the trigger visible.

The Sales Inbounds search-only workspace now passes an explicit empty filter list so its intentionally empty menu remains hidden.

## Prevention

A focused regression test covers unresolved, search-only, loading, and resolved filter states. Lazy-loaded controls must remain reachable before the data request that opening them enables.

## Related Files

- `apps/dashboard/src/components/midday-search-filter/filter-menu-visibility.ts`
- `apps/dashboard/src/components/midday-search-filter/filter-menu-visibility.test.ts`
- `apps/dashboard/src/components/midday-search-filter/search-filter-trpc.tsx`
- `apps/dashboard/src/hooks/use-search-filter.ts`
- `apps/dashboard/src/components/midday-search-filter/adapters.tsx`
- `apps/dashboard/src/components/sales-inbounds-workspace.tsx`

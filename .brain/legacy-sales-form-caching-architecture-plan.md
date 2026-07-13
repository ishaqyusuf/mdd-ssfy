# Legacy Sales Form Caching Architecture Plan

Date: 2026-04-28
Owner: Sales Form Team
Status: Proposed

## Objective

Improve the old sales form experience by reducing avoidable cold loads for:

- step/component loading
- pricing dependency lookup
- shelf category/product loading
- customer/profile/supporting reference data

without making saved order data or live pricing feel stale.

## Scope

- `apps/www/src/components/forms/new-sales-form/*`
- `apps/api/src/db/queries/new-sales-form.ts`
- `apps/api/src/db/queries/sales-form.ts`
- `apps/api/src/trpc/routers/new-sales-form.route.ts`
- `apps/api/src/trpc/routers/sales.route.ts`
- related invalidation points for settings, step products, pricing tables, shelf data, and supplier edits

## Current Read Path

The active old sales form currently mixes several data classes under the same generic query behavior.

### 1. Form bootstrap data

- Create route prefetches `trpc.newSalesForm.bootstrap`
- Edit route prefetches `trpc.newSalesForm.get`
- Client reuses hydrated data through React Query

### 2. Step routing and component catalogs

- `getNewSalesFormStepRouting()` loads all steps plus all step products needed to build routing metadata
- `getStepComponents()` loads step products for the active step and then separately loads pricing rows for the returned component UIDs
- the UI requests root step components, active step components, and active door step components independently

### 3. Pricing and summary calculation

- summary recalculation is local in the store for most edits
- authoritative component prices still come from server-loaded pricing maps on component queries
- profile coefficient adjustment is applied client-side on top of loaded base/sales prices

### 4. Shelf and support data

- shelf categories and shelf products load through separate form queries
- customer profiles, suppliers, and customer resolution each have separate query lifecycles

## Observed Bottlenecks

### A. Static and volatile data are cached the same way

`apps/www/src/trpc/query-client.ts` gives all queries a generic `staleTime` of 60 seconds. That is too short for mostly-static catalog data and too unspecific for pricing-sensitive reads.

### B. Component loading repeats expensive joins

`apps/api/src/db/queries/sales-form.ts#getStepComponents` reads:

- step products
- related product or door data
- recent usage counts
- pricing rows for every returned component UID

This work is repeated per step query even when catalog data has not changed.

### C. Pricing lookup is embedded inside component catalog reads

The component query currently combines:

- component identity and display metadata
- dependency pricing maps
- usage-driven sort metadata

That makes it impossible to cache the catalog aggressively without also risking stale prices.

### D. Step routing is over-fetched for a mostly static shape

`apps/api/src/db/queries/new-sales-form.ts#getNewSalesFormStepRouting` reloads:

- settings route metadata
- all dyke steps
- all step products for every step

This is a high-value cache candidate because it changes rarely compared with actual form editing.

### E. Shelf and support lookups have no dedicated lifecycle

Shelf categories, shelf products, suppliers, and customer profiles are all safe to reuse longer than one minute, but they currently depend on default query behavior.

## Design Direction

Adopt a layered cache model with explicit ownership:

1. `record cache`
2. `reference cache`
3. `pricing cache`
4. `session draft cache`

Each layer gets different freshness and invalidation rules.

## Proposed Cache Layers

### Layer 1: Record Cache

Purpose:
- load existing order/quote records
- hydrate create-form bootstrap payloads

Data:
- `newSalesForm.get`
- `newSalesForm.bootstrap`
- resolved customer record for selected customer

Rules:
- treat edit-form record payloads as fresh for a short window only
- invalidate immediately after save, delete line item, customer reassignment, or external payment-affecting mutations
- never share mutable draft state across users

Recommended policy:
- client `staleTime`: 15-30 seconds for `get`
- client `staleTime`: 2-5 minutes for `bootstrap`
- keep route prefetch as-is, but use targeted invalidation after successful mutations

Reasoning:
- edit payloads are live business records
- create bootstrap payload is mostly defaults + optional selected customer

### Layer 2: Reference Cache

Purpose:
- serve static or slow-changing metadata used to render the form structure

Data:
- step routing
- step definitions
- component identity catalog
- shelf categories
- customer profiles
- suppliers

Rules:
- cache aggressively on the server with tag-based invalidation
- expose longer client `staleTime` because server invalidation is authoritative

Recommended policy:
- server cache: 15 minutes to 6 hours depending on source
- client `staleTime`: 10-30 minutes

Suggested tags:
- `sales-form:route-config`
- `sales-form:step-components:{stepId}`
- `sales-form:shelf-categories`
- `sales-form:suppliers`
- `sales-form:customer-profiles`

Reasoning:
- these datasets change through admin workflows, not per form edit
- tag invalidation gives freshness without paying cold query cost on every editor load

### Layer 3: Pricing Cache

Purpose:
- resolve dependency-aware component pricing without recomputing or requerying full catalogs every time

Data:
- pricing rows from `dykePricingSystem`
- default component base/sales price maps
- door supplier variant pricing

Rules:
- separate pricing data from component catalog data
- cache server-side by `stepId` and by `componentUid` dependency graph
- invalidate when pricing tables, suppliers, component overrides, or sales settings affecting coefficient defaults change

Recommended policy:
- server cache: 5-15 minutes with explicit tags
- client `staleTime`: 2-5 minutes

Suggested tags:
- `sales-form:pricing:step:{stepId}`
- `sales-form:pricing:component:{uid}`
- `sales-form:sales-settings`

Reasoning:
- pricing changes more often than step structure, but still far less often than user interactions
- separating it allows catalog data to remain hot while pricing is refreshed independently

### Layer 4: Session Draft Cache

Purpose:
- protect the user from losing unsaved edits
- avoid unnecessary server round-trips for every keystroke

Data:
- local recovery snapshot
- autosave payload queue

Rules:
- continue client-local draft recovery
- keep autosave as the persistence boundary, not the interaction boundary
- avoid server re-fetch after every local edit when the save response already contains the next version

Recommended policy:
- keep current local snapshot approach
- add optimistic cache updates for saved draft responses
- only invalidate `newSalesForm.get` when the mutation result indicates server-side reconciliation changed canonical data materially

## Target Architecture Changes

### 1. Split component catalog from pricing lookup

Create dedicated server query helpers:

```text
apps/api/src/db/queries/sales-form.ts
  getStepComponentCatalog(stepId, stepTitle)
  getStepComponentPricing(stepComponentUids)
  getStepComponents() // composition layer
```

Behavior:
- `getStepComponentCatalog` returns identity, display fields, routing fields, and usage sort metadata
- `getStepComponentPricing` returns pricing maps only
- `getStepComponents` composes both, preserving current API shape for compatibility

Benefit:
- lets us cache catalog and pricing with different TTLs and invalidation rules

### 2. Add server-side cache wrappers around reference reads

Wrap these reads in tagged cache helpers:

- `getNewSalesFormStepRouting`
- `getStepComponentCatalog`
- `getStepComponentPricing`
- `getNewSalesFormShelfCategories`
- `getNewSalesFormShelfProducts`

Preferred mechanism:
- `unstable_cache` in the Next-facing layer if the query remains in `apps/www`
- or a shared cache helper near the API layer if the team wants router-level reuse

Constraint:
- avoid caching user-scoped payloads in shared caches unless the cache key includes the user scope

### 3. Promote query-specific client cache policies

Update `apps/www/src/components/forms/new-sales-form/api.ts` to stop relying on the global default for heavy reference queries.

Recommended overrides:

- `useNewSalesFormStepRoutingQuery`
  - `staleTime: 30 minutes`
  - `gcTime: 60 minutes`
  - `refetchOnWindowFocus: false`

- `useSalesStepComponentsQuery`
  - `staleTime: 10 minutes`
  - `gcTime: 30 minutes`
  - `placeholderData` from previous step when switching within same family if safe

- `useNewSalesFormShelfCategoriesQuery`
  - `staleTime: 30 minutes`

- `useNewSalesFormShelfProductsQuery`
  - `staleTime: 10 minutes`
  - query key must remain category-set specific

- `useSalesSuppliersQuery`
  - `staleTime: 10 minutes`

- `useCustomerProfilesQuery`
  - `staleTime: 30 minutes`

### 4. Prefetch the minimum viable reference bundle on route load

For create/edit routes, preload a small shared bundle:

- step routing
- root step components
- customer profiles
- shelf categories

Do not preload every step’s full component set on initial load.

Reasoning:
- most users start from the root item-type flow
- we should pay initial cost only for the first actionable screen

### 5. Add event-based invalidation map

Invalidate only the affected tag families.

When these mutate, clear the corresponding caches:

- sales settings update
  - `sales-form:sales-settings`
  - `sales-form:route-config`
  - pricing tags if coefficient defaults or pricing knobs changed

- step product create/update/delete
  - `sales-form:step-components:{stepId}`
  - `sales-form:route-config`

- pricing system row create/update/delete
  - `sales-form:pricing:step:{stepId}`
  - `sales-form:pricing:component:{uid}`

- shelf category/product update
  - `sales-form:shelf-categories`
  - `sales-form:shelf-products:{categoryId}`

- supplier create/update/delete
  - `sales-form:suppliers`
  - pricing tags if supplier-linked price resolution depends on it

### 6. Keep pricing authority server-aware without making every interaction server-bound

Use this rule:

- local edits update store summary immediately
- component price source comes from cached server pricing maps
- final save remains authoritative and can reject stale version conflicts

This preserves fast interaction while preventing the cache layer from becoming a hidden second source of truth.

## Proposed Execution Phases

### Phase 0: Instrument and Baseline

- add timing logs around:
  - `getNewSalesFormStepRouting`
  - `getStepComponents`
  - `getNewSalesFormShelfProducts`
- record first-load and first-step-switch timings for:
  - `/sales-form/create-order`
  - `/sales-form/edit-order/[slug]`

Success criteria:
- we can separate server query cost from client render cost

### Phase 1: Client Cache Policy Cleanup

- add query-specific `staleTime` and `gcTime` overrides in `new-sales-form/api.ts`
- disable avoidable refetch-on-focus/refetch-on-reconnect for reference queries
- preserve short freshness for mutable record queries

Expected impact:
- immediate reduction in repeated client cold fetches
- lowest-risk first improvement

### Phase 2: Server Reference Cache

- cache `getNewSalesFormStepRouting`
- cache shelf category/product lookups
- cache customer profiles and suppliers if not already covered elsewhere

Expected impact:
- faster initial form open
- faster repeated opens across users/sessions

### Phase 3: Split Catalog and Pricing Reads

- refactor `getStepComponents` into catalog + pricing helpers
- cache each helper separately
- preserve current TRPC response contract for UI safety

Expected impact:
- biggest reduction in component-load cost
- better control over pricing freshness

### Phase 4: Route-Aware Prefetch

- prefetch route bundle for root interaction only
- confirm the hydrated query cache removes first-step pop-in

Expected impact:
- smoother first interaction without overfetching every step

### Phase 5: Invalidation Hardening

- wire `revalidateTag` or equivalent cache busting from settings, catalog, pricing, and shelf admin mutations
- document the invalidation ownership in code comments near each mutation

Expected impact:
- long-lived caches become safe to trust

## Trade-offs

### Option A: Cache full `getStepComponents` response as-is

Pros:
- smallest code diff
- fast win

Cons:
- catalog and pricing stay coupled
- invalidation remains coarse
- higher risk of stale price display

### Option B: Split catalog and pricing caches

Pros:
- correct cache boundaries
- better long-term control
- safer aggressive caching for component metadata

Cons:
- more implementation work
- requires careful compatibility handling

Recommendation:
- start with Option A for immediate relief only if the team needs a same-day speed win
- target Option B as the durable architecture

## Recommended First Slice

If we want the best risk-to-impact ratio, implement in this order:

1. Query-specific client cache overrides in `apps/www/src/components/forms/new-sales-form/api.ts`
2. Server cache for `getNewSalesFormStepRouting`
3. Server cache for shelf categories/products
4. Split `getStepComponents` into catalog + pricing helpers
5. Add invalidation hooks for settings/pricing/catalog mutations

## Definition Of Done

The caching improvement is done when:

- reopening `/sales-form/create-order` within the cache window does not cold-fetch step routing again
- switching between common steps does not visibly pause on component reload unless the step truly was never fetched
- shelf category/product queries reuse warm data predictably
- pricing changes made in admin tools invalidate the affected sales-form caches
- save and edit flows still reject stale record versions correctly
- no user-scoped draft data is shared through server caches

## File-Level Change Plan

### `apps/www/src/components/forms/new-sales-form/api.ts`

- add query-specific cache timings
- disable unnecessary refetch behaviors for reference queries

### `apps/api/src/db/queries/new-sales-form.ts`

- wrap step routing and shelf reads in tagged cache helpers
- keep record bootstrap/get reads separate from shared reference caches

### `apps/api/src/db/queries/sales-form.ts`

- extract `getStepComponentCatalog`
- extract `getStepComponentPricing`
- keep `getStepComponents` as a composed compatibility API

### Mutation owners

- settings update actions
- shelf product/category actions
- supplier actions
- pricing admin actions

Each should revalidate only the affected tags.

## Risks To Watch

- stale shared cache serving the wrong data after admin edits
- hiding a pricing bug behind longer TTLs
- over-prefetching large component catalogs and shifting cost earlier instead of reducing it
- cache keys that ignore category sets, step IDs, or dependency scopes
- mixing user-scoped customer resolution data into a shared server cache

## Final Recommendation

Treat the old sales form as a multi-layer cache problem, not a single cache toggle.

The core move is:

- aggressively cache route/reference/catalog data
- moderately cache pricing maps with explicit invalidation
- keep order record state short-lived and mutation-driven
- keep draft editing local-first

That gives us faster component loading and pricing responsiveness without turning the form into a stale-data trap.

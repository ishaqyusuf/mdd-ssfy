# WWW Performance Guardrails

Date: 2026-04-15
Scope: `apps/www` Next.js App Router performance rules for active user-facing routes.

## Why This Exists
Community route work exposed a repeated pattern:
- route pages were server-capable, but first paint still felt slow
- heavy client tables, search filters, forms, and global modals erased the benefit
- fire-and-forget prefetch and always-mounted modal trees created hidden loading tax

These guardrails are meant to keep future work from falling back into that trap.

## Core Standard
For active routes, performance work is not done until both are true:
1. The route page is server-first for first-paint-critical data.
2. The client runtime mounted after hydration is intentionally small.

If only the first is true, the page may benchmark better but still feel slow.

## Midday Comparison
Midday feels fast because it combines:
- server-authenticated layout entry
- narrow provider stacks
- server page composition for first-paint data
- small client islands
- fewer globally mounted interactive systems

When working on `apps/www`, use Midday as the reference shape:
- server decides access
- server page fetches above-the-fold data
- client components are interactive islands, not the whole route

## Rules

### 1. Use Link Modules As Active Scope
- Treat `apps/www/src/components/sidebar/links.ts` as the authoritative active-route scope.
- Pages outside `linkModules` go into `Possibly Stale Pages` until reviewed.

### 2. Await First-Paint-Critical Queries
- Do not use fire-and-forget prefetch for data rendered immediately.
- Use awaited `fetchQuery` / `fetchInfiniteQuery` for:
  - first table page
  - visible summary widgets
  - visible analytics cards
  - form bootstrap data needed at first paint

### 3. Hydrate Route-Critical Client Queries
- If a client component uses `useQuery` / `useSuspenseQuery` for data shown immediately, the route should preload that query and render inside `HydrateClient`.
- Do not leave first-paint client queries to cold-start in the browser if the server can provide them.

### 4. Heavy Editors Must Be Route-Wrapped
- Large form/edit pages should use small client wrapper components that dynamically import the heavy editor surface.
- Examples:
  - template editors
  - schema editors
  - install-cost editors
  - large multi-panel forms

### 5. Global Modals Must Be Lazy
- Do not mount heavy modal implementations unconditionally in the global modal tree.
- For large modal systems:
  - dynamically import the modal component
  - render it only when its open state is true
  - render heavy modal content only while open

### 6. Search Filters Are Not Free
- Search/filter chrome can be a real startup cost.
- Prefer one of:
  - server-prefetch filter metadata and hydrate it
  - lazy-load advanced filter surfaces
  - avoid booting expensive filter query trees on routes where search is secondary

### 7. Infinite Tables Need Explicit Restraint
- Infinite tables should not attach expensive desktop scroll/pagination measurement by default.
- Use floating pagination overlays only where they are worth the cost.
- Do not auto-run load-more behavior unless:
  - there is a next page
  - no fetch is already in flight
- Prefer simple intersection-based continuation over extra viewport bookkeeping unless the UX benefit is proven.

### 8. Avoid Static Singleton Query Paths On Active Pages
- Prefer `useTRPC()` / route-local query setup over singleton client helpers when building active route surfaces.
- Static singleton helpers make page behavior harder to reason about and can hide startup coupling.

### 9. Do Not Let Hidden UI Dominate Route Cost
- If a page opens another form, modal, sheet, or sidebar only on demand, that code should not dominate the initial route bundle.
- Closed UI should be cheap.

### 10. “Hydrated” Does Not Mean “Done”
- A page is not performance-complete just because the route prefetch is fixed.
- Before marking a route done, check:
  - heavy table runtime
  - filter startup cost
  - globally mounted modal/editor chunks
  - duplicate post-hydration queries

## Community Lessons
These issues were specifically observed in Community:
- template pages had route hydration but still mounted large client editor systems immediately
- builders paid for builder-form modal weight even when closed
- customer-services added extra cold client queries after route render
- shared tables were doing expensive client pagination tracking
- active routes felt slower than Midday even after prefetch improved because client shells remained heavy

## Definition Of Done For Active Route Optimization
A route can be considered done when:
- first-paint-critical data is awaited on the server
- client queries for visible content hydrate from cache
- closed modals/editors are lazy
- heavy form/editor surfaces are code-split behind a wrapper
- table runtime is not doing unnecessary viewport or fetch work
- no obvious duplicate cold query fires on initial route load

## Applies To
- Community
- Sales
- HRM
- Production / Jobs
- Any future linked workspace in `apps/www`

## Validation Follow-up
- After a linked-route optimization pass, validate the highest-traffic shortlist before declaring the work stable.
- Use `brain/engineering/www-performance-validation-checklist.md` as the required follow-up checklist.

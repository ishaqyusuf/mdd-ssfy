# Sales Overview Legacy, V2, And Midday Review

## Executive Decision

Continue with the production Sales Overview sheet and canonical Sales Orders
workspace. Discontinue the unused V2 page and sheet.

V2 was directionally better in controller and shell separation, but it was a
second product surface with incomplete workflow parity, duplicated state, and
a large eager tab graph. The production sheet has the deeper operational
behavior and can adopt the useful V2 seams with materially less risk.

## Midday Scale

The Midday scale scores how closely a surface follows the reference workspace
pattern:

1. fragmented or tightly coupled
2. partially structured
3. workable, with important lifecycle or performance debt
4. strong canonical workspace with bounded gaps
5. reference-grade server-first workspace, URL detail state, lazy domain data,
   and explicit mutation boundaries

| Dimension | Production before | V2 before | Canonical after |
| --- | ---: | ---: | ---: |
| One canonical workspace | 4 | 2 | 5 |
| URL-driven selection/state | 3 | 4 | 5 |
| Server-first list loading | 5 | 2 | 5 |
| Detail query laziness | 2 | 2 | 4 |
| Workflow completeness | 5 | 2 | 5 |
| Surface/controller separation | 2 | 4 | 3 |
| Read/write boundary clarity | 1 | 1 | 4 |
| Authorization boundary | 2 | 2 | 4 |
| Bundle/component isolation | 2 | 1 | 3 |
| Overall Midday alignment | 2.9 | 2.2 | 4.3 |

## Production Sheet Review

### Strengths

- It is already attached to the canonical server-prefetched, Suspense-wrapped,
  virtualized orders workspace.
- It owns the complete operational workflows and role-specific behavior.
- It preserves list context while the user reviews an order or quote.
- It already supports deep links through URL query state.
- It reuses established production, dispatch, packing, transaction, activity,
  and inventory implementations.

### Weaknesses Found

- The entry mounted V2 query hooks only to arbitrate between two competing
  surfaces.
- Opening any non-quote order triggered the heavy production query just to
  calculate a tab badge.
- All tab content was constructed under the tabs container, allowing inactive
  domain providers to mount.
- Explicit `mode=dispatch-modal` was ignored for broad-access users because
  mode resolution considered only the role-derived default.
- Open behavior was split between legacy, V2 page, and V2 sheet helpers.
- Several operational tables hard-coded V2 URLs.
- Production overview reads mutated production-gate and assignment state.
- Shared Prisma select state was mutated per request, creating cross-request
  filter leakage risk.
- Core overview reads were public procedures.

## V2 Review

### Architectural Ideas Worth Keeping

- explicit provider/controller/surface concepts
- typed query-state adapters
- thin shell intent
- tab registry intent
- clearer audience and mode modeling

### Reasons Not To Continue It

- It duplicated page and sheet surfaces for the same order-detail job.
- It was not production-adopted and had only a development action-menu CTA.
- It lacked complete legacy action and role parity.
- Its page route did not use the canonical orders page's server prefetch,
  Suspense, ErrorBoundary, and list context.
- The tab registry eagerly imported large implementations, including the
  Inventory tab.
- Root provider queries still loaded production detail independently of active
  tab need.
- Keeping it would require migrating and validating every workflow twice before
  users received improvements.

## Implemented Consolidation

- Removed the V2 page, sheet, query hooks, action-menu CTA, shells, provider,
  tab registry, unused sections, and unused V2 tabs.
- Added one typed canonical open contract for actions and links.
- Migrated notifications, customer sales previews, document preview back links,
  and inventory operational tables to the canonical sheet.
- Reduced customer sales preview actions from separate Page and Sheet choices
  to one Open action.
- Made inactive Sales Overview tab content render nothing until selected.
- Removed the eager production badge query from initial sheet open.
- Fixed explicit dispatch mode resolution and added regression tests.
- Composed request-local production selects instead of mutating a shared
  select object.
- Made derived production persistence opt-in and limited it to mutation
  workflows.
- Protected overview APIs with relevant operational permissions.

## Remaining Optimization Backlog

### P1: General tab section boundaries

Split the General tab into independently testable order, customer, payment,
production, delivery, and address sections. Keep the current visible behavior
and do not introduce another shell.

### P1: Inventory module naming and loading

Move the active Inventory tab and shared inventory helpers out of the historical
`sales-overview-system` directory into a canonical domain module. Consider a
dynamic import when the Inventory tab becomes active because the implementation
is large.

### P1: Root summary contract

If production badges are still required before opening the Production tab, add
a bounded count to the root overview projection. Do not reintroduce the full
production-detail query on sheet open.

### P2: Query invalidation precision

Continue centralizing mutation invalidation on typed sales, production,
dispatch, payment, customer, and inventory events. Avoid broad router-wide
invalidations.

### P2: Performance evidence

Instrument:

- sheet open to header ready
- initial query count
- per-tab query count
- Inventory tab chunk size
- repeat-open cache hit behavior

Use representative admin, production, dispatch, quote, and order fixtures.

### P2: Role policy extraction

Move the remaining mode/tab visibility rules into a small pure policy module.
Keep the URL parser and UI registry separate from permission enforcement.

## Guardrails

- No new `/overview-v3` or parallel sheet.
- No read query may perform hidden repair writes.
- No heavy tab query may run solely to render an optional badge.
- Server permissions remain authoritative; UI visibility is not authorization.
- New detail behavior must preserve the canonical orders workspace and
  URL-driven open contract.

# ADR-028 Canonical Sales Overview Workspace And Sheet

## Status

Accepted

## Context

Sales order detail had two competing implementations:

- the production Sales Overview sheet opened from the canonical
  `/sales-book/orders` workspace
- an unshipped V2 page and sheet under `/sales-book/orders/overview-v2`

V2 had cleaner surface/controller boundaries, but it duplicated routing,
queries, tabs, actions, and UI migration work. It also eagerly assembled a
large tab graph and had not reached workflow parity with the production sheet.
The production sheet already owned the complete quote, order, production,
dispatch, packing, inventory, transaction, and activity workflows.

The Midday reference architecture favors one server-first list workspace, URL
state for the selected record, a single detail surface, and domain queries that
load only when their detail section is active.

## Decision

Use one canonical Sales Overview:

- workspace: `/sales-book/orders`
- detail surface: the existing URL-driven Sales Overview sheet
- open contract: `sales-overview-id`, `sales-type`, `mode`, `salesTab`, and
  optional dispatch context
- no separate Sales Overview page surface
- no V2 compatibility redirect because V2 was never used in production

The useful V2 architectural ideas are adopted in the canonical flow:

- typed URL composition shared by buttons, row actions, notifications, and
  links
- explicit mode resolution with requested mode taking precedence over the
  role-derived default, except for restricted production users
- active-tab-only rendering so inactive domain providers do not mount or query
- request-local Prisma select composition
- read queries that do not repair or persist derived production state
- protected, permission-aware Sales Overview API reads

Production workflows that intentionally need derived-state repair opt in with
`persistDerivedState: true`. Read paths default to pure behavior.

## Consequences

- The V2 route, V2 sheet, V2 query hooks, V2 action-menu CTA, page/sheet shells,
  registry, and unused V2 tabs are removed.
- Existing internal links that pointed at V2 now open the canonical orders
  workspace and sheet.
- The active Inventory tab implementation and its supporting inventory helpers
  remain under `components/sales-overview-system` temporarily because they are
  shared by the canonical sheet and sales-form configurator. This directory
  name is historical, not a second overview runtime.
- Future Sales Overview work must improve the canonical sheet or extract
  reusable domain modules from it. It must not introduce a parallel page/sheet
  implementation.
- Full-page order detail can be reconsidered only when a distinct product need
  cannot be served by the list-plus-sheet workspace.

## Validation

- focused routing, mode, request-local select, and table parity tests
- `@gnd/sales` typecheck
- `@gnd/api` typecheck
- static scan for removed V2 route/query/action identifiers
- filtered web diagnostics for the changed runtime surface

## Related

- [Sales Overview comparison report](../reports/2026-07-23-sales-overview-legacy-v2-midday-review.md)
- [Sales Overview feature](../features/sales-overview.md)
- [Superseded ADR-003](./ADR-003-sales-overview-system-architecture.md)

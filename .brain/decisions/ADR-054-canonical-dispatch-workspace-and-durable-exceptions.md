# ADR-054: Canonical Dispatch Workspace And Durable Exceptions

## Status

Accepted — 2026-08-18; route placement amended by ADR-057

## Context

Dispatch work was split across an admin table, Packing List, driver task views,
legacy status menus, inventory allocation commands, and proof completion. The
admin redesign needed a clean operating model without creating a second packing
or fulfillment authority. Driver-reported problems also needed to survive
reloads and retries without abusing cancellation or trip status.

## Decision

- Keep `OrderDelivery` as the canonical trip header and project legacy storage
  into one shared workspace lifecycle.
- Keep one `/sales-book/dispatch-admin` URL with Dashboard, Backlog,
  Dispatches, Calendar, Drivers, and Exceptions sections.
- Use Sales Finance as the visual shell and Midday Invoices as the route,
  hydration, URL-state, table, and sheet architecture reference.
- Dispatch Admin owns orchestration and readiness. Packing List owns packing
  execution. Existing inventory and proof commands remain the only authorities
  for load/start/completion/fulfillment transitions.
- Store operational issues in `DispatchException`, related to one
  `OrderDelivery`, with retry-safe request identity and explicit resolution
  evidence. Exception state overlays rather than replaces the trip lifecycle.
- Make Expo mobile the canonical driver surface and derive its queue, summary,
  and next stop from the server-owned driver manifest.
- Initial exception resolution records `keep_assigned`. Reschedule and cancel
  remain separate guarded commands so resolution cannot bypass schedule,
  inventory-release, proof, or terminal-state rules.

## Consequences

- Admin and driver surfaces share names, filters, lifecycle, risks, and the same
  underlying command boundaries.
- Durable exceptions can be listed, counted, audited, retried, and resolved
  independently of trip status.
- Legacy status values remain compatible while consumers migrate to the shared
  projection.
- The new database migration must be applied before exception routes are used.
- Compatibility routes cannot be removed until the deferred automated and
  runtime release gate in Sequence 06 is completed.

## References

- `.brain/plans/sales-system-page-by-page-modernization/06-dispatch-admin-and-driver-delivery-plan.md`
- `.brain/features/sales-dispatch-table.md`
- `.brain/features/mobile-dispatch-proof-completion.md`
- `.brain/decisions/ADR-050-dispatch-bound-inventory-execution.md`
- `.brain/decisions/ADR-026-resumable-dispatch-proof-completion.md`

# ADR-057: Reversible Dispatch Admin v2 Rollout

## Status

Accepted — 2026-08-18

## Context

The replacement Dispatch Admin workspace was implemented directly on
`/sales-book/dispatch-admin`, replacing the established operational dashboard.
The operator requested a safer parallel rollout that preserves the previous
features while the replacement remains limited to Super Admin evaluation.

## Decision

- Restore the previous dashboard at `/sales-book/dispatch-admin`.
- Move the replacement six-section workspace to
  `/sales-book/dispatch-admin/v2` without duplicating its domain, API, or
  database authorities.
- Keep the v2 dropdown sub-link and page guard restricted to Super Admins who
  also have `editOrders`.
- Give legacy and v2 separate calendar components so changes to the replacement
  calendar cannot silently alter the restored dashboard.
- Keep shared dispatch table, lifecycle, Packing List, inventory, proof, and
  durable-exception behavior unchanged.

## Consequences

- Operators retain the known dashboard while the replacement can be evaluated
  and improved independently.
- The cutover is reversible by changing route composition and navigation rather
  than rolling back API, schema, or mobile dispatch work.
- ADR-054 remains authoritative for lifecycle, ownership, and durable
  exceptions; this ADR supersedes only its decision to host the replacement on
  one canonical `/sales-book/dispatch-admin` route.

## References

- `.brain/features/sales-dispatch-table.md`
- `.brain/plans/sales-system-page-by-page-modernization/06-dispatch-admin-and-driver-delivery-plan.md`
- `.brain/decisions/ADR-054-canonical-dispatch-workspace-and-durable-exceptions.md`

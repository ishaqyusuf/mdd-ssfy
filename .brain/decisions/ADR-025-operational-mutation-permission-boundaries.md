# ADR-025: Operational Mutation Permission Boundaries

- Status: Accepted
- Date: 2026-07-23

## Context

Internal tRPC routers historically used `publicProcedure` for dispatch,
inventory, jobs, community, and settings operations. UI visibility and
route-local `ctx.userId` checks were not a reliable authorization boundary.
Mixed-skill workers also need narrower accountability than one broad
authenticated-user gate.

## Decision

All internal operational mutations use `protectedProcedure` and repeat a
server-side domain capability check before writes or external side effects.
Where ownership matters, capability checks are combined with the live resource:
assigned drivers may progress only their dispatch, and contractors may submit
or update only their jobs unless they have management authority.

The permission source is the canonical authenticated session, including merged
role and user-specific grants. Super Admin remains implicit through generated
permissions. Inventory configuration stays Super Admin-only until a dedicated
inventory-edit permission exists.

## Consequences

- Anonymous and forged mutation calls fail before business writes.
- UI gating remains useful guidance but is not an authorization boundary.
- Delivery workers cannot operate another driver's trip merely because their
  role includes `editDelivery`.
- Job payment authority is independent from general job editing.
- CommunityUnit users retain scoped unit editing but cannot inherit install-cost
  mutation access.
- Future operational mutations must select and test one of the documented
  domain boundaries rather than starting from `publicProcedure`.

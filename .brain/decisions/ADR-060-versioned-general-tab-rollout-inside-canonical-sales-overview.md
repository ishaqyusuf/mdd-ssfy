# ADR-060: Versioned General Tab Rollout Inside Canonical Sales Overview

## Status

Accepted

## Date

2026-08-21

## Context

The canonical Sales Overview sheet owns mature order, quote, production,
transaction, inventory, dispatch, and activity workflows. Its General tab is a
large mixed-responsibility component whose visual hierarchy and data boundary
are difficult to improve safely in one cutover.

A previous full V2 Sales Overview page and sheet duplicated routing, queries,
tabs, and workflow state. It was removed before production adoption. ADR-028
therefore requires future work to improve the one canonical
`/sales-book/orders` workspace and URL-driven sheet instead of introducing a
parallel overview runtime.

The selected General design is the Split Command Center prototype. The office
needs an incremental rollout in which Super Admin can exercise the new General
tab while staff continue using the current implementation.

## Decision

- Keep one canonical Sales Overview workspace, sheet, URL contract, header,
  tabs, permissions, primary/secondary panes, actions, and domain mutations.
- Version only the General-tab renderer during migration:
  - `v1` is the existing General implementation.
  - `v2` is the new Split Command Center composition.
- Resolve the renderer from persisted Sales Settings:
  - `officeDefault`: `v1 | v2`
  - `superAdminPreview`: `inherit | v1 | v2`
- Apply `superAdminPreview` only to an authenticated active Super Admin;
  `inherit` uses `officeDefault`. Every other viewer uses `officeDefault`.
- Only Super Admin may read the management view or update the rollout policy.
  The ordinary overview response exposes only the caller's resolved version,
  not the complete management policy.
- Default missing or malformed settings to `officeDefault: v1` and
  `superAdminPreview: v2`. This gives Super Admin the development/pilot view
  while preserving V1 for the office without relying on `NODE_ENV`.
- Store the policy under the existing `sales-settings` JSON record. No new
  Prisma model or migration is required for this global office policy.
- Place the renderer gateway and V2 sections under the canonical sheet feature
  folder. V2 may reuse canonical domain actions, permission controls, DTO
  values, and package utilities, but it must not import V1 visual sections as
  its layout.
- Load the V2 renderer conditionally so office users on V1 do not pay its
  component cost. Keep only the active tab mounted and provide a dedicated V2
  loading skeleton.
- Products, Transactions, Activity, Inventory, Production, and Dispatch remain
  on their existing implementations until separately migrated and accepted.

## Initial Delivery Slices

1. Add the typed settings policy, resolver, management API, settings route, and
   focused authorization/resolution coverage.
2. Introduce the General gateway and preserve V1 without behavior changes.
3. Build the selected V2 General composition from bounded sections using the
   current overview DTO and canonical action components.
4. Add a narrower General projection only after measuring the current sheet
   payload/query/open latency; do not guess a replacement API shape. Completed
   on 2026-08-21: the measured projection remains behind
   `sales.getSaleOverview`, preserves one client request, and conditionally
   excludes Product/configuration, Sales Profile, delivery-item-count, and
   legacy control relation families for V2. A typed versioned loader preserves
   the stable response contract, and two representative local orders matched
   across all 34 fields consumed by the V2 renderer.
5. Roll the office default to V2 only after authenticated desktop/mobile
   acceptance and permission/action parity. Completed on 2026-08-21 through the
   genuine Super Admin management screen after explicit user approval.

## Rejected Alternatives

### Recreate a complete V2 page or sheet

Rejected because it repeats the duplication removed by ADR-028 and requires
every operational workflow to be migrated and verified twice.

### Rewrite General in place with no rollout boundary

Rejected because staff would receive an all-at-once visual and workflow change
without a reversible pilot.

### Use development environment checks as the rollout switch

Rejected because environment state is not an auditable product policy and
cannot support a controlled production pilot or explicit office cutover.

### Persist one preference per Super Admin

Rejected for this rollout. The requested policy is office-wide plus a shared
Super Admin pilot view. Per-user preferences would add state and governance
without improving this migration.

## Consequences

- The version boundary is deliberately temporary and limited to General.
- V1 and the rollout fields must be removed after V2 office acceptance and a
  defined rollback window; the gateway then collapses to the canonical General
  renderer.
- The settings API becomes the authority for rollout, while the Sales Overview
  open/link contract remains unchanged.
- No duplicate route, sheet registration, tab registry, or overview provider is
  introduced.
- This decision extends and complies with ADR-028; it does not supersede it.

## Validation Gate

- Resolver tests cover defaults, malformed settings, Super Admin override, and
  office inheritance.
- API tests prove management writes are Super Admin-only.
- Existing Sales Overview routing, mode, tab, and secondary-pane tests remain
  green.
- Authenticated browser QA covers V1 office rendering, Super Admin V2 rendering,
  the settings switch, refresh/deep-link behavior, desktop/mobile layout,
  keyboard interaction, and no console errors.
- Payload, query count, and open latency are measured before a dedicated General
  API is introduced.
- Before office cutover, the persisted-policy path must be exercised and then
  restored locally. This passed for the office-default path. The later approved
  cutover also passed through a genuine Super Admin management-screen mutation,
  persisted V2, survived Settings and Sales Overview reloads, and retained the
  current Transactions implementation.
- Desktop/mobile layout and keyboard interaction passed through the persisted
  office-default path at 1280×720 and 390×844. All cutover validation gates are
  complete; V1 remains only for the defined rollback window.
- Post-cutover parity also passed on `09405PC`: the V2-only canonical header
  now owns lifecycle/inbound/age/priority context, the primary command row is
  fixed to Preview/Edit/More with packing retained in More, and the command
  rule meets the operations/financial divider at a measured 0px delta. The
  financial surface is a 280px borderless rail rather than a nested Card, and
  390px browser proof has no horizontal document overflow.

## Related

- [ADR-028](./ADR-028-canonical-sales-overview-workspace-and-sheet.md)
- [Sales Overview feature](../features/sales-overview.md)
- [Legacy/V2/Midday review](../reports/2026-07-23-sales-overview-legacy-v2-midday-review.md)

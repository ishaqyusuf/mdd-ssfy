# New Sales Form Component Catalog Management

## Purpose

Restores the legacy component-card three-dot menu contract in the new sales
form without changing ordinary sales selection or the wider step toolbar.

## Menu and editors

- `Edit` contains `Details`, `Visibility`, `Price`, and
  `Section Setting Override`.
- Details persists the shared component name, product code, and image.
- Visibility persists OR groups containing AND `is` / `isNot` rules and can
  apply one rule set to multiple marked components.
- Price edits default or dependency-combination base costs. The combination
  selected on the active sale is highlighted and its sales snapshot retains
  the active profile coefficient. Price remains visible but disabled for Admin
  roles and Door components; Super Admin edits non-Door catalog prices here,
  while Door pricing continues through the existing size/supplier surface.
- Section override persists activation, handle, and swing behavior.
- Redirect persists a validated canonical step target; cancel clears it.
- Delete is a confirmed soft archive from future pickers. It does not delete
  component snapshots already stored on draft or saved sales.

## Catalog selection mode

`Select` marks a component for catalog management; it does not select it for
the sale. While any component is marked, component-card clicks toggle marks
and the toolbar shows the selected count, `Edit Visibility`, `Delete`, and
`Unmark All`. Clearing the last mark returns card clicks to the normal sales
selection path.

## Hosts and freshness

Both `ItemWorkflowPanel` and `WwwSalesFormWorkflowPanel` use
`useWorkflowComponentAdmin`. Successful writes invalidate step-component and
routing queries, refetch active picker data, queue Dyke-to-inventory sync, and
patch matching selected-component snapshots so badges, redirects, and pricing
respond without reopening the sale.

## Permissions

- Admin and Super Admin: details, visibility, section override, redirect,
  catalog selection, and archive.
- Super Admin only: shared component base pricing.
- Ordinary internal sales users: sales selection only.
- Dealership/storefront surfaces: no internal catalog-management actions.

Authorization is duplicated intentionally at the capability/UI boundary and
the protected tRPC mutation boundary. No database migration is required.

# New Sales Form Component Catalog Management

## Purpose

Restores the legacy component-card and step-toolbar contracts in the new sales
form without changing ordinary sales selection.

The picker keeps its search/action toolbar mounted through loading, empty, and
populated states. Its menu exposes the legacy catalog controls: Tabs (Default,
Custom, and Hidden), Select All, Pricing or Door Size Variants, Component,
Refresh, and the state-aware Enable Custom / Disable Custom action. Workflow
step navigation remains available in a separate Steps submenu instead of being
mislabelled as Tabs. Employees with `editSalesComponent` create a component for
the active step through the toolbar menu's `Component` action, which opens the
shared component-details editor. The component grid no longer renders a leading
`[ + ]` card, per the client-requested step-menu workflow.

The catalog tabs are resolved from the complete active-step component result.
Deleted rows are excluded, visibility rules are evaluated against the current
sale selections, and custom/hidden classification is kept separate from the
ordinary sale-selection list. The red Custom sale-entry action is also distinct
from the administrative Enable Custom / Disable Custom configuration action.

When the toolbar is floating, it renders at the document level so transformed
and overflow-clipped item-step animation containers cannot hide it. Its
viewport position still comes from the active picker boundary, and end-of-list
anchored mode remains inside that boundary.

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
- Redirect persists a validated canonical step target; cancel clears it. Its
  submenu is scoped to the active item's configured step sequence instead of
  the global step catalog, and the menu uses a route glyph to distinguish the
  action from opening an external page.
- Delete is a confirmed soft archive from future pickers. It does not delete
  component snapshots already stored on draft or saved sales.

## Catalog selection mode

`Select` marks a component for catalog management; it does not select it for
the sale. While any component is marked, component-card clicks toggle marks
and the toolbar shows the selected count, `Edit Visibility`, `Delete`, and
`Unmark All`. Clearing the last mark returns card clicks to the normal sales
selection path.

## Hosts and freshness

Both `ItemWorkflowPanel` and `DashboardSalesFormWorkflowPanel` use
`useWorkflowComponentAdmin`, and both the default dashboard host and the shared
package host supply the complete catalog to the step picker. Successful writes
invalidate step-component and routing queries, refetch active picker data,
queue Dyke-to-inventory sync, and patch matching selected-component snapshots
so badges, redirects, and pricing respond without reopening the sale.

## Permissions

- Employees with `editSalesComponent`: create components from the step toolbar
  menu and edit component details.
- Admin and Super Admin: visibility, section override, redirect, catalog
  selection, and archive.
- Super Admin only: shared component base pricing.
- Ordinary internal sales users: sales selection only.
- Dealership/storefront surfaces: no internal catalog-management actions.

Grouped Service rows use a dedicated `canEditServiceLinePricing` capability.
Internal users with `editOrders` may edit Service unit price, tax, and production
flags. Door/HPT, Moulding, Shelf, flat-line, shared component base pricing, and
other workflow pricing controls remain behind the Super Admin-only
`canEditLinePricing` or component-pricing capabilities.

Authorization is duplicated intentionally at the capability/UI boundary and
the protected tRPC mutation boundary. No database migration is required.

Garage Door and Exterior Door size rows use canonical `In-Swing` and
`Out-Swing` choices in both the door-size dialog and HPT table. Other door
families retain their legacy free-text swing behavior.

## Grouped workflow parity slices

- HPT keeps `Add Size` reachable before the first active-door row exists and
  when another selected door owns the only persisted rows.
- Shelf sections expose the category path used by the legacy editor; changing
  or clearing it resets stale product, pricing, and subtotal state before the
  next selection.
- Hosted moulding calculators derive displayed price per linear foot from
  piece price divided by piece length, refresh defaults when reused for a new
  row while closed, and safely support hosts without an apply callback.

These behaviors are covered by focused source/domain tests; authenticated
browser proof remains a release gate.

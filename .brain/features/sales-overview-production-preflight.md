# Sales Overview Production Preflight

## Goal

Give managers one read-only decision surface in Sales Overview before a door
order is handed to production.

## Current Behavior

- The General/Overview tab shows `Production Preflight` for admins viewing an
  order. Quotes and non-admin views do not render the card.
- The card derives six checks from existing sales and inventory truth:
  - door dimensions and handing/no-handle configuration;
  - customer profile and tax configuration;
  - required inventory variant, supplier, and price evidence;
  - stock allocation or inbound readiness;
  - pickup or delivery/address readiness;
  - current or on-demand invoice PDF readiness.
- Each check is `Ready`, `Review`, `Blocked`, or `N/A`. The card summary is
  blocked when any check is blocked, otherwise review when any check needs
  review, otherwise ready for handoff.
- Review actions navigate to the existing Details or Inventory tab. The
  checklist does not mutate sales, inventory, PDF, or production state.
- Non-door orders keep the door-configuration row visible as `N/A`; the other
  order readiness checks still apply.

## Data Sources

- `sales.getSaleOverview` returns the customer profile, tax summary, compact
  item configuration/door evidence, explicit shipping-address readiness, and
  current invoice-PDF readiness. No-handle truth comes from the saved line route
  configuration, with active legacy form-step/component overrides as fallback.
  Soft-deleted tax and form-step rows are excluded.
- `inventories.salesInventoryOverview` returns required component quantities,
  variant and pricing evidence, supplier evidence, and the existing inventory
  readiness summary.
- The checklist is a pure `@gnd/sales` domain projection over those protected,
  server-derived contracts. WWW only queries and renders the result.

## Validation

- Pure projection coverage includes ready, blocked, review, explicit no-handle,
  supplier-price, shipping-address, and non-door cases.
- Sales-form domain coverage locks persisted line-route precedence over legacy
  step/component overrides.
- Shared PDF-domain coverage includes current, on-demand, stale, generating,
  and failed snapshot states.
- Inventory overview coverage verifies supplier name/count/price evidence.
- Authenticated Super Admin browser proof loaded order `08893LM`, found the
  `Production Preflight` heading and Review actions, and reported no application
  console errors.

## Boundaries

- This is a manager aid, not a new production gate or automatic release.
- It creates no schema, migration, background job, or external notification.
- Existing production and inventory lifecycle enforcement remains authoritative.

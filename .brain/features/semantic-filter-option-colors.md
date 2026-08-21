# Semantic Filter Option Colors

## Status

Implemented on 2026-08-21.

## Purpose

GND's Midday-style filter menus show a small square color marker beside options
whose values carry useful operational meaning. The same metadata also appears
in Dashboard active-filter chips.

## Current Behavior

- `PageFilterData.options[]` supports optional `color` and `subLabel` metadata.
- The shared API option builder preserves that metadata instead of dropping it
  during normalization.
- `@gnd/utils/filter-option-colors` owns the stable semantic palette and status,
  payment-state, and delivery-mode resolvers.
- `@gnd/ui/filter-option-color` owns the decorative 12px square used by both
  Dashboard and Dealership.
- Dashboard renders colors in ordinary option lists, large searchable lists,
  and active filter chips.
- Dealership renders colors in its filter option lists while preserving its
  existing submit-search and Clear Filters behavior.

## Colored Families

- Sales fulfillment, invoice, payment review, production, priority, inbound,
  Special Order, and resolution filters.
- Dispatch stage/status, schedule/risk, and delivery-mode filters.
- Sales Finance payment/application/review status and receivables aging.
- Inventory backorder/partial-shipment status, hold, and delivery-mode filters.
- Community project, project-unit, unit-production, and customer-service state
  filters.
- Dealership order/quote status, delivery, payment, and invoice state.
- Inventory and product-report categories use stable name-derived colors.

Identity and free-text filters—including customers, employees, builders,
drivers, sales reps, phone numbers, P.O. values, order/quote numbers, and item
names—remain uncolored.

## Accessibility

Color is supplementary. Every option retains its text label and checkbox state,
and the square is `aria-hidden` so it does not add noise to accessible names.

## Validation

- Nineteen focused tests cover the shared resolver, metadata preservation,
  numeric option values, Dashboard standard/long-list and active-chip rendering,
  Dealership colored/uncolored rendering, category colors, empty dynamic-option
  cleanup, and custom controls that intentionally remain uncolored.
- No database schema, migration, permission, filter value, or URL contract
  changed.
- `@gnd/utils` typechecking passes. API, Dashboard, and Dealership checks report
  no diagnostics in the changed filter-color paths; their remaining failures
  are unrelated repository baselines.
- Authenticated browser QA remains a recommended follow-up under the
  repository's fast Bun command policy.

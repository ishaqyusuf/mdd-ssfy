# Bug: Approved Grouped Adjustment Overwrote Primary Quantity

## Date

2026-08-25

## Problem

After an approved moulding adjustment on order `09455PC`, reopening the new
sales form showed the old row quantities even though the order header and
approved snapshot carried the increased total. Attempting the next edit made
the review compare a relational quantity of `67` with the proposed grouped
quantity of `45`, falsely presenting a reduction and wallet refund.

## Root Cause

The adjustment worker treated a grouped moulding line like one ordinary sales
item. It wrote the approved group's aggregate quantity and total (`46` and
`$452.15`) onto primary `SalesOrderItems` row `172182`, left sibling row
`172183` at quantity `21`, and did not project the approved row-level quantities
(`25` and `21`) into the two relational sales items or their
`HousePackageTools` rows. The edit loader then collapsed relational siblings as
`46 + 21 = 67` while stale nested metadata still described `23 + 21`.

The 2026-08-24 adjustment fix covered approved HPT door arrays, including
same-total size changes and removed doors, but the generic parent-item loop
still lacked an equivalent projector for grouped moulding and service rows.

## Fix

- Added a grouped adjustment projector that expands the approved snapshot into
  its legacy row siblings and updates each persisted `SalesOrderItems` row by
  its own `salesItemId`.
- Moulding rows also update their matching `HousePackageTools` total, component
  identity, and price-tag metadata.
- Ordinary lines continue through the existing parent-item projector.
- A grouped row without an approved persisted sales-item identity fails closed
  instead of overwriting the primary row.
- Reconciled `09455PC` under exact order version, adjustment ID, status, row ID,
  quantity, and total guards. The previously approved snapshot now persists as
  `25 + 21`; the requested baseboard update then saved normally as `25 + 22`.

## Prevention

Adjustment regressions must assert relational row quantities and HPT totals for
multi-row moulding and service groups, not only the aggregate line snapshot.
Any future grouped-row creation or removal support must define identity and
retirement behavior explicitly before the adjustment worker accepts it.

## Validation

- Focused projector tests: 4 passed, 0 failed, 16 assertions.
- Grouping and API multi-line parity tests: 15 passed, 0 failed, 121 assertions.
- Scoped Biome and `git diff --check` passed.
- Jobs typecheck reports only the pre-existing email `react/jsx-runtime` errors
  and `packages/sales/src/sales-control/actions.ts:113`; neither touched sales
  adjustment file has a diagnostic.
- Authenticated reload and database verification of `09455PC` show casing `25`,
  baseboard `22`, grouped quantity `47`, moulding total `$462.55`, subtotal
  `$1,452.30`, tax `$101.66`, displayed total `$1,600.58`, and amount due
  `$11.13`. Both sales-item metadata projections and both HPT totals agree.

## Related Files

- `packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts`
- `packages/jobs/src/tasks/sales/sales-adjustment-grouped-projection.ts`
- `packages/jobs/src/tasks/sales/sales-adjustment-grouped-projection.test.ts`
- `.brain/features/in-form-sales-order-adjustments.md`

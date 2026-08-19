# Bug: 03523PC Duplicate Door Rows and Price Authority Loss

## Date

2026-08-18

## Problem

Quote `03523PC` rendered two active rows for the same Garage Door component and
`2-6 x 6-8` size. The stored relational rows each had a final unit price of
`$355.67`, but the open new editor passively repriced them to `$281.17`, marked
the document dirty, and displayed a zero base cost.

## Root Cause

Commercial lines existed in both the relational Sales graph and
`SalesOrders.meta.newSalesForm`. Hydration merged the two, save rebuilt children,
and generated nested IDs were not returned to queued client state. No active
component/size invariant prevented duplicate doors. Separately, profile query
hydration could be treated as a profile-change transition, and missing base
authority let the derived door price compound while shared component surcharge
was reconstructed at another boundary.

## Fix

- Hydrate commercial state exclusively from relational rows.
- Diff relational children by durable identity and return a canonical reload.
- Reject duplicate door identities before writes and defensively collapse old
  duplicates without summing quantities.
- Recover base authority from the committed door price and selected coefficient
  when old open quotes lack it; use the shared legacy-compatible formula.
- Reprice only after explicit profile selection and block priced-door actions
  while profile pricing is unresolved.
- Provide a bounded audit/repair command and force stale open editors to reload
  through a revision change.

## Prevention

Regression coverage must assert stable IDs across repeated autosaves, one winner
for concurrent revisions, transactional rejection of duplicate identities, and
`$355.67` parity for the `03523PC` Tier 2 fixture across save, reload, legacy,
and print. Read-side suppression remains monitored defense in depth until the
clean-data window is complete.

## Related Files

- `apps/api/src/db/queries/new-sales-form.ts`
- `packages/sales/src/sales-form/domain/door-identity.ts`
- `packages/sales/src/sales-form/domain/hpt-compatibility.ts`
- `apps/dashboard/src/components/forms/new-sales-form/sections/invoice-overview-panel.tsx`
- `apps/dashboard/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- `scripts/sales-form-relational-repair.ts`


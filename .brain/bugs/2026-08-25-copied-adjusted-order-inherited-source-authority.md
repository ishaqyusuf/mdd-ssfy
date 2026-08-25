# Bug: Copied Adjusted Order Inherited Source Authority

## Date

2026-08-25

## Problem

Production order `09468PC` returned HTTP `500` from
`newSalesForm.saveDraft` when Save was clicked without making any changes. The
editor loaded a grouped moulding quantity of `174 + 110 + 3 + 2` and subtotal
`$5,054.74`, while the order header still held the intended grouped quantities
`55 + 110 + 7 + 2` and subtotal `$3,916.72`.

## Root Cause

`09468PC` was created as an editable duplicate of adjusted order `09467PC`.
The copy path cloned the source order's complete `meta.newSalesForm` object,
including its `approvedAdjustmentId`, version, snapshot line items, source sales
item IDs, and source HPT IDs. Those fields are authority and persisted identity,
not reusable form defaults.

The source order had also been projected by the older grouped-adjustment worker,
which wrote the group's aggregate quantity onto its primary relational row. The
duplicate therefore inherited both the corrupted relational values and a
foreign approved snapshot. The save guard correctly rejected this mismatch as
`SALES_RELATIONAL_REVIEW_REQUIRED`; the production UI reduced that failure to a
generic Save failed message.

## Fix

- Editable order and quote copies now discard source new-sales-form authority,
  revision, snapshot, and persisted row identities.
- Reusable `form` and nested `meta` defaults are retained with autosave disabled.
- History snapshots continue to preserve the original metadata unchanged.
- `09468PC` was repaired under exact order, version, adjustment, row, quantity,
  and total guards. Its four grouped rows and HPT totals now match the approved
  source snapshot using the target order's own persisted IDs.
- The foreign adjustment marker and copied line snapshot were removed from the
  target order metadata.

## Production Evidence

- Before repair, Vercel deployment `dpl_DnJWrP5M9gu2SAx1Ak1dp7jTbQxY`
  recorded `POST /api/trpc/newSalesForm.saveDraft` as HTTP `500` at
  2026-08-25 22:00:08 WAT.
- After repair, clicking Save without changing anything completed and navigated
  to Sales Overview. The same endpoint returned HTTP `200` at 22:07:24 WAT.
- Final database proof shows subtotal `$3,916.72`, tax `$274.17`, amount due
  `$4,190.89`, no approved adjustment marker, and grouped quantities
  `55 + 110 + 7 + 2` with matching row and HPT totals.
- Vercel then promoted commit `7ea27383b` as production deployment
  `dpl_DFDVxPpApEFiyvbezwtF43o6kbyT`. A stale editor instance was rejected with
  the explicit out-of-date conflict UI. After reloading the newer server
  version, a second unchanged Save completed and navigated to Sales Overview
  without the original generic failure.

## Prevention

Editable copies may retain presentation and input defaults, but must never
inherit source adjustment authority, source revision state, canonical line
snapshots, or relational row identities. Copy regressions must cover an adjusted
source with grouped rows and assert the target metadata contains no source-owned
identity.

The production Trigger worker is already on version `20260825.3`, which contains
the row-level grouped projection fix. Historical source order `09467PC` still
needs a separately approved exact-guard repair if that order must be edited.

## Validation

- `packages/sales/src/copy-sales.test.ts`: 6 tests passed, 19 assertions.
- Copy, grouped domain, and grouped worker suites: 15 tests passed, 62
  assertions.
- `git diff --check` passed.
- Sales package typecheck remains blocked only by the pre-existing
  `packages/sales/src/sales-control/actions.ts:113` assignment-ID diagnostic.

## Related Files

- `packages/sales/src/copy-sales.ts`
- `packages/sales/src/copy-sales.test.ts`
- `apps/api/src/db/queries/new-sales-form.ts`
- `.brain/features/in-form-sales-order-adjustments.md`

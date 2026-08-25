# Bug: Approved Sales Adjustment Left HPT Rows Stale

## Date

2026-08-24

## Problem

An approved quantity adjustment on order `09433PC` updated the order header,
adjustment snapshot, and parent sales-item quantity, but the new sales form
reopened stale house-package door rows. A later manual save returned a generic
500 and the ordinary Save path also changed the existing order status to
`Draft`.

## Root Cause

The adjustment worker projected only `SalesOrderAdjustmentLine` parent item
quantities. Same-quantity HPT changes such as LH-to-RH moves were absent from
that line list, and removed door sizes were not retired from
`DykeSalesDoors`. The relational-review guard then compared the approved line
total to raw parent `SalesOrderItems.total`; mixed HPT/grouped orders store some
commercial totals in child rows, so that aggregate produced false positives.
Finally, `saveDraftNewSalesForm` passed `Draft` to both create and update paths
instead of preserving an existing document's status.

## Fix

- The adjustment worker now projects every approved HPT door array, including
  same-quantity LH/RH changes, and retires omitted active door rows.
- The relational-review guard compares the approved commercial projection with
  the hydrated relational form, including door and shelf rows.
- Ordinary draft/manual saves preserve existing statuses; only newly created
  drafts receive `Draft`, and Finalize still writes `Active`.
- Development save failures now write a payload-free error companion beside the
  captured request payload.
- Order `09433PC` was reconciled under exact version/adjustment guards, saved,
  and restored to its pre-save legacy status.

## Prevention

Adjustment application tests must cover mixed HPT/grouped orders, removed door
membership, and same-total LH/RH changes. Save-status tests must distinguish
new draft creation, existing-order Save, and Finalize. Projection guards must
compare hydrated commercial shapes instead of storage-layer parent totals.

## Related Files

- `packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts`
- `apps/api/src/db/queries/new-sales-form.ts`
- `apps/api/src/db/queries/new-sales-form.multi-line.test.ts`
- `apps/api/src/db/queries/new-sales-form.test.ts`
- `apps/api/src/db/queries/new-sales-form-debug.ts`
- `apps/api/src/db/queries/new-sales-form-debug.test.ts`
- `.brain/features/in-form-sales-order-adjustments.md`
- `.brain/features/sales-form-system-hardening.md`

## 2026-08-25 Production Verification

- Vercel production deployment `dpl_9uVM5hEkBNAxLmP7G8tXJtBqRMEF` was already
  serving the repaired web commit, but the Trigger production worker was still
  on the older `20260824.5` task image. The fixed adjustment projector was
  therefore present in the web save/review boundary but absent from the worker
  that applies an approved snapshot.
- Trigger production version `20260825.2` was deployed with all 49 tasks after
  one remote builder failure on the first attempt. A production save on order
  `09433PC` then completed the review/application flow without a 500.
- Production Item 1 now persists `2-8 x 8-0` at LH `0` / RH `1`. Item 2 now
  persists only `2-8 x 8-0` at LH `1` / RH `4`; the omitted `2-6 x 8-0`,
  `2-0 x 8-0`, and `2-4 x 8-0` rows remain absent after a hard reload. Items 3
  through 7 were not edited.
- The line-scoped inbound guard correctly omitted both disposition choices
  because the reduced Item 2 had no active linked inbound shipment. The review
  sheet still displayed the order-wide aggregate `Inbound 9`, however, which
  made unrelated activity look applicable to the changed line. The sheet now
  renders `Open inbound` only when the same affected-line guard requires a
  disposition, and the acknowledgement uses neutral operational-activity copy.

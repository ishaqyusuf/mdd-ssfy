# Bug: Legacy Sales Order Editor Save Rewrites Compatibility Graph

## Date

2026-08-23

## Problem

During the Preview projection write-through test, setting a temporary P.O. on
sanitized legacy order `09379PC` and saving through the sales editor did more
than update the P.O. The save materialized current-form compatibility data and
changed the order's visible invoice/inbound presentation. Clearing the P.O. in
the UI did not persist the original blank state.

The source-backed diff found one extra line item, one extra cost, eight sales
item controls, forty line-item components, forty line-pricing rows, fifty-six
quantity controls, twelve inbound demands, and one history entry, plus rewritten
new-form and CCC metadata.

## Root Cause

The seeded order uses the legacy metadata/control shape and has no persisted
`newSalesForm.form`. The generic new-form save path treated the complete editor
payload as a commercial rewrite even when the only semantic difference was the
P.O. It projected `newSalesForm.form`, reconciled relational line/cost rows, and
queued inventory synchronization, which can materialize inventory compatibility
controls and demands. Blank P.O. values already survive the editor payload and
normalize to `null`; the missing boundary was a persistence scope that kept this
metadata-only edit out of the commercial migration path.

## Fix

The save transaction now recognizes a legacy record with no persisted current
form when P.O. is the only semantic change. It verifies optimistic version and
status parity, compares the submitted form/lines/costs/summary/inbound/special-
order state against the canonical loaded record, and then updates only root
P.O. metadata. Blank values persist as `null`, unknown metadata and any partial
`newSalesForm` container stay unchanged.

The semantic comparison normalizes only the known lossless editor adapters:
blank notes, default `resaleCertificateOnFile=false`, default
`sellerOfRecord=DEALER`, nullable line taxability, the legacy
`Moulding`/`Mouldings` label, and the synthetic zero-dollar Labor placeholder.
Real note, payment, status, line, price, inbound, or special-order changes still
fail closed to the full save. If P.O. is also unchanged, the guarded path is a
true no-op so duplicate/manual save races cannot become an implicit migration.

P.O.-only saves still expire and warm sales documents, but deliberately skip
the sales-inventory sync job. The response exposes `saveScope` so the dashboard
also skips history creation, sales-stat resets, production-update fan-out,
generic sales-updated events, and the inventory configurator for this one
metadata-only scope. Any other semantic difference, including payment-term
changes, remains on the full relational persistence and inventory-sync path.

## Prevention

- The API regression snapshots every mocked order-owned relational collection,
  clears a legacy P.O., and requires exact graph equality plus preserved unknown
  metadata and no `newSalesForm.form` materialization.
- The same regression changes payment term after the P.O.-only save and requires
  the full persistence path, preventing the narrow optimization from swallowing
  real commercial edits.
- For projection refresh tests, use an already-current-form fixture or a
  narrowly controlled database revision change with an exact before snapshot.
- A broader product decision is still required before ordinary non-P.O. edits
  stop acting as the implicit migration boundary for legacy documents.

## Preview Validation

Ready Vercel Preview deployment `dpl_2ksQrUQYPqSPRbjpPxP3ke8Q1Dws` from commit
`91216b891` owns `preview.gndprodesk.com`. Authenticated testing on sanitized
legacy order `09379PC` changed blank P.O. to `QA-PO-PROOF-20260824`, then issued
an unchanged manual save. The P.O. update advanced the source revision to
`2026-08-24T07:59:05.006Z`; the unchanged save did not advance it again.

Both reads kept `newSalesForm.form` absent. Exact before/after hashes remained:

- `SalesOrderItems`: 6 / `80ba714ec09f4fd09d853a3f0e9cf25ce9ba2543814929a386bba754f3eb9343`
- `DykeStepForm`: 39 / `1b47ddf51087084cc78e933bfa9094a1c343130f5557621651ffdbe1519bb83d`
- `HousePackageTools`: 6 / `3dba39c3ddcd93d4bc6ec9656b34f32a5d77aeaa70318c1fe3a5c67fb861bc69`
- `DykeSalesDoors`: 6 / `b17bc51cd6e2a50b0c7d24ebe0fd7f06e60f7f977834af741586bddaecc18687`
- legacy `LineItem`: 5 / `0db80ad0cd1da166e1c61dba2addcac93d1904b4cc51b04ed4b50ed11b6dba95`

Extra costs, taxes, shelf items, sales item controls, quantity controls,
line-item components, line pricing, inbound demand, and sales history all
remained at zero rows with the same empty-set hash. The test fixture was then
restored atomically from the sanitized local source. Final state is blank P.O.,
the original `$2,573.23` list total, exact graph parity, and a ready version-2
projection with `sourceUpdatedAt=2026-08-19T21:22:59.144Z`. Production was not
touched.

## Related Files

- `apps/api/src/db/queries/new-sales-form.ts`
- `packages/sales/src/sales-form/application/legacy-metadata.ts`
- `packages/sales/src/sales-form/application/record-normalization.ts`
- `packages/sales/src/sales-form/ui/overview/invoice-details-panel.tsx`
- `packages/db/src/preview-sales-seed.ts`

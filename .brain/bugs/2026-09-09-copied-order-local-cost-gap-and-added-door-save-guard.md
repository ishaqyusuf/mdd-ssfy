# Copied order: local cost gap and added-door save guard

## Status and scope

Analysis completed on 2026-09-09; implementation and repair not performed.
The user requested a fresh copy and comparison before fixing quantity/save
behavior. Local UI copy created order `09635PC` (27805) from `09433PC` (26399).
Existing order `09623PC` (27166) was inspected without saving. Production reads
were limited to `09433PC` and `09623PC` after explicit user approval. No
production writes, data sync, deployment, or application-code edits occurred.

## Proven source and fresh-copy result

Local NotePad 46905 records `Copied from 09433PC`, tagged salesId 27166,
created 2026-09-08 16:09:57 UTC. The source and destination share customer 590.
The current source has no approved-adjustment marker in its form metadata.
The fresh copy opens without the saved/recalculated warning. The real API
loader and shared legacy calculator produce identical source/fresh summaries.
New item/door/cost database IDs belong to the fresh order; retained logical
form UIDs alone are not evidence of foreign database ownership.

| Value | Source 09433PC | Fresh local 09635PC | Existing 09623PC, production |
| --- | ---: | ---: | ---: |
| Item subtotal | 2,696.71 | 2,696.71 | 2,554.97 |
| Delivery | 145.00 | 145.00 | 145.00 |
| Tax | 198.92 | 198.92 | 189.00 |
| Invoice total before card fee | 3,040.63 | 3,040.63 | 2,888.97 |
| Card fee at current 3% | 91.22 | 91.22 | 86.67 |
| Total including card fee | 3,131.85 | 3,131.85 | 2,975.64 |

## Item differences already present in 09623PC

| Item | Original configuration | Existing copied order | Line total delta |
| --- | --- | --- | ---: |
| Garage | 2-8 x 8-0: LH 0 / RH 1 | LH 1 / RH 0 | 0.00 |
| Interior pre-hung | LH 1 / RH 4, 5 doors | LH 3 / RH 1, 4 doors | -139.95 |
| Door slabs | 2-6 x 8-0, qty 1 | 2-6 qty 2 plus 2-8 qty 1 | +213.07 |
| Bifold | 6-0 qty 1, 2-0 qty 2, 2-4 qty 2, 5-0 qty 1 | 5-0 qty 2 and 3-0 qty 2 | -214.86 |
| Services | Pocket door hardware, qty 1 | Same | 0.00 |
| Moulding | Four rows, quantities 36/24/6/3 | Same | 0.00 |

Net item subtotal change is -141.74; tax changes -9.92, giving invoice change
-151.66 before the card fee. This is separate from the warning below.

## Finding 1: displayed money discrepancy is a local data gap

Local `09623PC` has zero `SalesExtraCosts` rows. Production still has Delivery
8490 for 145.00 and zero Labor 8491. Its approved proposal also retains both.
Both environments have the same order updatedAt (2026-09-08 16:36:40.947 UTC),
subtotal, tax, total, and latest approved-adjustment marker.

The editor calculates from relational extra-cost rows, so local calculation is
2,554.97 + 178.85 tax = 2,733.82. The saved invoice is 2,888.97. The complete
155.15 difference is missing local delivery 145.00 plus its 10.15 legacy tax.
The real calculator, with only approved costs restored **in memory**, reproduces
the saved 189.00 tax and 2,888.97 total exactly. No product price changes are
needed to explain the warning. Card fee is additional and is not the 155.15.

Do not infer that production deleted or failed to copy delivery. Production
evidence disproves that. The precise local sync/import operation that omitted
the cost rows has not been traced; no data sync was performed in this task.

## Finding 2: added-door persistence identity causes a false save rejection

The latest adjustment `cmtsw6ei90001gm0a3bodfoi1` added a 3-0 x 8-0 bifold row,
quantity 2, line total 252.46. The approved snapshot retains `id: null`, while
the persisted door row is 67561 with the same dimension, quantity and total.
This mismatch is present in both the local and production records.

`projectApprovedHousePackageLine` creates the row and retains its database ID
for retirement bookkeeping, but does not put that ID back into the proposed
door object. The apply worker subsequently spreads the original proposal into
the order's `newSalesForm` snapshot.

`hasUnprojectedApprovedCommercialSnapshot` compares projections using
`id:<database ID>` when present, otherwise `dimension|stepProductId`. The added
door therefore has different comparison keys on the two sides. The guard
rejects with `SALES_RELATIONAL_REVIEW_REQUIRED` even though commercial values
match. This is distinct from the August 25 foreign source-adjustment bug.

A temporary read-only diagnostic invoked the **actual current guard** against
the real loader output: rejection=true. Mapping only the snapshot's null door
ID to 67561 **in memory** changes rejection=false. No quantity, price, total,
or actual database row changed. The original reported error reference has not
been correlated to a production log; this proves a concrete blocker in the
current save path, not that every reported failure has the same cause.

## Reproduction evidence

- Browser: copied source using Overview → More → Order actions → Copy As →
  Order; opened 09635PC and confirmed matching totals and no warning.
- Read-only `getNewSalesForm` loaded all three local orders.
- Temporary command:
  `bun --env-file=/dev/null --tsconfig-override /Users/M1PRO/Documents/code/_turbo/gnd/apps/api/tsconfig.json /private/tmp/gnd-sales-copy-proof.ts --assert-consistent`
- Output: source/fresh exact match; affected 2888.97 versus recalculated
  2733.82; approved-cost-only correction restores total; save guard true →
  false after added-door ID mapping. Consistency assertion intentionally fails
  with actual 2733.82 versus expected 2888.97. This is diagnosis evidence, not
  a passing regression or a completed repair. Bun also emitted a configuration
  directory warning after executing the diagnostic.

## Implementation plan

1. Treat local data completeness separately: when a targeted sync is requested,
   include the order's cost rows and verify dependent-record completeness and
   before/after totals. Do not remove live delivery or change prices to hide a
   local fixture warning.
2. Add an integration regression for an adjustment introducing a new door size:
   apply → hydrate → subsequent Save must succeed with quantities/totals intact.
   Cover reused, added, removed and duplicate/ambiguous component-size rows.
3. Preserve immutable approval evidence, but retain a scoped mapping from
   approved logical identity to persisted identity in the application result.
   The save guard must use that mapping or a verified unique logical match when
   the approved row originally had no ID. Existing positive IDs must still be
   ownership-checked, and real quantity/value drift must remain blocked.
4. Cover existing applied adjustments with null IDs through the same safe
   reconciliation rule; avoid requiring manual metadata edits per order.
   Test same dimension with different components and wrong-order IDs.
5. Return actionable review/conflict messaging and preserve reference correlation.
   Verify API and Trigger worker release compatibility, then demonstrate the
   rep's original edit/confirm/save/reload flow under the implemented fix.

## Relevant code

- `apps/api/src/db/queries/new-sales-form.ts:381`: approved snapshot guard.
- `apps/api/src/db/queries/new-sales-form.ts:413`: door comparison key.
- `apps/api/src/db/queries/new-sales-form.ts:1201`: costs used in recalculation.
- `apps/api/src/db/queries/new-sales-form.ts:3631`: save rejection boundary.
- `packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts:133`: added row.
- `packages/jobs/src/tasks/sales/apply-sales-order-adjustment.ts:584`: applied
  metadata retains the original proposed snapshot.

## Requested UI save test — 2026-09-09 09:23 UTC

The user explicitly requested editing local `09623PC` and saving to test the
workflow. Entered and verified in the captured request:

- Item 1: 2-8 x 8-0 changed LH 1/RH 0 to LH 0/RH 1; total qty remains 1.
- Item 2: 2-8 x 8-0 replaced by 2-6 x 8-0, retaining LH 3/RH 1. The size swap
  recalculated unit price from 139.95 to 141.96; line total 559.80 → 567.84.
- Item 3: the qty-1 2-8 x 8-0 row replaced by 2-4 x 8-0 at 106.67. The
  existing qty-2 2-6 x 8-0 row was retained unchanged.

Clicked the sidebar Save button. It invoked `save-final`, not `save-draft`.
Save failed before Change Review or confirmation opened. UI showed `Save failed`
and the generic retry message. Captured request ID
`8ade32b9-10f7-488c-aca9-a6d1b35539b6` has server error
`PRECONDITION_FAILED` / `SALES_RELATIONAL_REVIEW_REQUIRED` at
2026-09-09 09:23:35.109 UTC. This directly confirms that the diagnosed guard
blocks the real UI save workflow for this order.

Local evidence files are in the ignored
`apps/dashboard/debug/new-sales-form-save-payloads/2026-09-09/` directory:
`09-23-34-963__save-final__order__sales-27166.json` and its `.error.json` companion.
They contain the correct requested edits. Proposed subtotal is 2,563.01, tax
179.41, base total 2,742.42, and total with card fee 2,824.69; these remain
affected by the pre-existing missing local delivery rows.

After the failed attempt, a read-only local check confirms the persisted order
still has updatedAt 2026-09-08 16:36:40.947 UTC, subtotal 2,554.97, tax 189.00,
total 2,888.97 and the same approved adjustment marker. No new adjustment was
created. Edits remain unsaved in the open browser for continuation; the editor
was not reloaded. No code repair, data sync, or production mutation occurred.

### Error classification correction

The generic error also had a presentation-contract cause: `isPrismaErrorLike` accepted any code starting with P, incorrectly treating tRPC PRECONDITION_FAILED as an unknown Prisma error. Narrowed to P plus four digits and changed this guard to typed, reportable SALES_RELATIONAL_REVIEW_REQUIRED. Regression test reproduced the classifier failure before the change; 27 focused error/reporting tests now pass. This does not repair snapshot IDs, unblock the order, or complete the persistent form error UI. Durable writer/comparison/backfill strategy is recorded in the investigation plan.

### Implemented and verified locally

Safe same-parent missing-ID reconciliation now permits the demonstrated save; the worker retains assigned door/shelf IDs for future adjustments. During browser verification the order persisted, but legacy statistics reset then failed on `QtyControl_itemControlUid_type_key`. Its derived row persistence now uses keyed upserts. The form distinguishes committed saves from failed follow-up work and supplies persistent copyable error details. Statistics refresh errors are explicitly reportable with a shared server/public reference.

User approved restoring local Delivery145 before saving. Reload/read-back confirms Item1 LH0/RH1; Item2 2680 LH3/RH1; Item3 2680x2 plus2480x1; subtotal2563.01/tax189.56/grand2897.57/withCCC2984.50. Repeat Save and fresh copy09635 Save both completed to inventory navigation. Original/fresh-copy totals remain equal. Production is unchanged. See the investigation plan for test totals and broader typecheck limitations.

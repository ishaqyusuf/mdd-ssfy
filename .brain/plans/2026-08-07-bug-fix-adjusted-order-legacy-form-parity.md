# Adjusted Order Legacy/New Sales Form Parity

Status: Implemented and browser-validated on 2026-08-07.

## Implementation Result

- Added one package-owned approved-adjustment projector and reused its HPT row
  reconciliation from print and both legacy loader compatibility paths.
- Propagated explicit snapshot-authority and total-with-CCC fields through both
  legacy DTOs without turning absent relational rows into delete instructions.
- Made adjustment-owned legacy orders read-only with a direct new-form handoff,
  while retaining Overview, Preview, Print, and PDF.
- Added a server-side legacy save guard based on the current database marker.
- Verified exact old/new parity on `09187PC` and ordinary legacy editability on
  unadjusted order `09166LRG`; no order was saved during acceptance.

## Objective

Make the legacy edit form render the same approved commercial state as the new
sales form for adjustment-owned orders, starting with order `09187PC`, without
destroying the retained relational audit rows or allowing the legacy save path
to overwrite the approved snapshot outside the guarded adjustment workflow.

## Assumptions

- The applied snapshot at `SalesOrders.meta.newSalesForm`, identified by
  `approvedAdjustmentId`, is authoritative for line membership, quantities,
  prices, and totals after an approved adjustment.
- The new form is correct for `09187PC`: the retained first-item door size is
  `2-0 x 6-8` (`24\" x 80\"`), while `2-6 x 6-8` (`30\" x 80\"`) was removed.
- Legacy relational door rows remain stored for compatibility/audit enrichment;
  the fix is a read projection and save guard, not a destructive data cleanup.
- Orders without an approved-adjustment marker must keep their current legacy
  loading and saving behavior.
- A full legacy implementation of the new form's paid-order Change Review flow
  is out of scope. The safe behavior is to direct further quantity/pricing edits
  for adjustment-owned orders to the new form.

## Confirmed Comparison

| Surface | Item 1 door rows | Item 1 total | Order subtotal |
| --- | --- | ---: | ---: |
| New form | `2-0 x 6-8`, LH `1`, RH `1` | `$228.84` | `$590.13` |
| Legacy form | Adds stale `2-6 x 6-8`, LH `2`, RH `1` | `$591.36` | Recomputes `$362.52` too high |

- Items 2 and 3 agree at `$173.61` and `$187.68`.
- The new form's subtotal is `$590.13`; tax is `$41.31`; CCC is `$18.94`;
  the displayed total with CCC is `$650.38`.
- The exact stale amount is `$362.52` (`3 x $120.84`).
- The moulding presentation differs but its effective amount does not: the new
  form shows catalog estimate `$12.44` plus custom price `$11.04`, while the
  legacy form collapses the effective custom price into its Estimate column.
- The new form also logs a separate SSR fallback caused by a missing `nuqs`
  adapter in `useSalesPreview`; that does not cause the row mismatch and should
  be handled as a separate focused cleanup.

## Detailed Execution Plan

### Phase 1: Lock the adjustment-authority contract in shared code

1. Extract the approved-adjustment row reconciliation logic from the print-only
   boundary into a package-owned, generic sales snapshot projection under
   `packages/sales/src/sales-form/application/` or the adjustment system.
2. Match persisted lines to relational items by database item ID first, stable
   `sales-item-<id>`/persisted UID second; do not use positional matching except
   for explicitly tested legacy records that lack both identities.
3. For HPT lines with an approved marker and an explicit persisted `doors`
   array, treat that array as the complete membership set. Match an enrichment
   row by door ID, then normalized dimension plus `stepProductId`.
4. Merge legacy presentation/identity data underneath the persisted row. The
   persisted row must win for dimension, LH/RH/total quantity, unit price,
   custom/addon metadata, and line total. An explicit empty persisted array
   remains empty.
5. Project persisted line summary fields into the legacy item shape:
   `qty -> qty`, `unitPrice -> rate`, `lineTotal -> total`, plus HPT
   `totalDoors` and `totalPrice`.
6. Project canonical summary fields into the legacy order shape with correct CCC
   semantics: `subTotal`, `taxTotal -> tax`, `grandTotal` as the total before
   CCC, and `ccc`/`totalWithCcc` only on their corresponding display fields.
7. Reuse the helper from the existing print projection so Preview, Print, the
   new edit loader, and the legacy edit loader cannot drift into separate
   matching rules again.

Validation gate: pure unit tests cover no marker, retained one-of-two rows,
explicit empty rows, quantity/price overwrite prevention, archived/missing
catalog enrichment, ID/UID matching, and CCC field mapping.

### Phase 2: Apply the projection before legacy form transformation

1. In the canonical legacy loader, apply the shared projection immediately
   after the Prisma order read and before `typedSalesBookFormItems` builds
   `_doorForm`, `_doorFormDefaultValue`, `itemArray`, footer pricing, or Zustand
   initial state.
2. Ensure the route actually used by
   `/sales-book/edit-order/[slug]?salesFormMode=legacy` receives the projected
   order. The current route imports through the `app-deps` compatibility path,
   so cover that path explicitly.
3. Remove or delegate the duplicated DTO behavior in
   `apps/dashboard/src/app/(clean-code)` and `apps/dashboard/src/app-deps` so
   both transformers consume the same already-projected record.
4. Keep the projection pure. Do not soft-delete the stale `DykeSalesDoors` row
   during a GET and do not add to the transformer's existing `deleteDoors`
   cleanup list merely because a row is absent from the approved snapshot.
5. Add a projection flag such as `adjustmentSnapshotAuthority: true` to the
   legacy form payload so the client can render the correct safety state without
   re-parsing raw metadata.

Validation gate: transformer tests run against both legacy import paths and
prove `09187PC`-shaped input yields one visible Item 1 row, item total `$228.84`,
subtotal `$590.13`, and no database-write instruction from the read transform.

### Phase 3: Prevent unsafe legacy writeback

1. When `adjustmentSnapshotAuthority` is true, show a persistent inline notice
   explaining that the order was changed through customer-approved Change
   Review and that further commercial edits must use the new form.
2. Keep read-only actions such as Overview, Preview, Print, and PDF available.
   Disable quantity, price, add/remove, customer/profile, and Save variants that
   would mutate the commercial document; provide a primary `Continue in new
   sales form` action.
3. Add the same rule server-side in the legacy save use case. If an approved
   snapshot marker exists, reject an unguarded legacy save with a stable error
   code and actionable message. The UI guard is not the authorization or
   integrity boundary.
4. Do not clear `approvedAdjustmentId`, do not silently make the relational rows
   authoritative again, and do not mutate payment/inventory/production state.
5. If product later requires editing such orders from the legacy UI, treat it as
   a separate feature: port the complete commitment snapshot, Change Review,
   customer approval, and apply-job workflow rather than bypassing it.

Validation gate: client coverage proves mutating controls are unavailable while
read-only document actions remain; server coverage proves crafted legacy saves
cannot bypass the guard and ordinary unmarked orders still save.

### Phase 4: Regression coverage across all projections

1. Add the exact regression fixture: two relational HPT rows, one approved
   persisted row, and order/item totals matching `09187PC`.
2. Run it through the shared projector, new edit loader, both legacy DTO paths,
   and print projection.
3. Assert the removed `2-6 x 6-8` row cannot reappear, while the retained row
   keeps its relational ID/image/catalog metadata and persisted quantities.
4. Add an unmarked-order fixture proving relational precedence is unchanged.
5. Add an explicitly empty approved snapshot fixture proving no relational row
   is resurrected.
6. Add save-guard tests covering manual Save, Save & Close, Save & New, and any
   direct server invocation.

Validation gate: focused Sales package, API new-sales-form, legacy DTO, legacy
save, print/access, and form UI suites pass with the regression fixture.

### Phase 5: Authenticated browser acceptance

1. Open `09187PC` in the new form and record the canonical first-item row,
   subtotal, tax, CCC, and total without editing or saving.
2. Open the explicit legacy URL and verify it shows only `2-0 x 6-8`, Item 1
   `$228.84`, subtotal `$590.13`, grand total before CCC `$631.44`, and total
   with CCC `$650.38`.
3. Confirm Items 2 and 3 remain `$173.61` and `$187.68`, customer/profile data
   remains unchanged, and the legacy form no longer starts in `data not saved`
   solely because it recomputed the stale row.
4. Verify the adjusted-order notice and new-form handoff; confirm mutating
   controls/save variants cannot write.
5. Open an ordinary unadjusted order in both forms and confirm legacy editing and
   saving remain unchanged.
6. Reopen Preview/PDF and ensure only the retained size is present. Confirm no
   new console errors related to snapshot projection.

Release gate: exact-order old/new row and monetary parity, protected legacy
write behavior, unadjusted-order compatibility, and document parity all pass.

### Phase 6: Documentation and rollout

1. Update `.brain/features/in-form-sales-order-adjustments.md` to state that the
   approved snapshot also governs the legacy edit projection and that legacy
   mutation is guarded.
2. Update the existing `09187PC` bug memory or create a linked follow-up bug note
   distinguishing the earlier print fix from this legacy-editor fix.
3. Record focused automated and browser evidence in `.brain/progress.md` and
   close the new in-progress task only after runtime acceptance passes.
4. No database migration or backfill is planned. If implementation reveals a
   need to alter persisted audit data, stop and record an ADR before proceeding.

## Expected File Ownership

- Shared canonical projection:
  `packages/sales/src/sales-form/application/` and the existing
  `packages/sales/src/print/approved-adjustment-snapshot.ts`
- Legacy data load/transform:
  `apps/dashboard/src/app-deps/(clean-code)/(sales)/_common/data-access/sales-form-dta.ts`
  and the duplicated DTO compatibility paths
- Legacy client safety UI:
  `apps/dashboard/src/app/(clean-code)/(sales)/sales-book/(form)/_components/`
  plus the legacy form store/action controls
- Legacy server save guard:
  `apps/dashboard/src/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case.ts`
  and save orchestration
- Regression coverage: adjacent shared Sales, legacy DTO/save, and UI tests

## Skills List Used

- `browser:control-in-app-browser` — authenticated, read-only comparison of the
  exact new and legacy order surfaces.
- `plan` — implementation-ready sequencing, decision points, validation gates,
  risks, and file ownership.
- Project Brain integration — aligned the plan with the approved-adjustment,
  print, pricing, and sales-form authority contracts already recorded in Brain.

## Risks and Mitigations

- **Accidental audit-data loss:** keep the projection pure and leave stale
  relational rows untouched; test that GET/transform produces no deletion IDs.
- **CCC double counting:** map `grandTotal` and `totalWithCcc` separately and pin
  the `09187PC` values in tests.
- **Legacy save bypass:** enforce the guard server-side, not only by disabling UI.
- **Unadjusted-order regression:** activate the projection and guard only when
  `approvedAdjustmentId` and an explicit persisted snapshot are present.
- **Duplicate loader drift:** place matching/merge rules in `packages/sales` and
  make both dashboard compatibility paths call the same helper.
- **Archived catalog records:** use relational data only as enrichment and never
  require a live catalog match to retain an approved persisted row.
- **Scope creep into the `nuqs` SSR issue:** track that console error separately;
  it does not explain the data mismatch and should not block the parity fix.

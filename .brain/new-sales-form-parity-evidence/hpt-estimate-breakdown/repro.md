# Repro

See phase matrix for manual flow steps and acceptance criteria:
- `brain/new-sales-form-phase0-repro-matrix.md`

## 2026-07-18 Runtime Evidence

- Fixture: order `08893LM`, loaded in both legacy and new sales forms before any new-sale creation.
- New-form route: `/sales-form/edit-order/08893LM`.
- Open the interior pre-hung HPT line and click its Line total.
- Confirm the compact menu shows the door/size description, quantity, contributor rows, final unit, add-on, custom price, and line total without obscuring the invoice summary.
- Observed values: Door Price `$191.65`, Jamb Size `$33.49`, Hinge Finish `$8.55`, Final unit `$233.69`, Qty `1`, Line total `$233.69`.
- The legacy form displays `$233.70` for this historical row while the persisted relational value and new form display `$233.69`; the user accepted this one-cent legacy rounding variance for the current pass.

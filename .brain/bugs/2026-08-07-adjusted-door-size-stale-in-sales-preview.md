# Adjusted Door Size Remained In Sales Preview

## Status

Fixed locally on 2026-08-07.

## Symptom

After an approved paid-order adjustment removed the `30" x 80"` size from the
first item on order `09187PC`, the new sales form correctly reopened with only
`24" x 80"`, but Sales Preview still printed both sizes. Current totals and
legacy detail rows therefore disagreed in the same document.

## Root Cause

The edit loader already treated `SalesOrders.meta.newSalesForm.lineItems` as
the authority after an applied adjustment. The shared print composer did not:
it continued building HPT door rows directly from legacy
`housePackageTools.doors`, where the removed size remained for compatibility
and audit purposes. A previously cached projection could also preserve that
pre-fix output.

## Fix

- The shared sales print-data boundary now applies the approved adjustment
  snapshot before composing any document mode.
- Persisted HPT door rows own membership, quantities, and prices. Matching
  legacy rows may enrich titles, images, and metadata but cannot restore a
  removed size or overwrite approved values.
- Employee HTML Preview force-refreshes the lightweight print-data projection
  before issuing access, so an already-cached pre-adjustment row is repaired on
  the next preview open.
- Orders without an applied-adjustment marker keep the existing legacy print
  behavior.

## Validation

- The exact two-legacy-row/one-approved-row regression was red before the fix
  (`2` rows received, `1` expected) and passes afterward.
- Focused print projection, cache, preview service, and document-access coverage
  passes 57 tests / 190 assertions.
- `@gnd/sales` and `@gnd/api` typechecks pass; focused Biome and
  `git diff --check` pass.
- Authenticated in-app browser QA reopened Sales Preview for `09187PC` and
  confirmed `24" x 80"` is present while removed `30" x 80"` is absent.
- No order, adjustment, payment, inventory, production, or fulfillment data was
  changed during QA; only the derived preview projection was refreshed.

## Linked Legacy Editor Follow-Up

The same stale relational row also remained visible in the legacy editor after
the print fix. The follow-up plan at
`.brain/plans/2026-08-07-bug-fix-adjusted-order-legacy-form-parity.md` is now
implemented: print and legacy editing share the approved HPT-row projection,
the adjusted legacy editor is read-only, and its save path checks the current
database marker before composing a write. Browser QA confirmed parity with the
new form on `09187PC` without saving or mutating the order.

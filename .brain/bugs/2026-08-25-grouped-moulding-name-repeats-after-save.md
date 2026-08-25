# Bug: Grouped Moulding Name Repeats After Save

## Date

2026-08-25

## Problem

On development order `09433PC`, the first row under Item 5 Mouldings gained
another copy of the remaining moulding names after every save. The grouped row
count and prices remained stable, but the first visible name and the selected
Moulding component label grew repeatedly.

## Root Cause

The legacy compatibility save stores the grouped Moulding step value on the
primary sales item as an aggregate label, for example `Casing, Stop`. When the
new editor reloaded the legacy siblings, `collapseLegacyGroupedLines` treated
that aggregate step value as the primary row's individual title. It then joined
the individual rows again, producing `Casing, Stop, Stop`. Every subsequent
save and reload appended the other row names again.

The individual legacy sales-item `description` remained correct and is the
row-scoped source of truth.

## Fix

Grouped moulding hydration now resolves each row title from its sales-item
description first, then the linked moulding product title, and uses the
Moulding step value only as a final legacy fallback. Existing inflated labels
therefore self-correct on reload without a data migration, and the next save
persists a clean aggregate label.

## Regression Coverage

- Added a focused domain regression reproducing a primary step with aggregate
  value `Casing, Stop` and two row descriptions, `Casing` and `Stop`.
- Before the fix the test received `Casing, Stop, Stop`; after the fix it
  receives `Casing, Stop` and preserves the two distinct row titles.
- The grouped new-sales-form API suite passes 10 tests / 94 assertions.
- Authenticated development validation on `09433PC` reloaded Item 5, performed
  one no-edit Save, dismissed Configure Inventory without changing inventory,
  and reloaded again. All five moulding names remained distinct and the first
  row stayed `FLAT CASING 1 X 4 X 17 (3-1/2 X 9/16 X 17') FJ WOOD PRIMED`.

## Related Files

- `packages/sales/src/sales-form/domain/grouping.ts`
- `packages/sales/src/sales-form/domain/grouping.test.ts`


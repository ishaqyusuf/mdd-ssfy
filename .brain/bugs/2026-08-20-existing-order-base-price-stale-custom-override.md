# Existing Order Base Price Kept The Same Amount

- Date: 2026-08-20
- Status: Fixed and authenticated local browser verified
- Surface: Sales Form HPT door-row Estimate > Edit Base Price

## Symptom

Changing a persisted door row's Base Price left the visible Estimate and line
amount unchanged, and saving/reopening the order appeared to retain the old
amount.

## Root Cause

`updateDoorRowBasePrice` updated base and calculated door-price metadata but
left the persisted `customPrice`/`overridePrice` active. The canonical price
resolver correctly prioritized that stale explicit override, so the new
calculated amount never became the row's final unit price.

## Fix

- Clear top-level and metadata custom/override price fields when Base Price is
  explicitly edited.
- Recompose the final unit price from the recalculated door price plus the
  existing shared surcharge, flat rate, and addon.
- Preserve quantities and recalculate the line through the existing canonical
  door-row pricing path.

## Regression Signal

Focused door pricing/workflow tests pass 26 tests / 98 assertions. Authenticated
local browser proof on order `09353PC` changed Base Price `13.13` to `13.14`,
updated Estimate `$18.50` to `$18.52` and line total `$740.00` to `$740.80`,
saved successfully, and retained those amounts after reload.

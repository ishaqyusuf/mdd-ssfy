# Community Model Cost Blank Start-Date Save Failure

## Summary
Creating a model cost from a Community Unit Invoice failed when the optional
Start Date was left blank. The Unit Invoice flow opens the editor on `New Cost`,
where both date fields are blank by default.

## Impact
- Community cost editors could enter task costs and press Save but the new
  model-cost record was not persisted.
- Existing unit invoice amounts were not changed by the rejected transaction.

## Root Cause
The form and API schema intentionally allow a null Start Date, while
`CommunityModelCost.startDate` is a required database column with a default.
The create query forwarded the blank value as explicit `null`, which bypassed
the database default and caused the transaction to reject.

## Fix
The create query now converts a null Start Date to `undefined`, allowing Prisma
to omit the field and the database to apply its default. Existing cost/tax
aggregation and unit-task synchronization remain unchanged.

## Prevention
- Added focused transaction coverage for creating a model cost with blank
  optional dates.
- The regression verifies both successful model-cost creation and downstream
  task-cost synchronization.

# New Sales Form Load Error State Repro

Status: Pending Runtime Evidence

## Risk

`NewSalesForm` can render the skeleton when `record` is null before it renders
the retry UI for `loadError`.

## Steps

1. Force `newSalesForm.bootstrap` or `newSalesForm.get` to fail.
2. Open `/sales-form/create-order` or an edit route.
3. Observe the first settled UI state after the query fails.

## Expected

The user sees an error panel with a retry action.

## Current Expected Failure

The user may see an indefinite loading skeleton because `isLoading || !record`
is checked before `loadError`.

## Evidence To Capture

- Browser screenshot after query failure.
- Console/network trace showing failed query.

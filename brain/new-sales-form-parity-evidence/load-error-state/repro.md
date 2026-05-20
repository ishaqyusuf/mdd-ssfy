# New Sales Form Load Error State Repro

Status: Implemented; Pending Runtime Evidence

## Risk

`NewSalesForm` can render the skeleton when `record` is null before it renders
the retry UI for `loadError`.

## Steps

1. Force `newSalesForm.bootstrap` or `newSalesForm.get` to fail.
2. Open `/sales-form/create-order` or an edit route.
3. Observe the first settled UI state after the query fails.

## Expected

The user sees an error panel with a retry action.

## Implementation

`apps/www/src/components/forms/new-sales-form/new-sales-form.tsx` now checks
`loadError` before the `isLoading || !record` skeleton fallback, so a failed
bootstrap/get can settle into retry UI.

## Evidence To Capture

- Browser screenshot after query failure.
- Console/network trace showing failed query.

## Runtime Attempt

2026-05-20:

- `GET /sales-form/create-order` with `Host: gndprodesk.localhost` returned an
  SSR shell, but the sales layout emitted `NEXT_REDIRECT;replace;/login/v2;307`.
- The same shell reported a tRPC client parse failure:
  `Unexpected token '<', "<?xml vers"... is not valid JSON`.
- Browser proof for the load error branch is blocked until local auth/session
  and tRPC runtime env are clean.

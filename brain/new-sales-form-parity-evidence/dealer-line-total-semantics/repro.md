# Dealer Line Total Semantics Repro

Status: Pending Runtime Evidence
Fixture: `DSF-FLAT-001`

## Risk

The dealer quote UI currently exposes a `Line Total` input through the shared
line item panel, while shared and server pricing recompute line totals from
`qty * unitPrice`.

## Steps

1. Open dealership quote composer.
2. Select a customer and dealer profile.
3. Add a line with qty `2` and unit price `80`.
4. Change the visible line total to `999`.
5. Save and reopen the quote.

## Expected

One of these contracts must be true:

- Preferred: line total is read-only/derived, so the user cannot enter `999`.
- Alternative: explicit override is persisted and all client/server/reopen totals use `999`.

## Current Expected Failure

If the UI accepts `999` but save/reopen returns `qty * unitPrice`, this is a
contract failure and must be fixed in Phase 1.

## Evidence To Capture

- Screenshot before save.
- Save response or test assertion.
- Reopened quote totals.

# Dealer Line Total Semantics Repro

Status: Implemented; Pending Runtime Evidence
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

## Implementation

- `packages/sales/src/sales-form/ui/line-items-panel.tsx` now supports
  `lineTotalMode="readonly"` plus a caller-provided derived total.
- `apps/dealership/src/components/dealer-sales-form/dealer-quote-main-panel.tsx`
  uses read-only line totals for dealership quotes.
- `apps/dealership/src/components/dealer-sales-form/dealer-quote-composer.tsx`
  displays dealer-facing derived totals from the dual pricing snapshot and saves
  base `qty * unitPrice` line totals.

## Evidence To Capture

- Screenshot before save.
- Save response or test assertion.
- Reopened quote totals.

## Runtime Attempt

2026-05-20:

- Existing dealership dev process was registered for `gnd-dealership.localhost`
  with PID `15043`.
- `GET /quotes/new` with `Host: gnd-dealership.localhost` returned
  `307 Temporary Redirect` to `/login` via `requireDealer`.
- Browser proof is blocked until a valid local dealer session is available.

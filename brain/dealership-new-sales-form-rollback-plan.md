# Dealership New Sales Form Rollback Plan

Date: 2026-05-23
Status: Active
Owner: Sales Form Rebuild Team

## Current Reality

`apps/dealership` is package-first for dealer quote create/edit. There is not a
complete legacy dealership quote composer still mounted behind a local route
toggle.

Rollback therefore means returning the dealership app to the last known-good
deployment or branch revision before the package-first quote composer, while
preserving quotes already saved with `meta.newSalesForm.lineItems`.

## Rollback Triggers

- Dealer quote save fails or saves incomplete package line payloads.
- Dealer displayed totals differ from persisted totals after save/reopen.
- Quote-to-order conversion drops dealer metadata or package line items.
- Dealer can access internal settings metadata, admin workflow controls, or raw
  component metadata.
- Browser QA phases 27-30 find an unrecoverable dealership create/edit/reopen
  blocker.

## Immediate Operator Steps

1. Pause dealer quote creation in support messaging.
2. Keep `bun run test:new-sales-form-migration` output attached to the incident
   note.
3. Identify the last green deployment before the package-first dealership quote
   composer.
4. Roll the dealership app back to that deployment from the hosting provider.
5. Keep the API/database deployment on a version that can read
   `meta.newSalesForm.lineItems`; do not remove package metadata readers.
6. Validate one existing dealer quote and one newly created quote on the rolled
   back deployment.

## Data Compatibility Rules

- Do not delete `meta.newSalesForm`.
- Do not run cleanup scripts that remove package-authored shelf, HPT, service,
  moulding, or form-step metadata.
- Reopened package-authored quotes must continue to prefer saved
  `meta.newSalesForm.lineItems` over reconstructed legacy item rows.
- Conversion must preserve dealer metadata and stamp conversion fields only.

## Verification After Rollback

Run:

```bash
bun run test:new-sales-form-migration
```

Then, during the browser phases, verify:

- `/quotes/new` can create and save a dealer quote.
- `/quotes/[id]/edit` can reopen that quote with the expected totals.
- Quote conversion remains scoped to the active dealer.
- No internal workflow settings controls are visible to dealer users.

## Forward Fix Path

After rollback, continue fixes on the package-first path. Re-enable the current
deployment only after the migration gate and dealership browser QA pass.

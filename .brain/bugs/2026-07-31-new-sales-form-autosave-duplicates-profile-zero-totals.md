# New Sales Form Autosave Duplicates And Profile Zero Totals

## Status

Resolved in the working tree on 2026-07-31.

## Symptoms

- A create-form autosave could generate more than one order for one logical
  draft.
- After a door/material workflow was priced, changing the customer profile
  could reset line totals and the invoice summary to zero.
- A newer edit made while an older autosave was completing could also be
  cleared from the dirty state before its debounce ran.

## Reproduction evidence

- Authenticated browser QA confirmed that merely opening the create form could
  persist a zero-value order while the route remained `/sales-form/create-order`.
- Captured save diagnostics contained repeated `salesId: null`, `slug: null`
  autosaves with the same `new-*` version 14-29 seconds apart. The pre-fix API
  regression created two different order ids from the same draft version.
- The pre-fix pricing regression repriced a configured component from `100` to
  `0` when its placeholder `basePrice` was `0`; the expected profile-adjusted
  value was `50`.

## Root causes

1. Queued autosave payloads retained the original null identity while the first
   create response assigned the order id, slug, and persisted version. The API
   had no fallback identity for a repeated stale new-draft payload.
2. An older save response always marked the form clean, even when the current
   payload contained a newer edit that had not entered the queue yet.
3. Profile repricing treated zero placeholder base prices as authoritative.
   Configured components and grouped door/shelf/moulding rows with valid current
   sales prices were consequently multiplied from zero.

## Fix

- Rebase queued payloads onto the first successful create identity before the
  queue continues.
- Preserve dirty state when the current payload differs from the payload that
  just completed.
- Persist the initial `new-*` version as `newSalesForm.draftKey`; repeated
  office-origin autosaves with that key reuse the existing order and current
  concurrency version.
- Treat only positive base prices as pricing authority. Zero base placeholders
  now fall back to ratio repricing from the valid current sales price.

## Validation

- 47 focused autosave, state, profile-repricing, transition, and API tests pass.
- `@gnd/sales`, `@gnd/api`, and `@gnd/dashboard` typechecks pass.
- `git diff --check` passes for the changed slice.
- Pre-fix browser reproduction completed. Post-fix browser replay was blocked
  when the shared local Next server became unresponsive; direct HTTP and two
  in-app tabs timed out. The server was not restarted because it is shared.


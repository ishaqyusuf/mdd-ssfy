# Dealership Cutover Readiness

Date: 2026-06-29
Status: Non-browser ready; authenticated browser QA partial pass with fixture/mobile coverage pending
Owner: Sales Form Rebuild Team

## Ready Signals

- Dealer workflow reference endpoint returns minimized package reference data.
- Dealer component lookup accepts only step id/title inputs used by the quote
  form.
- Dealer document detail strips raw item metadata for portal views.
- Dealer save/reopen tests prefer saved `meta.newSalesForm.lineItems`.
- Dealer quote conversion remains scoped to the active dealer.
- Dealer pricing tests cover flat, Door/HPT, shelf, moulding, and service lines.
- Dealer tax/production flags persist from package-authored metadata.
- Dealership UI treats line totals as read-only derived dealer totals.
- Dealership save payload now sends computed dealer line totals.
- Dealer quote create/update stays on the saved order-number edit route instead
  of resetting into a blank composer.
- Dealer quote edit routes use order-number slugs and redirect legacy numeric
  quote ids to `/quotes/{orderNo}/edit`.
- Dealer structured line totals now resolve from shelf/service/moulding/HPT row
  totals before dealer percentage pricing, keeping item headers, persisted line
  totals, and summaries aligned.
- Dealer mobile footer uses Save/Update quote labels.
- Dealership typecheck passes in the focused migration gate.

## Required Gate

```bash
bun run test:new-sales-form-migration
```

Latest Phase 22 gate passed with:

- 76 package workflow/domain tests.
- 15 dealer persistence/query tests.
- `@gnd/dealership` typecheck passing.
- `www` watched-file typecheck signal reporting no migration-file failures.

## Not Yet Ready For Production

Production cutover still requires browser phases 27-30. The 2026-06-29
authenticated dealership pass proved quick-login access, shelf quote save,
reopen, edit/resave, and dealer request-order persistence for quote `00002DPP`,
and the 2026-06-29 follow-up fixed the post-save reset, slug route, and shelf
line total mismatch. Production signoff still needs the remaining coverage:

- Current local Door/HPT and Moulding size fixtures expose empty size tables,
  blocking priced browser rows for those families.
- Final desktop/mobile screenshots are still needed after the fixes.

## Rollback

Use `brain/dealership-new-sales-form-rollback-plan.md`.

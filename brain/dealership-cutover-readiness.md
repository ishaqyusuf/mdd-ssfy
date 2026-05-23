# Dealership Cutover Readiness

Date: 2026-05-23
Status: Non-browser ready; browser QA pending
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

Production cutover still requires browser phases 27-30:

- Authenticated dealership create quote.
- Authenticated dealership edit/reopen quote.
- Authenticated dealership save and convert quote.
- Screenshot/notes for totals, line families, and absence of internal controls.

## Rollback

Use `brain/dealership-new-sales-form-rollback-plan.md`.

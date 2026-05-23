# WWW New Sales Form Cutover Readiness

Date: 2026-05-23
Status: Non-browser ready behind flag; browser QA pending
Owner: Sales Form Rebuild Team

## Ready Signals

- `www` can choose legacy/package workflow panel through
  `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT`, URL override, local
  storage, or dev toggle.
- Package panel consumes `SalesFormWorkflowDataSource` instead of owning `www`
  TRPC details directly.
- `www` app-specific moulding calculator remains host-owned through the package
  calculator slot.
- `www` Door supplier management remains host-owned through the supplier slot.
- `www` component editing, section override, redirect, supplier, and door-size
  variant settings are admin/super-admin gated by the host wrapper.
- Package print/PDF and inventory sync fallbacks read package-authored metadata.
- The focused migration gate reports no watched-file `www` typecheck failures.

## Required Gate

```bash
bun run test:new-sales-form-migration
```

Latest Phase 23 gate passed with:

- 76 package workflow/domain tests.
- 15 dealer persistence/query tests.
- `@gnd/dealership` typecheck passing.
- `www` watched-file typecheck signal reporting no migration-file failures.

## Flagged Cutover Steps

1. Keep `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT=legacy` until browser
   QA passes.
2. Use `?packageWorkflowPanel=package` on representative order/quote fixtures.
3. Compare package panel behavior against `ItemWorkflowPanel`.
4. After browser QA, change the env default to `package`.
5. Keep URL/localStorage rollback override available through the rollback window.

## Not Yet Ready For Production Default

Production default change still requires browser phases 27-30:

- Authenticated `www` order/quote edit and save.
- Legacy-vs-package fixture comparison.
- Admin-gated control verification.
- Screenshot/notes for Door/HPT, shelf, moulding, service, redirects, and
  totals.

## Rollback

Use `brain/www-new-sales-form-rollback-plan.md`.

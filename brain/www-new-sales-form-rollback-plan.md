# WWW New Sales Form Rollback Plan

Date: 2026-05-23
Status: Active
Owner: Sales Form Rebuild Team

## Current Reality

`apps/www` still has both workflow panels:

- Legacy: `ItemWorkflowPanel`.
- Package: `WwwSalesFormWorkflowPanel`.

Rollback can happen without deployment rollback by forcing the package-panel
flag back to legacy.

## Rollback Controls

- Environment default:
  - `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT=legacy`
- Per-browser override:
  - URL: `?packageWorkflowPanel=legacy`
  - Local storage key: `gnd:new-sales-form:package-workflow-panel`
- Dev UI:
  - Uncheck the package workflow panel dev toggle.

## Rollback Triggers

- `www` package panel cannot save, reopen, or convert a representative order or
  quote.
- Admin workflow settings controls are visible to a non-admin role.
- Package-authored shelf, HPT, service, moulding, or Door lines differ from the
  legacy panel on the same fixture.
- Browser QA phases find layout or keyboard blockers that cannot be fixed within
  the cutover window.

## Operator Steps

1. Set `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT=legacy`.
2. Redeploy `apps/www` if changing the environment default.
3. Clear browser local storage key
   `gnd:new-sales-form:package-workflow-panel` for any operator browser used to
   validate the rollback.
4. Open a representative quote/order without `packageWorkflowPanel=package`.
5. Confirm the legacy `ItemWorkflowPanel` is shown.
6. Save and reopen the fixture.
7. Keep the shared package metadata readers in place; do not remove package
   payload compatibility.

## Verification

Run:

```bash
bun run test:new-sales-form-migration
```

Then defer browser proof to phases 27-30:

- Legacy panel opens by default under the rollback flag.
- Package panel can still be enabled by URL/localStorage for diagnosis.
- Saved package-authored documents reopen safely in the legacy path or retain
  enough metadata to return to the package path after the fix.

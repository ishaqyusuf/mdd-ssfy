# New Sales Form Cutover Strategy

Date: 2026-05-23
Status: Active
Owner: Sales Form Rebuild Team

## Scope

This covers the shared `@gnd/sales/sales-form` package cutover for:

- `apps/dealership` dealer quote creation/editing.
- `apps/www` internal new sales form workflow panel replacement.

Browser/runtime QA remains intentionally later in the roadmap.

## Flags And Toggles

### `www`

- Primary default flag: `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT`.
- Values:
  - `legacy`: default to legacy `ItemWorkflowPanel`.
  - `package`: default to shared `WwwSalesFormWorkflowPanel`.
- Operator override:
  - URL: `?packageWorkflowPanel=package` or `?packageWorkflowPanel=legacy`.
  - Local storage key: `gnd:new-sales-form:package-workflow-panel`.
- Dev toggle:
  - The existing dev-only checkbox still switches the same local preference.
- Rollback:
  - `brain/www-new-sales-form-rollback-plan.md`

### Dealership

- Current implementation is package-first for dealer quote create/edit.
- Rollback is tracked in
  `brain/dealership-new-sales-form-rollback-plan.md` because the dealership
  surface no longer has a complete legacy quote composer in the app tree.

## Non-Browser Gates

Run after each implementation slice:

```bash
bun run test:new-sales-form-migration
```

The gate includes package workflow tests, dealer persistence tests, dealership
typecheck, and a watched-file `www` typecheck signal.

## Cutover Criteria

- Package, dealer persistence, and dealership typecheck remain green.
- `www` watched-file typecheck reports no migration-file failures.
- Dealer quote save payloads persist computed dealer totals.
- `www` package panel admin controls remain host-gated.
- Browser QA phases 27-30 pass before production default changes.

## Rollback Criteria

- Any failed save/reopen/convert path.
- Any dealer total mismatch versus expected dealer profile pricing.
- Any package-authored line missing from print/PDF or inventory sync.
- Any unauthorized dealer exposure of internal settings, metadata, or admin
  controls.

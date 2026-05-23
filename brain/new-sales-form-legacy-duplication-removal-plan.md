# New Sales Form Legacy Duplication Removal Plan

Date: 2026-05-23
Status: Active
Owner: Sales Form Rebuild Team

## Principle

Do not delete app-local workflow code until the package path has passed browser
QA and the rollback window has closed. Removal must not happen before phases
27-30.

## Keep Until Final Signoff

- `apps/www/src/components/forms/new-sales-form/sections/item-workflow-panel.tsx`
- `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx` legacy dynamic
  import and rollback toggle wiring.
- `apps/www` admin dialogs still owned by `WwwSalesFormWorkflowPanel`, including
  component edit, section override, redirect, supplier, image upload, and door
  size variant flows.
- Dealer package metadata readers in API/DB/print/inventory sync.

## Candidate Deletions After Cutover

1. Remove the `ItemWorkflowPanel` dynamic import and legacy branch in
   `new-sales-form.tsx`.
2. Remove `NEXT_PUBLIC_NEW_SALES_FORM_PACKAGE_PANEL_DEFAULT`,
   `packageWorkflowPanel` URL override, and the local storage preference only
   after the rollback window closes.
3. Delete app-local duplicated workflow selection/rendering logic from
   `item-workflow-panel.tsx`.
4. Move any remaining app-owned admin dialogs that are still useful into stable
   host slots or keep them explicitly as `www`-only adapters.
5. Remove obsolete Brain parity evidence files only after final docs preserve
   the shipped contract and rollback notes.

## Not Deletable

- Shared package workflow domain/calculator/row patch helpers.
- Dealer-protected workflow endpoints.
- Print/PDF metadata fallbacks.
- Inventory sync metadata fallbacks.
- Saved `meta.newSalesForm` compatibility readers.

## Removal Gates

- `bun run test:new-sales-form-migration` passes.
- Dealership browser QA passes.
- `www` package-toggle browser QA passes.
- Browser automation/scripted QA exists for the final package paths.
- Rollback owner signs off that the legacy `www` panel is no longer required.

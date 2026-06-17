# Mobile Invoice Form

## Purpose

Tracks the Expo mobile invoice/quote form under `apps/expo-app/src/features/sales/invoice-form`.

## Current Architecture

- The form uses shared `@gnd/sales/sales-form-core` helpers for workflow line pricing, grouped row patches, HPT door summaries, shelf row patches, record hydration, and save payload generation.
- Mobile save/edit/update flows remain routed through the invoice form store:
  - `actions.patchLineItem(...)`
  - `actions.buildSavePayload(...)`
  - `toSalesFormSaveDraftPayload(...)`
  - `newSalesForm.saveDraft` / `newSalesForm.saveFinal`
- The shared sales form schemas preserve rich grouped payloads with pass-through fields for:
  - `formSteps`
  - `shelfItems`
  - `housePackageTool.doors`
  - grouped row metadata such as `meta.serviceRows` and `meta.mouldingRows`

## Mobile Step Editors

Specialized invoice line editors now live under dedicated step-family folders:

```text
apps/expo-app/src/features/sales/invoice-form/steps/
  house-package-tool/
  moulding/
  service/
  shelf-items/
  shared/
```

`line-item-card.tsx` composes these editors instead of owning every grouped row UI inline.

## Behavior Notes

- House Package Tool is a first-class mobile section with package totals, active-door chips, add-size behavior, and stacked editable size rows.
- Service rows support add/remove plus service text, qty, unit price, tax, and production toggles.
- Moulding rows support stacked mobile editing for description, qty, add-on, custom price, estimate, and total.
- Shelf items support section/row management, product search chips, custom rows, qty, unit price, and total updates.
- HPT, service, moulding, and shelf changes continue to write through the shared core patch helpers so create, edit, and update saves preserve canonical payload shape.

## Validation Guidance

- Manual mobile QA should cover create and edit saves for mixed invoice lines containing HPT doors, service rows, moulding rows, and shelf items.
- Lightweight static validation is preferred by default in this Bun monorepo; broad Expo typecheck/build/browser validation should be run only when explicitly requested.

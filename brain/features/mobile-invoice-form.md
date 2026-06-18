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

- The mobile sales dashboard `New Invoice` action opens a Sales/Quote chooser before entering the form; Sales maps to `order` mode and Quote maps to `quote` mode, while the separate dispatch shortcut remains admin-only.
- New invoice route params, form initialization, save labels, and the customer selector preserve the selected sales form type.
- Customer/item selector helper text and item list actions use quote-aware wording when the selected sales form type is `quote`; the customer selector and customer list receive the route type directly so first render does not flash invoice-only copy or query the wrong recent-customer type.
- Create-mode form bootstrap receives the selected customer id from the customer selector handoff, so server bootstrap data cannot overwrite the chosen customer with an unscoped default.
- The customer step defaults to 10 unique recent customers for the selected type, grouped by customer and ordered by each customer's latest order/quote timestamp; the API overfetches recent customer groups before hydration so missing stale customer references do not under-fill the default list, and search text switches the list to explicit search results.
- Workflow component cards no longer show UID text as a visible subtitle; UID remains available for identity, keys, routing, and state.
- Floating invoice actions use a shared screen-level host inside the invoice form shell, so item FABs, custom actions, proceed buttons, and footer-safe actions align consistently above the form footer instead of scrolling with the item content.
- The invoice item switcher FAB uses the same centered floating lane as workflow custom/proceed actions, keeping it above the Save Draft/Create footer instead of pinned to the bottom corner.
- Custom-component capable workflow steps now expose a centered floating `Custom` action that opens a stable two-snap sheet at the fullscreen search index with `Custom Component Title` as the leading input label and an explicit full-width fixed-bottom `Proceed` button, explicitly snaps down to compressed `Title & Cost`, resets cleanly on dismiss, recognizes custom support from form-step metadata, route-step metadata, and selected-step custom snapshots, lists only non-archived custom options, prefers stored custom pricing for the editable cost field, selects an unchanged existing custom option without a backend update, saves/updates changed or new customs through `inventories.upsertDykeCustomStepComponent` with the same custom metadata/image marker used by the website, derives the selected sales price from the entered cost and active customer profile coefficient, selects the component, and advances the workflow.
- Selected custom components are pinned first in the component grid when present, while unselected custom components remain hidden from the normal component list.
- Door-size selection requires at least one selected quantity before advancing, and the route defers navigation until after the workflow selection callback has run so `Next step` can move the underlying workflow forward.
- Door and moulding multi-select steps show a centered floating `Proceed` action once at least one component is selected; the action advances the workflow while staying above the bottom footer controls.
- House Package Tool is a first-class mobile section with package totals, active-door chips, supplier-sensitive active-door size configuration, active-door swap/removal, derived add-size behavior, and stacked editable size rows. Active-door removal preserves the current workflow route config when recalculating remaining door rows, including no-handle and swing behavior.
- Service rows support add/remove plus service text, qty, unit price, tax, and production toggles.
- Moulding selection now behaves as true multi-select in the component grid; row-level description, qty, add-on, custom price, estimate, and total remain editable in the moulding line-item section, and existing grouped row identity fields are preserved when deriving edit rows.
- Shelf items support section/row management, category path selection, category-scoped product chips, typed global product search before a category is selected through the shelf product search endpoint, bounded product search with de-duped mobile-visible options, custom rows, qty, unit price, and total updates.
- HPT, service, moulding, and shelf changes continue to write through the shared core patch helpers so create, edit, and update saves preserve canonical payload shape.
- Mobile invoice-form imports from `@gnd/sales/sales-form-core` are covered by a barrel export smoke test for mobile-critical workflow helpers, including shelf category traversal and HPT door swap helpers.

## Validation Guidance

- Manual mobile QA should cover create and edit saves for mixed invoice lines containing HPT doors, service rows, moulding rows, and shelf items.
- Lightweight static validation is preferred by default in this Bun monorepo; broad Expo typecheck/build/browser validation should be run only when explicitly requested.

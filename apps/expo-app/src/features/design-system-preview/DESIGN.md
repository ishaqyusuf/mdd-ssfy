# Mobile Design System Preview

## Scope

This feature contains isolated, static preview screens for three proposed mobile design-system directions. It is not a production UI migration.

Routes:

```text
/design-system-preview
/design-system-preview/template-a
/design-system-preview/template-b
/design-system-preview/template-c
```

Settings entry:

```text
Settings -> Design System Previews
```

The Settings section, protected root stack screen, and preview route layout are gated by `__DEV__`, so these samples are development-only.

## Inspiration

The primary external reference is the Fikri Studio / Tiimi Mobile Dribbble direction: compact mobile operational UI, dark header chrome, search/filter controls, white cards, small metadata rows, and restrained status accents.

The previews adapt those ideas to GND's actual mobile domains: jobs, dispatch, warehouse packing, sales orders, HRM, and invoice workflows.

## Shared Preview Rules

- Static sample data only.
- No live mutations.
- No production dashboard behavior changes.
- Development builds only.
- Light and dark palettes are defined per template.
- Preview screens resolve the active palette from the app color scheme.
- Template screens expose the app theme toggle in the top-right header slot.
- Template bottom tabs render as a floating overlay outside the scroll view, with transparent surrounding space so content remains visible around the tab card.
- Header text, search controls, and native status bar style derive from header luminance so dark chrome uses light system icons and near-white chrome keeps dark text.
- Header theme-toggle icons also derive from the header foreground instead of the global app theme artwork.
- Header back, search, and filter icons use the shared `Icon` `inverted` option when the custom header surface is opposite the current app theme.
- Rounded touch surfaces and header controls set explicit clipping so pressed/ripple feedback does not bleed past curved corners.
- Components stay local to `src/features/design-system-preview`.
- Tiny route wrappers live in `src/app/design-system-preview`.
- Existing app primitives are reused where practical: `Pressable`, `Icon`, React Native `Text` and `View`.

## Template A: Ops Console

Intent: compact operational command center.

Best fit:

- admin dashboards
- HRM
- sales dashboard
- job and work queues

Visual system:

- dark graphite top chrome
- light gray background
- white cards with thin borders
- dark mode shifts to graphite surfaces, softer blue accents, and brighter state colors
- compact search/filter row
- metadata rows with small icons
- status chips for ready, pending, blocked, and complete states
- extended work queue sample so the screen scrolls beneath and around the floating tab card
- bottom navigation mock

Tradeoff:

- strongest Fikri reference match
- highest scan density
- less thumb-forward than Template B

## Template B: Field Flow

Intent: thumb-first execution workflow.

Best fit:

- drivers
- installers
- warehouse packing
- dispatch detail
- job completion workflows

Visual system:

- light header
- dark mode uses a deep teal-black header and surfaces instead of white field cards
- prominent active-route card
- larger controls
- pill filters
- direct primary action
- clear bottom navigation mock

Tradeoff:

- best for field usability
- lower density for admin and sales surfaces

## Template C: Sales Ledger

Intent: compact sales and invoice workspace.

Best fit:

- sales dashboard
- order list
- invoice shell
- review and cost summary

Visual system:

- soft off-white background
- dark mode uses warm charcoal surfaces while preserving the ledger feel
- lower-radius cards
- ledger rows
- tabular numeric values
- restrained color
- financial status hierarchy

Tradeoff:

- best for sales/accounting clarity
- less expressive for dispatch or installer workflows

## Recommendation

Use Template A as the likely overall mobile shell direction, then selectively borrow Template B's active-task card and bottom action model for field workflows. Template C should inform the invoice and sales order surfaces even if it is not selected as the global shell.

## Files

```text
components/preview-card.tsx
components/preview-metric.tsx
components/preview-shell.tsx
components/preview-status.tsx
data/sample-data.ts
design-systems/template-a-ops-console.ts
design-systems/template-b-field-flow.ts
design-systems/template-c-sales-ledger.ts
screens/design-system-index-screen.tsx
screens/template-a-screen.tsx
screens/template-b-screen.tsx
screens/template-c-screen.tsx
```

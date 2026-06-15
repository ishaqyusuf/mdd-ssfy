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
- compact search/filter row
- metadata rows with small icons
- status chips for ready, pending, blocked, and complete states
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

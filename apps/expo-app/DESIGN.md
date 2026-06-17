# GND Expo Mobile Design System

## Purpose

The Expo app is the mobile operational surface for GND field, dispatch, sales, HRM, and job workflows. The mobile design system should feel clean, fast, accountable, and practical for repeated use on phones.

This document records the current mobile design-system direction and the preview process for selecting the next production template.

## Current System

- App: `apps/expo-app`
- Router: Expo Router under `src/app`
- Tokens: `src/lib/theme.ts` and `src/styles/global.css`
- Styling: NativeWind class names plus occasional inline React Native styles
- Icons: `@hugeicons/react-native` through `src/components/ui/icon.tsx`
- Common primitives: `Pressable`, `Button`, `Text`, `View`, inputs, switches, tabs, alerts

The existing app uses shadcn-style semantic color names: `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `success`, `warn`, `destructive`, `border`, `input`, and `ring`.

## Design Principles

- Fast scanning: cards and rows should surface status, owner, date, count, and next action without digging.
- Thumb-first workflows: field and dispatch screens need large tap targets and persistent workflow actions.
- Operational calm: use color for state and action, not decoration.
- Dense where needed: sales and admin screens should support compact financial and queue reading.
- Preview before migration: new visual systems should be tested in isolated preview routes before replacing production surfaces.

## Preview Routes

Three proposed templates are implemented under:

```text
src/app/design-system-preview
src/features/design-system-preview
```

Open them from Settings under `Design System Previews` in development builds only. The preview Settings section and preview route stack are gated behind `__DEV__`.

Each preview template ships with light and dark palettes. The preview screens resolve colors from the app's current color scheme, so Settings theme overrides can be used to compare both modes before a template is selected.

The three template screens include a top-right theme toggle for fast light/dark comparison while reviewing the samples.

Template bottom tabs float over the scroll content as a compact overlay, leaving the surrounding content/background visible instead of reserving a full-width footer band.

Preview header text/search contrast and native status bar style are computed from the template header color, so dark headers use light status icons while near-white headers use dark text.

The shared `Icon` component supports an `inverted` option for custom surfaces that need icon colors from the opposite app theme, such as dark preview chrome inside light mode.

## Candidate Templates

### Template A: Ops Console

Best for admin, HRM, job queues, and sales dashboards.

- compact dark top chrome
- search/filter row in the header
- light app background
- white operational cards
- metadata rows with icons
- restrained status chips
- closest match to the Fikri/Tiimi mobile reference direction

### Template B: Field Flow

Best for drivers, installers, warehouse packing, and job execution.

- light top chrome
- large active-work card
- pill filters
- larger tap targets
- fewer nested surfaces
- persistent bottom navigation/action patterns

### Template C: Sales Ledger

Best for sales, orders, invoices, and cost summaries.

- off-white work surface
- compact cards
- ledger-style rows
- tabular numeric alignment
- strong financial hierarchy
- lower radius and higher information density

## Selection Criteria

Choose the final template by testing:

- Settings to preview navigation
- iPhone-sized readability
- larger phone readability
- dark/light mode compatibility
- status clarity without color-only meaning
- card density versus thumb usability
- fit for dispatch, sales, HRM, and invoice form shells
- implementation cost to migrate production screens

## Adoption Plan

After a template is selected:

1. Record the selected direction in this file.
2. Promote selected colors/radius rules into `src/lib/theme.ts` and `src/styles/global.css`.
3. Extract reusable production primitives from the preview only when duplication is real.
4. Migrate one low-risk production surface first, likely Settings or HRM.
5. Migrate dispatch and warehouse packing.
6. Migrate sales dashboard and orders list.
7. Migrate invoice form shell after the core interaction model is proven.

## Current Decision

No template has been selected yet. The current implementation is preview-only and development-only.

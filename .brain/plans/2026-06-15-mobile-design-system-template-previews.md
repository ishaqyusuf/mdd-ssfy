# Mobile Design System Template Previews

Date: 2026-06-15
Status: Implemented
Owner: Mobile

## Objective

Create three isolated, clickable mobile design-system preview templates in the Expo app so the team can compare directions before choosing one to promote into the production mobile UI system.

The previews should be accessible from Settings and should use realistic GND mobile content patterns: operational dashboards, dispatch/job lists, sales/order cards, status metadata, form controls, and action rows.

## Inspiration

Primary visual reference: Dribbble search for Fikri mobile work, especially the Fikri Studio / Tiimi Mobile recruitment shot direction.

Design cues to adapt, not copy:

- compact dark top chrome with search/filter controls
- light content surface with clear operational cards
- restrained icon usage and metadata rows
- status accents used sparingly for meaning
- rounded but not overly soft cards
- bottom navigation / section switching patterns
- high scan speed for repeated business workflows

## Current App Context

- Mobile app lives in `apps/expo-app`.
- Routing uses Expo Router under `apps/expo-app/src/app`.
- Shared mobile tokens currently live in `apps/expo-app/src/lib/theme.ts`.
- The existing design uses NativeWind classes, Hugeicons, and shadcn-style token names.
- Settings are centralized through:
  - `apps/expo-app/src/screens/screen-settings.tsx`
  - `apps/expo-app/src/components/settings-sections.tsx`
  - `apps/expo-app/src/app/settings.tsx`
  - `apps/expo-app/src/app/(job-admin)/(tabs)/settings.tsx`
  - `apps/expo-app/src/app/(drivers)/settings.tsx`

## Proposed Preview Placement

Add a dedicated preview feature under:

```text
apps/expo-app/src/features/design-system-preview/
  data/
    sample-data.ts
  design-systems/
    template-a-ops-console.ts
    template-b-field-flow.ts
    template-c-sales-ledger.ts
  components/
    preview-shell.tsx
    preview-card.tsx
    preview-status.tsx
    preview-metric.tsx
  screens/
    design-system-index-screen.tsx
    template-a-screen.tsx
    template-b-screen.tsx
    template-c-screen.tsx
  DESIGN.md
```

Add routes:

```text
apps/expo-app/src/app/design-system-preview/_layout.tsx
apps/expo-app/src/app/design-system-preview/index.tsx
apps/expo-app/src/app/design-system-preview/template-a.tsx
apps/expo-app/src/app/design-system-preview/template-b.tsx
apps/expo-app/src/app/design-system-preview/template-c.tsx
```

Add a Settings section:

```text
Design System Previews
- Ops Console
- Field Flow
- Sales Ledger
```

This should be preview-only and development-only. It should not change existing dashboard, dispatch, sales, HRM, or invoice-form screens until a template is selected.

## Template A: Ops Console

Intent: closest to the Fikri/Tiimi operational-card direction.

Best fit:

- admin dashboard
- HRM
- sales dashboard
- job openings / work queue style lists

System:

- dark graphite header/top app bar
- light gray app background
- white cards with thin borders
- compact search field and filter button in the header area
- cards use metadata rows with small icons and status chips
- primary accent: GND blue
- secondary accents: green for ready/completed, amber for pending, red for blocked

Sample screen:

- header: "Operations"
- search/filter row
- metrics strip: open jobs, delayed, ready, blocked
- list cards for job/order/dispatch records
- bottom nav mock: Home, Inbox, Sales, Calendar, More

## Template B: Field Flow

Intent: cleaner thumb-first field-worker interface for drivers/installers.

Best fit:

- dispatch
- warehouse packing
- installer job dashboard
- job detail action flows

System:

- white or near-white background
- large active-work card at top
- pill segmented filters
- strong bottom action bar for current workflow step
- fewer nested cards than current screens
- larger tap targets than Ops Console
- primary accent: blue
- supporting accent: teal/green for completed/packed states

Sample screen:

- header: "Today"
- active assignment card with route/job metadata
- horizontal status filters
- task rows with check states
- persistent bottom action: "Start Route", "Pack Items", or "Complete"

## Template C: Sales Ledger

Intent: dense, premium, finance/order-management direction for sales workflows.

Best fit:

- sales dashboard
- orders list
- invoice form shell
- review/cost summary surfaces

System:

- soft off-white background
- compact tonal cards
- ledger-style summary rows
- tabular numeric alignment
- restrained brand blue with red/green status states
- low decoration, high information density

Sample screen:

- header: "Sales"
- summary balance cards: orders, due, production, delivery
- order cards with totals, due, status, customer, and next action
- invoice preview block with line totals and action footer

## Documentation Plan

Create `apps/expo-app/DESIGN.md` as the canonical mobile design system document after a template is selected.

Create `apps/expo-app/src/features/design-system-preview/DESIGN.md` during preview implementation with:

- purpose and scope
- inspiration notes
- template comparison matrix
- each template's color tokens, typography, spacing, radius, icon, card, list, input, status, and action rules
- screenshots or route names for manual review
- decision log for the selected template

If the selected template materially changes the app architecture or long-term design direction, add an ADR under `brain/decisions/`.

## Implementation Phases

### Phase 1: Preview Architecture

- Add the `design-system-preview` route group.
- Add a preview index route with three cards linking to each template.
- Add Settings links so previews are discoverable from the existing Settings screen.
- Keep all preview components local to the preview feature.

### Phase 2: Template Samples

- Build Template A, B, and C with static sample data.
- Reuse existing primitives where practical: `Pressable`, `Icon`, `Button`, `Text`, theme tokens.
- Avoid live API calls and mutation actions.
- Include representative states: normal, pending, completed, blocked, empty, and primary action.

### Phase 3: Design Documentation

- Document each template in preview `DESIGN.md`.
- Add the mobile-wide `apps/expo-app/DESIGN.md` with current-system findings and selection criteria.
- Document tradeoffs: scan density, field usability, sales suitability, implementation cost, dark-mode fit, and accessibility risk.

### Phase 4: Review And Selection

- Run the Expo app and review all three previews on narrow and large phone sizes.
- Capture screenshots for the three template routes.
- Pick one primary template and optionally one secondary pattern set.
- Record the decision in `apps/expo-app/DESIGN.md` and, if durable, a Brain ADR.

### Phase 5: Production Adoption

- Promote selected tokens into `apps/expo-app/src/lib/theme.ts`.
- Extract reusable primitives only after the chosen direction is clear.
- Migrate one low-risk surface first, likely Settings or HRM dashboard.
- Then migrate high-value surfaces in this order:
  1. dispatch list / warehouse packing
  2. sales dashboard / orders list
  3. invoice form shell
  4. job dashboard and job detail

## Validation

- `bunx tsc -p apps/expo-app/tsconfig.json --noEmit`
- focused import check for new preview routes and screens
- Expo Go smoke test through `bun --cwd apps/expo-app run dev`
- manual navigation from Settings to all three previews
- screenshot check for iPhone-sized and larger mobile viewports

Known caveat: broad Expo typecheck currently has existing baseline errors in unrelated areas, so validation should report whether any new diagnostics point to touched preview files.

## Implementation Notes

Implemented on 2026-06-15.

- Added the preview route group at `apps/expo-app/src/app/design-system-preview`.
- Added the preview feature under `apps/expo-app/src/features/design-system-preview`.
- Added static sample data, local preview components, three design-system token files, and four screens.
- Added `Design System Previews` to the Settings screen with direct links to all templates.
- Added `apps/expo-app/DESIGN.md` and preview-specific `DESIGN.md`.
- Registered `design-system-preview` in the protected root Expo stack for signed-in users.
- Follow-up update: the Settings section, protected root stack screen, and preview route layout are now gated behind `__DEV__` so the previews are development-only.
- Follow-up update: added per-template dark palettes and wired the preview index plus all three template screens to resolve colors from the active app color scheme.
- Follow-up update: added the existing app theme toggle to the top-right header slot of the shared preview shell, so all three template screens can switch light/dark mode in place.
- Follow-up update: moved template bottom tabs into a shared shell overlay so they no longer scroll with the template content.
- Follow-up update: changed the shared preview shell to derive header text/search contrast and native status bar style from header luminance, fixing Ops Console light-mode status icons and Sales Ledger light-mode header text visibility.
- Follow-up update: expanded the Ops Console work queue sample to ten records so the template exercises scrolling under the bottom tab overlay.
- Follow-up update: replaced the preview header's image-based global theme toggle with a local Sun/Moon icon toggle that inherits the template header foreground color.
- Follow-up update: added explicit clipping to rounded preview touch surfaces and header controls so pressed/ripple feedback does not bleed over curved component edges.
- Follow-up update: added a reusable `Icon` `inverted` option that resolves theme-token colors against the opposite app theme, then used it for preview header back, search, and filter icons when the custom header surface is opposite the current theme.
- Follow-up update: changed the bottom tab overlay to float without a full-width footer background, increasing scroll padding so content remains visible around and behind the tab card.
- Removed the existing `setting?.type!` job-settings update ambiguity by sending the literal `"jobs-settings"` type from Settings.

Validation:

- `bunx biome check apps/expo-app/src/app/design-system-preview apps/expo-app/src/features/design-system-preview` passed.
- `git diff --check` passed.
- Broad `bunx tsc -p apps/expo-app/tsconfig.json --noEmit` remains blocked by existing workspace baseline errors, but a touched-file grep for `app/design-system-preview`, `features/design-system-preview`, `screen-settings`, and `app/_layout` returned no diagnostics after the Settings type fix.
- Expo dev server started on port `3502` because port `3501` was already occupied.
- Playwright screenshot smoke was blocked because the local Playwright browser binary is not installed.
- Expo web HTTP route smoke was blocked by an existing `react-native-css` / `react-native-web` FlatList Metro error. Native Expo Go validation remains the expected preview path.

## Non-Goals

- Do not replace the production mobile design system during preview work.
- Do not change live API behavior.
- Do not change auth, section routing, or current dashboard permissions.
- Do not introduce new design dependencies unless a chosen template requires them.

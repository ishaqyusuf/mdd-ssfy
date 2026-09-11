# GND Mobile Screen-by-Screen Redesign

## Status

2026-09-10 owner amendment: follow
`../plans/2026-09-10-mobile-appearance-redesign-program.md` for current sequencing
and delivery policy. Three directions replace five; startup precedes sign-in;
Sales, Dispatch and Jobs lead module rollout. Preserve Classic through per-screen
appearance selection and review all flows in one canvas. The older counts below
are a prior inventory pending revalidation, not a completed runtime audit.

In progress from 2026-09-04. The authoritative inventory contains 41
production screen packages represented by 47 rendered route files, plus three
redirect-only routes. No production redesign has been implemented. Screen 01,
Sign In, is at the baseline/design preparation gate.

## Purpose

Replace the GND mobile experience one real production screen at a time while
preserving behavior and creating a durable approval, architecture, native QA,
and review trail for Android and iOS.

## Program Source Of Truth

The working queue, route evidence, artifact contract, percentages, and owner
approval state live under `.scratch/gnd-mobile-screen-redesign/`:

- `map.md`
- `route-inventory.md`
- `ui-audit-ledger.md`
- `artifact-map.md`

## Product Contract

- Every screen starts from an unchanged Android emulator and iOS simulator
  baseline.
- Three directions must differ in hierarchy, composition, navigation emphasis,
  and visual story, not only palette.
- Each direction supports 390x844 Android and iOS views in Light and Dark.
- Comparison uses top-right previous/next chevrons, not a select field.
- Codex recommends but never approves. Production edits require explicit owner
  selection, `approved.json`, and `implementation-contract.md`.
- Behavior, data meaning, API contracts, auth, permissions, and navigation stay
  stable unless a separately approved correction is documented.
- Shared semantic primitives own color, typography, spacing, button content
  alignment, loading/disabled states, accessibility, and 44pt targets.
- Short forms use native Android resize and restrained iOS clearance. Do not
  combine competing keyboard strategies or scroll focused fields to the top
  without need.
- Status-bar surface and icon contrast follow the background currently beneath
  the bar, including during scroll.
- A screen is complete only after Android/iOS Light/Dark, 100%/200% text,
  compact viewport, keyboard/input, applicable state QA, functional/source/type
  checks, visual/code review, and evidence/documentation updates.

## Clean Architecture Contract

Every approved screen runs `midday-migration-planner` in implementation mode.
The contract compares the route with the closest Midday behavior reference,
keeps the Expo Router entrypoint thin, places reusable native UI in shared
primitives, places workflow/query/mutation ownership in feature modules, keeps
domain logic in approved shared packages, and records native-specific omissions
instead of copying desktop patterns blindly.

For Screen 01, the selected Midday analogue is the public login route and its
separate authentication/options/visual-story components. GND keeps its existing
email/password API and role-based section routing; only the ownership split and
compositional discipline are relevant.

## Exclusions

- `src/driver-app/**` is a development-only alternate router selected only when
  both development build and driver-platform flags are true.
- `/design-system-preview` is protected by `__DEV__` at root, in Settings, and
  in its own layout.
- `/modal` is the unreferenced Expo starter screen using `@/example` content.
- Layout and HTML wrapper files are route infrastructure, not screens.

Registered but orphaned routes remain in scope until explicitly retired.

## Current Frontier

Startup/loading baseline and three-direction preparation now precede
`GND-ENTRY-001` Sign In. The root protected navigator exposes the auth stack
without a token; the auth stack starts at `sign-in`; production renders
`LoginTemplate0`. The first turn must capture both native baselines, publish
three Android/iOS Light/Dark directions, recommend one, and stop for owner choice
without modifying production source.

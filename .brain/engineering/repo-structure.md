# Repo Structure

## Purpose
Describes how the monorepo is organized so contributors can place code and docs consistently.

## Canonical Guide
- See `.brain/system/architecture-guide.md` for the full architectural placement model and boundary rules.

## Layout
- `apps/`: deployable application surfaces
- `packages/`: shared business logic, infrastructure, and UI modules
- `.brain/`: project memory, decisions, and execution tracking
- `ai/`: design artifacts, evidence capture, and ad hoc planning material
- `scripts/`: operational and reporting scripts
- `types/`: shared type declarations

## Placement Rules
- Put business logic that should be reused across surfaces in `packages/`.
- Keep application composition and route-specific wiring in `apps/`.
- Put durable planning and architecture context in `.brain/`.
- Put one-off evidence, screenshots, and audit artifacts in `ai/`.

## App UI Placement
- `components/modals/`: reusable modal implementations.
- `components/sheets/global-sheets.tsx`: global sheet registry.
- `components/sheets/global-sheets-provider.tsx`: provider that mounts global sheet infrastructure.
- `components/sheets/`: reusable sheet implementations.
- `components/tables/core`: table primitives and shared table behavior.
- `components/tables/<domain>/`: domain-specific table implementations.
- `components/forms/`: reusable form composition and field groups.
- `components/onboarding/`: onboarding flows and steps.
- `components/sidebar.tsx`: app sidebar composition.
- `components/sign-out.tsx`: sign-out control.

## App Router Placement
- `app/[...slug]/page.tsx`: only for intentionally slug-driven pages.
- `(sidebar)/layout.tsx`: sidebar route group layout.
- `(sidebar)/error.tsx`: sidebar route group error boundary.

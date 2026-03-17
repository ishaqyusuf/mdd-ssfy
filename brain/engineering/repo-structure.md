# Repo Structure

## Purpose
Describes how the monorepo is organized so contributors can place code and docs consistently.

## Layout
- `apps/`: deployable application surfaces
- `packages/`: shared business logic, infrastructure, and UI modules
- `brain/`: project memory, decisions, and execution tracking
- `ai/`: design artifacts, evidence capture, and ad hoc planning material
- `scripts/`: operational and reporting scripts
- `types/`: shared type declarations

## Placement Rules
- Put business logic that should be reused across surfaces in `packages/`.
- Keep application composition and route-specific wiring in `apps/`.
- Put durable planning and architecture context in `brain/`.
- Put one-off evidence, screenshots, and audit artifacts in `ai/`.

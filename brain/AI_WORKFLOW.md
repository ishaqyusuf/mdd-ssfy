# AI Workflow

## Purpose
Defines the expected read-before-write and update-after-change workflow for AI contributors in this repository.

## Before Work
- Read `brain/tasks/in-progress.md`.
- Read `brain/progress.md` for recent context and blockers.
- Read `brain/system/architecture.md`.
- Read any relevant docs in `brain/features/` and `brain/decisions/`.

## During Work
- Prefer the implementation order `Schema -> API -> UI -> Validation -> Polish` when the task spans layers.
- Keep changes aligned with existing package boundaries and avoid creating duplicate business logic.
- Use feature plans and ADRs as the authority when they exist.

## After Work
- Update `brain/tasks/` to reflect status changes.
- Update `brain/progress.md` with completed work, blockers, and follow-up context.
- Add or update feature docs when behavior changes materially.
- Add a new ADR in `brain/decisions/` when a durable architecture or module-boundary decision is made.

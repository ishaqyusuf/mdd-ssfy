# Project Brain

## Purpose
This directory is the durable project memory for the GND monorepo. It stores the current system shape, product direction, engineering rules, active work, decisions, and supporting reference material used across sessions.

## Structure
- `brain/system/`: runtime topology, architecture, and stack
- `brain/product/`: vision and roadmap
- `brain/engineering/`: repo conventions, AI rules, and delivery standards
- `brain/database/`: schema, relationships, and migrations
- `brain/api/`: endpoints, contracts, and permissions
- `brain/features/`: feature-specific docs
- `brain/decisions/`: ADRs and durable technical decisions
- `brain/bugs/`: bug memory and postmortems
- `brain/tasks/`: backlog, in-progress, done, and roadmap task tracking
- `brain/templates/`: starter templates for new Brain docs

## Canonical Entry Points
- Start with `brain/SYSTEM_OVERVIEW.md`.
- Use `brain/PROJECT_INDEX.md` to orient on repository structure.
- Use `brain/tasks/in-progress.md` for active execution.
- Use `brain/progress.md` for chronological session history.
- Use `brain/decisions/` for architecture-level decisions.

## Compatibility Notes
- Legacy flat files such as `brain/tasks.md`, `brain/architecture.md`, `brain/vision.md`, and `brain/roadmap.md` now act as compatibility pointers into this structure.
- Existing feature plans and runbooks remain valid at their current paths until explicitly reorganized.

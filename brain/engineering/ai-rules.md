# AI Rules

## Purpose
Operational rules for AI agents contributing to this repository.

## Rules
- Read relevant Brain docs before making changes.
- Update Brain docs after material code or planning changes.
- Prefer editing the structured Brain locations over creating new flat docs.
- Leave compatibility breadcrumbs when moving or reorganizing existing documentation.
- Keep historical logs in `brain/progress.md` unless a future migration explicitly relocates them.
- Follow Midday-style architecture by default wherever it fits the feature:
  - favor quick shell render, progressive hydration, and clear loading states
  - favor composable page sections over single heavyweight page queries
  - favor summary-first and paginated data access over loading full collections up front
  - for modals, drawers, and sheets, avoid eagerly mounting inactive tabs or preloading non-critical datasets
  - prefer one lean overview query for open-state surfaces, then fetch detail tabs only when activated
  - use local reference paths when you need examples:
    - `apps/www/src/(midday)`
    - `ai/midday-example`

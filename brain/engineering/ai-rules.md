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
  - when building or refactoring a page, workspace, dashboard, sheet-heavy flow, or route tree, study the real Midday repo first and let it teach the architecture before writing code
  - favor quick shell render, progressive hydration, and clear loading states
  - favor composable page sections over single heavyweight page queries
  - favor summary-first and paginated data access over loading full collections up front
  - for modals, drawers, and sheets, avoid eagerly mounting inactive tabs or preloading non-critical datasets
  - prefer one lean overview query for open-state surfaces, then fetch detail tabs only when activated
  - use Midday to improve both page loading and code organization:
    - keep route files thin and focused on composition
    - move reusable workflow logic into domain packages or dedicated query modules
    - avoid mixing dashboard analytics, table state, modal logic, and business rules in one page file
    - prefer workspace-specific sections/components over one generic mega-layout reused everywhere
  - use the real Midday project as the primary architecture reference when you need examples:
    - `/Users/M1PRO/Documents/code/_kitchen_sink/midday`
  - follow Midday architecture intentionally, not cosmetically:
    - study how Midday keeps route shells thin, composes pages from smaller sections, and loads secondary detail after first paint
    - copy the architecture pattern, loading strategy, and query shape decisions before copying UI details
  - use local in-repo examples only as secondary references:
    - `apps/www/src/(midday)`
    - `ai/midday-example`

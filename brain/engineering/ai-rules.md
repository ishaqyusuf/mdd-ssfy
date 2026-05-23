# AI Rules

## Purpose
Operational rules for AI agents contributing to this repository.

## Rules
- Read relevant Brain docs before making changes.
- Always update Brain docs before closing any coding/planning task; for trivial/no-impact work, explicitly note that no Brain file needed a content change.
- Update Brain docs after material code or planning changes.
- Prefer editing the structured Brain locations over creating new flat docs.
- Leave compatibility breadcrumbs when moving or reorganizing existing documentation.
- Keep historical logs in `brain/progress.md` unless a future migration explicitly relocates them.
- For Next.js work in `apps/www`, `apps/dealership`, or shared React UI consumed by either app, always use the repository's Next.js skill set before implementing or reviewing:
  - `vercel:react-best-practices`
  - `vercel-react-best-practices`
  - `agency-engineering` with the Frontend Developer specialist by default
  - `agency-design` with the UI Designer specialist by default
  - `shadcn` for component-system checks, composition rules, installed component verification, and docs/CLI workflow
- Treat that skill set as mandatory for dealership quote/new-sales-form UI migration work, including shared `@gnd/sales/sales-form` package UI that feeds `apps/www` or `apps/dealership`.
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

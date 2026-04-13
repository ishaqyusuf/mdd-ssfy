# Coding Standards

## Purpose
Repository-level implementation rules that recur across active workstreams.

## Canonical Guide
- See `brain/system/architecture-guide.md` for the full repository architecture handbook, including placement, Midday-style page architecture, and performance expectations.

## Standards
- Prefer shared package/domain logic over app-local duplication.
- Follow the implementation order `Schema -> API -> UI -> Validation -> Polish` for cross-layer features and fixes.
- Keep correctness-critical business behavior inside explicit package boundaries rather than route-local helpers.
- Add focused regression coverage for fixes touching pricing, persistence, payments, dispatch, or other high-risk business flows.
- Preserve existing production behavior when building replacement systems in parallel; cutovers should be explicit, reversible, and documented.
- Prefer Midday-style page architecture wherever possible:
  - route components should stay thin and avoid blocking navigation on expensive setup work
  - first render should prioritize shell, summary, and actionable context before secondary detail
  - use aggregates, summaries, and pagination for initial data requirements
  - defer heavy enrichment, secondary panels, and full-detail datasets until after the page is visible
  - for sheets and tabbed workspaces, mount only the active tab content and keep each tab responsible for its own on-demand query
  - replace broad legacy server-action loaders with narrower tRPC queries when the first-paint view only needs overview data
  - keep overview queries intentionally small: recent slices, counts, and totals first; full histories and transaction tables later
  - use `/Users/M1PRO/Documents/code/_kitchen_sink/midday` as the primary local reference for page architecture decisions
  - follow Midday's structural patterns first: thin route shells, section-based composition, and on-demand secondary data
  - use existing in-repo reference patterns from `apps/www/src/(midday)` and `ai/midday-example` only as secondary examples

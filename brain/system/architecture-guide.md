# Architecture Guide

## Purpose
This is the canonical engineering guide for how GND is structured and how new work should be placed, designed, and hardened.

It blends two sources:
- the current GND monorepo reality
- the Midday architecture style already adopted in this repo and reinforced by the local Midday reference project at `/Users/M1PRO/Documents/code/_kitchen_sink/midday`

Use this guide when creating new features, refactoring old ones, deciding where code belongs, or reviewing whether a change matches the repo's architecture direction.

## Core Principles

### 1. Thin app surfaces, thick shared domain modules
- App routes, screens, and handlers should stay focused on composition, access control, query orchestration, and user flow wiring.
- Reusable business logic belongs in `packages/*`, not in route files or UI components.
- Correctness-critical behavior must live behind explicit domain boundaries so web, API, jobs, and mobile can share one truth.

### 2. Summary-first user experience
- Favor a fast shell render with the primary workspace visible quickly.
- First paint should prioritize summary cards, key counts, active actions, and paginated tables.
- Defer heavy enrichment, secondary panels, full-detail datasets, and non-critical controls until after the page is usable.

This is the main Midday pattern worth borrowing into GND. We want the responsiveness and composability, not a copy of Midday's folder names.

### 3. Single-authority domain logic
- Sales, dispatch, payments, production, documents, and other sensitive workflows should not have competing implementations across apps.
- If a workflow affects revenue, quantity truth, state progression, or auditability, centralize it in a package boundary and let apps consume it.
- Repair utilities may exist, but normal runtime correctness must not depend on repair flows.

### 4. Explicit incremental migration
- When rebuilding unstable or legacy flows, prefer a parallel `v2` path instead of rewriting the production path in place.
- Keep cutovers explicit, reversible, and documented in Brain.
- Preserve current production behavior until replacement behavior is validated.

### 5. Build in the repository's execution order
Follow this order for cross-layer work:
1. Schema
2. API
3. UI
4. Validation
5. Polish

This order reduces contract drift and avoids polishing a UI whose upstream model is still unstable.

## Monorepo Topology

### Workspace model
- Package manager: Bun
- Monorepo orchestrator: Turborepo
- Primary language: TypeScript
- Formatting and linting baseline: Biome plus repo-specific scripts

### Top-level layout
- `apps/`: deployable or directly runnable product surfaces
- `packages/`: shared domain, infrastructure, platform, and UI modules
- `brain/`: durable project memory, architecture, plans, tasks, and decisions
- `ai/`: evidence, experiments, example snippets, designs, and ad hoc research material
- `scripts/`: operational scripts and utilities
- `types/`: shared declarations that do not belong to a single package

### Why this shape
This is aligned with both GND's current operating model and the real Midday repo pattern:
- multiple app surfaces
- a growing set of focused shared packages
- technical documentation separate from runtime code

The goal is not "apps do everything." The goal is to keep app folders thin and move reusable capability downward into packages.

## Application Boundaries

### `apps/www`
Main web application for business workflows.

Owns:
- route trees
- page composition
- workspace shells
- local interaction state
- feature-level UI orchestration
- user-facing table, sheet, modal, and dashboard composition

Should not own:
- durable domain truth
- pricing engines
- dispatch quantity truth
- payment allocation logic
- production state machines
- cross-surface business rules that mobile or API also need

### `apps/api`
Owns exposed contracts and server orchestration.

Owns:
- tRPC and REST entry points
- request/auth middleware
- route-level schema validation
- mapping from transport requests to package services
- server-side composition of read models when it is API-specific

Should not own:
- domain rules duplicated from `packages/*`
- UI formatting concerns
- route-local business logic that should be reused elsewhere

### `apps/expo-app`
Owns the mobile shell and mobile-specific interaction design.

Owns:
- Expo routing and screens
- mobile navigation
- mobile query hooks and presentation
- device/platform-specific UX
- offline/local-store concerns that are truly mobile-specific

Should not own:
- separate business rules when the web/API already have a shared package implementation
- alternative domain calculations unless intentionally documented and isolated

### `apps/site`
Treat as a separate web surface with narrower product concerns than `apps/www`.

Good fit for:
- storefront or public web flows
- lighter product experiences
- app-adjacent but lower-complexity pages

### `apps/gnd-backlog`
Use for supporting or backlog-oriented surfaces without letting it become a duplicate home for core domain logic.

## Shared Package Boundaries

### General package rule
If logic is shared, high-risk, or likely to outlive one screen, it belongs in `packages/`.

### Existing package roles in GND
- `packages/db`: database schema, relationships, queries, and low-level persistence building blocks
- `packages/sales`: sales-domain logic and the emerging home of control, payment, resolution, and PDF sub-systems
- `packages/documents`: shared document lifecycle and provider-agnostic document infrastructure
- `packages/notifications`: notification primitives and cross-surface notification behavior
- `packages/jobs`: background or scheduled job support
- `packages/ui`: reusable UI primitives shared across surfaces
- `packages/utils`, `packages/logger`, `packages/dev-logger`: low-level helpers and diagnostics

### Boundary expectations
- `packages/*` should expose stable contracts, not app-specific hacks.
- Package internals may have layers such as `domain`, `application`, `infrastructure`, `contracts`, and `projections` where complexity justifies it.
- New package boundaries should be created when a domain has enough complexity, reuse, and correctness risk to deserve ownership.

### Good reasons to create or deepen a package boundary
- the logic is reused by web and mobile
- the logic is reused by API and jobs
- the workflow is business-critical
- the workflow has repair/audit requirements
- the workflow currently drifts across screens or routes

## Dependency Direction

### Allowed direction
- `apps/*` may depend on `packages/*`
- `apps/www` may depend on shared UI and domain packages
- `apps/api` may depend on shared domain and persistence packages
- `apps/expo-app` may depend on shared domain packages and mobile-safe shared utilities
- `packages/*` may depend on lower-level packages

### Avoid
- package internals depending on app route files
- app-to-app imports
- business logic hidden in component trees
- cross-feature helpers in random `lib/` folders when the logic should be promoted into a package

### Rule of thumb
If changing a workflow requires editing the same rule in multiple apps, the boundary is wrong.

## Midday-Derived Patterns to Keep

### Workspace and page architecture
Borrow these patterns from Midday and the local in-repo references:
- fast route shell render
- dashboard/widget-first composition
- progressive data loading
- independent loading boundaries
- composable page sections instead of one monolithic payload
- reusable table/sheet/modal infrastructure

### What to adapt for GND
GND is more operations-heavy and sales/process-control-heavy than Midday. That means:
- deeper workflow orchestration is normal
- production, dispatch, and sales truth need stronger authority boundaries
- replacement systems often need side-by-side `v2` rollout paths
- auditability and regression coverage matter more than elegant UI structure alone

So we should adopt Midday's delivery shape, but pair it with stricter domain authority than a typical dashboard app needs.

## File and Folder Structure Rules

### Top-level placement rules
- Put durable business logic in `packages/`
- Put route and screen composition in `apps/`
- Put architecture and planning memory in `brain/`
- Put evidence and design artifacts in `ai/`

### `apps/www` structure guidance
- Keep route files thin.
- Put reusable feature UI under dedicated feature folders or component folders when the surface is broad enough to justify it.
- Prefer route segments that reflect user workflow boundaries.
- Put table implementations in reusable table modules when the pattern is shared.
- Keep query-param parsing, filter wiring, and sheet/modal orchestration near the feature, but move domain logic out.

Good candidates for app-local code:
- page shells
- column definitions
- modal/sheet open-state handling
- route-specific filter state
- view formatting

Bad candidates for app-local code:
- pricing calculations
- dispatch state derivation
- multi-step mutation correctness
- permission truth reused by multiple surfaces

### `apps/api` structure guidance
- Group route handlers by domain.
- Keep transport schemas and route contracts explicit.
- Route files should orchestrate package services and return normalized payloads.
- Shared read-model builders are acceptable when they are transport-oriented and not domain-authority logic.

### `apps/expo-app` structure guidance
- Prefer feature folders for coherent mobile workflows.
- Keep screen composition separate from query/data helpers when the screen grows.
- Reuse package-layer contracts and logic whenever possible.
- Only fork logic locally when mobile UX requires different presentation or caching behavior.

### `packages/*` structure guidance
For simple packages:
- `src/index.ts`
- `src/<feature>.ts`

For medium to large domains:
- `src/domain/*`
- `src/application/*`
- `src/infrastructure/*`
- `src/contracts/*`
- `src/projections/*`
- `src/index.ts`

Use deeper layering when the domain is correctness-critical or has both read and write complexity.

### `brain/` structure guidance
Use the existing structured folders:
- `brain/system`: architecture and stack
- `brain/engineering`: implementation rules and repo conventions
- `brain/api`: endpoint, contract, and permission references
- `brain/database`: schema, relationships, and migrations
- `brain/features`: feature-level design and execution notes
- `brain/decisions`: ADRs and durable technical decisions
- `brain/tasks`: backlog and execution state

Prefer extending these structured locations over creating new flat one-off docs.

## Coding Standards

### Shared logic first
- Prefer shared package/domain logic over app-local duplication.
- Promote logic early when multiple surfaces need the same rule.

### Name by business meaning
- Use names that describe business intent, not implementation trivia.
- Prefer `getSalesOrdersV2Summary` over vague names like `fetchData`.

### Normalize transport contracts
- API responses should be shaped for clear UI consumption.
- Avoid leaking raw persistence shapes when the UI only needs a normalized contract.

### Keep route code boring
- Route/page files should read like assembly, not like business engines.
- Expensive transforms and rule-heavy branching should move into helpers or packages.

### Preserve production behavior during parallel rebuilds
- A `v2` path should not silently alter current production semantics.
- Behavior changes need explicit rollout and documentation.

### Add focused tests for risky domains
Regression coverage is required when changes touch:
- pricing
- persistence
- payments
- dispatch
- production control
- documents
- query truth used for operational decisions

## Performance Guide

### First render budget
- Do not block the first render on the full working set when summary data is enough to orient the user.
- Load primary widgets, summary cards, and the first useful list/table state first.
- Make full detail an opt-in expansion, side sheet, tab, or follow-up query where possible.

### Query shaping
- Prefer aggregate, count, summary, and paginated query shapes for initial load.
- Avoid sending large relational payloads to routes that only render a dashboard shell.
- Build dedicated summary queries when the page needs top-of-screen metrics.

### Hydration and loading boundaries
- Prefer multiple composable loading boundaries over one giant server wait.
- Keep interactions available even when secondary panels are still loading.
- Separate "must see now" data from "nice to see after render" data.

### Table-heavy workflows
- Use summary headers plus paginated or filtered table bodies.
- Add mobile-specific renderers when desktop tables degrade badly on mobile.
- Avoid coupling action flows to full-table reloads when narrower refreshes are possible.

### API performance
- Do not make API handlers rebuild the same heavy derivations repeatedly if a shared projection or query helper can own the shape.
- Normalize and cache carefully where consistency rules allow it.
- Treat transport-layer logging and timing instrumentation as support tools, not core architecture.

### Mobile performance
- Keep list payloads small.
- Reuse shaped contracts from API/package layers instead of pushing transformation work into the render path.
- Prefer screen-level summaries and drill-down navigation over giant all-in-one mobile payloads.

### Build and workspace performance
- Respect package boundaries so Turbo caching remains useful.
- Keep dependencies focused so a small feature change does not fan out across the whole monorepo.
- Avoid unnecessary duplication that increases typecheck, lint, and build surface area.

## API and Validation Rules

### API contracts
- API surfaces should expose contracts that match product use cases, not database convenience.
- Summary queries and detail queries should be separate when the UI needs different costs and shapes.

### Validation
- Validate at transport boundaries and at critical domain boundaries.
- Use shared schemas where multiple surfaces consume the same contract.
- UI form validation should improve UX, but server validation remains authoritative.

### Permissions
- Keep permission checks close to API/service entry points.
- Do not bury permission truth in client conditionals alone.

## Database and Mutation Authority

### Database ownership
- Persistence primitives and schema-aware query helpers belong near `packages/db`.
- Feature-specific read models may compose those primitives, but schema truth should not drift into app code.

### Mutation authority
- Multi-step mutations must route through a clear authority path.
- Ad hoc mutations scattered across route handlers are not acceptable for correctness-critical workflows.
- If a workflow updates multiple state dimensions, centralize it under one application service.

### Read truth
- Queries used for operations dashboards, production control, or accounting decisions should come from explicit, reviewable read models.
- Do not recompute core truth differently in separate screens.

## Testing and Hardening Rules

### Required when risk is high
Add focused tests when changes affect:
- totals or costing
- state transitions
- production or dispatch quantities
- invoice/document output
- cross-surface contract shape

### Preferred testing style
- narrow regression tests for the bug or contract being changed
- package-level tests for core domain rules
- API-level tests for exposed contracts when route behavior is the risk

### Parallel rebuild hardening
For `v2` work:
- keep legacy and `v2` behavior intentionally separate
- track parity or replacement scope in Brain
- document what is still missing before cutover

## Documentation Rules

### Brain is part of the architecture
`brain/` is not optional project decoration. It is part of how this repo preserves continuity.

Update Brain when you change:
- package boundaries
- system topology
- API contracts in a durable way
- data ownership or mutation authority
- feature rollout plans
- major performance strategy

### Where to write what
- use `brain/system/*` for cross-repo technical architecture
- use `brain/engineering/*` for coding and implementation rules
- use `brain/features/*` for feature-specific design and execution
- use `brain/decisions/*` for durable architecture decisions

## Feature Delivery Checklist
Before shipping a non-trivial feature, confirm:
- the schema/data model is clear
- the API contract is explicit
- business logic is in the right package or feature boundary
- the route/screen stays mostly compositional
- validation exists at the right boundaries
- high-risk behavior has regression coverage
- Brain docs were updated if the architecture changed

## GND-Specific Guidance Summary
- Favor Midday-style page composition, but do not force Midday's exact structure onto GND.
- Keep GND's sales, dispatch, production, and document flows under stronger authority boundaries than a typical dashboard app.
- Continue moving business rules from app-local code into shared packages.
- Use `v2` rebuilds deliberately when replacing unstable or legacy workflows.
- Optimize first render around actionable summaries, not maximum payload completeness.

## Canonical References
- Runtime overview: `brain/system/overview.md`
- Architecture details: `brain/system/architecture.md`
- Tech stack: `brain/system/tech-stack.md`
- Repo structure rules: `brain/engineering/repo-structure.md`
- Coding standards: `brain/engineering/coding-standards.md`
- AI contribution rules: `brain/engineering/ai-rules.md`
- ADR index: `brain/decisions.md`

# Architecture Guide

## Purpose
This is the canonical engineering handbook for GND.

It exists to answer the questions that come up repeatedly during implementation:
- where should this code live?
- how thin should routes be?
- when should logic move into a package?
- how should API contracts be shaped?
- how should we structure `v2` rebuilds?
- what performance rules matter in this repo?
- what documentation and tests are required before a feature is considered stable?

This guide is intentionally deeper than `brain/system/architecture.md`. That file tracks topology. This file explains how to work inside that topology.

## What This Guide Is Based On
This guide combines:
- the actual GND repository structure
- the current Brain decisions and engineering rules
- the real local Midday repo at `/Users/M1PRO/Documents/code/_kitchen_sink/midday`
- the smaller Midday-inspired references already present in this repo:
  - `apps/www/src/(midday)`
  - `ai/midday-example`

The goal is not to make GND look exactly like Midday. The goal is to borrow the useful parts of Midday's app architecture and pair them with stricter domain authority for GND's operations-heavy workflows.

## Scope
This guide applies to:
- `apps/www`
- `apps/api`
- `apps/expo-app`
- `apps/site`
- `packages/*`
- `brain/*` when architecture, delivery patterns, or domain ownership change

It is especially important for work touching:
- sales
- production
- dispatch
- payments
- documents
- reporting and control dashboards

## Architecture Goals

### Fast product surfaces
Pages should become usable quickly. Users should see shell, summary, and next actions before the system loads every possible detail.

### Strong domain authority
High-risk workflows should have one clear home for business rules, mutation orchestration, and truth derivation.

### Reuse across surfaces
The same business rule should not be reimplemented separately in web, API, mobile, and jobs unless the divergence is explicit and documented.

### Safe incremental modernization
Legacy and replacement paths can coexist. We prefer explicit `v2` migration streams over risky in-place rewrites for unstable flows.

### Durable team memory
Architecture is not only in code. It is also in `brain/`, ADRs, feature docs, and progress logs.

## Core Principles

### 1. Thin app surfaces, thick domain modules
Routes, screens, and handlers should mostly assemble capabilities rather than define them.

App-layer code should mainly do:
- access control
- route composition
- data fetching orchestration
- view state wiring
- UI composition
- navigation and presentation concerns

App-layer code should not become the long-term home for:
- pricing engines
- accounting truth
- quantity truth
- cross-surface state transitions
- document lifecycle rules
- permission rules used across multiple surfaces

### 2. Summary first, detail second
This is the most important Midday-derived product pattern to preserve.

For dashboard and workspace pages:
- first render should expose orientation
- orientation usually means summary metrics, the active filter state, and the first useful table or list
- secondary detail should arrive after the primary workflow becomes usable

Good:
- summary widgets plus paginated list
- compact workspace header plus lazy side sheet
- top-of-page alerts plus collapsible detail panels

Bad:
- giant route payload with every nested relation
- page blocked until secondary modals or drawers are hydrated
- shipping full working sets for a user who only needs the first 20 rows

### 3. Single-authority truth for risky workflows
If a workflow impacts money, quantity, fulfillment, dispatch, production status, or audit confidence, it needs one clear authority boundary.

That boundary may live in:
- `packages/sales`
- `packages/documents`
- `packages/db` for persistence primitives
- another focused package if the domain has earned it

But it should not drift across:
- route handlers
- UI helpers
- table components
- app-local action files in multiple apps

### 4. Replace in parallel when risk is high
When a system is brittle or hard to reason about:
- keep the legacy path stable
- build a separate `v2` path
- document missing parity or behavior differences
- make cutover explicit and reversible

This is already the dominant safe modernization pattern in GND and should continue.

### 5. Follow the repository implementation order
For cross-layer features and fixes:
1. Schema
2. API
3. UI
4. Validation
5. Polish

This order is not ceremony. It keeps contracts from drifting and prevents UI-first rework.

### 6. Brain is part of the architecture
In this repo, architecture is partly encoded in code and partly encoded in `brain/`.

If a change affects:
- package ownership
- dependency direction
- domain authority
- rollout strategy
- performance strategy
- system topology

then Brain should be updated as part of the same change stream.

## Monorepo Topology

### Tooling baseline
- package manager: Bun
- orchestration: Turborepo
- language: TypeScript
- formatting/linting baseline: Biome and workspace scripts

### Top-level folders
- `apps/`: runtime or deployable surfaces
- `packages/`: shared business, infrastructure, and UI modules
- `brain/`: durable memory and technical documentation
- `ai/`: examples, evidence, and design/support artifacts
- `scripts/`: operational scripts
- `types/`: shared declarations that do not belong to a single package

### Why this structure exists
This mirrors a healthy multi-surface product repo:
- apps remain focused on delivery surfaces
- packages become the place for long-lived logic
- architecture docs stay outside app code

This is also aligned with the real Midday repo, which separates:
- app surfaces like dashboard, API, website, worker, desktop
- focused packages for domain and platform capabilities
- technical docs under a dedicated docs area

## Current GND Surface Map

### `apps/www`
Primary business web surface. This is where most workspace complexity lives.

Current responsibilities already include:
- sales workspaces
- production and dispatch views
- HRM/community/settings surfaces
- tables, sheets, filters, modals, and page shells

The risk in `apps/www` is not lack of capability. The risk is that domain rules can accidentally remain trapped in the web layer because the UI is so feature-rich.

### `apps/api`
Server-facing contract layer.

Current structure confirms this split:
- `src/trpc/routers`
- `src/trpc/middleware`
- `src/rest`
- `src/schemas`
- `src/db/queries`

This is the correct kind of surface for:
- transport contracts
- auth and permission middleware
- request normalization
- delegating into domain or data services

### `apps/expo-app`
Mobile surface for platform-specific experiences.

This should remain:
- mobile-first in UX
- shared in business truth

### `apps/site`
Separate web surface with narrower product needs. Keep it lighter than `apps/www`.

### `apps/gnd-backlog`
Support surface. Useful, but not a second home for core business truth.

## Package Strategy

### Why packages matter in GND
GND is not just a UI-heavy repo. It has correctness-heavy operational logic:
- sales state
- payment resolution
- production control
- dispatch packing and submission flows
- print/document generation

Those workflows need stronger boundaries than a typical CRUD dashboard.

### Existing high-value package boundaries

#### `packages/db`
Owns:
- schema-adjacent query primitives
- low-level persistence access
- migration-adjacent truth
- reusable query building blocks

Should not own:
- transport formatting
- UI-oriented naming
- page-specific shaping unless there is a strong reason

#### `packages/sales`
This is the most important domain package and the clearest expression of the repo's architecture direction.

Current structure already shows the intended layering:
- `control/*`
- `payment-system/*`
- `resolution-system/*`
- `production-v2/*`
- `sales-form/*`
- `pdf-system/*`
- `print/*`

This is good. It means GND has already chosen modular domain boundaries instead of one giant sales folder.

Use this package for:
- canonical sales state logic
- mutation orchestration
- projections/read models when domain-owned
- sales-specific print/PDF/domain contracts

#### `packages/documents`
Use for:
- document lifecycle logic
- provider-agnostic storage patterns
- metadata handling
- reusable document rules

#### `packages/notifications`
Use for:
- notification primitives
- routing patterns shared by multiple surfaces
- reusable notification payload and behavior rules

#### `packages/jobs`
Use for:
- background workflows
- scheduled processes
- reusable job support

#### `packages/ui`
Use for:
- shared presentational primitives
- common interaction primitives
- reusable UI atoms and infrastructure

Do not hide business logic here.

## Dependency Direction

### Allowed directions
- `apps/*` -> `packages/*`
- `apps/api` -> `packages/db`, `packages/sales`, and other shared packages
- `apps/www` -> shared UI and domain packages
- `apps/expo-app` -> shared domain packages and mobile-safe shared utilities
- higher-level packages -> lower-level packages

### Forbidden or strongly discouraged directions
- app-to-app imports
- package internals importing route files
- UI components importing deep domain mutation logic from unrelated app folders
- random cross-feature helpers in app-local `lib/` folders when the logic should live in a package

### Boundary smell checklist
You likely need to promote code into a package when:
- web and mobile both need it
- API and web both need the same derivation
- a mutation updates several related state dimensions
- the logic is hard to test while trapped in UI
- fixing a bug requires touching the same rule in multiple surfaces

## How to Decide Where Code Goes

### Put it in `apps/www` when it is:
- route composition
- table column definitions
- local filter-param wiring
- modal/sheet state orchestration
- page-specific formatting
- a one-surface presentation concern

### Put it in `apps/api` when it is:
- transport schema validation
- auth-aware route entry
- request/response normalization
- API-specific orchestration of lower layers

### Put it in `packages/db` when it is:
- schema-aware queries
- persistence helpers
- reusable SQL/data access logic

### Put it in a domain package like `packages/sales` when it is:
- business rules shared across surfaces
- mutation orchestration
- state transitions
- derived truth used in multiple screens
- correctness-sensitive calculations

### Put it in `packages/ui` when it is:
- reusable visual primitives
- generic controls
- design-system-level interaction pieces

### Put it in `brain/` when it is:
- architecture direction
- durable implementation rule
- ADR-worthy decision
- rollout plan
- feature design or parity strategy

## Application Boundary Rules

### `apps/www` rules

#### Routes should be thin
Route/page files should mainly:
- parse route state
- gather auth or permission context
- call summary/detail hooks or loaders
- assemble sections
- hand off to feature components

A route file should not become:
- the only place a business rule exists
- a giant transform pipeline
- a mutation engine

#### Prefer feature-local composition
For medium or large features, group code around the feature rather than scattering it everywhere.

Good homes include:
- `apps/www/src/components/<feature>`
- `apps/www/src/features/<feature>`
- `apps/www/src/components/tables/<feature>`
- `apps/www/src/components/sheets/<feature>`

#### Use reusable workspace primitives
Where possible, use:
- shared page headers
- summary widget patterns
- table wrappers
- sheet/modal systems
- query-param helpers

The goal is consistent interaction shape, not identical visuals.

#### Keep app-local data shaping narrow
App-local shaping is acceptable when it is clearly view-oriented:
- display labels
- grouped sections for a page
- table row mapping
- page-only sorting/view models

App-local shaping is not acceptable when it becomes the canonical truth for:
- status
- money
- quantity
- permission meaning
- state transitions

### `apps/api` rules

#### API owns contracts, not all logic
The API layer should expose good contracts and orchestrate good services. It should not become the permanent home for domain truth that belongs in a shared package.

#### Routers should match domain boundaries
Route organization should align to business areas, not just transport style.

Good:
- sales routes around sales capabilities
- filter routes around filter capabilities
- customer routes around customer capabilities

#### Schemas belong at boundaries
Use request and response schemas to:
- guard transport boundaries
- normalize payloads
- preserve cross-surface consistency

### `apps/expo-app` rules

#### Mobile owns mobile UX
The Expo app should own:
- navigation
- mobile-friendly state flow
- gesture/platform-specific interactions
- mobile render optimization

#### Mobile should not fork domain truth lightly
If the mobile app needs a different UX, that is fine.
If the mobile app needs a different business rule, that needs explicit documentation and a strong reason.

## File and Folder Structure Rules

## `apps/www`

### Recommended route pattern
Use route files as shell entry points, not as the whole feature.

Preferred shape for larger features:
```text
apps/www/src/app/(sidebar)/(sales)/sales-book/orders/v2/page.tsx
apps/www/src/components/tables/sales-orders-v2/
apps/www/src/components/sales-orders-v2-header.tsx
apps/www/src/hooks/use-sales-orders-v2-filter-params.ts
```

Alternative shape when the feature is more self-contained:
```text
apps/www/src/features/<feature>/
  api/
  components/
  hooks/
  types.ts
  utils.ts
```

### Folder intent
- `app/`: route entry points and app-router concerns
- `components/`: reusable presentation and feature composition
- `features/`: cohesive feature-local modules when a feature deserves a dedicated boundary
- `hooks/`: client hooks and interaction helpers
- `lib/`: low-level app utilities, not random business-rule dumping grounds
- `data-access/`: app-level data composition where it is still truly app-specific

### Anti-patterns in `apps/www`
- giant page files that both fetch and transform and render everything
- putting domain calculations into table column files
- copy-pasting similar queries into many route surfaces
- mixing v1 and v2 behavior in a way that hides rollout boundaries

## `apps/api`

### Recommended structure
Current shape is already good:
```text
apps/api/src/
  trpc/
    routers/
    middleware/
  rest/
  schemas/
  db/
    queries/
  dto/
  utils/
```

### Ownership rule
- `trpc/routers`: route contracts and orchestration
- `schemas`: transport validation and shared payload contracts
- `db/queries`: local reusable query support when not yet promoted to a shared package
- `middleware`: auth, permission, request context, caching/consistency middleware

### When to move code out of `apps/api`
Promote code out when:
- the logic is used by another surface
- the logic becomes a domain authority concern
- the route file starts carrying too much business branching

## `packages/*`

### Simple package shape
Use for low-complexity shared modules:
```text
packages/<name>/src/
  index.ts
  <feature>.ts
```

### Deep domain package shape
Use for correctness-heavy or growing domains:
```text
packages/<name>/src/
  domain/
  application/
  infrastructure/
  contracts/
  projections/
  index.ts
```

### Layer intent
- `domain/`: business vocabulary, rules, invariants
- `application/`: use-case orchestration and mutation/query flows
- `infrastructure/`: persistence, providers, transport adapters
- `contracts/`: exported payload and boundary contracts
- `projections/`: reusable derived read models

### Rule
Do not create deep layering for vanity. Create it when the domain is complex enough that responsibilities need separation.

## Coding Standards

### Naming
- name by domain meaning, not implementation accident
- prefer explicit names like `getProductionDashboardV2` over vague names like `fetchDashboard`
- use `v2` only when it represents a real migration boundary, not just "new code"

### Function design
- prefer small, composable functions with one domain responsibility
- keep UI mapping code separate from business derivation code
- avoid giant "do everything" helpers

### Mutations
- mutations should have a clear authority path
- multi-step write flows should live in one application service or orchestration boundary
- mutation side effects should be deliberate and reviewable

### Read models
- separate summary contracts from detail contracts
- avoid detail payloads on pages that only need widgets or list rows
- keep read models stable enough that multiple views can depend on them confidently

### Reuse
- prefer reuse by composition and shared contracts
- do not over-abstract prematurely
- extract when the same logic repeats or when risk justifies a dedicated owner

## Midday Patterns Worth Borrowing

### From the real Midday repo
The local Midday repo shows strong patterns we should continue borrowing:
- multi-surface monorepo with separated app responsibilities
- focused packages for shared capabilities
- thin dashboard route composition
- reusable table and component systems
- technical docs kept outside runtime code

### What not to copy blindly
Do not copy:
- folder names just because Midday has them
- abstractions that solve Midday-specific product problems but not GND problems
- public-product assumptions when GND has more operations-heavy internal workflows

### Correct adaptation for GND
Borrow:
- shell-first rendering
- independent loading boundaries
- workspace composition
- clean app/package separation

Add for GND:
- stronger mutation authority
- explicit parity documentation
- stricter handling of quantity, payment, and state truth
- more regression coverage around operational workflows

## Performance Guide

### Performance priorities in this repo
The most important performance failures in GND are usually not animation polish problems. They are:
- slow first paint from oversized payloads
- server-heavy pages blocked on non-critical data
- duplicated derivation work across surfaces
- list/table views trying to render too much at once
- business transforms happening inside render paths

### First render rules
For any large workspace page:
- ship the shell first
- ship the top summary next
- ship the first actionable list/table state next
- defer secondary detail

The user should be able to orient themselves before the entire page model is complete.

### Query shaping rules
Prefer:
- counts
- aggregates
- summaries
- paginated collections
- focused detail endpoints

Avoid:
- "everything about this entity and all related children" payloads for first paint
- sending full nested trees to pages that only render five visible values

### Table and list rules
- tables should have summary context above them when the workflow is operational
- mobile renderers should be first-class when desktop tables collapse badly on mobile
- batch actions should not require naïve global re-fetching if a smaller refresh can keep the UI correct

### Render-path rules
- do not perform heavy domain calculations in React render if the result can be shaped earlier
- do not compute canonical truth in presentation components
- move expensive transforms to API, package projections, or memoized view-model boundaries only when justified

### API performance rules
- do not turn routers into giant orchestration blobs
- isolate reusable heavy derivations
- shape contracts for the page actually being loaded
- introduce summary queries when a screen needs summary widgets

### Mobile performance rules
- keep payloads compact
- favor drill-down navigation over giant all-in-one screens
- keep list rows lightweight
- prefer server/package shaping over client render-time transformation

### Build performance rules
- preserve clean package boundaries so Turbo caching remains effective
- avoid needless cross-workspace coupling
- avoid duplicating low-level utilities in multiple workspaces

## API and Contract Design

### Summary vs detail contracts
This repo should default to separate contracts for:
- page summary
- list/table data
- single-item detail
- mutation result/update state

This is already visible in successful `v2` workstreams and should become the norm.

### Contract design rules
- contracts should be shaped for the consumer
- contracts should be stable enough to reuse
- contracts should not expose accidental persistence structure unless necessary
- detail endpoints should not be forced onto summary pages

### Validation rules
- validate at transport boundaries
- validate again inside sensitive domain boundaries when invariants matter
- UI validation improves UX but server validation remains authoritative

### Permission rules
- permissions belong close to server authority
- client checks are a UX enhancement, not the source of truth

## Database and Data Access Rules

### Data access ownership
Use `packages/db` and related shared query layers for:
- schema-aware queries
- reusable joins and data access helpers
- normalized low-level persistence logic

### App-local queries
App-local query helpers are acceptable when they are temporary or page-specific, but they should be promoted when:
- reused elsewhere
- carrying domain semantics
- becoming hard to maintain

### Projection rule
If multiple screens need the same derived truth, create a reusable projection instead of recomputing it in each screen.

## Mutation and Workflow Authority

### Gold rule
One workflow, one authority path.

If a workflow:
- changes several related records
- updates state machines or status truth
- affects accounting, production, or dispatch
- emits side effects or notifications

then it should have one explicit orchestration path.

### Avoid
- scattered mutations across several app actions
- patching status in UI after the fact to "look right"
- mixing repair logic into the normal runtime path

### Repair/admin flows
Repair tools can exist, but they must be clearly separate from the happy path.

## Versioning and `v2` Rules

### When to create a `v2`
Use a `v2` stream when:
- legacy behavior is too risky to rewrite in place
- parity must be measured
- contract shape needs to change significantly
- a safer rollout path is needed

### What a `v2` must include
- explicit route or module boundary
- explicit docs for what is migrated and what is not
- focused contract design
- clear cutover criteria

### What to avoid
- silent partial rewrites inside the old path
- mixing legacy and `v2` semantics without naming the boundary

## Testing and Hardening Rules

### High-risk change areas
Focused regression coverage is required for:
- pricing
- payments
- persistence
- production control
- dispatch quantities
- print/document generation
- status derivation used by operations

### Preferred test placement
- package tests for core business rules
- API tests for exposed contracts and middleware-sensitive behavior
- focused feature tests for regressions in specific critical workflows

### Good test style
- one bug, one regression test where possible
- contract tests for summary/detail payload shape
- mutation tests for multi-step state correctness

### `v2` hardening
Before cutover:
- document missing parity
- capture decision points in Brain
- verify the new path on the scenarios that matter operationally

## Documentation and Brain Rules

### Update Brain when architecture changes
Update `brain/` when you:
- add or split a package boundary
- change dependency direction
- introduce a new `v2` rollout stream
- change API ownership or data ownership
- add a durable performance pattern
- change mutation authority for a critical workflow

### Where changes go
- `brain/system/*`: system-wide architecture and topology
- `brain/engineering/*`: repo conventions and implementation rules
- `brain/api/*`: contract, endpoint, and permission references
- `brain/database/*`: schema, relationship, and migration context
- `brain/features/*`: feature-level design and rollout notes
- `brain/decisions/*`: ADRs and durable technical decisions
- `brain/progress.md`: historical execution log

### ADR trigger checklist
Create or update an ADR when:
- a new domain module boundary is introduced
- a shared authority is reassigned
- a major rollout strategy changes
- a design tradeoff will matter for future contributors

## Review Checklist for Engineers and AI Agents

Before calling a feature or refactor complete, ask:
- Is the domain logic in the right layer?
- Did we keep the route or screen mostly compositional?
- Is the API contract shaped for the page instead of dumping raw structure?
- Did we split summary and detail if the screen needs both?
- Did we preserve one authority path for risky mutations?
- Did we avoid trapping business truth in a component tree?
- Did we keep first render focused on orientation and action?
- Did we add focused regression coverage for risky flows?
- Did we update Brain if architecture or rollout strategy changed?

## Concrete GND Standards Summary
- Prefer package-owned business logic over app-local helpers.
- Prefer Midday-style shell-first workspaces over monolithic page payloads.
- Prefer explicit summary/detail contracts over one oversized endpoint.
- Prefer one mutation authority path for risky workflows.
- Prefer `v2` rebuilds over hidden in-place rewrites when risk is high.
- Prefer Brain-backed rollout and architecture decisions over tribal knowledge.

## Related References
- `brain/system/overview.md`
- `brain/system/architecture.md`
- `brain/system/tech-stack.md`
- `brain/engineering/repo-structure.md`
- `brain/engineering/coding-standards.md`
- `brain/engineering/ai-rules.md`
- `brain/decisions.md`

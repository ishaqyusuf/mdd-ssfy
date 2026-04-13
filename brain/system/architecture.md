# System Architecture

## Purpose
Tracks the current technical topology and major module boundaries.

## Canonical Guide
- Use `brain/system/architecture-guide.md` for repository-wide architecture rules, placement guidance, Midday-inspired page patterns, performance guidance, and coding standards alignment.

## Current Topology
- Monorepo: Turborepo + Bun workspaces
- Apps:
  - `apps/www` for the main web app
  - `apps/api` for API services
  - `apps/expo-app` for mobile
  - `apps/site` and `apps/gnd-backlog` for additional surfaces
- Shared packages: domain and infrastructure modules under `packages/*` including `db`, `ui`, `auth`, `notifications`, `jobs`, `sales`, `documents`, and supporting utilities

## Notable Architecture Directions
- Shared document infrastructure is consolidating under `packages/documents` for provider-agnostic storage and metadata lifecycle handling.
- The sales domain is splitting into dedicated package boundaries:
  - `packages/sales/src/control/*` for production and dispatch quantity truth
  - `packages/sales/src/payment-system/*` for canonical payment and accounting logic
  - `packages/sales/src/resolution-system/*` for inconsistency detection and audited repair workflows
  - `packages/sales/src/pdf-system/*` for sales-specific PDF invalidation and current-document resolution
- Prefer Midday-style frontend architecture wherever the product surface allows it:
  - render route shells quickly and avoid blocking navigation on heavyweight page-level server work
  - prefer dashboard/widget-first composition with independent loading boundaries over monolithic page payloads
  - prefer aggregate, count, summary, and paginated query shapes for first paint instead of loading complete working sets
  - stream or defer secondary data, enrichment, and non-critical controls until after the primary view is visible
  - keep UI data dependencies small, composable, and easy to hydrate incrementally
  - for sheets, drawers, and modal workspaces:
    - load only the active tab or panel on open; do not eagerly mount every tab's data tree
    - use one slim overview query for the opening surface and move transactions, full lists, and deep history into on-demand tab queries
    - avoid server actions that fan out into many unrelated reads when a focused tRPC query can provide the first-paint payload
    - keep first-open payloads bounded; prefer recent slices and summary counts over `size: 200` style catch-all fetches
  - use the real local Midday repo as the primary architecture authority when choosing patterns:
    - `/Users/M1PRO/Documents/code/_kitchen_sink/midday`
  - follow the Midday architecture model deliberately:
    - reuse its shell-first routing, smaller section composition, and detail-on-demand loading patterns
    - avoid copying only visuals; preserve the architectural intent behind its page and data boundaries
  - reference in-repo Midday-inspired implementations second:
    - `apps/www/src/(midday)` for shared in-repo Midday-style UI patterns
    - `ai/midday-example` for focused example snippets and interaction patterns

## Data and Execution Flow
1. Schema and data models live in `packages/db` and related shared packages.
2. API apps and jobs consume shared packages.
3. UI apps consume API and shared UI/domain packages.
4. Validation and operational checks run through lint, typecheck, build, and targeted test scripts.

## Non-Functional Priorities
- Build reproducibility with Turbo pipelines
- Strong type safety across package boundaries
- Minimal duplication between web and mobile feature logic
- Single-authority domain modules for correctness-critical workflows

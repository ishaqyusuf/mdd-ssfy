# System Architecture

## Purpose
Tracks the current technical topology and major module boundaries.

## Canonical Guide
- Use `.brain/system/architecture-guide.md` for repository-wide architecture rules, placement guidance, Midday-inspired page patterns, performance guidance, and coding standards alignment.

## Current Topology
- Monorepo: Turborepo + Bun workspaces
- Apps:
  - `apps/dashboard` for the main web app
  - `apps/api` for API services
  - `apps/mobile` for mobile
  - `apps/storefront` for the customer-facing storefront
  - `apps/gnd-backlog` for the supporting backlog surface
- Shared packages: domain and infrastructure modules under `packages/*` including `db`, `ui`, `auth`, `notifications`, `jobs`, `sales`, `documents`, and supporting utilities

## Notable Architecture Directions
- Shared document infrastructure is consolidating under `packages/documents` for provider-agnostic storage and metadata lifecycle handling.
- Inventory owns inbound demand status semantics for sales fulfillment projections; see `.brain/decisions/ADR-009-inventory-owned-inbound-demand-status.md`.
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
    - `apps/dashboard/src/(midday)` for shared in-repo Midday-style UI patterns
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

## Proposed SaaS Target Direction (2026-08-08)

The SaaS commercialization architecture is proposed, not implemented. Its
canonical plan is
`.brain/plans/2026-08-08-feature-multi-tenant-saas-commercialization.md` and its
boundary decision is ADR-052.

- Add `Tenant` as the independent customer-company, billing, retention, and
  data-isolation authority.
- Keep `Organization` as an office/location nested inside a tenant. Do not
  reinterpret dealer ownership or the current office model as SaaS tenancy.
- Use one maintained application and initially pooled database with trusted
  server-resolved tenant context, tenant-aware repositories, compound identity,
  tenant-prefixed caches/jobs/files/events, and two-tenant negative tests.
- Complete or explicitly defer the proposed Neon/Postgres migration before GA;
  use PostgreSQL row-level security as defense in depth after application
  scoping exists.
- Keep one immutable, versioned platform Sales configuration template and layer
  tenant draft/published overrides, custom components, and tenant-owned price
  books over stable component/step identities.
- Separate platform subscription billing from each tenant's operational
  customer payments.
- Resolve custom hostnames, brand, email sender identity, PDF/document config,
  storage ownership, entitlements, provider connections, quotas, and audit
  through the same tenant boundary.

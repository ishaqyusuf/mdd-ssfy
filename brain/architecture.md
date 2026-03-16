# Architecture

## Current Topology

- Monorepo: Turborepo + Bun workspaces.
- Apps:
- `apps/www` (main web app)
- `apps/api` (API services)
- `apps/expo-app` (mobile)
- `apps/site`, `apps/gnd-backlog` (additional surfaces)
- Shared packages: domain and infra modules under `packages/*` (`db`, `ui`, `auth`, `notifications`, `jobs`, etc.).
- Sales domain is now explicitly splitting into dedicated package boundaries:
- `packages/sales/src/control/*` for production/dispatch quantity truth
- `packages/sales/src/payment-system/*` for canonical payment/accounting logic
- `packages/sales/src/resolution-system/*` for inconsistency detection and audited repair workflows

## Flow

1. Schema and data models live in `packages/db` and related shared packages.
2. API apps/jobs consume shared packages.
3. UI apps consume API + shared UI/domain packages.
4. Validation and operational checks run through lint/typecheck/build scripts.

## Non-Functional Priorities

- Build reproducibility with Turbo pipelines.
- Strong type safety across package boundaries.
- Minimal duplication between web/mobile feature logic.
- Single-authority domain modules for correctness-critical workflows.

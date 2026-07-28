# ADR-034: Rename the WWW Workspace to Dashboard

- Status: accepted
- Date: 2026-07-28

## Context

The primary Next.js application lived at `apps/www` with package name
`@gnd/www`. The name described a transport surface rather than the
application's product role and produced the local port keys `GND_WWW_PORT` and
`GND_WWW_PROD_PORT`.

The source-workspace identity is distinct from deployment, routing, monitoring,
authentication, and persisted-data identities that already have production
continuity requirements.

## Decision

- Rename the workspace directory to `apps/dashboard`.
- Rename the workspace package to `@gnd/dashboard`.
- Use `dashboard` for Turbo and local-infra development filters.
- Rename local port keys to `GND_DASHBOARD_PORT` and
  `GND_DASHBOARD_PROD_PORT`.
- Rename workspace-owned source adapters whose names encoded the old workspace
  identity.
- Keep the Vercel project, production domains, Portless route
  `gndprodesk`, Sentry project `gnd-prodesk-web`, auth endpoint and cookie
  names, and persisted `appSurface: "www"` values unchanged.

## Consequences

- Dashboard development starts with `bun run dev --filter dashboard`.
- Mobile plus dashboard development starts with
  `bun run dev --filter mobile dashboard`.
- The shared launcher derives `DASHBOARD_PORT`, which matches the
  profile-prefixed `GND_DASHBOARD_PORT` environment key.
- Repository paths, scripts, tests, lockfile workspace entries, and current
  Brain references use `apps/dashboard` and `@gnd/dashboard`.
- Existing deployments, URLs, sessions, Sentry history, and stored surface
  values retain continuity because their compatibility identities are not
  renamed.
- No database schema, API contract, permission, or business behavior changes.

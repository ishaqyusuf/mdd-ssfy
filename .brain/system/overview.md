# System Overview

## Purpose
High-level description of the runtime surfaces and operating model of the GND monorepo.

## Current State
- The repository is a Turborepo + Bun monorepo.
- Dashboard, dealership, and storefront use the shared Next.js `16.3.0`
  framework baseline; storefront's MDX adapter and app-local Next.js ESLint
  configurations are aligned to the same patch release.
- Core delivery surfaces include a web app, API service, Expo mobile app, and supporting web/backlog apps.
- Business logic is progressively moving into shared packages so web, API, and mobile flows can reuse the same domain rules.
- `.brain/` is the shared planning and memory layer for ongoing execution.
- Local app/dev surfaces use explicit project-owned app ports in the `3010-3019` range: dashboard on `3010`, Expo Metro on `3012`, email preview on `3013`, API on `3014`, the production-env dashboard smoke profile on `3015`, dealership on `3016`, `apps/web` on `3017`, site on `3018`, and backlog on `3019`. Portless-capable workspace scripts register those app ports with the active shared HTTPS wildcard proxy without setting its global port or TLS mode. The machine-wide proxy service normally binds standard HTTPS port `443`, producing clean `.localhost` URLs; if the shared proxy is intentionally configured on another port, consumers use the URL Portless reports. Docker infrastructure ports remain separate.
- Before local services start, the shared dev launcher resolves the filtered
  Turbo workspaces, or all workspaces for an unfiltered run, and removes any
  matching static Portless aliases declared by their `dev` scripts. Missing
  aliases are ignored; live process ownership remains confirmation-gated by
  the Portless force prompt.

## Primary Runtime Surfaces
- `apps/dashboard`: main business web workflows
- `apps/api`: API endpoints, query/mutation orchestration, schema validation integration
- `apps/mobile`: mobile workflows
- `packages/*`: shared domain, infrastructure, and UI modules

## Operational Priorities
- Preserve correctness for revenue-impacting sales flows.
- Reduce duplication across web, API, and mobile surfaces.
- Keep changes incremental and compatible with active production paths while migrations are in progress.
